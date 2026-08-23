import axios from 'axios';
import { upsertApp } from '../db.js';

function cleanName(raw) {
  // Coolify compose app names look like "launch-base:master-w78j4xceyb62trikpnboqvcl"
  let n = String(raw || 'Unknown').split(':')[0];
  n = n.replace(/[-_]+/g, ' ').trim();
  return n.replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown';
}

function firstDomain(domains) {
  if (!domains) return null;
  const d = Array.isArray(domains) ? domains[0] : String(domains).split(',')[0];
  return d ? d.trim().replace(/\/$/, '') : null;
}

async function fetchList(baseUrl, token, path) {
  try {
    const res = await axios.get(`${baseUrl}/api/v1/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data || [];
  } catch (err) {
    console.error(`Coolify ${path} error:`, err.response?.status || '', err.message);
    return [];
  }
}

export async function syncCoolify() {
  const baseUrl = process.env.COOLIFY_BASE_URL;
  const token = process.env.COOLIFY_API_TOKEN;

  if (!baseUrl || !token) {
    console.warn('Coolify credentials missing, skipping');
    return;
  }

  let total = 0;

  // Applications
  for (const app of await fetchList(baseUrl, token, 'applications')) {
    const url = firstDomain(app.fqdn) || firstDomain(app.domains) || `${baseUrl}/application/${app.uuid}`;
    await upsertApp(cleanName(app.name), 'coolify', url, null, null);
    total++;
  }

  // Services
  for (const svc of await fetchList(baseUrl, token, 'services')) {
    const url = firstDomain(svc.domains) || firstDomain(svc.fqdn) || `${baseUrl}/service/${svc.uuid}`;
    await upsertApp(cleanName(svc.name), 'coolify-service', url, null, null);
    total++;
  }

  // Databases (no public URLs — card links into Coolify)
  for (const dbn of await fetchList(baseUrl, token, 'databases')) {
    await upsertApp(cleanName(dbn.name), 'coolify-database', `${baseUrl}/database/${dbn.uuid}`, null, null);
    total++;
  }

  console.log(`Coolify sync complete: ${total} items processed`);
}
