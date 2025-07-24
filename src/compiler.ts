import binaryen from 'binaryen'
import type { AssignExpr, BinaryExpr, CallExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { ForStmt, FunDecl, Stmt } from './Stmt'
import { COMPILE_ERROR, reportError } from './error'
import type { ValueType } from './ValueType'

type FunctionInfo = {
  returnType: ValueType
}

interface VariableInfo {
  index: number
  type: ValueType
  strLen?: number
}

let mod: binaryen.Module
let scopes: Map<string, VariableInfo>[] = []
let functionVars: binaryen.Type[] = []
let strLiteralMemoryPos = 1024
let loopCounter = 0

const tokenTypeToBinaryen: Map<ValueType, any> = new Map([
  [TokenType.TYPE_NIL, binaryen.none],
  [TokenType.TYPE_INT, binaryen.i32],
  [TokenType.TYPE_STR, binaryen.i32],
])

let functionTable: Map<string, FunctionInfo> = new Map([
  ['println', { returnType: TokenType.TYPE_NIL }],
])

export default function compile(stmt: Stmt[]) {
  mod = new binaryen.Module()
  mod.setMemory(1, 2, 'memory')

  mod.addFunctionImport(
    'write',
    'wasi_snapshot_preview1',
    'fd_write',
    binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]),
    binaryen.i32
  )

  mod.addFunctionImport(
    'itoa',
    'utils',
    'itoa',
    binaryen.createType([binaryen.i32, binaryen.i32]),
    binaryen.i32
  )

  beginScope()
  const body = compileStatements(stmt)
  endScope()

  mod.addFunction('main', binaryen.createType([]), binaryen.none, functionVars, body)
  mod.addFunctionExport('main', '_start')

  if (!mod.validate()) throw Error('Validation error.')

  const wat = mod.emitText()
  return wat
}

function compileStatements(stmts: Stmt[]) {
  let res = []
  for (let stmt of stmts) {
    res.push(compileStatement(stmt))
  }

  return mod.block(null, res, binaryen.none)
}

/** Statement dispatcher */
function compileStatement(stmt: Stmt): binaryen.ExpressionRef {
  switch (stmt.type) {
    case 'ExprStmt': {
      let expr = compileExpression(stmt.expression)

      if (stmt.expression.type == 'CallExpr') {
        let fnName = stmt.expression.callee.name.lexeme
        if (functionTable.get(fnName)?.returnType == TokenType.TYPE_NIL) {
          return expr
        }
      } else if (stmt.expression.type == 'AssignExpr') {
        return expr
      }

      return mod.drop(expr)
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

      let expr = compileExpression(stmt.initializer)

      let varName = stmt.name.lexeme
      let varInfo = defineVariable(varName, varType, strLen)
      return mod.local.set(varInfo.index, expr)
    }
    case 'BlockStmt': {
      beginScope()
      let stmts = stmt.statements
      let res = compileStatements(stmts)
      endScope()
      return res
    }
    case 'IfStmt': {
      let condition = compileExpression(stmt.condition)
      let thenBranch = compileStatement(stmt.thenBranch)
      if (stmt.elseBranch) {
        let elseBranch = compileStatement(stmt.elseBranch)
        return mod.if(condition, thenBranch, elseBranch)
      }

      return mod.if(condition, thenBranch)
    }
    case 'FunDecl':
      return funDeclaration(stmt)
    case 'ReturnStmt': {
      let val = compileExpression(stmt.value)
      return mod.return(val)
    }
    case 'ForStmt':
      return forStatement(stmt)
    default: {
      console.error(stmt)
      throw Error('Unsupported statement.')
    }
  }
}

function funDeclaration(stmt: FunDecl): binaryen.ExpressionRef {
  let name = stmt.name.lexeme
  let paramTypes = binaryen.createType(Array(stmt.params.length).fill(binaryen.i32))

  let returnType = binaryen.none
  if (stmt.returnType == TokenType.TYPE_INT) {
    returnType = binaryen.i32
  }

  let valueReturnType = returnType == binaryen.i32 ? TokenType.TYPE_INT : TokenType.TYPE_NIL
  functionTable.set(name, { returnType: valueReturnType })

  // Each function gets a blank state with nothing but the arguments passed in. That is, a function cannot access variables declared outside it's scope.

  // Store the current function variables before entering the function
  let currentFunctionVars = functionVars
  functionVars = []

  beginScope()
  for (let p of stmt.params) {
    defineVariable(p.name, p.type)
  }
  let body = compileStatement(stmt.body)
  endScope()

  mod.addFunction(name, paramTypes, returnType, functionVars, body)
  // Reset the function variables to what it was before entering the function
  functionVars = currentFunctionVars
  return mod.nop()
}

