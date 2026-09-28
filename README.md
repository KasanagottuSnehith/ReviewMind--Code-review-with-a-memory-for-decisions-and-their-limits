# ReviewMind

ReviewMind is a code reviewer that remembers why an engineering exception was approved, where it applies, and when it stops applying. Its key question is: **“We approved this before, but does that approval apply here and now?”**

This repository is a hackathon prototype built with synthetic data. It does not merge code, execute submitted code, fetch submitted URLs, or certify that a change is safe.

## The working flow

```mermaid
flowchart LR
  A[Small pasted diff] --> B[Hindsight recall]
  B --> C[Canonical source validation]
  C --> D[Scoped review]
  D --> E[Reasoned feedback]
  E --> F[Hindsight retain]
  F --> G[Hindsight reflect draft]
  G --> H[Maintainer approval]
  H --> I[Retain approved version]
  I --> J[Ingestion + recall readiness]
  J --> K[Fresh-session review]
```

Supabase is the authority for users, repository ownership, immutable source events, approval versions, revocation, and worker jobs. Hindsight is the semantic memory layer. The generation model explains the current change and evidence. Deterministic application code decides whether an approval can waive a convention.

## Why memory matters here

- **Retain** stores feedback and approved decision versions as immutable `event:<uuid>` documents.
- **Recall** finds semantically relevant history. Recalled facts must resolve back to authorized events in the current repository and demo run.
- **Reflect** converts selected, retained feedback into a structured draft. Reflection never approves policy.
- **Readiness** requires both successful ingestion and a targeted recall that returns the expected document provenance.

An exception is usable only when its canonical decision is approved, ready, in the same repository/run, effective at the recorded review time, unexpired, path-matched, version-matched, prerequisite-complete, and not revoked or superseded. Conflicting decisions remain conflicts.

## Workspace

- **Reviews**: PR-A–E fixtures, pasted diffs, context, findings, feedback, sources, and an audit area for waived concerns.
- **Decisions**: reflection drafts, approval/rejection/revocation, source timeline, job readiness, and version history.
- **Evaluation**: frozen Generic, Static, and Memory comparisons across twelve server-only cases.

The fixed explicit 2-second request timeout is non-waivable. The AST check is intentionally fixture-scoped: it recognizes named `request` imports from `bridge-client` and the supplied `transport` helper when called with a literal options object. Aliases, spreads, computed values, and unknown call patterns return `needs_context`.

## Prerequisites

- Node.js 24
- A Supabase project with PostgreSQL database access
- A Hindsight Cloud or compatible Hindsight API account
- An OpenAI-compatible generation endpoint with JSON Schema output; the default example uses Groq and `openai/gpt-oss-120b`

Copy `.env.example` to `.env` and fill it locally. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `HINDSIGHT_API_KEY`, or `LLM_API_KEY` to Vite/browser variables, logs, screenshots, or archives.

## Setup

```powershell
npm ci
npm run check:config
npm run migrate
npm run seed
npm run integration
npm run dev
```

`DEMO_PASSWORD` must be at least twelve characters. The seed command creates maintainer, contributor, and viewer accounts using that same local password. It creates a fresh Hindsight bank namespace through the worker and deliberately does **not** pre-approve the wrapper exception.

Open `http://127.0.0.1:5173` in development. Production uses one long-running process:

```powershell
npm run build
npm start
```

Open `http://127.0.0.1:3001`. `/health` checks the process; the authenticated `/api/dependencies` endpoint checks configured dependencies without returning keys.

## Verification

```powershell
npm test
npm run typecheck
npm run build
npm audit
```

`npm run integration` is the real-provider gate. It authenticates through Supabase, persists an isolated proof repository, performs Hindsight retain and operation polling, verifies fresh-client recall provenance and document resolution, validates a structured reflect result, and requests a real structured review. It writes only sanitized status to `docs/evidence/integration.json`.

The last local verification is documented in [docs/EVALUATION.md](docs/EVALUATION.md). Provider-dependent tests are not counted as passed until that command records `status: passed`.

## Demo chronology

1. Run PR-A at 29 September 2026. Give a temporary-exception reason for `transport-wrapper`, require the exact legacy scope, version `>=1.8.0 <2.0.0`, expiry `2026-09-30T00:00:00Z`, and timeout prerequisite.
2. Wait for feedback memory readiness, inspect the real reflection draft, and approve it.
3. Wait for approval memory readiness, click **Clear workspace**, and rerun PR-A. Inspect its recalled canonical source.
4. Run PR-B (wrong path), PR-D (missing timeout), and PR-E (missing version).
5. Advance the labelled demo clock to 1 October and run PR-C. Rewinding creates a new isolated run.
6. Teach an unseen non-safety convention from a supplied code line, reflect, approve, wait for readiness, and test it in a fresh review.

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the three-minute narration.

## Deployment

Use the included `Dockerfile` on a service that keeps one Node process running. Configure the same server environment and set the health check to `/health`. Supabase and Hindsight remain managed external services. Do not deploy the worker to an ephemeral request-only platform.

Run `npm run migrate` before starting updated workers. Migration `002_worker_protocol.sql` prevents older workers from claiming new jobs: the current worker uses the `v2:` queue protocol. Retired workers receive no jobs. `/health` reports the loaded review prompt version; current generation attempts also record that version privately for troubleshooting. Stop any outdated processes after upgrading.

A public deployment was not created because hosting requirements and paid-resource authorization were not confirmed. Local startup is verified. The real-provider integration proof now passes with configured accounts; the complete browser learning journey and 36-case comparison run remain pending.

## Limits and honest claims

- The repository, people, reviews, decisions, and dates are synthetic.
- Recall can miss a relevant memory; absence from recall is not proof that no decision exists.
- A valid citation can still be misunderstood by a model; deterministic boundaries reduce but do not eliminate review error.
- General TypeScript correctness and complete prompt-injection immunity are not claimed.
- The twelve-case evaluation cannot establish production reliability or business impact.
- Finding precision remains “not assessed” until a human labels the saved outputs.

The product differentiation is the visible combination of semantic recall with inspectable path, version, time, authority, and provenance checks. ReviewMind does not claim to be the first AI reviewer with memory.

## Source acknowledgements

The concept evolved from the supplied ReviewMind implementation PRD and three compared research reports. Product rationale also references Hindsight documentation, Microsoft code-review research, Reflexion, LongMemEval, and current descriptions from existing AI review products. These sources support design choices; they do not prove prototype performance. The original synthetic fixtures in this repository are not copied from public repositories.
