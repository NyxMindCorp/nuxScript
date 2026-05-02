/**
 * nuxScript Type Checker
 * Performs type inference and type checking
 */

const {
    NODE_TYPES,
    NumberLiteral,
    StringLiteral,
    BooleanLiteral,
    NullLiteral,
    ListLiteral,
    MapLiteral,
    Identifier,
    LetDeclaration,
    FnDeclaration,
    StructDeclaration,
    Property,
    EnumDeclaration,
    EnumVariant,
    BinaryExpr,
    UnaryExpr,
    CallExpr,
    IndexExpr,
    MemberExpr,
    PipeExpr,
    MatchExpr,
    IfExpr,
    ForExpr,
    WhileExpr,
    Block,
    LambdaExpr,
    ReturnStatement,
    TypeAnnotation,
    ResultType,
    OptionType,
    ListType,
} = require('../ast/nodes');

// Primitive type names
const PrimitiveTypes = new Set(['Int', 'String', 'Bool', 'Float', 'Nil', 'Any']);

// Built-in type definitions
const builtinTypes = {
    Option: {
        kind: 'generic',
        params: ['T'],
        variants: [
            { name: 'Some', fields: ['T'] },
            { name: 'None', fields: [] },
        ],
    },
    Result: {
        kind: 'generic',
        params: ['T', 'E'],
        variants: [
            { name: 'Ok', fields: ['T'] },
            { name: 'Err', fields: ['E'] },
        ],
    },
    List: {
        kind: 'generic',
        params: ['T'],
        isBuiltin: true,
    },
    Map: {
        kind: 'generic',
        params: ['K', 'V'],
        isBuiltin: true,
    },
};

class TypeError extends Error {
    constructor(message, node) {
        super(message);
        this.node = node;
        this.name = 'TypeError';
    }
}

class TypeEnvironment {
    constructor(parent = null) {
        this.parent = parent;
        this.types = new Map();       // type definitions (structs, enums)
        this.variables = new Map();   // variable types
        this.functions = new Map();   // function signatures
        this.typeParams = new Map();  // generic type parameters
    }

    // Create child scope (for function bodies, blocks)
    createChild() {
        return new TypeEnvironment(this);
    }

    // Declare a type
    declareType(name, definition) {
        this.types.set(name, definition);
    }

    // Get a type definition
    getType(name) {
        return this.types.get(name) || (this.parent && this.parent.getType(name));
    }

    // Check if type exists
    hasType(name) {
        return this.types.has(name) || PrimitiveTypes.has(name) ||
               builtinTypes[name] || (this.parent && this.parent.hasType(name));
    }

    // Declare a variable type
    declareVar(name, type) {
        this.variables.set(name, type);
    }

    // Get a variable type
    getVar(name) {
        return this.variables.get(name) || (this.parent && this.parent.getVar(name));
    }

    // Set a variable type (mutation)
    setVar(name, type) {
        if (this.variables.has(name)) {
            this.variables.set(name, type);
        } else if (this.parent) {
            this.parent.setVar(name, type);
        } else {
            this.variables.set(name, type);
        }
    }

    // Declare a type parameter (generic)
    declareTypeParam(name, param) {
        this.typeParams.set(name, param);
    }

    // Get a type parameter
    getTypeParam(name) {
        return this.typeParams.get(name) || (this.parent && this.parent.getTypeParam(name));
    }

    // Declare function signature
    declareFn(name, signature) {
        this.functions.set(name, signature);
    }

    // Get function signature
    getFn(name) {
        return this.functions.get(name) || (this.parent && this.parent.getFn(name));
    }
}

class Type {
    constructor(name, generics = {}) {
        this.name = name;
        this.generics = generics; // { paramName: Type }
    }

    toString() {
        if (Object.keys(this.generics).length > 0) {
            const args = Object.values(this.generics).map(g =>
                typeof g === 'object' ? g.toString() : g
            ).join(', ');
            return `${this.name}<${args}>`;
        }
        return this.name;
    }

    equals(other) {
        if (!(other instanceof Type)) return false;
        if (this.name !== other.name) return false;
        if (Object.keys(this.generics).length !== Object.keys(other.generics).length) {
            return false;
        }
        for (const [key, val] of Object.entries(this.generics)) {
            if (!val.equals(other.generics[key])) return false;
        }
        return true;
    }

