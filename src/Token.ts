import type TokenType from './TokenType';

export default interface Token {
  type: TokenType;
  lexeme: string;
  literal: any;
  line: number;
}
