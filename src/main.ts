import scan from './scanner'
import parse from './parser'
import compile from './compiler'
// @ts-ignore Do not look for type declarations for the source language
import source from '../source.jas'
import { COMPILE_ERROR, PARSE_ERROR } from './error'

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

  try {
    run(sourceText)
  } catch (error) {
    if (error != PARSE_ERROR && error != COMPILE_ERROR) {
      throw error
    }
  }
}

async function run(source: string) {
  const tokens = scan(source)
  const statements = parse(tokens)
  const wat = compile(statements)

  if (!wat) {
    throw Error('Failed to generate binary.')
  }

  Bun.write('build/main.wat', wat)
}
