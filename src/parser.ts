import { TokenType, type Token } from './scanner';

export interface BinaryExpr {
  type: 'BinaryExpr';
  left: Token;
  operator: TokenType;
  right: Token;
}

export default function parse(tokens: Token[]) {
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
    if (token.type == TokenType.NUMBER) {
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
  while (!isAtEnd()) {
    let token = tokens[current];
    if (!token) return;
    expr = parseExpression(token);
    current++;
  }

  return expr;
}
