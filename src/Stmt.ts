import type { Expr } from './Expr';
import type Token from './Token';

export type Stmt = ExprStmt | PrintStmt | VariableStmt;

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
