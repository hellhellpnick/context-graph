# @hellpnick/context-graph

**English** · [Русский](./README.ru.md)

CLI that turns a repository tree into an **AI routing graph**: `.github/instructions/` (per-subsystem `*.instructions.md`), root navigation, and optional tool-specific entrypoints (Cursor, Copilot, Claude Code, …).

- **`build --no-llm`** — fully offline: deterministic scan, no API key, CI-friendly.
- **`build` / `build --hybrid`** — optional LLM passes to enrich structure and notes when keys are configured.

## Requirements

- **Node.js 18+**
- A **git** repository at the project root (optional pre-push reminder hook).

Your app repo does **not** need TypeScript or `tsconfig`. The published package ships compiled `dist/`; the `typescript` dependency is for parsing `.ts` / `.vue` during scan.

## Install

```bash
npm install -D @hellpnick/context-graph
```

First run (no network):

```bash
npx context-graph build --no-llm
```

For cloud or local LLM: add keys to `.env`, or run interactive `build` once (without `--no-llm`) to create `.context-graph.json`.

## Quick start

```bash
# Target repo
cd /path/to/your-project
npx context-graph build --no-llm

# Or from anywhere
npx context-graph build --no-llm /path/to/your-project
```

Non-interactive CI (skip setup prompts):

```bash
export CONTEXT_GRAPH_INSTRUCTION_TARGETS=copilot,cursor
export CONTEXT_GRAPH_INSTALL_AGENTS=false
npx context-graph build --no-llm
```

## Generated artifacts

| Path | Role |
|------|------|
| `.github/instructions/` | Subsystem `*.instructions.md`, `index.md`, `context-graph-path-index.md`, optional `metadata.json` |
| `.github/copilot-instructions.md` | Root graph and navigation |
| `.copilotignore` | Standard ignore patterns written by build; also read on **next** scan |
| `.context-graph.json` | Provider, strategy, instruction targets, grouping (created on first interactive run) |
| `.context-graph-last-build` | Last build git ref for diff / `actualize` (optional in VCS) |

**Commit:** `.github/instructions/`, `.github/copilot-instructions.md`, `.copilotignore`, and any tool entrypoints you use (e.g. `.cursor/rules/`, `CLAUDE.md`).

**Do not commit:** `.env`, secrets, `.context-graph-last-build` (optional).

## Tool entrypoints (`instructionTargets`)

On `build`, short **routers** point agents at the graph instead of duplicating it:

