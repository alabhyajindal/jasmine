import type Token from './Token'

export function reportError(msg: string, token?: Token): never {
    if (token) {
        console.error(`[line ${token.line}] Error at ${token.lexeme}`)
    }

    if (process.env.TESTING) {
        // Logging to standard output instead of standard error to capture the error message in testing
        console.log(msg)
        process.exit()
    } else {
        console.error(msg)
        process.exit(1)
    }
}
