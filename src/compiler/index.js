/**
 * nuxScript Compiler
 * Compiles AST to bytecode instructions
 */

const path = require('path');

const {
    NODE_TYPES,
    NumberLiteral,
    StringLiteral,
    BooleanLiteral,
    NullLiteral,
    ListLiteral,
    MapLiteral,
    ListComp,
    TemplateLiteral,
    Identifier,
    LetDeclaration,
    VarDeclaration,
    ConstDeclaration,
    FnDeclaration,
    StructDeclaration,
    Property,
    EnumVariant,
    EnumDeclaration,
    BinaryExpr,
    UnaryExpr,
    CallExpr,
    IndexExpr,
    MemberExpr,
    PipeExpr,
    MatchCase,
    MatchExpr,
    IfExpr,
    ForExpr,
    WhileExpr,
    Block,
    LambdaExpr,
    SpawnExpr,
    AwaitExpr,
    FiberLiteral,
    ReturnStatement,
    BreakStatement,
    ContinueStatement,
    TryExpr,
    ThrowExpr,
    UseStatement,
} = require('../ast/nodes');

// Bytecode opcodes
const OPCODES = {
    LOAD_CONST: 'LOAD_CONST',
    LOAD_VAR: 'LOAD_VAR',
    STORE_VAR: 'STORE_VAR',
    LOAD_SUBSCRIPT: 'LOAD_SUBSCRIPT',
    STORE_SUBSCRIPT: 'STORE_SUBSCRIPT',

    ADD: 'ADD',
    SUB: 'SUB',
    MUL: 'MUL',
    DIV: 'DIV',
    MOD: 'MOD',
    POW: 'POW',
    NEG: 'NEG',

    EQ: 'EQ',
    NEQ: 'NEQ',
    LT: 'LT',
    GT: 'GT',
    LTE: 'LTE',
    GTE: 'GTE',

    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',

    JUMP: 'JUMP',
    JUMP_IF_FALSE: 'JUMP_IF_FALSE',
    JUMP_IF_TRUE: 'JUMP_IF_TRUE',

    CALL: 'CALL',
    RETURN: 'RETURN',

    MAKE_FUNCTION: 'MAKE_FUNCTION',
    MAKE_LIST: 'MAKE_LIST',
    MAKE_MAP: 'MAKE_MAP',
    MAKE_STRUCT: 'MAKE_STRUCT',
    MAKE_ENUM: 'MAKE_ENUM',
    MAKE_STRING: 'MAKE_STRING',

    GET_FIELD: 'GET_FIELD',
    SET_FIELD: 'SET_FIELD',

    // Pattern matching opcodes
    PM_WILDCARD: 'PM_WILDCARD',
    PM_LITERAL: 'PM_LITERAL',
    PM_IDENT: 'PM_IDENT',
    PM_LIST: 'PM_LIST',
    PM_ENUM: 'PM_ENUM',
    PM_JUMP_IF_FALSE: 'PM_JUMP_IF_FALSE',

    LOOP_START: 'LOOP_START',
    LOOP_ITERATE: 'LOOP_ITERATE',
    LOOP_END: 'LOOP_END',

    // Fiber opcodes
    SPAWN: 'SPAWN',
    AWAIT_FIBER: 'AWAIT_FIBER',
    FIBER_YIELD: 'FIBER_YIELD',
    FIBER_RESUME: 'FIBER_RESUME',
    FIBER_RESUME_WITH: 'FIBER_RESUME_WITH',

    // Tail call
    TAIL_CALL: 'TAIL_CALL',
    TAIL_CALL_SETUP: 'TAIL_CALL_SETUP',

    HALT: 'HALT',
    DUP: 'DUP',
    POP: 'POP',
    SWAP: 'SWAP',

    // Result/Option helpers
    OK: 'OK',
    ERR: 'ERR',
    IS_OK: 'IS_OK',
    IS_ERR: 'IS_ERR',

    // Pipe
    PIPE: 'PIPE',

    // Null handling
    NULL: 'NULL',
    IS_NULL: 'IS_NULL',
    COALESCE: 'COALESCE',

    // Exception handling
    THROW: 'THROW',
    TRY_START: 'TRY_START',
    TRY_END: 'TRY_END',
    CATCH_START: 'CATCH_START',
};

