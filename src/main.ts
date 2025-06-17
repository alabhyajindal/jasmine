import generate from './generator';
import parse from './parser';
import scan from './scanner';

const sourceFile = Bun.file('./source.sp');
const sourceText = await sourceFile.text();

const tokens = scan(sourceText);
const ast = parse(tokens);
const wasmBinary = generate(ast);

if (!wasmBinary) {
  throw Error('Failed to generate binary.');
}

// Example usage with the WebAssembly API
const compiled = new WebAssembly.Module(wasmBinary);
const instance = new WebAssembly.Instance(compiled, {});

// @ts-expect-error: Exported functions are available under exports
console.log(instance.exports.main());
