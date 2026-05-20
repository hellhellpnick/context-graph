/** Rust symbol and import extraction. */

export function extractRustImports(rs: string): string[] {
  const out: string[] = [];
  const s = rs.replace(/\r\n/g, '\n');

  for (const rawLine of s.split('\n')) {
    const line = rawLine.split('//')[0].trim();
    if (!line) continue;
    const useM = line.match(/^use\s+(?:crate::)?(\w+(?:::\w+)*)\s*(?:;|::\{)/);
    if (useM) out.push(useM[1]);
    const modM = line.match(/^mod\s+(\w+)\s*;/);
    if (modM) out.push(modM[1]);
    const extM = line.match(/^extern\s+crate\s+(\w+)/);
    if (extM) out.push(extM[1]);
  }

  return [...new Set(out.filter(Boolean))].sort();
}

export function extractRustSymbolLines(rs: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 3 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 240 ? `${t.slice(0, 237)}…` : t);
  };

  for (const rawLine of rs.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.split('//')[0].trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;
    if (/^(?:pub(?:\s+\w+)*\s+)?(?:async\s+)?fn\s+/.test(line)) push(line.split('{')[0].trim());
    else if (/^(?:pub\s+)?(?:struct|enum|trait|type)\s+\w+/.test(line)) push(line.split('{')[0].trim());
    else if (/^impl(?:<[^>]+>)?\s+/.test(line)) push(line.split('{')[0].trim());
    else if (/^(?:pub\s+)?(?:const|static)\s+/.test(line) && !line.includes('{')) push(line);
    else if (/^#\[(?:derive|get|post|put|delete|patch|route|handler)/i.test(line)) push(line);
  }

  return out.slice(0, 120);
}
