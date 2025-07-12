import type { BinaryExpr, Expr } from './Expr'
import type { Stmt } from './Stmt'
import TokenType from './TokenType'

let typeMap = { [TokenType.TYPE_INT]: 'int', [TokenType.TYPE_NIL]: 'void' }

let declarations = ``
let topLevel = ``
let functions = ``

export default function compile(statements: Stmt[]) {
  for (let stmt of statements) {
    if (stmt.type != 'FunDecl') {
      topLevel += compileStatement(stmt)
    } else {
      functions += compileStatement(stmt)
    }
  }

  return constructProgram()
}

function compileStatement(stmt: Stmt): string {
  switch (stmt.type) {
    case 'ExprStmt':
      return compileExpression(stmt.expression) + ';'
    case 'PrintStmt': {
      {
        if (stmt.expression.type == 'VariableExpr') {
          let expr = compileExpression(stmt.expression)
          // need to know the type of the variable at this point to print correctly
          return `printf("%d", ${expr});`
        } else {
          let expr = compileExpression(stmt.expression)
          // doesn't work with strings - as it wraps a returned string value which is already in quotes into quotes again
          return `printf("${expr}\\n");`
        }
        break
      }
    }
    case 'VariableStmt': {
      let name = stmt.name.lexeme
      let init = compileExpression(stmt.initializer)

      if (stmt.initializer.type == 'LiteralExpr' && typeof stmt.initializer.value == 'string') {
        return `char ${name}[] = ${init};`
      } else {
        return `int ${name} = ${init};`
      }
    }
    case 'FunDecl': {
      let name = stmt.name.lexeme
      let { params, returnType } = stmt

      let paramsArr = []
      for (let p of params) {
        paramsArr.push(`${typeMap[p.type]} ${p.name}`)
      }
      let paramsStr = paramsArr.join(', ')

      let decl = `${typeMap[returnType]} ${name}(${paramsStr})`
      let body = compileStatement(stmt.body)

      declarations += decl + ';'

      return `${decl} ${body}`
    }
    case 'BlockStmt': {
      let body = ``
      for (let statement of stmt.statements) {
        body += compileStatement(statement)
      }

      return `{${body}}`
    }
    default:
      throw Error('not implemented')
  }
}

function compileExpression(expr: Expr): string {
  switch (expr.type) {
    case 'BinaryExpr':
      return binaryExpression(expr)
    case 'LiteralExpr': {
      if (typeof expr.value == 'string') {
        return `"${expr.value}"`
      } else {
        return String(expr.value)
      }
    }
    case 'VariableExpr': {
      return `${expr.name.lexeme}`
    }
    case 'CallExpr': {
      let name = expr.callee.name.lexeme
      let args = []
      for (let arg of expr.args) {
        let callArg = compileExpression(arg)
        args.push(callArg)
      }

      let callArgs = args.join(', ')
      return `${name}(${callArgs})`
    }
    default:
      throw Error('not implemented')
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
