import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { describe } from 'node:test'
import { getExpected } from '../utils'

const programsDir = './tests/invalid_programs'
const fileNames = await readdir(programsDir)
fileNames.sort()
process.env.IN_TEST = 'true'

for (const fileName of fileNames) {
    let filePath = programsDir + '/' + fileName
    let sourceText = await Bun.file(filePath).text()

    let expected: string[] = getExpected(sourceText)

    describe('qbe', () => {
        test(`${fileName}`, async () => {
            let out = (await $`TESTING=true bun src/main.ts ${filePath} --backend qbe`.text())
                .trim()
                .split('\n')
            expect(out).toEqual(expected)
        })
    })
}
