# context-graph — Cline routing

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

### Cline

- **Entry:** `.clinerules/context-graph.md` (workspace rules).
- Cline also reads `.cursor/rules/`, `AGENTS.md`, and `.windsurfrules` when present.
- **MUST** follow steps 2–4 before broad exploration.

## Also load

- `.github/instructions/copilot-instructions.md`
- `.github/instructions/context-graph-path-index.md`
