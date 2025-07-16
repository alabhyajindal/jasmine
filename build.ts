import { $ } from 'bun'

let sourceFileName = Bun.argv[2] || '__.jas'

await $`bun run compile ${sourceFileName}`
await $`wasm-merge build/main.wat main lib/utils.wat utils -o build/a.wat --enable-multimemory --emit-text`
await $`wasmtime build/a.wat`
