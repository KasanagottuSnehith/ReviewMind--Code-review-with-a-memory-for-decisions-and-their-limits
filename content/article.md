# Designing Scoped Code Review Memory with Hindsight

An approval can be correct on Tuesday and wrong on Wednesday without a single line of the approved code changing. The dependency version, file path, or deadline attached to that approval may have changed instead.

That is the problem behind ReviewMind. I want a code reviewer that can recover an engineering decision and check whether its conditions still hold. Remembering that someone accepted a change is useful only if the reviewer also understands the limits of that acceptance.

The implementation combines a Hindsight memory adapter with a deterministic decision engine and a persistent approval ledger. The distinction matters: the local checks are working, while live provider verification is still blocked by missing configuration. This article describes the implemented design and its tested boundaries, not a completed live-memory result.

## Start with one exception

The repository contains an original synthetic integration called `democart-integrations`. Its invented `bridge-client` dependency normally sits behind a shared transport wrapper that adds instrumentation. One legacy adapter has a compatibility reason to bypass that wrapper temporarily.

The exception is deliberately narrow: `src/adapters/legacy/**`, dependency versions `>=1.8.0 <2.0.0`, and an expiry of `2026-09-30T00:00:00Z`. An explicit two-second request timeout remains mandatory. These are fictional conditions for exercising the implementation, not an incident from a real company.

This gives the reviewer several distinct questions. Does the approval belong to this repository? Does its path match? Is the dependency version known? Has it expired? Does the supplied code still establish the required timeout? A remembered sentence saying “the direct request was approved” cannot answer those questions by itself.

## Give memory and authority different jobs

The architecture uses React and TypeScript for the workspace, a Node API and worker for orchestration, and Supabase for authentication and the canonical ledger. Hindsight is the semantic memory component: its adapter contains retain, recall, and reflect calls. The generation provider receives current code plus validated evidence.

The [Hindsight agent memory documentation](https://hindsight.vectorize.io/) explains the operations behind that integration. In ReviewMind, retention is wired to feedback and approved decision events; recall supplies candidate history; reflection proposes a structured decision draft. A maintainer must still approve the draft.

The server resolves recalled document references against canonical events for the current repository and run. It then loads the corresponding decisions and checks their present authority. This means a related memory may be displayed as expired or out of scope rather than becoming permission to suppress a finding.

The [Hindsight open-source repository](https://github.com/vectorize-io/hindsight) is the reference for the memory component. ReviewMind's additional responsibility is enforcing the approval contract around retrieved information. The value of that separation is inspectability: each rejected candidate can carry a specific reason.

## Put expiry in code

The decision engine uses ordinary date comparisons for temporal validity. It does not ask the generation model whether an exception “probably still applies.” This line comes directly from `packages/decision-engine/src/index.ts`:

```ts
if (d.scope.expires_at && time >= Date.parse(d.scope.expires_at)) return answer('expired','The exclusive expiry boundary has passed.');
```

The boundary is exclusive. At the exact expiry timestamp, the decision no longer applies. Local tests exercise the instant immediately before expiry, the boundary itself, and a later time. They also reject a decision before its effective time.

Path matching and semantic-version checks happen in the same function. An absent version produces `needs_context`; an incompatible stable version produces `out_of_scope`. Competing applicable decisions without explicit precedence become conflicts. A future successor cannot retire its predecessor before that successor takes effect.

These rules do not establish that arbitrary code is correct. They establish when one recorded approval is eligible to influence a review. Keeping that claim small makes the tests meaningful.

## A stored decision is not necessarily retrievable

Memory ingestion introduces another boundary. The worker distinguishes a retained event from a ready event. It polls the provider operation, then performs a targeted recall looking for the expected source event. Only that confirmed visibility allows the readiness transition.

The applicability check separately enforces the distinction:

```ts
if (d.memory_status !== 'ready') return answer('pending','Retention and recall visibility are not both confirmed.');
```

This code is implemented, and the local tests reject a retained-but-not-ready decision. However, the actual provider polling and retrieval sequence still needs a configured live run. A test that supplies a ready decision object cannot prove that Hindsight has ingested or recalled anything.

The persistence design also addresses retries. Feedback uses idempotency keys; approval creates an event and a memory job transactionally. Worker leases carry tokens so an expired worker cannot complete a job after another worker has reclaimed it. Local database tests exercise those transitions using PGlite, an embedded PostgreSQL runtime, rather than a hosted Supabase connection.

## Preserve the concern that was never waived

The most useful counterexample removes the request timeout while leaving the wrapper exception active. “You may bypass this wrapper” must not become “you may remove reliability checks.”

The review finalizer keeps the fixed baseline before considering exception-based suppression. This excerpt is from `packages/reviewer/src/index.ts`:

```ts
if(f.rule_key===BASELINE_RULE) return true;
```

The corresponding local test supplies an active wrapper exception and code missing the timeout. It checks that the timeout finding remains while the wrapper concern moves into the waived audit collection. The evidence object in that test is explicitly a test double, not a live memory response.

The timeout analyzer is intentionally limited. It inspects supported TypeScript request patterns and literal options. Indirect or spread options return uncertainty; unsupported call patterns do not earn a pass. I would rather expose that uncertainty than imply that a small analyzer understands every way a request can be constructed.

## What the tests show today

A fresh local run on 28 September 2026 passed 52 tests across two files. The suite covers decision boundaries, input and output validation, timeout behavior, roles, transaction idempotency, approval revision conflicts, lease recovery, and row-level access restrictions in the local database environment.

There is a concrete, locally verified behavior change: the same decision is applicable immediately before expiry and expired at the boundary. A different path rejects it. A retained decision stays pending until its readiness state changes. Those results demonstrate the deterministic layer, not an improvement in model output after learning.

The saved provider report remains `blocked` with `CONFIGURATION_MISSING`. A current presence-only configuration check confirms that database, memory, and generation settings are absent. The planned twelve-case, three-mode evaluation has not run, and no live fresh-session recall or browser walkthrough is claimed here.

That distinction prevents a misleading headline. Fifty-two passing tests are evidence about specific local behavior; they are not fifty-two successful memory interactions, a review-accuracy score, or proof of production readiness.

## The next proof is a fresh session

The next integration milestone is to record feedback, retain it, reflect a draft, approve it, wait for retrieval readiness, and open a fresh review. That review should cite the actual recalled source and explain why the exception applies. Changing the path or advancing the labelled evaluation clock should then remove the waiver.

The planned comparison uses Generic, Static, and Memory modes with the same generation setup and current input. It must preserve failures and avoid feeding expected answers into prompts. Until those runs exist, the before-and-after benefit of learned memory remains unverified.

Vectorize's [explanation of agent memory](https://vectorize.io/what-is-agent-memory) provides background on retaining useful context across interactions. ReviewMind's specific question is what an application must check after that context returns. Persistent information can be relevant, outdated, incomplete, or unauthorized; retrieval alone does not resolve those distinctions.

The engineering lessons are practical: represent exceptions as structured records, keep sources resolvable, distinguish storage from readiness, preserve non-waivable checks, and report uncertainty explicitly. My goal is a reviewer whose memory helps explain a decision without quietly expanding the permission that decision originally granted.

<!-- ASSET PENDING: insert a clearly labelled conceptual architecture diagram, not a live application screenshot. -->
<!-- ASSET PENDING: insert a genuine screenshot of the local test result. Preserve its local-test context. -->
<!-- LIVE PROOF PENDING: add a genuine sourced before/after screenshot only after provider verification succeeds. -->
