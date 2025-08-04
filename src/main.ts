import { $ } from 'bun'
import scan from './scanner'
import parse from './parser'
import compile from './compiler'
// @ts-ignore Do not look for type declarations for the source language
import source from '../__.jas'

let _ = source

const args = Bun.argv

if (args.length == 2) {
  const prompt = '> '
  process.stdout.write(prompt)

  for await (const line of console) {
    if (line) {
      run(line)
      process.stdout.write(prompt)
    }
  }
} else if (args.length == 3) {
  const filePath = Bun.argv[2]!
  const sourceFile = Bun.file(filePath)
  const fileExists = await sourceFile.exists()
  if (!fileExists) {
    console.error(`File not found: ${filePath}.`)
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
