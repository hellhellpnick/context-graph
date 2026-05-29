# @hellpnick/context-graph — Project Context Graph

_Generated: 2026-05-29 · Stack: Node.js, TypeScript · **slim root** · **deterministic baseline**_

## How to use this graph

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

1. **LOCK** the file you will edit (e.g. the source path you edit).
2. **MUST** open `.github/instructions/symbol-index.md` (name) or `.github/instructions/context-graph-path-index.md` (full path).
3. **MUST** open the matching `.github/instructions/**/*.instructions.md` (`applyTo` MUST match).
4. **MUST** read it — Signatures, Dependencies, Graph — before other source files.
5. **ONLY THEN** open repo sources cited in that instruction.

**BLOCKING:** Skip steps 2–4 → stop. Do NOT infer architecture from root entrypoints alone.
**Authority:** Subsystem `*.instructions.md` override guesses. Root files = routing hubs only.

**GitHub Copilot (VS Code / JetBrains / Copilot CLI):** path-specific 
`.github/instructions/**/*.instructions.md` with `applyTo` frontmatter are loaded for matching files.
**MUST** use them — do not replace with blind repo search.

Deterministic baseline (no LLM).

1. Note the source file you edit (e.g. the source path you edit).
2. Open `.github/instructions/context-graph-path-index.md` and **search** that path (or basename).
3. Open the matching `.github/instructions/**/*.instructions.md` — frontmatter `applyTo` MUST match.
4. Read **Signatures**, **Dependencies**, **Graph** in that file; open repo source for bodies.
5. **Cursor:** `.cursor/rules/ctxgraph--*.mdc` attaches when `globs` match — follow that rule first.

**135** subsystem instruction file(s). Root = map + zones; detail = per-path `*.instructions.md`.
**Priority:** if several files match, **MUST** use higher priority **P0 > P1 > P2** (column in path-index).

## AI tools — where routing is enforced

| Tool | Entry file | Path-specific instructions | Enforcement |
|------|------------|----------------------------|-------------|
| **Cursor** | `.cursor/rules/context-graph.mdc` + `AGENTS.md` | `.cursor/rules/ctxgraph--*.mdc` (`globs` = `applyTo`) | Strong — always-on router + auto-attach |
| **Claude Code** | `CLAUDE.md` | Manual via path-index | Medium — file at session start |
| **GitHub Copilot** | `.github/copilot-instructions.md` | `.github/instructions/**/*.instructions.md` | Medium — IDE loads `applyTo` matches; not 100% |
| **Codex** | `AGENTS.md` | Same graph via path-index | Medium — loaded before each run |
| **Windsurf** | `.windsurf/rules/context-graph.md` | Optional mirrored rules | Medium — `trigger: always_on` |
| **Cline** | `.clinerules/context-graph.md` | Reads Cursor rules + `AGENTS.md` | Medium — workspace rules |
| **Gemini agent** | `GEMINI.md` | Same as Copilot agent | Medium — Copilot cloud agent only |

No tool **guarantees** 100% compliance. **MUST** blocks above are prompt-level — use path-specific `*.instructions.md` + Cursor `ctxgraph--*` for best results.

