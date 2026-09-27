# LinkedIn login repair — 27 September 2026

## Result: passed

LinkedIn sign-in now works through the production Thessis website. The owner completed LinkedIn authentication and consent; Thessis returned to `/jobs` with the owner's authenticated profile. A browser reload kept the same signed-in account, and the test tab recorded no browser errors.

Server-side checks confirmed the authorized owner's LinkedIn identity, a recent identity sign-in, and a recent login audit explicitly identifying `linkedin_oidc`. The matching account was found. Only booleans were returned; credentials and personal account records were not included in the report.

## Configuration repaired

- Replacement app: **ThessisAI**, LinkedIn app ID `264942002`.
- Public client ID: `779t36dvayq6kc`.
- Added product: **Sign In with LinkedIn using OpenID Connect**, Standard Tier.
- Active scopes: `openid`, `profile`, `email`.
- Saved LinkedIn callback: `https://fvprdknorvuqggwxfqly.supabase.co/auth/v1/callback`.
- Website callback: `https://www.thessis.com/auth/callback`.
- The owner entered and saved the replacement credentials in Supabase's LinkedIn OIDC provider settings. The assistant did not generate, read, copy, print or enter the client secret.
- The disabled old app is no longer used by the tested website sign-in flow.

The initial callback validation error was resolved with the browser's supported accessibility value setter. The frontend already used `linkedin_oidc`; no website source change or paid service was needed. Desktop design was unchanged.

## Scope and cleanup

The OAuth test used the owner's actual account with authorization. That account and its active session were preserved; no applications, referrals, messages or other test business records were created for this OAuth check.

All earlier referral-test fixtures and the later disposable email-test account have been removed. The owner supplied screenshots confirming inbox receipt of signup, recovery, notification and welcome emails. The signup template’s old TankTide branding was corrected to Thessis and verified after reload. OTP redemption and a completed password change were not tested in this delivery follow-up. This LinkedIn result does not imply an unconditional website-wide sign-off or a completed Google OAuth test.
