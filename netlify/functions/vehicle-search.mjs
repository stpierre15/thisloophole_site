import { autoHandlers } from '../../lib/auto-api.mjs';
export default autoHandlers.search;
export const config={rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
