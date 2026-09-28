# ReviewMind: Codex implementation prompt

Copy everything below the divider into Codex in this project folder. Keep `ReviewMind_Implementation_PRD.pdf` available in the same workspace.

---

Build ReviewMind into a working, polished, submission-ready hackathon project. Implement and verify the application; do not stop at a plan, scaffold, screenshots, or mocked demo.

## Objective and deadline

ReviewMind is a code reviewer that remembers **why an engineering exception was approved, where it applies, and when it stops applying**. Its central question is: "We approved this before, but does that approval apply here and now?"

I need to submit for an elimination/screening round by the night of **28 September 2026, Asia/Kolkata**. Check the current time immediately. The exact organizer cutoff is unconfirmed: ask for it once, along with the submission portal and content-guide link, while continuing independent implementation. Until confirmed, use **21:00 IST as a conservative internal completion target, not an asserted official deadline**. If that time has already passed, immediately use the remaining confirmed time for the smallest complete demonstrable system and clearly flag timing uncertainty. Do not assume a fresh 48-hour window. Reserve the final 90 minutes when feasible for recording, packaging, link checks, and upload.

Optimize for a credible, memorable demonstration and complete submission. No prompt or project can guarantee qualification; make quality visible through working behavior and evidence.

## Read and establish the requirements

1. Inspect the existing workspace and applicable AGENTS.md instructions. Preserve existing work and reuse functioning code.
2. Read all 24 pages of `ReviewMind_Implementation_PRD.pdf`, including FR-01 through FR-12, schemas, endpoints, lifecycle rules, evaluation cases, and submission gates. This is the detailed implementation baseline; this prompt does not replace it.
3. Read the organizer statement: https://docs.google.com/document/d/1A4ezag02em823ZzYF34DiUVHUNLWI5ztm70QvWidWoQ/mobilebasic . It requires Hindsight and lists a GitHub repository, demo video, live demonstration, memory explanation, and an article, social post, and video from each member. The separate content guide and screening-specific upload requirements still need confirmation. Organizer rules override PRD assumptions.
4. Create a compact `REQUIREMENTS.md` mapping organizer requirements and each PRD P0 requirement to implementation, verification evidence, and status. Start statuses as not implemented/not run. Distinguish organizer rules from product choices.
5. Make a time-boxed plan based on time actually remaining, then begin implementation in the same turn. Keep `BUILD_STATUS.md` current with completed work, commands, next steps, and blockers so work can resume cleanly.

The published rubric is Innovation 30%, Hindsight Memory 25%, Technical Implementation 20%, UX 15%, and Impact 10%. Our differentiation is inspectable, scoped, time-bounded approval memory. Do not claim to be the first AI reviewer with memory.

## Scope and architecture

Use the PRD stack: React + Vite + TypeScript, one Node.js + TypeScript API, Supabase PostgreSQL/Auth, Hindsight Cloud, and one available generation provider/model. One long-running Node process serves the production frontend, API, and lightweight worker; persist worker jobs in Supabase. Do not introduce an agent framework or second backend framework.

Keep these boundaries clear:

- `apps/web`: review workspace, decisions, evaluation.
- `apps/api`: authentication, authorization, input validation, orchestration, job worker.
- `packages/contracts`: shared schemas and error codes.
- `packages/decision-engine`: pure deterministic applicability logic.
- `packages/memory`: real Hindsight adapter and source mapping.
- `packages/reviewer`: generation adapter, prompts, response validation.
- `fixtures`: original synthetic inputs; expected evaluation labels remain server-only.
- `supabase/migrations`: schema, access policies, transactional feedback/approval operations.

Use one synthetic TypeScript repository, one reviewer persona, pasted diffs and fixtures. Enforce at most 3 files, 200 changed lines, and 30 KB total input including context. Do not build GitHub OAuth, webhooks, cloning, CI integration, auto-merging, patch execution, billing, a general chatbot, or a marketing website. Do not add P1 features before P0 works.

## First milestone: prove the real integrations

Before substantial UI styling, verify Supabase authentication and persistence, Hindsight retain/recall/reflect, asynchronous readiness, provenance mapping, and a real structured generation response.

Check current official Hindsight SDK/API documentation, particularly https://hindsight.vectorize.io/sdks/nodejs and the retain, recall, reflect, documents, and operations pages. Verify actual response shapes and pin working dependencies. Do not guess SDK methods or account endpoints.

Check required configuration by presence without printing secret values. Request missing credentials together and explain how to configure them securely. Continue contracts, fixtures, deterministic tests, and UI while credentials are pending. Never place service-role, Hindsight, or LLM keys in browser variables, logs, Git, screenshots, or submission archives.

