# Cursor rules (context-graph)

Files named `ctxgraph--*.mdc` are **auto-generated** from `.github/instructions/*.instructions.md`.

- **When you edit a file**, Cursor attaches the rule whose `globs` match that path.
- **Source of truth**: instruction files under `.github/instructions/`.
- **Router (always on)**: `context-graph.mdc`.

Regenerate after graph changes:

```bash
context-graph build --no-llm
```

Do not edit `ctxgraph--*` by hand — changes are overwritten on the next build.
