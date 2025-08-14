enum TokenType {
  // Single character tokens
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  COMMA = 'COMMA',
  COLON = 'COLON',
  DOT = 'DOT',
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',

  // One or two character tokens
  BANG = 'BANG',
  BANG_EQUAL = 'BANG_EQUAL',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  GREATER = 'GREATER',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS = 'LESS',
  LESS_EQUAL = 'LESS_EQUAL',
  ARROW = 'ARROW',
  RANGE = 'RANGE',

  // Keywords
  AND = 'AND',
  ELSE = 'ELSE',
  FALSE = 'FALSE',
  FN = 'FN',
  IF = 'IF',
  LET = 'LET',
  OR = 'OR',
  RETURN = 'RETURN',
  TRUE = 'TRUE',
  WHILE = 'WHILE',
  FOR = 'FOR',
  IN = 'IN',

  // Types
  TYPE_INT = 'TYPE_INT',
  TYPE_NIL = 'TYPE_NIL',
  TYPE_STR = 'TYPE_STR',
  TYPE_BOOL = 'TYPE_BOOL',

  //   Literals
  IDENTIFER = 'IDENTIFER',
  INTEGER = 'INTEGER',
  STRING = 'STRING',

  //   Misc
  SEMICOLON = 'SEMICOLON',
  EOF = 'EOF',
}

export default TokenType
