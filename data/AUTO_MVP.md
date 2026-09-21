# Loophole Auto MVP architecture

## Persistence and migration

There is no SQL migration. The existing `Store` abstraction writes portable private JSON records to the production Netlify Blobs namespace and to `.local-data/` during local development.

New prefixes:

- `auto/dealers/{id}` — normalized dealer identity and location
- `auto/vehicles/{id}` — VIN-level vehicle identity where available
- `auto/listings/{id}` — current provider listing state and first/last observation timestamps
- `auto/observations/{listingId}/{observationId}` — append-only price and mileage observations
- `auto/comparables/{listingId}/{snapshotId}` — calculated comparable snapshots
- `auto/analyses/{listingId}/{analysisId}` — score and stored component values
- `auto/vins/{vin}` — long-lived NHTSA decode cache
- `auto/deal-reports/{tokenHash}` — paid anonymous Deal Plans
- `auto/stripe-sessions/{sessionId}` — idempotent payment-to-report mapping

Existing records are not modified or deleted. A listing price change creates a new observation. The listing’s current price changes, but earlier observations remain. Two consecutive verified missing refreshes mark a stored listing inactive; records are retained.

## Providers

`VehicleInventoryProvider` separates inventory acquisition from scoring and presentation.

- `DemoInventoryProvider` is active when no live provider is configured. Every result and report is labeled fictional and contains no dealer link.
- `EbayMotorsProvider` uses client-credentials OAuth and the official Browse API. It does not scrape eBay. The adapter is implemented and covered with contract tests, but production automotive access is not claimed until working production credentials return actual vehicle inventory.
- `NhtsaVinProvider` uses the official vPIC `DecodeVinValuesExtended` endpoint. A live public VIN decode was successfully tested during the MVP build. Missing or unavailable NHTSA fields remain null.

Future licensed feeds implement the same provider contract. Arbitrary dealership scraping is out of scope.

## Comparable and score methods

Comparables use the same make/model, plus or minus one model year, and a mileage difference of no more than 25,000 miles inside the inventory returned for the buyer’s query. The snapshot stores count, median, average, percentile, and price delta.

Score components are normalized to 0–100 and stored:

- price position: 30%
- observed listing age: 25%
- downward price history: 20%
- competing inventory: 15%
- depreciation context: 10%

The score is intentionally described as experimental. Dealer motivation is never represented as an observed fact.

## Deal Plan and Stripe

The Deal Plan is a one-time $49 Stripe Checkout purchase. No subscription or account is created. Checkout metadata binds the Stripe session to one listing. Fulfillment retrieves the session server-side and requires:

- `payment_status` is `paid`
- metadata listing ID matches the requested listing
- currency is USD
- total is exactly 4,900 cents

The generated report is stored behind a random token. Automatic email delivery is not connected. A clearly labeled demo preview is available without payment for product testing.

## Buyer’s-order upload TODO

A future server-only intake should accept a photo or PDF, store it privately, extract sale price, fees, accessories, trade, tax, title, registration, and finance products, then present every extracted value for buyer confirmation. The analyzer should flag optional items and discrepancies without calling products scams. File validation, malware scanning, retention, deletion, extraction provenance, and access tokens must be designed before enabling uploads.

## Current limitations

- Production eBay Motors behavior depends on approved Browse API credentials and has not been validated against live automotive inventory.
- The current eBay adapter uses buyer ZIP as marketplace context; precise radius filtering needs a licensed feed with reliable coordinates or distance fields.
- Stripe is scaffolded but not active until the two Stripe variables are configured with a $49 one-time Price.
- No transactional email service is connected.
- Demo observations are realistic and deliberately fictional.
