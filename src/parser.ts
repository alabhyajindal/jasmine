import type { BinaryExpr, Expr, LiteralExpr } from './Expr';
import type Token from './Token';
import TokenType from './TokenType';

// Initializing variables
let current = 0;
let tokens: Token[];

function statement() {
  let expr = expression();
  console.log(expr);
  if (match(TokenType.NEWLINE)) {
    return expr;
  }
}

function expression() {
  return equality();
}

function equality() {
  let expr = comparison();
  while (match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
    let operator = previous();
    let right = comparison();
    expr = { left: expr, operator, right };
  }

  return expr;
}

function comparison() {
  let expr = term();

  while (match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
    let operator = previous();
    let right = term();
    expr = { left: expr, operator, right };
  }

  return expr;
}

function term() {
  let expr = factor();
  while (match(TokenType.PLUS, TokenType.MINUS)) {
    let operator = previous();
    let right = primary();
    expr = { left: expr, operator, right, type: 'BinaryExpr' } as BinaryExpr;
  }

  return expr;
}

function factor() {
  let expr = unary();
  while (match(TokenType.SLASH, TokenType.STAR)) {
    let operator = previous();
    let right = unary();
    expr = { left: expr, operator, right, type: 'BinaryExpr' };
  }

  return expr;
}

function unary() {
  if (match(TokenType.BANG, TokenType.MINUS)) {
    let operator = previous();
    let right = unary();
    return { operator, right };
  }

  return primary();
}

function primary() {
  if (match(TokenType.INTEGER)) {
    return { value: previous().literal, type: 'LiteralExpr' } as LiteralExpr;
  }
}

export default function parse(t: Token[]): Expr {
  tokens = t;
  let stmt = statement();
  return stmt;
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

function check(type) {
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
  return tokens[current];
}

function previous() {
  return tokens[current - 1];
}