function forStatement(forStmt: ForStmt): binaryen.ExpressionRef {
  let loopId = loopCounter++
  let loopLabel = `loop_${loopId}`
  let blockLabel = `block_${loopId}`

  beginScope()
  let loopVarInfo = defineVariable(forStmt.variable, TokenType.TYPE_INT)
  let initializer = mod.local.set(loopVarInfo.index, compileExpression(forStmt.start))
  let body = compileStatement(forStmt.body)
  endScope()

  let increment = mod.local.set(
    loopVarInfo.index,
    mod.i32.add(mod.local.get(loopVarInfo.index, binaryen.i32), mod.i32.const(1))
  )

  let condition = mod.i32.ge_s(
    mod.local.get(loopVarInfo.index, binaryen.i32),
    compileExpression(forStmt.end)
  )

  return mod.block(null, [
    initializer,
    mod.block(blockLabel, [
      mod.loop(
        loopLabel,
        mod.block(null, [mod.br_if(blockLabel, condition), body, increment, mod.br(loopLabel)])
      ),
    ]),
  ])
}

/** Expression dispatcher */
function compileExpression(expression: Expr): binaryen.ExpressionRef {
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(expression)
    case 'LiteralExpr':
      return literalExpression(expression)
    case 'VariableExpr': {
      let varName = expression.name.lexeme
      let varInfo = findVariable(varName)
      if (varInfo) {
        return mod.local.get(varInfo.index, binaryen.i32)
      } else {
        throw Error('Access to undefined variable.')
      }
    }
    case 'GroupingExpr':
      return compileExpression(expression.expression)
    case 'UnaryExpr':
      return unaryExpression(expression)
    case 'CallExpr':
      return callExpression(expression)
    case 'AssignExpr':
      return assignExpression(expression)
    default:
      console.error(expression)
      throw Error('Unsupported ast type.')
  }
}

function binaryExpression(expression: BinaryExpr): binaryen.ExpressionRef {
  const left = compileExpression(expression.left)
  const right = compileExpression(expression.right)

  switch (expression.operator.type) {
    case TokenType.PLUS:
      return mod.i32.add(left, right)
    case TokenType.MINUS:
      return mod.i32.sub(left, right)
    case TokenType.SLASH:
      return mod.i32.div_s(left, right)
    case TokenType.STAR:
      return mod.i32.mul(left, right)
    case TokenType.LESS:
      return mod.i32.lt_s(left, right)
    case TokenType.LESS_EQUAL:
      return mod.i32.le_s(left, right)
    case TokenType.GREATER:
      return mod.i32.gt_s(left, right)
    case TokenType.GREATER_EQUAL:
      return mod.i32.ge_s(left, right)
    case TokenType.EQUAL_EQUAL:
      return mod.i32.eq(left, right)
    case TokenType.BANG_EQUAL:
      return mod.i32.ne(left, right)
    default:
      reportError(expression.operator, 'Unsupported binary operator.', COMPILE_ERROR)
  }
}

/**
 * Process a literal value.
 * i32 are returned for numbers and booleans.
 * Strings are stored in memory as a side effect and their starting position are returned.
 */
function literalExpression(
  expression: LiteralExpr,
  storagePos: number = strLiteralMemoryPos
): binaryen.ExpressionRef {
  switch (typeof expression.value) {
    case 'number':
      return mod.i32.const(expression.value)
    case 'boolean':
      return mod.i32.const(expression.value ? 1 : 0)
    case 'string': {
      // Storing all strings with newline appended - since no operations exist on strings other than print - this is fine - if a new string operation is added like string concatenaion ++, then the newline char can be stored at a specific position in memory and printed everytime a string is printed
      let str = expression.value + '\n'
      let strArr = new TextEncoder().encode(str)

      let instrs = []
      for (let [i, charCode] of strArr.entries()) {
        instrs.push(mod.i32.store8(0, 1, mod.i32.const(storagePos + i), mod.i32.const(charCode)))
      }
      instrs.push(mod.i32.const(storagePos))

      if (arguments.length < 3) {
        strLiteralMemoryPos += strArr.length
      }
      return mod.block(null, instrs, binaryen.i32)
    }
    default:
      console.error(expression)
      throw Error('Unsupported literal expression.')
  }
}

