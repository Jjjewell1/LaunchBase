import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { syncCoolify } from './sync/coolify.js';
import { syncCloudflare } from './sync/cloudflare.js';
import { syncUnraid } from './sync/unraid.js';
import { syncIcons } from './sync/icons.js';
import { getApps, getAppById, updateApp } from './db.js';

const lastSync = { startedAt: null, finishedAt: null, results: {} };

async function syncAll() {
  lastSync.startedAt = new Date().toISOString();
  const jobs = [
    ['coolify', syncCoolify],
    ['cloudflare', syncCloudflare],
    ['unraid', syncUnraid],
    ['icons', syncIcons],
  ];
  await Promise.all(jobs.map(async ([name, fn]) => {
    try {
      await fn();
      lastSync.results[name] = 'ok';
    } catch (err) {
      lastSync.results[name] = `error: ${err.message}`;
      console.error(`${name} sync failed:`, err.message);
    }
  }));
  lastSync.finishedAt = new Date().toISOString();
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/icons', express.static(path.join('data', 'icons'), { maxAge: '7d' }));

app.get('/api/apps', async (req, res) => {
  try {
    const apps = await getApps({ includeHidden: req.query.all === '1' ? false : true });
    res.json(apps);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
});

// Per-app preferences (hide/unhide, icon override)
app.patch('/api/apps/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  const allowed = {};
  if ('hidden' in req.body) allowed.hidden = req.body.hidden ? 1 : 0;
  if ('icon' in req.body) allowed.icon = String(req.body.icon || '');
  if (Object.keys(allowed).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  try {
    if (!getAppById(id)) return res.status(404).json({ error: 'App not found' });
    await updateApp(id, allowed);
    const app = await getAppById(id);
    res.json(app);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), lastSync });
});

app.post('/api/sync/now', async (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.SYNC_SECRET) {
    return res.status(403).json({ error: 'Invalid sync secret' });
  }
  try {
    await syncAll();
    const apps = await getApps();
    res.json({ success: true, apps });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Initial sync on server start
syncAll().catch(err => console.error('Initial sync failed:', err));

// Auto-discovery: resync every 10 minutes so new apps appear automatically
const SYNC_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  syncAll().catch(err => console.error('Scheduled sync failed:', err));
}, SYNC_INTERVAL);

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`LaunchBase API running on port ${port}`);
});