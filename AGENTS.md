# Agent Instructions

This repository uses **context-graph** to generate AI instructions.

Response style (ALWAYS):
- Ultra-compact (caveman). No greetings. No filler.
- Prefer bullets. Each bullet <= 18 words.
- If unsure, say "unknown" instead of guessing.

Start here:
- `.github/instructions/copilot-instructions.md` (root graph)
- `.github/instructions/index.md` (navigation)

If your tool supports VS Code-style instruction frontmatter, read all:
- `.github/instructions/**/*.instructions.md`

Routing rule:
- When working on a file, pick the instruction file whose frontmatter `applyTo` glob matches that path.
- If unsure, start at `.github/instructions/index.md` then open the referenced subsystem file.
