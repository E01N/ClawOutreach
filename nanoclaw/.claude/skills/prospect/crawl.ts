/**
 * Prospect skill - LinkedIn crawler
 *
 * Usage:
 *   npx tsx .claude/skills/prospect/crawl.ts            # Run prospecting
 *   npx tsx .claude/skills/prospect/crawl.ts --setup    # Authenticate LinkedIn (interactive)
 *   npx tsx .claude/skills/prospect/crawl.ts --list     # Print stored prospects
 *
 * Prerequisites: npm install playwright @anthropic-ai/sdk
 * Auth state saved to: data/linkedin-profile/ (Chromium persistent context)
 */

import { chromium } from 'playwright';
import type { Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import { scoreProspect } from './score.js';
import { generateDrafts } from './draft.js';
import { researchProspect, closeResearchBrowser } from './research.js';
import { openDb, upsertProspect, saveDraft, alreadyCrawled, getAllProspects } from './store.js';
import { TARGET_SCHOOLS } from './schools.js';

// --- Config ---

// Load .env manually (no dotenv dependency required)
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const PROFILE_DIR  = path.join(process.cwd(), 'data', 'linkedin-profile');
const AUTH_MARKER  = path.join(process.cwd(), 'data', 'linkedin-auth.json');
const MAX_PROFILES = 30;
const MIN_SCORE_FOR_DRAFT = 5;

// Delays in ms
const DELAY_MIN = 3000;
const DELAY_MAX = 5000;

// LinkedIn people search URLs using titleFreeText (exact title filter) +
// keywords to narrow to graduate/professional programs.
// Each URL targets a specific title × program area combination.
// geoUrn 103644278 = United States — prevents returning results from other countries
const GEO_US = '&geoUrn=%5B%22103644278%22%5D';

// Institution-specific LinkedIn searches — anchor each search to a real school name
// so we find actual admissions staff rather than random people with matching keywords.
// Uses the first 3-4 words of each school name to stay under URL length limits.
function schoolLinkedInSearch(schoolName: string, label: string): { url: string; label: string } {
  const shortName = schoolName.split(' ').slice(0, 4).join(' ');
  const kw = encodeURIComponent(`admissions "${shortName}"`);
  return {
    label,
    url: `https://www.linkedin.com/search/results/people/?keywords=${kw}&origin=GLOBAL_SEARCH_HEADER${GEO_US}`,
  };
}

const LINKEDIN_SEARCHES: Array<{ url: string; label: string }> = TARGET_SCHOOLS.map(s =>
  schoolLinkedInSearch(s.name, `${s.name} – admissions staff`)
);

// --- Utilities ---

function randomDelay(): Promise<void> {
  const ms = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg: string): void {
  console.log(`[prospect] ${msg}`);
}

function cleanLockFiles(): void {
  for (const f of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const p = path.join(PROFILE_DIR, f);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch { /* ignore */ }
    }
  }
}

/** Detect CAPTCHA or block pages from current URL and page title. */
async function isBlocked(page: { url(): string; title(): Promise<string> }): Promise<boolean> {
  const url   = page.url();
  const title = (await page.title()).toLowerCase();
  return (
    url.includes('/checkpoint/') ||
    url.includes('/challenge/') ||
    url.includes('captcha') ||
    title.includes('security verification') ||
    title.includes("let's do a quick") ||
    title.includes('verify you')
  );
}

// --- Setup mode: open browser for manual LinkedIn login ---

