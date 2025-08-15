import { $ } from 'bun'
import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { describe } from 'node:test'
import { getExpected } from '../utils'

const jasmineProgramsDir = './tests/jasmine_programs'
const fileNames = await readdir(jasmineProgramsDir)
fileNames.sort()

for (const fileName of fileNames) {
    let filePath = jasmineProgramsDir + '/' + fileName
    let sourceText = await Bun.file(filePath).text()

    let expected: string[] = getExpected(sourceText)

    describe('qbe', () => {
        test(`${fileName}`, async () => {
            await $`bun src/main.ts ${filePath} --backend qbe`.quiet()
            let out = (await $`bun run:qbe`.text()).trim().split('\n')
            expect(out).toEqual(expected)
        })
    })
}
