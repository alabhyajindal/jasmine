import type Token from './Token'
import TokenType from './TokenType'
import type { ValueType } from './ValueType'
import { reportError } from './error'

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
    for: TokenType.FOR,
    in: TokenType.IN,
}

const types: Record<string, ValueType> = {
    int: TokenType.TYPE_INT,
    nil: TokenType.TYPE_NIL,
    str: TokenType.TYPE_STR,
    bool: TokenType.TYPE_BOOL,
}

export default class Lexer {
    start = 0
    current = 0
    line = 1
    tokens: Token[] = []
    source = ''

    scan(sourceText: string) {
        this.source = sourceText

        while (!this.isAtEnd()) {
            this.start = this.current
            this.scanToken()
        }

        this.tokens.push({ type: TokenType.EOF, lexeme: '', literal: null, line: this.line })
        return this.tokens
    }

    scanToken() {
        let c = this.advance()
        switch (c) {
            case '(':
                this.addToken(TokenType.LEFT_PAREN)
                break
            case ')':
                this.addToken(TokenType.RIGHT_PAREN)
                break
            case '{':
                this.addToken(TokenType.LEFT_BRACE)
                break
            case '}':
                this.addToken(TokenType.RIGHT_BRACE)
                break
            case ';':
                this.addToken(TokenType.SEMICOLON)
                break
            case ':':
                this.addToken(TokenType.COLON)
                break
            case ',':
                this.addToken(TokenType.COMMA)
                break
            case '.':
                this.match('.') ? this.addToken(TokenType.RANGE) : this.addToken(TokenType.DOT)
                break
            case '-':
                this.match('>') ? this.addToken(TokenType.ARROW) : this.addToken(TokenType.MINUS)
                break
            case '+':
                this.addToken(TokenType.PLUS)
                break
            case '*':
                this.addToken(TokenType.STAR)
                break
            case '/':
                if (this.match('/')) {
                    while (this.peek() != '\n' && !this.isAtEnd()) {
                        this.advance()
                    }
                } else {
                    this.addToken(TokenType.SLASH)
                }
                break
            case '!':
                this.match('=')
                    ? this.addToken(TokenType.BANG_EQUAL)
                    : this.addToken(TokenType.BANG)
                break
            case '=':
                this.match('=')
                    ? this.addToken(TokenType.EQUAL_EQUAL)
                    : this.addToken(TokenType.EQUAL)
                break
            case '<':
                this.match('=')
                    ? this.addToken(TokenType.LESS_EQUAL)
                    : this.addToken(TokenType.LESS)
                break
            case '>':
                this.match('=')
                    ? this.addToken(TokenType.GREATER_EQUAL)
                    : this.addToken(TokenType.GREATER)
                break
            case ' ':
            case '\r':
            case '\t':
                break
            case '\n':
                this.line++
                break
            case '"':
                this.string()
                break
            default:
                if (this.isDigit(c)) {
                    this.number()
                    // Identifiers must begin with a character
                } else if (this.isAlpha(c)) {
                    this.identifier()
                } else {
                    console.error(c)
                    reportError(`Invalid character ${this.peek()}.`)
                }
        }
    }

    isAtEnd() {
        return this.current >= this.source.length
    }

    advance() {
        this.current++
        return this.source[this.current - 1]!
    }

    addToken(type: TokenType, literal: Token['literal'] = null) {
        let lexeme = this.source.substring(this.start, this.current)
        this.tokens.push({ type, lexeme, literal, line: this.line } as Token)
    }

    match(expected: string) {
        if (this.isAtEnd()) {
            return false
        }
        if (this.source[this.current] != expected) {
            return false
        }

        this.current++
        return true
    }

    peek() {
        if (this.isAtEnd()) {
            return '\0'
        }
        return this.source[this.current]!
    }

    number() {
        while (this.isDigit(this.peek())) {
            this.advance()
        }

        let value = Number.parseInt(this.source.substring(this.start, this.current))
        this.addToken(TokenType.INTEGER, value)
    }

    string() {
        while (this.peek() != '"') {
            this.advance()
        }

        if (this.isAtEnd()) {
            reportError('Unterminated string.')
        }

        this.advance()
        let value = this.source.substring(this.start + 1, this.current - 1)
        this.addToken(TokenType.STRING, value)
    }

    // Handles keywords, types and identifiers
    identifier() {
        while (
            this.isUnderscore(this.peek()) ||
            this.isAlpha(this.peek()) ||
            this.isDigit(this.peek())
        ) {
            this.advance()
        }

        let text = this.source.substring(this.start, this.current)
        let type = keywords[text] || types[text] || TokenType.IDENTIFER

        this.addToken(type)
    }

    isDigit(char: string) {
        return /\d/.test(char)
    }

    isAlpha(char: string) {
        return /[A-Z]|[a-z]/.test(char)
    }

    isUnderscore(char: string) {
        return /\_/.test(char)
    }
}
