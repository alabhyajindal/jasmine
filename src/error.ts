import type Token from './Token'

export function reportError(msg: string, token?: Token): never {
    if (token) {
        console.log(`[line ${token.line}] Error at ${token.lexeme}`)
    }

    console.log(msg)

    if (process.env.TESTING) throw 'CompilerError'
    process.exit(1)
}
