import type { BinaryExpr, LiteralExpr } from './Expr';
import type Token from './Token';
import TokenType from './TokenType';

// Initializing variables
let current = 0;
let tokens: Token[];

function parseStatement() {
  let expr = parseExpression();
  console.log(expr);
  if (consume(TokenType.NEWLINE)) {
    return true;
  }
}

function parseExpression() {
  let left = parseTerm();
  if (consume(TokenType.PLUS)) {
    let operator = previous();
    let right = parseTerm();
    return { left, operator, right } as BinaryExpr;
  }
}

function parseTerm() {
  if (consume(TokenType.INTEGER)) {
    return { value: previous().literal } as LiteralExpr;
  }
}

export default function parse(t: Token[]) {
  tokens = t;
  parseStatement();
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
