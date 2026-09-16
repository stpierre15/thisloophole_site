export { studioEvent as default } from '../../lib/studio-api.mjs';
export const config={rateLimit:{windowLimit:30,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