function unaryExpression(expression: UnaryExpr): binaryen.ExpressionRef {
  switch (expression.operator.type) {
    case TokenType.MINUS: {
      let expr = compileExpression(expression.right)
      return mod.i32.sub(mod.i32.const(0), expr)
    }
    default:
      console.error(expression.operator)
      throw Error(`Unsupported binary operator.`)
  }
}

function callExpression(expression: CallExpr): binaryen.ExpressionRef {
  let fnName = expression.callee.name.lexeme
  if (fnName == 'println') {
    return printFunction(expression)
  }

  let args = expression.args.map((arg) => compileExpression(arg))
  let returnType: ValueType = functionTable.get(fnName)!.returnType

  return mod.call(fnName, args, tokenTypeToBinaryen.get(returnType))
}

function assignExpression(expr: AssignExpr): binaryen.ExpressionRef {
  let varName = expr.name.lexeme
  let varInfo = findVariable(varName)
  if (!varInfo) {
    throw Error('Cannot assign to undeclared variable.')
  }

  if (varInfo.type == TokenType.TYPE_STR) {
    if (expr.value.type == 'LiteralExpr' && typeof expr.value.value == 'string') {
      let newStrLen = new TextEncoder().encode(expr.value.value + '\n').length
      varInfo.strLen = newStrLen
    } else {
      throw Error('String variables can only be reassigned to literals.')
    }
  }

  let value = compileExpression(expr.value)
  return mod.local.set(varInfo.index, value)
}

/** Compiles a `println` function call */
function printFunction(expression: CallExpr): binaryen.ExpressionRef {
  let argExpr = expression.args[0]!

  if (argExpr.type == 'VariableExpr') {
    let identifier = argExpr.name.lexeme
    let varInfo = findVariable(identifier)
    if (!varInfo) {
      throw Error('Undefined variable - print function')
    }

    if (varInfo.type == TokenType.TYPE_STR) {
      let strAddress = mod.local.get(varInfo.index, binaryen.i32)
      if (!varInfo.strLen) {
        throw Error('Unable to compute string length at compile time')
      }
      return callWrite(undefined, mod.i32.const(varInfo.strLen), strAddress)
    } else {
      // Handles non literals like 42 + 3
      return callWrite(compileExpression(argExpr))
    }
  }

  if (argExpr.type === 'LiteralExpr' && typeof argExpr.value === 'string') {
    argExpr.value = argExpr.value + '\n'
    let str = argExpr.value
    let strLen = new TextEncoder().encode(str).length

    const TEMP_STR_LITERAL_POS = 2048

    return mod.block(null, [
      mod.drop(literalExpression(argExpr, TEMP_STR_LITERAL_POS)),
      callWrite(undefined, mod.i32.const(strLen), mod.i32.const(TEMP_STR_LITERAL_POS)),
    ])
  } else {
    return callWrite(compileExpression(argExpr))
  }
}

/** Calls the write function provided by WASI */
function callWrite(
  expr?: binaryen.ExpressionRef,
  strLen?: binaryen.ExpressionRef,
  bufferPtr: number = mod.i32.const(66)
) {
  if (expr && !strLen) {
    strLen = mod.call('itoa', [expr, bufferPtr], binaryen.i32)
  }

  // ewww - when we print an int we pass expr, when we print a string we pass strlen - both are never passed - modify the function so we don't need this check below
  if (!strLen) {
    throw Error('Failed to compute strLen')
  }

  return mod.block(null, [
    // iovec structure
    mod.i32.store(0, 4, mod.i32.const(0), bufferPtr),
    mod.i32.store(0, 4, mod.i32.const(4), strLen),

    mod.drop(
      mod.call(
        'write',
        [
          mod.i32.const(1), // stdout
          mod.i32.const(0), // iovec start address
          mod.i32.const(1), // read this many iovecs
          mod.i32.const(92), // nwritten
        ],
        binaryen.i32
      )
    ),
  ])
}

// Utils

/** Defines a variable in the current scope */
function defineVariable(name: string, type: ValueType, strLen?: number): VariableInfo {
  let currentScope = scopes[scopes.length - 1]
  if (currentScope?.has(name)) {
    throw Error('the variable already exists in the current scope.')
  }

  const info: VariableInfo = {
    index: functionVars.length,
    type,
    strLen,
  }

  currentScope?.set(name, info)
  functionVars.push(tokenTypeToBinaryen.get(type))
  return info
}

/** Looks for a variable in the current scope, moving up in scope to parent if not found */
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
