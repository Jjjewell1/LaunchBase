import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { syncCoolify } from './sync/coolify.js';
import { syncCloudflare } from './sync/cloudflare.js';
import { syncUnraid } from './sync/unraid.js';
import { syncIcons } from './sync/icons.js';
import { getApps } from './db.js';

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
    const apps = await getApps();
    res.json(apps);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch apps' });
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