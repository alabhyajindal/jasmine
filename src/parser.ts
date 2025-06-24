import type { BinaryExpr, Expr, LiteralExpr, UnaryExpr } from './Expr';
import type { ExprStmt, PrintStmt, Stmt } from './Stmt';
import type Token from './Token';
import TokenType from './TokenType';

// Initializing variables
let current = 0;
let tokens: Token[];

export default function parse(t: Token[]) {
  tokens = t;
  let statements = [];
  while (!isAtEnd()) {
    statements.push(statement());
  }

  // console.log(JSON.stringify(statements));
  return statements;
}

function statement() {
  if (match(TokenType.PRINT)) {
    return printStatement();
  }

  return expressionStatement();
}

function printStatement(): PrintStmt {
  let value = expression();
  consume(TokenType.NEWLINE, "Expected '\n' after expression.");
  return { expression: value, type: 'PrintStmt' };
}

function expressionStatement(): ExprStmt {
  let expr = expression();
  consume(TokenType.NEWLINE, "Expected '\n' after expression.");
  return { expression: expr, type: 'ExprStmt' };
}

function expression(): Expr {
  return equality();
}

function equality(): Expr {
  let expr = comparison();
  while (match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
    let operator = previous();
    let right = comparison();
    expr = { left: expr, operator, right, type: 'BinaryExpr' };
  }

  return expr;
}

function comparison(): Expr {
  let expr = term();

  while (match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
    let operator = previous();
    let right = term();
    expr = { left: expr, operator, right, type: 'BinaryExpr' };
  }

  return expr;
}

function term(): Expr {
  let expr = factor();
  while (match(TokenType.PLUS, TokenType.MINUS)) {
    let operator = previous();
    let right = factor();
    expr = { left: expr, operator, right, type: 'BinaryExpr' };
  }

  return expr;
}

function factor(): Expr {
  let expr: Expr = unary();
  while (match(TokenType.SLASH, TokenType.STAR)) {
    let operator = previous();
    let right = unary();
    expr = { left: expr, operator, right, type: 'BinaryExpr' };
  }

  return expr;
}

function unary(): UnaryExpr | LiteralExpr {
  if (match(TokenType.BANG, TokenType.MINUS)) {
    let operator = previous();
    let right = unary();
    return { operator, right } as UnaryExpr;
  }

  return primary();
}

function primary(): LiteralExpr {
  if (match(TokenType.INTEGER)) {
    return { value: previous().literal as number, type: 'LiteralExpr' };
  }
  throw new Error('Bad literal expression.');
}

function match(...types: TokenType[]) {
  for (let type of types) {
    if (check(type)) {
      advance();
      return true;
    }
  }
  return false;
}

function check(type: TokenType) {
  if (isAtEnd()) return false;
  return peek()?.type == type;
}

function advance() {
  if (!isAtEnd()) current++;
  return previous();
}

function isAtEnd() {
  return peek().type == TokenType.EOF;
}

function peek() {
  return tokens[current]!;
}

function previous() {
  return tokens[current - 1]!;
}

function consume(type: TokenType, msg: string) {
  if (check(type)) {
    return advance();
  }

  reportError(peek(), msg);
}

function reportError(token: Token, msg: string) {
  console.error(`[line ${token.line} Error at ${token.lexeme}: ${msg}`);
}
