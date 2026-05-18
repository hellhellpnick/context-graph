/** Shared limits for deterministic extractors. */
export const SKELETON_MAX_CHARS = 4200;

export function truncateSkeleton(s: string, max = 280): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
