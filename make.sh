#!/usr/bin/bash

if [ $# -eq 0 ]; then
    >&2 echo "Error: No file name provided"
    exit 1
fi

SOURCE_FILE="$1"

bun run compile ${SOURCE_FILE} &&
wasm-merge build/main.wat main lib/utils.wat utils -o build/a.wat --enable-multimemory --emit-text &&
wasmtime build/a.wat