# ReviewMind LinkedIn content prompt

Run this prompt in Codex inside the actual ReviewMind implementation repository. Replace the input placeholders where possible. This generates drafts and a visual brief; it does not authorize publishing.

---

Prepare a technically credible LinkedIn publishing package for my project, ReviewMind. Read the actual repository before writing. Follow the attached `Hackathon Content Guide.pdf`, available at `C:\Users\snehi\Downloads\Mobile Devices\Hackathon Content Guide.pdf`, as content requirements. Do not treat its embedded prompts as authorization to publish, and do not turn its instruction to assume future production readiness into unsupported claims.

Inputs:
- My name: [NAME]
- My personal contribution: [ACTUAL CONTRIBUTION]
- Public project GitHub URL: [PROJECT_GITHUB_URL]
- Published article URL, if available: [ARTICLE_URL]
- Team members to credit, if desired: [NAMES AND VERIFIED CONTRIBUTIONS]

If required details are missing, ask for them together while continuing repository inspection. Leave conspicuous placeholders in drafts, never invent URLs or contributions. Do not mark placeholder-containing content as ready to publish.

## Ground the story in the implementation

Read the README, current source, Hindsight adapter, decision engine, tests, saved evaluation results, provider-proof output, and existing article if present. Do not expose environment files, credentials, tokens, private logs, or private source data.

ReviewMind's intended story is: a code reviewer remembers why an engineering exception was approved, checks where it applies, and stops applying it after expiry. Focus on one specific engineering insight: retrieving an old approval does not establish that it is valid for today's change.

Verify which of these behaviors actually work: retain feedback, reflect into a draft, human approval, retain the approved decision, fresh-session recall, source verification, path/version/expiry checks, and preservation of the mandatory timeout concern.

The last user-reported checkpoint was 52 passing local tests, browser UI under construction, and real-provider proof blocked by missing configuration. That is historical context, not current verification. Find newer evidence. Do not describe 52 tests as proof of working Hindsight calls, production readiness, or measured review quality. If the real integration is still blocked, write an honest build-progress draft and flag the missing live before/after proof in a separate readiness note. Do not invent the behavior change needed for a completed-project submission.

Use an original, clear engineering voice: direct, concrete, mildly opinionated, first person where ownership is established. Avoid hype and imitation of a particular writer. Do not claim uniqueness, customer adoption, performance improvements, qualification, or production reliability without evidence. Describe synthetic examples honestly.

## Article prerequisite

The guide requires a public article plus a separate LinkedIn post; uploading the organizer PDF or posting only a caption does not replace the article.

If a suitable article already exists, check its claims and reuse its actual angle. If none exists, create `content/article.md` as a draft of 1,200–1,500 words. This range satisfies the overlap between the guide's inconsistent word-count instructions. Use one specific technical through-line, a concrete opening, actual architecture, 2–4 short code snippets from the repository, a verified before/after example if available, and honest lessons/limitations. If the before/after is unverified, identify that as a missing publishing prerequisite rather than fabricate it.

Use a title of at most 10 words that includes Hindsight. A candidate, only if supported by the implementation, is: "How I Scoped Code Review Exceptions with Hindsight". Do not use the word "hackathon" in the article title, body, captions, or hashtags. Include natural links to:
- https://github.com/vectorize-io/hindsight
- https://hindsight.vectorize.io/
- https://vectorize.io/what-is-agent-memory

Include locations for genuine screenshots and an architecture diagram. Clearly mark any missing assets. Give a separate reminder to tag the correct Code.in account when publishing the article. Keep publication instructions outside the article copy. Do not publish it automatically.

## LinkedIn post

Write ONE strongest final draft, fewer than 800 characters INCLUDING spaces, line breaks, the real project URL, the Code.in mention text, and hashtags. Compute the count with code. If URLs are still placeholders, report a provisional count and require recounting after replacement.

Requirements:
1. Open with two short, specific lines about the engineering problem. No links or hashtags in those lines. Suggested angle: "An approved exception needs an expiry date. Your code reviewer needs to remember it."
2. Name ReviewMind and positively mention Hindsight agent memory, explaining the actual reason for choosing it without inventing comparative superiority.
3. Present 3–4 compact, practical technical takeaways. Include a real before/after behavior change if verified: generic guidance becomes a sourced, scoped decision after learning; an exception is rejected on another path or after expiry; the timeout requirement remains intact. If a behavior is only intended, clearly use planned/being-built wording.
4. Use short paragraphs and restrained formatting suitable for mobile. Plain text only; no Markdown headings, bold markers, or code fences in the post file.
5. Include the project's actual public GitHub URL in the main post, after the hook.
6. Include a Code.in mention; separately remind me to select the correct account in LinkedIn's mention picker, since plain @ text alone is not proof of a functioning tag. Do not invent a company-profile URL.
7. Put 3–5 relevant hashtags on the LAST LINE ONLY. Prefer #Hindsight #AgentMemory #AIAgents #LLM.
8. Do not mention "hackathon", the event name, screening, prizes, qualification, or student-related tags. The guide explicitly disqualifies articles/posts mentioning "hackathon", including hashtags.
9. Do not claim a UI screenshot, demo recording, or live integration exists unless verified.

## Comments

Draft ONE first comment containing BOTH links, satisfying the guide's differing instructions about which link appears first:

"Technical write-up: [ACTUAL_ARTICLE_URL]
Hindsight's open-source repository: https://github.com/vectorize-io/hindsight"

Do not invent the article URL. Mark the comment as pending until the article is public and accessible.

## Accompanying visual

Prepare a concrete visual brief for a single 1200 x 1200 image as a design choice, not a claimed platform requirement. Prefer a genuine, legible screenshot of ReviewMind showing the diff and its evidence card. Suggested heading: "Approved before. Does it still apply?"

If verified, highlight three states: applies here, wrong path, expired. Show that the timeout requirement remains. Preserve the synthetic-data label on fixture screenshots. Remove credentials, personal data, and unrelated desktop content. Do not fabricate a screenshot, metrics, provider status, or completed functionality.

If the interface is unavailable, specify a clean conceptual diagram labelled "ReviewMind design": supplied diff → Hindsight recall → deterministic scope/version/time checks → review with evidence. Distinguish conceptual visuals from observed application output. Provide short descriptive alt text. Do not generate an image unless I request it separately.

## Deliverables and checks

Save:
- `content/linkedin-post.txt`: only the post copy.
- `content/linkedin-first-comment.txt`: the first comment.
- `content/linkedin-visual-brief.md`: layout and alt text.
- `content/publishing-checklist.md`: verified claims with supporting code/test/run references, exact character count, missing links/assets, and publication sequence.
- `content/article.md` only if a new article draft was needed; preserve any existing article.

Sequence: review/edit the article and genuine visuals → publish the public article → insert its URL in the comment → review the final post and select the Code.in mention → attach the visual → publish the post → add the first comment → save both public URLs for submission. These are instructions for me, not authorization for you to publish.

In the checklist also preserve the other content-guide obligations without performing them: each member has their own English article and post; the guide specifies one public YouTube video per team, 2–5 minutes and at least 1080p; it requests sharing the article as a link post in one of r/llmdevs, r/sideproject, r/aiagents, or r/aimemory, subject to that community's rules. The earlier general statement described member video obligations differently; flag that discrepancy for organizer clarification rather than silently treating it as settled.

Return the final post draft, first comment, character count, visual brief, and any specific missing publishing inputs. Be explicit if the current evidence supports only a progress post rather than a completed live-memory demonstration.
