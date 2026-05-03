/**
 * nuxScript Meta-Programming System
 * Macros, AST manipulation, compile-time evaluation
 */

class MacroEngine {
    constructor() {
        this.macros = new Map();
        this.compiling = false;
    }

    define(name, params, body) {
        this.macros.set(name, { params, body, type: 'macro' });
    }

    defineFunction(name, params, returnType, body) {
        this.macros.set(name, { params, body, returnType, type: 'function' });
    }

    get(name) {
        return this.macros.get(name);
    }

    has(name) {
        return this.macros.has(name);
    }

    list() {
        return Array.from(this.macros.keys());
    }

    expand(macroName, args) {
        const macro = this.macros.get(macroName);
        if (!macro) {
            throw new Error(`Macro not found: ${macroName}`);
        }

        if (macro.type === 'macro') {
            return this.expandMacro(macro, args);
        } else {
            return this.expandFunction(macro, args);
        }
    }

    expandMacro(macro, args) {
        let body = macro.body;
        
        // Simple parameter substitution
        for (let i = 0; i < macro.params.length; i++) {
            const param = macro.params[i];
            const arg = args[i];
            body = body.replace(new RegExp('\\$' + param, 'g'), arg);
        }
        
        return body;
    }

    expandFunction(macro, args) {
        // Create parameter bindings
        const scope = {};
        for (let i = 0; i < macro.params.length; i++) {
            scope[macro.params[i].name] = args[i];
        }
        
        return { type: 'expanded', code: macro.body, scope };
    }

    eval(code) {
        return eval(code);
    }

    compile(code) {
        this.compiling = true;
        try {
            return this.transform(code);
        } finally {
            this.compiling = false;
        }
    }

    transform(code) {
        // AST transformation
        return code;
    }
}

// AST Manipulation
class ASTManipulator {
    constructor(ast) {
        this.ast = ast;
    }

    static parse(code) {
        // Simple AST from code
        return { type: 'Program', body: code };
    }

    static build(node) {
        return node;
    }

    static node(type, props = {}) {
        return { type, ...props };
    }

    static identifier(name) {
        return { type: 'Identifier', name };
    }

    static number(value) {
        return { type: 'NumberLiteral', value };
    }

    static string(value) {
        return { type: 'StringLiteral', value };
    }

    static binary(op, left, right) {
        return { type: 'BinaryExpr', op, left, right };
    }

    static unary(op, operand) {
        return { type: 'UnaryExpr', op, operand };
    }

    static call(name, args = []) {
        return { type: 'CallExpr', name, args };
    }

    static lambda(params, body) {
        return { type: 'LambdaExpr', params, body };
    }

    static let(name, value, body) {
        return { type: 'LetDeclaration', name, value, body };
    }

    static fn(name, params, returnType, body) {
        return { type: 'FnDeclaration', name, params, returnType, body };
    }

    static struct(name, properties) {
        return { type: 'StructDeclaration', name, properties };
    }

    static enum(name, variants) {
        return { type: 'EnumDeclaration', name, variants };
    }

    static match(expr, cases) {
        return { type: 'MatchExpr', expr, cases };
    }

    static case(pattern, body) {
        return { type: 'MatchCase', pattern, body };
    }

    static if(condition, then_, else_) {
        return { type: 'IfExpr', condition, thenBranch: then_, elseBranch: else_ };
    }

    static for(variable, iterable, body) {
        return { type: 'ForExpr', variable, iterable, body };
    }

    static while(condition, body) {
        return { type: 'WhileExpr', condition, body };
    }

    static block(statements) {
        return { type: 'Block', statements };
    }

    walk(node, visitor) {
        if (!node || typeof node !== 'object') return;
        
        visitor(node);
        
        for (const key of Object.keys(node)) {
            const value = node[key];
            if (Array.isArray(value)) {
                for (const item of value) {
                    this.walk(item, visitor);
                }
            } else if (value && typeof value === 'object') {
                this.walk(value, visitor);
            }
        }
    }

    map(visitor) {
        return this.mapNode(this.ast, visitor);
    }

