---
description: "Mirror — `src/providers/anthropic.ts`"
applyTo: "src/providers/anthropic.ts"
priority: "P1"
last_updated: "2026-05-19"
---

## When to Read
- editing or refactoring `anthropic.ts`

## Overview
- `src/providers/anthropic.ts` (38 lines · 1 top-level symbols) — Mirror — `src/providers/anthropic.ts`

## Graph
```mermaid
graph LR
  anthropic[anthropic]
  anthropic --> types[types]
  anthropic --> _anthropic_ai_sdk["@anthropic-ai/sdk"]
```

## Signatures

```typescript
// ── src/providers/anthropic.ts ──
export class AnthropicProvider implements LLMProvider { /* ~34 lines */ }

```

## Dependencies
**Internal:**
- `src/providers/types`

**External:**
- `@anthropic-ai/sdk`

## Error Handling
- `Error`: "API key not found. Set the ${config.apiKeyEnv} environment variable." (`anthropic.ts`)
