import TokenType from './TokenType'

export const ValueTypes = [
  TokenType.TYPE_INT,
  TokenType.TYPE_STR,
  TokenType.TYPE_NIL,
  TokenType.TYPE_BOOL,
] as const
export type ValueType = (typeof ValueTypes)[number]
