## Document-frame verification — September 17, 2026

Published to the existing Netlify project, deployment `6aacae35dff4b8d130942229`. The live-domain browser confirms the new homepage and navigation. Live-domain HTTP checks also passed for all four document routes, ten board entries, public/private asset boundaries, both demos, saved-result loading, honest unconfigured search, validation, disabled demo purchasing and paused endpoints.

Files changed: `index.html`, `samething/index.html`, `privacy.html`, `assets/studio.css`, `scripts/build.mjs`, `scripts/dev.mjs`, `netlify.toml`, `vercel.json`, `README.md`, `QA.md`, `DEPLOY.txt`. Files added: `about/index.html`, `experiments/index.html`, `findings/index.html`, `experiments/circular/frame.mts`, `lib/frame.mjs`. No agent scaffolding remains. No database or API contracts changed.

All 79 existing tests, JavaScript lint, both TypeScript checks and the production build pass. Browser review confirms the plain homepage, findings list and preserved camera demo ($800 illustrative savings). Mobile 390px and narrow desktop 760px checks showed no horizontal overflow on the checked pages. The frame uses two system font families and introduces no public scripts, images, dependencies or product functionality. New static routes: `/experiments/`, `/findings/`, `/about/`. Existing Same Thing identifiers and ten evidence entries are preserved. CONTACT remains an explicit placeholder; eBay credentials and automated email delivery remain outside this visual-only revision.

## Current West Elm / lighting correction — 2026-09-16

The supplied Merida lamp path and retailer SKU 7999646 exposed two implementation limits: West Elm was missing from the retailer allowlist, and lighting was excluded. A direct public metadata request returned HTTP 403 Restricted Access. West Elm is now accepted, tracking is stripped, and lighting is supported. Blocked product pages recover a clearly labeled URL-derived name suggestion for editable confirmation. Retailer SKUs remain separate from manufacturer MPN/GTIN. No price, finish, dimensions, quantity or stock is inferred. URL hints retry metadata after five minutes. Finish and quantity fields are added within the existing confirmation form and theme. Lamp-family matches cannot earn EXACT PRODUCT without a supported structured identifier and compatible variants.

All 79 tests, syntax validation, strict type checks and production build pass. New regression coverage verifies the supplied path/SKU, blocked metadata recovery, short fallback-cache expiry, manual confirmation, unknown price/identifiers, lighting support, conflicting finish/pack exclusion and honest missing-provider results.

Production deploy `6aaad6c06c9468a61e0e3914` is live on `https://thisloophole.com`. Hosted HTTP checks confirm the Merida Table Lamp suggestion, West Elm, lighting category, URL-derived disclosure, SKU 7999646, null price, stripped tracking, editable finish/quantity fields and the preserved ten-item board. The lamp passes product identification and reaches the explicit unconfigured-marketplace state. Real eBay alternatives still require credentials; West Elm's exact selected price was not retrieved. No browser visual/interaction test was performed.

## Earlier circular-tool verification — 2026-09-16

The Same Thing now adds strict TypeScript product identification, an official eBay OAuth/Browse provider, evidence-gated variant matching, shipping-aware economics, reviewed previous-model relationships, metadata/listing caching, saved-result sharing and pending private price-alert requests. The existing minimalist theme, homepage motto, monthly feature and real top-ten board remain. Two clearly labeled fictional demos have buying disabled. Real queries never substitute demo inventory.

All 77 tests, syntax validation, strict tool TypeScript checks and production build pass. Tests cover official protocol shape/token reuse, unknown shipping, conflicting identities and variants, accessory/parts exclusion, small-gap/new-wins judgments, previous-model distinction, metadata confirmation, listing cache isolation/expiry, stock and price rechecks, dead inventory suppression, private pending alerts, readable outbound errors, share privacy and the portable Node adapter.

