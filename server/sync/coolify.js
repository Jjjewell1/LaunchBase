import axios from 'axios';
import { addApp } from '../db.js';

export async function syncCoolify() {
  const baseUrl = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;

  if (!baseUrl || !token) {
    console.warn('Coolify credentials missing, skipping');
    return;
  }

  try {
    const appsRes = await axios.get(`${baseUrl}/api/v1/applications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const apps = appsRes.data || [];

    for (const app of apps) {
      const name = app.name || app.fqdn || 'Unknown';
      const url = app.fqdn || app.domains?.[0] || `${baseUrl}/app/${app.id}`;
      const internalUrl = app.dockerCompose?.services?.[0]?.image || null;

      await addApp(name, 'coolify', url, internalUrl, `coolify-${app.id}`);
    }

    console.log(`Coolify sync complete: ${apps.length} apps processed`);
  } catch (err) {
    console.error('Coolify sync error:', err.message);
  }
}