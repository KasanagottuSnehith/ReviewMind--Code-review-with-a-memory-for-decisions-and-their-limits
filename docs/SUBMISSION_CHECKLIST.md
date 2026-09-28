# Submission checklist

## Organizer requirements

- [ ] GitHub repository URL: **pending**
- [ ] Demo video URL and playback check: **pending**
- [ ] Live project demonstration URL or confirmed local-demo procedure: **hosting requirement unconfirmed**
- [x] Hindsight memory explanation: README and demo script prepared
- [ ] Article from each member: drafts prepared; names/contributions/publication pending
- [ ] Social post from each member: draft prepared; names/contributions/publication pending
- [ ] Video from each member: script prepared; names/contributions/recording pending
- [ ] Exact cutoff and timezone: **unconfirmed**
- [ ] Submission portal: **unconfirmed**
- [ ] Official content-guide link and its platform/tag/length rules: **unconfirmed**

The internal 21:00 IST target is a planning assumption, not an official organizer deadline.

## Technical package

- [x] Source, lockfile, original fixtures, migration, `.env.example`
- [x] Single-process production build and Docker configuration
- [x] Setup, seed, reset, health, demo, and evaluation documentation
- [x] 52 automated local tests passing
- [x] Production build and HTTP startup verified
- [x] `npm audit`: zero known vulnerabilities
- [ ] Supabase authentication/persistence live proof
- [ ] Hindsight retain/recall/reflect/readiness live proof
- [ ] Structured generation live proof
- [ ] 36 saved evaluation outputs
- [ ] Browser console and responsive visual walkthrough
- [ ] Genuine demo recording
- [ ] Public deployment, if required

## Before upload

- Run `npm ci`, `npm test`, `npm run build`, and `npm run integration` from a clean checkout.
- Verify `.env`, keys, private logs, `node_modules`, test artifacts, and local account data are absent from the archive.
- Replay the video and verify every submitted link in a signed-out browser.
- Replace every pending placeholder with an actual URL or an explicit “not required” confirmed from the organizer.
- Record team-member names and actual contributions; do not use proposed roles as completed contributions.
- Publish or upload only after the user’s explicit authorization.
