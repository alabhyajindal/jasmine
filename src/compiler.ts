import binaryen from 'binaryen'
import type { AssignExpr, BinaryExpr, CallExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { Stmt } from './Stmt'
import { COMPILE_ERROR, reportError } from './error'
import type { ValueType } from './ValueType'

// TODO: Make module a global variable so it doesn't have to be passed to each function. The source file will always be compiled to a single module - importing helper functions from other modules

let strLiteralMemoryPos = 1024

const tokenTypeToBinaryen: Map<ValueType, any> = new Map([
  [TokenType.TYPE_NIL, binaryen.none],
  [TokenType.TYPE_INT, binaryen.i32],
  [TokenType.TYPE_STR, binaryen.i32],
])

type FunctionInfo = {
  returnType: ValueType
}

interface VariableInfo {
  index: number
  type: ValueType
  strLen?: number
}

let scopes: Map<string, VariableInfo>[] = []
let currentFunctionVars: binaryen.Type[] = []
let currentFunctionVarCount = 0

let functionTable: Map<string, FunctionInfo> = new Map([
  ['println', { returnType: TokenType.TYPE_NIL }],
])

function defineVariable(name: string, type: ValueType, strLen?: number): VariableInfo {
  let currentScope = scopes[scopes.length - 1]
  if (currentScope?.has(name)) {
    throw Error('the variable already exists in the current scope.')
  }

  const info: VariableInfo = {
    index: currentFunctionVarCount++,
    type,
    strLen,
  }

  currentScope?.set(name, info)
  currentFunctionVars.push(tokenTypeToBinaryen.get(type))

  return info
}

function findVariable(name: string) {
  for (let i = scopes.length - 1; i >= 0; i--) {
    let scope = scopes[i]
    if (scope?.has(name)) {
      return scope.get(name)
    }
  }

  return undefined
}

function beginScope() {
  scopes.push(new Map())
}

function endScope() {
  scopes.pop()
}

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

  currentFunctionVars = []
  currentFunctionVarCount = 0

  beginScope()
  const body = program(module, statements)
  endScope()

  module.addFunction('main', binaryen.createType([]), binaryen.none, currentFunctionVars, body)
  module.addFunctionExport('main', '_start')

  if (!module.validate()) throw Error('Validation error.')

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
      } else if (stmt.expression.type == 'AssignExpr') {
        return expr
      }

      return module.drop(expr)
    }
    case 'VariableStmt': {
      let varType = TokenType.TYPE_INT
      let strLen: number | undefined = undefined

      if (stmt.initializer.type == 'LiteralExpr') {
        if (typeof stmt.initializer.value == 'string') {
          varType = TokenType.TYPE_STR
          // Adding newline to the strLen
          strLen = new TextEncoder().encode(stmt.initializer.value + '\n').length
        }
      }

      let expr = compileExpression(module, stmt.initializer)

      let varName = stmt.name.lexeme
      let varInfo = defineVariable(varName, varType, strLen)
      return module.local.set(varInfo.index, expr)
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

      currentFunctionVarCount = 0
      beginScope()
      for (let p of stmt.params) {
        defineVariable(p.name, p.type)
      }
      let body = compileStatement(module, stmt.body)
      endScope()
      // varTable = temp

      module.addFunction(name, paramTypes, returnType, [], body)
      return module.nop()
    }
    case 'ReturnStmt': {
      let val = compileExpression(module, stmt.value)
      return module.return(val)
    }
    // case 'ForStmt': {
    //   let body = compileStatement(module, stmt.body)
    //   // the body only consists of printing - you need to manually construct the body so it contains a variable declaration then add the actual body of the loop, then after add a statement incrementing the variable. after that you need an if condition to jump to the labelled loop. for now using foo as the name is fine but you would want to generate something unique - uuid or can just have a number of loop count as the global variable that gets incremented when we process a new forstmt
    //   return module.loop('foo', body)
    // }
    default: {
      console.error(stmt)
      throw Error('Unsupported statement.')
    }
  }
}

