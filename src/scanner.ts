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

  tokens.push({ type: TokenType.EOF, lexeme: '', literal: null, line });
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
    case '!':
      match('=') ? addToken(TokenType.BANG_EQUAL) : addToken(TokenType.BANG);
      break;
    case '=':
      match('=') ? addToken(TokenType.EQUAL_EQUAL) : addToken(TokenType.EQUAL);
      break;
    case '<':
      match('=') ? addToken(TokenType.LESS_EQUAL) : addToken(TokenType.LESS);
      break;
    case '>':
      match('=') ? addToken(TokenType.GREATER_EQUAL) : addToken(TokenType.GREATER);
      break;
    case '#':
      while (peek() != '\n' && !isAtEnd()) {
        advance();
      }
      // Advance again to skip the new line character
      advance();
      line++;
      break;
    case ' ':
    case '\r':
    case '\t':
      break;
    case '\n':
      addToken(TokenType.NEWLINE);
      line++;
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

function addToken(type: TokenType, literal: Token['literal'] = null) {
  let lexeme = source.substring(start, current);
  tokens.push({ type, lexeme, literal, line } as Token);
}

function match(expected: string) {
  if (isAtEnd()) {
    return false;
  }
  if (source[current] != expected) {
    return false;
  }

  current++;
  return true;
}

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
