import ts from 'typescript';
import { isPromptTemplateBody } from './ts-prompt';
import { extractVuePropKeys } from './vue-sfc';
import { SKELETON_MAX_CHARS, truncateSkeleton } from './utils';

function summarizeBlockBody(body: ts.Block, sf: ts.SourceFile, indent: string): string[] {
  const lines: string[] = [];
  for (const st of body.statements) {
    if (ts.isSwitchStatement(st)) {
      const expr = truncateSkeleton(st.expression.getText(sf), 48);
      lines.push(`${indent}switch (${expr}) {`);
      for (const clause of st.caseBlock.clauses) {
        if (ts.isCaseClause(clause)) {
          const label = truncateSkeleton(clause.expression.getText(sf), 56);
          const ret = clause.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined;
          const retExpr = ret?.expression ? truncateSkeleton(ret.expression.getText(sf), 80) : '...';
          lines.push(`${indent}  case ${label}: return ${retExpr};`);
        } else if (ts.isDefaultClause(clause)) {
          const ret = clause.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement | undefined;
          const retExpr = ret?.expression ? truncateSkeleton(ret.expression.getText(sf), 80) : '...';
          lines.push(`${indent}  default: return ${retExpr};`);
        }
      }
      lines.push(`${indent}}`);
    } else if (ts.isIfStatement(st)) {
      lines.push(`${indent}if (${truncateSkeleton(st.expression.getText(sf), 72)}) { ... }`);
    } else if (ts.isReturnStatement(st) && st.expression) {
      const retText = st.expression.getText(sf);
      if (isPromptTemplateBody(retText)) {
        lines.push(`${indent}return /* prompt string */ \`...\`.join('\\n');`);
      } else {
        lines.push(`${indent}return ${truncateSkeleton(retText, 100)};`);
      }
    } else if (ts.isExpressionStatement(st)) {
      const t = truncateSkeleton(st.expression.getText(sf), 120);
      if (t) lines.push(`${indent}${t};`);
    }
  }
  return lines;
}

function summarizeCallable(
  fn: ts.ArrowFunction | ts.FunctionExpression,
  sf: ts.SourceFile,
  header: string,
  close = '}'
): string[] {
  if (ts.isBlock(fn.body)) {
    return [header, ...summarizeBlockBody(fn.body, sf, '  '), close];
  }
  return [`${header.replace(/\{\s*$/, '')} ${truncateSkeleton(fn.body.getText(sf), 160)} ${close}`];
}

/**
 * Function / method / composable skeleton from `<script>` or `.ts` (no LLM).
 * Expands `computed(() => { switch ... })` into readable structure.
 */
