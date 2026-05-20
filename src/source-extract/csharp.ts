/** C# symbol and import extraction. */

export function extractCSharpSymbolLines(cs: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 4 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of cs.replace(/\r\n/g, '\n').split('\n')) {
    const t = rawLine.trim();
    if (!t || t.startsWith('//')) continue;
    const cls = t.match(
      /^(?:public|internal|private|protected)?\s*(?:partial\s+)?(?:class|interface|record|struct|enum)\s+(\w+)/
    );
    if (cls) {
      push(t.split('{')[0].trim());
      continue;
    }
    if (/\[(HttpGet|HttpPost|HttpPut|HttpDelete|Route)/i.test(t)) push(t);
    if (/^(?:public|private|protected|internal).*\(.*\)\s*(?:=>|{)/.test(t)) push(t.split('{')[0].trim());
  }
  return out.slice(0, 120);
}

/** `using Foo.Bar;`, `global using`, `using static`. */
export function extractCSharpImports(cs: string): string[] {
  const out: string[] = [];
  for (const rawLine of cs.replace(/\r\n/g, '\n').split('\n')) {
    const t = rawLine.trim();
    if (!t || t.startsWith('//')) continue;
    const m = t.match(/^(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/);
    if (m) out.push(m[1]);
  }
  return [...new Set(out.filter(Boolean))].sort();
}
