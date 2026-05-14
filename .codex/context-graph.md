# context-graph — AI routing entrypoint

This repo maintains a generated instruction graph under `.github/instructions/`.

Response style (ALWAYS):
- Ultra-compact (caveman). No greetings. No filler.
- Prefer bullets. Each bullet <= 18 words.
- If unsure, say "unknown" instead of guessing.

Always read first:
- `.github/instructions/copilot-instructions.md`
- `.github/instructions/context-graph-path-index.md` (flat map: instruction → `applyTo`)

Then route by file path:
- For a given edited file, open the `.instructions.md` whose frontmatter `applyTo` matches.
- If multiple match, prefer higher `priority` (P0>P1>P2).
- If none match, open `.github/instructions/index.md` or `context-graph-path-index.md`, then pick the subsystem.

All instruction files are authoritative over guesses. Prefer facts from instructions over assumptions.
