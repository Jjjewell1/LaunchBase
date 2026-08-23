import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import './sync/coolify.js';
import './sync/cloudflare.js';
import './sync/unraid.js';
import './sync/icons.js';
import { getApps } from './db.js';

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

// Initial sync on server start - modules run on import
// syncCoolify, syncCloudflare, syncUnraid, syncIcons fire on import

const server = http.createServer(app);
server.listen(port, () => {
  console.log(`LaunchBase API running on port ${port}`);
});