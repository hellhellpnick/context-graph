import type { ScanResult } from '../../scanner';

export type ProjectStackProfile = {
  laravel: boolean;
  php: boolean;
  node: boolean;
  vue: boolean;
  nuxt: boolean;
  /** Repo-relative directory containing `nuxt.config.*` (e.g. `frontend/dev`). */
  nuxtRoot?: string;
};

const NUXT_CONFIG_RE = /(^|\/)nuxt\.config\.(ts|js|mjs)$/i;

/** First `nuxt.config.*` path in scan order (stable). */
export function findNuxtConfigPath(scan: ScanResult): string | undefined {
  for (const f of scan.files) {
    const p = f.path.replace(/\\/g, '/');
    if (NUXT_CONFIG_RE.test(p)) return p;
  }
  return undefined;
}

export function countScannedVueFiles(scan: ScanResult): number {
  return scan.files.filter(f => f.path.endsWith('.vue') && f.tier !== 3).length;
}

export function detectProjectStackProfile(scan: ScanResult): ProjectStackProfile {
  const paths = new Set(scan.files.map(f => f.path.replace(/\\/g, '/')));
  const has = (p: string) => paths.has(p);
  const anyPrefix = (prefix: string) =>
    scan.files.some(f => f.path.replace(/\\/g, '/').startsWith(prefix));

  const nuxtConfig = findNuxtConfigPath(scan);
  const nuxtRoot = nuxtConfig
    ? (() => {
        const dir = nuxtConfig.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
        return dir.length > 0 ? dir : undefined;
      })()
    : undefined;

  const laravel = has('artisan') && has('composer.json') && anyPrefix('app/');
  const php =
    laravel ||
    scan.files.some(f => f.path.endsWith('.php') && f.tier !== 3 && f.content.length > 0);
  const node = has('package.json') || (nuxtRoot ? has(`${nuxtRoot}/package.json`) : false);
  const vue = scan.files.some(f => f.path.endsWith('.vue'));
  const nuxt = !!nuxtConfig;

  return { laravel, php, node, vue, nuxt, nuxtRoot };
}

/** Auto `by-folder` for Laravel / large PHP trees / Nuxt & large Vue apps. */
export function shouldAutoFolderGrouping(
  scan: ScanResult,
  profile: ProjectStackProfile,
  subsystemGrouping: 'default' | 'by-folder'
): boolean {
  if (subsystemGrouping === 'by-folder') return false;
  if (profile.laravel) return true;
  const phpUnderApp = scan.files.filter(
    f => f.path.replace(/\\/g, '/').startsWith('app/') && f.path.endsWith('.php')
  ).length;
  if (phpUnderApp >= 24) return true;
  const vueCount = countScannedVueFiles(scan);
  if (profile.nuxt && vueCount >= 12) return true;
  if (vueCount >= 48) return true;
  return false;
}
