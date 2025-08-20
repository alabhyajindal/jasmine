import { compile } from './compile'

async function main() {
    const args = Bun.argv.slice(2)

    const validCall =
        args.length == 3 && args[1] == '--backend' && (args[2] == 'binaryen' || args[2] == 'qbe')

    if (!validCall) {
        console.log('Usage: bun compile <file.jas> --backend <binaryen | qbe>')
        process.exit()
    }

    const filePath = args[0]!
    const backend = args[2]!

    const sourceFile = Bun.file(filePath)
    if (!(await sourceFile.exists())) {
        console.log(`File not found: ${filePath}.`)
        process.exit()
    }

    const sourceText = await sourceFile.text()
    compile(sourceText, backend)
}

main()
