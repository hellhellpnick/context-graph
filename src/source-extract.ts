/**
 * Shared helpers for Vue / PHP / Python / Go so scanner + deterministic graph use the same shapes.
 */
import ts from 'typescript';

const SKELETON_MAX_CHARS = 4200;

function truncateSkeleton(s: string, max = 280): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
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

function isExecutableImplementationBody(text: string, filePath?: string): boolean {
  if (filePath && isExecutableModulePath(filePath)) return true;
  if (/register\w+Command\s*\(/.test(text) && /\.command\s*\(/.test(text)) return true;
  if (
    /\.command\s*\(/.test(text) &&
    /(writeFileSync|readFileSync|process\.exit|installPrePushHook|scanProject|buildGraph)/.test(text)
  ) {
    return true;
  }
  return false;
}

/** Large string templates embedded in TS (LLM pass messages, not runtime logic). */
export function isPromptTemplateBody(text: string, filePath?: string): boolean {
  if (isExecutableImplementationBody(text, filePath)) return false;
  const t = text.replace(/\s+/g, ' ');
  let signals = 0;
  if (/Run MODE:|<<<FILE:|OUTPUT_FORMAT|ANTI-HALLUCINATION|MANDATORY SECTIONS|buildNotesPrompt|buildSubsystemPassMessage/i.test(t)) {
    signals += 2;
  }
  if (/\]\s*\.join\s*\(\s*['"]\\n['"]\s*\)/.test(t)) signals++;
  if ((t.match(/`/g)?.length ?? 0) >= 14 && t.length > 500) signals++;
  return signals >= 2 || (signals >= 1 && t.length > 700);
}

/** One-line export for instruction graphs (collapse prompt bodies). */
export function compactTsExportLine(sf: ts.SourceFile, node: ts.Node, filePath?: string): string {
  const raw = node.getText(sf);
  const lineCount = raw.split('\n').length;
  const collapse = (label: string) => {
    const head = raw.split('{')[0]?.replace(/\s+/g, ' ').trim() ?? raw;
    const sig = head.length > 200 ? `${head.slice(0, 197)}…` : head;
    return `${sig} { ${label} }`;
  };

  if (!isPromptTemplateBody(raw, filePath)) {
    if (lineCount > 28 || raw.length > 520) {
      return collapse(`/* ~${lineCount} lines */`);
    }
    const t = raw.replace(/\s+/g, ' ').trim();
    return t.length > 240 ? `${t.slice(0, 237)}…` : t;
  }
  return collapse(`/* prompt template (~${lineCount} lines) */`);
}

function summarizeBlockBody(body: ts.Block, sf: ts.SourceFile, indent: string): string[] {
  const lines: string[] = [];
  for (const st of body.statements) {
    if (ts.isSwitchStatement(st)) {
      const expr = truncateSkeleton(st.expression.getText(sf), 48);
      lines.push(`${indent}switch (${expr}) {`);
      for (const clause of st.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) {
          const label = truncateSkeleton(clause.expression.getText(sf), 56);
          const ret = clause.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined;
          const retExpr = ret?.expression ? truncateSkeleton(ret.expression.getText(sf), 80) : '...';
          lines.push(`${indent}  case ${label}: return ${retExpr};`);
        } else if (ts.isDefaultClause(clause)) {
          const ret = clause.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined;
          const retExpr = ret?.expression ? truncateSkeleton(ret.expression.getText(sf), 80) : '...';
          lines.push(`${indent}  default: return ${retExpr};`);
        }
      }
      lines.push(`${indent}}`);
    } else if (ts.isIfStatement(st)) {
      lines.push(`${indent}if (${truncateSkeleton(st.expression.getText(sf), 72)}) { ... }`);
    } else if (ts.isReturnStatement(st) && st.expression) {
      const retText = st.expression.getText(sf);
      if (isPromptTemplateBody(retText)) {
        lines.push(`${indent}return /* prompt string */ \`...\`.join('\\n');`);
      } else {
        lines.push(`${indent}return ${truncateSkeleton(retText, 100)};`);
      }
    } else if (ts.isExpressionStatement(st)) {
      const t = truncateSkeleton(st.expression.getText(sf), 120);
      if (t) lines.push(`${indent}${t};`);
    }
  }
  return lines;
}

function summarizeCallable(
  fn: ts.ArrowFunction | ts.FunctionExpression,
  sf: ts.SourceFile,
  header: string,
  close = '}'
): string[] {
  if (ts.isBlock(fn.body)) {
    return [header, ...summarizeBlockBody(fn.body, sf, '  '), close];
  }
  return [`${header.replace(/\{\s*$/, '')} ${truncateSkeleton(fn.body.getText(sf), 160)} ${close}`];
}

/**
 * Function / method / composable skeleton from `<script>` or `.ts` (no LLM).
 * Expands `computed(() => { switch ... })` into readable structure.
 */
export function extractScriptSkeleton(script: string, virtualPath: string): string[] {
  if (!script.trim()) return [];

  let sf: ts.SourceFile;
  try {
    sf = ts.createSourceFile(virtualPath, script, ts.ScriptTarget.Latest, true);
  } catch {
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const pushBlock = (lines: string[]) => {
    const block = lines.join('\n');
    if (!block.trim() || seen.has(block)) return;
    seen.add(block);
    out.push(block);
  };

  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st)) {
      const expr = st.expression;
      if (ts.isCallExpression(expr)) {
        const callee = expr.expression.getText(sf);
        if (
          /^(use[A-Z]\w*|onMounted|onBeforeMount|onUnmounted|onBeforeUnmount|onUpdated|\$listen|\$event|\$offEvent)$/.test(
            callee
          )
        ) {
          const args = expr.arguments.map(a => truncateSkeleton(a.getText(sf), 48)).join(', ');
          pushBlock([`${callee}(${args});`]);
        }
      }
      continue;
    }

    if (ts.isIfStatement(st)) {
      const cond = truncateSkeleton(st.expression.getText(sf), 90);
      const bodyText = st.getText(sf);
      if (/throw\s+createError/.test(bodyText)) {
        const errM = bodyText.match(/throw\s+createError\s*\(\s*\{([\s\S]*?)\}\s*\)/);
        const inner = errM ? truncateSkeleton(errM[1].replace(/\s+/g, ' '), 120) : '...';
        pushBlock([`if (${cond}) throw createError({ ${inner} })`]);
      } else {
        pushBlock([`if (${cond}) { ... }`]);
      }
      continue;
    }

    if (ts.isFunctionDeclaration(st) && st.name) {
      const params = st.parameters.map(p => p.getText(sf)).join(', ');
      const asyncKw = st.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
      if (st.body) {
        pushBlock([
          `${asyncKw}function ${st.name.text}(${params}) {`,
          ...summarizeBlockBody(st.body, sf, '  '),
          '}',
        ]);
      } else {
        pushBlock([`${asyncKw}function ${st.name.text}(${params});`]);
      }
      continue;
    }

    if (!ts.isVariableStatement(st)) continue;

    for (const decl of st.declarationList.declarations) {
      const init = decl.initializer;

      if (ts.isObjectBindingPattern(decl.name)) {
        const bindings = decl.name.elements
          .map((e: ts.BindingElement) => e.getText(sf))
          .join(', ');
        if (!init) {
          pushBlock([`const { ${bindings} };`]);
          continue;
        }
        if (ts.isAwaitExpression(init)) {
          pushBlock([
            `const { ${bindings} } = await ${truncateSkeleton(init.expression.getText(sf), 260)}`,
          ]);
        } else {
          pushBlock([`const { ${bindings} } = ${truncateSkeleton(init.getText(sf), 220)}`]);
        }
        continue;
      }

      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!init) {
        pushBlock([`let ${name};`]);
        continue;
      }

      if (ts.isAwaitExpression(init)) {
        pushBlock([`const ${name} = await ${truncateSkeleton(init.expression.getText(sf), 280)}`]);
        continue;
      }

      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        const params = init.parameters.map(p => p.getText(sf)).join(', ');
        pushBlock(summarizeCallable(init, sf, `const ${name} = (${params}) => {`, '};'));
        continue;
      }

      if (ts.isArrayLiteralExpression(init) && init.elements.length >= 3) {
        const arrText = init.getText(sf);
        if (isPromptTemplateBody(arrText) || arrText.length > 400) {
          pushBlock([
            `const ${name} = [ /* template ×${init.elements.length} */ ].join('\\n');`,
          ]);
          continue;
        }
      }

      if (ts.isCallExpression(init)) {
        const callee = init.expression;
        const arg0 = init.arguments[0];
        if (ts.isIdentifier(callee)) {
          const calleeName = callee.text;
          if (calleeName === 'defineProps') {
            const keys = extractVuePropKeys(script);
            pushBlock([
              keys.length > 0
                ? `const ${name} = defineProps({ ${keys.join(', ')} })`
                : `const ${name} = defineProps(...)`,
            ]);
            continue;
          }
          if (
            (calleeName === 'computed' ||
              calleeName === 'watch' ||
              calleeName === 'watchEffect' ||
              calleeName === 'shallowRef' ||
              calleeName === 'ref') &&
            arg0 &&
            (ts.isArrowFunction(arg0) || ts.isFunctionExpression(arg0))
          ) {
            const params = arg0.parameters.map(p => p.getText(sf)).join(', ');
            pushBlock(
              summarizeCallable(arg0, sf, `const ${name} = ${calleeName}((${params}) => {`, '});')
            );
            continue;
          }
          if (
            (calleeName === 'computed' || calleeName === 'shallowRef' || calleeName === 'ref') &&
            arg0 &&
            !ts.isArrowFunction(arg0) &&
            !ts.isFunctionExpression(arg0)
          ) {
            pushBlock([
              `const ${name} = ${calleeName}(${truncateSkeleton(arg0.getText(sf), 160)})`,
            ]);
            continue;
          }
        }
      }

      const one = truncateSkeleton(`const ${name} = ${init.getText(sf)}`, 200);
      if (one) pushBlock([one]);
    }
  }

  const joined = out.join('\n\n');
  if (joined.length <= SKELETON_MAX_CHARS) return out;

  const trimmed: string[] = [];
  let used = 0;
  for (const block of out) {
    if (used + block.length > SKELETON_MAX_CHARS) break;
    trimmed.push(block);
    used += block.length + 2;
  }
  if (trimmed.length < out.length) {
    trimmed.push(`// ... ${out.length - trimmed.length} more symbol(s) omitted`);
  }
  return trimmed;
}

