import axios from 'axios';
import { addApp } from '../db.js';

export async function syncCloudflare() {
  const token = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    console.warn('Cloudflare credentials missing, skipping');
    return;
  }

  try {
    const tunnelsRes = await axios.get(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/q/warm/cloudflare_tunnel`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tunnels = tunnelsRes.data?.result || [];

    for (const tunnel of tunnels) {
      const tunnelId = tunnel.id;

      const configRes = await axios.get(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/q/warm/cloudflare_tunnel/${tunnelId}/configurations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const configurations = configRes.data?.result || [];

      for (const config of configurations) {
        const hostname = config.hostname;
        const service = config.service;

        if (hostname) {
          const url = `https://${hostname}`;
          await addApp(hostname, 'cloudflare', url, service || null, `cloudflare-${tunnelId}-${hostname}`);
        }
      }
    }

    console.log('Cloudflare sync complete');
  } catch (err) {
    console.error('Cloudflare sync error:', err.message);
  }
}