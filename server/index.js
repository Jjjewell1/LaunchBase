import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { syncCoolify } from './sync/coolify.js';
import { syncCloudflare } from './sync/cloudflare.js';
import { syncUnraid } from './sync/unraid.js';
import { syncIcons } from './sync/icons.js';
import { getApps } from './db.js';

async function syncAll() {
  await Promise.allSettled([syncCoolify(), syncCloudflare(), syncUnraid(), syncIcons()]);
}

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/apps', async (req, res) => {
  try {
    const apps = await getApps();
    res.json(apps);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch apps' });
  }
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

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`LaunchBase API running on port ${port}`);
});