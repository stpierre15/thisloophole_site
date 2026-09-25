import { getStore } from 'dealership-blobs';
import { mkdir, readFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { redisConfigured, redisStore } from './redis-store.mjs';

export function dealershipStore(context = {}) {
  if (context.local === true && process.env.LOOPHOLE_LOCAL_DATA_DIR && !process.env.NETLIFY) {
    const directory = join(process.env.LOOPHOLE_LOCAL_DATA_DIR, 'dealership');
    const pathFor = key => {
      if (!/^(sessions|locks|decisions)\/[0-9a-f-]{36}$/.test(key)) throw new Error('Invalid dealership key');
      return join(directory, key + '.json');
    };
    return {
      async get(key) { try { return JSON.parse(await readFile(pathFor(key), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
      async setNew(key, value) {
        const path = pathFor(key); await mkdir(join(path, '..'), { recursive: true });
        try { const file = await open(path, 'wx', 0o600); try { await file.writeFile(JSON.stringify(value)); } finally { await file.close(); } return true; }
        catch (e) { if (e.code === 'EEXIST') return false; throw e; }
      },
    };
  }
  const suffix = context.deploy?.context === 'production' ? 'production' : 'preview-' + (context.deploy?.id || 'dev');
  if (redisConfigured()) return redisStore('loophole-dealership-' + suffix);
  const external = process.env.NETLIFY_BLOBS_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN ? { siteID: process.env.NETLIFY_BLOBS_SITE_ID, token: process.env.NETLIFY_BLOBS_TOKEN } : {};
  const store = getStore({ name: 'loophole-dealership-' + suffix, consistency: 'strong', ...external });
  return {
    async get(key) { return store.get(key, { type: 'json' }); },
    async setNew(key, value) { const result = await store.setJSON(key, value, { onlyIfNew: true }); return result.modified === true; },
  };
}
