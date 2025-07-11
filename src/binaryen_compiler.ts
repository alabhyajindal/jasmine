import binaryen from 'binaryen'
import type { BinaryExpr, CallExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { Stmt } from './Stmt'
import { COMPILE_ERROR, reportError } from './error'
import type Token from './Token'

export default function compile(statements: Stmt[]) {
  const body = program(statements)
  console.log(body)
}

function program(statements: Stmt[]) {
  let res = []
  for (let stmt of statements) {
    res.push(compileStatement(stmt))
  }
}

function compileStatement(stmt: Stmt) {
  switch (stmt.type) {
    case 'ExprStmt': {
      return compileExpression(stmt.expression)
    }
    case 'PrintStmt': {
      let expr = compileExpression(module, stmt.expression)
      return module.call('print', [expr], binaryen.none)
    }
    case 'VariableStmt': {
      let expr = compileExpression(module, stmt.initializer)

      let varName = stmt.name.lexeme
      let varIndex = varTable.get(varName)!.index
      return module.local.set(varIndex, expr)
    }
    case 'BlockStmt': {
      // Is there no difference between the way a program is compiled and a block is? Maybe later once we get to functions?
      // They do differ - a program always returns none type - but a block may have a return statement and thus a return type when it's part of a function
      let statements = stmt.statements
      return program(module, statements)
    }
    case 'IfStmt': {
      let condition = compileExpression(module, stmt.condition)
      let thenBranch = compileStatement(module, stmt.thenBranch)
      if (stmt.elseBranch) {
        let elseBranch = compileStatement(module, stmt.elseBranch)
        return module.if(condition, thenBranch, elseBranch)
      }

      return module.if(condition, thenBranch)
    }
    case 'FunDecl': {
      let name = stmt.name.lexeme
      let paramTypes = binaryen.createType(Array(stmt.params.length).fill(binaryen.i32))

      let returnType = binaryen.none
      if (stmt.returnType == TokenType.TYPE_INT) {
        returnType = binaryen.i32
      }

      // Each function gets a black state with nothing but the arguments passed in. That is, a function cannot access variables declared outside it's scope.
      let temp = varTable
      varTable = getFunVarTable(stmt.params)
      let body = compileStatement(module, stmt.body)
      varTable = temp

      module.addFunction(name, paramTypes, returnType, [], body)
      return module.nop()
    }
    case 'ReturnStmt': {
      let val = compileExpression(module, stmt.value)
      return module.return(val)
    }
    default: {
      console.error(stmt)
      throw Error('Unsupported statement.')
    }
  }
}

function compileExpression(expression: Expr): binaryen.ExpressionRef {
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(expression)
    case 'LiteralExpr':
      return literalExpression(module, expression)
    case 'VariableExpr':
      let varName = expression.name.lexeme
      if (varTable.has(varName)) {
        let varIndex = varTable.get(varName)!.index
        return module.local.get(varIndex, binaryen.i32)
      } else {
        throw Error('Access to undefined variable.')
      }
    case 'GroupingExpr':
      return compileExpression(module, expression.expression)
    case 'UnaryExpr':
      return unaryExpression(module, expression)
    case 'CallExpr':
      return callExpression(module, expression)
    default:
      console.error(expression)
      throw Error('Unsupported ast type.')
  }
}

function binaryExpression(module: binaryen.Module, expression: BinaryExpr) {
  const left = compileExpression(expression.left)
  const right = compileExpression(expression.right)

  switch (expression.operator.type) {
    case TokenType.PLUS:
      return `${left} + ${right}`
    case TokenType.MINUS:
      return module.i32.sub(left, right)
    case TokenType.SLASH:
      return module.i32.div_s(left, right)
    case TokenType.STAR:
      return module.i32.mul(left, right)
    case TokenType.LESS:
      return module.i32.lt_s(left, right)
    case TokenType.LESS_EQUAL:
      return module.i32.le_s(left, right)
    case TokenType.GREATER:
      return module.i32.gt_s(left, right)
    case TokenType.GREATER_EQUAL:
      return module.i32.ge_s(left, right)
    case TokenType.EQUAL_EQUAL:
      return module.i32.eq(left, right)
    case TokenType.BANG_EQUAL:
      return module.i32.ne(left, right)
    default:
      reportError(expression.operator, 'Unsupported binary operator.', COMPILE_ERROR)
  }
}

function literalExpression(
  module: binaryen.Module,
  expression: LiteralExpr
): binaryen.ExpressionRef {
  switch (typeof expression.value) {
    case 'number':
      return expression.value
    case 'boolean':
      return module.i32.const(expression.value ? 1 : 0)
    case 'string':
      return stringExpression(module, expression)
    default:
      console.error(expression)
      throw Error('Unsupported literal expression.')
  }
}

function unaryExpression(module: binaryen.Module, expression: UnaryExpr): binaryen.ExpressionRef {
  switch (expression.operator.type) {
    case TokenType.MINUS: {
      let expr = compileExpression(module, expression.right)
      return module.i32.sub(module.i32.const(0), expr)
    }
    default:
      console.error(expression.operator)
      throw Error(`Unsupported binary operator.`)
  }
}

function callExpression(module: binaryen.Module, expression: CallExpr): binaryen.ExpressionRef {
  let name = expression.callee.name.lexeme
  let args = expression.args.map((arg) => compileExpression(module, arg))

  // the return type of call here must match the return type of the defined function. to do this we would need to look up the function we are calling and then get the return type of it from there.

  return module.call(name, args, binaryen.i32)
}

let stringTable: Map<string, { start: number; end: number }> = new Map()

function stringExpression(module: binaryen.Module, expr: LiteralExpr): binaryen.ExpressionRef {
  let name = expr.value as string
  console.log(name)
  let strIndex = stringTable.get(name)
  if (strIndex) {
    return module.i32.const(strIndex.start)
  } else if (stringTable.size > 0) {
    let prevStr = [...stringTable.keys()].pop()!
    let prevPos = stringTable.get(prevStr)!

    let newPos = { start: prevPos.end + 1, end: name.length }
    stringTable.set(name, newPos)
    return module.i32.const(newPos.start)
  } else {
    stringTable.set(name, { start: 0, end: name.length })
    return module.i32.const(0)
  }
}

let varTable: Map<string, { index: number; expr?: Expr }>

function createVarTable(statements: Stmt[]) {
  let varCount = 0
  let varMap = new Map()
  for (let statement of statements) {
    if (statement.type == 'VariableStmt') {
      let varName = statement.name.lexeme
      varMap.set(varName, { index: varCount++, expr: statement.initializer })
    }
  }

  varTable = varMap
}

function getFunVarTable(params: Token[]) {
  let varCount = 0
  let varMap = new Map()

  for (let param of params) {
    let varName = param.lexeme
    varMap.set(varName, { index: varCount++ })
  }

  return varMap
}
