import { PARSE_ERROR, reportError } from './error'
import type { BinaryExpr, Expr, LiteralExpr, UnaryExpr, VariableExpr } from './Expr'
import type { BlockStmt, ExprStmt, FunDecl, IfStmt, PrintStmt, Stmt, VariableStmt } from './Stmt'
import type Token from './Token'
import TokenType from './TokenType'

// Initializing variables
let current = 0
let tokens: Token[]

export default function parse(t: Token[]) {
  tokens = t
  let statements = []
  while (!isAtEnd()) {
    statements.push(statement())
  }

  return statements
}

function statement() {
  if (match(TokenType.PRINT)) {
    return printStatement()
  }
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

  return expressionStatement()
}

function printStatement(): PrintStmt {
  let value = expression()
  consume(TokenType.NEWLINE, 'Expect newline after expression.')
  return { expression: value, type: 'PrintStmt' }
}

function variableStatement(): VariableStmt {
  let name = consume(TokenType.IDENTIFER, 'Expect variable name.')
  consume(TokenType.EQUAL, 'Expect equal sign.')
  let initializer = expression()
  consume(TokenType.NEWLINE, 'Expect newline after expression.')
  return { name, initializer, type: 'VariableStmt' }
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
  consume(TokenType.LEFT_PAREN, "Expect '(' after 'if'.")
  let condition = expression()
  consume(TokenType.RIGHT_PAREN, "Expect ')' after if condition.")

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

  let params = []
  // Get the first parameter if no right paren
  if (!check(TokenType.RIGHT_PAREN)) {
    params.push(consume(TokenType.IDENTIFER, 'Expect parameter name.'))
  }
  // Get the remaining parameters
  while (peek().type != TokenType.RIGHT_PAREN) {
    match(TokenType.COMMA)
    params.push(consume(TokenType.IDENTIFER, 'Expect parameter name.'))
  }
  consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")

  consume(TokenType.LEFT_BRACE, "Expect '{' before function body.")
  let body = blockStatement()
  return { name, params, body, type: 'FunDecl' }
}

function expressionStatement(): ExprStmt {
  let expr = expression()
  consume(TokenType.NEWLINE, 'Expect newline after expression.')
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

    consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.")
    return { callee: expr, args, type: 'CallExpr' }
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

function consume(type: TokenType, msg: string) {
  if (check(type)) {
    return advance()
  }
  reportError(peek(), msg, PARSE_ERROR)
}
