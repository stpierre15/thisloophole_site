import { circularHandlers } from '../../lib/circular-api.mjs';
export default circularHandlers.outbound;
export const config={rateLimit:{windowLimit:12,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
