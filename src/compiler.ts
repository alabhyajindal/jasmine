import binaryen from 'binaryen'
import type { BinaryExpr, CallExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { Stmt } from './Stmt'
import { COMPILE_ERROR, reportError } from './error'
import type { ValueType } from './ValueType'

type FunctionInfo = {
  returnType: ValueType
}

let varTable: Map<string, { index: number; expr?: Expr }> = new Map()
let stringTable: Map<string, number> = new Map()
let functionTable: Map<string, FunctionInfo> = new Map([
  ['println', { returnType: TokenType.TYPE_NIL }],
])

export default function compile(statements: Stmt[]) {
  const module = new binaryen.Module()
  module.setMemory(1, 2, 'memory')

  module.addFunctionImport(
    'write',
    'wasi_snapshot_preview1',
    'fd_write',
    binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]),
    binaryen.i32
  )

  module.addFunctionImport(
    'itoa',
    'utils',
    'itoa',
    binaryen.createType([binaryen.i32, binaryen.i32]),
    binaryen.i32
  )

  createVarTable(statements)
  let varTypes = Array(varTable.size).fill(binaryen.i32)
  const body = program(module, statements)

  module.addFunction('main', binaryen.createType([]), binaryen.none, varTypes, body)
  module.addFunctionExport('main', '_start')

  if (!module.validate()) {
    throw Error('Validation error.')
  }

  const wat = module.emitText()
  return wat
}

function program(module: binaryen.Module, statements: Stmt[]) {
  let res = []
  for (let stmt of statements) {
    res.push(compileStatement(module, stmt))
  }

  return module.block(null, res, binaryen.none)
}

function compileStatement(module: binaryen.Module, stmt: Stmt): binaryen.ExpressionRef {
  switch (stmt.type) {
    case 'ExprStmt': {
      let expr = compileExpression(module, stmt.expression)

      if (stmt.expression.type == 'CallExpr') {
        let fnName = stmt.expression.callee.name.lexeme
        if (functionTable.get(fnName)?.returnType == TokenType.TYPE_NIL) {
          return expr
        }
      }

      return module.drop(expr)
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

      let valueReturnType = returnType == binaryen.i32 ? TokenType.TYPE_INT : TokenType.TYPE_NIL
      functionTable.set(name, { returnType: valueReturnType })

      // Each function gets a blank state with nothing but the arguments passed in. That is, a function cannot access variables declared outside it's scope.
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

function callWrite(
  module: binaryen.Module,
  expr?: binaryen.ExpressionRef,
  strLen?: binaryen.ExpressionRef
) {
  const bufferPtr = 66
  if (expr && !strLen) {
    strLen = module.call('itoa', [expr, module.i32.const(bufferPtr)], binaryen.i32)
  }

  // ewww - when we print an int we pass expr, when we print a string we pass strlen - both are never passed - modify the function so we don't need this check below
  if (!strLen) {
    throw Error('Failed to compute strLen')
  }

  return module.block(null, [
    // iovec structure
    module.i32.store(0, 4, module.i32.const(0), module.i32.const(bufferPtr)),
    module.i32.store(0, 4, module.i32.const(4), strLen),

    module.drop(
      module.call(
        'write',
        [
          module.i32.const(1), // stdout
          module.i32.const(0), // iovec start address
          module.i32.const(1), // read this many iovecs
          module.i32.const(92), // nwritten
        ],
        binaryen.i32
      )
    ),
  ])
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
    case 'CallExpr':
      return callExpression(module, expression)
    default:
      console.error(expression)
      throw Error('Unsupported ast type.')
  }
}

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

function printFunction(module: binaryen.Module, expression: CallExpr): binaryen.ExpressionRef {
  let argExpr = expression.args[0]!

  if (argExpr.type == 'VariableExpr') {
    let identifier = argExpr.name.lexeme
    let variableInfo = varTable.get(identifier)?.expr
    // This handles literal expr that are numbers as well - but it's not an issue since they can be printed without evaluation
    if (variableInfo?.type == 'LiteralExpr') {
      variableInfo.value = variableInfo.value += '\n'

      let strLen = new TextEncoder().encode(variableInfo.value).length

      return module.block(null, [
        module.drop(stringExpression(module, variableInfo)),
        callWrite(module, undefined, module.i32.const(strLen)),
      ])
    } else {
      // Handles non literals like 42 + 3
      return callWrite(module, compileExpression(module, argExpr))
    }
  }

  if (argExpr.type === 'LiteralExpr' && typeof argExpr.value === 'string') {
    argExpr.value = argExpr.value + '\n'
    let str = argExpr.value
    let strLen = new TextEncoder().encode(str).length

    return module.block(null, [
      module.drop(compileExpression(module, argExpr)),
      callWrite(module, undefined, module.i32.const(strLen)),
    ])
  } else {
    return callWrite(module, compileExpression(module, argExpr))
  }
}

const tokenTypeToBinaryen: Map<ValueType, any> = new Map([
  [TokenType.TYPE_NIL, binaryen.none],
  [TokenType.TYPE_INT, binaryen.i32],
])

function callExpression(module: binaryen.Module, expression: CallExpr): binaryen.ExpressionRef {
  let fnName = expression.callee.name.lexeme
  if (fnName == 'println') {
    return printFunction(module, expression)
  }

  let args = expression.args.map((arg) => compileExpression(module, arg))
  let returnType: ValueType = functionTable.get(fnName)!.returnType

  return module.call(fnName, args, tokenTypeToBinaryen.get(returnType))
}

function stringExpression(module: binaryen.Module, expr: LiteralExpr): binaryen.ExpressionRef {
  let str = expr.value as string
  let strArr = new TextEncoder().encode(str)
  let startPos = 66

  let instrs = []

  for (let [i, charCode] of strArr.entries()) {
    instrs.push(module.i32.store8(0, 1, module.i32.const(startPos + i), module.i32.const(charCode)))
  }

  instrs.push(module.i32.const(startPos))

  return module.block(null, instrs, binaryen.i32)
}

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

function getFunVarTable(params: { name: string; type: TokenType }[]) {
  let varCount = 0
  let varMap = new Map()

  for (let param of params) {
    let varName = param.name
    varMap.set(varName, { index: varCount++ })
  }

  return varMap
}
