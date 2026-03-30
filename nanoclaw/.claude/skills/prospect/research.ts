/**
 * Prospect skill - Pre-draft research
 *
 * Searches higher-ed news sources for recent mentions of an institution,
 * then matches the prospect's vertical against the blog/case-study index to
 * surface the most relevant social proof for outreach.
 *
 * Usage (from crawl.ts):
 *   const result = await researchProspect(name, institution, programArea);
 *   // pass result to generateDrafts()
 *
 * Call closeResearchBrowser() once after the crawl loop to release resources.
 */

import { chromium, Browser, Page } from 'playwright';
import { matchCaseStudies, BlogEntry } from './blog-index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResearchResult {
  /** Recent news snippets found across higher-ed sources (article titles / blurbs). */
  newsSnippets: string[];
  /** 2-3 blog / case-study entries matched to the prospect's vertical. */
  caseStudies: BlogEntry[];
  /**
   * Pre-formatted summary string ready for injection into the draft prompt.
   * Combines news context and case-study social proof in one paragraph.
   */
  summary: string;
}

// ─── News sources ─────────────────────────────────────────────────────────────

interface NewsSource {
  name: string;
  searchUrl: (query: string) => string;
  /** CSS selectors to try, in order, for result titles/snippets. */
  selectors: string[];
}

const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'Inside Higher Ed',
    searchUrl: q => `https://www.insidehighered.com/search?q=${encodeURIComponent(q)}`,
    selectors: [
      'h3.node__title a',
      '.search-result__title',
      'article h2 a',
      'h2.node__title a',
    ],
  },
  {
    name: 'Chronicle of Higher Education',
    searchUrl: q => `https://www.chronicle.com/search?q=${encodeURIComponent(q)}`,
    selectors: [
      '.article-headline a',
      'h3 a',
      '.search-result h2 a',
      'article h2',
    ],
  },
  {
    name: 'AAMC News',
    searchUrl: q => `https://www.aamc.org/news?search=${encodeURIComponent(q)}`,
    selectors: [
      '.news-title',
      '.card__title',
      'h3 a',
      'article h2',
    ],
  },
  {
    name: 'Poets & Quants',
    searchUrl: q => `https://poetsandquants.com/?s=${encodeURIComponent(q)}`,
    selectors: [
      'h2.entry-title a',
      '.post-title a',
      'article h2 a',
      'h3 a',
    ],
  },
  {
    name: 'Times Higher Education',
    searchUrl: q => `https://www.timeshighereducation.com/search#q=${encodeURIComponent(q)}&sort=rank&wt=json`,
    selectors: [
      '.the-listing__title',
      'h3.article-title',
      'article h2 a',
      'h3 a',
    ],
  },
  {
    name: 'Student Doctor Network',
    searchUrl: q =>
      `https://forums.studentdoctor.net/search/?q=${encodeURIComponent(q)}&type=post`,
    selectors: [
      'h3.contentRow-title a',
      '.search-result-title a',
      'h3 a',
      'article h2 a',
    ],
  },
];

// ─── Shared browser instance ──────────────────────────────────────────────────

let _browser: Browser | null = null;

async function getResearchBrowser(): Promise<Browser> {
  if (!_browser) {
    _browser = await chromium.launch({ headless: true });
  }
  return _browser;
}

/** Call once after the crawl loop to release the browser process. */
export async function closeResearchBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function scrapeSnippets(page: Page, source: NewsSource, query: string): Promise<string[]> {
  try {
    await page.goto(source.searchUrl(query), { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);

    // Try each selector until we get results
    for (const selector of source.selectors) {
      const snippets: string[] = await page.evaluate(`(() => {
        const els = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
        return els
          .slice(0, 2)
          .map(el => el.innerText?.trim() || el.textContent?.trim() || '')
          .filter(t => t.length > 10);
      })()`);

      if (snippets.length > 0) {
        return snippets.map(s => `[${source.name}] ${s}`);
      }
    }

    // Fallback: grab first two visible headings on the page
    const fallback: string[] = await page.evaluate(`(() => {
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      return headings
        .slice(0, 2)
        .map(el => el.innerText?.trim() || '')
        .filter(t => t.length > 15 && t.length < 200);
    })()`);

    return fallback.map(s => `[${source.name}] ${s}`);
  } catch {
    // Network error, timeout, or paywall redirect — skip silently
    return [];
  }
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Research a prospect before drafting outreach.
 *
 * @param name        Prospect's full name (used for logging only)
 * @param institution Institution name to search for in the news
 * @param vertical    Program area label from crawl.ts
 *                    ('healthcare' | 'allied_health' | 'business' | 'law' | 'graduate' | 'other')
 */
export async function researchProspect(
  name: string,
  institution: string,
  vertical: string,
): Promise<ResearchResult> {
  console.log(`[research] Researching ${name} @ ${institution} (${vertical})...`);

  const browser = await getResearchBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const newsSnippets: string[] = [];

  // Use the institution name as the search query, capped to keep URLs reasonable
  const query = institution.length > 60 ? institution.slice(0, 60) : institution;

  for (const source of NEWS_SOURCES) {
    const snippets = await scrapeSnippets(page, source, query);
    newsSnippets.push(...snippets);
    if (snippets.length > 0) {
      console.log(`[research]   ${source.name}: ${snippets.length} result(s)`);
    }
  }

  await context.close();

  // Match relevant case studies
  const caseStudies = matchCaseStudies(vertical);

  // Build the summary string
  const newsPart =
    newsSnippets.length > 0
      ? `Recent news about ${institution}: ${newsSnippets.slice(0, 4).join(' | ')}.`
      : '';

  const caseStudyPart =
    caseStudies.length > 0
      ? `Relevant Kira case studies for this vertical: ${caseStudies
          .map(cs => `"${cs.title}" — ${cs.outcome} (${cs.url})`)
          .join(' | ')}.`
      : '';

  const summary = [newsPart, caseStudyPart].filter(Boolean).join(' ');

  console.log(
    `[research] Done. ${newsSnippets.length} news snippet(s), ${caseStudies.length} case study match(es).`,
  );

  return { newsSnippets, caseStudies, summary };
}
