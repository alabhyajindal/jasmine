import scan from './scanner'
import parse from './parser'
import compile from './compiler'
import sphereSource from '../source.txt' // Included to reload Bun when the source text changes
import { COMPILE_ERROR, PARSE_ERROR } from './error'

let _ = sphereSource

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

function run(source: string) {
  const tokens = scan(source)
  const statements = parse(tokens)
  const wasmBinary = compile(statements)

  if (!wasmBinary) {
    throw Error('Failed to generate binary.')
  }

  // Define the imports that WebAssembly expects
  const imports = {
    console: {
      i32: (value: number) => {
        console.log(value)
      },
    },
  }

  // Example usage with the WebAssembly API
  const compiled = new WebAssembly.Module(wasmBinary)
  const instance = new WebAssembly.Instance(compiled, imports)

  // @ts-expect-error: Exported functions are available under exports
  instance.exports._start()
}
