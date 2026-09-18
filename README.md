## Current visual frame — September 17, 2026

The public frame is a plain, 760px document with Georgia text, Arial utility labels, underlined black links and thin rules. Routes: `/`, `/experiments/`, `/findings/`, `/about/`, and the preserved `/samething/` tool. `experiments/circular/frame.mts` holds the small experiment index and static list renderers; `lib/frame.mjs` derives three chronological findings from the existing reviewed price board. Build and local preview render those lists into HTML; the new pages need no JavaScript, fonts, packages, credentials or database changes. Findings remain dated snapshots, never live stock claims. CONTACT is a text placeholder until a public contact address is supplied.

This revision adds no agent logic, dashboards, product features or integrations. The larger marketing blocks and homepage monthly feature were removed to follow the latest frame-only brief. Existing comparison modules, providers, result links, evidence, analytics, alerts and storage remain intact.

# loophole

Production repository: https://github.com/stpierre15/thisloophole_site

This is the existing production checkout at ~/Desktop/loophole/loophole_v4. Hosting remains on the existing Netlify project and thisloophole.com domain.

## Current product

**The economy is full of bugs.** Loophole looks for the gaps where buyers get an advantage from corporate pricing. The homepage is a minimalist publication for people who love exposing good deals, with a top loophole of the month.

Experiment 001 at /samething/ now combines a second-life product search with the existing curated ten-product price-gap leaderboard. The homepage design, motto, normal lowercase wordmark and monthly feature remain. The search asks "Why are you buying it new?" and compares used, refurbished, open-box and reviewed previous models using the official eBay Browse API when configured. Two explicitly fictional examples demonstrate meaningful savings and a case where new wins. They have no purchase links.

The inaugural store board remains ten Safavieh products and 39 exact-variant offers across four stores. Manufacturer SKU, UPC, color and pack size support product identity. Board prices were read directly from public US storefront records on September 16, 2026.

## Run and validate

Requires Node 22 or later.

- npm ci
- npm run dev — http://127.0.0.1:4174
- npm run compile:tools — compile the strict TypeScript tool source
- npm run lint — JavaScript syntax validation
- npm run typecheck — TypeScript checkJs and domain contracts
- npm test — ranking, identity, rendering, retirement and preserved backend tests
- npm run build — validates data and emits only public assets to dist/

## Architecture

The existing static HTML/CSS/ES-module frontend, Netlify Functions, Netlify Blobs and package lock are preserved. No framework, authentication or runtime dependency was added. The new tool is strict TypeScript (.mts), compiled by the installed TypeScript compiler to private .generated/circular/. Only its client and presentation modules enter the public build.

- index.html and assets/studio.*: homepage and monthly feature.
- samething/index.html and assets/samething.mjs: ranked board, native disclosure, sharing and lightweight events.
- assets/price-gaps.mjs: reviewed public product and offer records.
- assets/price-gap-engine.mjs: eligibility, sorting and transparent price arithmetic.
- assets/price-gap-view.mjs: shared HTML renderer. The build embeds the entire board and monthly feature in static HTML, so the listings and retailer links work without JavaScript.
- experiments/same-thing/price-board.d.ts: typed public contracts.
- data/price-gap-evidence.json and data/PRICE_BOARD.md: source observations, rejected records and editorial procedure. Not published.
- scripts/review-price-gaps.mjs: bounded editorial refresh from four allowlisted public storefronts. No keys, crawler, or automatic publication.
- lib/studio-api.mjs and netlify/functions/studio-event.mjs: restricted first-party events stored in Blobs.

## Second-life search / setup

Server-only variables (see .env.example):

- EBAY_CLIENT_ID and EBAY_CLIENT_SECRET: both required; eBay production App ID and Cert ID. Never paste credentials into a browser form, public file or client build.
- EBAY_ENVIRONMENT: production (default) or sandbox. Sandbox results are labeled test inventory, and purchasing is disabled.
- CIRCULAR_LISTING_CACHE_MINUTES: default 30; clamped to 15–60.
- RAINFOREST_API_KEY: retained optional licensed Amazon identification. Reuses the exact-ASIN adapter, caches successful metadata for 24 hours, and accepts a new-price baseline only when the offer reports new and in stock.
- ANTHROPIC_API_KEY: retained for archived tools; the new circular search makes no AI calls.