class Compiler {
    constructor(ast) {
        this.ast = ast;
        this.instructions = [];
        this.constants = [];
        this.sourceMap = new Map();
        this.fiberIdCounter = 0;
    }

    emit(opcode, operand = null) {
        const index = this.instructions.length;
        if (operand !== null) {
            this.instructions.push({ opcode, operand });
        } else {
            this.instructions.push({ opcode });
        }
        return index;
    }

    addConstant(value) {
        const index = this.constants.length;
        this.constants.push(value);
        return index;
    }

    compile() {
        for (const node of this.ast) {
            this.compileNode(node);
        }
        this.emit(OPCODES.HALT);
        return {
            instructions: this.instructions,
            constants: this.constants,
        };
    }

    compileNode(node) {
        if (!node) return;

        switch (node.type) {
            case NODE_TYPES.NUMBER:
                return this.compileNumber(node);
            case NODE_TYPES.STRING:
                return this.compileString(node);
            case NODE_TYPES.BOOLEAN:
                return this.compileBoolean(node);
            case NODE_TYPES.NULL:
                return this.compileNull(node);
            case NODE_TYPES.LIST:
                return this.compileList(node);
            case NODE_TYPES.MAP:
                return this.compileMap(node);
            case NODE_TYPES.LIST_COMP:
                return this.compileListComp(node);
            case NODE_TYPES.TEMPLATE:
                return this.compileTemplate(node);
            case NODE_TYPES.IDENTIFIER:
                return this.compileIdentifier(node);
            case NODE_TYPES.LET:
                return this.compileLet(node);
            case NODE_TYPES.VAR:
                return this.compileVar(node);
            case NODE_TYPES.CONST:
                return this.compileConst(node);
            case NODE_TYPES.FN:
                return this.compileFn(node);
            case NODE_TYPES.STRUCT:
                return this.compileStruct(node);
            case NODE_TYPES.ENUM:
                return this.compileEnum(node);
            case NODE_TYPES.BINARY:
                return this.compileBinary(node);
            case NODE_TYPES.UNARY:
                return this.compileUnary(node);
            case NODE_TYPES.CALL:
                return this.compileCall(node);
            case NODE_TYPES.INDEX:
                return this.compileIndex(node);
            case NODE_TYPES.MEMBER:
                return this.compileMember(node);
            case NODE_TYPES.PIPE:
                return this.compilePipe(node);
            case NODE_TYPES.IF:
                return this.compileIf(node);
            case NODE_TYPES.FOR:
                return this.compileFor(node);
            case NODE_TYPES.WHILE:
                return this.compileWhile(node);
            case NODE_TYPES.MATCH:
                return this.compileMatch(node);
            case NODE_TYPES.BLOCK:
                return this.compileBlock(node);
            case NODE_TYPES.RETURN:
                return this.compileReturn(node);
            case NODE_TYPES.BREAK:
                return this.compileBreak(node);
            case NODE_TYPES.CONTINUE:
                return this.compileContinue(node);
            case NODE_TYPES.LAMBDA:
                return this.compileLambda(node);
            case NODE_TYPES.TRY:
                return this.compileTry(node);
            case NODE_TYPES.THROW:
                return this.compileThrow(node);
            case NODE_TYPES.SPAWN:
                return this.compileSpawn(node);
            case NODE_TYPES.AWAIT:
                return this.compileAwait(node);
            case NODE_TYPES.USE:
                return this.compileUse(node);
            case NODE_TYPES.TRAIT:
                return this.compileTrait(node);
            case NODE_TYPES.IMPL:
                return this.compileImpl(node);
            case NODE_TYPES.EXTERN_FN:
                return this.compileExternFn(node);
            case NODE_TYPES.EXPORT:
                return this.compileExport(node);
            default:
                throw new Error(`Unknown node type: ${node.type}`);
        }
    }

    compileNumber(node) {
        const idx = this.addConstant(node.value);
        this.emit(OPCODES.LOAD_CONST, idx);
    }

    compileString(node) {
        const idx = this.addConstant(node.value);
        this.emit(OPCODES.LOAD_CONST, idx);
    }

    compileBoolean(node) {
        this.emit(OPCODES.LOAD_CONST, node.value ? 1 : 0);
    }

    compileNull(node) {
        this.emit(OPCODES.NULL);
    }

