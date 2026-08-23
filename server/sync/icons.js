import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { addApp } from '../db.js';

const ICONS_DIR = path.join('data', 'icons');
const METADATA_URL = 'https://raw.githubusercontent.com/homarr-labs/dashboard-icons/refs/heads/main/metadata.json';

export async function syncIcons() {
  try {
    const metaRes = await axios.get(METADATA_URL);
    const metadata = metaRes.data;

    if (!fs.existsSync(ICONS_DIR)) {
      fs.mkdirSync(ICONS_DIR, { recursive: true });
    }

    let downloaded = 0;
    const total = metadata.icons?.length || 0;

    for (const iconEntry of metadata.icons) {
      const name = iconEntry.name;
      const svgUrl = iconEntry.svg;

      if (!svgUrl) continue;

      try {
        const imgRes = await axios.get(svgUrl, { responseType: 'arraybuffer' });
        const fileName = `${name}.svg`;
        const filePath = path.join(ICONS_DIR, fileName);

        fs.writeFileSync(filePath, imgRes.data);
        downloaded++;
      } catch (e) {
        // Skip
      }
    }

    console.log(`Icons sync: ${downloaded} icons downloaded`);
  } catch (err) {
    console.error('Icons sync error:', err.message);
  }
}