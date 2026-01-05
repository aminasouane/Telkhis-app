import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'database.sqlite');

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

ensureDataDir();

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now')),
    subscription_type TEXT DEFAULT 'free' CHECK(subscription_type IN ('free', 'premium', 'pro_plus'))
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    transcript TEXT,
    key_points TEXT,
    language TEXT DEFAULT 'ar',
    audio_duration INTEGER,
    shared INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    minutes_used REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    payment_provider TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferred_language TEXT DEFAULT 'ar',
    notifications_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
  CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
`);

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface User {
  id: string;
  created_at: string;
  subscription_type: 'free' | 'premium' | 'pro_plus';
}

export interface Summary {
  id: string;
  user_id: string;
  title: string;
  content: string;
  transcript: string;
  key_points: string[];
  language: string;
  audio_duration: number | null;
  shared: boolean;
  created_at: string;
}

export interface Usage {
  id: number;
  user_id: string;
  date: string;
  minutes_used: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string | null;
  payment_provider: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  preferred_language: string;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function getOrCreateUser(userId: string): User {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (existing) return existing;
  
  db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
}

export function getUser(userId: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
}

export function saveSummary(data: {
  userId: string;
  title: string;
  content: string;
  transcript: string;
  keyPoints: string[];
  language: string;
  audioDuration?: number;
}): Summary {
  const id = generateUUID();
  const keyPointsJson = JSON.stringify(data.keyPoints || []);
  
  getOrCreateUser(data.userId);
  
  db.prepare(`
    INSERT INTO summaries (id, user_id, title, content, transcript, key_points, language, audio_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.title, data.content, data.transcript, keyPointsJson, data.language, data.audioDuration || null);
  
  const row = db.prepare('SELECT * FROM summaries WHERE id = ?').get(id) as any;
  return {
    ...row,
    key_points: JSON.parse(row.key_points || '[]'),
    shared: Boolean(row.shared)
  };
}

export function getSummaries(userId: string): Summary[] {
  const rows = db.prepare('SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  return rows.map(row => ({
    ...row,
    key_points: JSON.parse(row.key_points || '[]'),
    shared: Boolean(row.shared)
  }));
}

export function getSummaryById(summaryId: string, userId: string): Summary | undefined {
  const row = db.prepare('SELECT * FROM summaries WHERE id = ? AND user_id = ?').get(summaryId, userId) as any;
  if (!row) return undefined;
  return {
    ...row,
    key_points: JSON.parse(row.key_points || '[]'),
    shared: Boolean(row.shared)
  };
}

export function deleteSummary(summaryId: string, userId: string): boolean {
  const result = db.prepare('DELETE FROM summaries WHERE id = ? AND user_id = ?').run(summaryId, userId);
  return result.changes > 0;
}

export function getTodayUsage(userId: string): Usage | undefined {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare('SELECT * FROM usage WHERE user_id = ? AND date = ?').get(userId, today) as Usage | undefined;
}

export function getTotalUsage(userId: string): number {
  const result = db.prepare('SELECT COALESCE(SUM(minutes_used), 0) as total FROM usage WHERE user_id = ?').get(userId) as { total: number };
  return result.total;
}

export function getFirstUsageDate(userId: string): string | null {
  const result = db.prepare('SELECT MIN(date) as first_date FROM usage WHERE user_id = ?').get(userId) as { first_date: string | null };
  return result.first_date;
}

export function recordUsage(userId: string, minutes: number): Usage {
  const today = new Date().toISOString().split('T')[0];
  const existing = getTodayUsage(userId);
  
  getOrCreateUser(userId);
  
  if (existing) {
    db.prepare(`
      UPDATE usage SET minutes_used = minutes_used + ?, updated_at = datetime('now')
      WHERE user_id = ? AND date = ?
    `).run(minutes, userId, today);
  } else {
    db.prepare(`
      INSERT INTO usage (user_id, date, minutes_used)
      VALUES (?, ?, ?)
    `).run(userId, today, minutes);
  }
  
  return db.prepare('SELECT * FROM usage WHERE user_id = ? AND date = ?').get(userId, today) as Usage;
}

export function getActiveSubscription(userId: string): Subscription | undefined {
  return db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId) as Subscription | undefined;
}

export function createSubscription(data: {
  userId: string;
  planName: string;
  endDate?: string;
  paymentProvider?: string;
}): Subscription {
  db.prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`).run(data.userId);
  
  const id = generateUUID();
  const startDate = new Date().toISOString();
  
  db.prepare(`
    INSERT INTO subscriptions (id, user_id, plan_name, status, start_date, end_date, payment_provider)
    VALUES (?, ?, ?, 'active', ?, ?, ?)
  `).run(id, data.userId, data.planName, startDate, data.endDate || null, data.paymentProvider || null);
  
  const subscriptionType = data.planName.toLowerCase().replace(' ', '_') as 'free' | 'premium' | 'pro_plus';
  db.prepare('UPDATE users SET subscription_type = ? WHERE id = ?').run(subscriptionType, data.userId);
  
  return db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as Subscription;
}

export function getSettings(userId: string): Settings | undefined {
  return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId) as Settings | undefined;
}

export function upsertSettings(data: {
  userId: string;
  preferredLanguage?: string;
  notificationsEnabled?: boolean;
}): Settings {
  const existing = getSettings(data.userId);
  
  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.preferredLanguage !== undefined) {
      updates.push('preferred_language = ?');
      values.push(data.preferredLanguage);
    }
    if (data.notificationsEnabled !== undefined) {
      updates.push('notifications_enabled = ?');
      values.push(data.notificationsEnabled ? 1 : 0);
    }
    
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(data.userId);
      db.prepare(`UPDATE settings SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
    }
  } else {
    const id = generateUUID();
    db.prepare(`
      INSERT INTO settings (id, user_id, preferred_language, notifications_enabled)
      VALUES (?, ?, ?, ?)
    `).run(id, data.userId, data.preferredLanguage || 'ar', data.notificationsEnabled !== false ? 1 : 0);
  }
  
  return db.prepare('SELECT * FROM settings WHERE user_id = ?').get(data.userId) as Settings;
}

console.log('[SQLite] Database initialized at:', DB_PATH);
