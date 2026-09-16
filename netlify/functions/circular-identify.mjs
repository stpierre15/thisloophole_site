import { circularHandlers } from '../../lib/circular-api.mjs';
export default circularHandlers.identify;
export const config={rateLimit:{windowLimit:6,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
