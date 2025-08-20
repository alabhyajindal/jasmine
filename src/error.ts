import type Token from './Token'

export function reportError(msg: string, token?: Token): never {
    if (token) {
        console.log(`[line ${token.line}] Error at ${token.lexeme}`)
    }

    console.log(msg)

    if (process.env.TESTING) throw 'CompilerError'
    // Commenting the following line results in a 100% code coverage, the following line can never really be tested by the tests
    process.exit(1)
}
