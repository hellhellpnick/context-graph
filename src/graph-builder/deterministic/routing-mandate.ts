/** Imperative routing copy (MUST / BLOCKING) — no "when", "should", "prefer". */

export const ROUTING_MANDATE_HEADING = '## MANDATORY — read instructions first (BLOCKING)';

const SYMBOL_INDEX = '`.github/instructions/symbol-index.md`';
const PATH_INDEX = '`.github/instructions/context-graph-path-index.md`';
const SUBSYSTEM_GLOB = '`.github/instructions/**/*.instructions.md`';

/** When user names a component/file in chat (LinkTag, useSeo) — no file open. */
export function buildNamedEntityRoutingMandate(): string[] {
  return [
    `## MANDATORY — named file / component (Q&A)`,
    ``,
    `If the user names a symbol **without** a full path (e.g. \`LinkTag\`, \`useSeo\`, \`SongController\`):`,
    ``,
    `1. **MUST** open ${SYMBOL_INDEX} and search the **Lookup key** column (case-insensitive).`,
    `2. **MUST** open the **Instruction** path from that row under \`.github/instructions/\`.`,
    `3. **MUST** answer from **Signatures** / **Graph** in that file.`,
    `4. **ONLY IF** Signatures lack the fact: \`read_file\` the **Source path** from the same row.`,
    `5. **FORBIDDEN:** repo-wide \`grep\` / \`Glob\` / \`search\` **before** steps 1–3.`,
    ``,
    `CLI: \`context-graph resolve LinkTag\` prints the instruction path (no grep).`,
    ``,
  ];
}

/** Shared 5-step BLOCKING workflow. */
export function buildRoutingWorkflowSteps(examplePath?: string): string[] {
  const lock = examplePath
    ? `1. **LOCK** the file you will edit (e.g. ${examplePath}).`
    : `1. **LOCK** the file you will edit.`;
  return [
    `Before grep, glob search, list_dir, or exploring the repo:`,
    ``,
    lock,
    `2. **MUST** open ${SYMBOL_INDEX} (name) or ${PATH_INDEX} (full path).`,
    `3. **MUST** open the matching ${SUBSYSTEM_GLOB} (\`applyTo\` MUST match).`,
    `4. **MUST** read it — Signatures, Dependencies, Graph — before other source files.`,
    `5. **ONLY THEN** open repo sources cited in that instruction.`,
    ``,
    `**BLOCKING:** Skip steps 2–4 → stop. Do NOT infer architecture from root entrypoints alone.`,
    `**Authority:** Subsystem \`*.instructions.md\` override guesses. Root files = routing hubs only.`,
    ``,
  ];
}

/** After "## How to use this graph" in copilot-instructions.md */
export function buildCopilotGraphMandate(examplePath: string): string[] {
  return [
    ROUTING_MANDATE_HEADING,
    ``,
    ...buildNamedEntityRoutingMandate(),
    ...buildRoutingWorkflowSteps(examplePath),
    `**GitHub Copilot (VS Code / JetBrains / Copilot CLI):** path-specific `,
    `\`.github/instructions/**/*.instructions.md\` with \`applyTo\` frontmatter are loaded for matching files.`,
    `**MUST** use them — do not replace with blind repo search.`,
    ``,
  ];
}

/** Top of CLAUDE.md / AGENTS.md / GEMINI.md — immediately after title. */
export function buildAgentEntryMandate(): string[] {
  return [
    ROUTING_MANDATE_HEADING,
    ``,
    ...buildNamedEntityRoutingMandate(),
    ...buildRoutingWorkflowSteps(),
  ];
}

export type AgentEntryTool =
  | 'claude'
  | 'agents'
  | 'gemini'
  | 'codex'
  | 'windsurf'
  | 'cline'
  | 'copilot';

/** Tool-specific lines after shared mandate (docs-backed, May 2026). */
export function buildToolSpecificRoutingLines(tool: AgentEntryTool): string[] {
  switch (tool) {
    case 'claude':
      return [
        `### Claude Code`,
        ``,
        `- **Entry:** this \`CLAUDE.md\` (repo root).`,
        `- **Also:** GitHub Copilot cloud agent reads \`CLAUDE.md\` if present.`,
        `- **MUST** follow steps 2–4 above before \`grep\` / \`glob\` / reading arbitrary files.`,
        ``,
      ];
    case 'agents':
      return [
        `### Cursor / Codex / generic agents`,
        ``,
        `- **Cursor:** \`.cursor/rules/context-graph.mdc\` (\`alwaysApply: true\`) + \`ctxgraph--*.mdc\` per \`applyTo\`.`,
        `- **Codex:** loads \`AGENTS.md\` (this file) before every run — keep mandate at top.`,
        `- **Copilot agent:** reads \`AGENTS.md\`, \`CLAUDE.md\`, or \`GEMINI.md\` per GitHub docs.`,
        `- **MUST** follow steps 2–4 if subsystem rules did not auto-attach.`,
        ``,
      ];
    case 'gemini':
      return [
        `### Gemini`,
        ``,
        `- **Copilot cloud agent:** reads \`GEMINI.md\` at repo root (this file).`,
        `- **Gemini Code Assist (Google):** uses \`.gemini/config.yaml\` — not this file; mirror rules there if needed.`,
        `- **MUST** follow steps 2–4 above for agent-mode sessions.`,
        ``,
      ];
    case 'codex':
      return [
        `### OpenAI Codex`,
        ``,
        `- **Primary:** \`AGENTS.md\` at repo root (Codex concatenates from git root → cwd).`,
        `- **This file:** \`.codex/context-graph.md\` — supplemental; \`AGENTS.md\` wins if both exist.`,
        `- Codex reads instruction files **before** work — do not skip path-index step.`,
        ``,
      ];
    case 'windsurf':
      return [
        `### Windsurf Cascade`,
        ``,
        `- **Entry:** \`.windsurf/rules/context-graph.md\` (\`trigger: always_on\`).`,
        `- **Per-path:** mirror rules under \`.windsurf/rules/\` from \`ctxgraph--*\` if you sync them.`,
        `- **MUST** follow steps 2–4 if no matching Windsurf rule attached.`,
        ``,
      ];
    case 'cline':
      return [
        `### Cline`,
        ``,
        `- **Entry:** \`.clinerules/context-graph.md\` (workspace rules).`,
        `- Cline also reads \`.cursor/rules/\`, \`AGENTS.md\`, and \`.windsurfrules\` when present.`,
        `- **MUST** follow steps 2–4 before broad exploration.`,
        ``,
      ];
    case 'copilot':
      return [
        `### GitHub Copilot`,
        ``,
        `- **Repo hub:** \`.github/copilot-instructions.md\` + \`.github/instructions/copilot-instructions.md\`.`,
        `- **Path-specific:** \`.github/instructions/**/*.instructions.md\` — \`applyTo\` in frontmatter (VS Code, JetBrains, CLI, cloud agent).`,
        `- Code review may only ingest ~4k chars of root instructions — subsystem files matter.`,
        `- **MUST** open matching \`*.instructions.md\` for the file you edit; behavior is non-deterministic if you skip.`,
        ``,
      ];
    default:
      return [];
  }
}

