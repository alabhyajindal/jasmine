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

let str = 'Hello, World!\n'
let strArr = new TextEncoder().encode(str)
module.setMemory(1, 2, 'memory', [{offset: module.i32.const(66), data: strArr}]);

let instrs = [
module.i32.store(0, 4, module.i32.const(0), module.i32.const(66)),
module.i32.store(0, 4, module.i32.const(4), module.i32.const(14)),


module.drop(
module.call('write', [
    module.i32.const(1),
    module.i32.const(0),
    module.i32.const(1),
    module.i32.const(92)
], binaryen.i32)),
];

let body = module.block(null, instrs, binaryen.none);
module.addFunction('_start', binaryen.none, binaryen.none, [], body);
module.addFunctionExport('_start', '_start');

module.validate();

let wat = module.emitText()
console.log(wat)
Bun.write('build/temp.wat', wat)

await $`wasmtime build/temp.wat`