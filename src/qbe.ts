import type { CallExpr, Expr } from './Expr'
import type { Stmt } from './Stmt'

let il = `
# Define the string constant.
data $my_string = { b "hello world", b 0 }

export function w $main() {
@start
`
// %r =w call $puts(l $my_string)

export default function compile(stmts: Stmt[]) {
  compileStatements(stmts)
  il += `
ret 0
}`
  Bun.write('build/qbe/il.ssa', il)
}

function compileStatements(stmts: Stmt[]) {
  for (let stmt of stmts) {
    compileStatement(stmt)
  }
}

function compileStatement(stmt: Stmt) {
  switch (stmt.type) {
    case 'ExprStmt': {
      let expr = compileExpression(stmt.expression)
      break
    }
    default:
      console.error(stmt)
      reportError('Unsupported statement.')
  }
}

function compileExpression(expression: Expr) {
  switch (expression.type) {
    case 'CallExpr':
      return callExpression(expression)
    default:
      console.error(expression)
      reportError('Unsupported expression.')
  }
}

function callExpression(expression: CallExpr) {
  let fnName = expression.callee.name.lexeme
  if (fnName == 'println') {
    return printFunction(expression)
  }
}

function printFunction(expression: CallExpr) {
  let argExpr = expression.args[0]!
  if (argExpr.type == 'LiteralExpr' && typeof argExpr.value != 'string') {
    let val = argExpr.value
    console.log(argExpr)
    il += `%r =w call $puts(l ${val})`
  }
}
