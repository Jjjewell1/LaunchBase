import Database from 'better-sqlite3';

const db = new Database('data/apps.db', { readonly: false });

db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    internal_url TEXT,
    icon TEXT DEFAULT 'default',
    status TEXT DEFAULT 'online',
    last_seen TEXT,
    hidden INTEGER DEFAULT 0,
    "order" INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_source_url ON apps(source, url);
  CREATE INDEX IF NOT EXISTS idx_apps_hidden ON apps(hidden);
`);

// One-time cleanup of duplicates created by earlier non-upsert inserts
db.exec(`
  DELETE FROM apps
  WHERE id NOT IN (
    SELECT MIN(id) FROM apps GROUP BY source, url
  );
`);

export function initDb() { /* ensured by schema above */ }

export async function getApps() {
  return db.prepare(
    'SELECT id, name, source, url, internal_url, icon, status, last_seen, hidden, "order" FROM apps WHERE hidden = 0 ORDER BY source, "order", name'
  ).all();
}

export function upsertApp(name, source, url, internal_url = null, icon = null) {
  const stmt = db.prepare(`
    INSERT INTO apps (name, source, url, internal_url, icon, status)
    VALUES (?, ?, ?, ?, ?, 'online')
    ON CONFLICT(source, url) DO UPDATE SET
      name = COALESCE(excluded.name, apps.name),
      internal_url = COALESCE(excluded.internal_url, apps.internal_url),
      icon = COALESCE(excluded.icon, apps.icon),
      updated_at = datetime('now')
  `);
  return stmt.run(name, source, url, internal_url, icon);
}

// Legacy alias used by older sync modules
export const addApp = upsertApp;

export async function updateApp(id, updates) {
  const fields = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  const stmt = db.prepare(`UPDATE apps SET ${fields}, updated_at = datetime('now') WHERE id = ?`);
  stmt.run(...values);
}

export async function deleteApp(id) {
  db.prepare('DELETE FROM apps WHERE id = ?').run(id);
}
