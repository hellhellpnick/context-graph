import fs from 'fs';
import path from 'path';

/**
 * Which AI tool entrypoints context-graph emits (adapters + tool-specific files).
 * Core graph (`.github/instructions/*.instructions.md`, index, path-index) is always built.
 */
export type InstructionTargetId =
  | 'copilot'
  | 'cursor'
  | 'claude'
  | 'agents'
  | 'gemini'
  | 'windsurf'
  | 'codex'
  | 'cline';

export const INSTRUCTION_TARGET_IDS: InstructionTargetId[] = [
  'copilot',
  'cursor',
  'claude',
  'agents',
  'gemini',
  'windsurf',
  'codex',
  'cline',
];

export const INSTRUCTION_TARGET_LABELS: Record<InstructionTargetId, string> = {
  copilot: 'GitHub Copilot (.github/copilot-instructions.md, .copilotignore)',
  cursor: 'Cursor (.cursor/rules/context-graph.mdc + ctxgraph--*.mdc per file)',
  claude: 'Claude Code (CLAUDE.md)',
  agents: 'Universal agents (AGENTS.md)',
  gemini: 'Gemini (GEMINI.md)',
  windsurf: 'Windsurf (.windsurf/rules/context-graph.md)',
  codex: 'OpenAI Codex (.codex/context-graph.md)',
  cline: 'Cline (.clinerules/context-graph.md)',
};

export interface DeterministicPreferences {
  instructionTargets: InstructionTargetId[];
  installAgents: boolean;
}

const TARGET_SET = new Set<string>(INSTRUCTION_TARGET_IDS);

export function isInstructionTargetId(v: string): v is InstructionTargetId {
  return TARGET_SET.has(v);
}