Local HTTP checks and production-context draft `6aaad13ac2e3571c1f32b2c3` checks pass for the homepage, ten static board entries, public client assets/private provider exclusion, both demos, saved-result loading, honest missing-provider response, URL/alert validation and paused purchase tools. No browser visual/interaction tests were performed. No eBay keys exist in production, so real eBay inventory is not validated or enabled. Automatic alert monitoring/email delivery is not configured. Optional Vercel compatibility source has not been deployed on Vercel.

Netlify production deploy `6aaad1cf9f9f8a5fa6fd47d6` is live on `https://thisloophole.com`. The same hosted HTTP suite passes on the public domain: homepage/monthly feature, ten static board entries, public client assets and private provider exclusion, both labeled examples and correct savings/new-wins verdicts, persisted shared-result loading, honest unconfigured live search, URL and alert validation, readable disabled-buying response and paused purchase checker. Real marketplace access, delivered email alerts, Vercel deployment and browser visual testing remain the explicitly stated limits above. GitHub synchronization remains separate because its saved credential previously failed.

## Earlier minimalist verification — 2026-09-16

The public site now uses a minimalist white/black publication theme, a normal lowercase loophole wordmark, the motto "The economy is full of bugs", and a top loophole of the month. The Same Thing is a curated ten-product price-gap leaderboard. Thirty-nine orderable USD offers were retrieved directly from four public storefronts; all included comparisons match both manufacturer model and UPC. Search-index prices were not used. Unavailable Goldie offers were excluded. Delivery/backorder warnings and Weller's contradictory listed dimensions remain visible.

All 62 tests, JavaScript syntax validation, TypeScript checking and the public-only production build pass. The board and monthly feature are rendered into published static HTML. The public bundle omits the old purchase checker and fictional demo assets. The former tool endpoints return 410 without paid-provider calls; the old purchase-checker route redirects home. A local preview was opened. Browser interaction/visual testing was not performed for this revision.

Netlify production deploy `6aaac8126fff2f00a17f4479` was published to `https://thisloophole.com`. Hosted HTTP checks confirm the new homepage and monthly feature, ten static board entries, no purchase-checker navigation, redirects for both the retired tool and its child routes, 404 responses for the old purchase/demo assets, and 410 responses from all four paused tool endpoints. GitHub synchronization remains separate because the saved credential previously failed.

## Previous verification — 2026-09-15

The existing production repository now contains the LOOPHOLE studio homepage, Experiment 001 at `/samething/`, and the original purchase checker preserved at `/purchase-checker/`. The experiment has three explicitly fictional demos, a bounded live extraction/search pipeline, evidence-gated prices, transparent similarity and confidence scoring, 24-hour supported-result caching, five-minute empty-result caching, native endpoint rate limits, shareable saved results, first-party event storage, and email-interest capture.

All 57 automated tests pass. JavaScript syntax validation, TypeScript `checkJs`, the public-only production build, responsive browser checks at desktop and 390px mobile widths, all three demo flows, saved-result loading, and the preserved purchase checker pass. No horizontal overflow or application console errors were observed. A real West Elm page that blocked direct extraction recovered its product identity through cited search and returned an honest `NO_SUPPORTED_MATCH` result with no invented price, score, or alternative.

Netlify production deploy `6aaa14d5c4e2b887428a39c7` was published to `https://thisloophole.com` and smoke-tested on the live domain. The homepage, Same Thing landing page, chair demo result, real West Elm bounded-search result, and preserved purchase checker all loaded without application console errors. GitHub synchronization remains separate because the saved GitHub credential previously failed.

## Previous purchase-checker verification — 2026-09-12

49 automated tests and production build pass. Rainforest free-trial credential configured as a production-only Netlify secret. Live Amazon ASIN B0D1TX35MQ automatically filled $1,488.95, Amazon, Technology Traders, and new condition; sourced Dell alternative $2,099.99 displayed in form and result. Prices are observations, not fixtures or guarantees. The result withholds a numeric score when equivalent condition and purchase terms are unconfirmed. Missing evidence no longer becomes WAIT. Secondary offers request failure preserves successful product data.

