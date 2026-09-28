# Mobile UI refinement — 28 September 2026

## Scope

Frontend presentation below 768 CSS pixels. No database, permissions, API, service, authentication, ranking, or business-logic changes. Existing desktop utility classes are preserved. The new stylesheet is loaded after the existing mobile stylesheet, and all 211 rules are inside `@media (max-width: 767px)`.

Reviewed the supplied phone screenshots and the mobile app references at https://dribbble.com/search/mobile-app. The design uses a smaller header, quieter secondary actions, clear groups, compact cards, and consistent spacing while retaining the Thessis identity.

## Pages

- Jobs: compact cards, clearer metadata, quieter tags, a phone filter sheet and consistent application-sheet spacing.
- People: grouped search results, compact actions and empty states.
- Profiles: smaller covers, identity before public-profile actions, simpler sections and completion prompt, one Back control.
- Applicants: compact ranking summary, readable full names, grouped rows and clearer document actions.
- Referrals: separate Create referral and Your referrals phone tabs, preserving drafts when switching; simpler form steps and management cards.
- Notifications: grouped white rows, readable details, clear unread dots and quieter actions.
- Messages: simpler inbox rows and a compact conversation header.
- Settings and sign-in: consistent phone controls and spacing.
- Navigation: reduced height with safe-area padding; bottom navigation hides when a focused text field and reduced visual viewport indicate the software keyboard is open.

## Verification

Tests used real frontend components with deterministic synthetic profiles, jobs, applications, messages and notifications. Service and Supabase imports were replaced in the local preview; no production records were created or modified.

- Production Vite build passed.
- ESLint on the 12 modified TypeScript files: zero errors, no increase in existing warnings.
- Parsed the new CSS and confirmed every rule is gated below 768px.
- Original versus updated screenshots matched byte for byte at 1440 × 900 for 11 views: jobs; people empty/results; own/public profile; applicants; referral creation; notifications; messages; settings; sign-in.
- The eight key authenticated pages also matched byte for byte at 768 × 900.
- Eight main pages had no document-level horizontal overflow at 360, 430 and 767 pixels. Eleven views were reviewed at 390 pixels, with additional 360-pixel inspection. A four-pixel overflow in filter rows at 360px was found and fixed.
- Exercised filter opening/closing, job details and application form, profile editor opening/canceling, applicant details and ranking explanation, referral tab switching and draft preservation, advancing to role details, notification filtering, and opening a conversation.
- No browser console errors during the final fixture review.

## Limits

These are UI regression checks with fixtures, not a new production backend/security audit. Browser viewport emulation does not reproduce an actual iOS/Android software keyboard or every device's safe-area behavior; physical-device keyboard checks remain useful.
