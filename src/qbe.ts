import { reportError } from './error'
import type { AssignExpr, BinaryExpr, CallExpr, Expr, LiteralExpr, VariableExpr } from './Expr'
import type { ForStmt, FunDecl, IfStmt, Stmt } from './Stmt'
import TokenType from './TokenType'
import type { ValueType } from './ValueType'

export default class QBECompiler {
    scopeStack: Map<string, [string, any]>[] = []
    ctx: string[] = []
    data: string[] = []
    functions: string[] = []
    strCounter = 0
    varCounter = 0
    blockCounter = 0

    readonly ilType: Map<ValueType, any> = new Map([
        [TokenType.TYPE_INT, 'w'],
        [TokenType.TYPE_NIL, ''],
    ])

    formIL() {
        return `${this.data.join('\n')}

${this.functions.join('\n')}

export function w $main() {
@start
    ${this.ctx.join('\n    ')}
    ret 0
}
  
data $fmt = { b "%d\\n", b 0 }`
    }

    compile(stmts: Stmt[]) {
        this.beginScope()
        this.compileStatements(stmts)
        const il = this.formIL()
        this.endScope()

        return il
    }

    compileStatements(stmts: Stmt[]) {
        for (let stmt of stmts) {
            this.compileStatement(stmt)
        }
    }

    compileStatement(stmt: Stmt) {
        switch (stmt.type) {
            case 'ExprStmt': {
                return this.compileExpression(stmt.expression)
            }
            case 'VariableStmt': {
                let varName = this.getVarName()
                let val = this.compileExpression(stmt.initializer)
                let varType = stmt.valueType

                this.declareVariable(stmt.name.lexeme, varName, varType)

                this.ctx.push(`${varName} =w copy ${val}`)
                return varName
            }
            case 'IfStmt': {
                this.ifStatement(stmt)
                break
            }
            case 'BlockStmt': {
                this.beginScope()
                this.compileStatements(stmt.statements)
                this.endScope()
                break
            }
            case 'ForStmt': {
                this.forStatement(stmt)
                break
            }
            case 'FunDecl': {
                this.fnDeclaration(stmt)
                break
            }
            case 'ReturnStmt': {
                let val = this.compileExpression(stmt.value)
                if (val) this.ctx.push(`ret ${val}`)
                else this.ctx.push('ret')
                break
            }
            default:
                console.error(stmt)
                reportError('Unsupported statement.')
        }
    }

    fnDeclaration(stmt: FunDecl) {
        let fnName = stmt.name.lexeme

        this.beginScope()
        let params = stmt.params.map((p) => {
            let paramName = this.getVarName()
            this.declareVariable(p.name, paramName, p.type)
            return `${this.ilType.get(p.type)} ${paramName}`
        })
        let returnType = this.ilType.get(stmt.returnType)

        let prevCtx = this.ctx
        this.ctx = []
        this.compileStatements(stmt.body.statements)
        // Add an empty return at the end of the function body if the return type is nil
        if (returnType == '') this.ctx.push('ret')

        let fn = `function ${returnType} $${fnName}(${params.join(', ')}) {
@start
    ${this.ctx.join('\n    ')}
}`
        this.functions.push(fn)
        this.endScope()

        this.ctx = prevCtx
    }

    ifStatement(stmt: IfStmt) {
        let condition = this.compileExpression(stmt.condition)

        let thenLabel = this.getBlockLabel()
        let elseLabel = stmt.elseBranch ? this.getBlockLabel() : null
        let endLabel = this.getBlockLabel()

        let falseTarget = elseLabel ? `${elseLabel}` : `${endLabel}`
        this.ctx.push(`jnz ${condition}, ${thenLabel}, ${falseTarget}`)

        this.ctx.push(`${thenLabel}`)
        this.compileStatement(stmt.thenBranch)
        if (this.ctx[this.ctx.length - 1]?.substring(0, 3) != 'ret')
            this.ctx.push(`jmp ${endLabel}`)

        if (stmt.elseBranch && elseLabel) {
            this.ctx.push(`${elseLabel}`)
            this.compileStatement(stmt.elseBranch)
            if (this.ctx[this.ctx.length - 1]?.substring(0, 3) != 'ret')
                this.ctx.push(`jmp ${endLabel}`)
        }

        this.ctx.push(`${endLabel}`)
    }

    forStatement(stmt: ForStmt) {
        let startVal = this.compileExpression(stmt.start)
        let endVal = this.compileExpression(stmt.end)

        // Create unique labels for the loop structure
        let conditionLabel = this.getBlockLabel()
        let bodyLabel = this.getBlockLabel()
        let endLabel = this.getBlockLabel()

        this.beginScope()
        let loopVarName = this.getVarName()
        this.declareVariable(stmt.variable, loopVarName, TokenType.TYPE_INT)
        this.ctx.push(`${loopVarName} =w copy ${startVal}`)

        // Jump to condition check
        this.ctx.push(`jmp ${conditionLabel}`)

        // Condition check: continue while loopVar < endVal
        this.ctx.push(`${conditionLabel}`)
        let condResult = this.getVarName()
        this.ctx.push(`${condResult} =w csltw ${loopVarName}, ${endVal}`)
        this.ctx.push(`jnz ${condResult}, ${bodyLabel}, ${endLabel}`)

        // Loop body execution
        this.ctx.push(`${bodyLabel}`)
        this.compileStatement(stmt.body)

        // Increment loop counter
        let incrementResult = this.getVarName()
        this.ctx.push(`${incrementResult} =w add ${loopVarName}, 1`)
        this.ctx.push(`${loopVarName} =w copy ${incrementResult}`)
        this.ctx.push(`jmp ${conditionLabel}`)

        this.ctx.push(`${endLabel}`)
        this.endScope()
    }

