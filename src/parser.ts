import type { BinaryExpr, Expr, LiteralExpr } from './Expr';
import type Token from './Token';
import TokenType from './TokenType';

// Initializing variables
let current = 0;
let tokens: Token[];

function parseStatement() {
  let expr = parseExpression();
  if (consume(TokenType.NEWLINE)) {
    return expr;
  }
}

// make the parser handle any number of additions (a + b + c) - update grammar first - then parser - then go to code generation
function parseExpression() {
  let left = parseTerm();
  while (consume(TokenType.PLUS)) {
    let operator = previous();
    let right = parseExpression();
    return { left, operator, right, type: 'BinaryExpr' } as BinaryExpr;
  }
  return left;
}

function parseTerm() {
  if (consume(TokenType.INTEGER)) {
    return { value: previous().literal, type: 'LiteralExpr' } as LiteralExpr;
  }
}

export default function parse(t: Token[]): Expr {
  tokens = t;
  let stmt = parseStatement();
  return stmt;
}

function advance() {
  current++;
}

function consume(expected: TokenType) {
  if (tokens[current].type == expected) {
    advance();
    return true;
  }
  return false;
}

function previous() {
  return tokens[current - 1];
}
