# Security repair release — 26 September 2026

## Release state

The fixes are implemented and tested locally. These migrations have **not yet
been applied to the production project**. Production deployment, a real backup,
and the browser acceptance checks below remain pending. No paid service or
Supabase plan upgrade is required for these changes.

## Included changes

| Reported problem | Repair |
| --- | --- |
| Arbitrary anonymous email | Revoke client execution of the general mail helper; trusted database events retain it. |
| Exposed OTP records | Remove anonymous/member table grants and enable row security. |
| Public chat attachments | Private bucket, participant access rules, five-minute signed links and refresh. |
| Message/notification tampering | Restrict mutable columns; create notifications from database events. |
| Self-accepted connections | Only the recipient may accept a pending request; reject pre-accepted inserts. |
| Employee exposed before referral | Safe job/application views omit employee identifiers; private base-table reads are restricted. |
| Employee verification bypass | Enforce confirmed work verification and exact approved employer domains in the database. |
| Applications created as already referred | Submission RPC derives caller, resume ownership and initial pending state. |
| Connection notification crash | Request and notification now commit in one database transaction. |
| Applicants after row 20 unreachable | Review fetches all pages from an authorized, ordered RPC. |
| Removal only changes the screen | Authorized delete RPC, checked result and persistent deletion. |
| Data request form does nothing | Save a private request, return its reference and notify administrators. |
| Word files cannot be ranked | Accept PDF resumes only; enforce type/size bounds in upload and both rankers. |
| Free-plan recovery gap | Local encrypted database and Storage backup tool, with authenticated integrity checks and restore instructions. |

An applicant's **Message referrer** action resolves the employee on the server
only after that applicant's application is marked referred. A normal member may
still browse professional profiles; the job-to-employee relationship is hidden
before referral. Private details are excluded from the professional profile view.
Confirmed accounts with the protected administrator role retain the reads needed
by existing administrator analytics. No email-address exception is added.

Desktop layout and styles are preserved. PDF-only resume acceptance and clear
submission/error messages are deliberate behavior changes.

## Verification completed locally

- 60 database/recovery checks with synthetic accounts and records, including
  ordinary member, recipient, employee, administrator and anonymous cases.
- Nine Python tests covering ranking authorization, resource access and resume
  constraints for both ranking services.
- Encryption/decryption round trip and corrupted-archive rejection.
- Actual synthetic PostgreSQL dump, encryption, authenticated extraction and
  restore into a second database; row counts, policy counts and privacy match.
- Production Vite build succeeds; changed frontend files have no ESLint errors.
- TypeScript comparison: 175 baseline errors, 153 after this repair, with no new
  diagnostic signatures. The pre-existing type errors still require separate work.

The isolated fixture uses captured production table definitions, constraints and
permission rules, with relevant real functions and synthetic rows. It stubs email
delivery and does not reproduce every Supabase extension, trigger, Auth service,
PostgREST relationship, Storage HTTP behavior or live browser interaction.
Therefore this is not full production end-to-end sign-off.

The four migrations also passed a transaction-and-rollback dry run against the
live Supabase schema on 27 September. This identified and corrected the legacy
`data_requests` queue upgrade; no changes were committed by that dry run.

## Deployment sequence

1. Complete the private setup in [free-backups.md](free-backups.md), make a real
   database/Storage backup, and verify its archive before production changes.
   Preserve the encryption key separately. Rehearse production restoration in
   an isolated destination before calling recovery fully verified.
2. Review the live employer list against `employer_domains`. Add independently
   verified exact domains through an administrator-controlled database session.
   Existing postings whose creator lacks valid work verification will not accept
   new applications until verification is completed. Do not infer approval from
   the company's name or accept a supplied lookalike domain.
3. Build the matching frontend release. Stage it before changing database access;
   old browser bundles still query the private base tables.
4. In a transaction, dry-run **only** these four new migrations, inspect the
   resulting permissions, and roll back:

   - `20260926010000_close_abuse_and_tampering.sql`
   - `20260926020000_employment_and_data_requests.sql`
   - `20260926030000_private_referrals_and_applications.sql`
   - `20260926040000_trusted_notifications.sql`

   Production migration history differs from repository history. Do not replay
   historical migrations or run an unreviewed blanket database push.
5. Apply the reviewed four migrations atomically, record those four versions in
   Supabase migration history, and publish the matching web/API release in the
   same maintenance window. Reload old sessions. No new Edge Function source is
   part of this repair; retain the previously secured functions and their secrets.
6. Check API grants, policies and bucket privacy using anonymous and synthetic
   signed-in accounts. Never use real users' records for tampering probes.
7. Perform the browser checks below and record the deployed commit/time. Only
   then mark the live repair complete.

If the migration transaction fails, roll it back and keep the existing release.
After a successful commit, prefer a forward fix. Redeploying the old frontend
alone is incompatible with the new read restrictions. Reopening public Storage
or restoring permissive client grants is not an acceptable routine rollback.

## Required live acceptance checks

- Sign-in, onboarding, own/private profile and other/public profile reads.
- Verify a controlled work mailbox, reject unverified posting and lookalike email.
- Create a referral; browse it as a separate applicant with no creator fields in
  responses. Apply with a PDF; reject Word/oversize uploads and crafted referred
  application inserts.
- Review at least 25 synthetic applicants, remove one, reload, and confirm it
  remains removed. Check shortlist/reject/refer transitions and resume access.
- Refer an applicant; check one legitimate notice and **Message referrer** opens
  the correct named employee. Confirm this lookup is unavailable beforehand.
- Send/accept/decline a connection; verify notifications and denied self-accept.
- Exchange text, image and PDF attachments. Confirm participant access, expired
  signed-link renewal, old public-link denial and denied unrelated access.
- Confirm received content and notification metadata cannot be altered.
- Submit a data request, copy its reference and locate the actual private row.
- Check administrator analytics, desktop appearance and mobile workflows.

## Operational follow-up

Data requests are real queued requests, not automatically completed exports or
deletions. Authorized operators should review `public.data_requests` in Supabase,
verify the request, carry out the requested action, then set `status`,
`resolved_at` and `resolution`. Administrators receive an in-app notice. The form
does not promise an email that has not been sent.

The free backup tool needs the existing database password and Storage service
key entered locally. A recurring schedule has not been activated. A local Mac
must be awake and connected when a scheduled backup runs. Keep a second secure
copy to survive loss of that Mac.

Previously reported dependency advisories, remaining type errors and any audit
findings outside this repair are still separate work; this release is not a claim
that the entire site is completely secure.
