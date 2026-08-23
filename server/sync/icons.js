import axios from 'axios';
import fs from 'fs';
import path from 'path';

const ICONS_DIR = path.join('data', 'icons');
const METADATA_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json';
const CONCURRENCY = 10;

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
  } catch (err) {
    console.error('Icons sync error:', err.message);
  }
}
