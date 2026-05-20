---
description: "Mirror — `src/cli/index.ts`"
applyTo: "src/cli/index.ts"
priority: "P0"
last_updated: "2026-05-20"
---

## When to Read
- editing or refactoring `index.ts`

## Overview
- `src/cli/index.ts` (4 lines) — Mirror — `src/cli/index.ts`

## Graph
```mermaid
graph LR
  index[index]
  index --> program[program]
```

## Signatures

```typescript
(no exports — see ## Source for full script)
```

## Source

### `src/cli/index.ts`

```typescript
import { program } from './program';

program.parse();

```

## Dependencies
**Internal:**
- `src/cli/program`