Development mocks may support tests, but must be explicitly labelled and never presented as real memory or passing integration tests. Without working Hindsight calls, report the core requirement as blocked.

## Build the essential learning loop first

Implement this complete flow through the UI:

**diff → real recall → validated review → human feedback → retain feedback → real reflect draft → maintainer approval → retain approved decision → readiness confirmation → fresh-session review citing that decision.**

Supabase is the canonical ledger for ownership, approval, versions, and history. Hindsight provides semantic memory retrieval and reflection. Canonical database lookups validate recalled evidence; do not quietly replace Hindsight retrieval with database rules or hardcoded fixture IDs.

Feedback dispositions are accepted, incorrect, already_handled, temporary_exception, and preference. Require reasons. Reflection creates a draft with sources and proposed scope; it never approves policy automatically. A rejected comment is not blanket permission to suppress future concerns.

Persist events and memory jobs atomically. Use immutable event document IDs and idempotency keys. Separate retained from ready: confirm ingestion and targeted recall visibility before an approved decision can authorize a waiver. Implement bounded retries, recoverable leases, restart recovery, and explicit pending/failed states. A reset creates a new isolated bank/run while preserving prior evidence.

## Decision correctness is the product

Implement scope checks in tested application code, using established glob and semver libraries. The LLM explains evidence; it does not grant exceptions or compare expiry dates authoritatively.

Each decision must have the PRD fields: kind, rule_key, path_glob, dependency_name/version_range when applicable, effective_from, expires_at where required, rationale, source_event_ids, approval/version status, and supersedes_id where relevant. Temporary exceptions require expiry and target exactly one convention.

Require authorized, approved, ready, verifiable evidence; normalize paths; reject unsafe paths; match path and dependency version; check prerequisites; enforce `effective_from <= review_time < expires_at`; resolve explicit same-scope supersession at the recorded time. Missing context means no waiver. Conflicting decisions without explicit precedence remain conflicts. A future successor must not disable its predecessor early. Revoked, expired, superseded, unapproved, unrelated, or unresolved evidence cannot authorize a waiver.

Keep the fixed explicit-timeout baseline non-waivable. A transport-wrapper exception must never suppress a missing-timeout concern. If implementing a fixture-specific AST check, document exactly which call patterns it supports; unknown patterns produce needs_context rather than a false pass.

Validate JSON output, at most five findings, real diff/context line anchors, permitted evidence IDs, and matching rule_key before display. Historical claims need validated sources. Preserve waived concerns in an audit area. Permit one bounded generation repair; then fail clearly. Record/recheck decision revisions and reject a review if approval context changed during generation.

Treat diffs, comments, and memory text as untrusted data. No input may change privileges or approval rules. Do not execute submitted code or fetch user-supplied URLs. Enforce Supabase membership/RLS and server-side viewer/contributor/maintainer permissions. Only maintainers can approve, revoke, reset, run evaluations, or set a simulated clock on demo runs.

## Required demonstration

Build original, visibly labelled synthetic fixtures for `democart-integrations` and invented `bridge-client`:

1. **PR-A / valid memory:** `src/adapters/legacy/status.ts`, version 1.8.0, demo time 29 September 2026. A reviewed wrapper exception applies only to `src/adapters/legacy/**`, version range `>=1.8.0 <2.0.0`, and expires at **2026-09-30T00:00:00Z**. A 2-second timeout remains required. Learn/approve/ingest it, clear client state, and show a fresh review using its actual recalled source.
2. **PR-B / scope boundary:** move to `src/adapters/new/status.ts` at the same time/version. Show the related memory as out of scope; it cannot waive the wrapper convention.
3. **PR-C / expiry:** advance the labelled demo clock to 1 October 2026 on the legacy path. Show the expired decision as history without granting the waiver.
4. **PR-D / counterexample:** remove the timeout while the wrapper exception is active. Preserve the timeout finding.
5. **PR-E / uncertainty:** omit the dependency version. Ask for context; do not assume exception eligibility.

Also enable a judge to add an unseen, non-safety convention with a reason and exact path, approve it through real reflection, wait for readiness, and observe its effect on a different input in a fresh session. This must work without editing application code. Keep fixture chronology consistent; do not insert future decisions into an earlier review state. Clock rewind requires a new run, not a machine-clock change.

## UI quality

Build a finished developer workspace with Reviews, Decisions, and Evaluation pages. Follow the PRD's light design: #F5F7FB background, white surfaces, #172B4D text, #2563EB accent, consistent spacing, readable monospace diffs, and clear typography.