export function normalizeInstructionTargets(raw: unknown): InstructionTargetId[] | null {
  if (raw === 'all' || raw === '*') return [...INSTRUCTION_TARGET_IDS];
  if (!Array.isArray(raw)) return null;

  const out: InstructionTargetId[] = [];
  const seen = new Set<InstructionTargetId>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const key = item.trim().toLowerCase();
    if (key === 'all' || key === '*') return [...INSTRUCTION_TARGET_IDS];
    if (!isInstructionTargetId(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.length > 0 ? out : null;
}

export function parseInstructionTargetsEnv(envVal: string | undefined): InstructionTargetId[] | null {
  if (!envVal?.trim()) return null;
  if (envVal.trim().toLowerCase() === 'all') return [...INSTRUCTION_TARGET_IDS];
  const parts = envVal.split(/[,;\s]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  return normalizeInstructionTargets(parts);
}

export function parseInstallAgentsEnv(envVal: string | undefined): boolean | null {
  if (!envVal?.trim()) return null;
  const v = envVal.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return null;
}

export function instructionTargetsFromConfigFile(
  fileConfig: { instructionTargets?: unknown }
): InstructionTargetId[] | null {
  return normalizeInstructionTargets(fileConfig.instructionTargets);
}

export function installAgentsFromConfigFile(
  fileConfig: { installAgents?: unknown }
): boolean | null {
  return typeof fileConfig.installAgents === 'boolean' ? fileConfig.installAgents : null;
}

export function hasConfiguredInstructionTargets(
  fileConfig: { instructionTargets?: unknown }
): boolean {
  return instructionTargetsFromConfigFile(fileConfig) !== null;
}

export function hasConfiguredInstallAgents(fileConfig: { installAgents?: unknown }): boolean {
  return typeof fileConfig.installAgents === 'boolean';
}

export function isInstructionTargetEnabled(
  targets: InstructionTargetId[],
  id: InstructionTargetId
): boolean {
  return targets.includes(id);
}

type ConfigFileSlice = {
  instructionTargets?: unknown;
  installAgents?: unknown;
};

/** Persist no-llm user choices into `.context-graph.json` (merge, keep provider/model). */
export function persistDeterministicPreferences(
  projectRoot: string,
  prefs: DeterministicPreferences
): void {
  const configPath = path.join(projectRoot, '.context-graph.json');
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  existing.buildStrategy = 'deterministic';
  existing.instructionTargets = prefs.instructionTargets;
  existing.installAgents = prefs.installAgents;
  fs.writeFileSync(configPath, `${JSON.stringify(existing, null, 2)}\n`);
}

/** @deprecated use persistDeterministicPreferences */
export function saveInstructionTargetsToConfig(
  projectRoot: string,
  targets: InstructionTargetId[]
): void {
  persistDeterministicPreferences(projectRoot, {
    instructionTargets: targets,
    installAgents: false,
  });
}

function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function readPreferencesFromFile(fileConfig: ConfigFileSlice): DeterministicPreferences | null {
  const targets = instructionTargetsFromConfigFile(fileConfig);
  const installAgents = installAgentsFromConfigFile(fileConfig);
  if (!targets || installAgents === null) return null;
  return { instructionTargets: targets, installAgents };
}

export function needsInstructionTargetSetup(fileConfig: ConfigFileSlice): boolean {
  if (parseInstructionTargetsEnv(process.env.CONTEXT_GRAPH_INSTRUCTION_TARGETS)) return false;
  return !hasConfiguredInstructionTargets(fileConfig);
}

export function needsInstallAgentsSetup(fileConfig: ConfigFileSlice): boolean {
  if (parseInstallAgentsEnv(process.env.CONTEXT_GRAPH_INSTALL_AGENTS) !== null) return false;
  return !hasConfiguredInstallAgents(fileConfig);
}

export function needsDeterministicPreferencesSetup(fileConfig: ConfigFileSlice): boolean {
  return needsInstructionTargetSetup(fileConfig) || needsInstallAgentsSetup(fileConfig);
}

/** Ask which AI adapters to generate (does not write config — caller persists). */
export async function promptInstructionTargetsInteractive(opts?: {
  firstTimeNoGraph?: boolean;
}): Promise<InstructionTargetId[]> {
  if (!isInteractiveTerminal()) {
    return [...INSTRUCTION_TARGET_IDS];
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prompt } = require('enquirer') as {
      prompt: (q: unknown) => Promise<{ mode: string; tools?: string[] }>;
    };

    if (opts?.firstTimeNoGraph) {
      console.log(
        '\nNo instruction graph in this repo yet (.github/instructions/ missing).\n' +
          'Choices are saved to .context-graph.json — the graph will be created now.\n'
      );
    }
    console.log(
      '\nCore graph (.github/instructions/*.instructions.md, index, path-index) is always generated.\n' +
        'Choose which tool-specific entrypoints to emit:\n'
    );

    const { mode } = await prompt({
      type: 'select',
      name: 'mode',
      message: 'Which AI tools should receive generated entrypoints?',
      choices: [
        {
          name: 'all',
          message: 'All tools',
          hint: 'Copilot, Cursor, Claude, AGENTS, Gemini, Windsurf, Codex, Cline',
        },
        { name: 'pick', message: 'Choose specific tools…' },
      ],
      initial: 0,
    });

    if (mode === 'all') return [...INSTRUCTION_TARGET_IDS];

  // enquirer default indicator is always "✔" — use on/off glyphs so selection is visible.
    const multiselectSymbols = {
      indicator: {
        on: '(x)',
        off: '( )',
      },
    };

    const { tools } = await prompt({
      type: 'multiselect',
      name: 'tools',
      message: 'Select tools (Space = toggle, Enter = confirm):',
      hint: 'Checked (x) = included. Uncheck with Space before Enter.',
      choices: INSTRUCTION_TARGET_IDS.map(id => ({
        name: id,
        message: INSTRUCTION_TARGET_LABELS[id],
      })),
      initial: [...INSTRUCTION_TARGET_IDS],
      symbols: multiselectSymbols,
      validate(value: unknown) {
        const picked = Array.isArray(value) ? value : [];
        return picked.length > 0 || 'Pick at least one tool (Space to toggle)';
      },
    });

    const picked = (tools ?? []).filter(isInstructionTargetId);
    return picked.length > 0 ? picked : [...INSTRUCTION_TARGET_IDS];
  } catch {
    process.stderr.write('context-graph: target prompt cancelled — using all AI adapters.\n');
    return [...INSTRUCTION_TARGET_IDS];
  }
}

/** Ask whether to fetch agency-agents into `.github/agents/` (does not write config). */
export async function promptInstallAgentsInteractive(): Promise<boolean> {
  if (!isInteractiveTerminal()) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prompt } = require('enquirer') as {
      prompt: (q: unknown) => Promise<{ installAgents: string }>;
    };

    console.log(
      '\nRecommended agents are optional skill files (from agency-agents on GitHub).\n' +
        'They are matched to your stack and saved under .github/agents/.\n'
    );

    // `confirm` (y/N) often ignores keys in IDE terminals — use select + arrows/Enter.
    const { installAgents } = await prompt({
      type: 'select',
      name: 'installAgents',
      message: 'Download recommended agents into .github/agents/? (requires network)',
      choices: [
        { name: 'no', message: 'No — skip agent download' },
        { name: 'yes', message: 'Yes — download matched agents to .github/agents/' },
      ],
      initial: 0,
    });
    return installAgents === 'yes';
  } catch {
    process.stderr.write('context-graph: agents prompt cancelled — skipping agent download.\n');
    return false;
  }
}

