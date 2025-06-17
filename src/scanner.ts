export enum TokenType {
  NUMBER = 'NUMBER',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
}

export interface Token {
  type: TokenType;
  literal: any;
}

export default function scan(source: string) {
  let tokens: Token[] = [];

  for (let char of source) {
    if (char.match(/\d/g)) {
      tokens.push({ type: TokenType.NUMBER, literal: Number(char) });
    } else if (char.match(/\+/)) {
      tokens.push({ type: TokenType.PLUS, literal: '+' });
    } else if (char.match(/\-/)) {
      tokens.push({ type: TokenType.MINUS, literal: '-' });
    }
  }

  return tokens;
}