Sources: [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/concepts/prompting/response-customization), 
[Cursor rules](https://cursor.com/docs/rules), [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), 
[Windsurf rules](https://docs.windsurf.com/windsurf/cascade/memories).


## Quick Navigation

_Slim root (135 subsystems): use path-index for full `applyTo` routing — do not load every module from here._

**Full routing table** → `.github/instructions/context-graph-path-index.md` (135 rows)
**Grouped index** → `.github/instructions/index.md`

**How to route:** open the `*.instructions.md` whose `applyTo` matches the file you edit (see `.github/instructions/context-graph-path-index.md`).

### P0 / P1 highlights (top 40)
- **Cli** [P0] → `src/cli.instructions.md` — editing or refactoring `cli.ts`
- **Config** [P0] → `src/config.instructions.md` — editing or refactoring `config.ts`
- **Graph Builder** [P0] → `src/graph-builder.instructions.md` — editing or refactoring `graph-builder.ts`
- **Index** [P0] → `src/index.instructions.md` — editing or refactoring `index.ts`
- **Scanner** [P0] → `src/scanner.instructions.md` — editing or refactoring `scanner.ts`
- **Writer** [P0] → `src/writer.instructions.md` — editing or refactoring `writer.ts`
- **Actualize** [P1] → `src/cli/commands/actualize.instructions.md` — editing or refactoring `actualize.ts`
- **Agents** [P1] → `src/agents.instructions.md` — editing or refactoring `agents.ts`
- **Agents Install** [P1] → `src/cli/agents-install.instructions.md` — editing or refactoring `agents-install.ts`
- **Anthropic** [P1] → `src/providers/anthropic.instructions.md` — editing or refactoring `anthropic.ts`
- **Build** [P1] → `src/cli/commands/build.instructions.md` — editing or refactoring `build.ts`
- **Build Run** [P1] → `src/cli/build-run.instructions.md` — editing or refactoring `build-run.ts`
- **Constants** [P1] → `src/graph-builder/constants.instructions.md` — editing or refactoring `constants.ts`
- **Cost** [P1] → `src/graph-builder/cost.instructions.md` — editing or refactoring `cost.ts`
- **Cursor Rules** [P1] → `src/graph-builder/deterministic/cursor-rules.instructions.md` — editing or refactoring `cursor-rules.ts`
- **Deps Graph** [P1] → `src/graph-builder/extract/deps-graph.instructions.md` — editing or refactoring `deps-graph.ts`
- **Discovery** [P1] → `src/graph-builder/discovery.instructions.md` — editing or refactoring `discovery.ts`
- **Exports** [P1] → `src/graph-builder/extract/exports.instructions.md` — editing or refactoring `exports.ts`
- **Framework Extract** [P1] → `src/framework-extract.instructions.md` — editing or refactoring `framework-extract.ts`
- **Hook Check** [P1] → `src/cli/commands/hook-check.instructions.md` — editing or refactoring `hook-check.ts`
- **Hooks** [P1] → `src/hooks.instructions.md` — editing or refactoring `hooks.ts`
- **Impact** [P1] → `src/cli/commands/impact.instructions.md` — editing or refactoring `impact.ts`
- **Imports** [P1] → `src/graph-builder/extract/imports.instructions.md` — editing or refactoring `imports.ts`
- **Infer** [P1] → `src/graph-builder/plan/infer.instructions.md` — editing or refactoring `infer.ts`
- **Io** [P1] → `src/cli/io.instructions.md` — editing or refactoring `io.ts`
- **Layout** [P1] → `src/graph-builder/plan/layout.instructions.md` — editing or refactoring `layout.ts`
- **Metadata** [P1] → `src/graph-builder/deterministic/metadata.instructions.md` — editing or refactoring `metadata.ts`
- **Misc** [P1] → `src/graph-builder/extract/misc.instructions.md` — editing or refactoring `misc.ts`
- **Notes** [P1] → `src/graph-builder/llm/notes.instructions.md` — editing or refactoring `notes.ts`
- **Openai** [P1] → `src/providers/openai.instructions.md` — editing or refactoring `openai.ts`
- **Parse** [P1] → `src/graph-builder/plan/parse.instructions.md` — editing or refactoring `parse.ts`
- **Priority** [P1] → `src/graph-builder/plan/priority.instructions.md` — editing or refactoring `priority.ts`
- **Program** [P1] → `src/cli/program.instructions.md` — editing or refactoring `program.ts`
- **Project Root** [P1] → `src/project-root.instructions.md` — editing or refactoring `project-root.ts`
- **Repair** [P1] → `src/graph-builder/plan/repair.instructions.md` — editing or refactoring `repair.ts`
- **Resolve** [P1] → `src/cli/commands/resolve.instructions.md` — editing or refactoring `resolve.ts`
- **Resolve Symbol** [P1] → `src/graph-builder/resolve-symbol.instructions.md` — editing or refactoring `resolve-symbol.ts`
- **Review** [P1] → `src/cli/commands/review.instructions.md` — editing or refactoring `review.ts`
- **Root** [P1] → `src/graph-builder/deterministic/root.instructions.md` — editing or refactoring `root.ts`
- **Root Project** [P1] → `src/graph-builder/deterministic/root-project.instructions.md` — editing or refactoring `root-project.ts`

_+95 more subsystem(s) — see `.github/instructions/context-graph-path-index.md` (sort by P0/P1/P2)._

## Code zones

**Directory groups** (from 135 instruction files):
- `src/source-extract/**` — 15 instruction file(s), 15 source(s), best **P0**
- `src/**` — 13 instruction file(s), 13 source(s), best **P0**
- `src/graph-builder/**` — 7 instruction file(s), 7 source(s), best **P0**
- `src/cli/**` — 6 instruction file(s), 6 source(s), best **P0**
- `src/providers/**` — 4 instruction file(s), 4 source(s), best **P0**
- `src/cli/commands/**` — 8 instruction file(s), 8 source(s), best **P1**
- `src/graph-builder/deterministic/**` — 8 instruction file(s), 8 source(s), best **P1**
- `src/graph-builder/plan/**` — 6 instruction file(s), 6 source(s), best **P1**
- `src/graph-builder/extract/**` — 4 instruction file(s), 4 source(s), best **P1**
- `src/graph-builder/llm/**` — 2 instruction file(s), 2 source(s), best **P1**
- `scripts/**` — 1 instruction file(s), 1 source(s), best **P1**
- `.cursor/rules/**` — 51 instruction file(s), 136 source(s), best **P2**
- _… see `.github/instructions/context-graph-path-index.md` for full tree._

## Environment

- **Build:** `npm run build`
- **Test:** `npm test`
- **Stack:** Node.js, TypeScript

## Request / app flow

- **Entry / seed files:** `package.json`, `python/pyproject.toml`, `src/cli/index.ts`, `src/graph-builder/index.ts`, `src/index.ts`, `src/providers/index.ts`, `src/source-extract/index.ts`.
- Trace imports/callers in the subsystem `*.instructions.md` for the file you edit.

## Architecture Overview

Auto-generate AI context graphs for any codebase. One command, zero config.


## Module Contracts

- **Source of truth**: mirror `*.instructions.md` matched by `applyTo` (see `context-graph-path-index.md`).
- **Root policy**: routing hub only — open the subsystem file for the path you edit.
- **Do not** infer implementation from this file alone on large repos.

## Danger Zones 🔴

- `src/cli/commands/build.ts` — reads environment variables
- `src/config.ts` — reads environment variables
- `src/framework-extract.ts` — reads environment variables
- `src/graph-builder/prompt.ts` — reads environment variables
- `src/instruction-targets.ts` — reads environment variables
- `src/project-root.ts` — reads environment variables
- `src/providers/anthropic.ts` — reads environment variables
- `src/providers/openai.ts` — reads environment variables
- `src/source-extract/nuxt-runtime.ts` — reads environment variables

## Regenerating this graph

- **Deterministic (default):** `context-graph build --no-llm` — no API key; routing + signatures only.
- **Optional LLM notes:** `context-graph build --hybrid` or full `context-graph build`.
- **After large refactors:** re-run `build --no-llm` or `actualize --all` (LLM).
- **Large PHP/Laravel or Nuxt/Vue:** `subsystemGrouping: by-folder` in `.context-graph.json` (auto when detected).

---
_Instruction graph for this codebase. LLM enrichment optional (`build --hybrid`)._