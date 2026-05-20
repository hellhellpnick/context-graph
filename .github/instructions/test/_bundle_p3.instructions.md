---
description: "Mirror — `test/` (4 files, part 3/4)"
applyTo: "test/**"
priority: "P2"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `project-root.test.mjs`
- editing or refactoring `python-extract.test.mjs`
- editing or refactoring `repair-stack.test.mjs`
- editing or refactoring `resolve-symbol.test.mjs`

## Overview
- `test/project-root.test.mjs` (44 lines) — Mirror — `test/` (4 files, part 3/4)
- `test/python-extract.test.mjs` (38 lines) — Mirror — `test/` (4 files, part 3/4)
- `test/repair-stack.test.mjs` (213 lines · 2 top-level symbols) — Mirror — `test/` (4 files, part 3/4)
- `test/resolve-symbol.test.mjs` (38 lines) — Mirror — `test/` (4 files, part 3/4)

## Graph
```mermaid
graph LR
  Test[Test]
  Test --> root[root]
  Test --> root_project[root-project]
  Test --> infer[infer]
  Test --> repair[repair]
  Test --> stack_profile[stack-profile]
  Test --> resolve_symbol[resolve-symbol]
  Test --> project_root[project-root]
  Test --> index[index]
```

## Signatures

```typescript
// ── test/python-extract.test.mjs ──
// ── skeleton ──
const SAMPLE = `from fastapi import APIRouter import os router = APIRouter() @router.get("/items") async def list_items(): pass class ItemService: def run(self): pass `

// ── test/repair-stack.test.mjs ──
// ── skeleton ──
function laravelScan() {
  return { files: paths.map(path => ({ path, tier: path === 'composer.json' || path === 'artisan' ? 1 : 2, c…;
}
function nuxtMonorepoScan() {
  return { files: paths.map(path => ({ path, tier: path.endsWith('package.json') || path.includes('nuxt.conf…;
}

// ── test/resolve-symbol.test.mjs ──
// ── skeleton ──
const plan = { subsystems: [ { file: 'frontend/dev/components/common/_bundle.instructions.md', area: 'Common', priority: 'P1', sourceFiles: ['frontend/dev/components/common/LinkTag.vue'], applyTo: 'f…

```

## Dependencies
**Internal:**
- `dist/graph-builder/deterministic/root`
- `dist/graph-builder/deterministic/root-project`
- `dist/graph-builder/plan/infer`
- `dist/graph-builder/plan/repair`
- `dist/graph-builder/plan/stack-profile`
- `dist/graph-builder/resolve-symbol`
- `dist/project-root`
- `dist/source-extract/index`

## Danger Zone 🔴
- **[fs]** filesystem I/O
