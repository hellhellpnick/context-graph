/**
 * Shared helpers for Vue SFC / PHP so scanner + deterministic graph use the same shapes.
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
