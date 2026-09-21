import { autoHandlers } from '../../lib/auto-api.mjs';
export default autoHandlers.vin;
export const config={rateLimit:{windowLimit:15,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
