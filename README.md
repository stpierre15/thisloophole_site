# loophole

Production repository: https://github.com/stpierre15/thisloophole_site

This is the existing production checkout at ~/Desktop/loophole/loophole_v4. Hosting remains on the existing Netlify project and thisloophole.com domain.

## Current product

**The economy is full of bugs.** Loophole looks for the gaps where buyers get an advantage from corporate pricing. The homepage is a minimalist publication for people who love exposing good deals, with a top loophole of the month.

Experiment 001 at /samething/ is a curated ten-product price-gap leaderboard. Its inaugural furniture and lighting edition contains ten Safavieh products and 39 exact-variant offers across four stores. Manufacturer SKU, UPC, color and pack size support product identity. Prices were read directly from public US storefront records on September 16, 2026. There are no fictional products in the current public experience.

## Run and validate

Requires Node 22 or later.

- npm ci
- npm run dev — http://127.0.0.1:4174
- npm run lint — JavaScript syntax validation
- npm run typecheck — TypeScript checkJs and domain contracts
- npm test — ranking, identity, rendering, retirement and preserved backend tests
- npm run build — validates data and emits only public assets to dist/

## Architecture

The existing static HTML/CSS/ES-module frontend, Netlify Functions, Netlify Blobs and package lock are preserved. No framework, authentication or runtime dependency was added.

- index.html and assets/studio.*: homepage and monthly feature.
- samething/index.html and assets/samething.mjs: ranked board, native disclosure, sharing and lightweight events.
- assets/price-gaps.mjs: reviewed public product and offer records.
- assets/price-gap-engine.mjs: eligibility, sorting and transparent price arithmetic.
- assets/price-gap-view.mjs: shared HTML renderer. The build embeds the entire board and monthly feature in static HTML, so the listings and retailer links work without JavaScript.
- experiments/same-thing/price-board.d.ts: typed public contracts.
- data/price-gap-evidence.json and data/PRICE_BOARD.md: source observations, rejected records and editorial procedure. Not published.
- scripts/review-price-gaps.mjs: bounded editorial refresh from four allowlisted public storefronts. No keys, crawler, or automatic publication.
- lib/studio-api.mjs and netlify/functions/studio-event.mjs: restricted first-party events stored in Blobs.

## Ranking and honesty

Relative premium = (highest eligible price / lowest eligible price - 1) × 100. Rankings use the unrounded ratio; display percentages are rounded. Dollar gaps preserve cents. A 100% premium means the expensive listing asks twice as much; the cheaper listing is 50% less.

This is the top ten within our tracked selection, not a global market claim. Each eligible offer must match the entry's model and UPC, use USD, be a new retail listing and accept orders. Unsupported, unavailable, wrong-variant and same-store duplicate records cannot create a price gap. Crossed-out list prices, coupons, monthly payments and card-opening incentives are excluded.

Orderable storefront data does not guarantee stock, delivery dates, equal returns or checkout totals. Backorder warnings and contradictory listed dimensions are visible. We do not know retailer costs or actual profit margins, so the interface calls the comparison a price premium or gap.

## Refreshing the board

Run node scripts/review-price-gaps.mjs /tmp/price-review.json, then manually review variant SKU, barcode, actual price, currency, availability, pack size, source URLs and delivery caveats. The script does not change the published dataset. Optional third argument limits comma-separated models; fourth argument selects comma-separated named stores.

Update assets/price-gaps.mjs, source evidence, visible observation dates and editorial notes together. The monthly feature uses the largest supported relative premium in the selection. Run the checks and deploy through the existing Netlify workflow. See data/PRICE_BOARD.md.

## Paused functionality

The purchase checker and live URL-matching interface are removed from the public build. /purchase-checker and its child routes temporarily redirect home. Purchase-check, listing-inspection, outcome and live Same Thing endpoints return HTTP 410 without calling paid providers. Their source, tests, old records, credentials and infrastructure remain available for a deliberate future restoration. Old demo data and purchase assets are not copied into dist/.

Email forms are absent from the new publication. Existing optional interest records remain private. There is no mailing integration or campaign delivery.

The retained ANTHROPIC_API_KEY, RAINFOREST_API_KEY and optional LOOPHOLE_ADMIN_TOKEN remain server-only; the current leaderboard needs no AI key and incurs no per-view analysis charge.

## Future experiments and limits

Use NEXT_EXPERIMENT.md to define a useful buyer advantage and its evidence contract. assets/experiments.mjs retains experiment metadata; only the current board is promoted.

The initial selection is one manufacturer's furniture and lighting. Broaden it with reviewed product identities, more retailers and stronger shipping comparisons. There is no automatic price feed, market-wide cheapest-price guarantee, account, community-submission workflow or dynamic social image. Dated source links are the evidence.

See DEPLOY.txt for the existing Netlify release workflow and QA.md for the current release checks. GitHub synchronization is separate from direct Netlify publication.
