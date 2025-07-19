import binaryen from 'binaryen'
import { $ } from 'bun';

let module = new binaryen.Module()


module.addFunctionImport(
  'write',
  'wasi_snapshot_preview1',
  'fd_write',
  binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]),
  binaryen.i32
);

module.setMemory(1, 2, 'memory');

let str = "hello\n"
let strArr = new TextEncoder().encode(str)

let instrs = []
for (let [i, charCode] of strArr.entries()) {
    instrs.push(module.i32.store8(0, 1, module.i32.const(66 + i), module.i32.const(charCode)))
}

instrs.push(
module.i32.store(0, 4, module.i32.const(0), module.i32.const(66)),
module.i32.store(0, 4, module.i32.const(4), module.i32.const(strArr.length)),

module.drop(
module.call('write', [
    module.i32.const(1),
    module.i32.const(0),
    module.i32.const(1),
    module.i32.const(92)
], binaryen.i32)),
);

let body = module.block(null, instrs, binaryen.none);
module.addFunction('main', binaryen.none, binaryen.none, [], body);
module.addFunctionExport('main', '_start');

module.validate();

let wat = module.emitText()
// console.log(wat)
Bun.write('build/temp.wat', wat)

await $`wasmtime build/temp.wat`