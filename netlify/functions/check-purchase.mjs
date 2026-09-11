export { checkPurchase as default } from '../../lib/api.mjs';
export const config = { rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
