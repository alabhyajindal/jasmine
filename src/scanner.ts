import type Token from './Token';
import TokenType from './TokenType';

let start = 0;
let current = 0;
let line = 1;
let tokens: Token[] = [];
let source = '';

export default function scan(sourceText: string) {
  source = sourceText;

  while (!isAtEnd()) {
    start = current;
    scanToken();
  }
  return tokens;
}

function scanToken() {
  let c = advance();
  switch (c) {
    case '(':
      addToken(TokenType.LEFT_PAREN);
      break;
    case ')':
      addToken(TokenType.RIGHT_PAREN);
      break;
    case '{':
      addToken(TokenType.LEFT_BRACE);
      break;
    case '}':
      addToken(TokenType.RIGHT_BRACE);
      break;
    case ',':
      addToken(TokenType.COMMA);
      break;
    case '.':
      addToken(TokenType.DOT);
      break;
    case '-':
      addToken(TokenType.MINUS);
      break;
    case '+':
      addToken(TokenType.PLUS);
      break;
    case '*':
      addToken(TokenType.STAR);
      break;
    case '/':
      addToken(TokenType.SLASH);
      break;
    default:
      if (isDigit(c)) {
        number();
      }
  }
}

function isAtEnd() {
  return current >= source.length;
}

function advance() {
  current++;
  return source[current - 1]!;
}

function addToken(type: TokenType, literal: null | string | number = null) {
  let lexeme = source.substring(start, current);
  tokens.push({ type, lexeme, literal, line } as Token);
}

// function match(expected) {
//   if (isAtEnd()) {
//     return false;
//   }
//   if (source[current] != expected) {
//     return false;
//   }

//   current++;
//   return true;
// }

function peek() {
  if (isAtEnd()) {
    return '\0';
  }
  return source[current]!;
}

function number() {
  while (isDigit(peek())) {
    advance();
  }

  let value = Number.parseInt(source.substring(start, current));
  addToken(TokenType.INTEGER, value);
}

function isDigit(char: string) {
  return /\d/.test(char);
}
