import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { describe } from 'node:test'
import { getExpected } from '../utils'
import { compile } from '../src/compile'

const programsDir = './tests/invalid_programs'
const fileNames = await readdir(programsDir)
fileNames.sort()
process.env.TESTING = 'true'

for (const fileName of fileNames) {
    let filePath = programsDir + '/' + fileName
    let sourceText = await Bun.file(filePath).text()

    let expected: string[] = getExpected(sourceText)

    describe('invalid', () => {
        test(`${fileName}`, async () => {
            const sourceText = await Bun.file(filePath).text()
            await compile(sourceText, 'qbe')

            let out = (await $`TESTING=true bun src/main.ts ${filePath} --backend qbe`.text())
                .trim()
                .split('\n')
                .slice(1, 2)

            expect(out).toEqual(expected)
        })
    })
}
