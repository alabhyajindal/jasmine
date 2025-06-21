import binaryen from 'binaryen';
import type { BinaryExpr, Expr } from './Expr';
import TokenType from './TokenType';

export default function generate(ast: Expr) {
  const module = new binaryen.Module();
  const expr = generateExpression(module, ast);

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

function generateExpression(module: binaryen.Module, ast: Expr) {
  switch (ast.type) {
    case 'BinaryExpr':
      return generateBinary(module, ast);
    case 'LiteralExpr':
      return module.i32.const(ast.value);
  }
}

function generateBinary(module: binaryen.Module, ast: BinaryExpr) {
  const left = generateExpression(module, ast.left);
  const right = generateExpression(module, ast.right);

  switch (ast.operator.type) {
    case TokenType.PLUS:
      return module.i32.add(left, right);
    case TokenType.MINUS:
      return module.i32.sub(left, right);
  }
}
