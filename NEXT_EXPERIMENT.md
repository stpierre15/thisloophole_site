# LOOPHOLE experiment template

## Identity

- Number: `00X`
- Slug:
- Title:
- One-line provocation:
- Status: `COMING SOON | LIVE | ARCHIVED`
- Planned launch:

## Economic bug

What irrational behavior, pricing gap, ownership problem, or waste pattern does this experiment expose? State it without sustainability jargon.

## User move

What is the single input? What does the user get back? What decision should become easier?

## Evidence contract

- Facts we can support:
- Facts we must never imply:
- Primary data sources:
- Staleness window:
- Missing-data behavior:
- Human review needed:

## Smallest useful pipeline

Input → extraction → normalization → bounded lookup → deterministic calculation → explanation → cache.

List each provider behind an interface. Define hard limits for requests, tokens, candidates, retries, and cache duration before implementation.

## Result anatomy

- The dramatic number:
- Similarities:
- Differences / unknowns:
- Editorial take:
- Subtle circularity move:
- Share summary:

## Data model

Define public result, private/raw diagnostic record, cache key, analytics events, and any email capture fields. Separate fictional demo, AI-assisted, curated, and verified states.

## Abuse, privacy, and honesty

Document URL allowlists, request limits, server-only secrets, retention, public-read behavior, and language that could overstate equivalence or causation.

## Launch checklist

- [ ] Add metadata to `assets/experiments.mjs`
- [ ] Create public page and experiment module
- [ ] Add labeled demos that require no external API
- [ ] Add API wrapper and rate limit if needed
- [ ] Add cache and usage events
- [ ] Update privacy copy
- [ ] Test empty, partial, success, cached, mobile, and reduced-motion states
- [ ] Run lint, typecheck, tests, build, and Netlify bundle validation
- [ ] Deploy a draft and inspect it before production
