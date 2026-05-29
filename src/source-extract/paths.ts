import path from 'path';

/**
 * Markup / MSBuild / designer artifacts — keep in scan tree, omit from instruction subsystems.
 * Logic lives in `.cs`, `.xaml.cs`, ViewModels; dumping XAML/csproj into ## Source adds noise.
 */
export function isInstructionExcludedPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  const base = path.posix.basename(norm);
  if (/\.(xaml|axaml|csproj|props|targets|resw|pubxml)$/i.test(base)) return true;
  if (/\.Designer\.cs$/i.test(base) || /\.g\.cs$/i.test(base)) return true;
  if (/^packages\.config$/i.test(base)) return true;
  return false;
}

/** Prompt/message modules: prefer bundle + compact instructions (deterministic routing). */
export function isMessageOrPromptPath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  return (
    /(?:^|\/)(?:messages|prompts?)\//i.test(norm) ||
    /graph-create-agent/i.test(norm) ||
    /\/(?:prompt|messages)\./i.test(norm)
  );
}

/** CLI / command registration — collapse as executable, not LLM prompt template. */
export function isExecutableModulePath(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  return (
    /(?:^|\/)cli(?:\/|\.)/i.test(norm) ||
    /(?:^|\/)commands?\//i.test(norm) ||
    /(?:^|\/)hooks\.ts$/i.test(norm)
  );
}

/** `dev/composables/foo.ts`, `src/composables/bar.js`, etc. */
export function isComposableLikePath(relPath: string): boolean {
  return /(?:^|\/)composables\/[^/]+\.(?:[mc]?[jt]sx?|jsx?)$/i.test(relPath.replace(/\\/g, '/'));
}