function callWrite(
  module: binaryen.Module,
  expr?: binaryen.ExpressionRef,
  strLen?: binaryen.ExpressionRef,
  bufferPtr: number = module.i32.const(66)
) {
  if (expr && !strLen) {
    strLen = module.call('itoa', [expr, bufferPtr], binaryen.i32)
  }

  // ewww - when we print an int we pass expr, when we print a string we pass strlen - both are never passed - modify the function so we don't need this check below
  if (!strLen) {
    throw Error('Failed to compute strLen')
  }

  return module.block(null, [
    // iovec structure
    module.i32.store(0, 4, module.i32.const(0), bufferPtr),
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
    case 'VariableExpr': {
      let varName = expression.name.lexeme
      let varInfo = findVariable(varName)
      if (varInfo) {
        return module.local.get(varInfo.index, binaryen.i32)
      } else {
        throw Error('Access to undefined variable.')
      }
    }
    case 'GroupingExpr':
      return compileExpression(module, expression.expression)
    case 'UnaryExpr':
      return unaryExpression(module, expression)
    case 'CallExpr':
      return callExpression(module, expression)
    case 'AssignExpr':
      return assignExpression(module, expression)
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
    let varInfo = findVariable(identifier)
    if (!varInfo) {
      throw Error('Undefined variable - print function')
    }

    if (varInfo.type == TokenType.TYPE_STR) {
      let strAddress = module.local.get(varInfo.index, binaryen.i32)
      if (!varInfo.strLen) {
        throw Error('Unable to compute string length at compile time')
      }
      return callWrite(module, undefined, module.i32.const(varInfo.strLen), strAddress)
    } else {
      // Handles non literals like 42 + 3
      return callWrite(module, compileExpression(module, argExpr))
    }
  }

  if (argExpr.type === 'LiteralExpr' && typeof argExpr.value === 'string') {
    argExpr.value = argExpr.value + '\n'
    let str = argExpr.value
    let strLen = new TextEncoder().encode(str).length

    const TEMP_STR_LITERAL_POS = 2048

    return module.block(null, [
      module.drop(stringExpression(module, argExpr, TEMP_STR_LITERAL_POS)),
      callWrite(
        module,
        undefined,
        module.i32.const(strLen),
        module.i32.const(TEMP_STR_LITERAL_POS)
      ),
    ])
  } else {
    return callWrite(module, compileExpression(module, argExpr))
  }
}

function callExpression(module: binaryen.Module, expression: CallExpr): binaryen.ExpressionRef {
  let fnName = expression.callee.name.lexeme
  if (fnName == 'println') {
    return printFunction(module, expression)
  }

  let args = expression.args.map((arg) => compileExpression(module, arg))
  let returnType: ValueType = functionTable.get(fnName)!.returnType

  return module.call(fnName, args, tokenTypeToBinaryen.get(returnType))
}

function assignExpression(module: binaryen.Module, expr: AssignExpr): binaryen.ExpressionRef {
  let varName = expr.name.lexeme
  let varInfo = findVariable(varName)
  if (varInfo) {
    let value = compileExpression(module, expr.value)
    return module.local.set(varInfo.index, value)
  } else {
    throw Error('yoo bruhhh?')
  }
}

function stringExpression(
  module: binaryen.Module,
  expr: LiteralExpr,
  storagePos: number = strLiteralMemoryPos
): binaryen.ExpressionRef {
  // Storing all strings with newline appended - since no operations exist on strings other than print - this is fine - if a new string operation is added like string concatenaion ++, then the newline char can be stored at a specific position in memory and printed everytime a string is printed
  let str = expr.value + '\n'
  let strArr = new TextEncoder().encode(str)

  let instrs = []

  for (let [i, charCode] of strArr.entries()) {
    instrs.push(
      module.i32.store8(0, 1, module.i32.const(storagePos + i), module.i32.const(charCode))
    )
  }

  instrs.push(module.i32.const(storagePos))

  if (arguments.length < 3) {
    strLiteralMemoryPos += strArr.length
  }

  return module.block(null, instrs, binaryen.i32)
}