export function extractScriptSkeleton(script: string, virtualPath: string): string[] {
  if (!script.trim()) return [];

  let sf: ts.SourceFile;
  try {
    sf = ts.createSourceFile(virtualPath, script, ts.ScriptTarget.Latest, true);
  } catch {
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const pushBlock = (lines: string[]) => {
    const block = lines.join('\n');
    if (!block.trim() || seen.has(block)) return;
    seen.add(block);
    out.push(block);
  };

  for (const st of sf.statements) {
    if (ts.isExpressionStatement(st)) {
      const expr = st.expression;
      if (ts.isCallExpression(expr)) {
        const callee = expr.expression.getText(sf);
        if (
          /^(use[A-Z]\w*|onMounted|onBeforeMount|onUnmounted|onBeforeUnmount|onUpdated|\$listen|\$event|\$offEvent)$/.test(
            callee
          )
        ) {
          const args = expr.arguments.map(a => truncateSkeleton(a.getText(sf), 48)).join(', ');
          pushBlock([`${callee}(${args});`]);
        }
      }
      continue;
    }

    if (ts.isIfStatement(st)) {
      const cond = truncateSkeleton(st.expression.getText(sf), 90);
      const bodyText = st.getText(sf);
      if (/throw\s+createError/.test(bodyText)) {
        const errM = bodyText.match(/throw\s+createError\s*\(\s*\{([\s\S]*?)\}\s*\)/);
        const inner = errM ? truncateSkeleton(errM[1].replace(/\s+/g, ' '), 120) : '...';
        pushBlock([`if (${cond}) throw createError({ ${inner} })`]);
      } else {
        pushBlock([`if (${cond}) { ... }`]);
      }
      continue;
    }

    if (ts.isFunctionDeclaration(st) && st.name) {
      const params = st.parameters.map(p => p.getText(sf)).join(', ');
      const asyncKw = st.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : '';
      if (st.body) {
        pushBlock([
          `${asyncKw}function ${st.name.text}(${params}) {`,
          ...summarizeBlockBody(st.body, sf, '  '),
          '}',
        ]);
      } else {
        pushBlock([`${asyncKw}function ${st.name.text}(${params});`]);
      }
      continue;
    }

    if (!ts.isVariableStatement(st)) continue;

    for (const decl of st.declarationList.declarations) {
      const init = decl.initializer;

      if (ts.isObjectBindingPattern(decl.name)) {
        const bindings = decl.name.elements
          .map((e: ts.BindingElement) => e.getText(sf))
          .join(', ');
        if (!init) {
          pushBlock([`const { ${bindings} };`]);
          continue;
        }
        if (ts.isAwaitExpression(init)) {
          pushBlock([
            `const { ${bindings} } = await ${truncateSkeleton(init.expression.getText(sf), 260)}`,
          ]);
        } else {
          pushBlock([`const { ${bindings} } = ${truncateSkeleton(init.getText(sf), 220)}`]);
        }
        continue;
      }

      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!init) {
        pushBlock([`let ${name};`]);
        continue;
      }

      if (ts.isAwaitExpression(init)) {
        pushBlock([`const ${name} = await ${truncateSkeleton(init.expression.getText(sf), 280)}`]);
        continue;
      }

      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        const params = init.parameters.map(p => p.getText(sf)).join(', ');
        pushBlock(summarizeCallable(init, sf, `const ${name} = (${params}) => {`, '};'));
        continue;
      }

      if (ts.isArrayLiteralExpression(init) && init.elements.length >= 3) {
        const arrText = init.getText(sf);
        if (isPromptTemplateBody(arrText) || arrText.length > 400) {
          pushBlock([
            `const ${name} = [ /* template ×${init.elements.length} */ ].join('\\n');`,
          ]);
          continue;
        }
      }

      if (ts.isCallExpression(init)) {
        const callee = init.expression;
        const arg0 = init.arguments[0];
        if (ts.isIdentifier(callee)) {
          const calleeName = callee.text;
          if (calleeName === 'defineProps') {
            const keys = extractVuePropKeys(script);
            pushBlock([
              keys.length > 0
                ? `const ${name} = defineProps({ ${keys.join(', ')} })`
                : `const ${name} = defineProps(...)`,
            ]);
            continue;
          }
          if (
            (calleeName === 'computed' ||
              calleeName === 'watch' ||
              calleeName === 'watchEffect' ||
              calleeName === 'shallowRef' ||
              calleeName === 'ref') &&
            arg0 &&
            (ts.isArrowFunction(arg0) || ts.isFunctionExpression(arg0))
          ) {
            const params = arg0.parameters.map(p => p.getText(sf)).join(', ');
            pushBlock(
              summarizeCallable(arg0, sf, `const ${name} = ${calleeName}((${params}) => {`, '});')
            );
            continue;
          }
          if (
            (calleeName === 'computed' || calleeName === 'shallowRef' || calleeName === 'ref') &&
            arg0 &&
            !ts.isArrowFunction(arg0) &&
            !ts.isFunctionExpression(arg0)
          ) {
            pushBlock([
              `const ${name} = ${calleeName}(${truncateSkeleton(arg0.getText(sf), 160)})`,
            ]);
            continue;
          }
        }
      }

      const one = truncateSkeleton(`const ${name} = ${init.getText(sf)}`, 200);
      if (one) pushBlock([one]);
    }
  }

  const joined = out.join('\n\n');
  if (joined.length <= SKELETON_MAX_CHARS) return out;

  const trimmed: string[] = [];
  let used = 0;
  for (const block of out) {
    if (used + block.length > SKELETON_MAX_CHARS) break;
    trimmed.push(block);
    used += block.length + 2;
  }
  if (trimmed.length < out.length) {
    trimmed.push(`// ... ${out.length - trimmed.length} more symbol(s) omitted`);
  }
  return trimmed;
}
