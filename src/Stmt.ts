import type { Expr } from './Expr';

export type Stmt = ExprStmt | PrintStmt;

export interface ExprStmt {
  type: 'ExprStmt';
  expression: Expr;
}

export interface PrintStmt {
  type: 'PrintStmt';
  expression: Expr;
}
