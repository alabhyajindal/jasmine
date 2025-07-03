import binaryen from 'binaryen'
import type { BinaryExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { Stmt } from './Stmt'
import { COMPILE_ERROR, reportError } from './error'

let varTable: Map<string, { index: number; expr: Expr }>

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

export default function compile(statements: Stmt[]) {
  const module = new binaryen.Module()

  // Import print function
  module.addFunctionImport(
    'print_i32',
    'console',
    'i32',
    binaryen.createType([binaryen.i32]),
    binaryen.none
  )

  createVarTable(statements)
  let params = Array(varTable.size).fill(binaryen.i32)

  const body = program(module, statements)

  module.addFunction('main', binaryen.createType([]), binaryen.none, params, body)
  module.addFunctionExport('main', 'main')

  // Wasm text before validation to view the compiled output
  // const wasmText = module.emitText();
  // console.log(wasmText);

  // Validate the module
  if (!module.validate()) {
    throw Error('Validation error.')
  }

  // Emitting WebAssembly
  const wasmBinary = module.emitBinary()

  return wasmBinary
}

function program(module: binaryen.Module, statements: Stmt[]) {
  let res = []
  for (let stmt of statements) {
    // console.log(stmt);
    // console.log('---');
    res.push(compileStatement(module, stmt))
  }

  return module.block(null, res, binaryen.none)
}

function compileStatement(module: binaryen.Module, stmt: Stmt): binaryen.ExpressionRef {
  switch (stmt.type) {
    case 'ExprStmt': {
      let expr = compileExpression(module, stmt.expression)
      return module.drop(expr)
    }
    case 'PrintStmt': {
      let expr = compileExpression(module, stmt.expression)
      return module.call('print_i32', [expr], binaryen.none)
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
    default: {
      console.error(stmt)
      throw Error('Unsupported statement.')
    }
  }
}

function compileExpression(module: binaryen.Module, expression: Expr): binaryen.ExpressionRef {
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(module, expression)
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
    default:
      console.error(expression)
      throw Error('Unsupported ast type.')
  }
}

// A number like 5517120 is returned by this function - which is not the result value of performing the addition. Could be something related to Wasm internal
function binaryExpression(module: binaryen.Module, expression: BinaryExpr): binaryen.ExpressionRef {
  const left = compileExpression(module, expression.left)
  const right = compileExpression(module, expression.right)

  switch (expression.operator.type) {
    case TokenType.PLUS:
      return module.i32.add(left, right)
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
      return module.i32.const(expression.value)
    case 'boolean':
      return module.i32.const(expression.value ? 1 : 0)
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
