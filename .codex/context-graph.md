# context-graph — Codex supplement

**MUST** read `AGENTS.md` at repo root first — Codex loads it before every run.

Before grep, glob search, list_dir, or exploring the repo:

1. **LOCK** the file you will edit.
2. **MUST** open `.github/instructions/symbol-index.md` (name) or `.github/instructions/context-graph-path-index.md` (full path).
3. **MUST** open the matching `.github/instructions/**/*.instructions.md` (`applyTo` MUST match).
4. **MUST** read it — Signatures, Dependencies, Graph — before other source files.
5. **ONLY THEN** open repo sources cited in that instruction.

**BLOCKING:** Skip steps 2–4 → stop. Do NOT infer architecture from root entrypoints alone.
**Authority:** Subsystem `*.instructions.md` override guesses. Root files = routing hubs only.

### OpenAI Codex

- **Primary:** `AGENTS.md` at repo root (Codex concatenates from git root → cwd).
- **This file:** `.codex/context-graph.md` — supplemental; `AGENTS.md` wins if both exist.
- Codex reads instruction files **before** work — do not skip path-index step.
