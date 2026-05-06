import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { ProviderConfig } from './providers/types';

/** `slim` = smaller prompts for local LLMs (truncated bodies + shorter root pass). */
export type ContextDepth = 'full' | 'slim';

export type BuildStrategy = 'llm' | 'hybrid' | 'deterministic';
export type OutputStyle = 'normal' | 'compact';

export interface Config {
  provider: ProviderConfig;
  maxFiles: number;
  maxInputTokens: number;
  contextDepth: ContextDepth;
  buildStrategy: BuildStrategy;
  /** Hybrid: how many subsystems get LLM notes (root always gets notes). */
  hybridMaxSubsystems: number;
  /** Hybrid notes mode: "subsystem" (summary) or "exports" (per exported function/class/const). */
  hybridNotesMode: 'subsystem' | 'exports';
  /** LLM output style: "compact" reduces verbosity (caveman-like). */
  outputStyle: OutputStyle;
}

interface ConfigFile {
  provider?: string;
  model?: string;
  apiKeyEnv?: string;
  baseUrl?: string;
  maxTokens?: number;
  maxFiles?: number;
  maxInputTokens?: number;
  contextDepth?: string;
  buildStrategy?: string;
  hybridMaxSubsystems?: number;
  hybridNotesMode?: string;
  outputStyle?: string;
}

// Hard limits per model — prevents 400 errors from exceeding model caps
export const MODEL_MAX_OUTPUT_TOKENS: Record<string, number> = {
  'gpt-4o': 16384,
  'gpt-4o-mini': 16384,
  'gpt-4.1': 32768,
  'gpt-4.1-mini': 32768,
  'o1': 100000,
  'o1-mini': 65536,
  'o3': 100000,
  'o3-mini': 100000,
  'claude-opus-4': 32768,
  'claude-opus-4-5': 32768,
  'claude-sonnet-4': 64000,
  'claude-sonnet-4-5': 64000,
  'claude-haiku-3-5': 8192,
  'claude-3-5-haiku': 8192,
  // Ollama / local OpenAI-compatible (conservative caps — many GGUF models are 4k–8k)
  'llama3.2': 8192,
  'llama3.2:latest': 8192,
  llama3: 8192,
  mistral: 8192,
  'mistral:latest': 8192,
  qwen2: 8192,
  'qwen2.5': 8192,
};

export function getModelMaxTokens(model: string): number {
  // Exact match first, then prefix match (e.g. 'gpt-4o-2024-11-20' → 'gpt-4o')
  if (MODEL_MAX_OUTPUT_TOKENS[model]) return MODEL_MAX_OUTPUT_TOKENS[model];
  for (const key of Object.keys(MODEL_MAX_OUTPUT_TOKENS)) {
    if (model.startsWith(key)) return MODEL_MAX_OUTPUT_TOKENS[key];
  }
  return 16384; // safe conservative default for unknown models
}

const OLLAMA_DEFAULT_BASE = 'http://127.0.0.1:11434/v1';

const PROVIDER_DEFAULTS: Record<string, { model: string; apiKeyEnv: string }> = {
  openai: { model: 'gpt-4o', apiKeyEnv: 'OPENAI_API_KEY' },
  anthropic: { model: 'claude-opus-4-5', apiKeyEnv: 'ANTHROPIC_API_KEY' },
  'openai-compat': { model: 'gpt-4o', apiKeyEnv: 'OPENAI_API_KEY' },
  /** `apiKeyEnv` empty — Ollama has no secret; OpenAI SDK still needs a dummy `apiKey` string internally. */
  ollama: { model: 'llama3.2', apiKeyEnv: '' },
};

/** Ollama does not use a real API key (see `openai.ts` placeholder). */
export function providerAllowsMissingApiKey(provider: ProviderConfig['provider']): boolean {
  return provider === 'ollama';
}

