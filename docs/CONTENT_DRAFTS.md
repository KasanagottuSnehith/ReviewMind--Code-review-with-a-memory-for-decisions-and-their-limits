# Submission content drafts

These are drafts. Nothing here has been published or recorded. Replace bracketed fields with verified names, contributions, links, and measured results.

## Article draft

### ReviewMind: remembering the limits of an engineering exception

Code review discussions often end with “we approved this before.” The difficult part is recovering why it was approved, where that reason applied, and whether it is still current.

We built ReviewMind for that narrow problem. It reviews small TypeScript changes and recalls engineering decisions through Hindsight. Each recalled fact is mapped to an immutable source event in Supabase. Application code then checks the decision’s approval status, path glob, dependency version, effective date, exclusive expiry, prerequisites, revocation, conflicts, and explicit supersession. The language model explains the evidence; it does not grant exceptions.

Our synthetic demonstration uses an invented `bridge-client`. A temporary wrapper exception applies only to legacy adapters on a defined 1.x version range and expires at a fixed UTC boundary. A separate explicit-timeout requirement remains non-waivable. The demo shows the exception apply in a fresh session, fail on a new path, expire after the deadline, and preserve the timeout finding.

Hindsight is central to the learning loop. We retain reasoned feedback, use Reflect to produce a reviewable draft, retain the approved version, wait for ingestion and targeted recall visibility, and then retrieve it from a fresh request. Supabase remains the canonical ledger for authority and history.

The current verified local build has [TEST COUNT] automated tests passing and a reproducible production build. Live provider and evaluation results must be inserted from saved runs before publication. The fixtures are synthetic and do not prove production reliability or business impact.

Built by [MEMBER NAME]. Actual contribution: [CONTRIBUTION]. Repository: [URL]. Demo: [URL].

## Social post draft

Teams often remember that an exception was approved, but lose **why, where, and until when**.

We built ReviewMind: a code reviewer that uses Hindsight to recall engineering decisions, then checks their path, dependency version, approval, prerequisites, and expiry before they can affect a review.

Our synthetic demo shows one temporary legacy exception:

- applied in a fresh session with its real source,
- rejected on the wrong path,
- rejected after expiry,
- unable to suppress a fixed timeout requirement.

Verified result: [INSERT SAVED TEST/EVALUATION RESULT].

Built by [MEMBER NAME], who contributed [ACTUAL CONTRIBUTION].

[REPOSITORY] [DEMO VIDEO] [REQUIRED TAGS FROM CONTENT GUIDE]

## Member video script

“I’m [NAME], and I worked on [ACTUAL CONTRIBUTION]. ReviewMind addresses a problem engineering teams know well: an old approval is remembered, but its reason and limits are not.

Hindsight retains feedback and approved decision versions, recalls relevant history, and reflects selected feedback into a draft. Our server validates the recalled source against Supabase and checks scope, dependency version, time, and authority deterministically.

In this synthetic example, a legacy wrapper exception applies today on one path, but not on a new path and not after expiry. It also cannot suppress the mandatory timeout check.

We verified [INSERT ONLY SAVED RESULT]. The current limitation is [VERIFIED LIMITATION]. You can see the code at [URL] and the live or recorded demo at [URL].”

## Claim check before publication

- Replace every bracketed field.
- Use only results present in saved evidence.
- Say “synthetic cases,” not “customers” or “production incidents.”
- Do not claim ReviewMind is the first AI reviewer with memory.
- Add exact required tags, platforms, lengths, and disclosure language from the still-unconfirmed content guide.