    // Check if this type is a subtype of other
    isSubtypeOf(other) {
        if (this.equals(other)) return true;
        if (other.name === 'Any') return true;
        // Nil is subtype of optional types
        if (this.name === 'Nil' && other.name.startsWith('Option')) return true;
        return false;
    }
}

class GenericType extends Type {
    constructor(paramName) {
        super(paramName, {});
        this.paramName = paramName;
        this.isGeneric = true;
    }

    equals(other) {
        if (other instanceof GenericType) {
            return this.paramName === other.paramName;
        }
        return false;
    }

    toString() {
        return `T<${this.paramName}>`;
    }
}

class TypeChecker {
    constructor(ast) {
        this.ast = ast;
        this.env = new TypeEnvironment();
        this.errors = [];
        this.warnings = [];
        this.setupBuiltins();
    }

    setupBuiltins() {
        // Declare primitive types
        for (const t of PrimitiveTypes) {
            this.env.declareType(t, { kind: 'primitive', name: t });
        }

        // Declare built-in generic types
        for (const [name, def] of Object.entries(builtinTypes)) {
            this.env.declareType(name, def);
        }

        // Built-in functions with signatures
        this.env.declareFn('print', {
            params: [{ name: 'value', type: new Type('Any') }],
            returnType: new Type('Nil'),
        });
        this.env.declareFn('len', {
            params: [{ name: 'a', type: new Type('Any') }],
            returnType: new Type('Int'),
        });
        this.env.declareFn('push', {
            params: [
                { name: 'arr', type: new Type('List', { T: new GenericType('T') }) },
                { name: 'val', type: new GenericType('T') },
            ],
            returnType: new Type('List', { T: new GenericType('T') }),
        });
        this.env.declareFn('pop', {
            params: [{ name: 'arr', type: new Type('List', { T: new GenericType('T') }) }],
            returnType: new GenericType('T'),
        });
        this.env.declareFn('range', {
            params: [{ name: 'n', type: new Type('Int') }],
            returnType: new Type('List', { T: new Type('Int') }),
        });
    }

    check() {
        // First pass: declare all types (structs, enums, functions)
        this.firstPass();

        // Second pass: check types
        this.secondPass();

        if (this.errors.length > 0) {
            return { success: false, errors: this.errors, warnings: this.warnings };
        }
        return { success: true, errors: [], warnings: this.warnings };
    }

    firstPass() {
        for (const node of this.ast) {
            if (node.type === NODE_TYPES.STRUCT) {
                this.declareStruct(node);
            } else if (node.type === NODE_TYPES.ENUM) {
                this.declareEnum(node);
            } else if (node.type === NODE_TYPES.FN) {
                this.declareFn(node);
            }
        }
    }

    declareStruct(node) {
        const properties = {};
        for (const prop of node.properties) {
            const type = this.resolveType(prop.typeAnnotation);
            properties[prop.name] = type;
        }
        this.env.declareType(node.name, {
            kind: 'struct',
            name: node.name,
            properties,
        });
    }

    declareEnum(node) {
        const variants = node.variants.map(v => ({
            name: v.name,
            fields: v.fields.map(f => ({
                name: f.name,
                type: this.resolveType(f.typeAnnotation),
            })),
        }));
        this.env.declareType(node.name, {
            kind: 'enum',
            name: node.name,
            variants,
        });
    }

    declareFn(node) {
        const paramTypes = node.params.map(p => ({
            name: p.name,
            type: p.typeAnnotation ? this.resolveType(p.typeAnnotation) : new Type('Any'),
        }));
        const returnType = node.returnType
            ? this.resolveType(node.returnType)
            : new Type('Any');

        this.env.declareFn(node.name, {
            name: node.name,
            params: paramTypes,
            returnType,
        });

        // Also declare as variable for first-class functions
        this.env.declareVar(node.name, new Type('Function'));
    }

