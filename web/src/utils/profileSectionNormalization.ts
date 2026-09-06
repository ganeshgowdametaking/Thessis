// Supabase sometimes returns the profiles table's experiences/education/skills
// jsonb columns as genuine arrays, but occasionally as a JSON-encoded string or
// a raw Postgres array-literal string (e.g. from older writes) — this coerces
// any of those shapes into a clean, typed array before it's used or re-saved,
// so stale/odd-shaped data is never silently discarded on the next save.

export const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const parsePgJsonArrayLiteral = (value: string): unknown[] => {
  if (!(value.startsWith('{') && value.endsWith('}'))) return [];

  const matches = value.match(/"((?:\\.|[^"\\])*)"/g);
  if (!matches) return [];

  return matches
    .map((entry) => {
      const unquoted = entry
        .slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');

      return tryParseJson(unquoted) ?? unquoted;
    })
    .filter((entry) => entry !== null && entry !== undefined);
};

export const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];

    const pgParsed = parsePgJsonArrayLiteral(value);
    if (pgParsed.length > 0) return pgParsed;
  }

  return [];
};

export function normalizeSectionItems<T extends Record<string, any>>(value: unknown): Array<T & { id: number | string }> {
  const sourceItems = toArray(value);

  return sourceItems
    .map((item) => {
      if (item && typeof item === 'object') return item;
      if (typeof item !== 'string') return null;

      const parsed = tryParseJson(item) ?? tryParseJson(item.replace(/\\"/g, '"'));
      return parsed && typeof parsed === 'object' ? parsed : null;
    })
    .filter((item): item is T & { id?: number | string } => Boolean(item))
    .map((item, index) => {
      const normalizedItem = item as T & { id?: number | string };
      return {
        ...normalizedItem,
        id: normalizedItem.id ?? `${Date.now()}-${index}`,
      };
    });
}

export const getNormalizedProfileSections = (source: any) => ({
  experiences: normalizeSectionItems(source?.experiences),
  education: normalizeSectionItems(source?.education),
  skills: normalizeSectionItems(source?.skills),
  achievements: normalizeSectionItems(source?.achievements),
});

// Shared Start Date / End Date requirement for experience entries, used by
// both ProfilePage.tsx's edit modal and OnboardingPage.tsx's wizard so the
// rule can't drift between the two. A completely untouched entry (someone
// clicked "Add experience" and changed their mind) is exempt — it gets
// silently dropped on save instead of blocking the user.
interface ExperienceLike {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  current?: boolean;
}

export const isBlankExperience = (exp: ExperienceLike): boolean =>
  !exp.title?.trim() &&
  !exp.company?.trim() &&
  !exp.location?.trim() &&
  !exp.startDate &&
  !exp.endDate &&
  !exp.description?.trim() &&
  !exp.current;

export const validateExperienceDates = (experiences: ExperienceLike[]): string | null => {
  for (const exp of experiences) {
    if (isBlankExperience(exp)) continue;
    if (!exp.startDate) {
      return 'Please add a start date for each work experience entry.';
    }
    if (!exp.current && !exp.endDate) {
      return 'Please add an end date for each work experience entry, or check "I currently work here".';
    }
  }
  return null;
};
