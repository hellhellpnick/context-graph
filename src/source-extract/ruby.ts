/** Ruby symbol and require extraction. */

export function extractRubyImports(rb: string): string[] {
  const out: string[] = [];
  for (const rawLine of rb.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    const req = line.match(/^require(?:_relative)?\s+['"]([^'"]+)['"]/);
    if (req) out.push(req[1]);
  }
  return [...new Set(out.filter(Boolean))].sort();
}

export function extractRubySymbolLines(rb: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 3 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of rb.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.split('#')[0].trim();
    if (!line) continue;
    if (/^(?:class|module)\s+\w+/.test(line)) push(line.split(';')[0].trim());
    else if (/^def\s+(?:self\.)?\w+/.test(line)) push(line);
    else if (/^\s*(get|post|put|patch|delete)\s+['"]/.test(line)) push(line);
  }

  return out.slice(0, 120);
}
