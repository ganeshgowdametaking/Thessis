-- gdpr_audit_logs has RLS enabled but no INSERT policy, so its own audit
-- trigger fails every time a user saves cookie consent.
--
-- Root cause: gdprService.saveConsentToDatabase (web/src/services/gdprService.ts)
-- upserts into gdpr_consents, which has an AFTER INSERT/UPDATE/DELETE trigger
-- (log_consent_change, defined in 20250616171600_hidden_poetry.sql) that
-- writes an entry into gdpr_audit_logs. That function has no SECURITY
-- DEFINER, so it runs as the calling user (SECURITY INVOKER, the default) —
-- its own insert into gdpr_audit_logs is therefore subject to RLS exactly
-- like a direct client insert would be, and gdpr_audit_logs was left with
-- RLS enabled but no policy at all, so every insert is rejected. This
-- rejection happens inside the same transaction as the gdpr_consents write,
-- so the whole consent save fails — confirmed via the chaos-crawler QA
-- report: "new row violates row-level security policy for table
-- gdpr_audit_logs" on every authenticated page.
--
-- gdprService only ever calls saveConsentToDatabase for a logged-in user
-- (anonymous visitors' consent stays in localStorage only and never reaches
-- the database), so this only needs to cover `authenticated`.

DROP POLICY IF EXISTS "Users can insert their own audit log entries" ON public.gdpr_audit_logs;

CREATE POLICY "Users can insert their own audit log entries"
  ON public.gdpr_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
