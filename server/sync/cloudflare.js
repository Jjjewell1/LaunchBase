import axios from 'axios';
import { upsertApp } from '../db.js';

const CF_BASE = 'https://api.cloudflare.com/client/v4';

export async function syncCloudflare() {
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    console.warn('Cloudflare credentials missing, skipping');
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const tunnelsRes = await axios.get(
      `${CF_BASE}/accounts/${accountId}/cfd_tunnel?is_deleted=false`,
      { headers }
    );
    const tunnels = tunnelsRes.data?.result || [];

    let rules = 0;
    for (const tunnel of tunnels) {
      const tunnelId = tunnel.id;

      const configRes = await axios.get(
        `${CF_BASE}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
        { headers }
      );
      // result is an object: { ingress: [ {hostname, service, originRequest}, ... ] }
      const ingress = configRes.data?.result?.config?.ingress || [];

      for (const rule of ingress) {
        if (!rule.hostname) continue;               // catch-all http_status:404 has no hostname
        if (String(rule.service).startsWith('http_status')) continue;
        if (!/^https?:\/\//.test(rule.service) && !rule.service.startsWith('http://localhost')) {
          // still useful — keep non-localhost services too
        }

        const name = rule.hostname.replace(/\.(jewellcore\.com)$/, '');
        await upsertApp(name, 'cloudflare', `https://${rule.hostname}`, rule.service, null);
        rules++;
      }
    }

    console.log(`Cloudflare sync complete: ${rules} ingress rules across ${tunnels.length} tunnel(s)`);
  } catch (err) {
    console.error('Cloudflare sync error:', err.response?.status || '', err.message);
  }
}
