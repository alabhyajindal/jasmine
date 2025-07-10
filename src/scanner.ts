import type Token from './Token'
import TokenType from './TokenType'

const keywords: Record<string, TokenType> = {
  and: TokenType.AND,
  else: TokenType.ELSE,
  false: TokenType.FALSE,
  fn: TokenType.FN,
  if: TokenType.IF,
  let: TokenType.LET,
  or: TokenType.OR,
  return: TokenType.RETURN,
  true: TokenType.TRUE,
  while: TokenType.WHILE,
  print: TokenType.PRINT,
}

const types: Record<string, TokenType> = {
  int: TokenType.TYPE_INT,
}

let start = 0
let current = 0
let line = 1
let tokens: Token[] = []
let source = ''

export default function scan(sourceText: string) {
  source = sourceText

  while (!isAtEnd()) {
    start = current
    scanToken()
  }

  tokens.push({ type: TokenType.EOF, lexeme: '', literal: null, line })
  return tokens
}

function scanToken() {
  let c = advance()
  switch (c) {
    case '(':
      addToken(TokenType.LEFT_PAREN)
      break
    case ')':
      addToken(TokenType.RIGHT_PAREN)
      break
    case '{':
      addToken(TokenType.LEFT_BRACE)
      // Skip newlines after entering a block
      while (peek() == '\n') {
        advance()
        line++
      }
      break
    case '}':
      addToken(TokenType.RIGHT_BRACE)
      // Skip new lines after exiting a block
      while (peek() == '\n') {
        advance()
        line++
      }
      break
    case ':':
      addToken(TokenType.COLON)
      break
    case ',':
      addToken(TokenType.COMMA)
      break
    case '.':
      addToken(TokenType.DOT)
      break
    case '-':
      match('>') ? addToken(TokenType.ARROW) : addToken(TokenType.MINUS)
      break
    case '+':
      addToken(TokenType.PLUS)
      break
    case '*':
      addToken(TokenType.STAR)
      break
    case '/':
      addToken(TokenType.SLASH)
      break
    case '!':
      match('=') ? addToken(TokenType.BANG_EQUAL) : addToken(TokenType.BANG)
      break
    case '=':
      match('=') ? addToken(TokenType.EQUAL_EQUAL) : addToken(TokenType.EQUAL)
      break
    case '<':
      match('=') ? addToken(TokenType.LESS_EQUAL) : addToken(TokenType.LESS)
      break
    case '>':
      match('=') ? addToken(TokenType.GREATER_EQUAL) : addToken(TokenType.GREATER)
      break
    case '#':
      while (peek() != '\n' && !isAtEnd()) {
        advance()
      }
      // Advance again to skip the new line character
      advance()
      line++
      break
    case ' ':
    case '\r':
    case '\t':
      break
    case '\n':
      addToken(TokenType.NEWLINE)
      line++
      break
    case "'":
      string()
      break
    default:
      if (isDigit(c)) {
        number()
        // Identifiers must begin with a character
      } else if (isAlpha(c)) {
        identifier()
      } else {
        console.error(c)
        throw Error('Not implemented.')
      }
  }
}

function isAtEnd() {
  return current >= source.length
}

function advance() {
  current++
  return source[current - 1]!
}

function addToken(type: TokenType, literal: Token['literal'] = null) {
  let lexeme = source.substring(start, current)
  tokens.push({ type, lexeme, literal, line } as Token)
}

function match(expected: string) {
  if (isAtEnd()) {
    return false
  }
  if (source[current] != expected) {
    return false
  }

  current++
  return true
}

function peek() {
  if (isAtEnd()) {
    return '\0'
  }
  return source[current]!
}

function number() {
  while (isDigit(peek())) {
    advance()
  }

  let value = Number.parseInt(source.substring(start, current))
  addToken(TokenType.INTEGER, value)
}

function string() {
  while (peek() != "'") {
    advance()
  }

  if (isAtEnd()) {
    reportError('Unterminated string.')
    return
  }

  advance()
  let value = source.substring(start + 1, current - 1)
  addToken(TokenType.STRING, value)
}

// Handles keywords, types and identifiers
function identifier() {
  while (isUnderscore(peek()) || isAlpha(peek()) || isDigit(peek())) {
    advance()
  }

  let text = source.substring(start, current)
  let type = keywords[text] || types[text] || TokenType.IDENTIFER

  addToken(type)
}

function isDigit(char: string) {
  return /\d/.test(char)
}

function isAlpha(char: string) {
  return /[A-Z]|[a-z]/.test(char)
}

function isUnderscore(char: string) {
  return /\_/.test(char)
}
