import { autoHandlers } from '../../lib/auto-api.mjs';
export default autoHandlers.checkout;
export const config={rateLimit:{windowLimit:5,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
