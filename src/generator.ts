import binaryen from 'binaryen';
import type { BinaryExpr, Expr } from './Expr';
import TokenType from './TokenType';

export default function generate(ast: Expr) {
  if (ast.type == 'BinaryExpr') {
    return generateBinary(ast as BinaryExpr);
  }
}

function generateBinary(ast: BinaryExpr) {
  const module = new binaryen.Module();

  const ii = binaryen.createType([binaryen.i32, binaryen.i32]);
  const left = module.i32.const(ast.left.value);
  const right = module.i32.const(ast.right.value);
  let result;

  if (ast.operator.type == TokenType.PLUS) {
    result = module.i32.add(left, right);
  } else if (ast.operator.type == TokenType.MINUS) {
    result = module.i32.sub(left, right);
  }

  if (!result) {
    throw Error('Unsupported operator.');
  }

  module.addFunction(
    'main',
    ii,
    binaryen.i32,
    [binaryen.i32],
    module.block(null, [
      module.local.set(2, result),
      module.return(module.local.get(2, binaryen.i32)),
    ])
  );

  module.addFunctionExport('main', 'main');

  // Validate the module
  if (!module.validate()) {
    throw new Error('Validation error.');
  }

  // Emitting WebAssembly
  const wasmText = module.emitText();
  const wasmBinary = module.emitBinary();

  return wasmBinary;
}
