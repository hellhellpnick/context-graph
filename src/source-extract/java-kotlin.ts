/** Java / Kotlin symbol and import extraction. */

export function extractJavaKotlinImports(src: string): string[] {
  const out: string[] = [];
  for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) {
    const t = rawLine.trim();
    if (!t || t.startsWith('//') || t.startsWith('/*')) continue;
    const pkg = t.match(/^package\s+([\w.]+)\s*;/);
    if (pkg) out.push(pkg[1]);
    const imp = t.match(/^import\s+(?:static\s+)?([\w.]+)\s*;/);
    if (imp) out.push(imp[1]);
  }
  return [...new Set(out.filter(Boolean))].sort();
}

export function extractJavaKotlinSymbolLines(src: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 4 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of src.replace(/\r\n/g, '\n').split('\n')) {
    const t = rawLine.trim();
    if (!t || t.startsWith('//') || t.startsWith('*')) continue;
    const cls = t.match(
      /^(?:public|private|protected|internal)?\s*(?:abstract\s+)?(?:open\s+)?(?:class|interface|record|enum)\s+(\w+)/
    );
    if (cls) {
      push(t.split('{')[0].trim());
      continue;
    }
    if (/[@(](Get|Post|Put|Delete|Patch|Request)Mapping/i.test(t)) push(t);
    if (/^fun\s+\w+/.test(t)) push(t.split('{')[0].trim());
    if (/^(?:public|private|protected).*\(.*\)\s*(?:throws|{|$)/.test(t) && /\w+\s*\(/.test(t)) {
      push(t.split('{')[0].trim());
    }
  }

  return out.slice(0, 120);
}
