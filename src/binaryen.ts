import binaryen from 'binaryen'
import type { AssignExpr, BinaryExpr, CallExpr, Expr, LiteralExpr, UnaryExpr } from './Expr'
import TokenType from './TokenType'
import type { ForStmt, FunDecl, Stmt } from './Stmt'
import { reportError } from './error'
import type { ValueType } from './ValueType'

type FunctionInfo = {
    returnType: ValueType
}

interface VariableInfo {
    index: number
    type: ValueType
    strLen?: number
}

export default class BinaryenCompiler {
    mod!: binaryen.Module
    scopes: Map<string, VariableInfo>[] = []
    functionVars: binaryen.Type[] = []
    strLiteralMemoryPos = 1024
    loopCounter = 0

    readonly tokenTypeToBinaryen: Map<ValueType, any> = new Map([
        [TokenType.TYPE_NIL, binaryen.none],
        [TokenType.TYPE_INT, binaryen.i32],
        [TokenType.TYPE_STR, binaryen.i32],
    ])

    functionTable: Map<string, FunctionInfo> = new Map([
        ['println', { returnType: TokenType.TYPE_NIL }],
    ])

    compile(stmt: Stmt[]) {
        this.mod = new binaryen.Module()
        this.mod.setMemory(1, 2, 'memory')

        this.mod.addFunctionImport(
            'write',
            'wasi_snapshot_preview1',
            'fd_write',
            binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32]),
            binaryen.i32
        )

        this.mod.addFunctionImport(
            'itoa',
            'itoa',
            'itoa',
            binaryen.createType([binaryen.i32, binaryen.i32]),
            binaryen.i32
        )

        this.beginScope()
        const body = this.compileStatements(stmt)
        this.endScope()

        this.mod.addFunction(
            'main',
            binaryen.createType([]),
            binaryen.none,
            this.functionVars,
            body
        )
        this.mod.addFunctionExport('main', '_start')

        this.mod.validate()
        this.mod.optimize()

        const wat = this.mod.emitText()
        return wat
    }

    compileStatements(stmts: Stmt[]) {
        let res = []
        for (let stmt of stmts) {
            res.push(this.compileStatement(stmt))
        }

        return this.mod.block(null, res, binaryen.none)
    }

    /** Statement dispatcher */
    compileStatement(stmt: Stmt): binaryen.ExpressionRef {
        switch (stmt.type) {
            case 'ExprStmt': {
                let expr = this.compileExpression(stmt.expression)

                if (stmt.expression.type == 'CallExpr') {
                    let fnName = stmt.expression.callee.name.lexeme
                    if (this.functionTable.get(fnName)?.returnType == TokenType.TYPE_NIL) {
                        return expr
                    }
                } else if (stmt.expression.type == 'AssignExpr') {
                    return expr
                }

                return this.mod.drop(expr)
            }
            case 'VariableStmt': {
                let varType = TokenType.TYPE_INT
                let strLen: number | undefined = undefined

                if (stmt.initializer.type == 'LiteralExpr') {
                    if (typeof stmt.initializer.value == 'string') {
                        varType = TokenType.TYPE_STR
                        // Adding newline to the strLen
                        strLen = new TextEncoder().encode(stmt.initializer.value + '\n').length
                    }
                }

                let expr = this.compileExpression(stmt.initializer)

                let varName = stmt.name.lexeme
                let varInfo = this.defineVariable(varName, varType, strLen)
                return this.mod.local.set(varInfo.index, expr)
            }
            case 'BlockStmt': {
                this.beginScope()
                let stmts = stmt.statements
                let res = this.compileStatements(stmts)
                this.endScope()
                return res
            }
            case 'IfStmt': {
                let condition = this.compileExpression(stmt.condition)
                let thenBranch = this.compileStatement(stmt.thenBranch)
                if (stmt.elseBranch) {
                    let elseBranch = this.compileStatement(stmt.elseBranch)
                    return this.mod.if(condition, thenBranch, elseBranch)
                }

                return this.mod.if(condition, thenBranch)
            }
            case 'FunDecl':
                return this.funDeclaration(stmt)
            case 'ReturnStmt': {
                let val = this.compileExpression(stmt.value)
                return this.mod.return(val)
            }
            case 'ForStmt':
                return this.forStatement(stmt)
            default: {
                console.error(stmt)
                reportError('Unsupported statement.')
            }
        }
    }

    funDeclaration(stmt: FunDecl): binaryen.ExpressionRef {
        let name = stmt.name.lexeme
        let paramTypes = binaryen.createType(Array(stmt.params.length).fill(binaryen.i32))

        let returnType = binaryen.none
        if (stmt.returnType == TokenType.TYPE_INT) {
            returnType = binaryen.i32
        }

        let valueReturnType = returnType == binaryen.i32 ? TokenType.TYPE_INT : TokenType.TYPE_NIL
        this.functionTable.set(name, { returnType: valueReturnType })

        // Each function gets a blank state with nothing but the arguments passed in. That is, a function cannot access variables declared outside it's scope.

        // Store the current function variables before entering the function
        let currentFunctionVars = this.functionVars
        this.functionVars = []

        this.beginScope()
        for (let p of stmt.params) {
            this.defineVariable(p.name, p.type)
        }
        let body = this.compileStatement(stmt.body)
        this.endScope()

        this.mod.addFunction(name, paramTypes, returnType, this.functionVars, body)
        // Reset the function variables to what it was before entering the function
        this.functionVars = currentFunctionVars
        return this.mod.nop()
    }

    forStatement(forStmt: ForStmt): binaryen.ExpressionRef {
        let loopId = this.loopCounter++
        let loopLabel = `loop_${loopId}`
        let blockLabel = `block_${loopId}`

        this.beginScope()
        let loopVarInfo = this.defineVariable(forStmt.variable, TokenType.TYPE_INT)
        let initializer = this.mod.local.set(
            loopVarInfo.index,
            this.compileExpression(forStmt.start)
        )
        let body = this.compileStatement(forStmt.body)
        this.endScope()

        let increment = this.mod.local.set(
            loopVarInfo.index,
            this.mod.i32.add(
                this.mod.local.get(loopVarInfo.index, binaryen.i32),
                this.mod.i32.const(1)
            )
        )

        let condition = this.mod.i32.ge_s(
            this.mod.local.get(loopVarInfo.index, binaryen.i32),
            this.compileExpression(forStmt.end)
        )

        return this.mod.block(null, [
            initializer,
            this.mod.block(blockLabel, [
                this.mod.loop(
                    loopLabel,
                    this.mod.block(null, [
                        this.mod.br_if(blockLabel, condition),
                        body,
                        increment,
                        this.mod.br(loopLabel),
                    ])
                ),
            ]),
        ])
    }

    /** Expression dispatcher */
    compileExpression(expression: Expr): binaryen.ExpressionRef {
        switch (expression.type) {
            case 'BinaryExpr':
                return this.binaryExpression(expression)
            case 'LiteralExpr':
                return this.literalExpression(expression)
            case 'VariableExpr': {
                let varName = expression.name.lexeme
                let varInfo = this.findVariable(varName)
                if (varInfo) {
                    return this.mod.local.get(varInfo.index, binaryen.i32)
                } else {
                    reportError('Access to undefined variable.')
                }
            }
            case 'GroupingExpr':
                return this.compileExpression(expression.expression)
            case 'CallExpr':
                return this.callExpression(expression)
            case 'AssignExpr':
                return this.assignExpression(expression)
            default:
                console.error(expression)
                reportError('Unsupported ast type.')
        }
    }

    binaryExpression(expression: BinaryExpr): binaryen.ExpressionRef {
        const left = this.compileExpression(expression.left)
        const right = this.compileExpression(expression.right)

        switch (expression.operator.type) {
            case TokenType.PLUS:
                return this.mod.i32.add(left, right)
            case TokenType.MINUS:
                return this.mod.i32.sub(left, right)
            case TokenType.SLASH:
                return this.mod.i32.div_s(left, right)
            case TokenType.STAR:
                return this.mod.i32.mul(left, right)
            case TokenType.LESS:
                return this.mod.i32.lt_s(left, right)
            case TokenType.LESS_EQUAL:
                return this.mod.i32.le_s(left, right)
            case TokenType.GREATER:
                return this.mod.i32.gt_s(left, right)
            case TokenType.GREATER_EQUAL:
                return this.mod.i32.ge_s(left, right)
            case TokenType.EQUAL_EQUAL:
                return this.mod.i32.eq(left, right)
            case TokenType.BANG_EQUAL:
                return this.mod.i32.ne(left, right)
            default:
                reportError('Unsupported binary operator.', expression.operator)
        }
    }

    /**
     * Process a literal value.
     * i32 are returned for numbers and booleans.
     * Strings are stored in memory as a side effect and their starting position are returned.
     */
    literalExpression(
        expression: LiteralExpr,
        storagePos: number = this.strLiteralMemoryPos
    ): binaryen.ExpressionRef {
        switch (typeof expression.value) {
            case 'number':
                return this.mod.i32.const(expression.value)
            case 'boolean':
                return this.mod.i32.const(expression.value ? 1 : 0)
            case 'string': {
                // Storing all strings with newline appended - since no operations exist on strings other than print - this is fine - if a new string operation is added like string concatenaion ++, then the newline char can be stored at a specific position in memory and printed everytime a string is printed
                let str = expression.value + '\n'
                let strArr = new TextEncoder().encode(str)

                let instrs = []
                for (let [i, charCode] of strArr.entries()) {
                    instrs.push(
                        this.mod.i32.store8(
                            0,
                            1,
                            this.mod.i32.const(storagePos + i),
                            this.mod.i32.const(charCode)
                        )
                    )
                }
                instrs.push(this.mod.i32.const(storagePos))

                if (arguments.length < 3) {
                    this.strLiteralMemoryPos += strArr.length
                }
                return this.mod.block(null, instrs, binaryen.i32)
            }
            default:
                console.error(expression)
                reportError('Unsupported literal expression.')
        }
    }

    callExpression(expression: CallExpr): binaryen.ExpressionRef {
        let fnName = expression.callee.name.lexeme
        if (fnName == 'println') {
            return this.printFunction(expression)
        }

        let args = expression.args.map((arg) => this.compileExpression(arg))
        let returnType: ValueType = this.functionTable.get(fnName)!.returnType

        return this.mod.call(fnName, args, this.tokenTypeToBinaryen.get(returnType))
    }

    assignExpression(expr: AssignExpr): binaryen.ExpressionRef {
        let varName = expr.name.lexeme
        let varInfo = this.findVariable(varName)
        if (!varInfo) {
            reportError('Cannot assign to undeclared variable.')
        }

        if (varInfo.type == TokenType.TYPE_STR) {
            if (expr.value.type == 'LiteralExpr' && typeof expr.value.value == 'string') {
                let newStrLen = new TextEncoder().encode(expr.value.value + '\n').length
                varInfo.strLen = newStrLen
            } else {
                reportError('String variables can only be reassigned to literals.')
            }
        }

        let value = this.compileExpression(expr.value)
        return this.mod.local.set(varInfo.index, value)
    }

    /** Compiles a `println` function call */
    printFunction(expression: CallExpr): binaryen.ExpressionRef {
        let argExpr = expression.args[0]!

        if (argExpr.type == 'VariableExpr') {
            let identifier = argExpr.name.lexeme
            let varInfo = this.findVariable(identifier)
            if (!varInfo) {
                reportError('Undefined variable - print function')
            }

            if (varInfo.type == TokenType.TYPE_STR) {
                let strAddress = this.mod.local.get(varInfo.index, binaryen.i32)
                if (!varInfo.strLen) {
                    reportError('Unable to compute string length at compile time')
                }
                return this.callWrite(undefined, this.mod.i32.const(varInfo.strLen), strAddress)
            } else {
                // Handles non literals like 42 + 3
                return this.callWrite(this.compileExpression(argExpr))
            }
        }

        if (argExpr.type === 'LiteralExpr' && typeof argExpr.value === 'string') {
            argExpr.value = argExpr.value + '\n'
            let str = argExpr.value
            let strLen = new TextEncoder().encode(str).length

            const TEMP_STR_LITERAL_POS = 2048

            return this.mod.block(null, [
                this.mod.drop(this.literalExpression(argExpr, TEMP_STR_LITERAL_POS)),
                this.callWrite(
                    undefined,
                    this.mod.i32.const(strLen),
                    this.mod.i32.const(TEMP_STR_LITERAL_POS)
                ),
            ])
        } else {
            return this.callWrite(this.compileExpression(argExpr))
        }
    }

    /** Calls the write function provided by WASI */
    callWrite(
        expr?: binaryen.ExpressionRef,
        strLen?: binaryen.ExpressionRef,
        bufferPtr: number = this.mod.i32.const(66)
    ) {
        if (expr && !strLen) {
            strLen = this.mod.call('itoa', [expr, bufferPtr], binaryen.i32)
        }

        // ewww - when we print an int we pass expr, when we print a string we pass strlen - both are never passed - modify the function so we don't need this check below
        if (!strLen) {
            reportError('Failed to compute strLen')
        }

        return this.mod.block(null, [
            // iovec structure
            this.mod.i32.store(0, 4, this.mod.i32.const(0), bufferPtr),
            this.mod.i32.store(0, 4, this.mod.i32.const(4), strLen),

            this.mod.drop(
                this.mod.call(
                    'write',
                    [
                        this.mod.i32.const(1), // stdout
                        this.mod.i32.const(0), // iovec start address
                        this.mod.i32.const(1), // read this many iovecs
                        this.mod.i32.const(92), // nwritten
                    ],
                    binaryen.i32
                )
            ),
        ])
    }

    // Utils

    /** Defines a variable in the current scope */
    defineVariable(name: string, type: ValueType, strLen?: number): VariableInfo {
        let currentScope = this.scopes[this.scopes.length - 1]
        if (currentScope?.has(name)) {
            reportError('the variable already exists in the current scope.')
        }

        const info: VariableInfo = {
            index: this.functionVars.length,
            type,
            strLen,
        }

        currentScope?.set(name, info)
        this.functionVars.push(this.tokenTypeToBinaryen.get(type))
        return info
    }

    /** Looks for a variable in the current scope, moving up in scope to parent if not found */
    findVariable(name: string) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            let scope = this.scopes[i]
            if (scope?.has(name)) {
                return scope.get(name)
            }
        }

        return undefined
    }

    beginScope() {
        this.scopes.push(new Map())
    }

    endScope() {
        this.scopes.pop()
    }
}
