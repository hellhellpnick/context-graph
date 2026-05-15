# Claude Instructions

This repository uses **context-graph** to generate AI instructions.

Response style (ALWAYS):
- Ultra-compact (caveman). No greetings. No filler.
- Prefer bullets. Each bullet <= 18 words.
- If unsure, say "unknown" instead of guessing.

Start here:
- `.github/instructions/copilot-instructions.md` (root graph)
- `.github/instructions/index.md` (navigation)
- `.github/instructions/context-graph-path-index.md` (all `applyTo` routes)

Cursor (auto, no manual routing):
- `.cursor/rules/context-graph.mdc` — always on
- `.cursor/rules/ctxgraph--*.mdc` — one rule per subsystem; `globs` = `applyTo`

Other tools — read `.github/instructions/**/*.instructions.md` when `applyTo` matches the file you edit.
