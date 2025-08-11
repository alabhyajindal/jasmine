import { test, expect } from 'bun:test'
import scan from '../src/lexer'
import TokenType from '../src/TokenType'

test('tokenizes arithmetic expression', () => {
  const source = '1 + 2 * 3'
  const tokens = scan(source)

  expect(tokens).toHaveLength(6)
  expect(tokens).toEqual([
    {
      type: TokenType.INTEGER,
      lexeme: '1',
      literal: 1,
      line: 1,
    },
    {
      type: TokenType.PLUS,
      lexeme: '+',
      literal: null,
      line: 1,
    },
    {
      type: TokenType.INTEGER,
      lexeme: '2',
      literal: 2,
      line: 1,
    },
    {
      type: TokenType.STAR,
      lexeme: '*',
      literal: null,
      line: 1,
    },
    {
      type: TokenType.INTEGER,
      lexeme: '3',
      literal: 3,
      line: 1,
    },
    {
      type: TokenType.EOF,
      lexeme: '',
      literal: null,
      line: 1,
    },
  ])
})
