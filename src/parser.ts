import type Token from './Token';
import TokenType from './TokenType';

export interface BinaryExpr {
  type: 'BinaryExpr';
  left: Token;
  operator: TokenType;
  right: Token;
}

export default function parse(tokens: Token[]) {
  console.log(tokens);
  let current = 0;

  function isAtEnd() {
    if (current >= tokens.length) {
      return true;
    }
  }

  function nextToken() {
    if (!isAtEnd()) {
      return tokens[current + 1];
    }
  }

  function parseExpression(token: Token) {
    if (token.type == TokenType.INTEGER) {
      let left = token;
      if (nextToken()?.type == TokenType.PLUS || TokenType.MINUS) {
        current++;
        let operator = tokens[current]?.type;
        current++;
        let right = tokens[current];
        if (!right) throw Error;
        return { type: 'BinaryExpr', left, operator, right } as BinaryExpr;
      }
      return { type: 'Expr', expression: left };
    }
  }

  let expr;
  let token = tokens[current];
  while (token && token?.type != TokenType.EOF) {
    expr = parseExpression(token);
    token = tokens[++current];
  }

  return expr;
}
