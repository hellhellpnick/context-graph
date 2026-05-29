import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInstructionExcludedPath } from '../dist/source-extract/index.js';
import {
  shouldExcludeFromSubsystems,
  collectScannedSourcePaths,
} from '../dist/graph-builder/plan/repair.js';
import {
  shouldIncludeDeterministicSource,
} from '../dist/graph-builder/extract/exports.js';

describe('isInstructionExcludedPath', () => {
  it('excludes XAML and csproj', () => {
    assert.equal(isInstructionExcludedPath('AutoDarkModeApp/MainWindow.xaml'), true);
    assert.equal(isInstructionExcludedPath('AutoDarkModeApp/AutoDarkModeApp.csproj'), true);
    assert.equal(isInstructionExcludedPath('App.xaml.cs'), false);
    assert.equal(isInstructionExcludedPath('MainWindow.xaml.cs'), false);
  });
});

describe('shouldExcludeFromSubsystems', () => {
  it('drops markup from instruction plan paths', () => {
    assert.equal(shouldExcludeFromSubsystems('foo/MainWindow.xaml'), true);
    assert.equal(shouldExcludeFromSubsystems('src/ViewModel.cs'), false);
  });
});

describe('collectScannedSourcePaths', () => {
  it('omits xaml from subsystem source list', () => {
    const scan = {
      files: [
        { path: 'App/MainWindow.xaml', tier: 2, content: '<Window />', lines: 1, truncated: false },
        { path: 'App/MainWindow.xaml.cs', tier: 2, content: 'class X {}', lines: 1, truncated: false },
      ],
    };
    const paths = collectScannedSourcePaths(scan);
    assert.deepEqual(paths, ['App/MainWindow.xaml.cs']);
  });
});

describe('shouldIncludeDeterministicSource (markup)', () => {
  it('does not dump markup-only bundles', () => {
    const scan = { files: [] };
    const sf = ['ui/App.xaml', 'ui/App.csproj'];
    assert.equal(
      shouldIncludeDeterministicSource(scan, sf, '(no exports — see ## Source for full script)'),
      false
    );
  });
});
