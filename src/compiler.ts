import type { BinaryExpr, Expr } from './Expr'
import type { Stmt } from './Stmt'

let declarations = ``
let topLevel = ``
let functions = ``

export default function compile(statements: Stmt[]) {
  for (let stmt of statements) {
    topLevel += compileStatement(stmt)
  }

  return constructProgram()
}

function compileStatement(stmt: Stmt) {
  switch (stmt.type) {
    case 'ExprStmt':
      return compileExpression(stmt.expression) + ';'
  }
}

function compileExpression(expr: Expr): string {
  switch (expr.type) {
    case 'BinaryExpr':
      return binaryExpression(expr)
    case 'LiteralExpr':
      return String(expr.value)
  }
}

function binaryExpression(expr: BinaryExpr) {
  const left = compileExpression(expr.left)
  const right = compileExpression(expr.right)

  const operator = expr.operator.lexeme
  return `${left} ${operator} ${right}`
}

function constructProgram() {
  let program = `#include <stdio.h>

${declarations}

${functions}

int main() {
  ${topLevel}
  return 0;
}`

  return program
}
