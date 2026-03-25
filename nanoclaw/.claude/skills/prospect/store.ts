/**
 * Prospect skill - SQLite storage
 * Database: data/prospects.db
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'prospects.db');

export interface Prospect {
  name: string;
  title: string;
  institution: string;
  program_area: string; // healthcare | business | law | allied_health | other
  linkedin_url: string;
  location: string;
  headline: string;
  about: string;
  score: number;
  score_reason: string;
  crawled_at: string;
}

export interface Draft {
  prospect_id: number;
  email_subject: string;
  email_body: string;
  linkedin_dm: string;
  drafted_at: string;
}

export function openDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      institution TEXT NOT NULL,
      program_area TEXT NOT NULL,
      linkedin_url TEXT UNIQUE NOT NULL,
      location TEXT DEFAULT '',
      headline TEXT DEFAULT '',
      about TEXT DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      score_reason TEXT DEFAULT '',
      crawled_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_prospect_url ON prospects(linkedin_url);
    CREATE INDEX IF NOT EXISTS idx_prospect_score ON prospects(score DESC);

    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prospect_id INTEGER NOT NULL UNIQUE,
      email_subject TEXT DEFAULT '',
      email_body TEXT DEFAULT '',
      linkedin_dm TEXT DEFAULT '',
      drafted_at TEXT NOT NULL,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id)
    );
  `);

  return db;
}

/** Insert or update prospect. Returns the row id. */
export function upsertProspect(db: Database.Database, p: Prospect): number {
  const existing = db
    .prepare('SELECT id FROM prospects WHERE linkedin_url = ?')
    .get(p.linkedin_url) as { id: number } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE prospects
      SET name=?, title=?, institution=?, program_area=?, location=?, headline=?, about=?, score=?, score_reason=?, crawled_at=?
      WHERE linkedin_url=?
    `).run(p.name, p.title, p.institution, p.program_area, p.location, p.headline, p.about, p.score, p.score_reason, p.crawled_at, p.linkedin_url);
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO prospects (name, title, institution, program_area, linkedin_url, location, headline, about, score, score_reason, crawled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(p.name, p.title, p.institution, p.program_area, p.linkedin_url, p.location, p.headline, p.about, p.score, p.score_reason, p.crawled_at);

  return result.lastInsertRowid as number;
}

/** Save or replace draft for a prospect. */
export function saveDraft(db: Database.Database, d: Draft): void {
  db.prepare(`
    INSERT INTO drafts (prospect_id, email_subject, email_body, linkedin_dm, drafted_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(prospect_id) DO UPDATE SET
      email_subject=excluded.email_subject,
      email_body=excluded.email_body,
      linkedin_dm=excluded.linkedin_dm,
      drafted_at=excluded.drafted_at
  `).run(d.prospect_id, d.email_subject, d.email_body, d.linkedin_dm, d.drafted_at);
}

/** Returns true if this LinkedIn URL has already been crawled. */
export function alreadyCrawled(db: Database.Database, linkedinUrl: string): boolean {
  return !!db.prepare('SELECT id FROM prospects WHERE linkedin_url = ?').get(linkedinUrl);
}

/** Get all prospects ordered by score descending. */
export function getAllProspects(db: Database.Database, minScore = 0): Array<Prospect & { id: number }> {
  return db
    .prepare('SELECT * FROM prospects WHERE score >= ? ORDER BY score DESC, crawled_at DESC')
    .all(minScore) as Array<Prospect & { id: number }>;
}

/** Get all drafts joined to prospects. */
export function getAllDrafts(db: Database.Database): Array<{ prospect: string; title: string; institution: string; score: number; email_subject: string; email_body: string; linkedin_dm: string }> {
  return db.prepare(`
    SELECT p.name as prospect, p.title, p.institution, p.score,
           d.email_subject, d.email_body, d.linkedin_dm
    FROM drafts d
    JOIN prospects p ON p.id = d.prospect_id
    ORDER BY p.score DESC
  `).all() as ReturnType<typeof getAllDrafts>;
}
