ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT;
COMMENT ON COLUMN public.profiles.account_type IS
  'Set to ''company'' when the profile represents a verified company/employer account with an uploaded brand logo (avatar_url). NULL/individual otherwise. Set via CompanyProfileBrandingPage on logo save, not at signup.';

-- Backfill: mark existing accounts that signed up as employer/company
-- (normalizes the existing 'employer' vs 'company' metadata inconsistency
-- seen elsewhere in the app, e.g. App.tsx isCompanyUser check)
UPDATE public.profiles p
SET account_type = 'company'
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_user_meta_data->>'user_type' IN ('employer', 'company');
