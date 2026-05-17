/**
 * AST Node Types for nuxScript
 */

const NODE_TYPES = {
    // Literals
    NUMBER: 'NumberLiteral',
    STRING: 'StringLiteral',
    BOOLEAN: 'BooleanLiteral',
    NULL: 'NullLiteral',
    LIST: 'ListLiteral',
    MAP: 'MapLiteral',
    LIST_COMP: 'ListComp',
    TEMPLATE: 'TemplateLiteral',

    // Declarations
    LET: 'LetDeclaration',
    VAR: 'VarDeclaration',
    CONST: 'ConstDeclaration',
    FN: 'FnDeclaration',
    STRUCT: 'StructDeclaration',
    ENUM: 'EnumDeclaration',
    ENUM_VARIANT: 'EnumVariant',
    PARAM: 'Param',
    PROPERTY: 'Property',

    // Expressions
    IDENTIFIER: 'Identifier',
    BINARY: 'BinaryExpr',
    UNARY: 'UnaryExpr',
    CALL: 'CallExpr',
    INDEX: 'IndexExpr',
    MEMBER: 'MemberExpr',
    PIPE: 'PipeExpr',
    MATCH: 'MatchExpr',
    MATCH_CASE: 'MatchCase',
    IF: 'IfExpr',
    FOR: 'ForExpr',
    WHILE: 'WhileExpr',
    BLOCK: 'Block',
    LAMBDA: 'LambdaExpr',

    // Fibers / Concurrency
    SPAWN: 'SpawnExpr',
    AWAIT: 'AwaitExpr',
    FIBER_EXPR: 'FiberExpr',
    YIELD_EXPR: 'YieldExpr',
    FIBER: 'FiberLiteral',

    // Error handling
    TRY: 'TryExpr',
    THROW: 'ThrowExpr',

    // Types
    TYPE_ANNOTATION: 'TypeAnnotation',
    RESULT_TYPE: 'ResultType',
    OPTION_TYPE: 'OptionType',
    LIST_TYPE: 'ListType',
    STRUCT_TYPE: 'StructType',

    // Pattern matching
    PATTERN: 'Pattern',
    PATTERN_LITERAL: 'PatternLiteral',
    PATTERN_IDENT: 'PatternIdent',
    PATTERN_WILDCARD: 'PatternWildcard',
    PATTERN_STRUCT: 'PatternStruct',
    PATTERN_ENUM: 'PatternEnum',

    // Import/export
    USE: 'UseStatement',
    MOD: 'ModStatement',

    // Control flow
    RETURN: 'ReturnStatement',
    BREAK: 'BreakStatement',
    CONTINUE: 'ContinueStatement',
    YIELD: 'YieldStatement',
    EXPORT: 'ExportStatement',
    IMPORT: 'ImportStatement',

    // Traits
    TRAIT: 'TraitDeclaration',
    IMPL: 'ImplDeclaration',
    TRAIT_METHOD: 'TraitMethod',

    // FFI
    EXTERN: 'ExternDeclaration',
    EXTERN_FN: 'ExternFn',

    // New additions
    NAMED_ARG: 'NamedArg',
    STRUCT_INSTANTIATION: 'StructInstantiation',

    // AST Metadata / Reflection (new)
    AST_META: 'ASTMeta',
    QUOTE: 'QuoteExpr',
    UNQUOTE: 'UnquoteExpr',
    REFLECT: 'ReflectExpr',
    SPREAD: 'SpreadElement',
};

class ASTNode {
    constructor(type, props = {}) {
        this.type = type;
        Object.assign(this, props);
    }
}

class NumberLiteral extends ASTNode {
    constructor(value, raw) {
        super(NODE_TYPES.NUMBER, { value, raw });
    }
}

class StringLiteral extends ASTNode {
    constructor(value, raw) {
        super(NODE_TYPES.STRING, { value, raw });
    }
}

class BooleanLiteral extends ASTNode {
    constructor(value) {
        super(NODE_TYPES.BOOLEAN, { value });
    }
}

class NullLiteral extends ASTNode {
    constructor() {
        super(NODE_TYPES.NULL, {});
    }
}

class ListLiteral extends ASTNode {
    constructor(elements) {
        super(NODE_TYPES.LIST, { elements });
    }
}

class MapLiteral extends ASTNode {
    constructor(pairs) {
        super(NODE_TYPES.MAP, { pairs });
    }
}

// List comprehension: [expr for item in list if condition]
class ListComp extends ASTNode {
    constructor(element, variable, iterable, filter) {
        super(NODE_TYPES.LIST_COMP, { element, variable, iterable, filter });
    }
}

