import type { Expr } from './Expr';

export type Stmt = ExprStmt;

export interface ExprStmt {
  type: 'ExprStmt';
  expression: Expr;
}
