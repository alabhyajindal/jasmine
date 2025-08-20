import { $ } from 'bun'
import binaryenCompile from './binaryen'
import qbeCompile from './qbe'
import { reportError } from './error'
import Lexer from './lexer'
import Parser from './parser'

export async function compile(sourceText: string, backend: string) {
    const tokens = new Lexer().scan(sourceText)
    const statements = new Parser().parse(tokens)

    if (backend == 'binaryen') {
        const wat = binaryenCompile(statements)
        if (!wat) reportError('Compilation failed.')
        Bun.write('build/wasm/main.wat', wat)
        await $`cd build/wasm && wasm-merge main.wat main ../../lib/itoa.wat itoa -o a.wasm --enable-multimemory`
    }

    if (backend == 'qbe') {
        const il = qbeCompile(statements)
        Bun.write('build/qbe/il.ssa', il)
        await $`cd build/qbe/ && qbe -o out.s il.ssa && cc out.s`
    }
}

async function main() {
    const args = Bun.argv.slice(2)

    const validCall =
        args.length == 3 && args[1] == '--backend' && (args[2] == 'binaryen' || args[2] == 'qbe')

    if (!validCall) {
        console.log('Usage: bun compile <file.jas> --backend <binaryen | qbe>')
        process.exit()
    }

    const filePath = args[0]!
    const backend = args[2]!

    const sourceFile = Bun.file(filePath)
    if (!(await sourceFile.exists())) {
        console.log(`File not found: ${filePath}.`)
        process.exit()
    }

    const sourceText = await sourceFile.text()
    compile(sourceText, backend)
}

main()

// let filePath = './tests/valid_programs/fibonacci.jas'

// const sourceText = await Bun.file(filePath).text()
// compile(sourceText, 'binaryen')
