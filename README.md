# Loophole Auto

Production repository for [thisloophole.com](https://thisloophole.com).

Loophole Auto is buyer-side automotive intelligence: observable listing history, deterministic comparable vehicles, an explainable experimental Loophole Score, and a one-time $49 Deal Plan.

## Stack

- Static HTML, CSS, and browser ES modules
- Strict TypeScript domain modules compiled to `.generated/auto/`
- Netlify Functions and Blobs in the current production deployment
- Vercel function adapters and optional Upstash Redis storage for migration
- No accounts, frontend framework, ORM, SQL database, or subscription

## Public routes

- `/` — Loophole Auto homepage
- `/cars/` — make/model/ZIP/radius search
- `/car/[listingId]/` — vehicle detail, history, comparables, score
- `/deal-plan/[listingId]/` — Stripe checkout or labeled demo report
- `/how-it-works/` — method
- `/why-loophole/` — buyer-first principles
- `/privacy.html` — privacy

Earlier shopping experiments remain in source history but are not copied into the public build.

## Development

Requires Node 22 or newer.

```text
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Local development uses `.local-data/`. Without inventory credentials, the complete flow uses clearly labeled fictional demo vehicles.

## Server-only configuration

- `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_ENVIRONMENT` — official eBay Browse API. Without both credentials, automotive search uses demo inventory.
- `STRIPE_SECRET_KEY`, `STRIPE_DEAL_PLAN_PRICE_ID` — one-time Stripe Checkout price. The configured Stripe Price must be exactly USD $49.00; report fulfillment verifies the paid session amount.
- `NETLIFY_BLOBS_SITE_ID`, `NETLIFY_BLOBS_TOKEN` — only for a Vercel deployment that continues using Netlify Blobs.
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — on Vercel, stores dealership sessions and site data independently of Netlify. Configure both in Preview and Production before deployment; keep preview and production namespaces separate.

Before changing DNS, run `node scripts/migrate-netlify-to-redis.mjs` once with both Netlify Blobs and Upstash credentials in the local environment. The script copies production records without deleting the source. Run it again just before cutover to capture records created during testing; a final brief write freeze is needed for exact continuity.

NHTSA vPIC is public and needs no key. VIN results are cached by VIN without a routine expiry because identity is not time-sensitive. An NHTSA failure never blocks inventory search.

## Evidence boundaries

The Loophole Score is an experimental weighted indicator, not a prediction of dealer behavior. Comparable selection starts with same make/model, adjacent model year, and a similar mileage band in the returned inventory. Price history is append-only. Deal Plan ranges are estimates from observed asking prices and do not claim dealer cost, invoice, holdback, or guaranteed acceptance.

See [`data/AUTO_MVP.md`](data/AUTO_MVP.md) for records, integrations, payment behavior, and current limitations.
