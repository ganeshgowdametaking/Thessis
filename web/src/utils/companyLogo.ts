const LOGO_DEV_TOKEN = import.meta.env.VITE_LOGO_DEV_PUBLISHABLE_KEY as string | undefined;

/**
 * Resolves a real logo for a free-typed company/school name via Logo.dev's
 * name-lookup endpoint (fuzzy-matches against its own company database,
 * not a domain guess) and falls back to an auto-generated monogram when
 * there's no match — Logo.dev always returns something displayable.
 *
 * Returns undefined (CompanyAvatar's own initials tile takes over) when
 * the name is too short to bother looking up, or when no publishable key
 * is configured yet — this is a safe no-op until VITE_LOGO_DEV_PUBLISHABLE_KEY
 * is set in .env.
 */
export function getCompanyLogoUrl(name: string | undefined | null): string | undefined {
  const trimmed = (name || '').trim();
  if (trimmed.length < 2 || !LOGO_DEV_TOKEN) return undefined;

  return `https://img.logo.dev/name/${encodeURIComponent(trimmed)}?token=${LOGO_DEV_TOKEN}`;
}
