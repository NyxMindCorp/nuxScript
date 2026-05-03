/**
 * nuxScript Custom Operators
 * New operators que outras linguagens não têm
 */

// Operator definitions
const customOperators = {
    // pipelines
    '|>': { 
        name: 'pipe', 
        assoc: 'left', 
        prec: 10,
        fn: (left, right) => right(left) 
    },
    '>>': { 
        name: 'compose', 
        assoc: 'left', 
        prec: 5,
        fn: (f, g) => (...args) => g(f(...args)) 
    },
    '<<': { 
        name: 'compose_back', 
        assoc: 'right', 
        prec: 5,
        fn: (f, g) => (...args) => f(g(...args)) 
    },
    
    // regex
    '~/r': { 
        name: 'regex_match', 
        assoc: 'left', 
        prec: 20,
        fn: (str, pattern) => pattern.test(str) 
    },
    '~': { 
        name: 'contains', 
        assoc: 'left', 
        prec: 20,
        fn: (container, item) => container.includes(item) 
    },
    
    // null-safe
    '?.': { 
        name: 'null_safe_member', 
        assoc: 'left', 
        prec: 50,
        fn: (obj, prop) => obj == null ? null : obj[prop] 
    },
    '??': { 
        name: 'coalesce', 
        assoc: 'left', 
        prec: 5,
        fn: (a, b) => a ?? b 
    },
    
    // comparison
    '<=>': { 
        name: 'spaceship', 
        assoc: 'left', 
        prec: 15,
        fn: (a, b) => a < b ? -1 : a > b ? 1 : 0 
    },
    '==': { 
        name: 'equals', 
        assoc: 'left', 
        prec: 15,
        fn: (a, b) => JSON.stringify(a) === JSON.stringify(b) 
    },
    '!=': { 
        name: 'not_equals', 
        assoc: 'left', 
        prec: 15,
        fn: (a, b) => JSON.stringify(a) !== JSON.stringify(b) 
    },
    
    // logical
    'and': { 
        name: 'and', 
        assoc: 'left', 
        prec: 8,
        fn: (a, b) => a && b 
    },
    'or': { 
        name: 'or', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => a || b 
    },
    'xor': { 
        name: 'xor', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => (a && !b) || (!a && b) 
    },
    'nor': { 
        name: 'nor', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => !a && !b 
    },
    'nand': { 
        name: 'nand', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => !(a && b) 
    },
    
    // bitwise
    '&': { 
        name: 'bitand', 
        assoc: 'left', 
        prec: 20,
        fn: (a, b) => a & b 
    },
    '|': { 
        name: 'bitor', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => a | b 
    },
    '^': { 
        name: 'bitxor', 
        assoc: 'left', 
        prec: 6,
        fn: (a, b) => a ^ b 
    },
    '<<': { 
        name: 'lshift', 
        assoc: 'left', 
        prec: 25,
        fn: (a, b) => a << b 
    },
    '>>': { 
        name: 'rshift', 
        assoc: 'left', 
        prec: 25,
        fn: (a, b) => a >> b 
    },
    '>>>': { 
        name: 'urshift', 
        assoc: 'left', 
        prec: 25,
        fn: (a, b) => a >>> b 
    },
    
    // assignment
    '+=:': { 
        name: 'add_assign', 
        assoc: 'right', 
        prec: 3,
        fn: (a, b) => a + b 
    },
    '-=:': { 
        name: 'sub_assign', 
        assoc: 'right', 
        prec: 3,
        fn: (a, b) => a - b 
    },
    '*=:': { 
        name: 'mul_assign', 
        assoc: 'right', 
        prec: 3,
        fn: (a, b) => a * b 
    },
    '/=:': { 
        name: 'div_assign', 
        assoc: 'right', 
        prec: 3,
        fn: (a, b) => a / b 
    },
    '?=': { 
        name: 'null_assign', 
        assoc: 'right', 
        prec: 3,
        fn: (a, b) => a ?? b 
    },
    
    // range
    '..': { 
        name: 'range_inclusive', 
        assoc: 'left', 
        prec: 30,
        fn: (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i) 
    },
    '..<': { 
        name: 'range_exclusive', 
        assoc: 'left', 
        prec: 30,
        fn: (a, b) => Array.from({ length: b - a }, (_, i) => a + i) 
    },
    
    // membership
    'in': { 
        name: 'in', 
        assoc: 'left', 
        prec: 20,
        fn: (item, container) => container.includes(item) 
    },
    '!in': { 
        name: 'not_in', 
        assoc: 'left', 
        prec: 20,
        fn: (item, container) => !container.includes(item) 
    },
    'has': { 
        name: 'has', 
        assoc: 'left', 
        prec: 20,
        fn: (container, key) => container.has(key) 
    },
    
    // string
    '++': { 
        name: 'concat', 
        assoc: 'right', 
        prec: 25,
        fn: (a, b) => a + b 
    },
    '**': { 
        name: 'repeat', 
        assoc: 'right', 
        prec: 30,
        fn: (s, n) => s.repeat(n) 
    },
    
    // application
    '@': { 
        name: 'apply', 
        assoc: 'left', 
        prec: 50,
        fn: (fn, arg) => fn(arg) 
    },
    
    // function composition operators
    '>>=': { 
        name: 'bind', 
        assoc: 'left', 
        prec: 5,
        fn: (m, f) => m.andThen(f) 
    },
    '=<<': { 
        name: 'bind_left', 
        assoc: 'right', 
        prec: 5,
        fn: (f, m) => m.andThen(f) 
    },
    
    // lift
    '<$>': { 
        name: 'fmap', 
        assoc: 'left', 
        prec: 10,
        fn: (fn, container) => container.map(fn) 
    },
    '<*>': { 
        name: 'ap', 
        assoc: 'left', 
        prec: 10,
        fn: (fnContainer, valContainer) => fnContainer.ap(valContainer) 
    },
};