| Path | Tool |
|------|------|
| `CLAUDE.md` | Claude Code |
| `AGENTS.md` | Cursor / Codex / generic agents |
| `GEMINI.md` | Gemini |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.codex/context-graph.md` | OpenAI Codex |
| `.windsurf/rules/context-graph.md` | Windsurf |
| `.clinerules/context-graph.md` | Cline |

Configure in `.context-graph.json`:

```json
{
  "instructionTargets": ["copilot", "cursor", "claude"],
  "installAgents": false
}
```

Or env: `CONTEXT_GRAPH_INSTRUCTION_TARGETS=copilot,cursor` (comma-separated, or `all`).

## Excluding paths from the graph

Scan order (later rules add to earlier):

1. `.gitignore`
2. `.copilotignore` (if present)
3. **`.graph-context-ignore`** or **`.context-graph-ignore`** (context-graph only; gitignore syntax)

Example for a large Laravel app (focus backend):

```gitignore
resources/**
docs/**
tests/**
*.min.js
```

Built-in **tier 3** always skips `node_modules/`, `vendor/`, lockfiles, binaries, etc.

**Subsystem pass:** `INSTRUCTION_EXCLUDE_RE` drops README, all `*.md`, lockfiles, and config-only names from per-file instructions (they may still appear in the tree/metadata).

> **Note:** `.copilotignore` affects **context-graph scanning** and is regenerated on build. GitHub Copilot’s official “content exclusion” is configured in GitHub settings, not necessarily via a repo file.

## Priority P0 / P1 / P2

Urgency for **context routing** (not business importance):

| Level | Meaning | Examples (`--no-llm`) |
|-------|---------|------------------------|
| **P0** | Load when editing this zone | `pages/*`, composables, entry CLI, API controllers |
| **P1** | Often needed | `package.json`, stores, core modules |
| **P2** | Rare / leaf | tests, small components, mocks |

Stored in: `priority:` frontmatter, `metadata.json`, and `context-graph-path-index.md`.

When several `*.instructions.md` match a file, prefer **higher** priority (P0 > P1 > P2).

## Cursor rules

With target `cursor` (default in many setups):

| Path | Role |
|------|------|
| `.cursor/rules/context-graph.mdc` | Global router (always on) |
| `.cursor/rules/ctxgraph--*.mdc` | One rule per subsystem; `globs` = `applyTo` |
| `.cursor/rules/README.context-graph.md` | Short explanation |
| `.cursor/rules/.context-graph-manifest` | Generated rule list |

Do **not** hand-edit `ctxgraph--*` — regenerate with `build`.

## Commands

| Command | Action |
|---------|--------|
| `build [dir]` | Full graph from scratch |
| `actualize [dir]` | Update from diff since last build (`--all` = full rescan) |
| `validate [dir]` | Exit `1` if graph is stale (CI) |
| `agents [dir]` | Fetch recommended agents into `.github/agents/` |
| `review [dir]` | LLM quality report (no writes) |
| `impact <file> [dir]` | LLM: blast radius of changing a file |
| `hook-check [dir]` | Used by git pre-push hook |

### `build` flags

| Flag | Effect |
|------|--------|
| `--no-llm` | Deterministic only |
| `--hybrid` | Scaffold + LLM notes on selected subsystems |
| `--provider` / `--model` | One-off override |
| `--subsystem-grouping default\|by-folder` | One instruction per directory (large monorepos) |
| `--subsystem-layout mirror\|canonical` | Path layout under `.github/instructions/` |
| `--dry-run` | List files without writing |
| `--no-hook` | Skip pre-push hook install |
| `--json` / `--quiet` | Machine / silent output |

## Build strategies

| Strategy | Config / CLI | Behavior |
|----------|----------------|----------|
| **deterministic** | `--no-llm` or `"buildStrategy": "deterministic"` | Scan + heuristics + PHP/Laravel routing extract; no network |
| **hybrid** | `--hybrid` or `"buildStrategy": "hybrid"` | Deterministic files + LLM notes on top subsystems |
| **llm** | default when API key present | Full multipass LLM plan |

**Large PHP / Laravel:** auto **`by-folder`** grouping when `artisan` + `composer.json` are detected (avoids one instruction per file under `app/`).

**Slim root:** `copilot-instructions.md` switches to a compact hub when the project has ≥40 subsystems or ≥80 source files (or when `contextDepth` is `slim`).

## Providers

| `provider` | When |
|------------|------|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `ollama` | Local `ollama serve` + model (no cloud key) |
| `openai-compat` | Custom `baseUrl` + `apiKeyEnv` |

**Precedence:** CLI flags → `CONTEXT_GRAPH_*` env → `.context-graph.json` → defaults.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `CONTEXT_GRAPH_ROOT` | Project root when cwd is not the repo |
| `CONTEXT_GRAPH_PROVIDER` | `openai` \| `anthropic` \| `ollama` \| `openai-compat` |
| `CONTEXT_GRAPH_MODEL` | Model id |
| `CONTEXT_GRAPH_BASE_URL` | OpenAI-compatible base URL |
| `CONTEXT_GRAPH_BUILD_STRATEGY` | `deterministic` \| `hybrid` \| `llm` |
| `CONTEXT_GRAPH_CONTEXT_DEPTH` | `slim` \| `full` (prompt size; `slim` default for ollama) |
| `CONTEXT_GRAPH_MAX_FILES` | Scan file cap (default 200) |
| `CONTEXT_GRAPH_MAX_INPUT_TOKENS` | Scan token budget (default 80000) |
| `CONTEXT_GRAPH_INSTRUCTION_TARGETS` | e.g. `copilot,cursor` or `all` |
| `CONTEXT_GRAPH_INSTALL_AGENTS` | `true` \| `false` |
| `CONTEXT_GRAPH_SUBSYSTEM_GROUPING` | `default` \| `by-folder` |
| `CONTEXT_GRAPH_SUBSYSTEM_LAYOUT` | `mirror` \| `canonical` |
| `CONTEXT_GRAPH_HYBRID_MAX_SUBSYSTEMS` | Hybrid LLM note count |
| `CONTEXT_GRAPH_OUTPUT_STYLE` | `normal` \| `compact` |

### Example `.context-graph.json`

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "buildStrategy": "deterministic",
  "contextDepth": "full",
  "subsystemGrouping": "by-folder",
  "instructionTargets": ["copilot", "cursor", "agents"],
  "installAgents": false,
  "maxFiles": 300,
  "maxInputTokens": 120000
}
```

## Scan tiers

| Tier | Treatment |
|------|-----------|
| **0** | CI, Docker, makefiles — full text (within budget) |
| **1** | Entrypoints & manifests (`package.json`, `composer.json`, `artisan`, …) — full |
| **2** | Source — **surface** (default ~30 lines; more for composables, Vue `<script>`, `.py`/`.go`) |
| **3** | Skipped — `node_modules`, `vendor`, locks, images, minified assets |

Exports/imports for deterministic mode use regex + TypeScript parser where applicable. **Python** (`.py`), **Go** (`.go`), and **C#** (`.cs`) get symbol lines and import/`using` hints in subsystem instructions without LLM; C# also gets ASP.NET runtime bullets (controllers, HTTP verbs, EF Core) when detected.

## Programmatic API

```ts
import { scanProject, buildGraph, writeOutputFiles, loadConfig } from '@hellpnick/context-graph';

const config = loadConfig(process.cwd());
const scan = await scanProject(process.cwd(), config.maxFiles, config.maxInputTokens);
const { files } = await buildGraph(scan, config, 'BUILD');
writeOutputFiles(files, process.cwd());
```

## Python wrapper

See [`python/README.md`](./python/README.md). Entrypoint `context-graph` in `python/pyproject.toml`; **Node 18+** is still required underneath.

## Developing this repo

```bash
git clone git@github.com:hellhellpnick/context-graph.git
cd context-graph
npm install
npm run build
npm test
npm link   # optional: test CLI in another project
```

## Links

- [graph-create-agent.md](./graph-create-agent.md) — LLM system prompt for graph passes
- [Copilot: custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

## License

MIT
