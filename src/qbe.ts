import { reportError } from './error'
import type { AssignExpr, BinaryExpr, CallExpr, Expr, LiteralExpr, VariableExpr } from './Expr'
import type { Stmt } from './Stmt'
import TokenType from './TokenType'

let scopeStack: Map<string, [string, any]>[] = []

let main: string[] = []
let data: string[] = [`data $fmt = { b "%d\\n", b 0 }`]

function formIL() {
  return `${data.join('\n')}

export function w $main() {
@start
  ${main.join('\n  ')}
  ret 0
}`
}

export default function compile(stmts: Stmt[]) {
  beginScope()
  compileStatements(stmts)
  const il = formIL()
  endScope()

  return il
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
    case 'VariableStmt': {
      let varName = getVarName()
      let val = compileExpression(stmt.initializer)
      let varType = stmt.valueType

      declareVariable(stmt.name.lexeme, varName, varType)

      main.push(`${varName} = w copy ${val}`)
      return varName
    }
    case 'IfStmt': {
      let condition = compileExpression(stmt.condition)

      let thenLabel = getBlockLabel()
      let elseLabel = stmt.elseBranch ? getBlockLabel() : null
      let endLabel = getBlockLabel()

      let falseTarget = elseLabel ? `${elseLabel}` : `${endLabel}`
      main.push(`jnz ${condition}, ${thenLabel}, ${falseTarget}`)

      main.push(`${thenLabel}`)
      compileStatement(stmt.thenBranch)
      main.push(`jmp ${endLabel}`)

      if (stmt.elseBranch && elseLabel) {
        main.push(`${elseLabel}`)
        compileStatement(stmt.elseBranch)
        main.push(`jmp ${endLabel}`)
      }

      main.push(`${endLabel}`)
      break
    }
    case 'BlockStmt': {
      beginScope()
      compileStatements(stmt.statements)
      endScope()
      break
    }
    case 'ForStmt': {
      let startVal = compileExpression(stmt.start)
      let endVal = compileExpression(stmt.end)

      // Create unique labels for the loop structure
      let conditionLabel = getBlockLabel()
      let bodyLabel = getBlockLabel()
      let endLabel = getBlockLabel()

      beginScope()
      let loopVarName = getVarName()
      declareVariable(stmt.variable, loopVarName, TokenType.TYPE_INT)
      main.push(`${loopVarName} =w copy ${startVal}`)

      // Jump to condition check
      main.push(`jmp ${conditionLabel}`)

      // Condition check: continue while loopVar < endVal
      main.push(`${conditionLabel}`)
      let condResult = getVarName()
      main.push(`${condResult} =w csltw ${loopVarName}, ${endVal}`)
      main.push(`jnz ${condResult}, ${bodyLabel}, ${endLabel}`)

      // Loop body execution
      main.push(`${bodyLabel}`)
      compileStatement(stmt.body)

      // Increment loop counter
      let incrementResult = getVarName()
      main.push(`${incrementResult} =w add ${loopVarName}, 1`)
      main.push(`${loopVarName} =w copy ${incrementResult}`)
      main.push(`jmp ${conditionLabel}`)

      main.push(`${endLabel}`)
      endScope()
      break
    }
    default:
      console.error(stmt)
      reportError('Unsupported statement.')
  }
}

function compileExpression(expression: Expr) {
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(expression)
    case 'GroupingExpr':
      return compileExpression(expression.expression)
    case 'LiteralExpr':
      return literalExpression(expression)
    case 'VariableExpr':
      return variableExpression(expression)
    case 'AssignExpr':
      return assignExpression(expression)
    case 'CallExpr':
      return callExpression(expression)
    default:
      console.error(expression)
      reportError('Unsupported expression.')
  }
}

function binaryExpression(expression: BinaryExpr) {
  let left = compileExpression(expression.left)
  let right = compileExpression(expression.right)

  const operatorMap: Partial<Record<TokenType, string>> = {
    PLUS: 'add',
    MINUS: 'sub',
    SLASH: 'div',
    STAR: 'mul',
    LESS: 'csltw',
    LESS_EQUAL: 'cslew',
    GREATER: 'csgtw',
    GREATER_EQUAL: 'csgew',
    EQUAL_EQUAL: 'ceqw',
    BANG_EQUAL: 'cnew',
  }
  let varName = getVarName()
  main.push(`${varName} =w ${operatorMap[expression.operator.type]} ${left}, ${right}`)
  return varName
}

function literalExpression(expression: LiteralExpr) {
  switch (typeof expression.value) {
    case 'number':
      return expression.value
    case 'string':
      let strName = getStringName()
      let val = expression.value
      data.push(`data ${strName} = { b "${val}", b 0 }`)
      return strName
    case 'boolean':
      return expression.value ? 1 : 0
    default:
      console.error(expression)
      reportError('Unsupported literal expression.')
  }
}

function variableExpression(expression: VariableExpr) {
  const result = lookupVariable(expression.name.lexeme)
  if (!result) {
    reportError(`Undefined variable: ${expression.name.lexeme}`)
  }
  return result[0]
}

function assignExpression(expression: AssignExpr) {
  let val = compileExpression(expression.value)

  let result = lookupVariable(expression.name.lexeme)
  if (!result) {
    reportError(`Undefined variable: ${expression.name.lexeme}`)
  }

  let [varName, _] = result
  main.push(`${varName} =w copy ${val}`)
  return expression.name.lexeme
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
      data.push(`data ${strName} = { b "${val}", b 0 }`)
      main.push(`call $puts(w ${strName})`)
    } else {
      main.push(`call $printf(l $fmt, ..., w ${val})`)
    }
  } else if (argExpr.type == 'VariableExpr') {
    let varName = compileExpression(argExpr)

    let result = lookupVariable(argExpr.name.lexeme)
    if (result) {
      let [_, varType] = result
      if (varType == TokenType.TYPE_STR) {
        main.push(`call $puts(w ${varName})`)
      } else {
        main.push(`call $printf(l $fmt, ..., w ${varName})`)
      }
    }
  } else {
    let val = compileExpression(argExpr)
    main.push(`call $printf(l $fmt, ..., w ${val})`)
  }
}

// Scope
function beginScope() {
  scopeStack.push(new Map())
}

function endScope() {
  scopeStack.pop()
}

function declareVariable(name: string, ilName: string, type: any) {
  const currentScope = scopeStack[scopeStack.length - 1]
  // Current scope will always exist since we create the topmost scope in `compile`
  currentScope!.set(name, [ilName, type])
}

function lookupVariable(name: string): [string, any] | null {
  // Search from innermost to outermost scope
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    const scope = scopeStack[i]!
    if (scope.has(name)) {
      return scope.get(name)!
    }
  }
  return null
}

// Utils
let strCounter = 0
let varCounter = 0
let blockCounter = 0

/**
 * Generate unique string names
 */
function getStringName(): string {
  strCounter++
  return `$str_${strCounter}`
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
  return `%${result}`
}

/**
 * Generate unique block labels
 */
function getBlockLabel(): string {
  blockCounter++
  return `@block_${blockCounter}`
}