    compileExpression(expression: Expr): any {
        switch (expression.type) {
            case 'BinaryExpr':
                return this.binaryExpression(expression)
            case 'GroupingExpr':
                return this.compileExpression(expression.expression)
            case 'LiteralExpr':
                return this.literalExpression(expression)
            case 'VariableExpr':
                return this.variableExpression(expression)
            case 'AssignExpr':
                return this.assignExpression(expression)
            case 'CallExpr':
                return this.callExpression(expression)
            default:
                console.error(expression)
                reportError('Unsupported expression.')
        }
    }

    binaryExpression(expression: BinaryExpr) {
        let left = this.compileExpression(expression.left)
        let right = this.compileExpression(expression.right)

        const operatorMap: Partial<Record<TokenType, string>> = {
            PLUS: 'add',
            MINUS: 'sub',
            SLASH: 'div',
            STAR: 'mul',
            LESS: 'csltw',
            LESS_EQUAL: 'cslew',
            GREATER: 'csgtw',
            GREATER_EQUAL: 'csgew',
            EQUAL_EQUAL: 'ceqw',
            BANG_EQUAL: 'cnew',
        }
        let varName = this.getVarName()
        this.ctx.push(`${varName} =w ${operatorMap[expression.operator.type]} ${left}, ${right}`)
        return varName
    }

    literalExpression(expression: LiteralExpr) {
        switch (typeof expression.value) {
            case 'number':
                return expression.value
            case 'string':
                let strName = this.getStringName()
                let val = expression.value
                this.data.push(`data ${strName} = { b "${val}", b 0 }`)
                return strName
            case 'boolean':
                return expression.value ? 1 : 0
            default:
                console.error(expression)
                reportError('Unsupported literal expression.')
        }
    }

    variableExpression(expression: VariableExpr) {
        const result = this.lookupVariable(expression.name.lexeme)
        if (!result) {
            reportError(`Undefined variable: ${expression.name.lexeme}`)
        }
        return result[0]
    }

    assignExpression(expression: AssignExpr) {
        let val = this.compileExpression(expression.value)

        let result = this.lookupVariable(expression.name.lexeme)
        if (!result) {
            reportError(`Undefined variable: ${expression.name.lexeme}`)
        }

        let [varName, _] = result
        this.ctx.push(`${varName} =w copy ${val}`)
        return expression.name.lexeme
    }

    callExpression(expression: CallExpr) {
        let fnName = expression.callee.name.lexeme
        if (fnName == 'println') {
            return this.printFunction(expression)
        }

        // Handle user-defined functions
        let args = expression.args.map((arg) => this.compileExpression(arg))
        let resultVar = this.getVarName()
        let argList = args.map((arg) => `w ${arg}`).join(', ')
        this.ctx.push(`${resultVar} =w call $${fnName}(${argList})`)
        return resultVar
    }

    printFunction(expression: CallExpr) {
        let argExpr = expression.args[0]!
        if (argExpr.type == 'LiteralExpr') {
            let val = argExpr.value
            if (typeof val == 'string') {
                let strName = this.getStringName()
                this.data.push(`data ${strName} = { b "${val}", b 0 }`)
                this.ctx.push(`call $puts(w ${strName})`)
            } else {
                if (typeof val == 'boolean') val = val ? 1 : 0
                this.ctx.push(`call $printf(l $fmt, ..., w ${val})`)
            }
        } else if (argExpr.type == 'VariableExpr') {
            let varName = this.compileExpression(argExpr)

            let result = this.lookupVariable(argExpr.name.lexeme)
            if (result) {
                let [_, varType] = result
                if (varType == TokenType.TYPE_STR) {
                    this.ctx.push(`call $puts(w ${varName})`)
                } else {
                    this.ctx.push(`call $printf(l $fmt, ..., w ${varName})`)
                }
            }
        } else {
            let val = this.compileExpression(argExpr)
            this.ctx.push(`call $printf(l $fmt, ..., w ${val})`)
        }
    }

    // Scope
    beginScope() {
        this.scopeStack.push(new Map())
    }

    endScope() {
        this.scopeStack.pop()
    }

    declareVariable(name: string, ilName: string, type: any) {
        const currentScope = this.scopeStack[this.scopeStack.length - 1]
        // Current scope will always exist since we create the topmost scope in `compile`
        currentScope!.set(name, [ilName, type])
    }

    lookupVariable(name: string): [string, any] | null {
        // Search from innermost to outermost scope
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            const scope = this.scopeStack[i]!
            if (scope.has(name)) {
                return scope.get(name)!
            }
        }
        return null
    }

    // Utils
    /**
     * Generate unique string names
     */
    getStringName(): string {
        this.strCounter++
        return `$str_${this.strCounter}`
    }

    /**
     * Generate unique variable names
     */
    getVarName(): string {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz'
        let result = ''
        let num = this.varCounter

        do {
            result = alphabet[num % 26] + result
            num = Math.floor(num / 26)
        } while (num > 0)

        this.varCounter++
        return `%${result}`
    }

    /**
     * Generate unique block labels
     */
    getBlockLabel(): string {
        this.blockCounter++
        return `@block_${this.blockCounter}`
    }
}
