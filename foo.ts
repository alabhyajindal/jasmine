import binaryen from 'binaryen'

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
module.setMemory(1, 2, 'memory', [{offset: 66, data: strArr}]);

let instrs = [
module.i32.store(0, 4, 0, 66),
module.i32.store(0, 4, 4, 14),
module.i32.const(1),
module.i32.const(0),
module.i32.const(1),
module.i32.const(92),
module.call('write', [binaryen.none], binaryen.i32)
];

let body = module.block(null, instrs, binaryen.none);
module.addFunction('_start', binaryen.none, binaryen.i32, [binaryen.none], body);