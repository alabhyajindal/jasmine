import type { BinaryExpr, Expr, LiteralExpr } from './Expr';
import type Token from './Token';
import TokenType from './TokenType';

// Initializing variables
let current = 0;
let tokens: Token[];

function statement() {
  let expr = expression();
  if (consume(TokenType.NEWLINE)) {
    return expr;
  }
}

// Parser currently generates incorrect parse tree (left or right associativity issue)
function expression() {
  let expr = primary();
  while (consume(TokenType.PLUS, TokenType.MINUS)) {
    let operator = previous();
    let right = primary();
    expr = { left: expr, operator, right, type: 'BinaryExpr' } as BinaryExpr;
  }
  return expr;
}

function primary() {
  if (consume(TokenType.INTEGER)) {
    return { value: previous().literal, type: 'LiteralExpr' } as LiteralExpr;
  }
}

export default function parse(t: Token[]): Expr {
  tokens = t;
  let stmt = statement();
  return stmt;
}

function advance() {
  current++;
}

function consume(...expected: TokenType[]) {
  if (expected.includes(tokens[current].type)) {
    advance();
    return true;
  }
  return false;
}

function previous() {
  return tokens[current - 1];
}
