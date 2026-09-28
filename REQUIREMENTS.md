# ReviewMind requirements and evidence

Baseline: all 24 pages of `ReviewMind_Implementation_PRD.pdf` plus the supplied organizer statement. Organizer obligations override product choices. “Local passed” excludes live Supabase/Hindsight/model proof.

| Requirement | Authority | Implementation / evidence | Status |
|---|---|---|---|
| Hindsight is central; persistent learning | Organizer | Real retain/recall/reflect adapter, readiness probe, fresh-session UI; `npm run integration` | Implemented / blocked by configuration |
| Documented GitHub repository | Organizer | README, clean source, lockfile | Prepared / URL pending |
| Demo video, live demo, memory explanation | Organizer | README and `docs/DEMO_SCRIPT.md` | Explanation prepared / demo and video pending |
| Article, post, video per member | Organizer | `docs/CONTENT_DRAFTS.md` | Drafted / human details and publication pending |
| Exact cutoff, portal, content guide | Organizer confirmation | Asked once; internal 21:00 IST target only | Unconfirmed |
| FR-01 bounded diff/context | PRD P0 | Unified diff parser, byte/file/line/path/binary validation | Implemented / local tests passed |
| FR-02 bounded validated review | PRD P0 | JSON Schema, max five, anchor/source/rule validation, one repair | Implemented / local tests passed; live model not run |
| FR-03 real recall and source validation | PRD P0 | Hindsight facts/source facts → document IDs → canonical events | Implemented / live integration blocked |
| FR-04 deterministic scope | PRD P0 | Glob, semver, effective/expiry, status, prerequisites, conflict/supersession | Implemented / local tests passed |
| FR-05 reasoned idempotent feedback | PRD P0 | Transactional `record_feedback`, immutable event, unique key/payload hash | Implemented / local PostgreSQL tests passed |
| FR-06 real reflection drafts | PRD P0 | Structured Hindsight Reflect with fact-source verification, no auto-approval | Implemented / live integration blocked |
| FR-07 approve and retain | PRD P0 | Maintainer transaction, version/event/outbox/revision, readiness | Implemented / local transaction tests passed; provider blocked |
| FR-08 immutable history/supersession | PRD P0 | Append-only event trigger, immutable approvals, same-scope successor logic | Implemented / local tests passed |
| FR-09 fresh-session persistence | PRD P0 | Clear-client control and server/Hindsight recall | Implemented / live proof blocked |
| FR-10 honest three-mode evaluation | PRD P0 | Isolated repositories/banks; frozen 12 × 3 manifest and saved metadata | Implemented / generations not run |
| FR-11 membership and roles | PRD P0 | Supabase Auth, RLS, server membership checks, privileged RPC revocation | Implemented / local RLS and role tests passed; live Auth blocked |
| FR-12 recoverable dependency failures | PRD P0 | Persisted leases/tokens, restart reclaim, three attempts, retry/failure UI | Implemented / local recovery tests passed |
| Non-waivable timeout and unknown patterns | PRD P0 | Documented fixture-scoped TypeScript AST check | Implemented / local tests passed |
| Reviews, Decisions, Evaluation UX | PRD P0 | Responsive three-page workspace, keyboard focus, drawers/tabs/states | Implemented / build passed; visual browser QA not run |
| One process; secure config; startup | PRD P0 | Production Express serves API, worker, React; Docker; `.env.example` | Implemented / local startup passed |
| Original PR-A–E, unseen convention, clock, reset | PRD P0 | Fixtures and UI flow, forward clock, new bank/run reset | Implemented / local boundaries tested; live workflow not run |
| Zero invalid waivers on boundary cases | Release gate | Deterministic tests and provider evaluation | Local boundaries passed / provider evaluation not run |
| Zero leaked/fabricated displayed sources | Release gate | Canonical source/anchor validation and local tests | Local validator passed / live evaluation not run |

No P1 work was added. No existing code, live integration, recorded video, published content, deployment, performance result, or qualification is claimed without saved evidence.
