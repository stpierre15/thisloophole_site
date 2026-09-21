import { autoHandlers } from '../../lib/auto-api.mjs';
export default autoHandlers.detail;
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
