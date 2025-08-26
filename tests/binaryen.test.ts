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

    describe('binaryen', () => {
        test(`${fileName}`, async () => {
            const sourceText = await Bun.file(filePath).text()
            await compile(sourceText, 'wasm')
            let out = (await $`TESTING=true bun run:binaryen`.text()).trim().split('\n')
            expect(out).toEqual(expected)
        })
    })
}
