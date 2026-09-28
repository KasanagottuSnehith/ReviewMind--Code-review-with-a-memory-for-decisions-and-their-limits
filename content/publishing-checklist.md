# ReviewMind publishing checklist

Prepared: 28 September 2026, Asia/Kolkata. Drafts only; nothing was published, uploaded, or posted. No image was generated.

## Current publication status

**Build-progress package; not a verified live-memory success story.** The 52-test local result was independently reproduced in this content-preparation turn. External service configuration is missing. The live before/after learning proof required for the intended completed-project story is pending.

The pre-existing `docs/CONTENT_DRAFTS.md` is a short, placeholder-filled draft and was preserved unchanged. Its statements that the demonstration already shows fresh-session memory behavior are not supported by the present evidence. `content/article.md` is a separate, longer draft grounded in current implementation and verification.

## Links and personal details

- [x] User supplied this project URL: https://github.com/KasanagottuSnehith/ReviewMind--Code-review-with-a-memory-for-decisions-and-their-limits.
- [x] The URL was reachable and marked Public during inspection.
- [ ] **Publish the implementation to that repository.** The public page inspected showed one commit and only README.md; local implementation files were not visible there. This may change, so recheck immediately before publishing content. No push was performed by this task.
- [ ] Article public URL: not supplied; first comment contains `[ARTICLE_URL_PENDING_PUBLICATION]`.
- [ ] Confirm the author's name and actual personal contribution. The draft uses general project-owner voice and makes no specific module-ownership claim. Add a truthful contribution sentence after confirmation; do not infer identity or contributions from the GitHub username.
- [ ] Select the correct Code.in account in the LinkedIn mention picker for the post, and tag/link it appropriately in the article. Plain `@Code.in` in the text file is only a placeholder for an interactive mention, not proof of a functioning tag or of Code.in tool usage.

## Evidence register

| Claim or feature | Evidence inspected | Status and limit |
|---|---|---|
| 52 local tests pass | Fresh bundled-Node Vitest run: 2 files, 52 passed, exit 0; `tests/engine.test.ts`, `tests/database.test.ts` | Reproduced 28 September, about 16:12 IST. Database tests use local PGlite with an auth schema shim, not hosted Supabase. |
| Expiry, version, path, readiness, authority and conflicts | `packages/decision-engine/src/index.ts`; corresponding tests | Implemented; tested on defined synthetic objects and boundaries. |
| Timeout survives a wrapper exception | `packages/reviewer/src/index.ts`, `finalizeReview`; engine test titled `keeps timeout finding despite active wrapper exception` | Local test passes with an explicitly labelled memory test double. |
| Hindsight retain/recall/reflect adapter | `packages/memory/src/index.ts`, `MemoryAdapter` | Real SDK call sites and source validation exist. Live execution not verified. |
| Feedback → reflection → approval → retention routing | `apps/api/src/app.ts`, `apps/api/src/worker.ts`, migration | Implemented routing and worker logic; complete live flow not demonstrated. |
| Readiness probe | `apps/api/src/worker.ts`, `runMemory` | Polls operation and checks recalled event provenance in code; successful live probe not recorded. |
| Idempotency, competing approval revision, lease recovery, RLS | `tests/database.test.ts`, `supabase/migrations/001_reviewmind.sql` | Covered by local PGlite tests; no hosted deployment security certification. |
| React diff, feedback and decision UI | `apps/web/src/App.tsx` | Present in source. No browser walkthrough performed in this content task. |
| Prior build/startup/audit | `docs/evidence/local-verification.json` at `2026-09-28T16:10:00+05:30` | Recorded as passed previously; not rerun here. No browser pass in that record. |
| Real-provider proof | `docs/evidence/integration.json`, `2026-09-28T05:18:15.553Z` | `blocked`, `CONFIGURATION_MISSING`, empty completed-step list. |
| Current configuration presence | Fresh `scripts/check-config.ts` run via bundled Node/tsx | Database false, memory false, generation false; migration access and seed password false. No secret values inspected or emitted. |
| 36 generation comparisons, quality/latency improvement | `docs/EVALUATION.md`, server-only evaluation manifest | Not run; no measured model improvement or live before/after claim is permitted. |

