/** C# symbol and import extraction. */

const TYPE_DECL =
  /^(?:(?:public|internal|private|protected)\s+)*(?:partial\s+|sealed\s+|static\s+|abstract\s+)*(?:class|interface|record|struct|enum)\s+\w+/;

/** Method/ctor; access modifier optional (defaults internal). `{` may be on next line. */
const MEMBER_SIG =
  /^(?:(?:public|private|protected|internal)\s+)?(?:(?:async|static|virtual|override|sealed|new|extern|partial)\s+)*(?:[\w.<>\[\],\s?]+\s+)(\w+)\s*\([^;]*\)\s*(?:=>|\{)?\s*$/;

const CONST_FIELD =
  /^(?:public|private|protected|internal)\s+(?:const|static readonly)\s+[\w.<>\[\],\s?]+\s+(\w+)\s*=/;

const CONTROL_FLOW =
  /^(?:if|while|for|switch|catch|else|return|lock|foreach|try|fixed|checked|unchecked)\b/;

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
    if (!t || t.startsWith('//') || t.startsWith('#')) continue;
    if (CONTROL_FLOW.test(t)) continue;
    if (/^using\s+(?!static)[\w.]+\s*;/.test(t)) continue;

    if (TYPE_DECL.test(t)) {
      push(t.split('{')[0].split(':')[0].trim());
      continue;
    }

    if (/\[(HttpGet|HttpPost|HttpPut|HttpDelete|Route)/i.test(t)) push(t);

    if (CONST_FIELD.test(t)) {
      push(t.split('=')[0].trim());
      continue;
    }

    if (MEMBER_SIG.test(t)) {
      push(t.split('{')[0].trim());
      continue;
    }

    // legacy: single-line method with opening brace on same line
    if (
      /^(?:(?:public|private|protected|internal)\s+)?.*\(.*\)\s*(?:=>|{)/.test(t) &&
      !CONTROL_FLOW.test(t)
    ) {
      push(t.split('{')[0].trim());
    }
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
