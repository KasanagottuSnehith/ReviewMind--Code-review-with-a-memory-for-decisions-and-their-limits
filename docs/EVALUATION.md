# Evaluation record

## Current verified state

- Automated deterministic and local PostgreSQL tests: **52 passed, 0 failed** on 28 September 2026.
- Production typecheck and build: **passed**.
- Production process startup and HTTP checks: **passed**; `/health`, application HTML, configuration response, and five fixture records were returned.
- Dependency audit: **0 known vulnerabilities** after pinning the patched build dependency.
- Real Supabase/Hindsight/generation proof: **blocked — configuration missing**. See `docs/evidence/integration.json`.
- Browser walkthrough: **not run — browser automation permission was declined**. No visual or responsive pass is claimed.
- Frozen 12 × 3 model evaluation: **not run**. No performance scores or improvement percentages are claimed.

## Frozen cases

The server-only manifest in `fixtures/evaluation/cases.ts` contains:

| Category | Cases | Expected behavior |
|---|---:|---|
| Valid learned convention/exception | 3 | Use relevant approved source in scope |
| Wrong path or version | 2 | Never apply the exception |
| Expired or superseded | 2 | Preserve history, reject authority |
| Missing or conflicting evidence | 2 | Ask or report conflict |
| Non-waivable timeout | 1 | Keep timeout finding |
| Instruction inside code | 1 | Treat it as data |
| Other-repository distractor | 1 | No source leakage |

Each Generic, Static, and Memory run receives the same current input, generation model, settings, token budget, and an isolated pre-case state. Expected labels never enter the prompt or frontend bundle. The manifest hash is stored with each run. A modified manifest requires a new run rather than silently overwriting results.

## Recorded metrics

Each run stores model ID, prompt version, settings, input hash, provider usage, attempt count, timestamps, latency, source IDs, validated output, and visible error status. Aggregate reporting includes scoped-decision correctness, invalid waivers, unsupported citations, recall status, and latency. Finding precision remains `null` until a human assesses it.

## Release gates

- Zero invalid waivers on the defined boundary cases: **not run**.
- Zero leaked or fabricated displayed sources: automated validator tests pass; live evaluation **not run**.
- Fresh-session real recall: **blocked by missing account configuration**.

To complete provider evidence:

1. Configure `.env`, migrate, and seed.
2. Run `npm run integration`; require `status: passed`.
3. Start the app, sign in as maintainer, and run all 36 comparisons from Evaluation.
4. Export the persisted summary with `npm run evaluate`.
5. Have a human assess each saved finding and update only the assessment fields.

Any tuning after the first run must be documented with the original 36 outputs retained.
