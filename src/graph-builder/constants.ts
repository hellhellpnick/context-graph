/** Shared constants for graph-builder. */

export const OUTPUT_FORMAT_INSTRUCTION = `
---
## MANDATORY OUTPUT FORMAT

You MUST wrap every output file in these exact delimiters. No prose outside the blocks.

<<<FILE: path/relative/to/project/root>>>
file content here
<<<EOF>>>

Start your response with the first <<<FILE: ...>>> block immediately.
Do NOT output any text, checklists, summaries, or explanations outside the file blocks.
Every file you produce must be wrapped. Multiple files = multiple blocks back-to-back.

Example:
<<<FILE: .github/instructions/copilot-instructions.md>>>
# My Project — Project Context Graph
...
<<<EOF>>>
<<<FILE: .github/instructions/index.md>>>
...
<<<EOF>>>
`;

export const SPLIT_DIRS = new Set(['src', 'lib', 'app', 'cmd', 'internal']);
export const MAX_SOURCE_FILES_PER_AUTO_SUBSYSTEM_DEFAULT = 4;
/** Default cap for `by-folder` grouping when config does not override. */
export const MAX_FILES_PER_FOLDER_SUBSYSTEM_DEFAULT = 48;

/**
 * Files that should NOT get their own instruction subsystem.
 * Documentation, non-code configs, lock-files, images, etc.
 * They are still present in the scan (for metadata.json / tree) but excluded from subsystem passes.
 */
export const INSTRUCTION_EXCLUDE_RE = [
  /^README(\..+)?$/i,
  /^EXAMPLES(\..+)?$/i,
  /^CONTRIBUTING(\..+)?$/i,
  /^CHANGELOG(\..+)?$/i,
  /^LICENSE(\..+)?$/i,
  /^CODE_OF_CONDUCT(\..+)?$/i,
  /^\.gitignore$/,
  /^\.gitattributes$/,
  /^\.editorconfig$/,
  /^\.prettierrc/,
  /^\.eslintrc/,
  /^eslint\.config\./,
  /^\.copilotignore$/,
  /^\.graph-context-ignore$/,
  /^\.env\.example$/,
  /^\.env\.schema$/,
  /^tsconfig(\..+)?\.json$/,
  /^jsconfig(\..+)?\.json$/,
  /^\.context-graph.*$/,
  /^\.babelrc/,
  /^\.browserslistrc$/,
  /^\.nvmrc$/,
  /^\.node-version$/,
  /^\.tool-versions$/,
  /^\.dockerignore$/,
  /^Procfile$/,
  /^jest\.config/,
  /^vitest\.config/,
  /^postcss\.config/,
  /^tailwind\.config/,
  /^vite\.config/,
  /^webpack\.config/,
  /^rollup\.config/,
  /^esbuild\.config/,
  /^turbo\.json$/,
  /\.lock$/,
  /lock\.json$/,
  /lock\.yaml$/,
  /\.md$/i,           // all markdown (docs) — core source files are .ts/.js/.py/.go etc.
  /\.ya?ml$/i,        // CI/infra YAML already covered by Tier 0 in root graph
  /\.toml$/i,         // pyproject.toml, Cargo.toml — config, not source
  /\.json$/i,         // package.json etc. — config
];

export const DIR_TO_INSTRUCTION_PREFIX: Record<string, string> = {
  src: 'core',
  lib: 'core',
  app: 'core',
  internal: 'core',
  cmd: 'core',
  'src/providers': 'infra',
  python: 'python',
  scripts: 'infra',
  '.github': 'infra',
};

export const MAX_MIRROR_INSTRUCTION_REL_LEN = 200;

export const SOURCE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|vue|py|go|rs|java|kt|cs|rb|php)$/i;

export const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 1.10, output: 4.40 },
  'o3': { input: 10.00, output: 40.00 },
  'o3-mini': { input: 1.10, output: 4.40 },
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'claude-opus-4-5': { input: 15.00, output: 75.00 },
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-sonnet-4-5': { input: 3.00, output: 15.00 },
  'claude-haiku-3-5': { input: 0.80, output: 4.00 },
  'claude-3-5-haiku': { input: 0.80, output: 4.00 },
};
