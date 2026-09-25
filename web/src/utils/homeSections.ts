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
