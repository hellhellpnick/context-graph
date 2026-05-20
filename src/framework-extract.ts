/**
 * Framework-aware deterministic extraction (no LLM).
 * Vue, Nuxt, React, Next.js, Angular, Python, PHP, C#.
 */
import {
  extractCSharpSymbolLines,
  extractDeterministicErrors as extractJsErrors,
  extractNuxtRuntimeBullets,
  extractSideEffectBullets as extractJsSideEffects,
  INSTRUCTION_OWN_FILE_SCORE_THRESHOLD,
  instructionSplitScore,
  isComposableLikePath,
  scriptOrSelfForAnalysis,
} from './source-extract';

export { extractCSharpSymbolLines } from './source-extract';

export type FrameworkId =
  | 'nuxt'
  | 'vue'
  | 'react'
  | 'next'
  | 'angular'
  | 'python'
  | 'php'
  | 'csharp';

function dedupeLines(lines: string[], max = 32): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const t = l.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** Detect stacks present in a file (path + content). */
export function detectFrameworks(relPath: string, content: string): FrameworkId[] {
  const norm = relPath.replace(/\\/g, '/');
  const { body } = scriptOrSelfForAnalysis(norm, content);
  const found = new Set<FrameworkId>();

  if (/\.vue$/i.test(norm)) {
    if (/\b(useNuxtApp|definePageMeta|navigateTo|useAsyncPageData)\b/.test(body)) found.add('nuxt');
    else found.add('vue');
  }

  const isJsx = /\.(tsx|jsx)$/i.test(norm);
  const isAppRouter =
    /\/app\/.*\/(page|layout|loading|error|route)\.(tsx|jsx|ts|js)$/i.test(norm) ||
    /\/app\/.*\/route\.(ts|js)$/i.test(norm);
  const isPagesRouter = /\/pages\/.*\.(tsx|jsx|js|ts)$/i.test(norm);

  if (isJsx || (isAppRouter && /\.(tsx|jsx|ts|js)$/i.test(norm))) {
    if (
      /from\s+['"]next\//.test(body) ||
      /['"]use client['"]/.test(body) ||
      /['"]use server['"]/.test(body) ||
      /\b(notFound|redirect|revalidatePath|revalidateTag)\s*\(/.test(body) ||
      isAppRouter
    ) {
      found.add('next');
    }
    if (/\buseState\s*\(|\buseEffect\s*\(|\bfrom\s+['"]react['"]/.test(body)) found.add('react');
    if (!found.has('next') && !found.has('react') && isJsx) found.add('react');
  }

  if (/\.component\.(ts|html)$/i.test(norm) || /@Component\s*\(/.test(body) || /@Injectable\s*\(/.test(body)) {
    found.add('angular');
  }

  if (/\.py$/i.test(norm)) found.add('python');
  if (/\.php$/i.test(norm)) found.add('php');
  if (/\.cs$/i.test(norm)) found.add('csharp');

  return [...found];
}

function runtimeTitle(frameworks: FrameworkId[]): string {
  const labels: Record<FrameworkId, string> = {
    nuxt: 'Nuxt',
    vue: 'Vue',
    react: 'React',
    next: 'Next.js',
    angular: 'Angular',
    python: 'Python',
    php: 'PHP',
    csharp: 'C#',
  };
  if (frameworks.length === 0) return 'Runtime';
  return `Runtime (${frameworks.map(f => labels[f]).join(' / ')})`;
}

// ── Vue (non-Nuxt) ─────────────────────────────────────────────────────────

function extractVueRuntimeBullets(script: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/\buseRoute\s*\(/.test(script)) push('`vue-router` — `useRoute()`');
  if (/\buseRouter\s*\(/.test(script)) push('`vue-router` — `useRouter()`');
  if (/\bdefineComponent\s*\(/.test(script)) push('`defineComponent()` — options component');
  if (/\bdefineStore\s*\(/.test(script)) push('Pinia `defineStore()`');
  for (const m of script.matchAll(/\b(use\w+Store)\s*\(/g)) push(`Pinia \`${m[1]}()\``);
  if (/\bmapState\s*\(|\bmapActions\s*\(/.test(script)) push('Vuex `mapState` / `mapActions`');
  for (const m of script.matchAll(/\b(onMounted|onUnmounted|onBeforeUnmount|watch|watchEffect)\s*\(/g)) {
    push(`lifecycle \`${m[1]}()\``);
  }
  return out;
}

// ── React ────────────────────────────────────────────────────────────────────

function extractReactRuntimeBullets(script: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/\buseState\s*\(/.test(script)) push('`useState` — local state');
  if (/\buseReducer\s*\(/.test(script)) push('`useReducer`');
  if (/\buseEffect\s*\(/.test(script)) push('`useEffect` — side effects / subscriptions');
  if (/\buseLayoutEffect\s*\(/.test(script)) push('`useLayoutEffect`');
  if (/\buseMemo\s*\(|\buseCallback\s*\(/.test(script)) push('`useMemo` / `useCallback`');
  if (/\buseContext\s*\(/.test(script)) push('`useContext`');
  if (/\buseRef\s*\(/.test(script)) push('`useRef` — DOM / mutable ref');
  if (/\buseSelector\s*\(/.test(script)) push('Redux `useSelector`');
  if (/\buseDispatch\s*\(/.test(script)) push('Redux `useDispatch`');
  if (/\buseNavigate\s*\(|\buseParams\s*\(|\buseLocation\s*\(/.test(script)) {
    push('`react-router` — navigation hooks');
  }
  if (/\bcreateBrowserRouter\b|\b<Route\b/.test(script)) push('`react-router` — routing');
  return out;
}

// ── Next.js ────────────────────────────────────────────────────────────────

function extractNextRuntimeBullets(script: string, relPath: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  const norm = relPath.replace(/\\/g, '/');

  if (/['"]use client['"]/.test(script)) push('`use client` — Client Component');
  if (/['"]use server['"]/.test(script)) push('`use server` — Server Action / RSC boundary');
  if (/\buseRouter\s*\(/.test(script)) push('`next/navigation` — `useRouter()`');
  if (/\busePathname\s*\(|\buseSearchParams\s*\(/.test(script)) push('`next/navigation` — URL hooks');
  if (/\buseParams\s*\(/.test(script)) push('`useParams()` — dynamic route segments');
  if (/\bnotFound\s*\(/.test(script)) push('`notFound()` — 404 boundary');
  if (/\bredirect\s*\(/.test(script)) push('`redirect()` — navigation');
  if (/\bcookies\s*\(|\bheaders\s*\(/.test(script)) push('`next/headers` — `cookies()` / `headers()`');
  if (/\bgetServerSideProps\b/.test(script)) push('Pages router — `getServerSideProps`');
  if (/\bgetStaticProps\b/.test(script)) push('Pages router — `getStaticProps`');
  if (/\bgenerateMetadata\b/.test(script)) push('App router — `generateMetadata`');
  if (/\/app\/.*\/page\.(tsx|jsx)/i.test(norm)) push('App router — `page` segment');
  if (/\/app\/.*\/layout\.(tsx|jsx)/i.test(norm)) push('App router — `layout` segment');
  return out;
}

// ── Angular ────────────────────────────────────────────────────────────────

function extractAngularRuntimeBullets(script: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/@Component\s*\(/.test(script)) push('@Component — view class');
  if (/@Injectable\s*\(/.test(script)) push('@Injectable — DI service');
  if (/@Input\s*\(/.test(script)) push('@Input — parent → child binding');
  if (/@Output\s*\(/.test(script)) push('@Output — child events');
  if (/\bngOnInit\s*\(/.test(script)) push('lifecycle `ngOnInit()`');
  if (/\bngOnDestroy\s*\(/.test(script)) push('lifecycle `ngOnDestroy()` — unsubscribe');
  if (/\bActivatedRoute\b|\brouter\.navigate/.test(script)) push('`Router` / `ActivatedRoute`');
  if (/\bHttpClient\b/.test(script)) push('`HttpClient` — HTTP');
  if (/\bFormBuilder\b|\bFormGroup\b/.test(script)) push('Reactive forms');
  if (/\basync\s+pipe\b/i.test(script)) push('`async` pipe — observables in template');
  return out;
}

// ── Python ─────────────────────────────────────────────────────────────────

function extractPythonRuntimeBullets(py: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/@app\.(get|post|put|delete|patch)\s*\(/.test(py)) push('FastAPI route decorator');
  if (/\bAPIRouter\s*\(/.test(py)) push('FastAPI `APIRouter`');
  if (/@router\.(get|post)/.test(py)) push('FastAPI router method');
  if (/\bdef\s+\w+\s*\([^)]*request:\s*Request/.test(py)) push('Django / Starlette `Request`');
  if (/@login_required|@permission_required/.test(py)) push('Django auth decorators');
  if (/@app\.route\s*\(/.test(py)) push('Flask `@app.route`');
  if (/\bBlueprint\s*\(/.test(py)) push('Flask `Blueprint`');
  if (/\basync\s+def\s+\w+/.test(py)) push('async endpoints');
  if (/\bpytest\b|@\w+\.fixture/.test(py)) push('tests / fixtures');
  return out;
}

function extractPythonErrors(py: string, fileLabel?: string): string[] {
  const out: string[] = [];
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const seen = new Set<string>();
  const push = (line: string) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of py.matchAll(/raise\s+HTTPException\s*\(([^)]{0,200})\)/g)) {
    const inner = m[1].replace(/\s+/g, ' ');
    const code = inner.match(/status_code\s*=\s*(\d+)/)?.[1];
    push(`- \`HTTPException\`${code ? ` **HTTP ${code}**` : ''}${suffix}`);
  }
  for (const m of py.matchAll(/raise\s+(\w+(?:Error|Exception))\s*\(\s*['"]([^'"]{4,120})['"]/g)) {
    push(`- \`${m[1]}\`: "${m[2]}"${suffix}`);
  }
  return out;
}

function extractPythonSideEffects(py: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of py.matchAll(/os\.environ\b|os\.getenv\s*\(\s*['"]([^'"]+)['"]/g)) {
    push('env', m[1] ? `os.getenv('${m[1]}')` : 'os.environ');
  }
  if (/\brequests\.(get|post|put|delete)\b|\bhttpx\.|aiohttp\./.test(py)) {
    push('network', 'HTTP client (`requests` / `httpx` / `aiohttp`)');
  }
  if (/\bopen\s*\(|\bPath\s*\([^)]*\)\.read/.test(py)) push('fs', 'file read/write');
  if (/\bsqlite3\b|\bSession\s*\(|\.execute\s*\(/.test(py)) push('db', 'database query');
  if (/\bsubprocess\.|os\.system\s*\(/.test(py)) push('process', 'subprocess / shell');
  return out;
}

// ── PHP ────────────────────────────────────────────────────────────────────

function extractPhpRuntimeBullets(php: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/\bRoute::(get|post|put|delete|patch|any)\b/.test(php)) push('Laravel `Route::` definition');
  if (/\bextends\s+Controller\b/.test(php)) push('Laravel / Symfony controller');
  if (/#\[Route\s*\(/i.test(php) || /@Route\s*\(/i.test(php)) push('Symfony / PHP 8 attribute route');
  if (/\bpublic\s+function\s+__invoke\b/.test(php)) push('invokable controller');
  if (/\bEloquent\b|extends\s+Model\b/.test(php)) push('Eloquent model');
  if (/\bDB::/.test(php)) push('`DB::` facade / query builder');
  if (/\bview\s*\(|\breturn\s+view\s*\(/.test(php)) push('Blade / view render');
  if (/\bMail::|->queue\s*\(/.test(php)) push('mail / queue');
  return out;
}

function extractPhpErrors(php: string, fileLabel?: string): string[] {
  const out: string[] = [];
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const seen = new Set<string>();
  const push = (line: string) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of php.matchAll(/throw\s+new\s+((?:\\[\w]+|[\w\\])+)\s*\(\s*['"]([^'"]{4,120})['"]\s*\)/g)) {
    push(`- \`${m[1]}\`: "${m[2]}"${suffix}`);
  }
  for (const m of php.matchAll(/abort\s*\(\s*(\d+)/g)) {
    push(`- \`abort(${m[1]})\` — HTTP error${suffix}`);
  }
  for (const m of php.matchAll(/response\s*\(\s*\)\s*->\s*json\s*\([^,]+,\s*(\d{3})/g)) {
    push(`- JSON response **HTTP ${m[1]}**${suffix}`);
  }
  return out;
}

function extractPhpSideEffects(php: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of php.matchAll(/(?:^|[^\w])env\s*\(\s*['"]([^'"]+)['"]/gm)) {
    push('env', `env('${m[1]}')`);
  }
  for (const m of php.matchAll(/\$_ENV\s*\[\s*['"]([^'"]+)['"]\s*\]/g)) {
    push('env', `$_ENV['${m[1]}']`);
  }
  if (/\bDB::|->where\s*\(|Eloquent::/.test(php)) push('db', 'database query');
  if (/\bStorage::|file_get_contents\s*\(/.test(php)) push('fs', 'storage / filesystem');
  if (/\bHttp::(get|post)|GuzzleHttp|curl_/.test(php)) push('network', 'HTTP outbound');
  if (/\bMail::|->send\s*\(/.test(php)) push('mail', 'email send');
  if (/\bCache::|Redis::/.test(php)) push('cache', 'cache / Redis');
  return out;
}

// ── C# ─────────────────────────────────────────────────────────────────────

function extractCSharpRuntimeBullets(cs: string): string[] {
  const out: string[] = [];
  const push = (s: string) => out.push(s);
  if (/\[ApiController\]|\[Route\s*\(/.test(cs)) push('ASP.NET API controller');
  for (const m of cs.matchAll(/\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(?:\("([^"]*)"\))?\]/gi)) {
    push(`HTTP ${m[1].replace('Http', '').toUpperCase()}${m[2] ? ` "${m[2]}"` : ''}`);
  }
  if (/\bIActionResult\b|\bActionResult<.+>/.test(cs)) push('returns `IActionResult`');
  if (/\bControllerBase\b|\bController\b/.test(cs)) push('MVC / API controller base');
  if (/\bDbContext\b|\.SaveChangesAsync\s*\(/.test(cs)) push('EF Core `DbContext`');
  if (/\bIHostedService\b|\bBackgroundService\b/.test(cs)) push('background service');
  if (/\[Authorize/.test(cs)) push('`[Authorize]` — auth required');
  return out;
}

function extractCSharpErrors(cs: string, fileLabel?: string): string[] {
  const out: string[] = [];
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const seen = new Set<string>();
  const push = (line: string) => {
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const m of cs.matchAll(/throw\s+new\s+(\w+)\s*\(\s*"([^"]{4,120})"/g)) {
    push(`- \`${m[1]}\`: "${m[2]}"${suffix}`);
  }
  if (/\bNotFound\s*\(|\bNotFoundResult\b/.test(cs)) push(`- \`NotFound()\` / 404${suffix}`);
  if (/\bBadRequest\s*\(|\bBadRequestObjectResult\b/.test(cs)) push(`- \`BadRequest()\` — 400${suffix}`);
  return out;
}

function extractCSharpSideEffects(cs: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  if (/\bIConfiguration\b|Configuration\[/.test(cs)) push('config', '`IConfiguration`');
  for (const m of cs.matchAll(/Environment\.GetEnvironmentVariable\s*\(\s*"([^"]+)"/g)) {
    push('env', `Environment.GetEnvironmentVariable("${m[1]}")`);
  }
  if (/\bHttpClient\b|\.GetAsync\s*\(|\.PostAsync\s*\(/.test(cs)) push('network', '`HttpClient` HTTP');
  if (/\bFile\.|Directory\.|StreamReader/.test(cs)) push('fs', 'filesystem I/O');
  if (/\bDbContext\b|\.ExecuteSqlRaw|FromSqlRaw/.test(cs)) push('db', 'database');
  return out;
}

// ── JS framework side effects (React / Next / Vue) ─────────────────────────

function extractJsFrameworkSideEffects(script: string, frameworks: FrameworkId[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (tag: string, detail: string) => {
    const line = `- **[${tag}]** ${detail}`;
    if (seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  if (frameworks.includes('next')) {
    if (/\bnotFound\s*\(/.test(script)) push('http', '`notFound()` — renders 404');
    if (/\bredirect\s*\(/.test(script)) push('http', '`redirect()` — mutates navigation');
    if (/\bfetch\s*\(/.test(script) && /['"]use server['"]/.test(script)) {
      push('network', 'server `fetch` in Server Action / RSC');
    }
  }
  if (frameworks.includes('react') || frameworks.includes('next')) {
    if (/\buseEffect\s*\(/.test(script)) push('browser', '`useEffect` — subscriptions; return cleanup');
    if (/\bdocument\.|window\./.test(script)) push('browser', 'direct DOM / `window` access');
  }
  if (frameworks.includes('angular')) {
    if (/\bsubscribe\s*\(/.test(script)) push('rxjs', 'Observable `.subscribe()` — unsubscribe in `ngOnDestroy`');
  }

  return out;
}

function extractJsFrameworkErrors(script: string, frameworks: FrameworkId[], fileLabel?: string): string[] {
  const out = extractJsErrors(script, fileLabel);
  const suffix = fileLabel ? ` (\`${fileLabel}\`)` : '';
  const seen = new Set(out);

  if (frameworks.includes('next')) {
    if (/\bnotFound\s*\(/.test(script) && !seen.has(`- \`notFound()\` — 404${suffix}`)) {
      out.push(`- \`notFound()\` — 404${suffix}`);
    }
  }

  return out;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function extractRuntimeSection(
  relPath: string,
  content: string
): { title: string; bullets: string[] } {
  const frameworks = detectFrameworks(relPath, content);
  const { body } = scriptOrSelfForAnalysis(relPath, content);
  const bullets: string[] = [];

  for (const fw of frameworks) {
    switch (fw) {
      case 'nuxt':
        bullets.push(...extractNuxtRuntimeBullets(body));
        break;
      case 'vue':
        bullets.push(...extractVueRuntimeBullets(body));
        break;
      case 'react':
        bullets.push(...extractReactRuntimeBullets(body));
        break;
      case 'next':
        bullets.push(...extractNextRuntimeBullets(body, relPath));
        break;
      case 'angular':
        bullets.push(...extractAngularRuntimeBullets(body));
        break;
      case 'python':
        bullets.push(...extractPythonRuntimeBullets(content));
        break;
      case 'php':
        bullets.push(...extractPhpRuntimeBullets(content));
        break;
      case 'csharp':
        bullets.push(...extractCSharpRuntimeBullets(content));
        break;
    }
  }

  return { title: runtimeTitle(frameworks), bullets: dedupeLines(bullets) };
}

export function extractDeterministicErrorsForFile(
  relPath: string,
  content: string,
  fileLabel?: string
): string[] {
  const frameworks = detectFrameworks(relPath, content);
  const { body } = scriptOrSelfForAnalysis(relPath, content);
  const out: string[] = [];

  if (frameworks.includes('python')) out.push(...extractPythonErrors(content, fileLabel));
  if (frameworks.includes('php')) out.push(...extractPhpErrors(content, fileLabel));
  if (frameworks.includes('csharp')) out.push(...extractCSharpErrors(content, fileLabel));

  const jsLike = frameworks.some(f =>
    ['nuxt', 'vue', 'react', 'next', 'angular'].includes(f)
  );
  if (jsLike || /\.(tsx?|jsx?|mjs|cjs|vue)$/i.test(relPath)) {
    out.push(...extractJsFrameworkErrors(body, frameworks, fileLabel));
  } else if (!frameworks.length) {
    out.push(...extractJsErrors(content, fileLabel));
  }

  return dedupeLines(out, 24);
}

export function extractSideEffectsForFile(relPath: string, content: string): string[] {
  const frameworks = detectFrameworks(relPath, content);
  const { body } = scriptOrSelfForAnalysis(relPath, content);
  const out: string[] = [];

  if (frameworks.includes('python')) out.push(...extractPythonSideEffects(content));
  if (frameworks.includes('php')) out.push(...extractPhpSideEffects(content));
  if (frameworks.includes('csharp')) out.push(...extractCSharpSideEffects(content));

  const jsLike = frameworks.some(f =>
    ['nuxt', 'vue', 'react', 'next', 'angular'].includes(f)
  );
  if (jsLike || /\.(tsx?|jsx?|mjs|cjs|vue)$/i.test(relPath)) {
    out.push(...extractJsSideEffects(body));
    out.push(...extractJsFrameworkSideEffects(body, frameworks));
  } else if (!frameworks.length) {
    out.push(...extractJsSideEffects(content));
  }

  return dedupeLines(out, 32);
}

/** Extra split-score boosts per detected stack. */
export function frameworkSplitScoreBoost(relPath: string, content: string): number {
  const frameworks = detectFrameworks(relPath, content);
  const { body } = scriptOrSelfForAnalysis(relPath, content);
  let score = 0;

  const norm = relPath.replace(/\\/g, '/');
  if (/(?:^|\/)pages\/|\/app\/.*\/page\./i.test(norm)) score += 24;

  if (frameworks.includes('next')) {
    if (/\bnotFound\s*\(|\bredirect\s*\(/.test(body)) score += 10;
    if (/['"]use server['"]/.test(body)) score += 8;
  }
  if (frameworks.includes('react')) {
    if ([...body.matchAll(/\buseEffect\s*\(/g)].length >= 2) score += 8;
  }
  if (frameworks.includes('angular')) {
    if (/@Component\s*\(/.test(body) && /\bngOnInit\b/.test(body)) score += 12;
  }
  if (frameworks.includes('python')) {
    if (/@app\.(get|post)|async\s+def/.test(body)) score += 10;
    if (/raise\s+HTTPException/.test(body)) score += 10;
  }
  if (frameworks.includes('php')) {
    if (/\bRoute::|#\[Route/i.test(body)) score += 10;
    if (/\bDB::|Eloquent/.test(body)) score += 8;
  }
  if (frameworks.includes('csharp')) {
    if (/\[Http(Get|Post)/i.test(body)) score += 12;
    if (/\bDbContext\b/.test(body)) score += 8;
  }

  return score;
}

/** Import buckets for Dependencies section. */
export function classifyFrameworkImports(deps: string[]): {
  nuxt: string[];
  next: string[];
  angular: string[];
  external: string[];
} {
  const nuxt: string[] = [];
  const next: string[] = [];
  const angular: string[] = [];
  const external: string[] = [];

  for (const d of deps) {
    if (d.startsWith('#')) nuxt.push(d);
    else if (d.startsWith('next/') || d === 'next') next.push(d);
    else if (d.startsWith('@angular/')) angular.push(d);
    else external.push(d);
  }

  return {
    nuxt: [...new Set(nuxt)].sort(),
    next: [...new Set(next)].sort(),
    angular: [...new Set(angular)].sort(),
    external: [...new Set(external)].sort(),
  };
}

/** Split score including all framework heuristics. */
export function instructionSplitScoreFull(relPath: string, content: string, lines?: number): number {
  return instructionSplitScore(relPath, content, lines) + frameworkSplitScoreBoost(relPath, content);
}

export function needsOwnInstructionFile(relPath: string, content: string, lines?: number): boolean {
  const norm = relPath.replace(/\\/g, '/');
  const top = norm.split('/')[0];
  if (['src', 'lib', 'app', 'cmd', 'internal'].includes(top)) return true;
  if (isComposableLikePath(norm)) return true;
  return instructionSplitScoreFull(relPath, content, lines) >= INSTRUCTION_OWN_FILE_SCORE_THRESHOLD;
}
