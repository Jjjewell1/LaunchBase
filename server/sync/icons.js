import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getApps, updateApp } from '../db.js';

const ICONS_DIR = path.join('data', 'icons');
const METADATA_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json';
const CONCURRENCY = 10;
let metadataCache = null;

export async function syncIcons() {
  try {
    const metaRes = await axios.get(METADATA_URL);
    // metadata.json format: { "<icon-name>": { name, svg, ... }, ... }
    const metadata = metaRes.data;
    const icons = Object.entries(metadata || {})
      .map(([key, entry]) => ({ name: key, svg: entry?.svg }))
      .filter(i => i.svg);

    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    let downloaded = 0;
    let skipped = 0;

    async function downloadOne(icon) {
      const filePath = path.join(ICONS_DIR, `${icon.name}.svg`);
      if (fs.existsSync(filePath)) {
        skipped++;
        return;
      }
      try {
        const imgRes = await axios.get(icon.svg, { responseType: 'arraybuffer' });
        fs.writeFileSync(filePath, imgRes.data);
        downloaded++;
      } catch {
        // Skip individual failures
      }
    }

    for (let i = 0; i < icons.length; i += CONCURRENCY) {
      await Promise.all(icons.slice(i, i + CONCURRENCY).map(downloadOne));
    }

    console.log(`Icons sync: ${downloaded} downloaded, ${skipped} cached, ${icons.length} total`);

    metadataCache = metadata;
    await resolveAppIcons();
  } catch (err) {
    console.error('Icons sync error:', err.message);
  }
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match each app's name to a dashboard-icons slug and persist it
export async function resolveAppIcons() {
  if (!metadataCache) return;
  try {
    const apps = await getApps();
    const keys = Object.keys(metadataCache);
    const normKeys = new Map(keys.map(k => [normalize(k), k]));

    for (const app of apps) {
      const n = normalize(app.name);
      if (!n || (app.icon && app.icon !== 'default')) continue;

      let match = normKeys.get(n);                    // exact
      if (!match) {
        match = keys.find(k => {                      // containment heuristics
          const nk = normalize(k);
          return nk.length >= 4 && (n.includes(nk) || nk.includes(n));
        });
      }

      if (match) {
        await updateApp(app.id, { icon: match });
      }
    }
    console.log('Icon resolution pass complete');
  } catch (err) {
    console.error('Icon resolution error:', err.message);
  }
}