async function runSetup(): Promise<void> {
  log('Opening browser for LinkedIn login. Sign in, then press Enter here to save session.');
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  cleanLockFiles();

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 800 },
  });

  const page = ctx.pages()[0] ?? await ctx.newPage();
  await page.goto('https://www.linkedin.com/login');

  // Wait for user to complete login manually
  await new Promise<void>(resolve => {
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', () => resolve());
    console.log('Press Enter after you have logged in...');
  });

  // Wait for LinkedIn to fully settle after login
  await page.waitForTimeout(4000);

  // Confirm login — URL check first (most reliable), then DOM selectors as fallback
  const currentUrl = page.url();
  const urlIndicatesLogin = currentUrl.includes('/feed') ||
    (!currentUrl.includes('/login') && !currentUrl.includes('/uas/') && currentUrl.includes('linkedin.com'));

  const loggedIn = urlIndicatesLogin || await Promise.any([
    page.locator('nav[aria-label="Primary Navigation"]').isVisible({ timeout: 8000 }),
    page.locator('nav[aria-label="Global Navigation"]').isVisible({ timeout: 8000 }),
    page.locator('[data-test-global-nav]').isVisible({ timeout: 8000 }),
    page.locator('.global-nav').isVisible({ timeout: 8000 }),
    page.locator('a[href*="/messaging/"]').isVisible({ timeout: 8000 }),
    page.locator('.feed-identity-module').isVisible({ timeout: 8000 }),
  ]).catch(() => false);

  if (!loggedIn) {
    log('WARNING: Could not confirm login. Saving session anyway.');
  } else {
    log('Login confirmed.');
  }

  fs.writeFileSync(AUTH_MARKER, JSON.stringify({ authenticated: true, savedAt: new Date().toISOString() }));
  await ctx.close();
  log('Session saved. Run without --setup to start prospecting.');
}

// --- List mode: print stored prospects ---

function runList(): void {
  const db = openDb();
  const prospects = getAllProspects(db, 0);
  if (prospects.length === 0) {
    log('No prospects stored yet.');
    return;
  }
  log(`${prospects.length} prospect(s) in database:\n`);
  for (const p of prospects) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`[${p.score}/10] ${p.name}`);
    console.log(`       ${p.title} @ ${p.institution}`);
    console.log(`       ${p.linkedin_url}`);
    console.log(`       ${p.score_reason}`);

    const draft = (db as any)
      .prepare('SELECT * FROM drafts WHERE prospect_id = ?')
      .get(p.id);

    if (draft) {
      console.log(`\n  EMAIL SUBJECT: ${draft.email_subject}`);
      console.log(`\n  EMAIL BODY:\n${draft.email_body.split('\n').map((l: string) => '  ' + l).join('\n')}`);
      console.log(`\n  LINKEDIN DM:\n${draft.linkedin_dm.split('\n').map((l: string) => '  ' + l).join('\n')}`);
    } else {
      console.log(`\n  (no draft — score below threshold or draft not yet generated)`);
    }
    console.log('');
  }
}

// --- Main crawl ---

