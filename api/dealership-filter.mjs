import { dealershipHandlers } from '../lib/dealership-api.mjs';
import { vercelAdapter } from '../lib/vercel-adapter.mjs';
export default vercelAdapter(dealershipHandlers.filter);
