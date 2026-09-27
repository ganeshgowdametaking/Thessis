# Email delivery follow-up — 27 September 2026

## Result: inbox delivery confirmed

The owner supplied four Gmail screenshots, each visibly labelled **Inbox**, for the approved mailbox or its disposable test alias. The screenshots establish receipt of:

| Email | Sender | Evidence |
| --- | --- | --- |
| Signup confirmation | Thessis `<noreply@thessis.com>` | Verification-code email received |
| Labelled notification test | Thessis `<notifications@thessis.com>` | Test reference `THESSIS-MAIL-E21AC2E6` received |
| Automatic welcome | Thessis `<notifications@thessis.com>` | Welcome email for the synthetic test account received |
| Password recovery | Thessis `<noreply@thessis.com>` | Recovery-code email received |

Earlier send requests returned HTTP 200 for signup and HTTP 201 from the notification provider. Browser recovery displayed **Recovery code sent** and **Verify Identity**. The screenshots now confirm actual inbox arrival, beyond those sending acknowledgements.

## Signup branding corrected in production

The received signup email still used the old **TankTide** brand. In Supabase Authentication → Emails → Confirm sign up, all four occurrences were replaced with **Thessis**: document title, welcome heading, team sign-off and copyright footer. The subject remains **Confirm Your Signup**.

The template was saved, reloaded and read back through the editor. It exactly matched the intended replacement, contained no old brand, and retained the `{{ .Token }}` placeholder. The preview rendered **Welcome to Thessis**. The website desktop design, authentication behavior and SMTP credentials were unchanged.

The deployed body is archived at `supabase/templates/confirmation.html`. This file is a versioned reference; a Git push alone does not deploy Supabase Auth email templates. This change was applied directly in the production dashboard. No additional email was sent after the correction; the corrected version was verified through saved source and dashboard preview.

## Cleanup and limits

The one disposable email-test account was identified by its exact stored UUID, alias and synthetic name before deletion. It had no jobs, applications, conversations or uploaded files. Auth deletion succeeded; subsequent scoped counts were zero for Auth users, profiles and notifications. Its private saved password was removed. All earlier referral fixtures were already removed, and the owner's actual account and LinkedIn session were preserved.

No mailbox unrelated to the approved recipient was accessed. Screenshots, OTPs, passwords and private recipient addresses are excluded from the repository.

This confirms delivery of the four tested email types to the controlled inbox. The supplied codes were not redeemed, and an actual password change was not completed in this follow-up. It does not establish delivery to every mail provider, work-email verification delivery, or unconditional website-wide sign-off. LinkedIn sign-in is separately verified in `2026-09-27-linkedin-login.md`.