export function buildAgentEntryWithTool(title: string, tool: AgentEntryTool): string[] {
  return [
    `# ${title}`,
    ``,
    ...buildAgentEntryMandate(),
    ...buildToolSpecificRoutingLines(tool),
  ];
}

/** Cursor always-on router rule body (no frontmatter). */
export function buildCursorRouterMandate(): string[] {
  return [
    `## MANDATORY routing (BLOCKING)`,
    ``,
    `**MUST** follow attached \`ctxgraph--*\` rule when \`globs\` match the file you edit.`,
    `If none attached: **MUST** complete path-index → subsystem \`*.instructions.md\` (steps in \`AGENTS.md\`) before broad repo search.`,
    ``,
  ];
}

/** Windsurf: always_on trigger (docs.windsurf.com — rules in .windsurf/rules/). */
export function buildWindsurfContextGraphRule(): string {
  const body = [
    `# context-graph — Windsurf routing (always on)`,
    ``,
    ...buildNamedEntityRoutingMandate(),
    ...buildRoutingWorkflowSteps(),
    ...buildToolSpecificRoutingLines('windsurf'),
    `## Also load`,
    ``,
    `- \`.github/instructions/copilot-instructions.md\``,
    `- ${PATH_INDEX}`,
    `- Matching ${SUBSYSTEM_GLOB}`,
    ``,
  ].join('\n');
  return ['---', 'trigger: always_on', '---', '', body].join('\n');
}

/** Cline workspace rule (no standard always-on frontmatter). */
export function buildClineContextGraphRule(): string {
  return [
    `# context-graph — Cline routing`,
    ``,
    ...buildRoutingWorkflowSteps(),
    ...buildToolSpecificRoutingLines('cline'),
    `## Also load`,
    ``,
    `- \`.github/instructions/copilot-instructions.md\``,
    `- ${PATH_INDEX}`,
    ``,
  ].join('\n');
}

/** Codex supplemental doc (AGENTS.md is primary). */
export function buildCodexContextGraphRule(): string {
  return [
    `# context-graph — Codex supplement`,
    ``,
    `**MUST** read \`AGENTS.md\` at repo root first — Codex loads it before every run.`,
    ``,
    ...buildRoutingWorkflowSteps(),
    ...buildToolSpecificRoutingLines('codex'),
  ].join('\n');
}

/** Compact matrix for copilot-instructions / human reference. */
export function buildAiToolRoutingReferenceSection(): string[] {
  return [
    `## AI tools — where routing is enforced`,
    ``,
    `| Tool | Entry file | Path-specific instructions | Enforcement |`,
    `|------|------------|----------------------------|-------------|`,
    `| **Cursor** | \`.cursor/rules/context-graph.mdc\` + \`AGENTS.md\` | \`.cursor/rules/ctxgraph--*.mdc\` (\`globs\` = \`applyTo\`) | Strong — always-on router + auto-attach |`,
    `| **Claude Code** | \`CLAUDE.md\` | Manual via path-index | Medium — file at session start |`,
    `| **GitHub Copilot** | \`.github/copilot-instructions.md\` | \`.github/instructions/**/*.instructions.md\` | Medium — IDE loads \`applyTo\` matches; not 100% |`,
    `| **Codex** | \`AGENTS.md\` | Same graph via path-index | Medium — loaded before each run |`,
    `| **Windsurf** | \`.windsurf/rules/context-graph.md\` | Optional mirrored rules | Medium — \`trigger: always_on\` |`,
    `| **Cline** | \`.clinerules/context-graph.md\` | Reads Cursor rules + \`AGENTS.md\` | Medium — workspace rules |`,
    `| **Gemini agent** | \`GEMINI.md\` | Same as Copilot agent | Medium — Copilot cloud agent only |`,
    ``,
    `No tool **guarantees** 100% compliance. **MUST** blocks above are prompt-level — use path-specific \`*.instructions.md\` + Cursor \`ctxgraph--*\` for best results.`,
    ``,
    `Sources: [GitHub Copilot custom instructions](https://docs.github.com/en/copilot/concepts/prompting/response-customization), `,
    `[Cursor rules](https://cursor.com/docs/rules), [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), `,
    `[Windsurf rules](https://docs.windsurf.com/windsurf/cascade/memories).`,
    ``,
  ];
}
