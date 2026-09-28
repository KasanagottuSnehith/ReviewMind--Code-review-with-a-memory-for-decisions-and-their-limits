# ReviewMind submission analysis

## Sources read

- All 24 pages of `ReviewMind_Implementation_PRD.pdf` in this workspace.
- The full organizer statement, read through the browser: https://docs.google.com/document/d/1A4ezag02em823ZzYF34DiUVHUNLWI5ztm70QvWidWoQ/mobilebasic .
- Official OpenAI prompt guidance: https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra . The prompt uses concrete outcomes and acceptance evidence rather than repeating the coding agent's general tool instructions.

## What is mandatory versus chosen

The organizer requires Hindsight, documented GitHub code, a demo video, a live project demonstration, a memory explanation, and an article, social post, and video from every team member under a separate content guide. The document permits any LLM and lists code review as an example professional workflow. It does not mandate ReviewMind, Supabase, a particular frontend, or a public hosting provider; those are PRD implementation choices.

The statement's rubric is Innovation 30%, Hindsight Memory 25%, Technical Implementation 20%, User Experience 15%, and Real-world Impact 10%. This is the published general rubric; separate screening criteria have not been supplied.

The exact September 28 cutoff, submission portal, screening-stage hosting/upload format, and content-guide details were not established. The requested date comes from the user. A 21:00 IST build target in the prompt is an explicit planning assumption, not an organizer deadline.

## Why this concept is defensible

The useful product is not simply a chatbot that reads diffs. It separates an engineering decision from the conditions under which that decision was valid. This produces a compact, inspectable story: approve an exception, recall it later, reject it on another path, and reject it after expiry while preserving a mandatory reliability check.

That story supports the innovation and memory criteria, which together account for 55% of the published weighting. However, a code-review agent is already an organizer example, and the PRD acknowledges competitors that learn from feedback. Novelty must therefore be presented as this particular implementation of scope, expiry, and provenance, not invention of memory-based code review.

The practical buyer/value claim remains a hypothesis: engineering teams may spend less time repeating inappropriate review comments and reconstructing approval rationale. Synthetic tests cannot establish production incident reduction, revenue, or real-world time savings.

## Highest-risk implementation details

1. **Hindsight access and provenance:** successful retain is not sufficient. Newly approved decisions must be retrieved in a fresh request and mapped to authorized canonical sources. Test this before styling.
2. **A real learning loop:** seeded rules alone do not demonstrate learning from a new interaction. Require feedback, reflection, human approval, retention readiness, and an unseen convention test.
3. **Authority versus retrieval:** Hindsight supplies candidates; application code checks approval, scope, versions, chronology, and expiry. A stale memory must not revive a revoked exception.
4. **Suppression correctness:** matching one exception must not suppress a different mandatory concern. Missing evidence should produce a question or no waiver.
5. **Consistency:** use transactional outbox jobs, idempotent feedback, leases, and revision checks. Otherwise a demonstration may work once but fail after refresh, retries, or concurrent approval.
6. **Fair comparison:** hold the generation setup and current input constant. Compare with a static-guidelines mode as well as generic mode. Do not manufacture a weak baseline.
7. **Submission completeness:** functioning software does not replace the required video and member content. Prepare these while preserving a final recording/upload buffer.

## Deadline strategy

The PRD's 48-hour schedule cannot be reused as a fresh schedule on September 28. Replan against actual time left. Preserve this dependency order:

1. Prove provider access and the minimal persisted memory operation.
2. Complete one end-to-end UI learning loop.
3. Add the wrong-path, expiry, and non-waivable-timeout cases.
4. Verify permissions, evidence validity, recovery, and expected outputs.
5. Polish the main workspace, record genuine runs, and assemble submission materials.

Remove P1 exports, analytics, extra integrations, and decoration before narrowing core behavior. A complete narrow implementation is stronger evidence than many disconnected screens. If there is insufficient time to satisfy all P0 requirements, record the omissions; do not label a reduced slice as full PRD completion.

## What judges should see

Within one minute, make the problem and the new learned context visible. Then show a clean session using the real recalled source. The wrong-path and expiry cases demonstrate that learning is conditional; the timeout counterexample demonstrates that rejected feedback does not disable correctness checks. Finish with actual test counts and one concrete limitation.

Use the synthetic label throughout. Explain the date shift as a demo evaluation clock, since the September 29/October 1 fixtures occur after the September 28 submission date. Do not change the machine clock or imply these are real historical incidents.

## Completion evidence

The strongest submission includes working code, reproducible setup, real provider traces without secrets, resolvable source cards, browser-verified journeys, actual case-level evaluation output, and a short coherent recording. Qualification cannot be guaranteed; these are controllable quality improvements aligned with the supplied requirements.