The initial `npm test` attempt used the system runtime and failed at startup because `node:util` lacked `styleText`. Running Vitest directly with the documented bundled Node runtime succeeded. That initial environment error was not a failing product test. Use the project's required Node version when reproducing results.

Reproduction used:

```powershell
& 'C:\Users\snehi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\vitest\vitest.mjs run
& 'C:\Users\snehi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --import tsx scripts\check-config.ts
```

The original provider report was preserved; no new provider-proof command was run because current configuration is absent.

## Copy checks

- [x] English draft; one concrete technical through-line.
- [x] Title includes Hindsight and is no more than 10 words.
- [x] Public-facing article and post do not contain the guide's forbidden event term.
- [x] Main post includes the exact user-supplied project URL, including its final period.
- [x] Hook's first two lines contain no links or hashtags.
- [x] Three technical takeaways; Hindsight's intended role is stated.
- [x] Four relevant hashtags appear only on the final line.
- [x] First comment includes slots for both the article URL and Hindsight repository.
- [x] Article includes three exact code excerpts and the three required Hindsight/Vectorize links.
- [ ] Actual Hindsight-driven before/after result: **pending**. Local decision-state transitions are labelled as local tests and do not replace this proof.
- [ ] Genuine screenshots/diagram assets: **pending**. A visual brief and conceptual Mermaid source are provided; no image is attached yet.
- [ ] Remove the article's asset-placeholder comments after adding genuine assets. They are editorial markers, not image files.
- [ ] Review the text in the author's voice and confirm personal contribution.
- [ ] Render headings, links and code snippets correctly in the chosen article platform.
- [ ] Recount the post after any edits or mention insertion; keep the final text under 800 characters.

Automated text counts and source-excerpt checks are recorded in `content/content-verification.json` after generation. The counted post includes its actual project URL and plain-text `@Code.in` mention. Counts exclude only the terminal newline used to store the text file. Platform mention rendering may change the final text length.

Verified counts: **626 post characters**, **1,238 article words excluding code/editorial comments**, **1,273 article words including code but excluding editorial comments**, **7 title words**, and **3 code excerpts matching the actual source**. The post and article contain no occurrence of the forbidden event term. All three required article links are present.

## Publication sequence — human actions, not authorization to post

1. Confirm name/contributions and fix the public source repository's missing implementation.
2. Decide whether to publish an explicitly honest progress article now or wait for the live memory proof. Do not describe the pending run as completed to fit the guide's aspirational wording.
3. Add genuine visuals and review `content/article.md`. Publish it to a public, linkable article URL. LinkedIn Articles is allowed; a standard LinkedIn post is a different deliverable. A shared Drive document does not replace the public article.
4. Insert the real article URL into `content/linkedin-first-comment.txt`.
5. Copy `content/linkedin-post.txt`, select the correct Code.in mention, attach the genuine visual, and check the exact count again.
6. Publish the post and immediately add the first comment containing both article and Hindsight links.
7. Check the article, post, comments and GitHub link as a signed-out viewer; save the resulting public URLs for submission.

## Remaining content-guide obligations

- Each member publishes their own English article and social post. Cover actual individual contributions or a distinct technical angle.
- Article draft target is 1,200–1,500 words, within the overlap of the guide's inconsistent 800–1,500 and 1,200–2,000 instructions.
- The guide requests sharing the article as a link post in one of r/llmdevs, r/sideproject, r/aiagents, or r/aimemory. Check community rules before posting. Nothing was posted to Reddit.
- The guide specifies one 2–5 minute video per team, minimum 1080p, publicly posted on YouTube. The earlier general problem statement described videos from every member. Confirm that discrepancy with organizers; do not infer that one requirement cancels the other.
- No article, LinkedIn post, video, or external submission is marked complete merely because a draft exists.

## Sources

- Supplied 12-page `Hackathon Content Guide.pdf`, read fully in this conversation and visually checked on the relevant requirements pages.
- Actual local code, tests and saved evidence listed above.
- User-supplied public GitHub repository, inspected during preparation.
- Official pages consulted for the article's background links: https://hindsight.vectorize.io/ ; https://github.com/vectorize-io/hindsight ; https://vectorize.io/what-is-agent-memory . Vendor benchmark claims were not transferred to ReviewMind.
