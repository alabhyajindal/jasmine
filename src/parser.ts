import { PARSE_ERROR, reportError } from './error'
import type { BinaryExpr, Expr, LiteralExpr, UnaryExpr, VariableExpr } from './Expr'
import type { BlockStmt, ExprStmt, FunDecl, IfStmt, ReturnStmt, Stmt, VariableStmt } from './Stmt'
import type Token from './Token'
import TokenType from './TokenType'
import { ValueTypes, type ValueType } from './ValueType'

// Initializing variables
let current = 0
let tokens: Token[]

export default function parse(t: Token[]) {
  // Reset globals
  current = 0
  tokens = t

  let statements = []
  while (!isAtEnd()) {
    statements.push(statement())
  }

  return statements
}

function statement() {
  if (match(TokenType.LET)) {
    return variableStatement()
  }
  if (match(TokenType.LEFT_BRACE)) {
    return blockStatement()
  }
  if (match(TokenType.IF)) {
    return ifStatement()
  }
  if (match(TokenType.FN)) {
    return funDeclaration()
  }
  if (match(TokenType.RETURN)) {
    return returnStatement()
  }

  return expressionStatement()
}

function variableStatement(): VariableStmt {
  let name = consume(TokenType.IDENTIFER, 'Expect variable name.')
  consume(TokenType.COLON, 'Expect colon.')
  let varType = consume(ValueTypes, 'Expect variable type.')

  consume(TokenType.EQUAL, 'Expect equal sign.')
  let initializer = expression()
  consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')
  return { name, initializer, type: 'VariableStmt', valueType: varType.type }
}

function blockStatement(): BlockStmt {
  let statements = []

  while (!check(TokenType.RIGHT_BRACE)) {
    statements.push(statement())
  }

  consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
  return { type: 'BlockStmt', statements }
}

function ifStatement(): IfStmt {
  let condition = expression()
  let thenBranch = statement()
  let elseBranch = null
  if (match(TokenType.ELSE)) {
    elseBranch = statement()
  }

  return { condition, thenBranch, elseBranch, type: 'IfStmt' }
}

function funDeclaration(): FunDecl {
  let name = consume(TokenType.IDENTIFER, 'Expect function name.')
  consume(TokenType.LEFT_PAREN, "Expect '(' after function name.")

  let params: { name: string; type: ValueType }[] = []

  if (!check(TokenType.RIGHT_PAREN)) {
    do {
      let name = consume(TokenType.IDENTIFER, 'Expect parameter name.').lexeme
      match(TokenType.COLON)
      let type = consume(ValueTypes, 'Expect parameter type.').type
      params.push({ name, type })
    } while (match(TokenType.COMMA))
  }

  consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")
  consume(TokenType.ARROW, "Expect '->' after parameters.")
  let returnType = consume(ValueTypes, "Expect return type after '->'.").type

  consume(TokenType.LEFT_BRACE, "Expect '{' before function body.")
  let body = blockStatement()
  return { name, params, returnType, body, type: 'FunDecl' }
}

function returnStatement(): ReturnStmt {
  let value = null
  if (!check(TokenType.SEMICOLON)) {
    value = expression()
  }
  consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')

  return { value: value as Expr, type: 'ReturnStmt' }
}

function expressionStatement(): ExprStmt {
  let expr = expression()
  consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')
  return { expression: expr, type: 'ExprStmt' }
}

function expression(): Expr {
  return equality()
}

function equality(): Expr {
  let expr = comparison()
  while (match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
    let operator = previous()
    let right = comparison()
    expr = { left: expr, operator, right, type: 'BinaryExpr' }
  }

  return expr
}

function comparison(): Expr {
  let expr = term()

  while (match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
    let operator = previous()
    let right = term()
    expr = { left: expr, operator, right, type: 'BinaryExpr' }
  }

  return expr
}

function term(): Expr {
  let expr = factor()
  while (match(TokenType.PLUS, TokenType.MINUS)) {
    let operator = previous()
    let right = factor()
    expr = { left: expr, operator, right, type: 'BinaryExpr' }
  }

  return expr
}

function factor(): Expr {
  let expr: Expr = unary()
  while (match(TokenType.SLASH, TokenType.STAR)) {
    let operator = previous()
    let right = unary()
    expr = { left: expr, operator, right, type: 'BinaryExpr' }
  }

  return expr
}

function unary(): Expr {
  if (match(TokenType.BANG, TokenType.MINUS)) {
    let operator = previous()
    let right = unary()
    return { operator, right, type: 'UnaryExpr' }
  }

  return call()
}

function call(): Expr {
  let expr = primary()

  if (match(TokenType.LEFT_PAREN)) {
    let args = []
    if (!check(TokenType.RIGHT_PAREN)) {
      do {
        args.push(expression())
      } while (match(TokenType.COMMA))
    }
    if (expr.type == 'VariableExpr' && expr.name.lexeme == 'println') {
      if (args.length != 1) {
        reportError(peek(), 'println expects a single argument.', PARSE_ERROR)
      }
    }

    consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.")
    return { callee: expr as VariableExpr, args, type: 'CallExpr' }
  }

  return expr
}

function primary(): Expr {
  if (match(TokenType.TRUE)) {
    return { value: true, type: 'LiteralExpr' }
  }
  if (match(TokenType.FALSE)) {
    return { value: false, type: 'LiteralExpr' }
  }
  if (match(TokenType.INTEGER)) {
    return { value: previous().literal as number, type: 'LiteralExpr' }
  }
  if (match(TokenType.STRING)) {
    return { value: previous().literal as string, type: 'LiteralExpr' }
  }
  if (match(TokenType.IDENTIFER)) {
    return { name: previous(), type: 'VariableExpr' }
  }
  if (match(TokenType.LEFT_PAREN)) {
    let expr = expression()
    consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
    return { expression: expr, type: 'GroupingExpr' }
  }

  reportError(peek(), 'Invalid literal expression.', PARSE_ERROR)
}

function match(...types: TokenType[]) {
  for (let type of types) {
    if (check(type)) {
      advance()
      return true
    }
  }
  return false
}

function check(type: TokenType) {
  if (isAtEnd()) return false
  return peek()?.type == type
}

function advance() {
  if (!isAtEnd()) current++
  return previous()
}

function isAtEnd() {
  return peek().type == TokenType.EOF
}

function peek() {
  return tokens[current]!
}

function previous() {
  return tokens[current - 1]!
}

function consume<T extends TokenType>(type: readonly T[] | T, msg: string): Token & { type: T } {
  const types = Array.isArray(type) ? type : [type]

  for (let t of types) {
    if (check(t)) {
      return advance() as Token & { type: T }
    }
  }
  reportError(peek(), msg, PARSE_ERROR)
}
