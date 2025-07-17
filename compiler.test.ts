import { readdir } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import scan from './src/scanner'
import parse from './src/parser'
import compile from './src/compiler'
import { $ } from 'bun'

const testDir = './tests'
const fileNames = await readdir(testDir)

for (const fileName of fileNames) {
  test(`can compile ${fileName}`, async () => {
    let sourceText = await Bun.file(`${testDir}/${fileName}`).text()

    let expected = sourceText.split('\n')[0]!.substring(2).trim()

    let tokens = scan(sourceText)
    let statements = parse(tokens)
    let wat = compile(statements)

    let out = await $`bun build.ts`.text()
    console.log([...out].length)
    expect(out).toBe(expected)
  })
}
