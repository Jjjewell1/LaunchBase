import { Client } from 'ssh2';
import { addApp } from '../db.js';

export async function syncUnraid() {
  const host = process.env.UNRAID_HOST;
  const port = parseInt(process.env.UNRAID_PORT || '22');
  const user = process.env.UNRAID_USER;
  const password = process.env.UNRAID_PASSWORD;
  const privateKey = process.env.UNRAID_SSH_KEY;

  if (!host || !user) {
    console.warn('Unraid credentials missing, skipping');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log(`Unraid SSH connected to ${host}`);

      conn.exec(`docker ps --format "{{.Names}}\t{{.Image}}\t{{.Ports}}"`, (err, stream) => {
        if (err) {
          console.error('Docker ps error:', err);
          conn.end();
          return reject(err);
        }

        const results = [];
        stream.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length < 2) continue;

            const containerName = parts[0].replace(/[$@]/g, '').trim();
            const image = parts[1] || '';
            const ports = parts[2] || '';

            let internalUrl = null;
            const portMatch = ports.match(/(\d+)->(\d+)/);
            if (portMatch) {
              internalUrl = `http://${host}:${portMatch[1]}`;
            }

            if (containerName.startsWith('_')) continue;

            const displayName = containerName.replace(/_/g, ' ').trim();
            results.push(addApp(displayName, 'unraid', internalUrl || `http://${host}:8080`, internalUrl, null));
          }
        });

        stream.on('close', () => {
          conn.end();
          console.log('Unraid SSH sync complete');
          resolve(results);
        });
      });
    });

    conn.on('error', (err) => {
      console.error('Unraid SSH error:', err.message);
      reject(err);
    });

    conn.connect({
      host,
      port,
      username: user,
      password: password || undefined,
      privateKey: privateKey || undefined,
      readyTimeout: 20000,
    });
  });
}