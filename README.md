# Loophole purchase-check MVP

Production repository: https://github.com/stpierre15/thisloophole_site

This checkout is currently at ~/Desktop/loophole/loophole_v4 (the package and remote are named thisloophole_site). Do not initialize a new repository.

## Run and validate

Requires Node 22 or later and npm.

- npm ci
- npm run dev — http://127.0.0.1:4174, durable local-only JSON records in .local-data/
- npm test — decision, matching, input, storage, authorization and outcome tests
- npm run build — validates catalog and JavaScript; emits public assets into dist/
- npx netlify-cli build --offline — validates the actual Netlify function bundles

See DEPLOY.txt for deployment to the existing Netlify site and DATA.md for catalog maintenance and founder metrics.

## Architecture

Static HTML, CSS and ES modules remain the frontend. Netlify Functions remain the server. The existing @netlify/blobs dependency provides durable site-wide storage; no new runtime dependency, database vendor, account flow, or AI key is required.

Purchase → validated structured record → merchant/category/condition/keyword matching → sourced policy catalog → deterministic comparison and scoring → explanation → action → persisted outcome.

- index.html and assets/purchase.*: accessible purchase form, result, score breakdown and feedback.
- data/loopholes.json: 14 primary-source-backed US policy records, checked September 10, 2026.
- lib/engine.mjs: validation, matching, all five verdicts, savings and four equal 25-point score dimensions.
- lib/api.mjs: purchase checks, capability-protected feedback, authenticated metrics.
- lib/storage.mjs: site-wide Netlify Blobs, with separate preview namespaces. Local development uses files, never silent in-memory production fallback.
- types/models.d.ts: explicit TypeScript domain contracts for this JavaScript codebase.
- netlify/functions/: deployable HTTP wrappers and rate limits.
- legacy/: pre-existing locally edited chatbot source retained intact. It is not bundled or published. The old endpoint returns HTTP 410 and directs visitors to the purchase checker.
- playbook/: existing pages retained. The formerly empty Tools page redirects home.

## Evidence and limitations

Supported public retailer links trigger `/api/inspect-product`. The backend combines bounded direct structured-data extraction, Anthropic native cited web search/fetch, and optional Rainforest Amazon product/offer data. API keys remain server-side. Prices without retailer evidence are discarded. Amazon data validates the exact ASIN, buy-box price, actual seller and matching offer condition. A hostname never proves who sold the item. Public lookup evidence is cached for ten minutes; failed searches for one minute. Missing prices do not block displaying discovered alternatives and evidence, but no purchase recommendation or numeric score is fabricated.

Required for cited search: the existing `ANTHROPIC_API_KEY`. Amazon buy-box extraction uses `RAINFOREST_API_KEY` (two requests per uncached ASIN, product + offers). Trial/account activation must be verified before calling Amazon autofill live. `LOOPHOLE_SEARCH_DIAGNOSTICS=true` temporarily stores private troubleshooting records; it is off by default.

Savings are calculated only from an explicitly confirmed comparable price provided by the user, or the sourced 5% Target Circle Card rule when the user confirms an existing eligible card, an eligible subtotal, and that the discount is not already included. Other discounts, trade-ins, rewards, warranties and return policies are unpriced opportunities. Only the largest single supported saving is used; paths are never blindly stacked.

Without enough supported economics, verdict is null and evaluation_status is needs_evidence or needs_price. WAIT is reserved for an actual supported reason to delay; missing data is not one. BUY is conditional on the user's comparison and checked purchase terms. Evidence from user-entered prices remains labeled USER_REPORTED. This version intentionally cannot promise market-wide best prices.

Only Active records match. VERIFIED records older than 90 days remain explicitly labeled as needing re-verification and cannot affect quantified savings or trusted benefit scoring. Stacking is opt-in, requires mutual compatibility, and respects conflicts.

## Privacy and safeguards

No account, card number, receipt upload, or external AI transmission. The first-party browser identifier is random and optional if storage is unavailable. Purchase feedback requires a random 256-bit capability, stored only as a hash server-side. No public purchase-read or metrics endpoint exists. Metrics require LOOPHOLE_ADMIN_TOKEN in the Functions environment. Public outcomes cannot set verified savings.

Only the public allowlist is copied into dist/: server code, policy source files, local records, legacy code and credentials stay out. JSON requests are size-limited and validated, cross-origin browser submissions rejected, and Netlify-native rate limits applied to the write functions. The local dev server binds only to 127.0.0.1; /__layout is a local-only responsive test fixture.

The Blobs aggregate metrics scan is suitable for a small MVP; migrate aggregation to a relational store or background rollups as volume grows. Preview data is isolated by deploy ID; production data survives deploys.

Scores are null (Not enough evidence) without a confirmed comparison or eligible sourced payment discount. No fixed fallback score is shown. Cited retailer search is connected through the existing Anthropic service. Coverage is limited; search-index prices are source-reported, not guaranteed live checkout totals.