/** Detect if the user accidentally put an API key value instead of env var name. */
function looksLikeApiKey(value: string): boolean {
  return /^(sk-|sk-proj-|sk-ant-|gsk_|key-)/i.test(value) || value.length > 40;
}

function sanitizeApiKeyEnv(
  configValue: string | undefined,
  providerName: string,
  defaultEnv: string,
): string {
  if (providerName === 'ollama') return '';
  if (!configValue) return defaultEnv;
  if (looksLikeApiKey(configValue)) {
    process.stderr.write(
      `⚠ WARNING: apiKeyEnv in .context-graph.json looks like an actual API key, not an env var name.\n` +
      `  Move the key to .env as OPENAI_API_KEY=... and set apiKeyEnv to "OPENAI_API_KEY"\n` +
      `  Using default env var: ${defaultEnv}\n\n`
    );
    return defaultEnv;
  }
  return configValue;
}

export function loadConfig(projectRoot: string): Config {
  dotenv.config({ path: path.join(projectRoot, '.env') });
  if (projectRoot !== process.cwd()) {
    dotenv.config({ path: path.join(process.cwd(), '.env') });
  }

  const configPath = path.join(projectRoot, '.context-graph.json');
  let fileConfig: ConfigFile = {};

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as ConfigFile;
    } catch (e) {
      throw new Error(`Invalid .context-graph.json: ${(e as Error).message}`);
    }
  }

  // Priority: env vars > .context-graph.json > defaults
  const providerName = (
    process.env.CONTEXT_GRAPH_PROVIDER || fileConfig.provider || 'openai'
  ) as ProviderConfig['provider'];

  const defaults = PROVIDER_DEFAULTS[providerName] ?? PROVIDER_DEFAULTS['openai'];

  const baseUrlFromEnv = process.env.CONTEXT_GRAPH_BASE_URL ?? fileConfig.baseUrl;
  const baseUrl =
    baseUrlFromEnv ??
    (providerName === 'ollama' ? OLLAMA_DEFAULT_BASE : undefined);

  const depthEnv = process.env.CONTEXT_GRAPH_CONTEXT_DEPTH?.toLowerCase();
  const depthFile = fileConfig.contextDepth?.toLowerCase();
  let contextDepth: ContextDepth = 'full';
  if (depthEnv === 'slim' || depthEnv === 'full') contextDepth = depthEnv;
  else if (depthFile === 'slim' || depthFile === 'full') contextDepth = depthFile as ContextDepth;
  // Ollama no longer defaults to slim — deterministic fallback handles LLM failures

  const stratEnv = process.env.CONTEXT_GRAPH_BUILD_STRATEGY?.toLowerCase();
  const stratFile = fileConfig.buildStrategy?.toLowerCase();
  const parseStrategy = (v: string | undefined): BuildStrategy | null => {
    if (v === 'llm' || v === 'hybrid' || v === 'deterministic') return v;
    if (v === 'no-llm' || v === 'nolllm' || v === 'offline') return 'deterministic';
    return null;
  };
  const buildStrategy: BuildStrategy =
    parseStrategy(stratEnv) ??
    parseStrategy(stratFile) ??
    'llm';

  const hybridMax = (() => {
    const raw = parseInt(process.env.CONTEXT_GRAPH_HYBRID_MAX_SUBSYSTEMS ?? '', 10);
    const envVal = Number.isFinite(raw) && raw >= 0 ? raw : undefined;
    const fileVal = typeof fileConfig.hybridMaxSubsystems === 'number' ? fileConfig.hybridMaxSubsystems : undefined;
    const n = envVal ?? fileVal ?? 2;
    return Math.max(0, Math.min(50, n));
  })();

  const notesMode = (() => {
    const envVal = process.env.CONTEXT_GRAPH_HYBRID_NOTES_MODE?.toLowerCase();
    const fileVal = fileConfig.hybridNotesMode?.toLowerCase();
    const v = envVal ?? fileVal ?? 'subsystem';
    return v === 'exports' ? 'exports' : 'subsystem';
  })();

  const outputStyle = (() => {
    const envVal = process.env.CONTEXT_GRAPH_OUTPUT_STYLE?.toLowerCase();
    const fileVal = fileConfig.outputStyle?.toLowerCase();
    const v = envVal ?? fileVal ?? 'compact';
    return v === 'normal' ? 'normal' : 'compact';
  })();

  return {
    provider: {
      provider: providerName,
      model: process.env.CONTEXT_GRAPH_MODEL || fileConfig.model || defaults.model,
      apiKeyEnv: sanitizeApiKeyEnv(fileConfig.apiKeyEnv, providerName, defaults.apiKeyEnv),
      baseUrl,
      maxTokens: (() => {
        const model = process.env.CONTEXT_GRAPH_MODEL ?? fileConfig.model ?? defaults.model;
        const modelCap = getModelMaxTokens(model);
        const requested = (parseInt(process.env.CONTEXT_GRAPH_MAX_OUTPUT_TOKENS ?? '') || fileConfig.maxTokens) ?? modelCap;
        return Math.min(requested, modelCap);
      })(),
    },
    maxFiles: (parseInt(process.env.CONTEXT_GRAPH_MAX_FILES ?? '') || fileConfig.maxFiles) ?? 200,
    maxInputTokens: (parseInt(process.env.CONTEXT_GRAPH_MAX_INPUT_TOKENS ?? '') || fileConfig.maxInputTokens) ?? 80000,
    contextDepth,
    buildStrategy,
    hybridMaxSubsystems: hybridMax,
    hybridNotesMode: notesMode,
    outputStyle,
  };
}

