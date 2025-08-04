import type Token from './Token'

export function reportError(msg: string, token?: Token): never {
  if (token) {
    console.error(`[line ${token.line}] Error at ${token.lexeme}`)
  }
  console.error(msg)
  process.exit()
}
