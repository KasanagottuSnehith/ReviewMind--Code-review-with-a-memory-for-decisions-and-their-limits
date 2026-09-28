import ts from 'typescript';
export type TimeoutCheck = { status: 'present'|'missing'|'needs_context'; line: number; timeoutMs?: number; reason: string };
/** Fixture-scoped: named request import from bridge-client or transport import from ../.../lib/transport.
 * Calls must have a literal options object with one timeout: 2000 property. Spreads, aliases,
 * computed options and unrecognized call patterns are uncertainty, never proof of a timeout. */
export function checkTimeout(source?: string): TimeoutCheck {
  if (!source) return { status:'needs_context',line:1,reason:'Supply complete post-change TypeScript context to verify the request timeout.' };
  const file = ts.createSourceFile('input.ts',source,ts.ScriptTarget.Latest,true);
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) &&
      (statement.moduleSpecifier.text === 'bridge-client' || /(?:^|\/)lib\/transport$/.test(statement.moduleSpecifier.text))) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const el of bindings.elements) {
        if (['request','transport'].includes((el.propertyName ?? el.name).text)) names.add(el.name.text);
      }
    }
  }
  const checks: TimeoutCheck[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && names.has(node.expression.text)) {
      const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line+1;
      const options = node.arguments[1];
      if (!options) checks.push({status:'missing',line,reason:'The request has no explicit timeout options.'});
      else if (!ts.isObjectLiteralExpression(options) || options.properties.some(p => ts.isSpreadAssignment(p)))
        checks.push({status:'needs_context',line,reason:'Indirect or spread options are outside the supported timeout check.'});
      else {
        const props = options.properties.filter(p => ts.isPropertyAssignment(p) && ((ts.isIdentifier(p.name)||ts.isStringLiteral(p.name)) && p.name.text === 'timeout'));
        const prop = props[0];
        if (!prop) checks.push({status:'missing',line,reason:'An explicit 2-second timeout is required.'});
        else if (props.length !== 1 || !ts.isPropertyAssignment(prop) || !ts.isNumericLiteral(prop.initializer)) checks.push({status:'needs_context',line,reason:'The timeout must be verified from supplied context.'});
        else {
          const n = Number(prop.initializer.text);
          checks.push({status:n === 2000?'present':'missing',line,timeoutMs:n,reason:n===2000?'Explicit 2-second timeout verified.':'The supported fixture requires timeout: 2000.'});
        }
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(file);
  return checks.find(c=>c.status==='missing') ?? checks.find(c=>c.status==='needs_context') ?? checks[0] ??
    {status:'needs_context',line:1,reason:'No supported direct request call was found; timeout behavior is unknown.'};
}
