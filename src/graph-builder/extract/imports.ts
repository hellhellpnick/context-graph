import path from 'path';
import ts from 'typescript';
import type { ScanResult } from '../../scanner';
import { scriptOrSelfForAnalysis } from '../../source-extract';
import {
  extractCSharpImports,
  extractGoImports,
  extractJavaKotlinImports,
  extractPhpUseStatements,
  extractPythonImports,
  extractRubyImports,
  extractRustImports,
} from '../../source-extract';

export function extractImports(scan: ScanResult, sourceFiles: string[]): string[] {
  const sourcePaths = new Set(sourceFiles);
  const deps = new Set<string>();
  const NODE_BUILTINS = new Set([
    'fs', 'path', 'crypto', 'http', 'https', 'os', 'url', 'util', 'stream',
    'events', 'child_process', 'net', 'tls', 'dns', 'zlib', 'buffer',
    'querystring', 'assert', 'readline', 'worker_threads', 'cluster',
  ]);

  const isTsJsLike = (p: string) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(p);

  const addDep = (raw: string, fromFile: string) => {
    const dep = raw.trim();
    if (!dep) return;
    if (dep.startsWith('~/') || dep.startsWith('@/')) {
      deps.add(dep.replace(/^~\/|^@\//, '').replace(/\.[^.]+$/, ''));
      return;
    }
    if (dep.startsWith('#')) {
      deps.add(dep);
      return;
    }
    if (dep.startsWith('.')) {
      const resolved = path.posix.join(path.posix.dirname(fromFile), dep).replace(/\.[^.]+$/, '');
      deps.add(resolved);
      return;
    }
    if (!NODE_BUILTINS.has(dep) && !dep.startsWith('node:')) {
      deps.add(dep.split('/').slice(0, dep.startsWith('@') ? 2 : 1).join('/'));
    }
  };

  const extractImportsFromTsAst = (filePath: string, content: string): string[] => {
    const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const out: string[] = [];

    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
        out.push(st.moduleSpecifier.text);
        continue;
      }
      // const x = require('foo')
      if (ts.isVariableStatement(st)) {
        for (const decl of st.declarationList.declarations) {
          const init = decl.initializer;
          if (!init || !ts.isCallExpression(init)) continue;
          const callee = init.expression;
          if (!ts.isIdentifier(callee) || callee.text !== 'require') continue;
          const arg0 = init.arguments[0];
          if (arg0 && ts.isStringLiteral(arg0)) out.push(arg0.text);
        }
      }
    }

    return out;
  };

  for (const f of scan.files) {
    if (!sourcePaths.has(f.path) || !f.content) continue;
    const { body, virtualPath } = scriptOrSelfForAnalysis(f.path, f.content);

    if (isTsJsLike(virtualPath)) {
      try {
        const ast = extractImportsFromTsAst(virtualPath, body);
        for (const d of ast) addDep(d, f.path);
        if (ast.length > 0 && !/\.vue$/i.test(f.path)) continue;
      } catch {
        // fall back to regex below
      }
    } else if (/\.php$/i.test(f.path)) {
      for (const u of extractPhpUseStatements(body)) deps.add(u);
      continue;
    } else if (/\.py$/i.test(f.path)) {
      for (const mod of extractPythonImports(body)) deps.add(mod);
      continue;
    } else if (/\.go$/i.test(f.path)) {
      for (const p of extractGoImports(body)) addDep(p, f.path);
      continue;
    } else if (/\.cs$/i.test(f.path)) {
      for (const ns of extractCSharpImports(body)) deps.add(ns);
      continue;
    } else if (/\.rs$/i.test(f.path)) {
      for (const p of extractRustImports(body)) deps.add(p);
      continue;
    } else if (/\.(java|kt)$/i.test(f.path)) {
      for (const p of extractJavaKotlinImports(body)) deps.add(p);
      continue;
    } else if (/\.rb$/i.test(f.path)) {
      for (const p of extractRubyImports(body)) deps.add(p);
      continue;
    }

    const lines = body.split('\n');
    for (const line of lines) {
      // Match: import X from 'module', import { X } from 'module', require('module')
      const m = line.match(/(?:from|require\s*\()\s*['"]([^'"]+)['"]/);
      if (!m) continue;
      addDep(m[1], f.path);
    }
  }

  return [...deps].sort();
}

/** Check if a file is a barrel (re-exports only, no own logic). */
export function isBarrelFile(content: string): boolean {
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  if (lines.length === 0) return false;
  const reExportLines = lines.filter(l =>
    /^export\s+(\{.*\}\s+from|type\s+\{.*\}\s+from|\*\s+from)/.test(l.trim()) ||
    /^export\s+\{/.test(l.trim())
  );
  return reExportLines.length / lines.length >= 0.6;
}
