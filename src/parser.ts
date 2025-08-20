import { reportError } from './error'
import type { Expr, VariableExpr } from './Expr'
import type {
    BlockStmt,
    ExprStmt,
    ForStmt,
    FunDecl,
    IfStmt,
    ReturnStmt,
    VariableStmt,
} from './Stmt'
import type Token from './Token'
import TokenType from './TokenType'
import { ValueTypes, type ValueType } from './ValueType'

// TODO: Clean up the parser - lots of unnecessary information. Is line number really required? Maybe for reporting errors but not for WebAssembly - could really benefit from a type checker - that ensures anything that makes it's way past it is a valid program. Need that anyways since we can't rely on Wasm for error reporting as we have another compiler backend coming up

export default class Parser {
    current = 0
    tokens: Token[] = []

    parse(t: Token[]) {
        this.tokens = t

        let statements = []
        while (!this.isAtEnd()) {
            statements.push(this.statement())
        }

        return statements
    }

    statement() {
        if (this.match(TokenType.LET)) {
            return this.variableStatement()
        }
        if (this.match(TokenType.LEFT_BRACE)) {
            return this.blockStatement()
        }
        if (this.match(TokenType.IF)) {
            return this.ifStatement()
        }
        if (this.match(TokenType.FN)) {
            return this.funDeclaration()
        }
        if (this.match(TokenType.RETURN)) {
            return this.returnStatement()
        }
        if (this.match(TokenType.FOR)) {
            return this.forStatement()
        }

        return this.expressionStatement()
    }

    variableStatement(): VariableStmt {
        let name = this.consume(TokenType.IDENTIFER, 'Expect variable name.')
        this.consume(TokenType.COLON, 'Expect colon.')
        let varType = this.consume(ValueTypes, 'Expect variable type.')

        this.consume(TokenType.EQUAL, 'Expect equal sign.')
        let initializer = this.expression()
        this.consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')
        return { name, initializer, type: 'VariableStmt', valueType: varType.type }
    }

    blockStatement(): BlockStmt {
        let statements = []

        while (!this.check(TokenType.RIGHT_BRACE)) {
            statements.push(this.statement())
        }
        this.consume(TokenType.RIGHT_BRACE, "Expect '}' after block.")
        return { type: 'BlockStmt', statements }
    }

    ifStatement(): IfStmt {
        let condition = this.expression()
        let thenBranch = this.statement()
        let elseBranch = null
        if (this.match(TokenType.ELSE)) {
            elseBranch = this.statement()
        }

        return { condition, thenBranch, elseBranch, type: 'IfStmt' }
    }

    funDeclaration(): FunDecl {
        let name = this.consume(TokenType.IDENTIFER, 'Expect function name.')
        this.consume(TokenType.LEFT_PAREN, "Expect '(' after function name.")

        let params: { name: string; type: ValueType }[] = []

        if (!this.check(TokenType.RIGHT_PAREN)) {
            do {
                let name = this.consume(TokenType.IDENTIFER, 'Expect parameter name.').lexeme
                this.match(TokenType.COLON)
                let type = this.consume(ValueTypes, 'Expect parameter type.').type
                params.push({ name, type })
            } while (this.match(TokenType.COMMA))
        }

        this.consume(TokenType.RIGHT_PAREN, "Expect ')' after parameters.")
        this.consume(TokenType.ARROW, "Expect '->' after parameters.")
        let returnType = this.consume(ValueTypes, "Expect return type after '->'.").type

        this.consume(TokenType.LEFT_BRACE, "Expect '{' before function body.")
        let body = this.blockStatement()
        return { name, params, returnType, body, type: 'FunDecl' }
    }

    returnStatement(): ReturnStmt {
        let value = null
        if (!this.check(TokenType.SEMICOLON)) {
            value = this.expression()
        }
        this.consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')

        return { value: value as Expr, type: 'ReturnStmt' }
    }

    forStatement(): ForStmt {
        let variable = this.consume(
            TokenType.IDENTIFER,
            'Expect identifier after for keyword.'
        ).lexeme
        this.consume(TokenType.IN, 'Expect in after for variable.')

        let start = this.expression()

        this.consume(TokenType.RANGE, 'Expect .. after loop starting value.')

        let end = this.expression()

        // NOTE: feels weird that we have to consume the opening brace when we expect a block statement - can this be moved there?
        this.consume(TokenType.LEFT_BRACE, "Expect '{' before for loop body.")
        let body = this.blockStatement()

        return { type: 'ForStmt', start, end, variable, body }
    }

