-- Runtime-backed trust verification, badges, and points schema

-- Profiles: work verification + points balance
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_email_verified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tide_points_balance INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS unique_verified_work_email
ON public.profiles (work_email)
WHERE work_email IS NOT NULL AND work_email_verified = TRUE;

-- Verification codes for work email verification
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'work_email',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_codes' AND policyname = 'Users can insert their own verification codes'
  ) THEN
    CREATE POLICY "Users can insert their own verification codes"
      ON public.verification_codes
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'verification_codes' AND policyname = 'Users can read their own verification codes'
  ) THEN
    CREATE POLICY "Users can read their own verification codes"
      ON public.verification_codes
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Hire verification workflow tables
CREATE TABLE IF NOT EXISTS public.hire_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  applicant_response TEXT CHECK (applicant_response IN ('yes', 'no', 'snooze')),
  referrer_response TEXT CHECK (referrer_response IN ('yes', 'no', 'idk')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed', 'rejected', 'snoozed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tide_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hire_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tide_points_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hire_verifications' AND policyname = 'Users can view their own verifications'
  ) THEN
    CREATE POLICY "Users can view their own verifications"
      ON public.hire_verifications
      FOR SELECT
      USING (auth.uid() = applicant_id OR auth.uid() = referrer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'hire_verifications' AND policyname = 'Users can update their own verifications'
  ) THEN
    CREATE POLICY "Users can update their own verifications"
      ON public.hire_verifications
      FOR UPDATE
      USING (auth.uid() = applicant_id OR auth.uid() = referrer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_badges' AND policyname = 'Anyone can view badges'
  ) THEN
    CREATE POLICY "Anyone can view badges"
      ON public.user_badges
      FOR SELECT
      USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tide_points_ledger' AND policyname = 'Users can view own ledger'
  ) THEN
    CREATE POLICY "Users can view own ledger"
      ON public.tide_points_ledger
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- RPC: generate a 6-digit work verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_code := lpad((floor(random() * 1000000))::INT::TEXT, 6, '0');

  UPDATE public.verification_codes
  SET expires_at = NOW()
  WHERE user_id = p_user_id
    AND email = p_email
    AND type = 'work_email'
    AND verified_at IS NULL;

  INSERT INTO public.verification_codes (user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, v_code, NOW() + INTERVAL '15 minutes');

  RETURN v_code;
END;
$$;

-- RPC: verify code + mark profile + award verified employee badge
CREATE OR REPLACE FUNCTION public.verify_work_email(
  p_user_id UUID,
  p_email TEXT,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.verification_codes%ROWTYPE;
  v_company_domain TEXT;
  v_company_name TEXT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_record
  FROM public.verification_codes
  WHERE user_id = p_user_id
    AND email = p_email
    AND code = p_code
    AND type = 'work_email'
    AND verified_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_record.id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.verification_codes
  SET verified_at = NOW()
  WHERE id = v_record.id;

  UPDATE public.profiles
  SET
    work_email = p_email,
    work_email_verified = TRUE,
    work_email_verified_at = NOW()
  WHERE id = p_user_id;

  v_company_domain := split_part(p_email, '@', 2);
  v_company_name := initcap(split_part(v_company_domain, '.', 1));

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_badges
    WHERE user_id = p_user_id
      AND badge_type = 'verified_employee'
      AND COALESCE(metadata->>'domain', '') = v_company_domain
  ) THEN
    INSERT INTO public.user_badges (user_id, badge_type, metadata)
    VALUES (
      p_user_id,
      'verified_employee',
      jsonb_build_object('company', v_company_name, 'domain', v_company_domain, 'email', p_email)
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- Metric: response time bucket for job creator
CREATE OR REPLACE FUNCTION public.get_referrer_response_metric(referrer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_median_hours NUMERIC;
BEGIN
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (sub.updated_at - sub.applied_at)) / 3600)
  INTO v_median_hours
  FROM (
    SELECT a.applied_at, a.updated_at
    FROM public.applications a
    JOIN public.jobs j ON a.job_id = j.id
    WHERE j.created_by = referrer_id
      AND a.status IN ('reviewed', 'referred', 'rejected')
    ORDER BY a.applied_at DESC
    LIMIT 10
  ) sub;

  IF v_median_hours IS NULL THEN
    RETURN NULL;
  ELSIF v_median_hours <= 24 THEN
    RETURN '24h';
  ELSIF v_median_hours <= 72 THEN
    RETURN '3d';
  ELSIF v_median_hours <= 168 THEN
    RETURN '1w';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- Computed column wrapper for profiles select(...response_metric)
CREATE OR REPLACE FUNCTION public.response_metric(profile_row public.profiles)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT public.get_referrer_response_metric(profile_row.id);
$$;

-- Keep hire_verifications.updated_at current
CREATE OR REPLACE FUNCTION public.set_hire_verifications_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_hire_verifications_updated_at ON public.hire_verifications;
CREATE TRIGGER set_hire_verifications_updated_at
BEFORE UPDATE ON public.hire_verifications
FOR EACH ROW
EXECUTE FUNCTION public.set_hire_verifications_updated_at();

-- Apply side-effects on verification decision
CREATE OR REPLACE FUNCTION public.process_hire_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER := 1000;
  v_job_company TEXT;
  v_job_title TEXT;
BEGIN
  IF NEW.applicant_response = 'yes' AND NEW.referrer_response = 'yes' AND OLD.status <> 'verified' THEN
    NEW.status := 'verified';

    SELECT company, title
    INTO v_job_company, v_job_title
    FROM public.jobs
    WHERE id = (SELECT job_id FROM public.applications WHERE id = NEW.application_id);

    INSERT INTO public.tide_points_ledger (user_id, amount, action_type, entity_id)
    VALUES (NEW.referrer_id, v_points, 'referral_success', NEW.id);

    INSERT INTO public.tide_points_ledger (user_id, amount, action_type, entity_id)
    VALUES (NEW.applicant_id, v_points, 'referral_success', NEW.id);

    INSERT INTO public.user_badges (user_id, badge_type, metadata)
    VALUES (NEW.applicant_id, 'hired', jsonb_build_object('company', v_job_company, 'role', v_job_title));

    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges WHERE user_id = NEW.referrer_id AND badge_type = 'scout'
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_type)
      VALUES (NEW.referrer_id, 'scout');
    END IF;

  ELSIF (NEW.applicant_response = 'no' OR NEW.referrer_response = 'no') AND OLD.status <> 'rejected' THEN
    NEW.status := 'rejected';
  ELSIF NEW.applicant_response = 'snooze' THEN
    NEW.status := 'snoozed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_hire_verification_status ON public.hire_verifications;
CREATE TRIGGER check_hire_verification_status
BEFORE UPDATE ON public.hire_verifications
FOR EACH ROW
EXECUTE FUNCTION public.process_hire_verification();

-- Keep profile points balance in sync with ledger
CREATE OR REPLACE FUNCTION public.update_tide_points_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET tide_points_balance = COALESCE(tide_points_balance, 0) + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ledger_insert ON public.tide_points_ledger;
CREATE TRIGGER on_ledger_insert
AFTER INSERT ON public.tide_points_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_tide_points_balance();

GRANT EXECUTE ON FUNCTION public.generate_verification_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_work_email(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referrer_response_metric(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.response_metric(public.profiles) TO authenticated, anon;