Create an eBay developer app, confirm its production Browse access, then set the two credentials in the existing Netlify Functions environment and redeploy. Valid keys alone do not guarantee production API access; denied authorization is shown as a provider failure. The provider obtains and reuses a client-credentials OAuth token server-side. Reference: [eBay Browse API](https://developer.ebay.com/api-docs/buy/api-browse.html), [OAuth](https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html), [Buy API access](https://www.developer.ebay.com/develop/get-started/get-started-on-a-buying-application).

Local development does not automatically load .env. Export the variables in your shell or use Node's --env-file option for scripts/dev.mjs after compiling. No credentials are needed to try the examples and unconfigured state.

### Flow, economics and matching

Search a product name, optionally entering the new price you would pay and a US ZIP for a shipping estimate. A supported URL first extracts structured metadata (JSON-LD, then OpenGraph/standard metadata), followed by editable confirmation. Blocked, ambiguous or unsupported pages fall back to manual name/brand/model/price. No browser automation, anti-bot bypass, scraping of eBay or blind AI search is used.

Initial supported types: phones, cameras, chairs, drills, watches and lighting. The deterministic identity normalizer recognizes selected Apple, Sony, Herman Miller, Makita and Garmin models. Unknown types require a more specific supported query. Curated generation mappings are Sony A7 IV → A7 III and Apple iPhone 16 Pro → iPhone 15 Pro; they are not generated for arbitrary products. Manufacturer links support reviewing differences.

Search priority is GTIN, MPN, brand/model plus specifications, then normalized title. Each same-product request has at most three search calls, 12 summaries per query and six detail enrichments. A supported previous model adds one search and at most three enrichments. Fixed-price USD listings only; auctions, parts and likely accessories are excluded conservatively. Open-box-like condition 1500 preserves eBay's actual condition wording; it is not a guarantee of pristine condition.

Exact identifiers or a model/brand match with confirmed variant details can earn EXACT PRODUCT. Incomplete variants become STRONG MATCH. Previous generations remain SIMILAR ALTERNATIVE. Conflicting GTIN, MPN, model, brand, storage, lock, size or kit records are rejected. Model aliases are narrowly curated. There are no precision similarity scores or manufacturer/factory claims.

Listing total = price + reported shipping. Missing shipping is not zero and withholds confirmed savings. Savings = confirmed new-price baseline − listing total; tax is excluded. Users should include new-product shipping in the baseline. Without a new baseline, candidates still display but savings remain unknown. The editorial small-gap cutoff is $50 or 10% of new, whichever is greater; used is not automatically recommended. A previous model cannot become the best same-product option. Condition, returns and warranty claims are seller-reported; absent warranty, battery and return evidence is labeled unknown.

### Persistence, freshness, privacy

No new database service or SQL migration. Existing private Blobs namespaces now include circular-products, circular-provider-cache, circular-results, circular-dead-listings, circular-listing-overrides and circular-email-alerts. A comparison record doubles as its anonymous search session. Private alert records are separate and never appear in saved-result responses. Shared results omit the supplied ZIP, canonicalize source URLs and contain no email.

Product metadata lasts 24 hours; marketplace observations default to 30 minutes, including empty successful searches. Expired shared results refresh through the provider. Clicking a live offer rechecks the item via the official API before redirecting; removed or changed matches are rejected, and dead listings are suppressed for one hour so cached inventory does not revive them. No push notification or background inventory guarantee is implied.

Copy link, native share and copy result include freshness and example labels. Shared-result metadata is generic; dynamic OpenGraph images are deferred. Events cover page view, query/URL submission, identity, provider success/failure, outbound condition/previous model, sharing and alert requests. Events contain no full query, URL, email or ZIP.

The email form saves a deduplicated product-specific price-alert request, optional threshold and timestamps. Its status is pending_delivery_setup. Automatic monitoring, transactional delivery and background workers are NOT connected; this is disclosed before submission and in the receipt. No accounts, subscriptions or messages are sent.

### Routes and provider extension

Public route stays /samething/. New JSON endpoints are /api/circular-identify, /api/circular-search (POST search / GET saved result), /api/circular-alert and /api/circular-outbound (recheck + redirect). Old /api/same-thing remains paused for old clients.

experiments/circular/schema.mts defines ProductIdentity, CandidateListing, ComparisonResult, ModelRelationship and CircularProductProvider. The UI consumes normalized results, not eBay payloads. To add BestBuyOpenBoxProvider, ReiUsedProvider or another licensed provider, implement search and optional getListing against an official/authorized source, preserve timestamps/condition/shipping and inject it through ServiceOptions. Neither Best Buy nor REI is searched for circular inventory today. No private marketplace or warehouse inventory is claimed.

Production remains on Netlify. Optional Vercel Node adapters and vercel.json use the same Request/Response handlers and static build; they have not been deployed on Vercel. A Vercel deployment requires server-only NETLIFY_BLOBS_SITE_ID and NETLIFY_BLOBS_TOKEN for the retained store, or another Store implementation. Configure Vercel abuse protection before enabling live API usage; Netlify's current per-IP limits remain on the existing functions.

## Ranking and honesty

Relative premium = (highest eligible price / lowest eligible price - 1) × 100. Rankings use the unrounded ratio; display percentages are rounded. Dollar gaps preserve cents. A 100% premium means the expensive listing asks twice as much; the cheaper listing is 50% less.

This is the top ten within our tracked selection, not a global market claim. Each eligible offer must match the entry's model and UPC, use USD, be a new retail listing and accept orders. Unsupported, unavailable, wrong-variant and same-store duplicate records cannot create a price gap. Crossed-out list prices, coupons, monthly payments and card-opening incentives are excluded.

Orderable storefront data does not guarantee stock, delivery dates, equal returns or checkout totals. Backorder warnings and contradictory listed dimensions are visible. We do not know retailer costs or actual profit margins, so the interface calls the comparison a price premium or gap.

## Refreshing the board

Run node scripts/review-price-gaps.mjs /tmp/price-review.json, then manually review variant SKU, barcode, actual price, currency, availability, pack size, source URLs and delivery caveats. The script does not change the published dataset. Optional third argument limits comma-separated models; fourth argument selects comma-separated named stores.

Update assets/price-gaps.mjs, source evidence, visible observation dates and editorial notes together. The monthly feature uses the largest supported relative premium in the selection. Run the checks and deploy through the existing Netlify workflow. See data/PRICE_BOARD.md.

## Paused functionality

The purchase checker and prior AI furniture-similarity interface remain removed from the public build. /purchase-checker and its child routes temporarily redirect home. Old purchase-check, listing-inspection, outcome and Same Thing endpoints return HTTP 410 without calling paid providers. Their source, tests, old records, credentials and infrastructure remain available. Old demo data and purchase assets are not copied into dist/.

Existing optional interest records remain private. The new tool adds the disclosed pending price-alert request form; there is still no mailing integration or campaign delivery.

The retained ANTHROPIC_API_KEY, RAINFOREST_API_KEY and optional LOOPHOLE_ADMIN_TOKEN remain server-only; the current leaderboard needs no AI key and incurs no per-view analysis charge.

## Future experiments and limits

Use NEXT_EXPERIMENT.md to define a useful buyer advantage and its evidence contract. assets/experiments.mjs retains experiment metadata; only the current board is promoted.

The store board's initial selection is one manufacturer's furniture and lighting. It remains manually reviewed, not an automatic price feed or market-wide cheapest-price guarantee. Second-life search depends on authorized eBay access; examples do not validate real production inventory. Other marketplaces, semantic lookalikes, full category coverage, vision matching, accounts and dynamic social images are deferred. Dated source links and condition/identity evidence determine what can be claimed.

See DEPLOY.txt for the existing Netlify release workflow and QA.md for the current release checks. GitHub synchronization is separate from direct Netlify publication.

## West Elm identification fallback

West Elm public product URLs are accepted, with tracking removed and selected retailer SKU retained. If public metadata retrieval is blocked (the supplied Merida lamp returned HTTP 403), the tool derives a suggested name from the product slug, labels it URL-derived, and opens editable confirmation. URL hints expire after five minutes to allow metadata retries. The retailer SKU is separate from manufacturer MPN/GTIN. No price, finish, dimensions, pack size or availability is inferred from the slug or search-index price ranges. Lighting is supported; finish and quantity can be confirmed. A family-name match is STRONG MATCH, never EXACT PRODUCT without a matching structured MPN or GTIN and no variant conflicts. eBay credentials are still required for live second-life results.
