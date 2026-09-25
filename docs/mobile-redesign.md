# Mobile redesign — implementation and review

The changes are on `codex/mobile-layout`, based on `e0f04e6` from the earlier security and company-page cleanup. The working copy is `/Users/ganeshgowda/THESSIS-mobile`.

## What changed

- Consistent phone headers and labeled bottom navigation for Jobs, Messages, Notifications and Profile. Settings is available from Profile.
- People search is reachable from the header and the empty inbox, including a usable empty search screen.
- Jobs has stronger card titles, consistent page margins and a compact Post action.
- Job details and applications use full-height phone screens, visible Back controls, keyboard focus management and safe-area padding. Applying has one scrollable body and a persistent Submit action.
- Profile has a shorter cover, a compact completion prompt, fewer repeated empty-section controls and a section selector in the editor.
- Messages has a useful empty-state action and an explicit conversation Back button. The conversation and profile editor respond to visual-viewport changes when a keyboard opens.
- Notification descriptions are readable without being cut to two lines.
- Referral creation starts with compact manual/link/PDF choices. Statistics appear with the referral-management section. Continue validates the current step; publishing an incomplete phone form returns to the first incomplete step.
- Settings uses grouped phone controls and a collapsed Account management section. Privacy, Cookies and Terms remain available there.
- Login/signup use wider fields and reduced nested padding. Public home gets an early phone CTA. Onboarding and password-reset inputs also receive phone styling.
- Applicant details retain their existing actions and use a collapsible resume-match explanation on phones.

## Desktop boundary

Every rule in `web/src/styles/mobile.css` is inside `@media (max-width: 767px)`. The new navigation and dialog presentations are conditional on the same breakpoint. Existing layouts at 768px and above, global brand tokens and desktop business logic are retained.

The application fields are shared between the existing desktop modal and the new phone dialog; they use the same validation and submission service.

## Verification completed

| Check | Result |
| --- | --- |
| Production build | Passed |
| `git diff --check` | Passed |
| TypeScript comparison against the unchanged security-branch baseline | 175 existing diagnostics in each; no new diagnostics |
| Desktop Profile, Settings, Notifications, referral creation and empty Messages screenshots | Byte-for-byte identical to their saved baselines at 1470 × 776 |
| Desktop Jobs screenshot at 1440 × 900 | Identical outside the elapsed-time labels, which changed during the review |
| Responsive checks at 360, 390, 430, 767, 768, 1024 and 1440 pixels | No horizontal overflow on the tested notification page; phone navigation switches off at 768px |
| Application at 360 × 640 with an error and profile reminder | Dialog stays within the viewport; Submit spans y=578–626, fully inside the 640px screen |
| Application/detail Back controls | Return to the prior screen and restore normal page interaction/scrolling |
| Profile editor | Section selection and Cancel/Close verified without saving changes |
| Referral form | Import choices and return to the first invalid step verified without posting |
| People search | Empty search opens; entering a query navigates to its results/loading state |
| Public login/signup | Phone layout inspected; inputs measure 16px text and 48px height; no credentials entered |
| Public home | Phone layout and early CTA visually checked |

Testing used Chrome viewport overrides. No applications, messages, referrals or profile edits were submitted. No database migrations, backend deployment or production deployment were performed.

## Remaining verification limits

- A physical iPhone/Android keyboard and browser safe-area behavior still need device testing. The viewport handling is implemented, but viewport emulation does not reproduce every device behavior.
- The signed-in account had no conversations or posted referrals, so populated conversation and applicant-detail layouts were not visually verified. Those changes were reviewed in source and compiled.
- Actual resume uploads, successful application submission, referral publishing, authentication and password changes were not exercised against the live backend.
- The repository already has TypeScript errors. This redesign adds none compared with the baseline; the production Vite build succeeds.

## Local preview

The development server runs from `/Users/ganeshgowda/THESSIS-mobile/web` at `http://localhost:5173`. Use a phone-sized viewport to review the new presentation. The original `/Users/ganeshgowda/THESSIS-fresh` checkout has not been edited by this redesign.
