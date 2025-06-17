import binaryen from 'binaryen';

// 41 + 1
// the above got transformed into a functin 'banana' - since all code must be inside function - this function then returns the result of adding these two values

const module = new binaryen.Module();

const ii = binaryen.createType([binaryen.i32, binaryen.i32]);
const left = module.local.get(0, binaryen.i32);
const right = module.local.get(1, binaryen.i32);
const result = module.i32.add(left, right);

module.addFunction(
  'banana',
  ii,
  binaryen.i32,
  [binaryen.i32],
  module.block(null, [
    module.local.set(2, result),
    module.return(module.local.get(2, binaryen.i32)),
  ])
);

module.addFunctionExport('banana', 'banana');

// Validate the module
if (!module.validate()) {
  throw new Error('Validation error.');
}

// Emitting WebAssembly
const wasmText = module.emitText();
const wasmBinary = module.emitBinary();

const path = './a.wasm';
await Bun.write(path, wasmBinary);

console.log(wasmText);

// Example usage with the WebAssembly API
const compiled = new WebAssembly.Module(wasmBinary);
const instance = new WebAssembly.Instance(compiled, {});

// @ts-expect-error: Functions are added to exports, TypeScript doesn't know about it
console.log(instance.exports.banana(41, 1));