Production was deployed directly from this existing checkout. GitHub push remains unverified; earlier saved credentials failed. The historical checks below describe earlier versions and are superseded by this entry.

# MVP validation — September 11, 2026

## Automated coverage

25 Node tests cover all five verdicts; high-priced electronics; retailer-specific savings; no strong matches; used/open-box/refurbished exclusions; missing merchant and price; invalid URLs, hosts and payloads; stale/unverified policies; incompatible benefit stacking; persistent purchases; feedback capability authorization; idempotent outcome updates; storage failure; protected metrics; and separation of reported versus reviewed savings.

The build validates all 14 policy records, checks executable JavaScript syntax, emits a public-only dist folder, and bundles four Netlify Functions. The actual Netlify manifest contains native IP rate-limit rules for purchase checks and outcomes. Production hosting uses Node 22 per netlify.toml; local validation ran on Node 24.13.0.

## Browser checks

- $1,499 Alienware monitor at Best Buy: WAIT, a transparent score, four relevant policies, no invented savings.
- $500 qualifying Target purchase with explicitly confirmed existing Circle Card eligibility: SWITCH, $475 conditional option, $25 potential savings.
- Handmade vase at a local studio: honest no-match state.
- Open-box Best Buy monitor: return-policy match; new-only price-match and price-adjustment records excluded.
- Missing merchant: successful evaluation explaining the missing evidence.
- Missing price: native form validation prevents submission.
- javascript: product input: server validation error appears at the form; input remains editable.
- Useful feedback, reported savings, and bought/wait decisions: success messages observed and corresponding local records saved.
- Score disclosure displays all four dimensions and their reasons.
- Desktop 1440px: two-column form and result layout confirmed; document width equals scroll width.
- Mobile 390px and 320px: form and result widths equal their scroll widths, with usable controls. At 320px a $1,499 purchase and wait feedback succeeded.

The in-app browser viewport override did not resize its native panel, so a local-only iframe fixture supplied actual 1440/390/320px document viewports. This fixture is not published. One browser-instrumentation MutationObserver error appeared during a fixture navigation; refilling after the frame loaded completed the test. The application contains no MutationObserver code and its normal page flow had no observed application JavaScript errors.

## Deployment checks and outstanding verification

- https://thisloophole.com responds HTTP 200 with Netlify headers.
- Existing GitHub main equals pre-MVP local HEAD 37cc4bedd845b54869f16c0647be271dadf1c45b.
- No new repository, DNS changes, or production deploy.
- Netlify requires login; no site ID link is configured locally.
- A dry-run push was rejected because the saved GitHub credential is invalid.
- Therefore actual hosted Blobs permissions, production form/feedback behavior, and the Netlify project's exact Git integration must be smoke-tested after authentication. Offline bundling cannot prove hosted persistence.

See DEPLOY.txt for the exact link, draft-deploy, production-deploy and rollback sequence. The MVP is implemented and locally validated; the live-domain definition of done is not yet met.


## Product-link correction — 2026-09-11

- 37 automated tests pass, including SKU/offer association, Marketplace seller eligibility, unknown score/condition, blocked fetches, aggregate-price rejection, redirect allowlist and request validation.
- Browser: supplied Best Buy URL fills Best Buy immediately; failed listing retrieval displays explicit missing evidence. Manually entered price and Marketplace seller survive the asynchronous lookup. Submit shows an unscored WAIT, unknown condition and zero direct-retailer policy matches. No browser errors or warnings in this flow.
- Listing extraction only reads accessible Schema.org Product/Offer data. Same-page in-stock alternative offers are candidates requiring user confirmation; no cross-store search integration is connected. Best Buy example retrieval failed both directly and through a separately tested public reader service (the reader service is not part of the application).
- Netlify draft 6aa3979579462c605dfc95af: hosted purchase, useful feedback and wait outcome saved successfully, with no console errors. Production deployment 6aa39898ef7ff82f4cdae36f published 2026-09-11 to https://thisloophole.com.
