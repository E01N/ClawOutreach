/**
 * Prospect skill - Dashboard server
 *
 * Usage: npx tsx .claude/skills/prospect/server.ts
 * Opens: http://localhost:3100
 */

import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { openDb, getAllProspects, saveDraft } from './store.js';
import { generateDrafts } from './draft.js';
import { researchProspect, closeResearchBrowser } from './research.js';
import type Database from 'better-sqlite3';

const PORT = 3100;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

// --- DB helpers ---

function ensureApprovedColumn(db: Database.Database): void {
  try { db.exec('ALTER TABLE prospects ADD COLUMN approved INTEGER DEFAULT 0'); } catch { /* already exists */ }
}

function getProspectsData(db: Database.Database) {
  ensureApprovedColumn(db);
  return getAllProspects(db, 0).map(p => {
    const draft = (db as any).prepare('SELECT * FROM drafts WHERE prospect_id = ?').get(p.id) ?? null;
    return { ...p, draft };
  });
}

// --- Crawl process management ---

let crawlProcess: ChildProcess | null = null;
const crawlListeners: Array<(line: string) => void> = [];

function broadcast(line: string) {
  crawlListeners.forEach(fn => fn(line));
}

function startCrawl() {
  if (crawlProcess) return;
  const crawlPath = path.join(__dirname, 'crawl.ts');
  crawlProcess = spawn('npx', ['tsx', crawlPath], { cwd: process.cwd(), env: process.env, shell: true });
  crawlProcess.stdout?.on('data', d => broadcast(d.toString()));
  crawlProcess.stderr?.on('data', d => broadcast('[err] ' + d.toString()));
  crawlProcess.on('close', () => { broadcast('__DONE__'); crawlProcess = null; });
}

// --- Utilities ---

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('bad json')); } });
  });
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// --- Server ---

const HTML = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf-8');

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const pathname = new URL(req.url!, 'http://localhost').pathname;

  // Dashboard
  if (method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  // Prospects list
  if (method === 'GET' && pathname === '/api/prospects') {
    const db = openDb();
    json(res, 200, getProspectsData(db));
    return;
  }

  // Start crawl
  if (method === 'POST' && pathname === '/api/crawl') {
    startCrawl();
    json(res, 200, { status: crawlProcess ? 'started' : 'already_running' });
    return;
  }

  // Crawl log stream (SSE)
  if (method === 'GET' && pathname === '/api/crawl/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const emit = (line: string) => res.write('data: ' + line.replace(/\n/g, '\ndata: ') + '\n\n');
    crawlListeners.push(emit);
    req.on('close', () => crawlListeners.splice(crawlListeners.indexOf(emit), 1));
    if (!crawlProcess) emit('__DONE__'); // not running — tell client immediately
    return;
  }

  // Save edited draft
  if (method === 'PUT' && pathname.startsWith('/api/draft/')) {
    const id = parseInt(pathname.split('/').pop()!);
    const body = await parseBody(req);
    const db = openDb();
    saveDraft(db, { prospect_id: id, email_subject: body.email_subject, email_body: body.email_body, linkedin_dm: body.linkedin_dm, drafted_at: new Date().toISOString() });
    json(res, 200, { ok: true });
    return;
  }

  // Regenerate draft
  if (method === 'POST' && pathname.startsWith('/api/redraft/')) {
    const id = parseInt(pathname.split('/').pop()!);
    const db = openDb();
    const p = (db as any).prepare('SELECT * FROM prospects WHERE id = ?').get(id);
    if (!p) { json(res, 404, { error: 'not found' }); return; }
    try {
      const research = await researchProspect(p.name, p.institution, p.program_area).catch(() => undefined);
      await closeResearchBrowser();
      const drafts = await generateDrafts(p, research);
      saveDraft(db, { prospect_id: id, ...drafts, drafted_at: new Date().toISOString() });
      json(res, 200, { ok: true });
    } catch (err) {
      json(res, 500, { error: String(err) });
    }
    return;
  }

  // Clear all prospects and drafts
  if (method === 'POST' && pathname === '/api/clear') {
    const db = openDb();
    (db as any).prepare('DELETE FROM drafts').run();
    (db as any).prepare('DELETE FROM prospects').run();
    json(res, 200, { ok: true });
    return;
  }

  // Toggle approved
  if (method === 'POST' && pathname.startsWith('/api/approve/')) {
    const id = parseInt(pathname.split('/').pop()!);
    const db = openDb();
    ensureApprovedColumn(db);
    const row = (db as any).prepare('SELECT approved FROM prospects WHERE id = ?').get(id) as { approved: number } | undefined;
    const next = row?.approved ? 0 : 1;
    (db as any).prepare('UPDATE prospects SET approved = ? WHERE id = ?').run(next, id);
    json(res, 200, { approved: next === 1 });
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log('[prospect] Dashboard running at http://localhost:' + PORT);
});
