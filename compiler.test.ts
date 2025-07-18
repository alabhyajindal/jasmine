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

    let expected: string[] = getExpected(sourceText)

    let tokens = scan(sourceText)
    let statements = parse(tokens)
    let wat = compile(statements)

    let out: string[] = (await $`bun make ${filePath}`.text()).trim().split('\n')

    expect(out.length).toBe(expected.length)

    for (let [i, expectedValue] of expected.entries()) {
      expect(out[i]).toBe(expectedValue)
    }
  })
}

function getExpected(sourceText: string): string[] {
  let lines = sourceText.split('\n')
  let comments = lines.filter((line) => line.substring(0, 2) == '//')
  let expected = comments.map((comment) => comment.substring(2).trim())
  return expected
}
