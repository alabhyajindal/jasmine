import binaryen from 'binaryen';
import type { BinaryExpr, Expr } from './Expr';
import TokenType from './TokenType';

export default function generate(ast: Expr) {
  const module = new binaryen.Module();
  const expr = expression(module, ast);

  module.addFunction('main', binaryen.createType([]), binaryen.i32, [], expr);
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

function expression(module: binaryen.Module, ast: Expr): number {
  switch (ast.type) {
    case 'BinaryExpr':
      return binary(module, ast);
    case 'LiteralExpr':
      return module.i32.const(ast.value);
    default:
      throw new Error('Unsupported ast type.');
  }
}

// A number like 5517120 is returned by this function - which is not the result value of performing the addition. Could be something related to Wasm internal
function binary(module: binaryen.Module, ast: BinaryExpr): number {
  const left = expression(module, ast.left);
  const right = expression(module, ast.right);

  switch (ast.operator.type) {
    case TokenType.PLUS:
      return module.i32.add(left, right);
    case TokenType.MINUS:
      return module.i32.sub(left, right);
    default:
      throw new Error(`Unsupported operator: ${ast.operator}`);
  }
}
