import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'bot.db');

// ─── Initialize ────────────────────────────────────────────────────────────────
fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS send_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prefix TEXT NOT NULL,
    keyword TEXT,
    full_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'success',
    error TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );
`);

// ─── Default keywords ─────────────────────────────────────────────────────────
const DEFAULT_KEYWORDS = ['中！', '回家！', '冲冲冲', '来了来了', '可以可以', '太棒了', '可以啊', '不错不错'];

const insertKeyword = db.prepare('INSERT OR IGNORE INTO keywords (text) VALUES (?)');
for (const kw of DEFAULT_KEYWORDS) {
  insertKeyword.run(kw);
}

// ─── Prepared statements ──────────────────────────────────────────────────────
const stmtListKeywords = db.prepare('SELECT id, text, enabled FROM keywords ORDER BY id');
const stmtAddKeyword = db.prepare('INSERT INTO keywords (text) VALUES (?)');
const stmtRemoveKeyword = db.prepare('DELETE FROM keywords WHERE id = ?');
const stmtToggleKeyword = db.prepare('UPDATE keywords SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?');
const stmtLogSend = db.prepare('INSERT INTO send_logs (prefix, keyword, full_message, status, error) VALUES (?, ?, ?, ?, ?)');
const stmtTotal = db.prepare('SELECT COUNT(*) as total FROM send_logs');
const stmtToday = db.prepare("SELECT COUNT(*) as count FROM send_logs WHERE date(created_at) = date('now','localtime')");
const stmtTodaySuccess = db.prepare("SELECT COUNT(*) as count FROM send_logs WHERE date(created_at) = date('now','localtime') AND status = 'success'");
const stmtTodayFail = db.prepare("SELECT COUNT(*) as count FROM send_logs WHERE date(created_at) = date('now','localtime') AND status != 'success'");
const stmtRecentRate = db.prepare(`
  SELECT strftime('%H:%M', created_at) as time, COUNT(*) as count
  FROM send_logs
  WHERE created_at >= datetime('now','localtime','-30 minutes')
  GROUP BY strftime('%H:%M', created_at)
  ORDER BY time
`);
const stmtDailyHistory = db.prepare(`
  SELECT date(created_at) as date, COUNT(*) as count
  FROM send_logs
  WHERE created_at >= datetime('now','localtime','-7 days')
  GROUP BY date(created_at)
  ORDER BY date
`);

// ─── Exported functions ───────────────────────────────────────────────────────

export function listKeywords() {
  return stmtListKeywords.all();
}

export function addKeyword(text) {
  stmtAddKeyword.run(text);
  return listKeywords();
}

export function removeKeyword(id) {
  stmtRemoveKeyword.run(id);
  return listKeywords();
}

export function toggleKeyword(id) {
  stmtToggleKeyword.run(id);
  return listKeywords();
}

export function logSend(prefix, keyword, fullMessage, status = 'success', error = null) {
  stmtLogSend.run(prefix, keyword, fullMessage, status, error);
}

export function getStats() {
  const total = stmtTotal.get().total;
  const today = stmtToday.get().count;
  const todaySuccess = stmtTodaySuccess.get().count;
  const todayFail = stmtTodayFail.get().count;
  const recentRate = stmtRecentRate.all();
  const dailyHistory = stmtDailyHistory.all();

  return { total, today, todaySuccess, todayFail, recentRate, dailyHistory };
}
