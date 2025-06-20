import type Token from './Token';

export type Expr = LiteralExpr | BinaryExpr;

export interface BinaryExpr {
  left: Expr;
  operator: Token;
  right: Expr;
}

export interface LiteralExpr {
  value: number;
}