// Template literal with interpolation
class TemplateLiteral extends ASTNode {
    constructor(parts) {
        super(NODE_TYPES.TEMPLATE, { parts });
        // parts is array of { type: 'str'|'expr', value: string|Expr }
    }
}

class Identifier extends ASTNode {
    constructor(name) {
        super(NODE_TYPES.IDENTIFIER, { name });
    }
}

class LetDeclaration extends ASTNode {
    constructor(name, value, mutable = false, typeAnnotation = null) {
        super(NODE_TYPES.LET, { name, value, mutable, typeAnnotation });
    }
}

class VarDeclaration extends ASTNode {
    constructor(name, value) {
        super(NODE_TYPES.VAR, { name, value });
    }
}

class ConstDeclaration extends ASTNode {
    constructor(name, value) {
        super(NODE_TYPES.CONST, { name, value });
    }
}

class Param extends ASTNode {
    constructor(name, typeAnnotation = null, defaultValue = null) {
        super(NODE_TYPES.PARAM, { name, typeAnnotation, defaultValue });
    }
}

class FnDeclaration extends ASTNode {
    constructor(name, params, body, returnType = null, isPub = false) {
        super(NODE_TYPES.FN, { name, params, body, returnType, isPub });
    }
}

class StructDeclaration extends ASTNode {
    constructor(name, properties, isPub = false) {
        super(NODE_TYPES.STRUCT, { name, properties, isPub });
    }
}

class Property extends ASTNode {
    constructor(name, typeAnnotation, isPub = true) {
        super(NODE_TYPES.PROPERTY, { name, typeAnnotation, isPub });
    }
}

class EnumVariant extends ASTNode {
    constructor(name, fields = []) {
        super(NODE_TYPES.ENUM_VARIANT, { name, fields });
    }
}

class EnumDeclaration extends ASTNode {
    constructor(name, variants, isPub = false) {
        super(NODE_TYPES.ENUM, { name, variants, isPub });
    }
}

class BinaryExpr extends ASTNode {
    constructor(left, operator, right) {
        super(NODE_TYPES.BINARY, { left, operator, right });
    }
}

class UnaryExpr extends ASTNode {
    constructor(operator, operand) {
        super(NODE_TYPES.UNARY, { operator, operand });
    }
}

class CallExpr extends ASTNode {
    constructor(callee, args) {
        super(NODE_TYPES.CALL, { callee, args });
    }
}

class IndexExpr extends ASTNode {
    constructor(object, index) {
        super(NODE_TYPES.INDEX, { object, index });
    }
}

class MemberExpr extends ASTNode {
    constructor(object, property, computed = false) {
        super(NODE_TYPES.MEMBER, { object, property, computed });
    }
}

class PipeExpr extends ASTNode {
    constructor(left, right) {
        super(NODE_TYPES.PIPE, { left, right });
    }
}

class Pattern extends ASTNode {
    constructor(type, value, guard = null) {
        super(NODE_TYPES.PATTERN, { type, value, guard });
    }
}

class MatchCase extends ASTNode {
    constructor(pattern, guard, body) {
        super(NODE_TYPES.MATCH_CASE, { pattern, guard, body });
    }
}

class MatchExpr extends ASTNode {
    constructor(subject, cases) {
        super(NODE_TYPES.MATCH, { subject, cases });
    }
}

class IfExpr extends ASTNode {
    constructor(condition, consequent, alternate) {
        super(NODE_TYPES.IF, { condition, consequent, alternate });
    }
}

class ForExpr extends ASTNode {
    constructor(variable, iterable, body) {
        super(NODE_TYPES.FOR, { variable, iterable, body });
    }
}

class WhileExpr extends ASTNode {
    constructor(condition, body) {
        super(NODE_TYPES.WHILE, { condition, body });
    }
}

class Block extends ASTNode {
    constructor(statements) {
        super(NODE_TYPES.BLOCK, { statements });
    }
}

class LambdaExpr extends ASTNode {
    constructor(params, body) {
        super(NODE_TYPES.LAMBDA, { params, body });
    }
}

// Fiber: spawn { body }
class SpawnExpr extends ASTNode {
    constructor(body) {
        super(NODE_TYPES.SPAWN, { body });
    }
}

// Await: await fiber
class AwaitExpr extends ASTNode {
    constructor(fiber) {
        super(NODE_TYPES.AWAIT, { fiber });
    }
}

// Fiber object reference
class FiberLiteral extends ASTNode {
    constructor(id) {
        super(NODE_TYPES.FIBER, { id });
    }
}

class TryExpr extends ASTNode {
    constructor(body, catchClause) {
        super(NODE_TYPES.TRY, { body, catchClause });
    }
}

class ThrowExpr extends ASTNode {
    constructor(arg) {
        super(NODE_TYPES.THROW, { arg });
    }
}

