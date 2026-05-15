/**
 * Shared helpers for Vue / PHP / Python / Go so scanner + deterministic graph use the same shapes.
 */

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
