# The Same Thing: implementation and evidence contract

## Existing repository audit, September 16, 2026

1. Framework: static HTML/CSS/ES modules, Node 22+, existing TypeScript compiler/checkJs. No React or framework migration needed.
2. Routes: homepage, /samething/, privacy and static playbook. Netlify redirect rules map /api/* to function wrappers. Purchase checker and earlier AI comparison endpoints are deliberately paused.
3. Database: private persistent Netlify Blobs production/preview namespaces; local development uses a file store. No SQL database, accounts or migration service.
4. API integrations: existing server-only Rainforest Amazon identity and Anthropic cited search in preserved modules. New circular search does not use Anthropic. Configured production variable names were checked without exposing values: ANTHROPIC_API_KEY, RAINFOREST_API_KEY, NODE_VERSION. No eBay credentials found.
5. Analytics: restricted first-party studio events in Blobs, not third-party tracking. Existing endpoint extended with requested circular event names.
6. Deployment: existing thisloophole Netlify site, public thisloophole.com domain, linked local production Git checkout. Keep this infrastructure. Optional Vercel adapters are compatibility source, not a migration.
7. Variables: .env.example documents retained keys, new EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_ENVIRONMENT and CIRCULAR_LISTING_CACHE_MINUTES. External Blobs credentials are needed only for the optional Vercel path. Values stay server-side.
8. Reuse: minimal theme, homepage/monthly board renderers, reviewed source records, storage adapter, analytics, Amazon ASIN adapter, TypeScript dependency, public-only build and deployment workflow.

## Implemented scope

- Strict TypeScript normalized identity, provider contract, curated model relationships, deterministic matching, economics, cache/session service, HTTP handlers, presentation and browser controls.
- Query input, URL metadata identification, editable name/brand/model/new price, optional critical specifications and ZIP, previous-model opt-in, responsive accessible forms/statuses/disclosures.
- Official eBay OAuth/Browse provider, fixed-price second-life conditions, real shipping where available, detail enrichment, trusted destination URLs, seller/condition/identifier evidence and bounded requests.
- Labeled match categories rather than invented precision scores. Conflicting variants, parts, obvious accessories, auctions and unknown currency are excluded.
- New is allowed to win. Shipping unknown means saving unknown. Older generations cannot become an exact same-product winner.
- Product metadata cache 24 hours, listing cache 15–60 minutes (30 default), stale saved results refresh, live outbound links recheck, dead listing suppression and fresh price overrides.
- Copy link/share/copy result, privacy-safe first-party events, private deduplicated product alert requests with optional threshold and pending status.
- No-cost labeled demos when credentials are missing; real queries never silently fall back to fictional inventory. Demos and sandbox inventory cannot be purchased.
- Existing top-ten board and monthly feature remain independently functional and unchanged in sourcing.

## External and intentional limits

- Real eBay production inventory cannot be validated until approved credentials are supplied in server configuration. Provider tests exercise actual protocol shape with injected responses, not real listings.
- No Best Buy circular integration, REI inventory, Facebook Marketplace, warehouse/floor-model inventory, crawling or anti-bot scraping.
- Deterministic supported initial types: phones, cameras, chairs, drills, watches. Normalization is strongest for the five example brands; broader category/generation inference is deferred.
- Previous generations are a two-relationship reviewed table, not autonomous guesses. Functional lookalikes without a supported model relationship are deferred.
- No AI/vision calls or numeric similarity percentage. Source evidence and uncertainty are visible.
- Source prices are observations before tax, not inventory reservations or guaranteed checkout totals. Address-specific shipping can differ. No ZIP means provider estimates.
- Automatic email monitoring/delivery is not connected. Requests explicitly say so before submission and in their receipt. No email is sent by this MVP.
- Shared pages use generic OpenGraph metadata; dynamic image generation is deferred.
- Vercel compatibility adapters are tested locally for request conversion; no Vercel deployment has been validated. Netlify production is the release target.
- Browser visual/interaction tests were not requested. Validation uses strict type checks, automated domain/protocol/storage/render tests and hosted HTTP checks; no mobile visual claim.

See README.md for exact variables, local commands, setup and extension procedure.
