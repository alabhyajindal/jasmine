import { $ } from 'bun'
import scan from './scanner'
import parse from './parser'
import compile from './compiler'
// @ts-ignore Do not look for type declarations for the source language
import source from '../__.jas'

let _ = source

const args = Bun.argv

// The first two arguments to are Bun and the file to be executed. This is true when the compiled binary is invoked as well.
if (args.length == 2) {
  console.log('Please provide the file name you want to compile.')
  process.exit()
}

if (args.length == 5) {
  const filePath = Bun.argv[2]!
  const sourceFile = Bun.file(filePath)
  const fileExists = await sourceFile.exists()
  if (!fileExists) {
    console.error(`File not found: ${filePath}.`)
    process.exit()
  }

  const targetFlag = Bun.argv[3]
  const targetValue = Bun.argv[4]
  if (targetFlag == '--target' && targetValue == 'binaryen') {
  } else {
    console.log('Please provide the backend you want to use to the --target flag.')
    console.log('Valid options: binaryen.')
    process.exit()
  }

  const sourceText = await sourceFile.text()
  run(sourceText)
}

async function run(source: string) {
  const tokens = scan(source)
  // console.log(tokens)
  // return

  const statements = parse(tokens)
  // console.log(JSON.stringify(statements, null, 2))
  // return

  const wat = compile(statements)
  if (!wat) reportError('Compilation failed.')

  Bun.write('build/main.wat', wat)
  await $`wasm-merge build/main.wat main lib/utils.wasm utils -o build/a.wasm --enable-multimemory`
}
