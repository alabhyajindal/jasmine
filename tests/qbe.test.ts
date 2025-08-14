import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { describe } from 'node:test'

const jasmineProgramsDir = './tests/jasmine_programs'
const fileNames = await readdir(jasmineProgramsDir)
fileNames.sort()

for (const fileName of fileNames) {
  let filePath = jasmineProgramsDir + '/' + fileName
  let sourceText = await Bun.file(filePath).text()

  let expected: string[] = getExpected(sourceText)

  describe('qbe', () => {
    test(`${fileName}`, async () => {
      await $`bun compile ${filePath} --backend qbe`.quiet()
      let out = (await $`./build/qbe/a.out`.text()).trim().split('\n')
      expect(out).toEqual(expected)
    })
  })
}

function getExpected(sourceText: string): string[] {
  let lines = sourceText.split('\n')
  let comments = lines.filter((line) => line.substring(0, 2) == '//')
  let expected = comments.map((comment) => comment.substring(2).trim())
  return expected
}
