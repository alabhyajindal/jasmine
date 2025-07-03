import type Token from './Token'

export const PARSE_ERROR = Symbol('ParseError')
export const COMPILE_ERROR = Symbol('CompilerError')

export function reportError(token: Token, msg: string, errorType: Symbol): never {
  console.error(`[line ${token.line}] Error at ${token.lexeme}: ${msg}`)
  throw errorType
}
