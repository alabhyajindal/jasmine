import type Token from './Token'

export function reportError(token: Token, msg: string): never {
  console.error(`[line ${token.line}] Error at ${token.lexeme}: ${msg}`)
  // throwing regular error to see the stack trace during debuggins
  throw Error()
  // throw errorType
}
