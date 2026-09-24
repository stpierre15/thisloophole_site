import { dealershipHandlers } from '../../lib/dealership-api.mjs';
export default dealershipHandlers.filter;
export const config={rateLimit:{windowLimit:60,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
