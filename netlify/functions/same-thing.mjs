export { sameThing as default } from '../../lib/studio-api.mjs';
export const config={rateLimit:{windowLimit:3,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
