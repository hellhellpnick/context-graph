import path from 'path';
import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';
import {
  detectProjectStackProfile,
  findNuxtConfigPath,
  type ProjectStackProfile,
} from './stack-profile';

const MIN_LANG_FILES = 5;

export function buildPlanningContextLight(scan: ScanResult): string {
  const lines: string[] = [
    '## Project file tree (all scanned paths; label = tier)',
    scan.tree,
    '',
    '## Config excerpts (infer build/test commands when JSON plan fields are empty)',
  ];
  const configHints = [
    'package.json',
    'composer.json',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    'pom.xml',
    'build.gradle.kts',
  ];
  const nuxtConfig = findNuxtConfigPath(scan);
  if (nuxtConfig) {
    const root = path.posix.dirname(nuxtConfig);
    const nestedPkg = root === '.' ? null : `${root}/package.json`;
    if (nestedPkg && !configHints.includes(nestedPkg)) configHints.unshift(nestedPkg);
  }
  for (const name of configHints) {
    const f = scan.files.find(x => x.path === name && x.content);
    if (!f) continue;
    lines.push(`\n### ${name} (first 160 lines)\n\`\`\`\n${f.content.split('\n').slice(0, 160).join('\n')}\n\`\`\``);
  }
  return lines.join('\n');
}

