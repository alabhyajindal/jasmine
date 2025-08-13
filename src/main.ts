import { $ } from 'bun'
import scan from './lexer'
import parse from './parser'
import binaryenCompile from './binaryen'
import qbeCompile from './qbe'
// @ts-ignore Do not look for type declarations for the source language
import source from '../__.jas'
import { reportError } from './error'

let _ = source

const args = Bun.argv.slice(2)

const validCall =
  args.length == 3 && args[1] == '--backend' && (args[2] == 'binaryen' || args[2] == 'qbe')

if (!validCall) {
  console.log('Usage: bun compile <file.jas> --backend <binaryen | wat>')
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
run(sourceText)

async function run(source: string) {
  const tokens = scan(source)
  // console.log(tokens)
  // return

  const statements = parse(tokens)
  // console.log(JSON.stringify(statements, null, 2))
  // return

  if (backend == 'binaryen') {
    const wat = binaryenCompile(statements)
    if (!wat) reportError('Compilation failed.')
    Bun.write('build/main.wat', wat)
    await $`wasm-merge build/main.wat main lib/utils.wasm utils -o build/a.wasm --enable-multimemory`
  }

  if (backend == 'qbe') {
    const il = qbeCompile(statements)
    Bun.write('build/qbe/main.ssa', il)
    await $`cd build/qbe/ && qbe -o out.s main.ssa && cc out.s`
  }
}
