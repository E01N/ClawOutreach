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
import path from 'path';
import fs from 'fs';
import { scoreProspect } from './score.js';
import { generateDrafts } from './draft.js';
import { openDb, upsertProspect, saveDraft, alreadyCrawled, getAllProspects } from './store.js';

// --- Config ---

const PROFILE_DIR  = path.join(process.cwd(), 'data', 'linkedin-profile');
const AUTH_MARKER  = path.join(process.cwd(), 'data', 'linkedin-auth.json');
const MAX_PROFILES = 30;
const MIN_SCORE_FOR_DRAFT = 5;

// Delays in ms
const DELAY_MIN = 3000;
const DELAY_MAX = 5000;

// Target LinkedIn people searches.
// Results pages return up to 10 profiles each.
const SEARCH_QUERIES = [
  'director of admissions graduate school',
  'dean of admissions professional program healthcare',
  'enrollment director graduate university',
  'program director healthcare graduate admissions',
  'director enrollment management higher education',
];

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
    console.log(`  [${p.score}/10] ${p.name} — ${p.title} @ ${p.institution}`);
    console.log(`         ${p.linkedin_url}`);
    console.log(`         ${p.score_reason}\n`);
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

  for (const query of SEARCH_QUERIES) {
    if (profileUrls.length >= MAX_PROFILES) break;

    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}&origin=GLOBAL_SEARCH_HEADER`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    if (await isBlocked(page)) {
      log('BLOCKED: LinkedIn is showing a CAPTCHA. Stopping collection early.');
      break;
    }

    // Extract profile links from search results
    const links: string[] = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/in/"]'));
      return anchors
        .map(a => (a as HTMLAnchorElement).href)
        .filter(h => /linkedin\.com\/in\/[^/?]+/.test(h))
        .map(h => {
          const m = h.match(/(https:\/\/www\.linkedin\.com\/in\/[^/?#]+)/);
          return m ? m[1] : '';
        })
        .filter(Boolean);
    });

    const unique = [...new Set(links)].filter(u => !profileUrls.includes(u));
    log(`Query "${query}": found ${unique.length} new profile URL(s)`);
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

    // Extract profile data
    const profileData = await page.evaluate(() => {
      const text = (sel: string): string =>
        (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? '';

      // Name: LinkedIn always has an h1 on the profile
      const name = text('h1');

      // Headline: paragraph immediately below the name section
      const headline = text('.text-body-medium.break-words') ||
                       text('[data-generated-suggestion-target]') ||
                       '';

      // Location
      const location = text('.pv-text-details__left-panel .text-body-small.inline') ||
                       text('.pb2 .pv-text-details__left-panel span') ||
                       '';

      // About section
      const about = text('#about ~ div .pv-shared-text-with-see-more') ||
                    text('[data-field="summary"]') ||
                    '';

      // Current position (title + institution from experience)
      const experienceItems = Array.from(
        document.querySelectorAll('.pvs-list__item--line-separated')
      );
      let title = '';
      let institution = '';

      // Try to get title/institution from the top experience item
      if (experienceItems.length > 0) {
        const item = experienceItems[0] as HTMLElement;
        const spans = Array.from(item.querySelectorAll('span[aria-hidden="true"]'))
          .map(s => (s as HTMLElement).innerText?.trim())
          .filter(t => t && t.length > 1);
        if (spans.length >= 2) {
          title       = spans[0];
          institution = spans[1];
        } else if (spans.length === 1) {
          title = spans[0];
        }
      }

      // Fallback: headline often contains "Title at Institution"
      if (!title && headline.includes(' at ')) {
        const parts = headline.split(' at ');
        title       = parts[0].trim();
        institution = parts.slice(1).join(' at ').trim();
      }

      return { name, title, institution, headline, location, about };
    });

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
        log(`  Drafting outreach for ${profileData.name}...`);
        const drafts = await generateDrafts({
          name:         profileData.name,
          title:        profileData.title,
          institution:  profileData.institution,
          program_area: programArea,
          headline:     profileData.headline,
          about:        profileData.about,
        });
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

// --- Entry point ---

const args = process.argv.slice(2);

if (args.includes('--setup')) {
  runSetup().catch(err => { console.error(err); process.exit(1); });
} else if (args.includes('--list')) {
  runList();
} else {
  runCrawl().catch(err => { console.error(err); process.exit(1); });
}
