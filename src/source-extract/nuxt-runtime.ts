/** Nuxt / Vue script runtime hints (no LLM). */

export function extractNuxtRuntimeBullets(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  if (/\buseRoute\s*\(/.test(script)) push('`useRoute()` — `params`, `fullPath`');
  if (/\buseRouter\s*\(/.test(script)) push('`useRouter()` — programmatic navigation');
  if (/\buseNuxtApp\s*\(/.test(script)) push('`useNuxtApp()` — `$event`, `$listen`, `$offEvent` event bus');
  if (/\buseRuntimeConfig\s*\(/.test(script)) push('`useRuntimeConfig()` — server/public config');
  if (/\buseHead\s*\(|\buseSeoMeta\s*\(/.test(script)) push('`useHead` / `useSeoMeta` — document meta');
  if (/\buseAsyncPageData\s*\(/.test(script)) push('`useAsyncPageData(key, fetcher)` — page payload + error ref');
  if (/\buseFetch\s*\(/.test(script)) push('`useFetch` — HTTP via ofetch');
  if (/\buseAsyncData\s*\(/.test(script)) push('`useAsyncData` — async key + handler');
  if (/\bnavigateTo\s*\(/.test(script)) push('`navigateTo` — redirect');
  if (/\bdefinePageMeta\s*\(/.test(script)) push('`definePageMeta` — route meta');

  for (const m of script.matchAll(/\b(use\w+Store)\s*\(/g)) {
    push(`Pinia \`${m[1]}()\``);
  }
  for (const m of script.matchAll(/\b(onMounted|onBeforeMount|onUnmounted|onBeforeUnmount)\s*\(/g)) {
    push(`lifecycle \`${m[1]}()\``);
  }
  for (const m of script.matchAll(/\$(event|listen|offEvent)\s*\(\s*['"`]([^'"`\n]+)['"`]/g)) {
    const ev = m[2].length > 56 ? `${m[2].slice(0, 53)}…` : m[2];
    push(`event bus \`$${m[1]}('${ev}')\``);
  }

  return out.slice(0, 24);
}

/** Errors / HTTP failures without LLM (Nuxt createError + classic throws). */
export function extractDeterministicErrors(script: string, fileLabel?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const push = (line: string) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of script.matchAll(/throw\s+createError\s*\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    const inner = m[1].replace(/\s+/g, ' ');
    const code = inner.match(/statusCode:\s*(\d+)/)?.[1];
    const msg = inner.match(/statusMessage:\s*[`'"]([^`'"]*)[`'"]/)?.[1];
    const fatal = /fatal:\s*true/.test(inner) ? ', fatal' : '';
    push(
      `- \`createError\`${code ? ` **HTTP ${code}**` : ''}${msg ? ` — ${msg}` : ''}${fatal}${suffix}`
    );
  }

  for (const m of script.matchAll(/throw\s+new\s+(\w+)\s*\(\s*['"`]([^'"]{4,120})['"`]/g)) {
    push(`- \`${m[1]}\`: "${m[2]}"${suffix}`);
  }

  for (const m of script.matchAll(/Promise\.reject\s*\(\s*new\s+(\w+)\s*\(\s*['"`]([^'"]+)['"`]/g)) {
    push(`- \`Promise.reject\` → \`${m[1]}\`: "${m[2]}"${suffix}`);
  }

  return out;
}

/** Side effects for Danger Zone (browser, stores, network, events). */
export function extractSideEffectBullets(script: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of script.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)) {
    push('env', `reads \`process.env.${m[1]}\``);
  }
  for (const m of script.matchAll(/getenv\s*\(\s*['"]([^'"]+)['"]/g)) {
    push('env', `getenv('${m[1]}')`);
  }
  for (const m of script.matchAll(/(?:^|[^\w])env\s*\(\s*['"]([^'"]+)['"]/gm)) {
    push('env', `env('${m[1]}')`);
  }

  if (/\buseAsyncPageData\s*\(/.test(script)) {
    push('network', '`useAsyncPageData` — store/API fetch; check `error` ref');
  }
  if (/\buseFetch\s*\(/.test(script)) push('network', '`useFetch` / ofetch');
  if (/\buseAsyncData\s*\(/.test(script)) push('network', '`useAsyncData`');
  for (const m of script.matchAll(/\b(store\w+)\.(fetch\w+|set\w+)\s*\(/g)) {
    push('store', `\`${m[1]}.${m[2]}()\` mutates or loads remote data`);
  }
  if (/\buseNuxtApp\s*\(/.test(script)) {
    push('events', '`useNuxtApp()` — global `$event` / `$listen` bus');
  }
  for (const m of script.matchAll(/\$(event|listen|offEvent)\s*\(\s*['"`]([^'"]+)['"`]/g)) {
    push('events', `\`$${m[1]}('${m[2]}')\``);
  }
  if (/\bwindow\.(addEventListener|removeEventListener)/.test(script)) {
    push('browser', '`window` scroll/DOM listeners — cleanup in `onBeforeUnmount`');
  }
  if (/\blocalStorage\b|\bsessionStorage\b|\buseCookie\s*\(/.test(script)) {
    push('storage', 'persistent client storage');
  }
  if (/\buseRuntimeConfig\s*\(/.test(script) || /import\.meta\.env/.test(script)) {
    push('config', 'runtime config / `import.meta.env`');
  }
  if (/\bfetch\s*\(|\$fetch\s*\(/.test(script)) push('network', 'direct `fetch` / `$fetch`');
  if (/\bfs\.|readFileSync|writeFileSync/.test(script)) push('fs', 'filesystem I/O');

  return out.slice(0, 28);
}
