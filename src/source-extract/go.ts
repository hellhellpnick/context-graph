/** Go import and symbol extraction. */

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
