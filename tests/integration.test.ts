import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'

const jasmineProgramsDir = './tests/jasmine_programs'
const buildDir = './build'
const fileNames = await readdir(jasmineProgramsDir)

let entireSource = ''
let allExpected = []

for (const fileName of fileNames) {
  let filePath = jasmineProgramsDir + '/' + fileName
  let sourceText = await Bun.file(filePath).text()
  entireSource += sourceText
  entireSource += '\n\n\n'

  let fileExpected = getExpected(sourceText)
  let expected = fileExpected.map((e) => ({ fileName, expected: e }))
  allExpected.push(...expected)
}

let sourcePath = buildDir + '/' + 'input.jas'
Bun.write(sourcePath, entireSource)

// Compile the joined source file
await $`bun compile ${sourcePath} --backend binaryen`
// Execute the joined source file with Wasmtime
let out = (await $`wasmtime build/a.wasm`.text()).trim().split('\n')

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