    resolveType(typeNode) {
        if (!typeNode) return new Type('Any');

        if (typeNode instanceof TypeAnnotation) {
            const name = typeNode.typeName;

            // Handle generic types
            if (typeNode.generics && typeNode.generics.length > 0) {
                const generics = {};
                for (const g of typeNode.generics) {
                    const resolved = this.resolveType(g);
                    generics[resolved.name] = resolved;
                }

                // Check if it's a builtin generic
                if (builtinTypes[name]) {
                    // Map params to their actual types
                    const params = builtinTypes[name].params;
                    const mapped = {};
                    params.forEach((p, i) => {
                        if (typeNode.generics[i]) {
                            mapped[p] = this.resolveType(typeNode.generics[i]);
                        }
                    });
                    return new Type(name, mapped);
                }
                return new Type(name, generics);
            }

            return new Type(name);
        }

        if (typeNode instanceof OptionType) {
            const inner = this.resolveType(typeNode.innerType);
            return new Type('Option', { T: inner });
        }

        if (typeNode instanceof ResultType) {
            const ok = this.resolveType(typeNode.okType);
            const err = this.resolveType(typeNode.errType);
            return new Type('Result', { T: ok, E: err });
        }

        if (typeNode instanceof ListType) {
            const inner = this.resolveType(typeNode.innerType);
            return new Type('List', { T: inner });
        }

        return new Type('Any');
    }

    secondPass() {
        for (const node of this.ast) {
            this.checkNode(node);
        }
    }

    checkNode(node) {
        switch (node.type) {
            case NODE_TYPES.LET:
                return this.checkLet(node);
            case NODE_TYPES.VAR:
                return this.checkVar(node);
            case NODE_TYPES.CONST:
                return this.checkConst(node);
            case NODE_TYPES.FN:
                return this.checkFn(node);
            case NODE_TYPES.STRUCT:
                // Already declared, check body
                return this.checkStruct(node);
            case NODE_TYPES.ENUM:
                // Already declared, nothing to check
                return new Type('Nil');
            case NODE_TYPES.IF:
                return this.checkIf(node);
            case NODE_TYPES.FOR:
                return this.checkFor(node);
            case NODE_TYPES.WHILE:
                return this.checkWhile(node);
            case NODE_TYPES.MATCH:
                return this.checkMatch(node);
            case NODE_TYPES.BLOCK:
                return this.checkBlock(node);
            case NODE_TYPES.RETURN:
                return this.checkReturn(node);
            default:
                return this.inferType(node);
        }
    }

    checkLet(node) {
        const valueType = this.inferType(node.value);

        if (node.typeAnnotation) {
            const declaredType = this.resolveType(node.typeAnnotation);
            if (!valueType.isSubtypeOf(declaredType)) {
                this.errors.push(new TypeError(
                    `Type '${valueType.toString()}' is not assignable to '${declaredType.toString()}'`,
                    node
                ));
            }
            this.env.declareVar(node.name, declaredType);
        } else {
            this.env.declareVar(node.name, valueType);
        }

        return valueType;
    }

    checkVar(node) {
        const valueType = this.inferType(node.value);
        this.env.declareVar(node.name, valueType);
        return valueType;
    }

    checkConst(node) {
        const valueType = this.inferType(node.value);
        this.env.declareVar(node.name, valueType);
        return valueType;
    }

    checkFn(node) {
        // Create child env for function
        const childEnv = this.env.createChild();

        // Bind parameters
        const paramTypes = [];
        for (const param of node.params) {
            const type = param.typeAnnotation
                ? this.resolveType(param.typeAnnotation)
                : new Type('Any');
            childEnv.declareVar(param.name, type);
            paramTypes.push(type);
        }

        // Check return type
        const returnType = node.returnType
            ? this.resolveType(node.returnType)
            : new Type('Any');

        // Save current env and switch to function's env
        const prevEnv = this.env;
        this.env = childEnv;

        // Check body
        const bodyType = this.checkBlock(node.body);

        // Restore env
        this.env = prevEnv;

        // Validate return type
        if (!bodyType.isSubtypeOf(returnType) && returnType.name !== 'Any') {
            this.errors.push(new TypeError(
                `Function '${node.name}' returns '${bodyType.toString()}' but declared '${returnType.toString()}'`,
                node
            ));
        }

        return returnType;
    }

    checkStruct(node) {
        // Check all property types
        const structType = this.env.getType(node.name);
        for (const prop of node.properties) {
            this.inferType(prop.typeAnnotation);
        }
        return new Type(node.name);
    }

