import type Token from './Token'

export type Expr = LiteralExpr | BinaryExpr | UnaryExpr | VariableExpr | GroupingExpr

export interface BinaryExpr {
  type: 'BinaryExpr'
  left: Expr
  operator: Token
  right: Expr
}

export interface GroupingExpr {
  type: 'GroupingExpr'
  expression: Expr
}

export interface LiteralExpr {
  type: 'LiteralExpr'
  value: number | boolean
}

export interface UnaryExpr {
  type: 'UnaryExpr'
  operator: Token
  right: Expr
}

export interface VariableExpr {
  type: 'VariableExpr'
  name: Token
}
