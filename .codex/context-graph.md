# context-graph — Codex supplement

**MUST** read `AGENTS.md` at repo root first — Codex loads it before every run.

## MANDATORY — read instructions first (BLOCKING)

## MANDATORY — named file / component (Q&A)

If the user names a symbol **without** a full path (e.g. `LinkTag`, `useSeo`, `SongController`):

1. **MUST** open `.github/instructions/symbol-index.md` and search the **Lookup key** column (case-insensitive).
2. **MUST** open the **Instruction** path from that row under `.github/instructions/`.
3. **MUST** answer from **Signatures** / **Graph** in that file.
4. **ONLY IF** Signatures lack the fact: `read_file` the **Source path** from the same row.
5. **FORBIDDEN:** repo-wide `grep` / `Glob` / `search` **before** steps 1–3.

CLI: `context-graph resolve LinkTag` prints the instruction path (no grep).

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