    expressionStatement(): ExprStmt {
        let expr = this.expression()
        this.consume(TokenType.SEMICOLON, 'Expect semicolon after expression.')
        return { expression: expr, type: 'ExprStmt' }
    }

    expression(): Expr {
        return this.assignment()
    }

    assignment(): Expr {
        let expr = this.equality()

        if (this.match(TokenType.EQUAL)) {
            let equals = this.previous()
            let value = this.assignment()

            if (expr.type == 'VariableExpr') {
                let name = expr.name
                return { name, value, type: 'AssignExpr' }
            }
            reportError('Invalid variable assignment.', equals)
        }

        return expr
    }

    equality(): Expr {
        let expr = this.comparison()
        while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
            let operator = this.previous()
            let right = this.comparison()
            expr = { left: expr, operator, right, type: 'BinaryExpr' }
        }

        return expr
    }

    comparison(): Expr {
        let expr = this.term()

        while (
            this.match(
                TokenType.GREATER,
                TokenType.GREATER_EQUAL,
                TokenType.LESS,
                TokenType.LESS_EQUAL
            )
        ) {
            let operator = this.previous()
            let right = this.term()
            expr = { left: expr, operator, right, type: 'BinaryExpr' }
        }

        return expr
    }

    term(): Expr {
        let expr = this.factor()
        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            let operator = this.previous()
            let right = this.factor()
            expr = { left: expr, operator, right, type: 'BinaryExpr' }
        }

        return expr
    }

    factor(): Expr {
        let expr: Expr = this.call()
        while (this.match(TokenType.SLASH, TokenType.STAR)) {
            let operator = this.previous()
            let right = this.call()
            expr = { left: expr, operator, right, type: 'BinaryExpr' }
        }

        return expr
    }

    call(): Expr {
        let expr = this.primary()

        if (this.match(TokenType.LEFT_PAREN)) {
            let args = []
            if (!this.check(TokenType.RIGHT_PAREN)) {
                do {
                    args.push(this.expression())
                } while (this.match(TokenType.COMMA))
            }
            if (expr.type == 'VariableExpr' && expr.name.lexeme == 'println') {
                if (args.length != 1) {
                    reportError('println expects a single argument.', this.peek())
                }
            }

            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after arguments.")
            return { callee: expr as VariableExpr, args, type: 'CallExpr' }
        }

        return expr
    }

    primary(): Expr {
        if (this.match(TokenType.TRUE)) {
            return { value: true, type: 'LiteralExpr' }
        }
        if (this.match(TokenType.FALSE)) {
            return { value: false, type: 'LiteralExpr' }
        }
        if (this.match(TokenType.INTEGER)) {
            return { value: this.previous().literal as number, type: 'LiteralExpr' }
        }
        if (this.match(TokenType.STRING)) {
            return { value: this.previous().literal as string, type: 'LiteralExpr' }
        }
        if (this.match(TokenType.IDENTIFER)) {
            return { name: this.previous(), type: 'VariableExpr' }
        }
        if (this.match(TokenType.LEFT_PAREN)) {
            let expr = this.expression()
            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression.")
            return { expression: expr, type: 'GroupingExpr' }
        }

        reportError('Invalid literal expression.', this.peek())
    }

    match(...types: TokenType[]) {
        for (let type of types) {
            if (this.check(type)) {
                this.advance()
                return true
            }
        }
        return false
    }

    check(type: TokenType) {
        if (this.isAtEnd()) return false
        return this.peek()?.type == type
    }

    advance() {
        if (!this.isAtEnd()) this.current++
        return this.previous()
    }

    isAtEnd() {
        return this.peek().type == TokenType.EOF
    }

    peek() {
        return this.tokens[this.current]!
    }

    previous() {
        return this.tokens[this.current - 1]!
    }

    /**
     * Check if the next token is of the expected type. Expected Token types can be a single type or multiple, passed in as an array.
     */
    consume<T extends TokenType>(type: readonly T[] | T, msg: string): Token & { type: T } {
        const types = Array.isArray(type) ? type : [type]

        for (let t of types) {
            if (this.check(t)) {
                return this.advance() as Token & { type: T }
            }
        }
        reportError(msg, this.previous())
    }
}
