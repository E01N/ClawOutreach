# ClawOutreach

An AI-powered sales prospecting agent built on [NanoClaw](https://github.com/qwibitai/nanoclaw) — built for a software sales professional in the higher education admissions space.

The agent finds relevant prospects, researches them using live industry sources, and drafts personalised outreach messages for manual review and sending. Nothing is sent automatically — the salesperson stays in full control.

---

## The problem

The product sells to a specific audience across a large territory — Directors of Admissions, Deans, Program Directors, and Enrolment leaders at healthcare, business, law, and other graduate programs across North America, Europe, and beyond. Finding the right person at the right institution, understanding their current context, and writing a message that speaks to their specific situation is a significant manual effort at scale.

ClawOutreach automates the research and drafting, so the salesperson can focus on the conversations.

---

## What it does

1. The user opens the dashboard and hits "Find leads" — no configuration needed
2. The agent runs pre-configured search criteria (target roles, verticals, and geographies) and crawls LinkedIn and industry sources for matching prospects
3. Before drafting, the agent researches each prospect — checking industry news sources for trigger events (new programs, leadership changes, accreditation news) and cross-referencing the company's own blog and case study library for relevant social proof
4. Each prospect is scored for relevance and surfaced in the dashboard, ready to review
5. Claude drafts a personalised cold email and LinkedIn DM for each lead, informed by the research
6. The user reviews the leads — editing drafts, approving, or asking the agent to redo a message
7. Approved emails send via Gmail (or open as a pre-filled draft). LinkedIn DMs copy to clipboard and open the profile for a manual paste

Search criteria (target personas, verticals, geographies) are defined by the developer and can be updated by the end user as the ideal customer profile is refined.

---

## Target use case

- **Seller:** Account Executive at a higher education admissions software company
- **Product:** An admissions assessment platform for asynchronous video interviews, live MMIs, and holistic review
- **Channels:** Cold email (Google Workspace Gmail) + LinkedIn DM
- **Volume:** Small batches of high-quality, personalised outreach — not mass blasting

---

## Intelligence sources

The agent draws on three layers of information before drafting any outreach:

**1. Company content library**
The agent references the company's blog and client case studies (100+ posts across all verticals) to identify relevant social proof for each prospect — matching the right success story to the right program type.

**2. Live industry news (35 monitored sources)**
Before drafting, the agent scans industry publications for recent news about the target institution — new program launches, leadership changes, accreditation announcements, or enrolment challenges. Sources include Inside Higher Ed, Chronicle of Higher Education, AAMC News, Poets&Quants, Student Doctor Network, Times Higher Education, and more.

**3. LinkedIn profile verification**
All prospect data is verified against current LinkedIn profiles before outreach is drafted, ensuring roles and institutions are up to date.

---

## Tools and technologies

| Layer | Tool | Purpose |
|---|---|---|
| Agent framework | [NanoClaw](https://github.com/qwibitai/nanoclaw) | Lightweight AI agent on Anthropic's Agent SDK, containerised via Docker |
| AI model | Claude (Anthropic API) | Research synthesis, lead scoring, draft generation, redo requests |
| Browser automation | agent-browser (Playwright, built into NanoClaw) | LinkedIn crawling and industry news monitoring |
| Knowledge base | Google Drive (AI READER folder) | Sales materials, call transcripts, CRM data, brochures |
| Review dashboard | Streamlit (Python) | Lead review UI — approve, edit, reject, redo |
| Database | SQLite | Local prospect storage |
| Email integration | Gmail API (Google Workspace OAuth) | Send emails or open pre-filled Gmail compose |
| LinkedIn | Clipboard + browser open | Copy DM to clipboard, open profile for manual paste |
| Language | TypeScript (agent/skills) + Python (dashboard) | |
| Version control | GitHub | |

---

## Project status

**In active development — Phase 1: Foundation**

- [x] Repo structure and tooling
- [x] NanoClaw setup and Docker configured
- [x] Telegram channel connected
- [ ] `/prospect` skill
- [ ] Lead crawling and scoring
- [ ] Draft generation via Claude API
- [ ] Google Drive knowledge base integration
- [ ] Industry news monitoring
- [ ] Streamlit review dashboard
- [ ] Gmail OAuth integration (Google Workspace)
- [ ] LinkedIn clipboard + open-profile action
- [ ] Redo / regenerate drafts
- [ ] Docs and setup guides

---

## Planned upgrades (post-MVP)

- Scheduled background runs (daily prospect discovery without manual trigger)
- LinkedIn DM automation via [Unipile API](https://www.unipile.com) (replace manual clipboard approach)
- Additional data sources (Apollo.io, Hunter.io for verified emails)
- CRM export (HubSpot / Salesforce)
- Deployment to an always-on server

---

## Disclaimer

This tool is intended for personalised, low-volume outreach only. LinkedIn scraping is subject to LinkedIn's [Terms of Service](https://linkedin.com/legal/user-agreement). Users are responsible for ensuring their use complies with applicable platform terms and data protection regulations.