/** Score for auto split: one instruction file per “heavy” module (no LLM). */
export function instructionSplitScore(relPath: string, content: string, lines?: number): number {
  const norm = relPath.replace(/\\/g, '/');
  let score = 0;

  if (isComposableLikePath(norm)) return 100;

  const lineCount = lines ?? content.split('\n').length;

  // Prompt builders: bundle; routing uses compact signatures only.
  if (isMessageOrPromptPath(norm)) return 12;
  const inUiTree = /(?:^|\/)(components|pages|layouts|views|widgets|stores|middleware|plugins)\//i.test(
    norm
  );
  if (inUiTree && (!/\.vue$/i.test(norm) || lineCount > 38)) score += 16;
  if (/\.vue$/i.test(norm)) score += 20;
  if (/(?:^|\/)pages\//i.test(norm) && /\.vue$/i.test(norm)) score += 30;
  if (lineCount > 55) score += 12;
  if (lineCount > 95) score += 14;

  const { body, virtualPath } = scriptOrSelfForAnalysis(norm, content);
  if (!body.trim()) return score;

  const skeleton = extractScriptSkeleton(body, virtualPath);
  score += Math.min(24, skeleton.length * 5);

  if (/\.vue$/i.test(norm) || /\.(vue|ts|js)$/i.test(norm)) {
    if (extractVuePropKeys(body).length >= 4) score += 10;
    const computeds = [...body.matchAll(/const\s+\w+\s*=\s*computed\s*\(/g)].length;
    if (computeds >= 2) score += 14;
    if (computeds >= 1 && /switch\s*\(/.test(body)) score += 12;
    if (/\buseAsyncPageData\s*\(|\buseFetch\s*\(|\buseAsyncData\s*\(/.test(body)) score += 16;
    if (/\bthrow\s+createError\s*\(/.test(body)) score += 12;
    if (/\buseNuxtApp\s*\(/.test(body)) score += 10;
    if (/\buse\w+Store\s*\(/.test(body)) score += 8;
    if (/\$(event|listen|offEvent)\s*\(/.test(body)) score += 8;
    if (/\bwindow\.(addEventListener|removeEventListener)/.test(body)) score += 6;
  }

  return score;
}

export const INSTRUCTION_OWN_FILE_SCORE_THRESHOLD = 42;

/** `dev/composables/foo.ts`, `src/composables/bar.js`, etc. */
export function isComposableLikePath(relPath: string): boolean {
  return /(?:^|\/)composables\/[^/]+\.(?:[mc]?[jt]sx?|jsx?)$/i.test(relPath.replace(/\\/g, '/'));
}

/**
 * Concatenate `<script>` / `<script setup>` bodies from a Vue SFC.
 * Skips `type="application/json"` and similar non-JS blocks.
 */
export function extractVueScriptCombined(sfc: string): string {
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const parts: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sfc)) !== null) {
    const attrs = m[1] ?? '';
    if (/type\s*=\s*['"]?application\/(ld\+)?json/i.test(attrs)) continue;
    const body = (m[2] ?? '').trim();
    if (body) parts.push(body);
  }
  return parts.join('\n\n// __context_graph__: next <script> block __\n\n');
}

/**
 * For `.vue`, return extracted script + a virtual `.ts` path for the TS parser.
 * Otherwise return the file as-is.
 */
export function scriptOrSelfForAnalysis(
  relPath: string,
  content: string
): { body: string; virtualPath: string } {
  const norm = relPath.replace(/\\/g, '/');
  if (/\.vue$/i.test(norm)) {
    const script = extractVueScriptCombined(content);
    if (script.trim().length > 0) {
      return { body: script, virtualPath: norm.replace(/\.vue$/i, '.ts') };
    }
  }
  return { body: content, virtualPath: norm };
}

/** Nuxt composables / APIs used in script (for ## Runtime). */
export function extractNuxtRuntimeBullets(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  if (/\buseRoute\s*\(/.test(script)) push('`useRoute()` — `params`, `fullPath`');
  if (/\buseRouter\s*\(/.test(script)) push('`useRouter()` — programmatic navigation');
  if (/\buseNuxtApp\s*\(/.test(script)) push('`useNuxtApp()` — `$event`, `$listen`, `$offEvent` event bus');
  if (/\buseRuntimeConfig\s*\(/.test(script)) push('`useRuntimeConfig()` — server/public config');
  if (/\buseHead\s*\(|\buseSeoMeta\s*\(/.test(script)) push('`useHead` / `useSeoMeta` — document meta');
  if (/\buseAsyncPageData\s*\(/.test(script)) push('`useAsyncPageData(key, fetcher)` — page payload + error ref');
  if (/\buseFetch\s*\(/.test(script)) push('`useFetch` — HTTP via ofetch');
  if (/\buseAsyncData\s*\(/.test(script)) push('`useAsyncData` — async key + handler');
  if (/\bnavigateTo\s*\(/.test(script)) push('`navigateTo` — redirect');
  if (/\bdefinePageMeta\s*\(/.test(script)) push('`definePageMeta` — route meta');

  for (const m of script.matchAll(/\b(use\w+Store)\s*\(/g)) {
    push(`Pinia \`${m[1]}()\``);
  }
  for (const m of script.matchAll(/\b(onMounted|onBeforeMount|onUnmounted|onBeforeUnmount)\s*\(/g)) {
    push(`lifecycle \`${m[1]}()\``);
  }
  for (const m of script.matchAll(/\$(event|listen|offEvent)\s*\(\s*['"`]([^'"`\n]+)['"`]/g)) {
    const ev = m[2].length > 56 ? `${m[2].slice(0, 53)}…` : m[2];
    push(`event bus \`$${m[1]}('${ev}')\``);
  }

  return out.slice(0, 24);
}

/** Errors / HTTP failures without LLM (Nuxt createError + classic throws). */
export function extractDeterministicErrors(script: string, fileLabel?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const push = (line: string) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of script.matchAll(/throw\s+createError\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    const inner = m[1].replace(/\s+/g, ' ');
    const code = inner.match(/statusCode:\s*(\d+)/)?.[1];
    const msg = inner.match(/statusMessage:\s*[`'"]([^`'"]*)[`'"]/)?.[1];
    const fatal = /fatal:\s*true/.test(inner) ? ', fatal' : '';
    push(
      `- \`createError\`${code ? ` **HTTP ${code}**` : ''}${msg ? ` — ${msg}` : ''}${fatal}${suffix}`
    );
  }

  for (const m of script.matchAll(/throw\s+new\s+(\w+)\s*\(\s*['"`]([^'"]{4,120})['"`]/g)) {
    push(`- \`${m[1]}\`: "${m[2]}"${suffix}`);
  }

  for (const m of script.matchAll(/Promise\.reject\s*\(\s*new\s+(\w+)\s*\(\s*['"`]([^'"]+)['"`]/g)) {
    push(`- \`Promise.reject\` → \`${m[1]}\`: "${m[2]}"${suffix}`);
  }

  return out;
}

/** Side effects for Danger Zone (browser, stores, network, events). */
export function extractSideEffectBullets(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of script.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
    push('env', `reads \`process.env.${m[1]}\``);
  }
  for (const m of script.matchAll(/getenv\s*\(\s*['"]([^'"]+)['"]/g)) {
    push('env', `getenv('${m[1]}')`);
  }
  for (const m of script.matchAll(/(?:^|[^\w])env\s*\(\s*['"]([^'"]+)['"]/gm)) {
    push('env', `env('${m[1]}')`);
  }

  if (/\buseAsyncPageData\s*\(/.test(script)) {
    push('network', '`useAsyncPageData` — store/API fetch; check `error` ref');
  }
  if (/\buseFetch\s*\(/.test(script)) push('network', '`useFetch` / ofetch');
  if (/\buseAsyncData\s*\(/.test(script)) push('network', '`useAsyncData`');
  for (const m of script.matchAll(/\b(store\w+)\.(fetch\w+|set\w+)\s*\(/g)) {
    push('store', `\`${m[1]}.${m[2]}()\` mutates or loads remote data`);
  }
  if (/\buseNuxtApp\s*\(/.test(script)) {
    push('events', '`useNuxtApp()` — global `$event` / `$listen` bus');
  }
  for (const m of script.matchAll(/\$(event|listen|offEvent)\s*\(\s*['"`]([^'"]+)['"`]/g)) {
    push('events', `\`$${m[1]}('${m[2]}')\``);
  }
  if (/\bwindow\.(addEventListener|removeEventListener)/.test(script)) {
    push('browser', '`window` scroll/DOM listeners — cleanup in `onBeforeUnmount`');
  }
  if (/\blocalStorage\b|\bsessionStorage\b|\buseCookie\s*\(/.test(script)) {
    push('storage', 'persistent client storage');
  }
  if (/\buseRuntimeConfig\s*\(/.test(script) || /import\.meta\.env/.test(script)) {
    push('config', 'runtime config / `import.meta.env`');
  }
  if (/\bfetch\s*\(|\$fetch\s*\(/.test(script)) push('network', 'direct `fetch` / `$fetch`');
  if (/\bfs\.|readFileSync|writeFileSync/.test(script)) push('fs', 'filesystem I/O');

  return out.slice(0, 28);
}

/** Declarations useful for deterministic instruction graphs (not a full PHP parser). */
export function extractPhpSymbolLines(php: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 4 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of php.split('\n')) {
    const t = rawLine.trim();
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('#')) continue;

    if (/^(namespace|use)\s+/.test(t)) {
      if (/^use\s+function\s+/i.test(t)) continue;
      push(t.replace(/;+\s*$/, ''));
      continue;
    }

    const cls = t.match(/^(?:abstract\s+|final\s+)?(class|interface|trait|enum)\s+(\w+)\b/);
    if (cls) {
      push(`${cls[1]} ${cls[2]}`);
      continue;
    }

    if (/^(?:public|protected|private)\s+(?:static\s+)?function\s+\w+\s*\(/i.test(t)) {
      push(t);
      continue;
    }
    if (/^function\s+\w+\s*\(/i.test(t)) push(t);
  }

  return out.slice(0, 120);
}

/** Top-level `use Foo\Bar;` / `use A, B;` — first segment only per clause. */
export function extractPhpUseStatements(php: string): string[] {
  const out: string[] = [];
  const s = php.replace(/\r\n/g, '\n');
  const re = /^\s*use\s+([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const inner = m[1].trim();
    if (/^function\s+/i.test(inner)) continue;
    for (const part of inner.split(/\s*,\s*/)) {
      const head = part.replace(/\s+as\s+\w+$/i, '').trim();
      if (head) out.push(head);
    }
  }
  return [...new Set(out)].sort();
}

// ── Python ─────────────────────────────────────────────────────────────────

/** Top-level defs / classes (heuristic, not a full parser). */
export function extractPythonSymbolLines(py: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 3 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of py.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(rawLine)) continue;
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    if (/^(async\s+)?def\s+\w+\s*\(/.test(line)) push(line);
    else if (/^class\s+\w+/.test(line)) push(line.split(':')[0].trim());
    else if (/^@\w+/.test(line) && line.length < 120) push(line);
  }

  return out.slice(0, 120);
}

/** `import x` / `from pkg import` / relative `from ... import` (dependency hints). */
export function extractPythonImports(py: string): string[] {
  const out: string[] = [];
  for (const rawLine of py.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(rawLine)) continue;
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;

    const fromM = line.match(/^from\s+([\w.]+)\s+import\s+/);
    if (fromM) {
      out.push(fromM[1]);
      continue;
    }
    const relFrom = line.match(/^from\s+(\.+)\s*import\s+/);
    if (relFrom) {
      out.push(relFrom[1]);
      continue;
    }

    const importM = line.match(/^import\s+(.+)$/);
    if (importM) {
      const rest = importM[1].split(/\s+as\s+/i)[0].trim();
      for (const part of rest.split(',')) {
        const name = part.trim().split(/\s+/)[0];
        if (name) out.push(name);
      }
    }
  }
  return [...new Set(out.filter(Boolean))].sort();
}

// ── Go ───────────────────────────────────────────────────────────────────

function goStringContent(quoted: string): string {
  if (quoted.length < 2 || quoted[0] !== '"' || quoted[quoted.length - 1] !== '"') return '';
  return quoted.slice(1, -1).replace(/\\"/g, '"');
}

/** `import "path"`, `import alias "path"`, and `import ( ... )`. */
export function extractGoImports(go: string): string[] {
  const paths: string[] = [];
  const s = go.replace(/\r\n/g, '\n');

  for (const m of s.matchAll(/\bimport\s+\w+\s+("(?:\\.|[^"\\])*")/g)) {
    const p = goStringContent(m[1]);
    if (p) paths.push(p);
  }
  for (const m of s.matchAll(/\bimport\s+("(?:\\.|[^"\\])*")/g)) {
    const p = goStringContent(m[1]);
    if (p) paths.push(p);
  }

  let search = 0;
  while (search < s.length) {
    const pos = s.indexOf('import', search);
    if (pos === -1) break;
    if (pos > 0 && /[a-zA-Z0-9_]/.test(s[pos - 1]!)) {
      search = pos + 6;
      continue;
    }
    let i = pos + 6;
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (s[i] !== '(') {
      search = pos + 6;
      continue;
    }
    let depth = 1;
    const open = i;
    i++;
    while (i < s.length && depth > 0) {
      const c = s[i]!;
      if (c === '(') depth++;
      else if (c === ')') depth--;
      i++;
    }
    const inner = s.slice(open + 1, i - 1);
    for (const m of inner.matchAll(/"((?:\\.|[^"\\])*)"/g)) paths.push(m[1]);
    search = i;
  }

  return [...new Set(paths)].sort();
}

/** `package`, `func`, `type`, one-line `const` / `var` (heuristic). */
/** Prop keys from `defineProps({ key: ... })` (brace-balanced heuristic). */
export function extractVuePropKeys(script: string): string[] {
  const anchor = script.search(/defineProps\s*\(\s*\{/);
  if (anchor === -1) return [];

  let depth = 0;
  let blockStart = -1;
  for (let i = anchor; i < script.length; i++) {
    const ch = script[i];
    if (ch === '{') {
      if (depth === 0) blockStart = i + 1;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && blockStart >= 0) {
        const block = script.slice(blockStart, i);
        const keys: string[] = [];
        const seen = new Set<string>();
        // Top-level prop keys only (`  foo:`), skip nested `    type:` / `    default:`.
        for (const line of block.split('\n')) {
          const km = line.match(/^  (\w+)\s*:/);
          if (!km || seen.has(km[1])) continue;
          seen.add(km[1]);
          keys.push(km[1]);
        }
        return keys;
      }
    }
  }
  return [];
}

/**
 * Vue `<script setup>` symbols: props, composables, top-level const/ref/computed.
 * Used when there is no `export` (typical SFC).
 */
export function extractVueSymbolLines(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 3 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 280 ? `${t.slice(0, 277)}…` : t);
  };

  const propKeys = extractVuePropKeys(script);
  if (propKeys.length > 0) push(`props: ${propKeys.join(', ')}`);
  else if (/defineProps\s*</.test(script)) push('defineProps<...>()');
  else if (/defineProps\s*\(/.test(script)) push('defineProps(...)');

  for (const m of script.matchAll(/\bdefine(Emits|Model|Expose|Slots)\s*\([^)]*\)/g)) {
    push(m[0].replace(/\s+/g, ' ').slice(0, 200));
  }

  for (const m of script.matchAll(
    /^\s*const\s+(\w+)\s*=\s*(computed|ref|reactive|shallowRef|readonly|toRef|toRefs)\s*\(/gm
  )) {
    push(`const ${m[1]} = ${m[2]}(...)`);
  }

  for (const m of script.matchAll(/^\s*(?:async\s+)?function\s+(\w+)\s*\(/gm)) {
    push(`function ${m[1]}(...)`);
  }

  for (const rawLine of script.split('\n')) {
    const t = rawLine.trim();
    if (/^watch(?:Effect)?\s*\(/.test(t)) push(t.replace(/\s+/g, ' ').slice(0, 200));
    if (/^on(Mounted|Unmounted|BeforeMount|Updated|BeforeUnmount)\s*\(/.test(t)) {
      push(t.replace(/\s+/g, ' ').slice(0, 120));
    }
  }

  return out.slice(0, 80);
}

/** One-line template summary for instruction graphs. */
export function extractVueTemplateBrief(sfc: string): string | null {
  const m = sfc.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
  if (!m) return null;
  const one = (m[1] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!one) return null;
  return one.length > 220 ? `${one.slice(0, 217)}…` : one;
}

/**
 * Compact routing block for `.vue` in deterministic instructions.
 * No full script — names, props, runtime hooks only.
 */
export function buildVueRoutingSignatures(relPath: string, sfcContent: string): string[] {
  const { body } = scriptOrSelfForAnalysis(relPath, sfcContent);
  const lines: string[] = ['// Vue SFC — routing summary (open repo for implementation)'];

  const tpl = extractVueTemplateBrief(sfcContent);
  if (tpl) lines.push(`// template: ${tpl}`);

  const props = extractVuePropKeys(body);
  if (props.length > 0) {
    const shown = props.slice(0, 14);
    lines.push(`// props: ${shown.join(', ')}${props.length > shown.length ? '…' : ''}`);
  }

  const scriptLines = body.split('\n').length;
  const maxSymbols = scriptLines > 220 ? 10 : scriptLines > 120 ? 14 : 22;
  const symbols = extractVueSymbolLines(body);
  let symCount = 0;
  for (const s of symbols) {
    if (s.startsWith('props:')) continue;
    if (symCount >= maxSymbols) break;
    lines.push(`// ${s}`);
    symCount++;
  }
  const symbolTotal = symbols.filter(s => !s.startsWith('props:')).length;
  if (symbolTotal > maxSymbols) {
    lines.push(`// … +${symbolTotal - maxSymbols} more top-level symbols`);
  }
  const branches = extractVueComputedBranches(body);
  if (branches.length > 0) {
    lines.push(`// resolves: ${branches.slice(0, 6).join(' | ')}`);
  }

  const isNuxt = /\b(useNuxtApp|definePageMeta|navigateTo|useAsyncPageData|useFetch|useAsyncData)\b/.test(body);
  if (isNuxt) {
    const runtime = extractNuxtRuntimeBullets(body);
    if (runtime.length > 0) {
      lines.push('// runtime:');
      for (const r of runtime.slice(0, 8)) {
        const one = r.replace(/\s+/g, ' ').trim();
        lines.push(`// - ${one.length > 112 ? `${one.slice(0, 109)}…` : one}`);
      }
    }
  }

  const totalLines = sfcContent.split('\n').length;
  if (totalLines > 90) {
    lines.push(`// (${totalLines} lines in repo — instruction is routing-only)`);
  }

  return lines;
}

/** Tag/element branches from `return` inside `computed` (e.g. LinkTag resolver). */
export function extractVueComputedBranches(script: string): string[] {
  const branches: string[] = [];
  const seen = new Set<string>();
  for (const m of script.matchAll(/return\s+([^\n;]{1,96});/g)) {
    let v = m[1].trim();
    if (v === 'props' || v.startsWith('props.')) continue;
    if (v.includes('initialProps.')) {
      const sm = v.match(/initialProps\.(\w+)/);
      v = sm ? sm[1] : v;
    }
    v = v.replace(/['"`]/g, '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    branches.push(v.length > 48 ? `${v.slice(0, 45)}…` : v);
  }
  return branches.slice(0, 12);
}

export function extractGoSymbolLines(go: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 2 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of go.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.split('//')[0].trim();
    if (!line) continue;
    if (/^package\s+\w+/.test(line)) push(line);
    else if (/^func\s+/.test(line)) push(line);
    else if (/^type\s+\w+/.test(line)) push(line.split('{')[0].trim());
    else if (/^(const|var)\s+/.test(line) && !line.includes('{')) push(line);
  }

  return out.slice(0, 120);
}
