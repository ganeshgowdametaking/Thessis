-- Transactional email system: shared ZeptoMail helper + branded template shell,
-- plus triggers for every DB-triggerable customer notification email.
--
-- Sending address for all of these is notifications@thessis.com — make sure that
-- address is verified in ZeptoMail before this goes live, or sends will fail
-- ZeptoMail-side even though the trigger itself succeeds silently (net.http_post
-- is fire-and-forget from Postgres' perspective).
--
-- Requires the zeptomail_api_token secret already created in Vault (done
-- previously — see 20260825120000_zeptomail_verification_email.sql).

-- ============================================================================
-- SHARED HELPERS
-- ============================================================================

-- Minimal HTML-escaping for any user-supplied text (names, job titles, message
-- content, etc.) interpolated into an email body — without this, a name like
-- `<script>` in a profile would inject into every email sent about that user.
CREATE OR REPLACE FUNCTION public.escape_html(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_text IS NULL THEN '' ELSE
    replace(replace(replace(replace(replace(p_text, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;'), '''', '&#39;')
  END;
$$;

-- Single choke point for outbound transactional email. All triggers below (and
-- the referral-milestone edge function, via RPC) call this instead of talking
-- to ZeptoMail directly, so there's exactly one place that knows the API shape,
-- the Vault secret name, and the sending address.
CREATE OR REPLACE FUNCTION public.send_transactional_email(
  p_to_email text,
  p_to_name text,
  p_subject text,
  p_html_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF p_to_email IS NULL OR p_to_email = '' THEN
    RETURN;
  END IF;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'zeptomail_api_token'
  LIMIT 1;

  IF v_token IS NULL THEN
    RAISE WARNING 'zeptomail_api_token secret not found in Vault — email "%" to % not sent.', p_subject, p_to_email;
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://api.zeptomail.com/v1.1/email',
    headers := jsonb_build_object(
      'Authorization', 'Zoho-enczapikey ' || v_token,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', jsonb_build_object('address', 'notifications@thessis.com', 'name', 'Thessis'),
      'to', jsonb_build_array(
        jsonb_build_object('email_address', jsonb_build_object('address', p_to_email, 'name', coalesce(p_to_name, '')))
      ),
      'subject', p_subject,
      'htmlbody', p_html_body
    )
  );
END;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default, and Supabase
-- exposes public-schema functions to the anon/authenticated API roles through
-- that same PUBLIC grant. Left unrevoked, this function would be a callable,
-- unauthenticated open relay (arbitrary to/subject/html through our real
-- ZeptoMail account) — lock it down to server-side callers only.
REVOKE EXECUTE ON FUNCTION public.send_transactional_email(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_transactional_email(text, text, text, text) TO service_role;

-- Branded wrapper every template's body HTML gets dropped into, so header,
-- footer, and colors stay consistent without copy-pasting markup per template.
-- Palette matches the site's Tailwind tokens exactly (web/tailwind.config.js):
-- accent #4353FF, page bg #F8F9FC, heading ink #1A1A2E, body #4B5563,
-- muted #6B7280, card border #E5E7EB, sunken surface #F3F4F6.
CREATE OR REPLACE FUNCTION public.render_email_shell(p_preheader text, p_body_html text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' ||
    '<body style="margin:0;padding:0;background-color:#F8F9FC;font-family:''Inter'',-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">' ||
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' || coalesce(p_preheader, '') || '</div>' ||
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">' ||
    '<table role="presentation" width="100%" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">' ||
    '<tr><td style="padding:28px 32px;border-bottom:1px solid #E5E7EB;">' ||
    '<span style="font-family:''Manrope'',''Inter'',sans-serif;font-size:20px;font-weight:800;color:#4353FF;letter-spacing:-0.02em;">Thessis</span>' ||
    '</td></tr>' ||
    '<tr><td style="padding:32px;color:#1A1A2E;font-size:15px;line-height:1.6;">' || p_body_html || '</td></tr>' ||
    '<tr><td style="padding:20px 32px;background-color:#F3F4F6;border-top:1px solid #E5E7EB;">' ||
    '<p style="margin:0;font-size:12px;color:#6B7280;">You''re receiving this email because you have a Thessis account.</p>' ||
    '</td></tr>' ||
    '</table></td></tr></table></body></html>';
$$;

-- Shared CTA button markup for template bodies.
CREATE OR REPLACE FUNCTION public.render_email_button(p_url text, p_label text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT format(
    '<a href="%s" style="display:inline-block;padding:12px 24px;background-color:#4353FF;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;margin-top:20px;">%s</a>',
    p_url, p_label
  );
$$;

-- ============================================================================
-- 1. WORK-EMAIL VERIFICATION — existing trigger, now routed through the shared
--    helper + shell instead of its own inline net.http_post + hardcoded
--    placeholder address. Behavior (which table, which trigger) is unchanged.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_verification_code_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.send_transactional_email(
    new.email,
    NULL,
    'Your Thessis Verification Code',
    public.render_email_shell(
      'Your verification code is ' || new.code,
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Verify your email</h2>' ||
        '<p style="margin:0 0 20px;color:#4b5563;">Your Thessis verification code is:</p>' ||
        '<p style="margin:0 0 20px;padding:16px 24px;background-color:#EEF2FF;border-radius:12px;text-align:center;' ||
          'font-size:32px;font-weight:800;letter-spacing:0.08em;color:#4353FF;">%s</p>' ||
        '<p style="margin:0;color:#6B7280;font-size:13px;">This code expires in 15 minutes. If you didn''t request this, you can ignore this email.</p>',
        public.escape_html(new.code)
      )
    )
  );
  RETURN new;
END;
$$;

-- ============================================================================
-- 2. WELCOME EMAIL — fires once, when a profile row is first created.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.send_transactional_email(
    new.email,
    new.full_name,
    'Welcome to Thessis',
    public.render_email_shell(
      'Welcome to Thessis — let''s find your next referral',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Welcome to Thessis, %s.</h2>' ||
        '<p style="margin:0 0 16px;color:#4b5563;">Thessis connects you with real referrals from people already inside the companies you want to work for.</p>' ||
        '<p style="margin:0 0 4px;color:#4b5563;">Start by browsing open referrals, or build out your profile so referrers can find you.</p>' ||
        '%s',
        public.escape_html(coalesce(new.full_name, 'there')),
        public.render_email_button('https://thessis.com/jobs', 'Browse Referrals')
      )
    )
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_send_welcome_email ON public.profiles;
CREATE TRIGGER on_profile_created_send_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_welcome_email();

-- ============================================================================
-- 3. PASSWORD CHANGED CONFIRMATION — not a trigger. Supabase's own auth email
--    system doesn't cover this, and there's no DB row change to hang a trigger
--    off (auth.users is managed by Supabase, not app code). Instead this is an
--    RPC the client calls right after supabase.auth.updateUser({ password })
--    succeeds. SECURITY DEFINER but self-scoped to auth.uid() — it can only
--    ever email the currently-authenticated caller, never an arbitrary user.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_password_changed_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_name text;
BEGIN
  SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.send_transactional_email(
    v_email,
    v_name,
    'Your Thessis password was changed',
    public.render_email_shell(
      'Your password was just changed',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Password changed</h2>' ||
        '<p style="margin:0 0 12px;color:#4b5563;">Hi %s, this confirms your Thessis account password was just changed.</p>' ||
        '<p style="margin:0;color:#4b5563;">If this wasn''t you, reset your password immediately and contact support.</p>',
        public.escape_html(coalesce(v_name, 'there'))
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_password_changed_email() TO authenticated;

-- ============================================================================
-- 4. CONNECTION REQUEST RECEIVED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_connection_request_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_addressee_email text;
  v_addressee_name text;
  v_requester_name text;
BEGIN
  SELECT email, full_name INTO v_addressee_email, v_addressee_name
  FROM public.profiles WHERE id = new.addressee_id;

  SELECT full_name INTO v_requester_name
  FROM public.profiles WHERE id = new.requester_id;

  PERFORM public.send_transactional_email(
    v_addressee_email,
    v_addressee_name,
    public.escape_html(coalesce(v_requester_name, 'Someone')) || ' wants to connect on Thessis',
    public.render_email_shell(
      public.escape_html(coalesce(v_requester_name, 'Someone')) || ' sent you a connection request',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">New connection request</h2>' ||
        '<p style="margin:0 0 12px;color:#4b5563;"><strong>%s</strong> wants to connect with you on Thessis.</p>' ||
        '%s',
        public.escape_html(coalesce(v_requester_name, 'Someone')),
        public.render_email_button('https://thessis.com/user/' || new.requester_id, 'View Profile')
      )
    )
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_requested_send_email ON public.connections;
CREATE TRIGGER on_connection_requested_send_email
  AFTER INSERT ON public.connections
  FOR EACH ROW
  WHEN (new.status = 'pending')
  EXECUTE FUNCTION public.handle_connection_request_email();

-- ============================================================================
-- 5. CONNECTION REQUEST ACCEPTED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_connection_accepted_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requester_email text;
  v_requester_name text;
  v_addressee_name text;
BEGIN
  SELECT email, full_name INTO v_requester_email, v_requester_name
  FROM public.profiles WHERE id = new.requester_id;

  SELECT full_name INTO v_addressee_name
  FROM public.profiles WHERE id = new.addressee_id;

  PERFORM public.send_transactional_email(
    v_requester_email,
    v_requester_name,
    public.escape_html(coalesce(v_addressee_name, 'Someone')) || ' accepted your connection request',
    public.render_email_shell(
      public.escape_html(coalesce(v_addressee_name, 'Someone')) || ' is now one of your connections',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Connection accepted</h2>' ||
        '<p style="margin:0 0 12px;color:#4b5563;"><strong>%s</strong> accepted your connection request.</p>' ||
        '%s',
        public.escape_html(coalesce(v_addressee_name, 'Someone')),
        public.render_email_button('https://thessis.com/user/' || new.addressee_id, 'View Profile')
      )
    )
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_connection_accepted_send_email ON public.connections;
CREATE TRIGGER on_connection_accepted_send_email
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  WHEN (old.status = 'pending' AND new.status = 'accepted')
  EXECUTE FUNCTION public.handle_connection_accepted_email();

-- ============================================================================
-- 6. APPLICATION RECEIVED CONFIRMATION — to the applicant, right after they apply.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_application_received_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applicant_email text;
  v_applicant_name text;
  v_job_title text;
  v_job_company text;
BEGIN
  SELECT email, full_name INTO v_applicant_email, v_applicant_name
  FROM public.profiles WHERE id = new.applicant_id;

  SELECT title, company INTO v_job_title, v_job_company
  FROM public.jobs WHERE id = new.job_id;

  PERFORM public.send_transactional_email(
    v_applicant_email,
    v_applicant_name,
    'Your application for ' || coalesce(v_job_title, 'a role on Thessis') || ' was received',
    public.render_email_shell(
      'Your application is in',
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Application received</h2>' ||
        '<p style="margin:0 0 12px;color:#4b5563;">Your application for <strong>%s</strong> at <strong>%s</strong> has been submitted.</p>' ||
        '<p style="margin:0;color:#4b5563;">We''ll email you as soon as there''s an update.</p>',
        public.escape_html(coalesce(v_job_title, 'this role')),
        public.escape_html(coalesce(v_job_company, 'the company'))
      )
    )
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_application_created_send_email ON public.applications;
CREATE TRIGGER on_application_created_send_email
  AFTER INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_application_received_email();

-- ============================================================================
-- 7. APPLICATION STATUS CHANGED — to the applicant. Covers shortlisted,
--    referred ("you've been referred"), and rejected. Other status values
--    (e.g. reset back to pending) are intentionally silent — no one needs an
--    email for "your application status was reset."
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_application_status_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applicant_email text;
  v_applicant_name text;
  v_job_title text;
  v_job_company text;
  v_subject text;
  v_body text;
BEGIN
  IF new.status NOT IN ('shortlisted', 'referred', 'rejected') THEN
    RETURN new;
  END IF;

  SELECT email, full_name INTO v_applicant_email, v_applicant_name
  FROM public.profiles WHERE id = new.applicant_id;

  SELECT title, company INTO v_job_title, v_job_company
  FROM public.jobs WHERE id = new.job_id;

  IF new.status = 'shortlisted' THEN
    v_subject := 'You''ve been shortlisted for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been shortlisted</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">Good news — you''ve been shortlisted for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
      '<p style="margin:0;color:#4b5563;">The referrer is reviewing shortlisted candidates now.</p>',
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company'))
    );
  ELSIF new.status = 'referred' THEN
    v_subject := 'You''ve been referred for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">You''ve been referred 🎉</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">Your referrer just referred you for <strong>%s</strong> at <strong>%s</strong>.</p>' ||
      '<p style="margin:0;color:#4b5563;">Your application is now in front of the hiring team.</p>',
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company'))
    );
  ELSE
    v_subject := 'Update on your application for ' || coalesce(v_job_title, 'a role on Thessis');
    v_body := format(
      '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">Application update</h2>' ||
      '<p style="margin:0 0 12px;color:#4b5563;">You weren''t moved forward for <strong>%s</strong> at <strong>%s</strong> this time.</p>' ||
      '<p style="margin:0;color:#4b5563;">Keep browsing — new referrals are posted regularly.</p>',
      public.escape_html(coalesce(v_job_title, 'this role')),
      public.escape_html(coalesce(v_job_company, 'the company'))
    );
  END IF;

  PERFORM public.send_transactional_email(
    v_applicant_email,
    v_applicant_name,
    v_subject,
    public.render_email_shell(public.escape_html(v_subject), v_body)
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_application_status_changed_send_email ON public.applications;
CREATE TRIGGER on_application_status_changed_send_email
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  WHEN (old.status IS DISTINCT FROM new.status)
  EXECUTE FUNCTION public.handle_application_status_email();

-- ============================================================================
-- 8. NEW MESSAGE RECEIVED
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_id uuid;
  v_recipient_email text;
  v_recipient_name text;
  v_sender_name text;
  v_preview text;
BEGIN
  SELECT CASE WHEN c.participant_1 = new.sender_id THEN c.participant_2 ELSE c.participant_1 END
  INTO v_recipient_id
  FROM public.conversations c
  WHERE c.id = new.conversation_id;

  SELECT email, full_name INTO v_recipient_email, v_recipient_name
  FROM public.profiles WHERE id = v_recipient_id;

  SELECT full_name INTO v_sender_name
  FROM public.profiles WHERE id = new.sender_id;

  v_preview := left(new.content, 140);

  PERFORM public.send_transactional_email(
    v_recipient_email,
    v_recipient_name,
    public.escape_html(coalesce(v_sender_name, 'Someone')) || ' sent you a message on Thessis',
    public.render_email_shell(
      public.escape_html(v_preview),
      format(
        '<h2 style="margin:0 0 16px;font-size:20px;font-weight:800;">New message from %s</h2>' ||
        '<p style="margin:0 0 20px;color:#4b5563;font-style:italic;">"%s"</p>' ||
        '%s',
        public.escape_html(coalesce(v_sender_name, 'Someone')),
        public.escape_html(v_preview),
        public.render_email_button('https://thessis.com/messages', 'Reply')
      )
    )
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_message_created_send_email ON public.messages;
CREATE TRIGGER on_message_created_send_email
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_email();

-- ============================================================================
-- 9. REFERRAL MILESTONES (1st / 10th application) — relax the constraint so
--    the milestone value 10 is allowed. The existing 1/5 milestone rows (if
--    any jobs already hit 5) are left as-is; the edge function itself is
--    updated separately to target 10 instead of 5 and to send via ZeptoMail
--    (through send_transactional_email) instead of Resend.
-- ============================================================================

ALTER TABLE public.job_application_email_milestones
  DROP CONSTRAINT IF EXISTS job_application_email_milestones_milestone_check;

ALTER TABLE public.job_application_email_milestones
  ADD CONSTRAINT job_application_email_milestones_milestone_check
  CHECK (milestone IN (1, 10));
