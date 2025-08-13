import type { CallExpr, Expr } from './Expr'
import type { Stmt } from './Stmt'

let main: string[] = []
let data: string[] = [`data $fmt = { b "%d\\n", b 0 }`]

function formIL() {
  return `${data.join('\n')}
  export function w $main() {
  @start
    ${main.join('\n')}
    ret 0
  }`
}

export default function compile(stmts: Stmt[]) {
  compileStatements(stmts)
  const il = formIL()
  Bun.write('build/qbe/main.ssa', il)
}

function compileStatements(stmts: Stmt[]) {
  for (let stmt of stmts) {
    compileStatement(stmt)
  }
}

function compileStatement(stmt: Stmt) {
  switch (stmt.type) {
    case 'ExprStmt': {
      return compileExpression(stmt.expression)
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
  if (argExpr.type == 'LiteralExpr') {
    let val = argExpr.value
    if (typeof val == 'string') {
      let strName = getStringName()
      let varName = getVarName()
      data.push(`data $${strName} = { b "${val}", b 0 }`)
      main.push(`%${varName} =w call $puts(l $${strName})`)
    } else {
      let varName = getVarName()
      main.push(`%${varName} =w call $printf(l $fmt, ..., w ${val})`)
    }
  }
}

// UTILS
let strCounter = 0
let varCounter = 0

/**
 * Generate auto incrementing string names
 */
function getStringName(): string {
  strCounter++
  return `str_${strCounter}`
}

/**
 * Generate unique variable names
 */
function getVarName(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  let num = varCounter

  do {
    result = alphabet[num % 26] + result
    num = Math.floor(num / 26)
  } while (num > 0)

  varCounter++
  return result
}
