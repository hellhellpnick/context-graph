---
description: "Mirror — `src/graph-builder/prompt.ts`"
applyTo: "src/graph-builder/prompt.ts"
priority: "P2"
last_updated: "2026-05-18"
---

## When to Read
- editing or refactoring `prompt.ts`

## Overview
- `src/graph-builder/prompt.ts` (47 lines · 4 top-level symbols) — Mirror — `src/graph-builder/prompt.ts` — **LLM prompt builder** (routing only; edit templates in repo)

## Graph
```mermaid
graph LR
  prompt[prompt]
  prompt --> config[config]
```

## Signatures

```typescript
// ── src/graph-builder/prompt.ts ──
/** Node / Python / Rust / PHP env access heuristics for Danger Zone + mermaid. */
export function fileReadsEnvironment(content: string): boolean { return /process\.env|os\.environ|os\.getenv\s*\(|std::env|getenv\s*\(|(?:^|[^\w$.])env\s*\(\s*['"][^'"]+['"]|(?:^|[^\w$])\$_ENV(?:\[|\b)|(?:^|[^\w$])\$_SERVER\s*\[/i.test( …
export function styleDirective(config: Config, target: 'notes' | 'root' | 'subsystem'): string { /* prompt template (~17 lines) */ }
export function loadSystemPrompt(): string { const candidates = [ path.join(__dirname, '../../prompts/graph-create-agent.md'), path.join(__dirname, '../../../graph-create-agent.md'), path.join(process.cwd(), 'graph-create-agent.md'), ]; …
export function loadExistingGraph(graphDir: string): string { const rootFile = path.join(graphDir, 'copilot-instructions.md'); if (!fs.existsSync(rootFile)) return ''; return fs.readFileSync(rootFile, 'utf8'); }

```

## Dependencies
**Internal:**
- `src/config`

## Error Handling
- `Error`: "context-graph system prompt not found. Try reinstalling the package." (`prompt.ts`)

## Danger Zone 🔴
- **[fs]** filesystem I/O
