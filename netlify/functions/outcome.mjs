export { retiredTool as default } from '../../lib/retired-api.mjs';
export const config = { rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
