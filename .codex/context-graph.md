# context-graph — AI routing entrypoint

This repo maintains a generated instruction graph under `.github/instructions/`.

Response style (ALWAYS):
- Ultra-compact (caveman). No greetings. No filler.
- Prefer bullets. Each bullet <= 18 words.
- If unsure, say "unknown" instead of guessing.

Subsystem context (automatic in Cursor):
- `.cursor/rules/ctxgraph--*.mdc` — attached when you edit files matching `globs` (from `applyTo`).

Manual routing (Copilot / Claude / other):
- `.github/instructions/copilot-instructions.md`
- `.github/instructions/context-graph-path-index.md`
- Match `.instructions.md` by `applyTo`; prefer higher `priority` (P0>P1>P2).

Instructions are authoritative over guesses.
