import { $ } from 'bun'
import { reportError } from './error'
import Lexer from './lexer'
import Parser from './parser'
import BinaryenCompiler from './binaryen'
import QBECompiler from './qbe'

export async function compile(sourceText: string, backend: string) {
    const tokens = new Lexer().scan(sourceText)
    const statements = new Parser().parse(tokens)

    if (backend == 'binaryen') {
        const wat = new BinaryenCompiler().compile(statements)
        if (!wat) reportError('Compilation failed.')
        Bun.write('build/wasm/main.wat', wat)
        await $`cd build/wasm && wasm-merge main.wat main ../../lib/itoa.wat itoa -o a.wasm --enable-multimemory`
    }

    if (backend == 'qbe') {
        const il = new QBECompiler().compile(statements)
        Bun.write('build/qbe/il.ssa', il)
        await $`cd build/qbe/ && qbe -o out.s il.ssa && cc out.s`
    }
}