    compileList(node) {
        for (const elem of node.elements) {
            this.compileNode(elem);
        }
        this.emit(OPCODES.MAKE_LIST, node.elements.length);
    }

    compileMap(node) {
        for (const { key, value } of node.pairs) {
            if (key.type === NODE_TYPES.IDENTIFIER) {
                // Map key is an identifier literal (like { foo: 1 })
                this.emit(OPCODES.LOAD_CONST, this.addConstant(key.name));
            } else {
                this.compileNode(key);
            }
            this.compileNode(value);
        }
        this.emit(OPCODES.MAKE_MAP, node.pairs.length);
    }

    // List comprehension: [expr for x in list if cond]
    compileListComp(node) {
        // List comprehension: [expr for x in iterable if filter]
        const iterVar = `__iter_${Date.now()}`;
        const idxVar = `__idx_${Date.now()}`;
        const itemVar = `__item_${Date.now()}`;
        const resultVar = `__result_${Date.now()}`;

        // Initialize index = 0
        this.emit(OPCODES.LOAD_CONST, this.addConstant(0));
        this.emit(OPCODES.STORE_VAR, idxVar);

        // Compile iterable
        this.compileNode(node.iterable);
        this.emit(OPCODES.STORE_VAR, iterVar);

        // Initialize result list
        this.emit(OPCODES.MAKE_LIST, 0);
        this.emit(OPCODES.STORE_VAR, resultVar);

        const loopStart = this.instructions.length;
        this.emit(OPCODES.LOOP_START);

        // Iterate: get current item
        this.emit(OPCODES.LOAD_VAR, iterVar);
        this.emit(OPCODES.LOAD_VAR, idxVar);
        this.emit(OPCODES.LOOP_ITERATE);

        // Stack: [item, new_index, has_more]
        const jumpToEnd = this.emit(OPCODES.JUMP_IF_FALSE);
        // Stack: [item, new_index]

        // Store item and new_index to variables
        this.emit(OPCODES.STORE_VAR, node.variable); // Store to the loop variable (e.g., x)
        this.emit(OPCODES.STORE_VAR, idxVar);
        // Stack: []

        // If filter exists, evaluate it
        if (node.filter) {
            this.emit(OPCODES.LOAD_VAR, node.variable);
            this.compileNode(node.filter);
            const skipToNext = this.emit(OPCODES.JUMP_IF_FALSE);
            this.instructions[skipToNext].operand = this.instructions.length;
        }

        // Evaluate element and push to result list
        // Stack should be [result_list, element] before PUSH
        this.compileNode(node.element); // leaves element on stack
        this.emit(OPCODES.LOAD_VAR, resultVar); // pushes result_list
        // Stack: [element, result_list]
        this.emit(OPCODES.PUSH);
        // Stack: [new_result_list]
        this.emit(OPCODES.STORE_VAR, resultVar);

        // Jump back to loop start
        this.emit(OPCODES.JUMP, loopStart);

        // End of loop
        this.instructions[jumpToEnd].operand = this.instructions.length;
        this.emit(OPCODES.LOOP_END);

        // Clean up
        this.emit(OPCODES.POP); // item
        this.emit(OPCODES.POP); // new_index

        // Load result
        this.emit(OPCODES.LOAD_VAR, resultVar);
    }

    // Template literal with interpolation: `Hello {name}!`
    compileTemplate(node) {
        // Compile string parts concatenated
        // For each part: if str, load constant; if expr, compile expr
        // Concatenate with +
        let first = true;
        for (const part of node.parts) {
            if (part.type === 'str') {
                if (first) {
                    const idx = this.addConstant(part.value);
                    this.emit(OPCODES.LOAD_CONST, idx);
                    first = false;
                } else {
                    const idx = this.addConstant(part.value);
                    this.emit(OPCODES.LOAD_CONST, idx);
                    this.emit(OPCODES.ADD);
                }
            } else {
                this.compileNode(part.value);
                if (!first) {
                    this.emit(OPCODES.ADD);
                }
                first = false;
            }
        }
        if (first) {
            // Empty template
            const idx = this.addConstant('');
            this.emit(OPCODES.LOAD_CONST, idx);
        }
    }

    compileIdentifier(node) {
        this.emit(OPCODES.LOAD_VAR, node.name);
    }

