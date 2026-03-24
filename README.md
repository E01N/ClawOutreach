# ClawOutreach

An AI-powered sales prospecting agent built on [NanoClaw](https://github.com/qwibitai/nanoclaw) — specifically targeting universities and higher education institutions as potential customers for admissions software.

The agent finds relevant prospects, scores them, and drafts personalised outreach messages for manual review and sending. Nothing is sent automatically, the end user stays in full control.

---

## The problem

Finding the right people at the right universities is time-consuming. Admissions software sells to a fairly specific audience — heads of admissions, registrars, VP-level enrolment leaders, IT decision-makers in higher education. Tracking them down, researching their context, and writing a personalised message for each one is a significant manual effort.

This project automates the research and drafting, so the salesperson can focus on the relationships.

---

## What it does
 
1. The user opens the dashboard and hits "Find leads"
2. An AI agent runs pre-configured search criteria (target roles, institutions, and signals relevant to admissions software buyers) and crawls LinkedIn and other sources for matching prospects
3. Each prospect is scored for relevance and surfaced in the dashboard, ready to review
4. Claude drafts a personalised cold email and LinkedIn DM for each lead
5. The user reviews the leads — editing drafts, approving, or asking the agent to redo a message
6. Approved emails send via Gmail (or open as a pre-filled draft). LinkedIn DMs copy to clipboard and open the profile for a manual paste
 
Search criteria (target personas, industries, keywords, etc.) are defined by the developer and can be updated by the end user as the ideal customer profile is refined.
 
---

## Target use case

- **Seller:** A software sales professional at a company selling admissions management software to universities
- **Buyer personas:** Heads of Admissions, Directors of Enrolment, Registrars, VP Academic Affairs, EdTech IT leads at higher education institutions
- **Channels:** Cold email (Gmail) + LinkedIn DM
- **Volume:** Small batches of high-quality, personalised outreach — not mass blasting

---

## Tools and technologies

| Layer | Tool | Purpose |
|---|---|---|
| Agent framework | [NanoClaw](https://github.com/qwibitai/nanoclaw) | Lightweight AI agent running on Anthropic's Agent SDK, containerised via Docker |
| AI model | Claude (Anthropic API) | Lead scoring, draft generation, redo requests |
| Browser automation | agent-browser (Playwright, built into NanoClaw) | LinkedIn and web crawling |
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
- [x] Telegram channel connected (required by NanoClaw but won't be used)
- [ ] /prospect skill
- [ ] Lead crawling and scoring
- [ ] Draft generation via Claude API
- [ ] Streamlit review dashboard
- [ ] Gmail OAuth integration
- [ ] LinkedIn clipboard + open-profile action
- [ ] Redo / regenerate drafts
- [ ] Docs and setup guides

---

## Planned upgrades (post-MVP)

- Scheduled background runs (daily prospect discovery without manual trigger)
- Additional data sources (Apollo.io, Hunter.io for verified emails)
- CRM export (HubSpot / Salesforce)
- Deployment to an always-on server

---

## Disclaimer

This tool is intended for personalised, low-volume outreach only. LinkedIn scraping is subject to LinkedIn's [Terms of Service](https://linkedin.com/legal/user-agreement). Users are responsible for ensuring their use complies with applicable platform terms and data protection regulations.