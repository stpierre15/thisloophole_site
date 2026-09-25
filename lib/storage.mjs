import { getStore } from '@netlify/blobs';
import { mkdir, readFile, writeFile, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { redisConfigured, redisStore } from './redis-store.mjs';

// Persistent site-wide production data; previews get separate namespaces.
export function storage(context = {}) {
  if (process.env.LOOPHOLE_LOCAL_DATA_DIR && context.local === true && !process.env.NETLIFY) {
    return fileStorage(process.env.LOOPHOLE_LOCAL_DATA_DIR);
  }
  const suffix = context.deploy?.context === 'production' ? 'production' : 'preview-' + (context.deploy?.id || 'dev');
  if (redisConfigured()) return redisStore('loophole-v1-' + suffix);
  const external = process.env.NETLIFY_BLOBS_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN ? {siteID:process.env.NETLIFY_BLOBS_SITE_ID,token:process.env.NETLIFY_BLOBS_TOKEN} : {};
  const store = getStore({ name: 'loophole-v1-' + suffix, consistency: 'strong', ...external });
  return {
    async get(key) { return store.get(key, { type: 'json' }); },
    async set(key, value) { await store.setJSON(key, value); },
    async list(prefix) {
      const rows = [];
      for await (const page of store.list({ prefix, paginate: true })) {
        const values = await Promise.all(page.blobs.map(b => store.get(b.key, { type: 'json' })));
        rows.push(...values.filter(Boolean));
      }
      return rows;
    },
  };
}
export function fileStorage(directory) {
  const file = key => {
    if (!/^[a-zA-Z0-9/_-]+$/.test(key)) throw new Error('Invalid storage key');
    return join(directory, key + '.json');
  };
  return {
    async get(key) { try { return JSON.parse(await readFile(file(key), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
    async set(key, value) {
      const path = file(key); await mkdir(join(path, '..'), { recursive: true });
      const temp = path + '.' + randomUUID(); await writeFile(temp, JSON.stringify(value)); await rename(temp, path);
    },
    async list(prefix) {
      const rows = [];
      async function walk(path) {
        let entries; try { entries = await readdir(path, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
        for (const entry of entries) {
          const next = join(path, entry.name);
          if (entry.isDirectory()) await walk(next);
          else if (entry.name.endsWith('.json')) rows.push(JSON.parse(await readFile(next, 'utf8')));
        }
      }
      await walk(join(directory, prefix)); return rows;
    },
  };
}
