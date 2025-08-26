import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { describe } from 'node:test'
import { getExpected } from '../utils'
import { compile } from '../src/compile'

const programsDir = './tests/valid_programs'
const fileNames = await readdir(programsDir)
fileNames.sort()

for (const fileName of fileNames) {
    let filePath = programsDir + '/' + fileName
    let sourceText = await Bun.file(filePath).text()

    let expected: string[] = getExpected(sourceText)

    describe('qbe', () => {
        test(`${fileName}`, async () => {
            await $`TESTING=true bun src/main.ts ${filePath} --target native`.quiet()
            const sourceText = await Bun.file(filePath).text()
            await compile(sourceText, 'qbe')
            let out = (await $`bun run:qbe`.text()).trim().split('\n')
            expect(out).toEqual(expected)
        })
    })
}