class ReturnStatement extends ASTNode {
    constructor(value) {
        super(NODE_TYPES.RETURN, { value });
    }
}

class BreakStatement extends ASTNode {
    constructor() {
        super(NODE_TYPES.BREAK, {});
    }
}

class ContinueStatement extends ASTNode {
    constructor() {
        super(NODE_TYPES.CONTINUE, {});
    }
}

class TypeAnnotation extends ASTNode {
    constructor(typeName, generics = []) {
        super(NODE_TYPES.TYPE_ANNOTATION, { typeName, generics });
    }
}

class ResultType extends ASTNode {
    constructor(okType, errType) {
        super(NODE_TYPES.RESULT_TYPE, { okType, errType });
    }
}

class OptionType extends ASTNode {
    constructor(innerType) {
        super(NODE_TYPES.OPTION_TYPE, { innerType });
    }
}

class ListType extends ASTNode {
    constructor(innerType) {
        super(NODE_TYPES.LIST_TYPE, { innerType });
    }
}

class StructType extends ASTNode {
    constructor(name, fields) {
        super(NODE_TYPES.STRUCT_TYPE, { name, fields });
    }
}

class UseStatement extends ASTNode {
    constructor(path, imports = []) {
        super(NODE_TYPES.USE, { path, imports });
    }
}

class ModStatement extends ASTNode {
    constructor(name, body) {
        super(NODE_TYPES.MOD, { name, body });
    }
}

// New classes
class NamedArg extends ASTNode {
    constructor(name, value) {
        super(NODE_TYPES.NAMED_ARG, { name, value });
    }
}

class StructInstantiation extends ASTNode {
    constructor(name, args) {
        super(NODE_TYPES.STRUCT_INSTANTIATION, { name, args });
    }
}

class ExportStatement extends ASTNode {
    constructor(name, value) {
        super(NODE_TYPES.EXPORT, { name, value });
    }
}

class ImportStatement extends ASTNode {
    constructor(source, names) {
        super(NODE_TYPES.IMPORT, { source, names });
    }
}


class FiberExpr extends ASTNode {
    constructor(body) {
        super(NODE_TYPES.FIBER_EXPR, { body });
    }
}

class YieldExpr extends ASTNode {
    constructor(value) {
        super(NODE_TYPES.YIELD_EXPR, { value });
    }
}
class TraitDeclaration extends ASTNode {
    constructor(name, methods, isPub = false) {
        super(NODE_TYPES.TRAIT, { name, methods, isPub });
    }
}

class TraitMethod extends ASTNode {
    constructor(name, params, returnType = null) {
        super(NODE_TYPES.TRAIT_METHOD, { name, params, returnType });
    }
}

class ImplDeclaration extends ASTNode {
    constructor(traitName, typeName, methods, isPub = false) {
        super(NODE_TYPES.IMPL, { traitName, typeName, methods, isPub });
    }
}

class ExternDeclaration extends ASTNode {
    constructor(lang, name, returnType = null) {
        super(NODE_TYPES.EXTERN, { lang, name, returnType });
    }
}

class ExternFn extends ASTNode {
    constructor(name, params, returnType, nativeName = null) {
        super(NODE_TYPES.EXTERN_FN, { name, params, returnType, nativeName });
    }
}

module.exports = {
    NODE_TYPES,
    ASTNode,
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
    Param,
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
    TryExpr,
    ThrowExpr,
    ReturnStatement,
    BreakStatement,
    ContinueStatement,
    TypeAnnotation,
    ResultType,
    OptionType,
    ListType,
    StructType,
    UseStatement,
    ModStatement,
    NamedArg,
    StructInstantiation,
    ExportStatement,
    ImportStatement,
    TraitDeclaration,
    TraitMethod,
    ImplDeclaration,
    ExternDeclaration,
    ExternFn,

    // AST Metadata / Reflection (references to classes below)
    ASTMeta: null,
    QuoteExpr: null,
    UnquoteExpr: null,
    ReflectExpr: null,
    SpreadElement: null,
};

class ASTMeta extends ASTNode {
    constructor(line, column, source) {
        super(NODE_TYPES.AST_META, { line, column, source });
    }
}

class QuoteExpr extends ASTNode {
    constructor(quotedNode) {
        super(NODE_TYPES.QUOTE, { quotedNode });
    }
}

class UnquoteExpr extends ASTNode {
    constructor(expr) {
        super(NODE_TYPES.UNQUOTE, { expr });
    }
}

class ReflectExpr extends ASTNode {
    constructor(target, reflectType) {
        super(NODE_TYPES.REFLECT, { target, reflectType });
    }
}

class SpreadElement extends ASTNode {
    constructor(arg) {
        super(NODE_TYPES.SPREAD, { arg });
    }
}