export async function resolveInstructionTargets(opts: {
  fileConfig: ConfigFileSlice;
  promptIfMissing?: boolean;
  firstTimeNoGraph?: boolean;
}): Promise<InstructionTargetId[]> {
  const fromEnv = parseInstructionTargetsEnv(process.env.CONTEXT_GRAPH_INSTRUCTION_TARGETS);
  if (fromEnv) return fromEnv;

  const fromFile = instructionTargetsFromConfigFile(opts.fileConfig);
  if (fromFile) return fromFile;

  if (opts.promptIfMissing) {
    return promptInstructionTargetsInteractive({ firstTimeNoGraph: opts.firstTimeNoGraph });
  }

  return [...INSTRUCTION_TARGET_IDS];
}

export function resolveInstallAgents(fileConfig: ConfigFileSlice): boolean {
  const fromEnv = parseInstallAgentsEnv(process.env.CONTEXT_GRAPH_INSTALL_AGENTS);
  if (fromEnv !== null) return fromEnv;
  const fromFile = installAgentsFromConfigFile(fileConfig);
  if (fromFile !== null) return fromFile;
  return false;
}

/**
 * no-llm first-time / incomplete config: prompt for targets + agents, persist once.
 */
export async function ensureDeterministicSetup(opts: {
  projectRoot: string;
  fileConfig: ConfigFileSlice;
  interactive: boolean;
  graphExists: boolean;
}): Promise<{
  instructionTargets: InstructionTargetId[];
  installAgents: boolean;
  createdConfig: boolean;
  prompted: boolean;
}> {
  const existing = readPreferencesFromFile(opts.fileConfig);
  if (existing && !needsDeterministicPreferencesSetup(opts.fileConfig)) {
    return { ...existing, createdConfig: false, prompted: false };
  }

  const needsTargets = needsInstructionTargetSetup(opts.fileConfig);
  const needsAgents = needsInstallAgentsSetup(opts.fileConfig);
  const configPath = path.join(opts.projectRoot, '.context-graph.json');
  const hadConfig = fs.existsSync(configPath);

  let instructionTargets: InstructionTargetId[];
  let installAgents: boolean;

  if (opts.interactive) {
    console.log('\n📋 context-graph setup (no-llm)\n');
    if (needsTargets) {
      instructionTargets = await promptInstructionTargetsInteractive({
        firstTimeNoGraph: !opts.graphExists,
      });
    } else {
      instructionTargets =
        instructionTargetsFromConfigFile(opts.fileConfig) ?? [...INSTRUCTION_TARGET_IDS];
    }

    if (needsAgents) {
      installAgents = await promptInstallAgentsInteractive();
    } else {
      installAgents = resolveInstallAgents(opts.fileConfig);
    }
  } else {
    if (needsTargets) {
      instructionTargets = [...INSTRUCTION_TARGET_IDS];
      process.stderr.write(
        'context-graph: no instructionTargets in config — using all AI adapters (non-interactive).\n'
      );
    } else {
      instructionTargets =
        instructionTargetsFromConfigFile(opts.fileConfig) ?? [...INSTRUCTION_TARGET_IDS];
    }
    installAgents = false;
    if (needsAgents) {
      process.stderr.write(
        'context-graph: installAgents not set — skipping .github/agents/ (non-interactive).\n' +
          '  Set installAgents: true in .context-graph.json or CONTEXT_GRAPH_INSTALL_AGENTS=true\n'
      );
    }
  }

  persistDeterministicPreferences(opts.projectRoot, { instructionTargets, installAgents });

  if (!opts.interactive && !hadConfig) {
    process.stderr.write(
      'context-graph: created .context-graph.json (buildStrategy, instructionTargets, installAgents).\n'
    );
  }

  return {
    instructionTargets,
    installAgents,
    createdConfig: !hadConfig,
    prompted: true,
  };
}
