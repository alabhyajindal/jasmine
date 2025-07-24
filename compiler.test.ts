import { readdir } from 'node:fs/promises'
import { expect, test } from 'bun:test'
import scan from './src/scanner'
import parse from './src/parser'
import compile from './src/compiler'
import { $ } from 'bun'

const testDir = './tests'
const buildDir = './build'
const fileNames = await readdir(testDir)

let entireSource = ''
let allExpected = []

for (const fileName of fileNames) {
  let filePath = testDir + '/' + fileName
  let sourceText = await Bun.file(filePath).text()
  entireSource += sourceText
  entireSource += '\n\n\n'

  let fileExpected = getExpected(sourceText)
  let expected = fileExpected.map((e) => ({ fileName, expected: e }))
  allExpected.push(...expected)
}

let sourcePath = buildDir + '/' + 'input.jas'
let outPath = buildDir + '/' + 'main.wat'

Bun.write(sourcePath, entireSource)

let tokens = scan(entireSource)
let statements = parse(tokens)
let wat = compile(statements)
Bun.write(outPath, wat)

let out = (await $`bun make ${sourcePath}`.text()).trim().split('\n')

test('output count matches expectation', () => {
  expect(out.length).toBe(allExpected.length)
})

for (let [i, ex] of allExpected.entries()) {
  test(`${ex.fileName}`, () => {
    let { expected } = ex
    let output = out[i]
    expect(output).toBe(expected)
  })
}

function getExpected(sourceText: string): string[] {
  let lines = sourceText.split('\n')
  let comments = lines.filter((line) => line.substring(0, 2) == '//')
  let expected = comments.map((comment) => comment.substring(2).trim())
  return expected
}
