# @hellpnick/context-graph — Project Context Graph

_Generated: 2026-05-13 · Stack: Node.js, TypeScript, Python_

## Quick Navigation

**Context Graph** → `.github/instructions/python/context_graph/_bundle.instructions.md`
  When: editing or refactoring `__init__.py` · editing or refactoring `cli.py`
**Agents Catalog** → `.github/instructions/src/agents-catalog.instructions.md`
  When: editing or refactoring `agents-catalog.ts`
**Agents** → `.github/instructions/src/agents.instructions.md`
  When: editing or refactoring `agents.ts`
**Cli** → `.github/instructions/src/cli.instructions.md`
  When: editing or refactoring `cli.ts`
**Config** → `.github/instructions/src/config.instructions.md`
  When: editing or refactoring `config.ts`
**Graph Builder** → `.github/instructions/src/graph-builder.instructions.md`
  When: editing or refactoring `graph-builder.ts`
**Hooks** → `.github/instructions/src/hooks.instructions.md`
  When: editing or refactoring `hooks.ts`
**Index** → `.github/instructions/src/index.instructions.md`
  When: editing or refactoring `index.ts`
**Project Root** → `.github/instructions/src/project-root.instructions.md`
  When: editing or refactoring `project-root.ts`
**Scanner** → `.github/instructions/src/scanner.instructions.md`
  When: editing or refactoring `scanner.ts`
**Writer** → `.github/instructions/src/writer.instructions.md`
  When: editing or refactoring `writer.ts`
**Anthropic** → `.github/instructions/src/providers/anthropic.instructions.md`
  When: editing or refactoring `anthropic.ts`
**Openai** → `.github/instructions/src/providers/openai.instructions.md`
  When: editing or refactoring `openai.ts`
**Types** → `.github/instructions/src/providers/types.instructions.md`
  When: editing or refactoring `types.ts`

## Environment

- **Build:** `npm run build`
- **Test:** `(no test script detected)`
- **Stack:** Node.js, TypeScript, Python

## Workflows (no LLM required)

- **Build instructions**: `context-graph build --no-llm` (writes deterministic graph + installs hook).
- **Update instructions**: `context-graph actualize --all --dry-run` (preview) → drop `--dry-run` (apply).
- **CI check**: `context-graph validate` (exit 1 if instructions outdated).
- **On push**: pre-push hook runs `context-graph hook-check` (reminder; never blocks push).

## Config & Precedence

- **Main config**: `.context-graph.json` (created by `context-graph build` if missing).
- **Overrides**: CLI flags `--provider/--model` (highest precedence for build).
- **Env overrides**: `CONTEXT_GRAPH_PROVIDER`, `CONTEXT_GRAPH_MODEL` (read from `.env` / env).
- **Project root**: implicit `[dir]` uses Git repo root when the shell cwd is a subfolder (so outputs land in the real repo). Set `CONTEXT_GRAPH_ROOT` to an absolute workspace path to override (e.g. VS Code/Cursor terminal profile).
- **Scan exclusions**: optional `.graph-context-ignore` or `.context-graph-ignore` at repo root — same syntax as `.gitignore`; applied only to context-graph scanning (after `.gitignore` / `.copilotignore`).
- **Instruction paths**: `subsystemLayout` in `.context-graph.json`: `mirror` (default, paths mirror repo tree) or `canonical` (legacy `core/` / `infra/`). Env: `CONTEXT_GRAPH_SUBSYSTEM_LAYOUT`.
- **API key**: env var from config (`provider.apiKeyEnv`); Ollama allows missing key.

## Architecture Overview

Auto-generate AI context graphs for any codebase. One command, zero config.