async function runCrawl(): Promise<void> {
  if (!fs.existsSync(AUTH_MARKER)) {
    log('LinkedIn not authenticated. Run with --setup first.');
    process.exit(1);
  }

  cleanLockFiles();
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const db = openDb();

  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });

  const page = ctx.pages()[0] ?? await ctx.newPage();

  // Verify session is still active
  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (await isBlocked(page)) {
    log('BLOCKED: LinkedIn is showing a security challenge at login. Stopping.');
    await ctx.close();
    process.exit(1);
  }

  const crawlUrl = page.url();
  const crawlUrlValid = crawlUrl.includes('/feed') ||
    (!crawlUrl.includes('/login') && !crawlUrl.includes('/uas/') && crawlUrl.includes('linkedin.com'));

  const feedVisible = crawlUrlValid || await Promise.any([
    page.locator('nav[aria-label="Primary Navigation"]').isVisible({ timeout: 10000 }),
    page.locator('nav[aria-label="Global Navigation"]').isVisible({ timeout: 10000 }),
    page.locator('[data-test-global-nav]').isVisible({ timeout: 10000 }),
    page.locator('.global-nav').isVisible({ timeout: 10000 }),
    page.locator('a[href*="/messaging/"]').isVisible({ timeout: 10000 }),
    page.locator('.feed-identity-module').isVisible({ timeout: 10000 }),
  ]).catch(() => false);

  if (!feedVisible) {
    log('Session expired or not logged in. Run with --setup to re-authenticate.');
    await ctx.close();
    process.exit(1);
  }

  log('LinkedIn session active. Collecting profile URLs...');

  // Collect profile URLs from search results
  const profileUrls: string[] = [];

  for (const search of LINKEDIN_SEARCHES) {
    if (profileUrls.length >= MAX_PROFILES) break;

    await page.goto(search.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    if (await isBlocked(page)) {
      log('BLOCKED: LinkedIn is showing a CAPTCHA. Stopping collection early.');
      break;
    }

    // Extract profile links from search results (string to avoid tsx/__name injection)
    const links: string[] = await page.evaluate(`(() => {
      return Array.from(document.querySelectorAll('a[href*="/in/"]'))
        .map(a => a.href)
        .filter(h => /linkedin\\.com\\/in\\/[^/?]+/.test(h))
        .map(h => { const m = h.match(/(https:\\/\\/www\\.linkedin\\.com\\/in\\/[^/?#]+)/); return m ? m[1] : ''; })
        .filter(Boolean);
    })()`);

    const unique = [...new Set(links)].filter(u => !profileUrls.includes(u));
    log(`[${search.label}]: found ${unique.length} new profile URL(s)`);
    profileUrls.push(...unique);

    await randomDelay();
  }

  const toVisit = profileUrls.slice(0, MAX_PROFILES);
  log(`Visiting ${toVisit.length} profile(s)...`);

  let newProspects = 0;
  let drafted = 0;
  let skipped = 0;
  let blocked = false;

  for (let i = 0; i < toVisit.length; i++) {
    const url = toVisit[i];

    if (alreadyCrawled(db, url)) {
      log(`[${i + 1}/${toVisit.length}] Already crawled, skipping: ${url}`);
      skipped++;
      continue;
    }

    log(`[${i + 1}/${toVisit.length}] Visiting: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500); // brief settle

    if (await isBlocked(page)) {
      log('BLOCKED: LinkedIn is showing a CAPTCHA. Stopping run. Try again later.');
      blocked = true;
      break;
    }

    // Extract profile data (passed as string to avoid tsx/__name injection)
    const profileData = await page.evaluate(`(() => {
      const text = sel => document.querySelector(sel)?.innerText?.trim() ?? '';
      const name = text('h1');
      const headline = text('.text-body-medium.break-words') || text('[data-generated-suggestion-target]') || '';
      const location = text('.pv-text-details__left-panel .text-body-small.inline') || text('.pb2 .pv-text-details__left-panel span') || '';
      const about = text('#about ~ div .pv-shared-text-with-see-more') || text('[data-field="summary"]') || '';
      const experienceItems = Array.from(document.querySelectorAll('.pvs-list__item--line-separated'));
      let title = '';
      let institution = '';
      if (experienceItems.length > 0) {
        const spans = Array.from(experienceItems[0].querySelectorAll('span[aria-hidden="true"]'))
          .map(s => s.innerText?.trim()).filter(t => t && t.length > 1);
        if (spans.length >= 2) { title = spans[0]; institution = spans[1]; }
        else if (spans.length === 1) { title = spans[0]; }
      }
      if (!title && headline.includes(' at ')) {
        const parts = headline.split(' at ');
        title = parts[0].trim();
        institution = parts.slice(1).join(' at ').trim();
      }
      return { name, title, institution, headline, location, about };
    })()`);

    if (!profileData.name) {
      log(`  No name found — possibly redirected. Skipping.`);
      await randomDelay();
      continue;
    }

    const { score, reason } = scoreProspect({
      title:       profileData.title,
      institution: profileData.institution,
      headline:    profileData.headline,
      about:       profileData.about,
    });

    // Require at least one title-pattern match — drop students, recruiters, etc.
    // that only score on program area / institution keywords.
    const hasTitleMatch = score > 0 && reason.includes('(+');
    const titleOnlyScore = (() => {
      const titlePatterns = [/director/i, /dean/i, /enrollment/i, /admissions/i, /registrar/i, /recruiter/i, /program\s+director/i];
      return titlePatterns.some(p => p.test(profileData.title) || p.test(profileData.headline));
    })();
    if (!titleOnlyScore) {
      log(`  Skipping ${profileData.name} — no admissions/director title match (score: ${score})`);
      await randomDelay();
      continue;
    }

    // Infer program area label from scoring corpus
    const corpus = [profileData.title, profileData.institution, profileData.headline, profileData.about].join(' ');
    let programArea = 'other';
    if (/nursing|healthcare|health|medical|medicine|pharmacy|public\s+health/i.test(corpus)) programArea = 'healthcare';
    else if (/allied\s+health|physical\s+therapy|occupational|physician\s+assistant|dental/i.test(corpus)) programArea = 'allied_health';
    else if (/business|mba|management|finance/i.test(corpus)) programArea = 'business';
    else if (/law|juris|jd|legal/i.test(corpus)) programArea = 'law';
    else if (/graduate|professional\s+school|master/i.test(corpus)) programArea = 'graduate';

    const prospectId = upsertProspect(db, {
      name:         profileData.name,
      title:        profileData.title,
      institution:  profileData.institution,
      program_area: programArea,
      linkedin_url: url,
      email:        '',
      location:     profileData.location,
      headline:     profileData.headline,
      about:        profileData.about,
      score,
      score_reason: reason,
      crawled_at:   new Date().toISOString(),
    });

    log(`  ${profileData.name} — ${profileData.title} @ ${profileData.institution} | score: ${score}/10 (${reason})`);
    newProspects++;

    // Generate drafts for qualifying prospects
    if (score >= MIN_SCORE_FOR_DRAFT) {
      try {
        log(`  Researching ${profileData.institution}...`);
        const research = await researchProspect(
          profileData.name,
          profileData.institution,
          programArea,
        );

        log(`  Drafting outreach for ${profileData.name}...`);
        const drafts = await generateDrafts({
          name:         profileData.name,
          title:        profileData.title,
          institution:  profileData.institution,
          program_area: programArea,
          headline:     profileData.headline,
          about:        profileData.about,
        }, research);
        saveDraft(db, {
          prospect_id:   prospectId,
          email_subject: drafts.email_subject,
          email_body:    drafts.email_body,
          linkedin_dm:   drafts.linkedin_dm,
          drafted_at:    new Date().toISOString(),
        });
        log(`  Draft saved.`);
        drafted++;
      } catch (err) {
        log(`  Draft generation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await randomDelay();
  }

  await ctx.close();
  await closeResearchBrowser();

  // Summary
  const prospects = getAllProspects(db, MIN_SCORE_FOR_DRAFT);
  console.log('\n=== Prospecting run complete ===');
  console.log(`  Profiles visited:  ${toVisit.length - skipped}`);
  console.log(`  New prospects:     ${newProspects}`);
  console.log(`  Skipped (cached):  ${skipped}`);
  console.log(`  Drafts created:    ${drafted}`);
  console.log(`  High-score total:  ${prospects.length} (score >= ${MIN_SCORE_FOR_DRAFT})`);
  if (blocked) {
    console.log('\n  WARNING: Run was stopped early due to LinkedIn blocking.');
    console.log('  Wait a few hours before running again.');
  }
  console.log(`\n  Review drafts: npx tsx .claude/skills/prospect/crawl.ts --list`);
}

// --- Redraft mode: generate drafts for existing prospects that have none ---

async function runRedraft(): Promise<void> {
  const db = openDb();
  const prospects = getAllProspects(db, MIN_SCORE_FOR_DRAFT);
  const undrafted = prospects.filter(p => {
    const existing = (db as any).prepare('SELECT id FROM drafts WHERE prospect_id = ?').get(p.id);
    return !existing;
  });

  if (undrafted.length === 0) {
    log('All qualifying prospects already have drafts.');
    return;
  }

  log(`Generating drafts for ${undrafted.length} prospect(s) without drafts...`);
  let drafted = 0;
  for (const p of undrafted) {
    log(`  Researching ${p.institution}...`);
    let research;
    try { research = await researchProspect(p.name, p.institution, p.program_area); } catch { /* skip */ }

    log(`  Drafting for ${p.name}...`);
    try {
      const drafts = await generateDrafts({
        name: p.name, title: p.title, institution: p.institution,
        program_area: p.program_area, headline: p.headline, about: p.about,
      }, research);
      saveDraft(db, {
        prospect_id: p.id, email_subject: drafts.email_subject,
        email_body: drafts.email_body, linkedin_dm: drafts.linkedin_dm,
        drafted_at: new Date().toISOString(),
      });
      log(`  Draft saved.`);
      drafted++;
    } catch (err) {
      log(`  Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await closeResearchBrowser();
  log(`Done. ${drafted}/${undrafted.length} drafts created.`);
}

// --- School directory crawl ---

/**
 * Given a school's base URL, navigate to its root domain and score all
 * internal links by how many admissions/staff keywords they contain.
 * Returns the best candidate URL, or null if nothing useful found.
 */
async function discoverStaffUrl(page: { goto: Function; evaluate: Function }, directoryUrl: string): Promise<string | null> {
  // Extract root domain (e.g. https://nursing.jhu.edu)
  let origin: string;
  try {
    const u = new URL(directoryUrl);
    origin = u.origin;
  } catch {
    return null;
  }

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1000);
  } catch {
    return null;
  }

  // Score every internal link by keyword density
  const best: string | null = await page.evaluate(`(() => {
    const KEYWORDS = ['admissions','admission','staff','directory','team','people',
                      'contact','personnel','faculty','about','enrollment','enrolment'];
    const origin = window.location.origin;

    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => {
        try { return new URL(a.href, origin).href; } catch { return null; }
      })
      .filter(href => href && href.startsWith(origin) && !href.includes('#'));

    const unique = [...new Set(links)];

    let best = null, bestScore = 0;
    for (const href of unique) {
      const path = href.replace(origin, '').toLowerCase();
      let score = 0;
      for (const kw of ${JSON.stringify(['admissions','admission','staff','directory','team','people','contact','enrollment','personnel'])}) {
        if (path.includes(kw)) score += (kw === 'staff' || kw === 'directory' || kw === 'personnel') ? 3 : 1;
      }
      if (score > bestScore) { bestScore = score; best = href; }
    }
    return bestScore >= 2 ? best : null;
  })()`);

  return best;
}

// --- DOM-based staff extraction ---

const DOM_EXTRACTOR = `(() => {
  const TITLE_RE = /(director\\s+of|associate\\s+(dean|director)|assistant\\s+(dean|director)|dean\\s+of\\s+(admissions|enrollment|graduate|students)|admissions\\s+(director|officer|coordinator|counselor|manager|specialist|adviser|advisor)|enrollment\\s+(director|manager|coordinator)|program\\s+director|registrar|recruiter|recruitment\\s+(coordinator|manager|specialist))/i;
  const JUNK = new Set(['quick','links','necessary','strictly','cookies','privacy','accept','decline','menu','search','home','back','next','skip','close','submit','login','more','read','learn','click','here','visit','view','contact','email','phone','fax','address','welcome','news','events','blog','resources','accessibility','toggle','navigation','sitemap','copyright','follow','share','admissions','enrollment','graduate','undergraduate','doctoral','phd','md','mba','jd','students','student','faculty','staff','program','programs','degree','degrees','licensure','disclosures','disclosure','federal','requirements','administration','council','advisory','senate','committee','committees','statistics','profile','class','leadership','executive','faqs','webinars','information','request','funding','logistics','bridge','about','apply','overview','office','department','directory','team','people','back','forward']);
  function looksLikeName(s) {
    if (!s) return false;
    if (/[?!@#$%^&*()+=\\[\\]{}|<>\\/\\\\0-9]/.test(s)) return false;
    const words = s.trim().split(/\\s+/);
    if (words.length < 2 || words.length > 4) return false;
    if (!words.every(w => /^(Mc|Mac|O\\')?[A-Z][a-z\\-\\']{1,24}(\\.)?$/.test(w))) return false;
    return words.filter(w => !JUNK.has(w.toLowerCase().replace(/\\.$/, ''))).length >= 2;
  }
  const results = [];
  const cardSelectors = ['.staff-member','.team-member','.people-card','.person-card','.faculty-member','.directory-item','.staff-listing__item','[class*="StaffCard"]','[class*="TeamMember"]','[class*="PersonCard"]','[class*="staff-card"]','[class*="people-item"]','[class*="faculty-item"]','[class*="bio-card"]','[class*="profile-card"]'];
  for (const sel of cardSelectors) {
    const cards = Array.from(document.querySelectorAll(sel));
    if (cards.length > 0) {
      for (const card of cards) {
        const nameEl = card.querySelector('h2,h3,h4,.name,[class*="name"],[class*="Name"]');
        const titleEl = card.querySelector('p,.title,.position,[class*="title"],[class*="Title"],[class*="position"],[class*="Position"],[class*="role"],[class*="Role"]');
        const name = nameEl?.innerText?.trim() || '';
        const title = (titleEl?.innerText?.trim() || '').split('\\n')[0].trim();
        if (looksLikeName(name) && TITLE_RE.test(title)) results.push({ name, title });
      }
      if (results.length > 0) return results;
    }
  }
  const dts = Array.from(document.querySelectorAll('dt'));
  for (const dt of dts) {
    const dd = dt.nextElementSibling;
    const name = dt.innerText?.trim() || '';
    const title = dd?.innerText?.trim() || '';
    if (looksLikeName(name) && TITLE_RE.test(title)) results.push({ name, title });
  }
  if (results.length > 0) return results;
  const rows = Array.from(document.querySelectorAll('tr'));
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td,th')).map(c => c.innerText?.trim() || '');
    if (cells.length >= 2 && looksLikeName(cells[0]) && TITLE_RE.test(cells[1])) results.push({ name: cells[0], title: cells[1] });
  }
  if (results.length > 0) return results;
  const headings = Array.from(document.querySelectorAll('h3,h4,h5'));
  for (const h of headings) {
    const name = h.innerText?.trim() || '';
    if (!looksLikeName(name)) continue;
    let sib = h.nextElementSibling;
    for (let n = 0; n < 2 && sib; n++, sib = sib.nextElementSibling) {
      const title = (sib.innerText?.trim() || '').split('\\n')[0].trim();
      if (TITLE_RE.test(title) && title.length < 80) { results.push({ name, title }); break; }
    }
  }
  if (results.length > 0) return results;
  const textNodes = Array.from(document.querySelectorAll('p, li, span, td, div'));
  for (const el of textNodes) {
    const lines = (el.innerText || '').split(/\\n+/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length - 1; i++) {
      if (looksLikeName(lines[i]) && TITLE_RE.test(lines[i + 1]) && lines[i + 1].length < 80) results.push({ name: lines[i], title: lines[i + 1] });
    }
  }
  const seen = new Set();
  return results.filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; });
})()`;

async function extractStaffViaDOM(page: Page): Promise<Array<{ name: string; title: string }>> {
  try {
    const result = await page.evaluate(DOM_EXTRACTOR);
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

// --- Vision-based staff extraction ---

let _visionClient: Anthropic | null = null;
function getVisionClient(): Anthropic {
  if (!_visionClient) _visionClient = new Anthropic();
  return _visionClient;
}

/**
 * Takes a screenshot of the current page and asks Claude Haiku to extract
 * admissions/enrollment staff names and titles. Works on any page layout.
 */
async function extractStaffViaVision(page: Page, schoolName: string): Promise<Array<{ name: string; title: string }>> {
  try {
    const screenshot = await page.screenshot({ type: 'png', fullPage: true });
    const base64 = screenshot.toString('base64');

    const response = await getVisionClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: `This is a page from ${schoolName}. Extract every person who works in admissions, enrollment management, or program administration. Only include people with a clearly admissions-related or director-level title. Return ONLY a JSON array with no markdown fences:\n[{"name": "Full Name", "title": "Job Title"}]\nIf no relevant staff are visible on this page, return [].` }
        ]
      }]
    });

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    const cleaned = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed.filter((r: any) => r.name && r.title) : [];
  } catch {
    return [];
  }
}

/**
 * Takes a screenshot and asks Claude whether we are on a staff directory page.
 * If not, it returns the URL of the best link to follow to find one.
 */
async function findBestStaffLinkViaVision(page: Page): Promise<string | null> {
  try {
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    const base64 = screenshot.toString('base64');
    const currentUrl = page.url();

    const response = await getVisionClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: `This is a university website page (current URL: ${currentUrl}). I am looking for the admissions staff directory — a page listing names and job titles of admissions/enrollment staff.\n\nDoes this page already show admissions staff names and titles? If yes: {"hasStaff": true}\nIf no, identify the best link to click to find them: {"hasStaff": false, "linkText": "exact text of the link", "linkUrl": "full URL if visible in the page"}\nReturn ONLY JSON, no markdown.` }
        ]
      }]
    });

    const text = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('');
    const cleaned = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.hasStaff) return null;
    if (parsed.linkUrl && parsed.linkUrl !== currentUrl) return parsed.linkUrl;

    // Claude gave us link text but no URL — find it in the DOM
    if (parsed.linkText) {
      const found: string | null = await page.evaluate((linkText: string) => {
        const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        const match = anchors.find(a => a.innerText?.trim().toLowerCase().includes(linkText.toLowerCase()));
        return match ? match.href : null;
      }, parsed.linkText);
      return found;
    }

    return null;
  } catch {
    return null;
  }
}

async function runSchoolCrawl(): Promise<void> {
  const db = openDb();
  const { chromium: chr } = await import('playwright');
  const browser = await chr.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let found = 0;
  let drafted = 0;

  log(`Scanning ${TARGET_SCHOOLS.length} school directory page(s)...`);

  for (const school of TARGET_SCHOOLS) {
    log(`[school] ${school.name} — ${school.directoryUrl}`);

    try {
      await page.goto(school.directoryUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    } catch {
      log(`[school]   Could not load page — skipping.`);
      continue;
    }
    // Wait for JS rendering but don't die if the page never fully idles
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const staffEntries: Array<{ name: string; title: string }> = await extractStaffViaDOM(page);

    if (staffEntries.length === 0) {
      // Multi-hop fallback: vision extraction + Claude-guided navigation (up to 3 hops)
      const MAX_HOPS = 3;
      const visited = new Set<string>([page.url()]);

      for (let hop = 0; hop < MAX_HOPS && staffEntries.length === 0; hop++) {
        log(`[school]   DOM found nothing — trying vision (hop ${hop + 1}/${MAX_HOPS})...`);
        const visionEntries = await extractStaffViaVision(page, school.name);
        if (visionEntries.length > 0) {
          staffEntries.push(...visionEntries);
          log(`[school]   Vision extracted ${visionEntries.length} entry/entries.`);
          break;
        }

        log(`[school]   Vision found nothing — asking Claude for better URL...`);
        const betterUrl = await findBestStaffLinkViaVision(page);
        if (!betterUrl || visited.has(betterUrl)) {
          log(`[school]   No new URL suggested — stopping.`);
          break;
        }

        visited.add(betterUrl);
        log(`[school]   Navigating to: ${betterUrl}`);
        try {
          await page.goto(betterUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(2000);
          // Try DOM on the new page before next vision attempt
          const domEntries = await extractStaffViaDOM(page);
          if (domEntries.length > 0) {
            staffEntries.push(...domEntries);
            log(`[school]   DOM on navigated page found ${domEntries.length} entry/entries.`);
            break;
          }
        } catch {
          log(`[school]   Navigation failed — stopping.`);
          break;
        }
      }

      if (staffEntries.length === 0) {
        log(`[school]   No staff entries found — skipping.`);
        continue;
      }
    }

    log(`[school]   Found ${staffEntries.length} staff entry/entries. Scoring...`);

    // Grab the first admissions-looking email address on the current page
    const pageEmail: string = await page.evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
      const emails = links.map(a => a.getAttribute('href').replace('mailto:', '').split('?')[0].trim().toLowerCase());
      // Prefer an email that looks like an admissions/enrollment address
      const admissions = emails.find(e => /(admiss|enroll|grad|apply|info|contact)/.test(e));
      return admissions || emails[0] || '';
    })()`).catch(() => '');

    for (const entry of staffEntries) {
      const { score, reason } = scoreProspect({
        title: entry.title,
        institution: school.name,
        headline: entry.title,
        about: '',
      });

      if (score < 3) continue; // skip clearly irrelevant

      // Use school page URL as a stable unique key (name deduplication)
      const stableUrl = `school:${school.directoryUrl}#${entry.name.toLowerCase().replace(/\s+/g, '-')}`;

      if (alreadyCrawled(db, stableUrl)) {
        log(`[school]   Already stored: ${entry.name}`);
        continue;
      }

      const programArea = school.vertical === 'pa_program' || school.vertical === 'physical_therapy' || school.vertical === 'occupational_therapy'
        ? 'allied_health'
        : school.vertical === 'public_health' ? 'healthcare'
        : school.vertical;

      const prospectId = upsertProspect(db, {
        name:         entry.name,
        title:        entry.title,
        institution:  school.name,
        program_area: programArea,
        linkedin_url: stableUrl,
        email:        pageEmail,
        location:     '',
        headline:     entry.title,
        about:        '',
        score,
        score_reason: reason,
        crawled_at:   new Date().toISOString(),
      });

      log(`[school]   ${entry.name} — ${entry.title} | score: ${score}/10 (${reason})`);
      found++;

      if (score >= MIN_SCORE_FOR_DRAFT) {
        try {
          log(`[school]   Drafting for ${entry.name}...`);
          const research = await researchProspect(entry.name, school.name, programArea).catch(() => undefined);
          const drafts = await generateDrafts({
            name: entry.name, title: entry.title, institution: school.name,
            program_area: programArea, headline: entry.title, about: '',
          }, research);
          saveDraft(db, { prospect_id: prospectId, ...drafts, drafted_at: new Date().toISOString() });
          log(`[school]   Draft saved.`);
          drafted++;
        } catch (err) {
          log(`[school]   Draft failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    await randomDelay();
  }

  await context.close();
  await browser.close();
  await closeResearchBrowser();

  log(`\nSchool scan complete. ${found} new prospect(s), ${drafted} draft(s).`);
}

// --- Entry point ---

const args = process.argv.slice(2);

if (args.includes('--setup')) {
  runSetup().catch(err => { console.error(err); process.exit(1); });
} else if (args.includes('--list')) {
  runList();
} else if (args.includes('--redraft')) {
  runRedraft().catch(err => { console.error(err); process.exit(1); });
} else if (args.includes('--schools')) {
  runSchoolCrawl().catch(err => { console.error(err); process.exit(1); });
} else {
  // Default: LinkedIn first, then school directories
  runCrawl()
    .then(() => runSchoolCrawl())
    .catch(err => { console.error(err); process.exit(1); });
}
