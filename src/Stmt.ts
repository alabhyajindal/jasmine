import type { Expr } from './Expr'
import type Token from './Token'
import type { ValueType } from './ValueType'

export type Stmt = BlockStmt | ExprStmt | VariableStmt | IfStmt | FunDecl | ReturnStmt

export interface BlockStmt {
  type: 'BlockStmt'
  statements: Stmt[]
}

export interface ExprStmt {
  type: 'ExprStmt'
  expression: Expr
}

export interface FunDecl {
  type: 'FunDecl'
  name: Token
  params: Array<{ name: string; type: ValueType }>
  returnType: ValueType
  body: BlockStmt
}

export interface IfStmt {
  type: 'IfStmt'
  condition: Expr
  thenBranch: Stmt
  elseBranch: Stmt | null
}

export interface ReturnStmt {
  type: 'ReturnStmt'
  value: Expr
}

export interface VariableStmt {
  type: 'VariableStmt'
  name: Token
  initializer: Expr
  valueType: ValueType
}
