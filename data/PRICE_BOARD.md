# The Same Thing editorial price board

The inaugural furniture and lighting edition compares ten named Safavieh products across Safavieh Home, Decor Market, English Elm and Modish Store. It is a tracked selection, not a market-wide top-ten claim. Thirty-nine offers were included.

Public US storefront product records were retrieved directly on September 16, 2026. Each included offer matches the selected manufacturer SKU and UPC. Each store's public cart record confirmed USD. Only each exact variant's actual `price` was used; Shopify `compare_at_price`, unrelated variant minima, coupons and search-index prices were not used. Exact variant IDs are retained in purchase links. An unavailable Goldie lamp was removed from the selection and replaced with the Sasha table. Modish Store returned no exact Sasha model, so it was excluded for that item.

- `price-gap-evidence.json` records the public observations and excluded records; it is not published in `dist/`.
- `assets/price-gaps.mjs` is the manually reviewed public dataset.
- `assets/price-gap-engine.mjs` validates identity and calculates the relative premium, absolute gap and cheaper-price percentage.
- `assets/price-gap-view.mjs` renders the same data into both the static published leaderboard and monthly feature.

Storefront availability means the record accepts orders. It does not prove immediate inventory, an arrival date or a final checkout price. Safavieh Home pages contain backorder wording; that warning is retained in the board. Weller listings show different heights despite matching UPCs, so the entry asks buyers to confirm dimensions. None of these observations prove equal delivery service, warranty, returns, manufacturer origin or product quality.

Refresh manually with `node scripts/review-price-gaps.mjs /tmp/price-review.json`. This fixed-list script reads only supported public storefront search and product records. It has no API key, no broad crawl, and never automatically publishes or overwrites the curated dataset. Optional third argument limits models; fourth argument selects named stores. Review model, barcode, color, quantity, availability and shipping caveats before editing the published data, then run the build and tests.

Prices are dated observations. Recheck before purchase. There is no automated price feed or price-change notification in this edition.
