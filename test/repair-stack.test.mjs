import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectProjectStackProfile,
  findNuxtConfigPath,
  shouldAutoFolderGrouping,
} from '../dist/graph-builder/plan/stack-profile.js';
import {
  inferDefaultsFromScan,
  inferTechStackFromScan,
  resolvePrimaryPackagePath,
} from '../dist/graph-builder/plan/infer.js';
import { groupPathsIntoAutoSubsystems, resolveRepairOptions } from '../dist/graph-builder/plan/repair.js';
import { buildDeterministicCopilotInstructions } from '../dist/graph-builder/deterministic/root.js';
import { buildProjectDataFlowSection } from '../dist/graph-builder/deterministic/root-project.js';

function laravelScan() {
  const paths = [
    'artisan',
    'composer.json',
    'public/index.php',
    'routes/api.php',
    'app/Http/Controllers/API/SongController.php',
    'app/Http/Controllers/API/AlbumController.php',
    'app/Services/SongService.php',
  ];
  return {
    files: paths.map(path => ({
      path,
      tier: path === 'composer.json' || path === 'artisan' ? 1 : 2,
      content: path.endsWith('.php') ? '<?php class X {}' : '{}',
      lines: 10,
      truncated: false,
    })),
    tree: '',
    tokenEstimate: 0,
    fileCount: paths.length,
    skippedCount: 0,
  };
}

describe('detectProjectStackProfile', () => {
  it('detects Laravel', () => {
    const p = detectProjectStackProfile(laravelScan());
    assert.equal(p.laravel, true);
    assert.equal(p.php, true);
  });
});

describe('shouldAutoFolderGrouping', () => {
  it('true for Laravel with default grouping', () => {
    const scan = laravelScan();
    const profile = detectProjectStackProfile(scan);
    assert.equal(shouldAutoFolderGrouping(scan, profile, 'default'), true);
  });
});

describe('groupPathsIntoAutoSubsystems app/', () => {
  it('bundles multiple PHP files in same folder (app not in SPLIT_DIRS)', () => {
    const scan = laravelScan();
    const paths = [
      'app/Http/Controllers/API/SongController.php',
      'app/Http/Controllers/API/AlbumController.php',
    ];
    const items = groupPathsIntoAutoSubsystems(paths, scan, new Set(), {
      subsystemGrouping: 'by-folder',
      subsystemLayout: 'mirror',
    });
    assert.equal(items.length, 1);
    assert.equal(items[0].sourceFiles.length, 2);
    assert.match(items[0].applyTo, /\*\*/);
  });
});

describe('resolveRepairOptions', () => {
  it('forces by-folder for Laravel when config default', () => {
    const scan = laravelScan();
    const opts = resolveRepairOptions(scan, {
      subsystemGrouping: 'default',
      maxFilesPerFolderSubsystem: 48,
      subsystemLayout: 'mirror',
    });
    assert.equal(opts.subsystemGrouping, 'by-folder');
  });
});

describe('buildDeterministicCopilotInstructions project focus', () => {
  it('includes How to use and Laravel flow, not CLI troubleshooting', () => {
    const scan = laravelScan();
    const plan = {
      projectName: 'Koel',
      projectDescription: 'Music server',
      techStack: ['PHP'],
      subsystems: [
        {
          file: 'app/Http/Controllers/API/_bundle.instructions.md',
          area: 'API',
          priority: 'P1',
          sourceFiles: ['app/Http/Controllers/API/SongController.php'],
          applyTo: 'app/Http/Controllers/API/**',
          useCases: ['editing API'],
          description: 'controllers',
        },
      ],
    };
    const md = buildDeterministicCopilotInstructions('2026-05-18', scan, plan);
    assert.match(md, /## How to use this graph/);
    assert.match(md, /MANDATORY — read instructions first \(BLOCKING\)/);
    assert.match(md, /\*\*MUST\*\* open.*context-graph-path-index/);
    assert.match(md, /path-index/);
    assert.match(md, /public\/index\.php/);
    assert.doesNotMatch(md, /normalizeBuildDirArg/);
    assert.doesNotMatch(md, /## Troubleshooting/);
    assert.doesNotMatch(md, /<<<FILE:/);
  });
});

describe('buildProjectDataFlowSection', () => {
  it('describes Laravel HTTP path', () => {
    const lines = buildProjectDataFlowSection(laravelScan(), detectProjectStackProfile(laravelScan()));
    const joined = lines.join('\n');
    assert.match(joined, /public\/index\.php/);
    assert.match(joined, /routes\/.*\.php/);
  });
});

function nuxtMonorepoScan() {
  const paths = [
    'frontend/dev/nuxt.config.js',
    'frontend/dev/package.json',
    'frontend/dev/pages/index.vue',
    'frontend/dev/composables/useSeo.js',
    'scripts/load-test.js',
    'tools/split-map-settings.go',
    'ci/helper.py',
  ];
  return {
    files: paths.map(path => ({
      path,
      tier: path.endsWith('package.json') || path.includes('nuxt.config') ? 1 : 2,
      content:
        path === 'frontend/dev/package.json'
          ? JSON.stringify({
              name: 'site',
              scripts: { dev: 'nuxt dev', build: 'nuxt build' },
              devDependencies: { nuxt: '^3.0.0' },
            })
          : path.endsWith('.vue')
            ? '<template></template>'
            : '// x',
      lines: 10,
      truncated: false,
    })),
    tree: '',
    tokenEstimate: 0,
    fileCount: paths.length,
    skippedCount: 0,
  };
}

describe('Nuxt / nested frontend', () => {
  it('finds nested nuxt.config', () => {
    const scan = nuxtMonorepoScan();
    assert.equal(findNuxtConfigPath(scan), 'frontend/dev/nuxt.config.js');
    const p = detectProjectStackProfile(scan);
    assert.equal(p.nuxt, true);
    assert.equal(p.nuxtRoot, 'frontend/dev');
  });

  it('uses nested package.json for build command', () => {
    const scan = nuxtMonorepoScan();
    assert.equal(resolvePrimaryPackagePath(scan), 'frontend/dev/package.json');
    const d = inferDefaultsFromScan(scan);
    assert.match(d.buildCommand, /frontend\/dev/);
    assert.match(d.buildCommand, /build/);
  });

  it('tech stack is Nuxt + JS, not stray Go/Python/TS', () => {
    const scan = nuxtMonorepoScan();
    const stack = inferTechStackFromScan(scan, detectProjectStackProfile(scan));
    assert.ok(stack.some(s => /Nuxt/i.test(s)));
    assert.ok(stack.includes('JavaScript'));
    assert.equal(stack.includes('Go'), false);
    assert.equal(stack.includes('Python'), false);
    assert.equal(stack.includes('TypeScript'), false);
  });

  it('auto by-folder for Nuxt with many vue files', () => {
    const vuePaths = Array.from({ length: 20 }, (_, i) => `frontend/dev/pages/p${i}.vue`);
    const scan = {
      ...nuxtMonorepoScan(),
      files: [
        ...nuxtMonorepoScan().files,
        ...vuePaths.map(path => ({
          path,
          tier: 2,
          content: '<template></template>',
          lines: 5,
          truncated: false,
        })),
      ],
    };
    const profile = detectProjectStackProfile(scan);
    assert.equal(shouldAutoFolderGrouping(scan, profile, 'default'), true);
    const opts = resolveRepairOptions(scan, {
      subsystemGrouping: 'default',
      maxFilesPerFolderSubsystem: 48,
      subsystemLayout: 'mirror',
    });
    assert.equal(opts.subsystemGrouping, 'by-folder');
  });
});
