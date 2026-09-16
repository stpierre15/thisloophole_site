export { retiredTool as default } from '../../lib/retired-api.mjs';
export const config = { rateLimit: { windowLimit: 4, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
