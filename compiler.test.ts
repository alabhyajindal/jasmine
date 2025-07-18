import { readdir } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import scan from './src/scanner'
import parse from './src/parser'
import compile from './src/compiler'
import { $ } from 'bun'

const testDir = './tests'
const fileNames = await readdir(testDir)
fileNames.sort()

for (const fileName of fileNames) {
  test(`${fileName}`, async () => {
    let filePath = testDir + '/' + fileName
    let sourceText = await Bun.file(filePath).text()

    let expected = sourceText.split('\n')[0]!.substring(2).trim()

    let tokens = scan(sourceText)
    let statements = parse(tokens)
    let wat = compile(statements)

    let out = await $`bun make ${filePath}`.text()
    expect(out).toBe(expected)
  })
}