At desktop widths, keep the PR rail, diff, and findings/evidence visible together; collapse appropriately on smaller screens. Include accessible keyboard controls and focus, labelled validation errors, horizontal code scrolling, and functional drawers/tabs.

The evidence card must answer: what was decided, by whom, why, applicable paths/versions, expiry, and source. Show actual stages, elapsed time, provider status, memory readiness, and the synthetic-data badge. Implement empty, invalid, loading, delayed, failed, conflict, no-memory, and no-findings states. Preserve user input after errors. No fake progress, fabricated scores, dead controls, or "safe to merge" messages.

Keep comparison in a separate view with switchable Generic, Static, and Memory results. Make memory's contribution understandable within the first 60 seconds of the demo.

## Verification and honest comparisons

Implement and run meaningful deterministic/integration tests for expiry boundaries, path/version mismatches, missing prerequisites, conflicts, supersession timing, revocation, non-waivable timeout, invalid citations/anchors, role and repository isolation, idempotent feedback, concurrent approval, revision changes during review, restart recovery, and fresh-session persistence.

Implement the 12 held-out cases on PRD page 18 and compare three modes:

- Generic: current code/context plus fixed baseline.
- Static: Generic plus frozen T0 repository guidelines.
- Memory: Static plus actual Hindsight-recalled experience validated by the decision engine.

Use the same generation model, settings, budgets, current inputs, and equivalent isolated pre-case state across modes. Keep expected answers out of prompts and frontend bundles. Do not force the baseline to perform badly. Freeze held-out cases before scoring and disclose any subsequent tuning/retesting.

Save the 36 initial outputs, failures, model/prompt versions, timestamps, source IDs, latency, and provider usage. If access/time prevents completion, distinguish completed, failed, and not-run cases. Report scoped-decision correctness, invalid waivers, unsupported citations, recall success, ingestion latency, and review latency. Finding precision requires actual human assessment; do not invent that assessment. Never manufacture improvement percentages.

Run typechecking, build, automated tests, and a browser walkthrough of the main learning loop and scope/expiry cases. Check browser errors and responsive layouts. Verify startup from documented commands. Release targets: zero invalid waivers on defined boundary tests and zero leaked or fabricated displayed sources. Disclose any unmet gate.

## Deadline execution and deliverables

Work in order: integration proof → complete learning loop → scope/expiry/timeout behavior → usable UI → verification → submission materials. Check progress against actual remaining time. Cut P1 features, decorative work, and additional integrations first. Do not silently drop P0 correctness, memory, or evidence requirements and call the product complete. If the full baseline becomes infeasible, deliver the strongest working slice and explicitly list unmet requirements.

Prepare:

- Working application, lockfile, migrations, original fixtures, `.env.example`, setup/seed/reset instructions, and health checks.
- README with the business problem, architecture diagram, exact retain/recall/reflect responsibilities, demo workflow, honest results, synthetic-data disclosure, limitations, and source acknowledgements.
- `docs/DEMO_SCRIPT.md`: a rehearsable three-minute narrative covering learning, fresh-session recall, wrong-path rejection, expiry, timeout preservation, and measured evidence; plus a short screening clip outline.
- `docs/EVALUATION.md` and actual saved run outputs, with failures visible.
- `docs/SUBMISSION_CHECKLIST.md`: verified requirements, repository/video/demo links or pending placeholders, exact cutoff/portal/content-guide status, and per-member content status.
- Article/social-post/video-script drafts using only verified implementation claims. Mark team-member names and actual contributions for human completion. Do not pretend drafts were published or videos recorded.
- A secret-free source archive if required by the confirmed upload format, excluding `.env`, credentials, dependencies, and private logs.

Use a long-running deployment target if a hosted link is required, because the persisted worker needs execution time. A local demo alone may not satisfy a remote screening portal; verify that requirement early. Prepare deployment configuration and a tested local fallback. Do not invent deployment URLs or claim a recording exists without an actual file. Capture a genuine proof recording when tools permit; otherwise leave a precise recording script and state the human action needed.

Make routine reversible implementation decisions autonomously and keep building. Ask only for indispensable missing information/access, continuing independent work in parallel with the question. Publishing posts, uploading the final submission, or creating paid resources requires my explicit authorization. Prepare concrete artifacts before any final approval request.

At completion, report what works, how to run it, what was actually tested, what remains blocked, and the exact remaining submission actions. Keep commentary concise and factual. Start now by reading the brief and proving the real integration path.