    checkIf(node) {
        const condType = this.inferType(node.condition);
        if (condType.name !== 'Bool' && condType.name !== 'Any') {
            this.errors.push(new TypeError(
                `Condition must be Bool, got '${condType.toString()}'`,
                node.condition
            ));
        }

        const thenType = this.checkBlock(node.consequent);

        let elseType = new Type('Nil');
        if (node.alternate) {
            elseType = this.checkNode(node.alternate);
        }

        // Unify then and else types (common supertype)
        return this.unifyTypes(thenType, elseType);
    }

    checkFor(node) {
        const iterableType = this.inferType(node.iterable);

        // Iterable should be List
        if (iterableType.name !== 'List') {
            this.errors.push(new TypeError(
                `Iterable must be List, got '${iterableType.toString()}'`,
                node.iterable
            ));
        }

        // Element type from List[T]
        const elemType = iterableType.generics?.T || new Type('Any');

        const childEnv = this.env.createChild();
        childEnv.declareVar(node.variable, elemType);

        const prevEnv = this.env;
        this.env = childEnv;
        this.checkBlock(node.body);
        this.env = prevEnv;

        return new Type('Nil');
    }

    checkWhile(node) {
        const condType = this.inferType(node.condition);
        if (condType.name !== 'Bool' && condType.name !== 'Any') {
            this.errors.push(new TypeError(
                `Condition must be Bool, got '${condType.toString()}'`,
                node.condition
            ));
        }

        this.checkBlock(node.body);
        return new Type('Nil');
    }

    checkMatch(node) {
        const subjectType = this.inferType(node.subject);
        let resultType = new Type('Nil');

        for (const c of node.cases) {
            const caseType = this.inferType(c.body);
            resultType = this.unifyTypes(resultType, caseType);
        }

        return resultType;
    }

    checkBlock(node) {
        let lastType = new Type('Nil');
        const childEnv = this.env.createChild();
        const prevEnv = this.env;
        this.env = childEnv;

        for (const stmt of node.statements) {
            lastType = this.checkNode(stmt);
        }

        this.env = prevEnv;
        return lastType;
    }

    checkReturn(node) {
        if (node.value) {
            return this.inferType(node.value);
        }
        return new Type('Nil');
    }

    // Type inference
    inferType(node) {
        if (!node) return new Type('Any');

        switch (node.type) {
            case NODE_TYPES.NUMBER:
                return new Type('Int');
            case NODE_TYPES.STRING:
                return new Type('String');
            case NODE_TYPES.BOOLEAN:
                return new Type('Bool');
            case NODE_TYPES.NULL:
                return new Type('Nil');
            case NODE_TYPES.LIST: {
                const elemTypes = node.elements.map(e => this.inferType(e));
                const unified = elemTypes.length > 0
                    ? elemTypes.reduce((a, b) => this.unifyTypes(a, b))
                    : new Type('Any');
                return new Type('List', { T: unified });
            }
            case NODE_TYPES.MAP:
                return new Type('Map');
            case NODE_TYPES.IDENTIFIER:
                return this.inferIdentifier(node);
            case NODE_TYPES.BINARY:
                return this.inferBinary(node);
            case NODE_TYPES.UNARY:
                return this.inferUnary(node);
            case NODE_TYPES.CALL:
                return this.inferCall(node);
            case NODE_TYPES.INDEX:
                return this.inferIndex(node);
            case NODE_TYPES.MEMBER:
                return this.inferMember(node);
            case NODE_TYPES.PIPE:
                return this.inferPipe(node);
            case NODE_TYPES.IF:
                return this.checkIf(node);
            case NODE_TYPES.FOR:
                return this.checkFor(node);
            case NODE_TYPES.MATCH:
                return this.checkMatch(node);
            case NODE_TYPES.LAMBDA: {
                const paramTypes = node.params.map(p =>
                    p.typeAnnotation ? this.resolveType(p.typeAnnotation) : new Type('Any')
                );
                const bodyType = node.body ? this.inferType(node.body) : new Type('Any');
                return new Type('Function');
            }
            case NODE_TYPES.BLOCK:
                return this.checkBlock(node);
            default:
                return new Type('Any');
        }
    }

    inferIdentifier(node) {
        const type = this.env.getVar(node.name);
        if (type) return type;

        // Check if it's a type constructor (Ok, Err, Some, None)
        if (node.name === 'Ok') return new Type('Result');
        if (node.name === 'Err') return new Type('Result');
        if (node.name === 'Some') return new Type('Option');
        if (node.name === 'None') return new Type('Option');

        // Check function
        const fn = this.env.getFn(node.name);
        if (fn) return new Type('Function');

        this.warnings.push(new TypeError(
            `Unknown identifier '${node.name}'`,
            node
        ));
        return new Type('Any');
    }

