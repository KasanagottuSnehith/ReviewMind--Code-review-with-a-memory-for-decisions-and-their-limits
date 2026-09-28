# Evaluation record

## Current verified state

- Automated deterministic and local PostgreSQL tests: **62 passed, 0 failed** on 28 September 2026, including seven reflection wire-format cases and three generation-citation cases.
- Production typecheck and build: **passed**.
- Production process startup and HTTP checks: **passed**; `/health`, application HTML, configuration response, and five fixture records were returned.
- Dependency audit: **0 known vulnerabilities** after pinning the patched build dependency.
- Real Supabase/Hindsight/generation proof: **passed** after correcting reflection schema compatibility and source-ID instructions. See `docs/evidence/integration.json`. The earlier failed run is preserved in `docs/evidence/integration-before-reflection-fix.json`.
- Live PR-A review through the authenticated local API and worker: **passed**, with real Hindsight recall and generation using prompt v2. Before approval, recall correctly reported `no_approved_memory`; the wrapper convention remained a finding without invented citations. See `docs/evidence/review-citation-fix.json`. This is not the full browser approval loop.
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
- Fresh-client real recall of a retained feedback event: **passed** in the integration command. The complete browser feedback/approval/fresh-review journey is still **not run**; this command does not establish that broader acceptance gate.

## Reflection compatibility correction

The initial live run passed authentication, persistence, retention, fresh-client recall, and document resolution, then received Hindsight HTTP 500 at reflection. A simple structured reflection succeeded. The configured endpoint rejected the nullable type-array schema; an `anyOf` variant returned string nulls and omitted source IDs. The adapter now uses string wire fields for optional values and converts only empty/string-null values in designated nullable fields before strict canonical validation. Reflection explicitly requests source UUIDs in its written answer, preserving them through structured extraction. Actual provider source facts are still independently checked; empty or invented source arrays do not pass. Maintainer approval, required exception expiry, and the fixed timeout baseline remain enforced.

The corrected full proof, all 59 local tests, TypeScript check and production build passed. UI acceptance and 36 comparison generations remain pending. Old content drafts describe an earlier checkpoint and should be updated separately before publication.

To complete provider evidence:

1. Configure `.env`, migrate, and seed.
2. Run `npm run integration`; require `status: passed`.
3. Start the app, sign in as maintainer, and run all 36 comparisons from Evaluation.
4. Export the persisted summary with `npm run evaluate`.
5. Have a human assess each saved finding and update only the assessment fields.

Any tuning after the first run must be documented with the original 36 outputs retained.
