import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getApps, updateApp } from '../db.js';

const ICONS_DIR = path.join('data', 'icons');
const METADATA_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json';
// Icons live at svg/<slug>.svg in the dashboard-icons repo
const SVG_URLS = [
  slug => `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@main/svg/${slug}.svg`,
  slug => `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/svg/${slug}.svg`,
];
const CONCURRENCY = 8;
let metadataCache = null;

export async function syncIcons() {
  try {
    const metaRes = await axios.get(METADATA_URL);
    // metadata.json: { "<slug>": { base, aliases, categories, ... }, ... }
    const metadata = metaRes.data || {};
    const validSlugs = new Set(Object.keys(metadata));

    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    metadataCache = metadata;

    // Resolve names -> slugs BEFORE downloading so we only fetch what we use
    await resolveAppIcons();
    const apps = await getApps({ includeHidden: true });
    const neededSlugs = [...new Set(
      apps.filter(a => a.icon && a.icon !== 'default').map(a => a.icon)
    )];

    let downloaded = 0;
    let cached = 0;
    let failed = 0;

    async function downloadOne(slug) {
      const filePath = path.join(ICONS_DIR, `${slug}.svg`);
      if (fs.existsSync(filePath)) {
        cached++;
        return;
      }
      for (const build of SVG_URLS) {
        try {
          const res = await axios.get(build(slug), { responseType: 'arraybuffer', timeout: 20000 });
          if (res.status === 200 && Buffer.isBuffer(res.data) && res.data.length > 0) {
            fs.writeFileSync(filePath, res.data);
            downloaded++;
            return;
          }
        } catch {
          // try next mirror
        }
      }
      failed++;
    }

    for (let i = 0; i < neededSlugs.length; i += CONCURRENCY) {
      await Promise.all(neededSlugs.slice(i, i + CONCURRENCY).map(downloadOne));
    }

    console.log(`Icons sync: ${downloaded} downloaded, ${cached} cached, ${failed} failed, ${validSlugs.size} known slugs, ${neededSlugs.length} in use`);
  } catch (err) {
    console.error('Icons sync error:', err.message);
  }
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Match each app's name to a dashboard-icons slug and persist it.
export async function resolveAppIcons() {
  if (!metadataCache) return [];
  try {
    const apps = await getApps({ includeHidden: true });
    const keys = Object.keys(metadataCache);
    const normKeys = new Map(keys.map(k => [normalize(k), k]));

    for (const app of apps) {
      const n = normalize(app.name);
      if (!n) continue;
      if (app.icon && metadataCache[app.icon]) continue; // already a valid slug

      let match = normKeys.get(n);                       // 1. exact normalized match
      if (!match) {                                      // 2. containment, closest length wins
        const candidates = keys.filter(k => {
          const nk = normalize(k);
          return nk.length >= 4 && (n.includes(nk) || nk.includes(n));
        });
        candidates.sort((a, b) => normalize(a).length - normalize(b).length);
        match = candidates[0] || null;
      }

      const newIcon = match || 'default';
      if (newIcon !== app.icon) {
        await updateApp(app.id, { icon: newIcon });
      }
    }
    console.log('Icon resolution pass complete');
  } catch (err) {
    console.error('Icon resolution error:', err.message);
  }
}
