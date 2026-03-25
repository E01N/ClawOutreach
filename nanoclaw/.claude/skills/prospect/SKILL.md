---
name: prospect
description: LinkedIn prospecting skill for admissions software sales. Crawls LinkedIn for Directors of Admissions, Program Directors, Deans, and Enrollment leaders at higher education institutions running healthcare, business, law, and allied health graduate programs. Scores each prospect 0-10, drafts personalised cold emails and LinkedIn DMs using Claude, and stores everything in data/prospects.db. Triggers on "prospect", "find leads", "run prospecting", "find admissions contacts".
---

# Prospect Skill

LinkedIn crawler and AI outreach drafter for admissions software sales.

**Targets:** Directors of Admissions, Program Directors, Deans, and Enrollment leaders at graduate/professional programs in healthcare, business, law, and allied health.

**Output:** Scored prospects + personalised cold email and LinkedIn DM drafts stored in `data/prospects.db`. Nothing is sent automatically — all drafts are for manual review.

## Prerequisites

```bash
# Install dependencies (one-time)
npm install playwright @anthropic-ai/sdk
npx playwright install chromium

# Confirm ANTHROPIC_API_KEY is set
grep ANTHROPIC_API_KEY .env
```

## Step 1 — Authenticate LinkedIn (one-time)

```bash
npx tsx .claude/skills/prospect/crawl.ts --setup
```

This opens a visible Chromium window. Log in to LinkedIn manually, then press Enter in the terminal. The session is saved to `data/linkedin-profile/` and reused on subsequent runs.

**Verify:**
```bash
cat data/linkedin-auth.json   # Should show { "authenticated": true, ... }
```

## Step 2 — Run prospecting

```bash
npx tsx .claude/skills/prospect/crawl.ts
```

The crawler:
1. Opens your saved LinkedIn session
2. Runs up to 5 search queries targeting admissions/enrollment roles
3. Collects up to 30 unique profile URLs
4. Visits each profile with a 3–5 second random delay between requests
5. Scores each prospect 0–10
6. Generates a cold email + LinkedIn DM for any prospect scoring 5 or above
7. Stores everything in `data/prospects.db`
8. Stops immediately and reports back if LinkedIn shows a CAPTCHA or security challenge

**Scoring breakdown (max 10):**

| Component | Max points |
|-----------|-----------|
| Title match (Director/Dean/VP of Admissions, Program Director, etc.) | 5 |
| Program area (healthcare/allied health 3pts, business/law 2pts, other grad 1pt) | 3 |
| Institution context (grad school, professional college, university) | 2 |

## Step 3 — Review results

```bash
# Print all prospects with scores
npx tsx .claude/skills/prospect/crawl.ts --list

# Browse the SQLite DB directly
sqlite3 data/prospects.db "SELECT name, title, institution, score FROM prospects ORDER BY score DESC;"
sqlite3 data/prospects.db "SELECT p.name, d.email_subject, d.linkedin_dm FROM drafts d JOIN prospects p ON p.id = d.prospect_id ORDER BY p.score DESC;"
```

## File structure

```
.claude/skills/prospect/
├── SKILL.md       # This file
├── crawl.ts       # Main entry point — orchestrates the full run
├── score.ts       # Pure scoring function (no API calls)
├── draft.ts       # Anthropic API draft generation
└── store.ts       # SQLite operations for data/prospects.db
```

## Data paths

| Path | Purpose | Git |
|------|---------|-----|
| `data/prospects.db` | All prospects and drafts | Ignored |
| `data/linkedin-profile/` | Chromium session (LinkedIn cookies) | Ignored |
| `data/linkedin-auth.json` | Auth marker | Ignored |

## Troubleshooting

**"LinkedIn not authenticated"** — Run `--setup` again.

**"Session expired"** — Run `--setup` again; the old profile is reused so you just need to log in once more.

**CAPTCHA / blocking** — The crawler stops automatically. Wait a few hours before re-running. Avoid running more than once per day.

**Draft generation fails** — Check that `ANTHROPIC_API_KEY` is set in `.env` and that `@anthropic-ai/sdk` is installed.

**LinkedIn selectors broken** — LinkedIn updates their DOM frequently. If profile data is not extracting correctly, open a profile in the crawler's Chromium window and inspect the elements, then update the selectors in `crawl.ts` around the `page.evaluate()` call.

## Customising search queries

Edit the `SEARCH_QUERIES` array in `crawl.ts` to target different roles or add industry-specific terms. Each query maps to one LinkedIn people search results page (up to 10 profiles).

## Customising outreach tone

Edit the `SYSTEM_PROMPT` and `USER_TEMPLATE` in `draft.ts`. The prompt currently positions the product as a graduate admissions CRM with AI-assisted review, automated communications, and real-time analytics. Update the product description to match your actual offering.
