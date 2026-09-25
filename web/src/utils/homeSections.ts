// Sections of the logged-out homepage that the header links to.
export const HOME_SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
] as const;

export const scrollToSection = (id: string) => {
  const target = document.getElementById(id);
  if (!target) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
};

// Shared marketing copy (homepage + sign-up page). Keep every line literally true.

// Companies that currently have open roles on Thessis — update this list when their roles close.
export const OPEN_ROLE_COMPANIES = ['Deel', 'Zomato', 'NielsenIQ', 'Capgemini'];

// Mirrors the referral routing: each application is assigned to a referrer with a 48-hour window.
export const REFERRER_RESPONSE_LINE = 'When you apply, a referrer gets your application and has 48 hours to respond.';

export const ONE_CLICK_SIGNUP_LINE = 'Free · Sign up in one click with Google or LinkedIn';
