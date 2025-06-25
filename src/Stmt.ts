import type { Expr } from './Expr';
import type Token from './Token';

export type Stmt = BlockStmt | ExprStmt | PrintStmt | VariableStmt;

export interface BlockStmt {
  type: 'BlockStmt';
  statements: Stmt[];
}

export interface ExprStmt {
  type: 'ExprStmt';
  expression: Expr;
}

export interface PrintStmt {
  type: 'PrintStmt';
  expression: Expr;
}

export interface VariableStmt {
  type: 'VariableStmt';
  name: Token;
  initializer: Expr;
}
