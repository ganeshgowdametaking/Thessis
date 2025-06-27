# Supabase Authentication Setup Guide

## Configure OTP-Based Authentication

To ensure your application works with OTP (One-Time Password) instead of email confirmation links, you need to configure your Supabase project settings.

### Step 1: Disable Email Confirmation

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/fvprdknorvuqggwxfqly
2. Navigate to **Authentication** → **Settings** in the left sidebar
3. Scroll down to **Email Auth** section
4. **Disable** the following options:
   - ✅ **Enable email confirmations** (turn this OFF)
   - ✅ **Enable secure email change** (turn this OFF)

### Step 2: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. You can customize the OTP email template if desired
3. The default template should work fine

### Step 3: Test the Authentication Flow

After making these changes:

1. **Sign Up Flow:**
   - User enters email and password
   - System sends OTP to email
   - User enters OTP code
   - Account is created and user is signed in

2. **Sign In Flow:**
   - User enters email and password
   - If password is correct, user is signed in
   - If password is incorrect, system sends OTP as fallback

## Why This Configuration?

- **Better UX**: Users don't need to click email links
- **Mobile Friendly**: OTP codes work better on mobile devices
- **Faster Onboarding**: No need to switch between email and browser
- **Fallback Support**: Still supports password-based login for existing users

## Troubleshooting

### If users still get confirmation links:
1. Make sure you've disabled email confirmations in Supabase settings
2. Clear browser cache and try again
3. Check that the application is using the updated authentication code

### If OTP doesn't arrive:
1. Check spam/junk folder
2. Verify email address is correct
3. Check Supabase logs for any email delivery issues

### If you want to switch back to email confirmation:
1. Re-enable "Enable email confirmations" in Supabase settings
2. Update the `signUp` function in `src/lib/supabase.ts` to use `supabase.auth.signUp()` instead of `signInWithOtp()`

## Current Authentication Flow

```
Sign Up:
Email + Password → OTP Sent → Enter OTP → Account Created + Signed In

Sign In:
Email + Password → If Correct: Signed In
                   If Wrong: OTP Sent → Enter OTP → Signed In
```

This configuration provides a smooth, modern authentication experience that works well across all devices. 