- **Context Graph** (`python/context_graph/__init__.py`, `python/context_graph/cli.py`) — Mirror — `python/context_graph/` (2 files)
- **Agents Catalog** (`src/agents-catalog.ts`) — Mirror — `src/agents-catalog.ts`
  - `agents-catalog.ts`: Curated index of agency-agents (https://github.com/msitarzewski/agency-agents).
- **Agents** (`src/agents.ts`) — Mirror — `src/agents.ts`
- **Cli** (`src/cli.ts`) — Mirror — `src/cli.ts`
- **Config** (`src/config.ts`) — Mirror — `src/config.ts`
  - `config.ts`: `slim` = smaller prompts for local LLMs (truncated bodies + shorter root pass).
- **Graph Builder** (`src/graph-builder.ts`) — Mirror — `src/graph-builder.ts`
- **Hooks** (`src/hooks.ts`) — Mirror — `src/hooks.ts`
- **Index** (`src/index.ts`) — Mirror — `src/index.ts`
  - `index.ts`: Programmatic API — for embedding context-graph in other tools
- **Project Root** (`src/project-root.ts`) — Mirror — `src/project-root.ts`
  - `project-root.ts`: Git work tree root, or null if `cwd` is not inside a Git repository.
- **Scanner** (`src/scanner.ts`) — Mirror — `src/scanner.ts`
  - `scanner.ts`: Root files with gitignore-style rules, scanned after `.gitignore` / `.copilotignore`.
- **Writer** (`src/writer.ts`) — Mirror — `src/writer.ts`
  - `writer.ts`: Parse LLM response with multiple fallback strategies for different output formats.
- **Anthropic** (`src/providers/anthropic.ts`) — Mirror — `src/providers/anthropic.ts`
- **Index** (`src/providers/index.ts`) — Mirror — `src/providers/index.ts`
- **Openai** (`src/providers/openai.ts`) — Mirror — `src/providers/openai.ts`
- **Types** (`src/providers/types.ts`) — Mirror — `src/providers/types.ts`

## Dependency Graph

```mermaid
graph LR
  subgraph n_Infra__Tier_0_["Infra (Tier 0)"]
    n__copilotignore[".copilotignore"]
    n__env_example[".env.example"]
  end
  subgraph n_Entry___Seed__Tier_1_["Entry / Seed (Tier 1)"]
    n_package_json["package.json"]
    n_python_pyproject_toml["python/pyproject.toml"]
    n_src_index_ts["src/index.ts"]
    n_src_providers_index_ts["src/providers/index.ts"]
  end
  subgraph n_Code_Surface__Tier_2_["Code Surface (Tier 2)"]
    n__context_graph_json[".context-graph.json"]
    n__gitignore[".gitignore"]
    n_AGENTS_md["AGENTS.md"]
    n_CLAUDE_md["CLAUDE.md"]
    n_GEMINI_md["GEMINI.md"]
    n_LICENSE["LICENSE"]
    n_README_md["README.md"]
    n_graph_create_agent_md["graph-create-agent.md"]
    n_python_README_md["python/README.md"]
    n_python_README_md_instructions_md["python/README.md.instructions.md"]
    n_python_context_graph___init___py["python/context_graph/__init__.py"]
    n_python_context_graph_cli_py["python/context_graph/cli.py"]
    n_src_agents_catalog_ts["src/agents-catalog.ts"]
    n_src_agents_ts["src/agents.ts"]
    n_src_cli_ts["src/cli.ts 🔴"]
    n_src_config_ts["src/config.ts 🔴"]
    n_src_graph_builder_ts["src/graph-builder.ts 🔴"]
    n_src_hooks_ts["src/hooks.ts"]
    n_src_project_root_ts["src/project-root.ts 🔴"]
    n_src_providers_anthropic_ts["src/providers/anthropic.ts 🔴"]
    n_src_providers_openai_ts["src/providers/openai.ts 🔴"]
    n_src_providers_types_ts["src/providers/types.ts"]
    n_src_scanner_ts["src/scanner.ts"]
    n_src_writer_ts["src/writer.ts 🔴"]
    n_tsconfig_json["tsconfig.json"]
  end
  n_src_index_ts -->|"import"| n_src_config_ts
  n_src_index_ts -->|"import"| n_src_scanner_ts
  n_src_index_ts -->|"import"| n_src_project_root_ts
  n_src_index_ts -->|"import"| n_src_graph_builder_ts
  n_src_index_ts -->|"import"| n_src_writer_ts
  n_src_index_ts -->|"import"| n_src_hooks_ts
  n_src_index_ts -->|"import"| n_src_providers_index_ts
  n_src_index_ts -->|"import"| n_src_agents_ts
  n_src_index_ts -->|"import"| n_src_agents_catalog_ts
  n_src_providers_index_ts -->|"import"| n_src_providers_types_ts
  n_src_providers_index_ts -->|"import"| n_src_providers_openai_ts
  n_src_providers_index_ts -->|"import"| n_src_providers_anthropic_ts
  n_src_agents_ts -->|"import"| n_src_scanner_ts
  n_src_agents_ts -->|"import"| n_src_graph_builder_ts
  n_src_agents_ts -->|"import"| n_src_agents_catalog_ts
  n_src_cli_ts -->|"import"| n_src_config_ts
  n_src_cli_ts -->|"import"| n_src_scanner_ts
  n_src_cli_ts -->|"import"| n_src_graph_builder_ts
  n_src_cli_ts -->|"import"| n_src_project_root_ts
  n_src_cli_ts -->|"import"| n_src_writer_ts
  n_src_cli_ts -->|"import"| n_src_hooks_ts
  n_src_cli_ts -->|"import"| n_src_agents_ts
  n_src_config_ts -->|"import"| n_src_providers_types_ts
  n_src_graph_builder_ts -->|"import"| n_src_config_ts
  n_src_graph_builder_ts -->|"import"| n_src_providers_index_ts
  n_src_graph_builder_ts -->|"import"| n_src_providers_types_ts
  n_src_graph_builder_ts -->|"import"| n_src_scanner_ts
  n_src_graph_builder_ts -->|"import"| n_src_writer_ts
  n_src_hooks_ts -->|"import"| n_src_scanner_ts
  n_src_providers_anthropic_ts -->|"import"| n_src_providers_types_ts
  n_src_providers_openai_ts -->|"import"| n_src_providers_types_ts
```

## Data Flow

Entry points: `src/index.ts` → `src/providers/index.ts`

- **BUILD**: scanProject → buildGraphMultiPass/hybrid/deterministic → writeOutputFiles → saveLastBuildRef.
- **ACTUALIZE**: git diff since last ref → scanProject → buildGraph(mode=ACTUALIZE) → writeOutputFiles → saveLastBuildRef.
- **VALIDATE**: git diff since last ref → filterSignificantFiles → exit 1 if outdated.

## Module Contracts

- **Source of truth**: per-subsystem `*.instructions.md` files (open via Quick Navigation / index.md).
- **Root policy**: do not embed large signatures here; keep root fast to load.

## Danger Zones 🔴

- `src/cli.ts` — reads environment variables
- `src/config.ts` — reads environment variables
- `src/graph-builder.ts` — reads environment variables
- `src/project-root.ts` — reads environment variables
- `src/providers/anthropic.ts` — reads environment variables
- `src/providers/openai.ts` — reads environment variables

## Troubleshooting

- **Graph missing**: run `context-graph build --no-llm` (creates `.github/instructions/`).
- **Validate fails**: run `context-graph actualize --all` then commit instruction changes.
- **Wrong output folder**: you ran the CLI from a nested folder; use repo root cwd, or set `CONTEXT_GRAPH_ROOT`, or pass an explicit `context-graph build path/to/package` for a sub-root graph.
- **Actualize returns no files**: try `--all`; LLM mode needs configured provider/model/key.
- **Output parse issues**: model must emit only `<<<FILE: ...>>>` blocks (no prose).

---
_This file is auto-generated by context-graph. Descriptive prose is enriched by LLM when available._