import { dealershipHandlers } from '../lib/dealership-api.mjs';
import { vercelAdapter } from '../lib/vercel-adapter.mjs';

export default async function dealership(req, res) {
  const operation = new URL(req.url, 'https://loophole.invalid').searchParams.get('op');
  const handler = dealershipHandlers[operation];
  if (!handler) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  return vercelAdapter(handler)(req, res);
}
