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
  
  CREATE INDEX IF NOT EXISTS idx_apps_source ON apps(source, url);
  CREATE INDEX IF NOT EXISTS idx_apps_hidden ON apps(hidden);
`);

export function initDb() { /* ensured by schema above */ }

export async function getApps() {
  return db.prepare(
    'SELECT id, name, source, url, internal_url, icon, status, last_seen, hidden, "order" FROM apps ORDER BY hidden, "order"'
  ).all();
}

export async function addApp(name, source, url, internal_url, icon) {
  const stmt = db.prepare(
    'INSERT INTO apps (name, source, url, internal_url, icon, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, source, url, internal_url, icon, 'online');
  return { id: result.lastInsertRowid, ...{ name, source, url, internal_url, icon, status: 'online' } };
}

export async function updateApp(id, updates) {
  const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 1}`).join(', ');
  const values = [...Object.values(updates), id];
  const stmt = db.prepare(`UPDATE apps SET ${fields} WHERE id = ?`);
  stmt.run(...values);
}

export async function deleteApp(id) {
  db.prepare('DELETE FROM apps WHERE id = ?').run(id);
}