    compileLet(node) {
        this.compileNode(node.value);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileVar(node) {
        this.compileNode(node.value);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileConst(node) {
        this.compileNode(node.value);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileFn(node) {
        const compiler = new Compiler([]);
        for (const stmt of node.body.statements) {
            compiler.compileNode(stmt);
        }
        const fnInfo = {
            name: node.name,
            params: node.params.map(p => p.name),
            instructions: compiler.instructions,
            constants: compiler.constants,
            returnType: node.returnType,
        };
        const idx = this.addConstant(fnInfo);
        this.emit(OPCODES.MAKE_FUNCTION, idx);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileStruct(node) {
        const structInfo = {
            name: node.name,
            properties: node.properties.map(p => ({ name: p.name, type: p.typeAnnotation })),
            __struct_def__: true,
        };
        const idx = this.addConstant(structInfo);
        this.emit(OPCODES.LOAD_CONST, idx);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileEnum(node) {
        const enumInfo = {
            name: node.name,
            variants: node.variants.map(v => ({
                name: v.name,
                fields: v.fields.map(f => f.name),
            })),
        };
        const idx = this.addConstant(enumInfo);
        this.emit(OPCODES.MAKE_ENUM, idx);
    }

    compileBinary(node) {
        this.compileNode(node.left);
        this.compileNode(node.right);

        switch (node.operator) {
            case '+':
                return this.emit(OPCODES.ADD);
            case '-':
                return this.emit(OPCODES.SUB);
            case '*':
                return this.emit(OPCODES.MUL);
            case '/':
                return this.emit(OPCODES.DIV);
            case '%':
                return this.emit(OPCODES.MOD);
            case '**':
                return this.emit(OPCODES.POW);
            case '==':
                return this.emit(OPCODES.EQ);
            case '!=':
                return this.emit(OPCODES.NEQ);
            case '<':
                return this.emit(OPCODES.LT);
            case '>':
                return this.emit(OPCODES.GT);
            case '<=':
                return this.emit(OPCODES.LTE);
            case '>=':
                return this.emit(OPCODES.GTE);
            case 'and':
            case '&&':
                return this.emit(OPCODES.AND);
            case 'or':
            case '||':
                return this.emit(OPCODES.OR);
            default:
                throw new Error(`Unknown binary operator: ${node.operator}`);
        }
    }

    compileUnary(node) {
        this.compileNode(node.operand);
        switch (node.operator) {
            case '-':
                this.emit(OPCODES.NEG);
                break;
            case 'not':
            case '!':
                this.emit(OPCODES.NOT);
                break;
            case '?':
                this.emit(OPCODES.IS_NULL);
                break;
            default:
                throw new Error(`Unknown unary operator: ${node.operator}`);
        }
    }

    compileCall(node) {
        let argCount = 0;
        // Count actual stack items (named args push 2 items: name + value)
        for (const arg of node.args) {
            argCount += (arg && arg.type === 'named_arg') ? 2 : 1;
        }
        // Push arguments left-to-right
        for (let i = 0; i < node.args.length; i++) {
            const arg = node.args[i];
            if (arg && arg.type === 'named_arg') {
                const idx = this.addConstant(arg.name);
                this.emit(OPCODES.LOAD_CONST, idx);
                this.compileNode(arg.value);
            } else {
                this.compileNode(arg);
            }
        }
        // Then push the function
        this.compileNode(node.callee);
        this.emit(OPCODES.CALL, argCount);
    }

    compileIndex(node) {
        this.compileNode(node.object);
        this.compileNode(node.index);
        this.emit(OPCODES.LOAD_SUBSCRIPT);
    }

    compileMember(node) {
        this.compileNode(node.object);
        this.emit(OPCODES.GET_FIELD, node.property);
    }

    compilePipe(node) {
        this.compileNode(node.left);
        this.compileNode(node.right);
        this.emit(OPCODES.CALL, 1);
    }

    compileIf(node) {
        this.compileNode(node.condition);
        const jumpToElse = this.emit(OPCODES.JUMP_IF_FALSE);

        this.compileNode(node.consequent);

        if (node.alternate) {
            const jumpToEnd = this.emit(OPCODES.JUMP);
            this.instructions[jumpToElse].operand = this.instructions.length;

            this.compileNode(node.alternate);

            this.instructions[jumpToEnd].operand = this.instructions.length;
        } else {
            this.instructions[jumpToElse].operand = this.instructions.length;
        }
    }

    compileFor(node) {
        const iterVar = `__iter_${Date.now()}`;
        const idxVar = `__idx_${Date.now()}`;

        // Initialize index = 0
        this.emit(OPCODES.LOAD_CONST, this.addConstant(0));
        this.emit(OPCODES.STORE_VAR, idxVar);

        // Compile iterable -> puts list on stack
        this.compileNode(node.iterable);
        this.emit(OPCODES.STORE_VAR, iterVar);

        const loopStart = this.instructions.length;
        this.emit(OPCODES.LOOP_START);

        // Load list first, then index (LOOP_ITERATE pops list first then index)
        this.emit(OPCODES.LOAD_VAR, iterVar);
        this.emit(OPCODES.LOAD_VAR, idxVar);
        this.emit(OPCODES.LOOP_ITERATE);

        // Stack after LOOP_ITERATE: [item, new_index, has_more]
        const jumpToEnd = this.emit(OPCODES.JUMP_IF_FALSE);
        // has_more was popped by JUMP_IF_FALSE. Stack: [item, new_index]

        // Need to store item, then promote new_index to top of stack
        // Strategy: DUP new_index, SWAP with item, store item, SWAP again
        this.emit(OPCODES.DUP); // Stack: [item, new_index, new_index]
        this.emit(OPCODES.SWAP); // Stack: [item, new_index, new_index] -> [item, new_index, new_index] (no change with only 2)

        // Actually, simpler: just store item, then use LOAD_CONST 1 + ADD to increment the existing index
        // But we lost the original index value...

        // Better approach: use a temp variable for new_index
        const newIdxVar = `__nidx_${Date.now()}`;
        this.emit(OPCODES.STORE_VAR, newIdxVar); // Store new_index
        this.emit(OPCODES.POP); // Pop the has_more flag
        this.emit(OPCODES.STORE_VAR, node.variable); // Store item to loop variable
        // Stack is now empty

        // Compile body
        this.compileNode(node.body);
        this.emit(OPCODES.POP); // discard body result

        // Update index: load new_index and store it
        this.emit(OPCODES.LOAD_VAR, newIdxVar);
        this.emit(OPCODES.STORE_VAR, idxVar);

        // Jump back to loop start
        this.emit(OPCODES.JUMP, loopStart);

        // End of loop
        this.instructions[jumpToEnd].operand = this.instructions.length;
        this.emit(OPCODES.LOOP_END);

        // Clean up: pop leftover item and new_index (from when has_more=false)
        this.emit(OPCODES.POP); // item
        this.emit(OPCODES.POP); // new_index
    }

    compileWhile(node) {
        const loopStart = this.instructions.length;

        this.compileNode(node.condition);
        const jumpToEnd = this.emit(OPCODES.JUMP_IF_FALSE);

        this.compileNode(node.body);
        this.emit(OPCODES.JUMP, loopStart);

        this.instructions[jumpToEnd].operand = this.instructions.length;
        this.emit(OPCODES.LOOP_END);
    }

    compileMatch(node) {
        this.compileNode(node.subject);
        const matchEndJumps = [];

        for (let i = 0; i < node.cases.length; i++) {
            const c = node.cases[i];
            const isLastCase = i === node.cases.length - 1;

            const caseInfo = this.emitCasePattern(c.pattern, isLastCase);

            if (caseInfo.alwaysMatches) {
                // Handle guard if present
                if (c.guard) {
                    this.emit(OPCODES.DUP);
                    this.compileNode(c.guard);
                    const skipToNext = this.emit(OPCODES.JUMP_IF_FALSE);
                    this.instructions[skipToNext].operand = this.instructions.length + 1;
                    this.emit(OPCODES.POP);
                }
                this.compileNode(c.body);
                const jumpToEnd = this.emit(OPCODES.JUMP);
                matchEndJumps.push(jumpToEnd);
            } else {
                const jumpToNext = this.emit(OPCODES.PM_JUMP_IF_FALSE);
                this.emit(OPCODES.SWAP);
                this.emit(OPCODES.POP);

                // Handle guard if present
                if (c.guard) {
                    this.emit(OPCODES.DUP);
                    this.compileNode(c.guard);
                    const skipToNext = this.emit(OPCODES.JUMP_IF_FALSE);
                    this.instructions[skipToNext].operand = this.instructions.length + 1;
                    this.emit(OPCODES.POP);
                }

                if (caseInfo.needsFieldExtraction) {
                    this.emit(OPCODES.DUP);
                    this.emit(OPCODES.GET_FIELD, 'value');
                    this.emit(OPCODES.STORE_VAR, caseInfo.fieldName);
                }

                this.compileNode(c.body);
                const jumpToEnd = this.emit(OPCODES.JUMP);
                matchEndJumps.push(jumpToEnd);
                this.instructions[jumpToNext].operand = this.instructions.length;
            }
        }

        this.emit(OPCODES.POP);
        this.emit(OPCODES.NULL);

        for (const idx of matchEndJumps) {
            this.instructions[idx].operand = this.instructions.length;
        }
    }

    emitCasePattern(pattern, isLastCase) {
        if (pattern.type === 'wildcard') {
            this.emit(OPCODES.POP);
            return { alwaysMatches: true };
        }

        if (pattern.type === 'literal') {
            this.emit(OPCODES.DUP);
            const idx = this.addConstant(pattern.value);
            this.emit(OPCODES.LOAD_CONST, idx);
            this.emit(OPCODES.EQ);
            return { alwaysMatches: false };
        }

        if (pattern.type === 'ident') {
            this.emit(OPCODES.STORE_VAR, pattern.name);
            return { alwaysMatches: true };
        }

        if (pattern.type === 'enum') {
            if (pattern.fields && pattern.fields.length > 0) {
                this.emit(OPCODES.DUP);
                this.emit(OPCODES.GET_FIELD, '__variant__');
                const variantIdx = this.addConstant(pattern.name);
                this.emit(OPCODES.LOAD_CONST, variantIdx);
                this.emit(OPCODES.EQ);
                return { alwaysMatches: false, needsFieldExtraction: true, fieldName: pattern.fields[0].name };
            }

            this.emit(OPCODES.DUP);
            this.emit(OPCODES.GET_FIELD, '__variant__');
            const variantIdx = this.addConstant(pattern.name);
            this.emit(OPCODES.LOAD_CONST, variantIdx);
            this.emit(OPCODES.EQ);
            return { alwaysMatches: false };
        }

        return { alwaysMatches: true };
    }

    compileBlock(node) {
        for (const stmt of node.statements) {
            this.compileNode(stmt);
        }
    }

    compileReturn(node) {
        if (node.value) {
            this.compileNode(node.value);
        }
        this.emit(OPCODES.RETURN);
    }

    compileBreak(node) {
        this.emit(OPCODES.JUMP);
    }

    compileContinue(node) {
        this.emit(OPCODES.JUMP);
    }

    compileLambda(node) {
        const compiler = new Compiler([]);
        for (const stmt of node.body.statements || [node.body]) {
            compiler.compileNode(stmt);
        }
        const fnInfo = {
            name: '<lambda>',
            params: node.params.map(p => p.name),
            instructions: compiler.instructions,
            constants: compiler.constants,
        };
        const idx = this.addConstant(fnInfo);
        this.emit(OPCODES.MAKE_FUNCTION, idx);
    }

    compileTry(node) {
        const tryStartIdx = this.instructions.length;
        this.emit(OPCODES.TRY_START, 0);

        this.compileBlock(node.body);

        const tryEndIdx = this.instructions.length;
        this.emit(OPCODES.TRY_END, 0);

        const jumpPastCatch = this.emit(OPCODES.JUMP);

        const catchIdx = this.instructions.length;
        this.emit(OPCODES.CATCH_START);

        this.instructions[tryStartIdx].operand = catchIdx;

        if (node.catchClause.var) {
            this.emit(OPCODES.STORE_VAR, node.catchClause.var);
        }

        this.compileBlock(node.catchClause.body);

        const jumpToEnd = this.emit(OPCODES.JUMP);

        this.instructions[tryEndIdx].operand = this.instructions.length;
        this.instructions[jumpPastCatch].operand = this.instructions.length;
        this.instructions[jumpToEnd].operand = this.instructions.length;
    }

    compileThrow(node) {
        this.compileNode(node.arg);
        this.emit(OPCODES.THROW);
    }

    // Fibers: spawn { block }
    compileSpawn(node) {
        const fiberId = ++this.fiberIdCounter;
        const fiberInfo = {
            id: fiberId,
            body: node.body,
        };
        const idx = this.addConstant(fiberInfo);
        this.emit(OPCODES.SPAWN, idx);
    }

    // Await: await fiber
    compileAwait(node) {
        this.compileNode(node.fiber);
        this.emit(OPCODES.AWAIT_FIBER);
    }

    compileUse(node) {
        const moduleName = node.path || '';
        const imports = node.imports || [];
        const varName = path.basename(moduleName.replace(/\.nux$/, '').replace(/[^a-zA-Z0-9_:]/g, '_')).replace(/:/g, '_');

        if (imports.length > 0) {
            // Selective import: use { foo, bar } from "module"
            const importsIdx = this.addConstant(imports);
            this.emit(OPCODES.LOAD_CONST, importsIdx);
            const idx = this.addConstant(moduleName);
            this.emit(OPCODES.LOAD_CONST, idx);
            this.emit(OPCODES.LOAD_VAR, 'use');
            this.emit(OPCODES.CALL, 2);
            for (const name of imports) {
                this.emit(OPCODES.DUP);
                this.emit(OPCODES.GET_FIELD, name);
                this.emit(OPCODES.STORE_VAR, name);
            }
            this.emit(OPCODES.POP);
        } else {
            const idx = this.addConstant(moduleName);
            this.emit(OPCODES.LOAD_CONST, idx);
            this.emit(OPCODES.LOAD_VAR, 'use');
            this.emit(OPCODES.CALL, 1);
            this.emit(OPCODES.STORE_VAR, varName || moduleName);
        }
    }

    compileFiberExpr(node) {
        // Compile the fiber body as a block
        const compiler = new Compiler([node.body]);
        const fnInfo = {
            instructions: compiler.instructions,
            constants: compiler.constants,
        };
        // We'll create a constant that holds the fiber info (like we do for functions)
        const idx = this.addConstant(fnInfo);
        // Emit a FIBER opcode (we need to define it in OPCODES) that takes the constant index
        this.emit(OPCODES.FIBER, idx);
    }

    compileYieldExpr(node) {
        this.compileNode(node.value);
        this.emit(OPCODES.FIBER_YIELD);
    }

    compileTrait(node) {
        const traitInfo = {
            name: node.name,
            methods: node.methods.map(m => ({
                name: m.name,
                params: m.params.map(p => p.name),
                returnType: m.returnType,
            })),
        };
        const idx = this.addConstant(traitInfo);
        this.emit(OPCODES.LOAD_CONST, idx);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileImpl(node) {
        for (const method of node.methods) {
            const compiler = new Compiler([]);
            for (const stmt of method.body.statements) {
                compiler.compileNode(stmt);
            }
            const methodInfo = {
                name: method.name,
                traitName: node.traitName,
                typeName: node.typeName,
                params: method.params.map(p => p.name),
                instructions: compiler.instructions,
                constants: compiler.constants,
                returnType: method.returnType,
            };
            // Register each method with the trait registry
            const idx = this.addConstant(methodInfo);
            this.emit(OPCODES.LOAD_CONST, idx);
            this.emit(OPCODES.LOAD_VAR, 'trait_register');
            this.emit(OPCODES.CALL, 1);
            this.emit(OPCODES.POP);
        }
    }

    compileExternFn(node) {
        const externInfo = {
            name: node.name,
            nativeName: node.nativeName || node.name,
            lang: node.lang || 'js',
            params: node.params.map(p => p.name),
            returnType: node.returnType,
        };
        const idx = this.addConstant(externInfo);
        this.emit(OPCODES.LOAD_CONST, idx);
        this.emit(OPCODES.LOAD_VAR, 'extern_loader');
        this.emit(OPCODES.CALL, 1);
        this.emit(OPCODES.STORE_VAR, node.name);
    }

    compileExport(node) {
        // Export is handled at the module level by the module loader.
        // At the compiler level, exports expose the variable to the module scope.
        this.emit(OPCODES.LOAD_VAR, node.name);
    }

}
module.exports = { Compiler, OPCODES };