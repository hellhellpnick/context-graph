/** Python symbol and import extraction. */

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
    else if (/^@\w+(?:\.\w+)+\s*\(/.test(line) && line.length < 120) push(line);
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