    inferBinary(node) {
        const leftType = this.inferType(node.left);
        const rightType = this.inferType(node.right);

        // Arithmetic operators -> Int (or Float)
        if (['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
            if (leftType.name === 'Float' || rightType.name === 'Float') {
                return new Type('Float');
            }
            return new Type('Int');
        }

        // Comparison operators -> Bool
        if (['==', '!=', '<', '>', '<=', '>=', '===', '!=='].includes(node.operator)) {
            return new Type('Bool');
        }

        // Logical operators
        if (['and', 'or', '&&', '||'].includes(node.operator)) {
            return new Type('Bool');
        }

        // String concatenation
        if (node.operator === '+' && (leftType.name === 'String' || rightType.name === 'String')) {
            return new Type('String');
        }

        return new Type('Any');
    }

    inferUnary(node) {
        const operandType = this.inferType(node.operand);

        if (node.operator === 'not' || node.operator === '!') {
            return new Type('Bool');
        }
        if (node.operator === '-') {
            return operandType.name === 'Float' ? new Type('Float') : new Type('Int');
        }
        if (node.operator === '?') {
            return new Type('Bool');
        }

        return operandType;
    }

    inferCall(node) {
        const fn = this.env.getFn(node.callee.name);

        if (fn) {
            // Check argument types
            for (let i = 0; i < node.args.length; i++) {
                const argType = this.inferType(node.args[i]);
                if (fn.params[i] && fn.params[i].type.name !== 'Any') {
                    if (!argType.isSubtypeOf(fn.params[i].type)) {
                        this.errors.push(new TypeError(
                            `Argument ${i + 1} of '${node.callee.name}' should be '${fn.params[i].type.toString()}', got '${argType.toString()}'`,
                            node.args[i]
                        ));
                    }
                }
            }
            return fn.returnType;
        }

        // Built-in functions
        if (['print', 'len', 'push', 'pop', 'range', 'assert', 'error'].includes(node.callee.name)) {
            switch (node.callee.name) {
                case 'print': return new Type('Nil');
                case 'len': return new Type('Int');
                case 'push': {
                    const listType = this.inferType(node.args[0]);
                    return listType;
                }
                case 'pop': {
                    const listType = this.inferType(node.args[0]);
                    return listType.generics?.T || new Type('Any');
                }
                case 'range': return new Type('List', { T: new Type('Int') });
                case 'assert': return new Type('Bool');
                case 'error': return new Type('Nil');
            }
        }

        // Unknown function
        return new Type('Any');
    }

    inferIndex(node) {
        const objType = this.inferType(node.object);

        if (objType.name === 'List') {
            return objType.generics?.T || new Type('Any');
        }
        if (objType.name === 'Map') {
            return objType.generics?.V || new Type('Any');
        }
        if (objType.name === 'String') {
            return new Type('String');
        }

        return new Type('Any');
    }

    inferMember(node) {
        const objType = this.inferType(node.object);

        // Check struct type
        const typeDef = this.env.getType(objType.name);
        if (typeDef && typeDef.kind === 'struct') {
            const propType = typeDef.properties[node.property];
            if (propType) return propType;
        }

        return new Type('Any');
    }

    inferPipe(node) {
        // Pipe: left |> right
        // right is called with left as first argument
        const leftType = this.inferType(node.left);
        const rightType = this.inferType(node.right);

        // For now, assume it returns Any
        return new Type('Any');
    }

    // Unify two types into their common supertype
    unifyTypes(a, b) {
        if (a.equals(b)) return a;
        if (a.name === 'Any') return b;
        if (b.name === 'Any') return a;
        if (a.name === 'Nil') return b;
        if (b.name === 'Nil') return a;
        if (a.name === 'Int' && b.name === 'Float') return new Type('Float');
        if (a.name === 'Float' && b.name === 'Int') return new Type('Float');
        return new Type('Any');
    }
}

function checkTypes(ast) {
    const checker = new TypeChecker(ast);
    return checker.check();
}

module.exports = { TypeChecker, TypeEnvironment, Type, TypeError, checkTypes };