export function initConfig(
  projectRoot: string,
  providerName?: string,
  model?: string
): boolean {
  const configPath = path.join(projectRoot, '.context-graph.json');
  if (fs.existsSync(configPath)) return false;

  const provider = providerName ?? 'openai';
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS['openai'];

  const defaultConfig: ConfigFile = {
    provider,
    model: model ?? defaults.model,
    maxFiles: 200,
    maxInputTokens: 80000,
    ...(provider === 'ollama'
      ? { baseUrl: OLLAMA_DEFAULT_BASE }
      : { apiKeyEnv: defaults.apiKeyEnv }),
  };

  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
  return true;
}

export async function initConfigInteractive(projectRoot: string): Promise<boolean> {
  const configPath = path.join(projectRoot, '.context-graph.json');
  if (fs.existsSync(configPath)) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prompt } = require('enquirer') as {
      prompt: (q: unknown) => Promise<{ provider: string; model?: string }>;
    };

    console.log('\n📋 Configure context-graph:\n');

    const answers = await prompt([
      {
        type: 'select',
        name: 'provider',
        message: 'Select LLM provider:',
        choices: [
          { name: 'openai', message: 'OpenAI (gpt-4o, o1, o3-mini)', hint: 'OPENAI_API_KEY' },
          {
            name: 'anthropic',
            message: 'Anthropic (claude-opus-4, claude-sonnet-4-5)',
            hint: 'ANTHROPIC_API_KEY',
          },
          {
            name: 'ollama',
            message: 'Ollama (local, http://127.0.0.1:11434/v1)',
            hint: 'no key required · pull model: ollama pull llama3.2',
          },
          {
            name: 'openai-compat',
            message: 'OpenAI-compatible (Together, DeepSeek, LM Studio, …)',
            hint: 'OPENAI_API_KEY + baseUrl',
          },
        ],
        initial: 0,
      },
      {
        type: 'input',
        name: 'model',
        message: 'Model name (leave empty for default):',
        initial: '',
      },
    ]);

    const provider = answers.provider;
    const model = answers.model || undefined;

    initConfig(projectRoot, provider, model);
    return true;
  } catch {
    // Non-interactive or cancelled — use defaults
    initConfig(projectRoot);
    return true;
  }
}
