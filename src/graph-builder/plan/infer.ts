import type { ScanResult } from '../../scanner';
import type { BuildPlan } from '../types';

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
  for (const name of configHints) {
    const f = scan.files.find(x => x.path === name && x.content);
    if (!f) continue;
    lines.push(`\n### ${name} (first 160 lines)\n\`\`\`\n${f.content.split('\n').slice(0, 160).join('\n')}\n\`\`\``);
  }
  return lines.join('\n');
}

export function readPackageJson(scan: ScanResult): Record<string, unknown> | null {
  const f = scan.files.find(x => x.path === 'package.json' && x.content);
  if (!f) return null;
  try {
    return JSON.parse(f.content) as Record<string, unknown>;
  } catch {
    return null;
  }
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

export function inferDefaultsFromScan(scan: ScanResult): Pick<BuildPlan, 'projectName' | 'projectDescription' | 'techStack' | 'buildCommand' | 'testCommand'> {
  const pkg = readPackageJson(scan);
  const composer = readComposerJson(scan);
  const goModule = readGoModModule(scan);

  let name = typeof pkg?.name === 'string' ? pkg.name : 'Project';
  let desc =
    typeof pkg?.description === 'string' ? pkg.description : 'Codebase (auto-inferred)';

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

  const scripts = pkg?.scripts && typeof pkg.scripts === 'object' ? (pkg.scripts as Record<string, string>) : {};
  const composerScripts =
    composer?.scripts && typeof composer.scripts === 'object'
      ? (composer.scripts as Record<string, string>)
      : {};

  let buildCommand: string | undefined =
    scripts.build ? 'npm run build' : scripts.compile ? 'npm run compile' : undefined;
  if (!buildCommand && composerScripts.build) buildCommand = 'composer build';
  if (!buildCommand && composerScripts['install-deps']) buildCommand = 'composer install-deps';

  let testCommand: string | undefined = scripts.test ? 'npm test' : undefined;
  if (!testCommand && composerScripts.test) testCommand = 'composer test';
  if (!testCommand && composerScripts.phpunit) testCommand = 'composer phpunit';
  if (!testCommand && composerScripts['test:unit']) testCommand = 'composer test:unit';

  const techStack: string[] = [];
  if (pkg) techStack.push('Node.js');
  if (composer) techStack.push('PHP', 'Composer');
  if (scan.files.some(f => f.path.endsWith('.php'))) {
    if (!techStack.includes('PHP')) techStack.push('PHP');
  }
  if (scan.files.some(f => f.path.endsWith('.vue'))) techStack.push('Vue');
  if (scan.files.some(f => f.path.endsWith('.go'))) {
    if (!techStack.includes('Go')) techStack.push('Go');
  }
  if (scan.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) techStack.push('TypeScript');
  if (scan.files.some(f => f.path.endsWith('.py'))) techStack.push('Python');
  if (scan.files.some(f => f.path.endsWith('.rs'))) techStack.push('Rust');
  if (techStack.length === 0) techStack.push('Unknown');
  return {
    projectName: name,
    projectDescription: desc,
    techStack,
    buildCommand,
    testCommand,
  };
}