// Operator evaluation
function evalOperator(op, left, right) {
    const def = customOperators[op];
    if (!def) {
        throw new Error(`Unknown operator: ${op}`);
    }
    return def.fn(left, right);
}

// Check if operator exists
function hasOperator(op) {
    return op in customOperators;
}

// Get operator definition
function getOperator(op) {
    return customOperators[op];
}

// List all operators
function listOperators() {
    return Object.keys(customOperators);
}

// Add custom operator
function defineOperator(op, fn, options = {}) {
    customOperators[op] = {
        name: options.name || op,
        assoc: options.assoc || 'left',
        prec: options.prec || 20,
        fn
    };
}

// Operator precedence
const precedence = {
    '??': 5,
    'or': 6,
    'xor': 6,
    'nor': 6,
    'nand': 6,
    'and': 8,
    '|': 6,
    '^': 6,
    '==': 15,
    '!=': 15,
    '<=>': 15,
    '<': 20,
    '>': 20,
    '<=': 20,
    '>=': 20,
    '<<': 25,
    '>>': 25,
    '>>>': 25,
    '+': 25,
    '-': 25,
    '*': 30,
    '/': 30,
    '%': 30,
    '**': 30,
    '..': 30,
    '..<': 30,
    '?.': 50,
    '?.': 50,
    '@': 50,
    '|>': 10,
    '>>': 5,
    '<<': 5,
    '>>=': 5,
    '=<<': 5,
    '<$>': 10,
    '<*>': 10,
};

// Operators built-ins
const operatorBuiltins = {
    // Eval operators
    eval_op: (op, left, right) => evalOperator(op, left, right),
    has_op: (op) => hasOperator(op),
    get_op: (op) => getOperator(op),
    list_ops: () => listOperators(),
    def_op: (op, fn, opts) => defineOperator(op, fn, opts),
    
    // Operator checks
    is_pipe_op: (op) => op === '|>',
    is_compose_op: (op) => op === '>>' || op === '<<',
    is_null_safe_op: (op) => op === '?.' || op === '??',
    is_range_op: (op) => op === '..' || op === '..<',
    is_bitwise_op: (op) => ['&', '|', '^', '<<', '>>', '>>>'].includes(op),
    is_logical_op: (op) => ['and', 'or', 'xor', 'nor', 'nand'].includes(op),
    
    // Precedence
    prec: (op) => precedence[op] || 20,
    
    // Shorthand operators
    pipe: (val, fns) => fns.reduce((v, f) => f(v), val),
    compose: (...fns) => (...args) => fns.reduce((r, f) => f(r), args[0]),
    
    // null-safe helpers
    null_safe: (obj, prop) => obj == null ? null : obj[prop],
    coalesce: (a, b) => a ?? b,
    
    // range helpers
    range: (start, end, inclusive = true) => 
        inclusive ? Array.from({ length: end - start + 1 }, (_, i) => start + i)
              : Array.from({ length: end - start }, (_, i) => start + i),
    
    // spaceship
    cmp: (a, b) => a < b ? -1 : a > b ? 1 : 0,
};

module.exports = { 
    customOperators,
    evalOperator,
    hasOperator,
    getOperator,
    listOperators,
    defineOperator,
    precedence,
    operatorBuiltins 
};