import type Token from './Token'

export function reportError(token: Token, msg: string): never {
  console.error(`[line ${token.line}] Error at ${token.lexeme}`)
  console.error(msg)
  process.exit()
}
