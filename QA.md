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
