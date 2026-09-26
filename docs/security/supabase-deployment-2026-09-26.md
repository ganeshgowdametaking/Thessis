# Supabase security deployment — 26 September 2026

Project: `fvprdknorvuqggwxfqly` (Thessis project, production).

## Database deployment

Applied in one transaction after a successful rollback-only rehearsal, with a
5-second lock timeout and a 60-second statement timeout. Each applied SQL file
was recorded in `supabase_migrations.schema_migrations`:

- `20250101000000_bootstrap_profiles.sql`
- `20260925000000_prepare_security_upgrade.sql`
- `20260925010000_secure_admin_access.sql`
- `20260925110000_authorize_resume_ranking.sql`
- `20260925120000_private_resume_storage.sql`
- `20260925130000_secure_referrer_pool_and_work_email_codes.sql`

The live schema lacked `profiles.work_email_verified_at` and
`admin_invites.updated_at`. The new preparation migration adds these columns
idempotently before the security functions and trigger use them.

The existing migration history ended in July 2025 even though newer schema
objects were present. Historical migrations were not blindly replayed or marked
as applied. Only the six executed migrations were registered; older history
reconciliation remains outside this deployment.

The resume bucket was already private, but its broad public SELECT policy still
existed. That policy is now removed. Unused legacy admin invitations and pending
work-email codes were expired by the security migrations.

## Edge Functions

Deployed the repository versions of:

- `get-application-resume-url` (new)
- `send-admin-invite` (updated)
- `accept-admin-invite` (updated)

The gateway JWT verification setting remains enabled. The functions also verify
the user with Supabase Auth and enforce their own authorization rules. Existing
Mailgun and frontend URL configuration entries were present and preserved.

## Verification

- All six migration versions are recorded in the production migration table.
- Profile RLS remains enabled and the privilege-protection trigger is active.
- A regular authenticated account cannot change its role or verification flag.
- An ordinary profile update still succeeds.
- Anonymous users cannot read resumes, and authenticated users cannot read
  another user's resume objects.
- Using an existing application, the ranking RPC returns inputs for the job
  owner and denies an unrelated actor.
- Ranking, invitation acceptance, and internal verification-code RPCs are not
  callable directly by browser roles; obsolete ranking overloads are removed.
- All three Edge Functions returned 401 for missing authorization and for an
  anonymous API token. Their CORS preflight requests returned 200 or 204.

Database behavior checks ran inside a transaction that was rolled back, including
the ordinary profile edit. No test invitations or verification emails were sent.
Successful email delivery, real invitation acceptance, and a full user-session
resume download were not exercised by these deployment checks.
