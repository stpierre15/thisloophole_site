# FAIR BABY™

Static, client-only satirical experiment at `/dei/`. No framework or backend is required.

## Local development

```sh
npm ci
PORT=4175 npm run dev
```

Open `http://127.0.0.1:4175/dei/`. `/dei` resolves to the same page. The build copies `dei/` and `assets/dei/` into `dist/`; the existing static Netlify/Vercel hosting handles the directory index.

## Modules

- `dei/index.html`: introduction, three application steps, simulated analysis, certificate.
- `assets/dei/dei.css`: independent institutional styling, mobile layout, print certificate.
- `assets/dei/dei.mjs`: form validation, local photograph previews, session lifecycle, timed analysis, results and printing.
- `assets/dei/model.mjs`: deterministic fictional score, demo ZIP hash, seeded composite allocation. Weights total 100. Income, wealth, parent and family education, ownership, inheritance, private/selective education, legacy, profession and simulated neighborhood contribute. Withheld economic answers use neutral demo values.
- `assets/dei/portrait.mjs`: `generateAllocatedPortrait(profile, parentImages)` returns the static placeholder. V1 does not inspect or transmit images.
- `assets/dei/infant.svg`: generic infant silhouette, independent of inputs.

Self-identified race and ethnicity appear only in the representation field. They never change the score, name, financial/educational outcomes, or adjustments. If both parents withhold identity, representation is deferred. ZIP hashes are invented and use no external or census data.

## Privacy and limitations

State lives in memory; refresh, leaving the page, or starting a new application clears it. No local/session storage, cookies, analytics, API calls, query parameters, or uploads are used. The page's content security policy blocks connections and native form submission. Photographs are read as local data URLs and validated by the browser decoder; JPEG, PNG, WebP and GIF up to 10 MB are supported. HEIC must first be exported as JPEG.

Processing lasts approximately four seconds (background browser timer throttling can extend this). Names and humorous adjustments use seeded selection so the same answers give the same profile; document numbers and issuance timestamps are session-specific. The scoring and output have no scientific meaning.

`PRINT / SAVE CERTIFICATE` uses the native print dialog and print stylesheet. Saving as PDF depends on the browser/OS; PNG download and AI portrait generation are outside V1. Parent photographs and raw household answers are omitted from the printed certificate. Self-identified representation appears in the certificate, as shown in the preview.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`tests/dei.test.mjs` checks deterministic output, all identity-pair invariants, independent economic factors, bounded scores, malformed inputs, withheld answers, and the placeholder adapter's no-inspection contract. Browser verification should exercise each step, local photo validation, the reveal, print layout, session reset and `/`, `/dealership/`, `/dei/` at desktop and mobile widths.

Verified in Chrome at 1440 × 1000 and 390 × 844: all three routes rendered without page/console errors or horizontal overflow. Both `/dei` and `/dei/` loaded. Desktop and mobile applications reached results; omitted identity remained unassigned. Missing fields, a four-digit ZIP, unsupported files, corrupted images and files over 10 MB were rejected. Back navigation preserved values. Refresh and new application cleared photos, values and results. No form/image network transmission or web storage was observed. The certificate rendered as one Letter PDF page; output was visually checked. Mobile verification used viewport emulation, not physical iPhone hardware.
