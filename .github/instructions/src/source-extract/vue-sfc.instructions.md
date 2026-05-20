---
description: "Mirror — `src/source-extract/vue-sfc.ts`"
applyTo: "src/source-extract/vue-sfc.ts"
priority: "P2"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `vue-sfc.ts`

## Overview
- `src/source-extract/vue-sfc.ts` (196 lines · 7 top-level symbols) — Vue SFC script/template extraction.

## Graph
```mermaid
graph LR
  vue_sfc[vue-sfc]
  vue_sfc --> nuxt_runtime[nuxt-runtime]
```

## Signatures

```typescript
// ── src/source-extract/vue-sfc.ts ──
export function extractVueScriptCombined(sfc: string): string { const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; const parts: string[] = []; let m: RegExpExecArray | null; while ((m = re.exec(sfc)) !== null) { const attrs = m[1] ?? …
/**
 * For `.vue`, return extracted script + a virtual `.ts` path for the TS parser.
 * Otherwise return the file as-is.
 */
export function scriptOrSelfForAnalysis( relPath: string, content: string ): { body: string; virtualPath: string } { const norm = relPath.replace(/\\/g, '/'); if (/\.vue$/i.test(norm)) { const script = extractVueScriptCombined(content); …
export function extractVuePropKeys(script: string): string[] { /* ~30 lines */ }
/**
 * Vue `<script setup>` symbols: props, composables, top-level const/ref/computed.
 * Used when there is no `export` (typical SFC).
 */
export function extractVueSymbolLines(script: string): string[] { /* ~39 lines */ }
/** One-line template summary for instruction graphs. */
export function extractVueTemplateBrief(sfc: string): string | null { const m = sfc.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i); if (!m) return null; const one = (m[1] ?? '') .replace(/<!--[\s\S]*?-->/g, '') .replace(/\s+/g, ' ') .…
/**
 * Compact routing block for `.vue` in deterministic instructions.
 * No full script — names, props, runtime hooks only.
 */
export function buildVueRoutingSignatures(relPath: string, sfcContent: string): string[] { /* prompt template (~51 lines) */ }
/** Tag/element branches from `return` inside `computed` (e.g. LinkTag resolver). */
export function extractVueComputedBranches(script: string): string[] { /* ~17 lines */ }

```

## Dependencies
**Internal:**
- `src/source-extract/nuxt-runtime`
