import { readdir } from 'node:fs/promises'
import { test } from 'bun:test'
import scan from './src/scanner'
import parse from './src/parser'
import compile from './src/compiler'
import { $ } from 'bun'

const testDir = './tests'
const fileNames = await readdir(testDir)

for (const fileName of fileNames) {
  test(`can compile ${fileName}`, async () => {
    let sourceText = await Bun.file(`${testDir}/${fileName}`).text()

    let tokens = scan(sourceText)
    let statements = parse(tokens)
    let wat = compile(statements)

    let res = await $`bun build.ts`.text()
    // read the first commend from the file - that is what the stdout should be compared against
    console.log('yoo', res)
  })
}
