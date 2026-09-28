# Thessis analytics rollout

## Account and scope

- Project: 632627, US Cloud, owned by the signed-in Thessis organization.
- [Thessis Overview](https://us.posthog.com/project/632627/dashboard/2143351).
- No-card Free plan verified 2026-09-28: 1 million product analytics events per monthly billing cycle. Collection stops at the provider's free limit. No paid products, imports, invitations, or management API keys were added.
- Event-only first release. Recordings, heatmaps, autocapture, automatic error collection, flags and experiments are OFF. Native apps and backend outcome delivery are outside this release.

## Architecture

`AnalyticsLifecycle` owns route tracking. Components explicitly emit approved actions through `productAnalytics`. Runtime allowlists in `analyticsPrivacy` reject arbitrary properties and event names. Only analytics consent in `gdpr_preferences` enables collection. The policy applies to every visitor.

The first release uses PostHog's event ingestion endpoint directly, rather than starting the existing JavaScript SDK. This keeps the transport small and auditable: no enrichment with raw URLs, remote settings, DOM capture, retry/offline queues or unload beacons. Consent withdrawal aborts pending fetches and clears analytics storage. Already dispatched events cannot be recalled. Introducing an SDK for replay or flags requires separate shutdown and privacy tests.

Analytics never awaits delivery in a business transaction. Requests time out after five seconds, and delivery failures are discarded. This intentionally favors privacy and site availability over exhaustive collection. Events can be missed due to blockers, network failure or closing the page; the database remains authoritative. Client events can be forged and grant no privileges.

Identity is a random browser UUID before login and the current account UUID after verified authentication. `$identify` links anonymous activity. Logout or switching accounts resets the anonymous identity and session. No name, email, counterpart ID, resume, message, search text, token, raw error, or signed URL is transmitted. IP/geolocation enrichment is disabled, although the network provider necessarily handles connection metadata.

Page paths are allowlisted and dynamic IDs normalized. Query strings and fragments are never sent. Campaign source/medium/content accept fixed enums; campaign names require an explicit `VITE_ANALYTICS_CAMPAIGNS` registry. Unknown data is dropped. First/latest consented attribution expires after 30 days. Browser identity lasts until withdrawal/clearing; sessions expire after 30 minutes of inactivity. Signup attempt markers allow up to seven days in the same tab; other auth attempts last 30 minutes. A closed tab cannot resume that analytics attempt.

Legacy Google Analytics startup, automatic PostHog startup, raw attribution storage and old local interaction collection were retired. Historical GA data and the existing operational admin dashboard are preserved.

## Configuration

Production Vercel project: `tanktide` in `ganesh-gowda-venugopals-projects`.

| Variable | Production |
| --- | --- |
| `VITE_ANALYTICS_ENABLED` | `true` to enable the consent gate; default is off |
| `VITE_PUBLIC_POSTHOG_KEY` | Public ingestion token for project 632627; not a personal API key |
| `VITE_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` |
| `VITE_ANALYTICS_QA` | `false` |
| `VITE_ANALYTICS_CAMPAIGNS` | Optional comma-separated registered campaign codes |

Production capture requires a production build on `thessis.com` or `www.thessis.com`. Ordinary development and preview hosts send nothing. Explicit local QA may send `environment=qa` on localhost or 127.0.0.1. All business reports must require `environment=production` at every step.

### Disable tracking

Set `VITE_ANALYTICS_ENABLED=false` in Vercel Production and redeploy this version. This is a build-time setting. Existing open tabs retain their old build until reload; changing consent stops that visitor immediately. Do not roll back to a release containing the former unconditional GA/SDK loaders merely to disable analytics.

## Measurements

- Page visits and selected landing sections (50% visible for one continuous second), fixed CTA placements.
- Email login/signup, Google/LinkedIn OAuth and recovery attempts. Auth restoration is not a fresh login. OAuth is reported separately because a callback alone cannot prove a newly created account.
- Onboarding step progression and saved/partially skipped completion; generic profile save outcomes.
- Submitted job searches and filters; explicitly opened job details.
- Applications: form opened, resume uploaded, application save acknowledged. A random flow ID correlates one open form with its upload and submission. Duplicate logical completions are suppressed in the current page lifecycle.
- Referrals: first form focus, mobile step advancement, new posting created versus own existing posting reused. Failure joining a newly created posting emits an additional failure, while the created posting still counts as created.
- Applicant review opened, confirmed status changes, ranking requested and complete/partial results.
- Notification actions, conversation opened, persisted message sends, saved connection requests and accepted/declined responses.
- People search results count bucket only. Selected failures use fixed categories.

This is the core event contract, not a promise that every control on every page is instrumented. Secondary save/delete/pagination controls and full automatic error reporting remain future reviewed additions. See `analyticsPrivacy.ts` for the canonical allowlist and call sites for events currently emitted. Some reserved event/property labels are not used yet.

Main funnels count unique users unless their title explicitly says attempts. User funnels can span separate attempts within the configured window. Email signup and applications use seven-day conversion windows; new referral publishing uses fourteen days; landing-to-CTA uses thirty minutes. Recent cohorts have not had the full conversion window. A drop-off indicates where completion stopped, not why. Counts cover consenting, observed visitors and cannot establish the number of all humans visiting the site.

## Verification recorded

- 10 automated privacy/consent/identity tests pass (`npm run test:analytics --workspace web`). Covers denied/default-off/preview modes, route and property sanitation, deduplication, account switching, cross-tab withdrawal, pending-request cancellation, campaign allowlists and failing preference storage.
- Synthetic browser harness: zero requests while denied; 17 requests accepted by PostHog (HTTP 200) after consent; no additional requests after withdrawal despite further actions. Duplicate auth/application completion callbacks were suppressed. Test records use `environment=qa` and synthetic UUIDs only; no application data was created.
- Actual local landing, login navigation and cookie settings render without analytics consent.
- Production build and lint pass. Lint has pre-existing warnings. TypeScript check has existing errors; comparison against the same dependency installation showed no added diagnostics (baseline 153, current 148 before final documentation changes).
- No business UI classes/layouts or backend routes/database policies changed. Only consent/policy copy is visibly updated.

These checks do not constitute a fresh exhaustive end-to-end verification of every business journey or provider OAuth flow. Event ingestion and counting were tested separately from actual database transactions. Continue observing real consenting traffic after release before treating low-volume funnels as conclusions.

## Retention and data requests

Current Free-plan event retention is one year. Recording is disabled. Browser withdrawal does not delete prior PostHog events.

For a verified access/deletion request, an authorized owner should locate the account UUID in PostHog Persons, export the person's events as appropriate, and use the product's deletion operation with associated events selected. Include linked anonymous identifiers. Follow the UI confirmation and check asynchronous completion before marking the request fulfilled. Document the result in the existing data-request workflow without copying raw analytics into public tickets. The website's existing request form remains the intake; no automated PostHog deletion API was added.

Anonymous visitors whose browser identity was cleared cannot reliably be matched to an account by guessing. Do not attempt identity reconstruction. Do not place PostHog personal keys in the frontend.

## Later gates

Review usage at 70% of the free allowance. Never add a payment card to raise limits without explicit authorization. Recordings require a separately verified masking/route-exclusion implementation. Experiments require stable exposure assignment, a tested default, a declared metric/window, and enough baseline traffic; one week alone does not guarantee enough users. No experiment is currently running.
