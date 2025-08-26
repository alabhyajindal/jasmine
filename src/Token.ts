import type TokenType from './TokenType'

export default interface Token {
    type: TokenType
    lexeme: string
    line: number
}