    mapNode(node, visitor) {
        if (!node || typeof node !== 'object') return node;
        
        const result = visitor(node) || node;
        
        const mapped = {};
        for (const [key, value] of Object.entries(result)) {
            if (Array.isArray(value)) {
                mapped[key] = value.map(v => this.mapNode(v, visitor));
            } else if (value && typeof value === 'object') {
                mapped[key] = this.mapNode(value, visitor);
            } else {
                mapped[key] = value;
            }
        }
        
        return mapped;
    }

    transform(transformer) {
        return this.map(node => transformer(node));
    }

    filter(predicate) {
        return this.walk(this.ast, predicate);
    }

    find(type) {
        const results = [];
        this.walk(this.ast, node => {
            if (node.type === type) {
                results.push(node);
            }
        });
        return results;
    }

    query(selector) {
        // Simple CSS-like query
        if (selector.type) {
            return this.find(selector.type);
        }
        return [];
    }

    clone() {
        return JSON.parse(JSON.stringify(this.ast));
    }

    equals(other) {
        return JSON.stringify(this.ast) === JSON.stringify(other);
    }
}

// Compile-time evaluation
class CompileTime {
    static evaluate(code, context = {}) {
        // Safely evaluate at compile time
        const fn = new Function(...Object.keys(context), `return (${code})`);
        return fn(...Object.values(context));
    }

    static const(expr) {
        // Evaluate and cache result
        return this.evaluate(expr);
    }

    static inline(value) {
        // Inline constant value
        return { type: 'Constant', value };
    }

    static evalIfConstant(node) {
        if (node.type === 'BinaryExpr') {
            const left = this.evalIfConstant(node.left);
            const right = this.evalIfConstant(node.right);
            
            if (left && right && typeof left === 'number' && typeof right === 'number') {
                switch (node.op) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return left / right;
                    case '%': return left % right;
                    case '**': return Math.pow(left, right);
                }
            }
        }
        
        if (node.type === 'UnaryExpr') {
            const operand = this.evalIfConstant(node.operand);
            
            if (typeof operand === 'number') {
                switch (node.op) {
                    case '-': return -operand;
                    case '+': return +operand;
                }
            }
        }
        
        return null;
    }
}

// Meta-programming built-ins
const metaBuiltins = {
    // Macro operations
    macro_define: (name, params, body) => {
        const macro = new MacroEngine();
        macro.define(name, params, body);
        return macro;
    },
    macro_get: (name) => MacroEngine.get(name),
    macro_has: (name) => MacroEngine.has(name),
    macro_list: () => MacroEngine.list(),
    macro_expand: (name, args) => {
        const macro = new MacroEngine();
        return macro.expand(name, args);
    },
    macro_eval: (code) => {
        const macro = new MacroEngine();
        return macro.compile(code);
    },

    // AST Manipulation
    ast_parse: (code) => ASTManipulator.parse(code),
    ast_build: (node) => ASTManipulator.build(node),
    ast_node: (type, props) => ASTManipulator.node(type, props),

    // Node constructors
    ident: (name) => ASTManipulator.identifier(name),
    num: (value) => ASTManipulator.number(value),
    str: (value) => ASTManipulator.string(value),
    bin: (op, left, right) => ASTManipulator.binary(op, left, right),
    call: (name, args) => ASTManipulator.call(name, args),
    fn: (name, params, body) => ASTManipulator.fn(name, params, null, body),
    struct: (name, props) => ASTManipulator.struct(name, props),
    enum: (name, variants) => ASTManipulator.enum(name, variants),

    // AST traversal
    ast_walk: (ast, visitor) => {
        const am = new ASTManipulator(ast);
        am.walk(ast, visitor);
    },
    ast_map: (ast, fn) => {
        const am = new ASTManipulator(ast);
        return am.map(fn);
    },
    ast_find: (ast, type) => {
        const am = new ASTManipulator(ast);
        return am.find(type);
    },
    ast_clone: (ast) => {
        const am = new ASTManipulator(ast);
        return am.clone();
    },

    // Compile-time
    const_eval: (code) => CompileTime.evaluate(code),
    const_inline: (value) => CompileTime.inline(value),
    ct_eval: (node) => CompileTime.evalIfConstant(node),
};

module.exports = { 
    MacroEngine, 
    ASTManipulator, 
    CompileTime,
    metaBuiltins 
};