# Data maintenance and founder metrics

## Edit the catalog

Edit data/loopholes.json in Git; no public admin editor is exposed. Each record follows types/models.d.ts. Run npm run check:data and npm test before a deploy. Keep IDs stable. Records describe policies and repeatable purchase paths, not invented live offers.

To verify a record: read the linked primary source, update the requirements and exclusions, set the actual last_verified date, record a conservative confidence_score, and only then set verification_status to VERIFIED and status to Active. If unsure, use REPORTED or EXPERIMENTAL, or set status to Needs Review to suppress it. Never renew dates without checking the policy. Review the catalog at least every 90 days. Expired, suspended, archived and draft records are not matched.

Monetary estimates are nullable. For percentage rules, savings_type is percentage and estimated_savings_min/max are percentage points; rate is the fractional multiplier. Non-cash benefits must not be assigned dollar savings without separate evidence. Current numerical optimization supports only the target-card rule and explicitly confirmed user comparisons. Adding other calculated benefits requires an eligibility rule and regression test, not just a seed value.

Matching uses category, canonical merchant, explicit brand/model keywords where required, purchase stage, condition, opt-in to refurbished, and exclusions. Keep keyword lists narrow. stackable_with and conflicts_with contain other IDs; stacking requires both records to explicitly allow each other. V1 chooses one best monetary route even when schema relations allow stacking.

## Durable stores

In Netlify > Data & Storage > Blobs, production records use loophole-v1-production. Preview stores include the deploy ID. Files under these prefixes are portable JSON:

- purchases/{id}: normalized purchase, full result snapshot, anonymous browser ID and feedback capability hash.
- events/{id}: accepted check request, marked completed after durable purchase storage.
- outcomes/{purchase_id}/useful: current Yes/No response, overwritten on change.
- outcomes/{purchase_id}/decision: current bought/wait decision and optional reported savings, overwritten on change.
- verifications/{purchase_id}: optional private founder-reviewed savings evidence record.

The per-purchase outcome keys prevent button retries from inflating totals. Useful and decision updates use separate keys. Keep exports private: product descriptions may contain user-entered information. Clearing the browser's identifier does not erase stored records. Local test records are under .local-data/ and excluded from Git and the public build.

## Metrics

Set LOOPHOLE_ADMIN_TOKEN in the Functions environment. Request GET /api/metrics with Authorization: Bearer YOUR_ADMIN_TOKEN through a trusted terminal/API client. Do not include the token in a URL. Without the token, the endpoint returns 401. No public dashboard exposes user data.

purchase_checks_started counts API requests accepted for processing, including validation failures; it is not a pageview or raw button-click metric. purchase_checks_completed and recommendations_generated count durable purchase snapshots. useful_percent is useful Yes responses divided by unique purchase votes; null means no votes. purchases_completed counts bought outcomes. reported_savings sums self-reported amounts. repeat_users is an approximate count of random browser identifiers with more than one completed check.

## North Star: verified user savings

verified_user_savings starts at zero and stays zero when people merely enter savings. A public outcome can never make an amount verified.

After privately reviewing evidence, an authorized operator can write a JSON object at verifications/{purchase_id} using Netlify's authenticated Blobs tooling. Required shape:

    {
      "purchase_id": "existing purchase UUID",
      "verified_savings": 25,
      "evidence_reference": "private receipt/review reference",
      "reviewed_at": "actual ISO timestamp",
      "reviewer": "operator identifier"
    }

Keep evidence outside the public site. Review the original price and final cost on a comparable basis, subtract new fees and required membership costs, exclude asset trade-in proceeds and unredeemed rewards, and attribute only the amount actually saved because of the action. A record without evidence/reviewer/date is not counted. Each purchase can contribute only one reviewed amount, bounded by the original purchase price. The schema is ready for evidence review; receipt collection and automatic verification are intentionally not in this MVP.
