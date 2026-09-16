import { circularHandlers } from '../../lib/circular-api.mjs';
export default circularHandlers.alert;
export const config={rateLimit:{windowLimit:4,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