export function readPackageJsonAt(
  scan: ScanResult,
  relPath: string
): Record<string, unknown> | null {
  const f = scan.files.find(x => x.path === relPath && x.content);
  if (!f) return null;
  try {
    return JSON.parse(f.content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function readPackageJson(scan: ScanResult): Record<string, unknown> | null {
  return readPackageJsonAt(scan, resolvePrimaryPackagePath(scan));
}

export function readGoModModule(scan: ScanResult): string | null {
  const f = scan.files.find(x => x.path === 'go.mod' && x.content);
  if (!f) return null;
  const m = f.content.match(/^module\s+(\S+)/m);
  return m ? m[1].trim() : null;
}

export function readComposerJson(scan: ScanResult): Record<string, unknown> | null {
  const f = scan.files.find(x => x.path === 'composer.json' && x.content);
  if (!f) return null;
  try {
    return JSON.parse(f.content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Which `package.json` drives build/test labels (nested Nuxt monorepos). */
export function resolvePrimaryPackagePath(scan: ScanResult): string {
  const nuxtConfig = findNuxtConfigPath(scan);
  if (nuxtConfig) {
    const dir = path.posix.dirname(nuxtConfig.replace(/\\/g, '/'));
    const nested = dir === '.' ? 'package.json' : `${dir}/package.json`;
    if (scan.files.some(f => f.path === nested && f.content)) return nested;
  }
  return 'package.json';
}

function countSourceExt(scan: ScanResult, ext: string): number {
  return scan.files.filter(
    f => f.tier !== 3 && f.content.length > 0 && f.path.endsWith(ext)
  ).length;
}

function packageUsesNuxt(pkg: Record<string, unknown> | null): boolean {
  if (!pkg) return false;
  const deps = { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) } as Record<
    string,
    unknown
  >;
  return 'nuxt' in deps || '@nuxt/kit' in deps;
}

/** Human stack line — avoids listing Go/Python/TS from a few stray scripts. */
export function inferTechStackFromScan(
  scan: ScanResult,
  profile: ProjectStackProfile
): string[] {
  const ts = countSourceExt(scan, '.ts') + countSourceExt(scan, '.tsx');
  const js =
    countSourceExt(scan, '.js') +
    countSourceExt(scan, '.mjs') +
    countSourceExt(scan, '.cjs');
  const vue = countSourceExt(scan, '.vue');
  const php = countSourceExt(scan, '.php');
  const go = countSourceExt(scan, '.go');
  const py = countSourceExt(scan, '.py');
  const rs = countSourceExt(scan, '.rs');
  const pkg = readPackageJson(scan);

  if (profile.laravel) {
    const stack = ['Laravel', 'PHP'];
    if (profile.vue || vue >= MIN_LANG_FILES) stack.push('Vue');
    if (profile.node) stack.push('Node.js');
    return stack;
  }

  if (profile.nuxt || packageUsesNuxt(pkg)) {
    const stack: string[] = ['Nuxt 3', 'Vue'];
    if (ts >= MIN_LANG_FILES && ts >= js * 0.2) stack.push('TypeScript');
    else stack.push('JavaScript');
    if (php >= MIN_LANG_FILES) stack.push('PHP');
    if (go >= MIN_LANG_FILES) stack.push('Go');
    if (py >= MIN_LANG_FILES) stack.push('Python');
    return stack;
  }

  const stack: string[] = [];
  if (pkg || profile.node) stack.push('Node.js');
  if (php >= MIN_LANG_FILES) stack.push('PHP');
  if (vue >= MIN_LANG_FILES) stack.push('Vue');
  if (ts >= MIN_LANG_FILES) stack.push('TypeScript');
  else if (js >= MIN_LANG_FILES && ts < MIN_LANG_FILES) stack.push('JavaScript');
  if (go >= MIN_LANG_FILES) stack.push('Go');
  if (py >= MIN_LANG_FILES) stack.push('Python');
  if (rs >= MIN_LANG_FILES) stack.push('Rust');
  if (stack.length === 0) stack.push('Unknown');
  return stack;
}

export function inferDefaultsFromScan(scan: ScanResult): Pick<BuildPlan, 'projectName' | 'projectDescription' | 'techStack' | 'buildCommand' | 'testCommand'> {
  const profile = detectProjectStackProfile(scan);
  const pkgPath = resolvePrimaryPackagePath(scan);
  const pkg = readPackageJsonAt(scan, pkgPath);
  const rootPkg = readPackageJsonAt(scan, 'package.json');
  const composer = readComposerJson(scan);
  const goModule = readGoModModule(scan);

  let name = typeof pkg?.name === 'string' ? pkg.name : 'Project';
  let desc =
    typeof pkg?.description === 'string' ? pkg.description : 'Codebase (auto-inferred)';

  if ((!pkg || name === 'Project') && typeof rootPkg?.name === 'string') {
    name = rootPkg.name;
  }
  if ((!pkg || desc === 'Codebase (auto-inferred)') && typeof rootPkg?.description === 'string') {
    desc = rootPkg.description;
  }

  if ((!pkg || name === 'Project') && goModule) {
    const seg = goModule.split('/').pop();
    if (seg) name = seg;
  }

  if ((!pkg || name === 'Project') && composer) {
    const cName = composer.name;
    if (typeof cName === 'string' && cName.includes('/')) {
      name = cName.split('/').pop() ?? name;
    } else if (typeof cName === 'string' && cName.length > 0) {
      name = cName;
    }
    const cDesc = composer.description;
    if (typeof cDesc === 'string' && cDesc.trim().length > 0) desc = cDesc.trim();
  }

  const composerRequire =
    composer?.require && typeof composer.require === 'object'
      ? (composer.require as Record<string, unknown>)
      : null;
  const isLaravel =
    scan.files.some(f => f.path === 'artisan') &&
    composerRequire &&
    ('laravel/framework' in composerRequire || 'laravel/laravel' in composerRequire);

  const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? (pkg.scripts as Record<string, string>) : {};
  const composerScripts =
    composer?.scripts && typeof composer.scripts === 'object'
      ? (composer.scripts as Record<string, string>)
      : {};

  const buildPrefix = pkgPath === 'package.json' ? 'npm run' : `npm run --prefix ${path.posix.dirname(pkgPath)}`;

  let buildCommand: string | undefined;
  if (scripts.build) buildCommand = `${buildPrefix} build`;
  else if (scripts.dev && (profile.nuxt || packageUsesNuxt(pkg))) buildCommand = `${buildPrefix} dev`;
  else if (scripts.compile) buildCommand = `${buildPrefix} compile`;
  if (!buildCommand && composerScripts.build) buildCommand = 'composer build';
  if (!buildCommand && composerScripts['install-deps']) buildCommand = 'composer install-deps';

  let testCommand: string | undefined;
  if (scripts.test) testCommand = pkgPath === 'package.json' ? 'npm test' : `npm test --prefix ${path.posix.dirname(pkgPath)}`;
  if (!testCommand && composerScripts.test) testCommand = 'composer test';
  if (!testCommand && composerScripts.phpunit) testCommand = 'composer phpunit';
  if (!testCommand && composerScripts['test:unit']) testCommand = 'composer test:unit';

  const techStack = inferTechStackFromScan(scan, profile);
  if (isLaravel && !techStack.includes('Laravel')) techStack.unshift('Laravel');

  return {
    projectName: name,
    projectDescription: desc,
    techStack,
    buildCommand,
    testCommand,
  };
}
