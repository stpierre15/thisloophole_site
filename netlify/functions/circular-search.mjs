import { circularHandlers } from '../../lib/circular-api.mjs';
export default circularHandlers.search;
export const config={rateLimit:{windowLimit:8,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
