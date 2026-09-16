import { circularHandlers } from '../lib/circular-api.mjs';
import { vercelAdapter } from '../lib/vercel-adapter.mjs';
export default vercelAdapter(circularHandlers.identify);
