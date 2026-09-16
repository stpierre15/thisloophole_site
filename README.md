# LOOPHOLE studio

Production repository: https://github.com/stpierre15/thisloophole_site

This checkout is `~/Desktop/loophole/loophole_v4`; the package and remote are named `thisloophole_site`. It is the existing production repository. Do not initialize a replacement repository.

LOOPHOLE is an experimental internet studio built around one position: **waste is a pricing error**. The homepage is the studio index. `/samething/` is Experiment 001. The original purchase checker remains at `/purchase-checker/`.

## Run and verify

Requires Node 22 or later.

```sh
npm ci
npm run dev        # http://127.0.0.1:4174
npm run lint       # syntax-check all source modules
npm run typecheck  # TypeScript checkJs + explicit domain declarations
npm test           # deterministic engine/API/security/storage tests
npm run build      # validate catalog and create public dist/
```

Local API records go to `.local-data/`. Production and each deploy preview use separate strongly consistent Netlify Blob stores.

## Architecture

The project intentionally keeps its small existing architecture: static HTML, CSS, and ES modules on the client; native Netlify Functions on Node 22; Netlify Blobs for durable records and caches. There is no account or auth flow. Public write routes use Netlify rate limits and same-origin JSON validation.

- `index.html`, `assets/studio.*`, `assets/experiments.mjs`: studio homepage and reusable experiment index.
- `samething/`, `assets/samething.mjs`: Experiment 001 interface, demos, results, sharing, and capture.
- `experiments/same-thing/`: product schema, safe extraction, bounded search provider, transparent similarity engine, and orchestration/cache service.
- `assets/same-thing-demos.mjs`: public fictional demonstration records. These are always labeled `DEMO` and make no market claims.
- `purchase-checker/`, `assets/purchase.*`, `lib/api.mjs`: preserved purchase checker and its sourced policy engine.
- `lib/studio-api.mjs`: Same Thing, email capture, and first-party event endpoints.
- `netlify/functions/`: deploy wrappers and per-IP rate limits.
- `types/` and `experiments/same-thing/schema.d.ts`: domain contracts. `tsconfig.json` type-checks the new experiment modules without forcing a framework rewrite.
- `scripts/build.mjs`: copies only public assets into `dist/`; server code, raw records, secrets, and tests are excluded.

The current production setup is Netlify, despite an earlier product brief referring to Vercel. `netlify.toml`, the linked project, Netlify Functions, and Blobs remain the supported deployment path.

## The Same Thing pipeline

1. Canonicalize and validate a public HTTPS product URL against the furniture/lighting retailer allowlist.
2. Prefer Schema.org Product data, then Open Graph metadata and server-rendered descriptions.
3. Normalize name, brand, current USD price, category, dimensions, materials, construction, style, features, warranty, image, and source URL.
4. Generate three non-brand queries from the most identifying supported attributes.
5. Run one bounded provider request: at most three searches and two page fetches.
6. Discard prices and attributes that lack provider-native retailer citations.
7. Filter to cheaper candidates in the same supported category.
8. Score known evidence: attributes 35%, dimensions 25%, materials/construction 20%, visual evidence 20%. Missing data is excluded from similarity and lowers confidence. Live MVP results do not invent a visual score.
9. Produce deterministic similarities, differences, and an editorial explanation. No shared factory, manufacturer, quality, origin, or causation is inferred.
10. Save the raw extraction separately from the public result for debugging.

The candidate provider is isolated in `experiments/same-thing/search.mjs`; it can be replaced without changing extraction, scoring, storage, or UI.

## Cache and cost control

Canonical URLs are SHA-256 keyed. Successful analyses are reused for 24 hours; no-match results are reused for five minutes. A cache hit skips extraction, search, scoring, and explanation. Curated demos never call an external provider. The public analysis endpoint permits three requests per IP per minute. The model defaults to the inexpensive configured search model and has hard search/fetch/token limits.

## Environment variables

- `ANTHROPIC_API_KEY`: server-only cited retailer search for Same Thing and the purchase checker.
- `LOOPHOLE_SEARCH_MODEL`: optional model override; defaults to `claude-haiku-4-5-20251001`.
- `RAINFOREST_API_KEY`: optional server-only Amazon offer data for the purchase checker.
- `LOOPHOLE_ADMIN_TOKEN`: optional protected founder metrics access.
- `LOOPHOLE_SEARCH_DIAGNOSTICS=true`: temporary private purchase-search diagnostics. Leave off normally.

No browser bundle contains a key.

## Curated comparisons

Public demonstrations live in `assets/same-thing-demos.mjs`. Every record must include `reviewStatus: 'DEMO'` unless real product URLs, current prices, specifications, and review metadata have been manually verified. Do not convert a fictional demonstration into `CURATED` by changing a label alone.

A future verified record should retain source and alternative URLs, observed prices and date, dimensions, materials, similarities, differences, match classification, score inputs, reviewer, and review status. Stale prices should be hidden or rechecked.

## Adding an experiment

1. Copy `NEXT_EXPERIMENT.md` into an issue or working note.
2. Add one metadata entry to `assets/experiments.mjs`; the homepage renders it automatically.
3. Put experiment-specific server logic under `experiments/<slug>/` and the public page under `<slug>/`.
4. Reuse `assets/studio.css`, `lib/storage.mjs`, the capture/event patterns, same-origin validation, and a distinct cache prefix.
5. Add the public folder to `scripts/build.mjs`, define Netlify redirects/functions if needed, and test the final `dist/` allowlist.

## Stored data and analytics

`email-captures/` stores email, submitted URL when present, requested experiment, and timestamp. It records interest only; there is no mailing provider. `studio-events/` accepts only the named product events and restricted scalar metadata; it excludes email and full product URLs. Same Thing raw extractions and results have separate prefixes. See `privacy.html` for user-facing disclosure.

## Known MVP limits and next improvements

- Retailer coverage is allowlisted and US/USD only. Bot-protected pages may expose no usable product data.
- Live comparison is text/spec based. Visual scoring is withheld until a bounded, source-safe image comparison provider is added.
- Search is intentionally shallow and can miss valid alternatives. An empty result is labeled a search limitation.
- Email requests are stored but not sent. Connect an explicit opt-in mailing provider before sending campaigns.
- The share card is screenshot-ready HTML; there is no dynamic per-result Open Graph image yet.
- Second-life ownership math is shown only in fictional demos. Live resale estimates require a separate trustworthy data source.
- Blob scans are suitable for an MVP. Add rollups or a relational analytics store at higher volume.

The next useful steps are verified curated pairs, better furniture extraction fixtures, source-safe image comparison for only the top two candidates, a monitored provider budget, and a human review queue for requested matches.

See `DEPLOY.txt` for the existing Netlify release path and `DATA.md` for purchase-policy maintenance.
