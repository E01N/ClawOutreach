/**
 * Prospect skill - Draft generator
 *
 * Uses the Anthropic API to write a personalised cold email and a short
 * LinkedIn DM for each qualifying prospect.
 *
 * Requires ANTHROPIC_API_KEY in the environment (set in .env).
 * Install: npm install @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ProspectProfile {
  name: string;
  title: string;
  institution: string;
  program_area: string;
  headline: string;
  about: string;
}

export interface OutreachDrafts {
  email_subject: string;
  email_body: string;
  linkedin_dm: string;
}

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an outreach specialist writing personalised cold outreach for an admissions assessment platform.

The product helps universities and graduate programs run asynchronous video interviews, live virtual MMIs,
and holistic review at scale. It is trusted by medical schools, nursing programs, pharmacy schools,
business schools, law schools, veterinary programs, physical therapy programs, and other selective
graduate programs across North America, Europe, and internationally.

Key outcomes clients achieve:
- Saving hundreds of hours of faculty time per admissions cycle
- Reducing bias in the review process
- Increasing applicant diversity
- Improving the applicant experience
- Scaling interviews without adding headcount

Rules:
- Never fabricate facts about the prospect. Only use what is provided.
- Tailor the outcome you lead with to the prospect's program type (e.g. faculty time for medical schools,
  diversity for business schools, scaling for high-volume programs).
- Cold email: professional, 120-160 words, one outcome-led hook, one clear CTA (15-minute call).
- LinkedIn DM: conversational, under 300 characters, no hard sell, curiosity-driven.
- Do not use hollow openers like "I hope this email finds you well."
- Do not use emojis.
- Return ONLY valid JSON — no markdown fences.`;

const USER_TEMPLATE = (p: ProspectProfile) => `
Generate outreach for this prospect:

Name: ${p.name}
Title: ${p.title}
Institution: ${p.institution}
Program area: ${p.program_area}
Headline: ${p.headline}
About: ${p.about.slice(0, 500)}

Return a JSON object with exactly these keys:
{
  "email_subject": "...",
  "email_body": "...",
  "linkedin_dm": "..."
}
`;

export async function generateDrafts(prospect: ProspectProfile): Promise<OutreachDrafts> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: USER_TEMPLATE(prospect) }
    ],
  });

  const text = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: OutreachDrafts;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Strip any accidental markdown fences and retry
    const cleaned = text.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    parsed = JSON.parse(cleaned);
  }

  return parsed;
}
