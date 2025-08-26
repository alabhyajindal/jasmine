import { compile } from './compile'

async function main() {
    const args = Bun.argv.slice(2)

    const validCall =
        args.length == 3 && args[1] == '--target' && (args[2] == 'wasm' || args[2] == 'native')

    if (!validCall) {
        console.log('Usage: bun compile <file.jas> --target <wasm|native>')
        process.exit()
    }

    const filePath = args[0]!
    const target = args[2]!

    const sourceFile = Bun.file(filePath)
    if (!(await sourceFile.exists())) {
        console.log(`File not found: ${filePath}.`)
        process.exit()
    }

    const sourceText = await sourceFile.text()
    compile(sourceText, target)
}

main()
