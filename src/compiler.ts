import binaryen from 'binaryen';
import type { BinaryExpr, Expr } from './Expr';
import TokenType from './TokenType';
import type { Stmt } from './Stmt';

export default function compile(statements: Stmt[]) {
  // console.log(JSON.stringify(statements));
  // console.log('yoooooooooooooo');
  // return;

  const module = new binaryen.Module();
  const body = program(module, statements);

  if (!body) {
    throw Error('Empty body.');
  }

  // Import for print function
  module.addFunctionImport(
    'print_i32',
    'console',
    'i32',
    binaryen.createType([binaryen.i32]),
    binaryen.none
  );

  module.addFunction('main', binaryen.createType([]), binaryen.none, [], body);
  module.addFunctionExport('main', 'main');

  // Wasm text before validation to view the compiled output
  // const wasmText = module.emitText();
  // console.log(wasmText);

  // Validate the module
  if (!module.validate()) {
    throw Error('Validation error.');
  }

  // Emitting WebAssembly
  const wasmBinary = module.emitBinary();

  return wasmBinary;
}

function program(module: binaryen.Module, statements: Stmt[]) {
  let res = [];
  for (let stmt of statements) {
    // console.log(stmt);
    // console.log('---');
    res.push(statement(module, stmt));
  }

  return module.block(null, res, binaryen.none);
}

function statement(module: binaryen.Module, stmt: Stmt) {
  switch (stmt.type) {
    case 'ExprStmt':
      let expr = expression(module, stmt.expression);
      return module.drop(expr);
    case 'PrintStmt':
      let value = expression(module, stmt.expression);
      return module.call('print_i32', [value], binaryen.none);
    default:
      console.error(stmt);
      throw Error('Unsupported statement.');
  }
}

function expression(module: binaryen.Module, expression: Expr): number {
  // console.log(expression);
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(module, expression);
    case 'LiteralExpr':
      return module.i32.const(expression.value);
    default:
      console.error(expression.type);
      throw Error('Unsupported ast type.');
  }
}

// A number like 5517120 is returned by this function - which is not the result value of performing the addition. Could be something related to Wasm internal
function binaryExpression(module: binaryen.Module, ast: BinaryExpr): number {
  const left = expression(module, ast.left);
  const right = expression(module, ast.right);

  switch (ast.operator.type) {
    case TokenType.PLUS:
      return module.i32.add(left, right);
    case TokenType.MINUS:
      return module.i32.sub(left, right);
    case TokenType.SLASH:
      return module.i32.div_s(left, right);
    case TokenType.STAR:
      return module.i32.mul(left, right);
    default:
      console.error(ast.operator);
      throw Error(`Unsupported operator.`);
  }
}
