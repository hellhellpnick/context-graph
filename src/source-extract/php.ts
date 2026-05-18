/** PHP routing and symbol extraction. */

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
    if (/^(namespace|use)\s+/.test(t)) continue;

    const cls = t.match(/^(?:abstract\s+|final\s+)?(class|interface|trait|enum)\s+(\w+)\b/);
    if (cls) {
      push(`${cls[1]} ${cls[2]}`);
      continue;
    }

    if (/^(?:public|protected|private)\s+(?:static\s+)?function\s+\w+\s*\(/i.test(t)) {
      push(t.replace(/\(\s*$/, '(…)'));
      continue;
    }
    if (/^function\s+\w+\s*\(/i.test(t)) push(t.replace(/\(\s*$/, '(…)'));
  }

  return out.slice(0, 120);
}

/** Balanced `(...)` after `function name` — supports multiline Laravel DI lists. */
export function extractPhpMethodParamNames(php: string, methodName: string): string[] {
  const anchor = new RegExp(
    `(?:public|protected|private)\\s+(?:static\\s+)?function\\s+${methodName}\\s*\\(`,
    'i'
  );
  const m = anchor.exec(php);
  if (!m) return [];

  let i = m.index + m[0].length;
  let depth = 1;
  let params = '';
  while (i < php.length && depth > 0) {
    const c = php[i]!;
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 1) params += c;
    i++;
  }

  const names: string[] = [];
  const seen = new Set<string>();
  for (const pm of params.matchAll(/\$(\w+)/g)) {
    if (!seen.has(pm[1]!)) {
      seen.add(pm[1]!);
      names.push(pm[1]!);
    }
  }
  return names;
}

/** JSON / array keys from `return response()->json([...])` (routing hint, not full payload). */
export function extractPhpJsonResponseKeys(php: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (k: string) => {
    if (!k || seen.has(k)) return;
    seen.add(k);
    keys.push(k);
  };

  const anchor = php.search(/return\s+response\s*\(\s*\)\s*->\s*json\s*\(\s*\[/i);
  if (anchor === -1) return keys;

  let i = php.indexOf('[', anchor);
  if (i === -1) return keys;
  let depth = 0;
  const start = i;
  while (i < php.length) {
    const c = php[i]!;
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  const block = php.slice(start, i + 1);
  for (const m of block.matchAll(/['"](\w+)['"]\s*=>/g)) push(m[1]!);
  return keys.slice(0, 20);
}

/**
 * Compact routing block for `.php` in deterministic instructions.
 * No full file — class, DI method summary, response keys, import count.
 */
export function buildPhpRoutingSignatures(relPath: string, php: string): string[] {
  const lines: string[] = ['// PHP — routing summary (open repo for implementation)'];

  const ns = php.match(/^\s*namespace\s+([^;]+);/m);
  if (ns) lines.push(`namespace ${ns[1].trim()};`);

  const cls = php.match(
    /^\s*(?:abstract\s+|final\s+)?(class|interface|trait|enum)\s+(\w+)(?:\s+extends\s+([\w\\]+))?/m
  );
  if (cls) {
    const ext = cls[3] ? ` extends ${cls[3].split('\\').pop()}` : '';
    lines.push(`${cls[1]} ${cls[2]}${ext}`);
  }

  const methodRe =
    /(?:public|protected|private)\s+(?:static\s+)?function\s+(\w+)\s*\(/gi;
  let mm: RegExpExecArray | null;
  const methods: string[] = [];
  while ((mm = methodRe.exec(php)) !== null) {
    methods.push(mm[1]!);
  }

  const maxMethods = php.split('\n').length > 120 ? 6 : 10;
  for (const name of methods.slice(0, maxMethods)) {
    const paramNames = extractPhpMethodParamNames(php, name);
    let paramSummary = '';
    if (paramNames.length > 0) {
      const shown =
        paramNames.length > 8
          ? `${paramNames.slice(0, 7).join(', ')}, +${paramNames.length - 7}`
          : paramNames.join(', ');
      paramSummary = ` — DI: ${shown}`;
    }
    lines.push(`public function ${name}(…)${paramSummary}`);
  }
  if (methods.length > maxMethods) {
    lines.push(`// … +${methods.length - maxMethods} more method(s)`);
  }

  const jsonKeys = extractPhpJsonResponseKeys(php);
  if (jsonKeys.length > 0) {
    const shown = jsonKeys.slice(0, 14);
    lines.push(
      `// response json keys: ${shown.join(', ')}${jsonKeys.length > shown.length ? '…' : ''}`
    );
  } else if (/return\s+view\s*\(/.test(php)) {
    lines.push('// returns: Blade view');
  } else if (/return\s+redirect\s*\(/.test(php)) {
    lines.push('// returns: redirect');
  }

  const uses = extractPhpUseStatements(php);
  if (uses.length > 0) {
    lines.push(`// imports: ${uses.length} (see ## Graph / Dependencies)`);
  }

  const lineCount = php.split('\n').length;
  if (lineCount > 55) {
    lines.push(`// (${lineCount} lines in repo — instruction is routing-only)`);
  }

  return lines;
}

/** One-line index row for capped PHP folder bundles. */
export function buildPhpOneLineSummary(relPath: string, php: string): string {
  const base = relPath.replace(/\\/g, '/').split('/').pop() ?? relPath;
  const cls = php.match(/^\s*(?:abstract\s+|final\s+)?(?:class|interface|trait|enum)\s+(\w+)/m);
  const methods: string[] = [];
  const re = /(?:public|protected|private)\s+(?:static\s+)?function\s+(\w+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(php)) !== null) methods.push(m[1]!);
  const uniq = [...new Set(methods)];
  let methodBit = '';
  if (uniq.length > 0) {
    const shown = uniq.length > 5 ? `${uniq.slice(0, 4).join(', ')} +${uniq.length - 4}` : uniq.join(', ');
    methodBit = ` · ${shown}`;
  }
  const kind = cls ? `${cls[1]}` : 'php';
  return `// ${base} — ${kind}${methodBit}`;
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
