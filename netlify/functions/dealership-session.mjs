import { dealershipHandlers } from '../../lib/dealership-api.mjs';
export default dealershipHandlers.session;
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
