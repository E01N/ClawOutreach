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
import * as fs from 'fs';
import * as path from 'path';

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

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const FALLBACK_SYSTEM_PROMPT = `You are an outreach specialist writing personalised cold outreach. Return ONLY valid JSON — no markdown fences.`;

function loadSystemPrompt(): string {
  const promptPath = path.resolve('data/prompt.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8').trim();
  } catch {
    console.warn(`[draft] Warning: data/prompt.txt not found — using fallback placeholder prompt. Create this file to customise outreach generation.`);
    return FALLBACK_SYSTEM_PROMPT;
  }
}

const SYSTEM_PROMPT = loadSystemPrompt();

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
  const message = await getClient().messages.create({
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
