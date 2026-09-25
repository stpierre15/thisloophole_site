// Portable JSON storage for Node serverless hosts using Upstash's Redis REST API.
export function redisStore(namespace, fetcher = fetch) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Upstash Redis is not configured');
  const keyFor = key => {
    if (!/^[a-zA-Z0-9/_-]+$/.test(key)) throw new Error('Invalid storage key');
    return `${namespace}:${key}`;
  };
  const command = async (...args) => {
    const response = await fetcher(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!response.ok) throw new Error(`Redis request failed (${response.status})`);
    const payload = await response.json();
    if (payload.error) throw new Error(`Redis request failed: ${payload.error}`);
    return payload.result;
  };
  return {
    async get(key) { const value = await command('GET', keyFor(key)); return value == null ? null : JSON.parse(value); },
    async set(key, value) { await command('SET', keyFor(key), JSON.stringify(value)); },
    async setNew(key, value) { return (await command('SET', keyFor(key), JSON.stringify(value), 'NX')) === 'OK'; },
    async list(prefix) {
      const pattern = keyFor(prefix).replace(/[*?\[\]\\]/g, '\\$&') + '*';
      const rows = []; let cursor = '0';
      do {
        const page = await command('SCAN', cursor, 'MATCH', pattern, 'COUNT', '100');
        if (!Array.isArray(page) || !Array.isArray(page[1])) throw new Error('Invalid Redis scan response');
        cursor = String(page[0]);
        for (const key of page[1]) {
          const value = await command('GET', key);
          if (value != null) rows.push(JSON.parse(value));
        }
      } while (cursor !== '0');
      return rows;
    },
  };
}
