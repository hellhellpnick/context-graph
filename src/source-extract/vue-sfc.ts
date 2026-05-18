/** Vue SFC script/template extraction. */
import { extractNuxtRuntimeBullets } from './nuxt-runtime';

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

export function extractVuePropKeys(script: string): string[] {
  const anchor = script.search(/defineProps\s*\(\s*\{/);
  if (anchor === -1) return [];

  let depth = 0;
  let blockStart = -1;
  for (let i = anchor; i < script.length; i++) {
    const ch = script[i];
    if (ch === '{') {
      if (depth === 0) blockStart = i + 1;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && blockStart >= 0) {
        const block = script.slice(blockStart, i);
        const keys: string[] = [];
        const seen = new Set<string>();
        // Top-level prop keys only (`  foo:`), skip nested `    type:` / `    default:`.
        for (const line of block.split('\n')) {
          const km = line.match(/^  (\w+)\s*:/);
          if (!km || seen.has(km[1])) continue;
          seen.add(km[1]);
          keys.push(km[1]);
        }
        return keys;
      }
    }
  }
  return [];
}

/**
 * Vue `<script setup>` symbols: props, composables, top-level const/ref/computed.
 * Used when there is no `export` (typical SFC).
 */
export function extractVueSymbolLines(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (t.length < 3 || seen.has(t)) return;
    seen.add(t);
    out.push(t.length > 280 ? `${t.slice(0, 277)}…` : t);
  };

  const propKeys = extractVuePropKeys(script);
  if (propKeys.length > 0) push(`props: ${propKeys.join(', ')}`);
  else if (/defineProps\s*</.test(script)) push('defineProps<...>()');
  else if (/defineProps\s*\(/.test(script)) push('defineProps(...)');

  for (const m of script.matchAll(/\bdefine(Emits|Model|Expose|Slots)\s*\([^)]*\)/g)) {
    push(m[0].replace(/\s+/g, ' ').slice(0, 200));
  }

  for (const m of script.matchAll(
    /^\s*const\s+(\w+)\s*=\s*(computed|ref|reactive|shallowRef|readonly|toRef|toRefs)\s*\(/gm
  )) {
    push(`const ${m[1]} = ${m[2]}(...)`);
  }

  for (const m of script.matchAll(/^\s*(?:async\s+)?function\s+(\w+)\s*\(/gm)) {
    push(`function ${m[1]}(...)`);
  }

  for (const rawLine of script.split('\n')) {
    const t = rawLine.trim();
    if (/^watch(?:Effect)?\s*\(/.test(t)) push(t.replace(/\s+/g, ' ').slice(0, 200));
    if (/^on(Mounted|Unmounted|BeforeMount|Updated|BeforeUnmount)\s*\(/.test(t)) {
      push(t.replace(/\s+/g, ' ').slice(0, 120));
    }
  }

  return out.slice(0, 80);
}

/** One-line template summary for instruction graphs. */
export function extractVueTemplateBrief(sfc: string): string | null {
  const m = sfc.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
  if (!m) return null;
  const one = (m[1] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!one) return null;
  return one.length > 220 ? `${one.slice(0, 217)}…` : one;
}

/**
 * Compact routing block for `.vue` in deterministic instructions.
 * No full script — names, props, runtime hooks only.
 */
export function buildVueRoutingSignatures(relPath: string, sfcContent: string): string[] {
  const { body } = scriptOrSelfForAnalysis(relPath, sfcContent);
  const lines: string[] = ['// Vue SFC — routing summary (open repo for implementation)'];

  const tpl = extractVueTemplateBrief(sfcContent);
  if (tpl) lines.push(`// template: ${tpl}`);

  const props = extractVuePropKeys(body);
  if (props.length > 0) {
    const shown = props.slice(0, 14);
    lines.push(`// props: ${shown.join(', ')}${props.length > shown.length ? '…' : ''}`);
  }

  const scriptLines = body.split('\n').length;
  const maxSymbols = scriptLines > 220 ? 10 : scriptLines > 120 ? 14 : 22;
  const symbols = extractVueSymbolLines(body);
  let symCount = 0;
  for (const s of symbols) {
    if (s.startsWith('props:')) continue;
    if (symCount >= maxSymbols) break;
    lines.push(`// ${s}`);
    symCount++;
  }
  const symbolTotal = symbols.filter(s => !s.startsWith('props:')).length;
  if (symbolTotal > maxSymbols) {
    lines.push(`// … +${symbolTotal - maxSymbols} more top-level symbols`);
  }
  const branches = extractVueComputedBranches(body);
  if (branches.length > 0) {
    lines.push(`// resolves: ${branches.slice(0, 6).join(' | ')}`);
  }

  const isNuxt = /\b(useNuxtApp|definePageMeta|navigateTo|useAsyncPageData|useFetch|useAsyncData)\b/.test(body);
  if (isNuxt) {
    const runtime = extractNuxtRuntimeBullets(body);
    if (runtime.length > 0) {
      lines.push('// runtime:');
      for (const r of runtime.slice(0, 8)) {
        const one = r.replace(/\s+/g, ' ').trim();
        lines.push(`// - ${one.length > 112 ? `${one.slice(0, 109)}…` : one}`);
      }
    }
  }

  const totalLines = sfcContent.split('\n').length;
  if (totalLines > 90) {
    lines.push(`// (${totalLines} lines in repo — instruction is routing-only)`);
  }

  return lines;
}

/** Tag/element branches from `return` inside `computed` (e.g. LinkTag resolver). */
export function extractVueComputedBranches(script: string): string[] {
  const branches: string[] = [];
  const seen = new Set<string>();
  for (const m of script.matchAll(/return\s+([^\n;]{1,96});/g)) {
    let v = m[1].trim();
    if (v === 'props' || v.startsWith('props.')) continue;
    if (v.includes('initialProps.')) {
      const sm = v.match(/initialProps\.(\w+)/);
      v = sm ? sm[1] : v;
    }
    v = v.replace(/['"`]/g, '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    branches.push(v.length > 48 ? `${v.slice(0, 45)}…` : v);
  }
  return branches.slice(0, 12);
}
