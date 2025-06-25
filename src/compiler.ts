import binaryen from 'binaryen';
import type { BinaryExpr, Expr, UnaryExpr } from './Expr';
import TokenType from './TokenType';
import type { Stmt } from './Stmt';

export default function compile(statements: Stmt[]) {
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
    res.push(compileStatement(module, stmt));
  }

  return module.block(null, res, binaryen.none);
}

function compileStatement(module: binaryen.Module, stmt: Stmt): binaryen.ExpressionRef {
  switch (stmt.type) {
    case 'ExprStmt': {
      let expr = compileExpression(module, stmt.expression);
      return module.drop(expr);
    }
    case 'PrintStmt': {
      let expr = compileExpression(module, stmt.expression);
      return module.call('print_i32', [expr], binaryen.none);
    }
    case 'VariableStmt': {
      let expr = compileExpression(module, stmt.initializer);
      module.addGlobal(stmt.name.lexeme, binaryen.i32, true, expr);
      return module.nop();
    }
    case 'BlockStmt': {
      // Is there no difference between the way a program is compiled and a block is? Maybe later once we get to functions?
      // They do differ - a program always returns none type - but a block may have a return statement and thus a return type when it's part of a function
      let statements = stmt.statements;
      return program(module, statements);
    }
    case 'IfStmt': {
      let condition = compileExpression(module, stmt.condition);
      let thenBranch = compileStatement(module, stmt.thenBranch);
      let elseBranch = compileStatement(module, stmt.elseBranch);
      return module.if(condition, thenBranch, elseBranch);
    }
    default: {
      console.error(stmt);
      throw Error('Unsupported statement.');
    }
  }
}

function compileExpression(module: binaryen.Module, expression: Expr): number {
  // console.log(expression);
  switch (expression.type) {
    case 'BinaryExpr':
      return binaryExpression(module, expression);
    case 'LiteralExpr':
      return module.i32.const(expression.value);
    case 'VariableExpr':
      return module.global.get(expression.name.lexeme, binaryen.i32);
    case 'GroupingExpr':
      return compileExpression(module, expression.expression);
    case 'UnaryExpr':
      return unaryExpression(module, expression);
    default:
      console.error(expression);
      throw Error('Unsupported ast type.');
  }
}

// A number like 5517120 is returned by this function - which is not the result value of performing the addition. Could be something related to Wasm internal
function binaryExpression(module: binaryen.Module, ast: BinaryExpr): number {
  const left = compileExpression(module, ast.left);
  const right = compileExpression(module, ast.right);

  switch (ast.operator.type) {
    case TokenType.PLUS:
      return module.i32.add(left, right);
    case TokenType.MINUS:
      return module.i32.sub(left, right);
    case TokenType.SLASH:
      return module.i32.div_s(left, right);
    case TokenType.STAR:
      return module.i32.mul(left, right);
    case TokenType.LESS:
      return module.i32.lt_s(left, right);
    default:
      console.error(ast.operator);
      throw Error(`Unsupported binary operator.`);
  }
}

function unaryExpression(module: binaryen.Module, ast: UnaryExpr) {
  switch (ast.operator.type) {
    case TokenType.MINUS: {
      let expr = compileExpression(module, ast.right);
      return module.i32.sub(module.i32.const(0), expr);
    }
    default:
      console.error(ast.operator);
      throw Error(`Unsupported binary operator.`);
  }
}
