import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPhpOneLineSummary,
  buildPhpRoutingSignatures,
  extractPhpJsonResponseKeys,
  extractPhpMethodParamNames,
  extractPhpSymbolLines,
} from '../dist/source-extract/index.js';
import { inferFilePriority } from '../dist/graph-builder/plan/priority.js';
import {
  extractExports,
  shouldIncludeDeterministicSource,
} from '../dist/graph-builder/extract/exports.js';

const SAMPLE = `<?php

namespace App\\Http\\Controllers\\API;

use App\\Enums\\Acl\\Permission;
use App\\Http\\Controllers\\Controller;
use App\\Repositories\\PlaylistRepository;

class FetchInitialDataController extends Controller
{
    public function __invoke(
        PlaylistRepository $playlistRepository,
        Authenticatable $user,
    ) {
        return response()->json([
            'settings' => [],
            'playlists' => PlaylistResource::collection([]),
            'current_user' => UserResource::make($user),
        ]);
    }
}
`;

describe('buildPhpRoutingSignatures', () => {
  it('omits use lines; summarizes DI and json keys', () => {
    const lines = buildPhpRoutingSignatures('app/FetchInitialDataController.php', SAMPLE);
    const joined = lines.join('\n');
    assert.match(joined, /routing summary/);
    assert.match(joined, /namespace App\\Http\\Controllers\\API/);
    assert.match(joined, /class FetchInitialDataController extends Controller/);
    assert.match(joined, /public function __invoke/);
    assert.match(joined, /DI: playlistRepository, user/);
    assert.match(joined, /response json keys: settings, playlists, current_user/);
    assert.doesNotMatch(joined, /^use App/m);
  });

  it('extractPhpSymbolLines skips imports', () => {
    const syms = extractPhpSymbolLines(SAMPLE);
    assert.ok(syms.some(s => s.startsWith('class FetchInitialDataController')));
    assert.equal(syms.some(s => s.startsWith('use ')), false);
  });
});

describe('extractPhpMethodParamNames', () => {
  it('reads multiline parameter lists', () => {
    const names = extractPhpMethodParamNames(SAMPLE, '__invoke');
    assert.deepEqual(names, ['playlistRepository', 'user']);
  });
});

describe('extractPhpJsonResponseKeys', () => {
  it('parses response()->json keys', () => {
    assert.deepEqual(extractPhpJsonResponseKeys(SAMPLE), [
      'settings',
      'playlists',
      'current_user',
    ]);
  });
});

describe('inferFilePriority (Laravel)', () => {
  it('API controllers are P0', () => {
    assert.equal(
      inferFilePriority('app/Http/Controllers/API/SongController.php'),
      'P0'
    );
  });
  it('composable mocks are P2', () => {
    assert.equal(
      inferFilePriority('resources/assets/js/composables/__mocks__/useFoo.ts'),
      'P2'
    );
  });
});

describe('buildPhpOneLineSummary', () => {
  it('compresses class + methods', () => {
    const line = buildPhpOneLineSummary('app/Foo.php', SAMPLE);
    assert.match(line, /FetchInitialDataController/);
    assert.match(line, /__invoke/);
  });
});

describe('extractExports PHP bundle cap', () => {
  it('caps full routing blocks and adds index tail', () => {
    const paths = Array.from({ length: 40 }, (_, i) => `app/C${i}.php`);
    const scan = {
      files: paths.map((p, i) => ({
        path: p,
        content: `<?php class C${i} { public function run() {} }`,
        lines: 3,
      })),
    };
    const block = extractExports(scan, paths);
    const fileSections = (block.match(/\/\/ ── app\//g) ?? []).length;
    assert.ok(fileSections <= 36, `expected cap, got ${fileSections} sections`);
    assert.match(block, /more \.php in this folder/);
  });
});

describe('shouldIncludeDeterministicSource (PHP)', () => {
  it('skips full source when routing signatures are rich', () => {
    const scan = {
      files: [{ path: 'app/Foo.php', content: SAMPLE, lines: SAMPLE.split('\n').length }],
    };
    const exportBlock = extractExports(scan, ['app/Foo.php']);
    assert.equal(
      shouldIncludeDeterministicSource(scan, ['app/Foo.php'], exportBlock),
      false
    );
  });
});
