import { studioEvent } from '../lib/studio-api.mjs';
import { vercelAdapter } from '../lib/vercel-adapter.mjs';
export default vercelAdapter(studioEvent);
