/**
 * nuxScript Virtual Machine
 * Executes nuxScript bytecode
 */

const { OPCODES } = require('../compiler');

const __THROW__ = Symbol('THROW');
const __FIBER_DONE__ = Symbol('FIBER_DONE');

// Create namespace objects for stdlib
const stdlib_math = {
    abs: (n) => Math.abs(Number(n)),
    floor: (n) => Math.floor(Number(n)),
    ceil: (n) => Math.ceil(Number(n)),
    round: (n) => Math.round(Number(n)),
    sqrt: (n) => Math.sqrt(Number(n)),
    min: (...args) => Math.min(...args.map(Number)),
    max: (...args) => Math.max(...args.map(Number)),
    pow: (base, exp) => Math.pow(Number(base), Number(exp)),
    random: () => Math.random(),
    trunc: (n) => Math.trunc(Number(n)),
    sin: (n) => Math.sin(Number(n)),
    cos: (n) => Math.cos(Number(n)),
    log: (n) => Math.log(Number(n)),
    exp: (n) => Math.exp(Number(n)),
};

const stdlib_list = {
    length: (l) => Array.isArray(l) ? l.length : 0,
    isEmpty: (l) => Array.isArray(l) ? l.length === 0 : true,
    contains: (l, x) => Array.isArray(l) ? l.includes(x) : false,
    indexOf: (l, x) => Array.isArray(l) ? l.indexOf(x) : -1,
    push: (l, x) => { if (Array.isArray(l)) l.push(x); return l; },
    pop: (l) => Array.isArray(l) ? l.pop() : null,
    shift: (l) => Array.isArray(l) ? l.shift() : null,
    unshift: (l, x) => { if (Array.isArray(l)) l.unshift(x); return l; },
    slice: (l, start, end) => Array.isArray(l) ? l.slice(start, end) : [],
    reverse: (l) => Array.isArray(l) ? [...l].reverse() : [],
    join: (l, sep) => Array.isArray(l) ? l.join(sep === undefined ? ',' : String(sep)) : '',
    sum: (l) => Array.isArray(l) ? l.reduce((a, b) => a + b, 0) : 0,
    product: (l) => Array.isArray(l) ? l.reduce((a, b) => a * b, 1) : 0,
    sort: (l, cmp) => Array.isArray(l) ? (cmp ? [...l].sort(cmp) : [...l].sort()) : [],
    map: (fn) => (l) => Array.isArray(l) ? l.map(fn) : [],
    filter: (fn) => (l) => Array.isArray(l) ? l.filter(fn) : [],
    reduce: (init, fn) => (l) => Array.isArray(l) ? l.reduce(fn, init) : 0,
    find: (l, fn) => Array.isArray(l) ? l.find(fn) : null,
    some: (l, fn) => Array.isArray(l) ? l.some(fn) : false,
    every: (l, fn) => Array.isArray(l) ? l.every(fn) : false,
};

const stdlib_string = {
    length: (s) => String(s).length,
    upper: (s) => String(s).toUpperCase(),
    lower: (s) => String(s).toLowerCase(),
    trim: (s) => String(s).trim(),
    includes: (s, sub) => String(s).includes(String(sub)),
    startsWith: (s, prefix) => String(s).startsWith(String(prefix)),
    endsWith: (s, suffix) => String(s).endsWith(String(suffix)),
    slice: (s, start, end) => String(s).slice(start, end),
    split: (s, sep) => String(s).split(String(sep || '')),
    replace: (s, old, rep) => String(s).replace(String(old), String(rep)),
    concat: (...args) => args.map(a => String(a)).join(''),
    contains: (s, sub) => String(s).includes(String(sub)),
    charAt: (s, i) => String(s).charAt(i),
    charCodeAt: (s, i) => String(s).charCodeAt(i),
    fromCharCode: (n) => String.fromCharCode(n),
    repeat: (s, n) => String(s).repeat(n),
    padStart: (s, n, c) => String(s).padStart(n, c || ' '),
    padEnd: (s, n, c) => String(s).padEnd(n, c || ' '),
};

const stdlib_map = {
    keys: (m) => typeof m === 'object' && m !== null ? Object.keys(m) : [],
    values: (m) => typeof m === 'object' && m !== null ? Object.values(m) : [],
    entries: (m) => typeof m === 'object' && m !== null ? Object.entries(m) : [],
    hasKey: (m, k) => typeof m === 'object' && m !== null ? Object.hasOwn(m, k) : false,
    merge: (a, b) => ({ ...(typeof a === 'object' ? a : {}), ...(typeof b === 'object' ? b : {}) }),
    size: (m) => typeof m === 'object' && m !== null ? Object.keys(m).length : 0,
};

// Built-in functions
const builtins = {
    print: (...args) => { console.log(...args); return null; },
    len: (a) => Array.isArray(a) ? a.length : (typeof a === 'string' ? a.length : (a.length !== undefined ? a.length : 0)),
    push: (arr, val) => { arr.push(val); return arr; },
    pop: (arr) => arr.pop(),
    range: (n) => Array.from({ length: n }, (_, i) => i),
    assert: (cond) => { if (!cond) return __THROW__; return true; },
    error: (msg) => __THROW__,

    // Result type constructors
    Ok: (val) => ({ __variant__: 'Ok', value: val }),
    Err: (val) => ({ __variant__: 'Err', value: val }),

    // Option type constructors
    Some: (val) => ({ __variant__: 'Some', value: val }),
    None: () => ({ __variant__: 'None' }),

        // Stdlib namespaces
        math: stdlib_math,
        list: stdlib_list,
        string: stdlib_string,
        map: stdlib_map,

        // List functions (top-level for pipe operator)
        filter: stdlib_list.filter,
        map: stdlib_list.map,
        reduce: stdlib_list.reduce,

        // Sleep for async/fibers
    sleep: (ms) => new Promise(r => setTimeout(r, ms)),

    // Fiber management
    fiber_create: (fn, constants) => {
        const vm = new VM({ instructions: fn.instructions, constants: fn.constants });
        return vm;
    },
    resume: (fiberRef, optArg = null) => {        if (!fiberRef || !fiberRef.__fiber__) {            throw new Error("Invalid fiber reference");        }        const fiber = this.fibers.get(fiberRef.__fiber__);        if (!fiber) {            throw new Error("Fiber not found");        }        const fiberVm = fiber.vm;        // If an argument is provided, we need to set it as the value of the last yield        // For simplicity, we will push the optArg onto the fiberVm stack and then resume.        // However, our current design does not support passing a value into a yield.        // We will ignore optArg for now and just resume the fiber.        // Run the fiber VM        const result = fiberVm.run();        // Check if the fiber yielded        if (fiberVm.hasYielded) {            // The fiber yielded: return an object indicating it is running with the yielded value            return { status: "running", value: fiberVm.yieldedValue };        } else {            // The fiber finished (or was halted without yielding)            return { status: "finished", value: result };        }    },};
class VM {
    constructor(bytecode, parent = null) {
        this.instructions = bytecode.instructions;
        this.constants = bytecode.constants;
        this.stack = [];
        this.variables = new Map(parent ? parent.variables : Object.entries(builtins));
        this.frames = [];
        this.pc = 0;
        this.running = true;
        this.loopStack = [];
        this.tryStack = [];
        // Fiber suspension state
        this.hasYielded = false;
        this.yieldedValue = null;

        // Fiber state
        this.fibers = new Map();
        this.fiberIdCounter = 0;
        this.parent = parent;
    }

    run() {
        while (this.running && this.pc < this.instructions.length) {
            const instruction = this.instructions[this.pc];
            this.execute(instruction);
            this.pc++;
        }
        if (this.stack.length > 0) {
            return this.stack[this.stack.length - 1];
        }
        return null;
    }

    execute(instruction) {
        const { opcode, operand } = instruction;

        switch (opcode) {
            case OPCODES.HALT:
                this.running = false;
                break;

            case OPCODES.LOAD_CONST:
                this.stack.push(this.constants[operand]);
                break;

            case OPCODES.LOAD_VAR:
                this.stack.push(this.variables.get(operand));
                break;

            case OPCODES.STORE_VAR:
                const val = this.stack.pop();
                this.variables.set(operand, val);
                break;

            case OPCODES.ADD: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a + b);
                break;
            case OPCODES.SUB: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a - b);
                break;
            case OPCODES.MUL: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a * b);
                break;
            case OPCODES.DIV: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                if (b === 0) throw new Error('Division by zero');
                this.stack.push(a / b);
                break;
            case OPCODES.MOD: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a % b);
                break;
            case OPCODES.POW: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(Math.pow(a, b));
                break;
            case OPCODES.NEG: {
                const a = this.stack.pop();
                this.stack.push(-a);
                break;

            case OPCODES.EQ: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a === b);
                break;
            case OPCODES.NEQ: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a !== b);
                break;
            case OPCODES.LT: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a < b);
                break;
            case OPCODES.GT: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a > b);
                break;
            case OPCODES.LTE: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a <= b);
                break;
            case OPCODES.GTE: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a >= b);
                break;

            case OPCODES.AND: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a && b);
                break;
            case OPCODES.OR: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a || b);
                break;
            case OPCODES.NOT: {
                const a = this.stack.pop();
                this.stack.push(!a);
                break;

            case OPCODES.JUMP:
                this.pc = operand - 1;
                break;
            case OPCODES.JUMP_IF_FALSE: {
                const cond = this.stack.pop();
                if (!cond) {
                    this.pc = operand - 1;
                }
                break;
            case OPCODES.JUMP_IF_TRUE: {
                const cond = this.stack.pop();
                if (cond) {
                    this.pc = operand - 1;
                }
                break;

            case OPCODES.PM_JUMP_IF_FALSE: {
                const cond = this.stack.pop();
                if (!cond) {
                    this.pc = operand - 1;
                }
                break;

            case OPCODES.CALL: {
                const argc = operand;
                const fn = this.stack.pop();
                const args = [];
                for (let i = 0; i < argc; i++) {
                    args.unshift(this.stack.pop());
                }

                if (typeof fn === 'function') {
                    const result = fn(...args);
                    if (result === __THROW__) {
                        const msg = args[0] || 'Unknown error';
                        const error = new Error(String(msg));
                        if (this.tryStack.length > 0) {
                            const handler = this.tryStack.pop();
                            this.stack.length = 0;
                            this.stack.push(error);
                            this.pc = handler - 1;
                        } else {
                            this.stack.length = 0;
                            this.stack.push(error);
                            this.running = false;
                        }
                        break;
                    this.stack.push(result);
                } else if (fn && fn.instructions) {
                    const vm = new VM({
                        instructions: fn.instructions,
                        constants: fn.constants,
                    }, this);
                    vm.variables = new Map(this.variables);
                    for (let i = 0; i < fn.params.length; i++) {
                        vm.variables.set(fn.params[i], args[i] || null);
                    }
                    const result = vm.run();
                    this.stack.push(result);
                } else {
                    throw new Error(`Cannot call non-function: ${typeof fn}`);
                }
                break;

            case OPCODES.RETURN: {
                this.running = false;
                break;

            case OPCODES.MAKE_FUNCTION: {
                const fnInfo = this.constants[operand];
                this.stack.push(fnInfo);
                break;

            case OPCODES.MAKE_LIST: {
                const items = [];
                for (let i = 0; i < operand; i++) {
                    items.unshift(this.stack.pop());
                }
                this.stack.push(items);
                break;

            case OPCODES.MAKE_MAP: {
                const pairs = {};
                for (let i = 0; i < operand; i++) {
                    const value = this.stack.pop();
                    const key = this.stack.pop();
                    pairs[key] = value;
                }
                this.stack.push(pairs);
                break;

            case OPCODES.MAKE_STRUCT: {
                const structInfo = this.constants[operand];
                const instance = {};
                for (let i = structInfo.properties.length - 1; i >= 0; i--) {
                    instance[structInfo.properties[i].name] = this.stack.pop();
                }
                instance.__struct__ = structInfo.name;
                this.stack.push(instance);
                break;

            case OPCODES.MAKE_ENUM: {
                const enumInfo = this.constants[operand];
                this.stack.push(enumInfo);
                break;

            case OPCODES.GET_FIELD: {
                const obj = this.stack.pop();
                if (obj == null) throw new Error(`Cannot get field '${operand}' of null`);
                this.stack.push(obj[operand]);
                break;

            case OPCODES.LOAD_SUBSCRIPT: {
                const index = this.stack.pop();
                const obj = this.stack.pop();
                if (Array.isArray(obj)) {
                    this.stack.push(obj[index]);
                } else if (typeof obj === 'string') {
                    this.stack.push(obj[index]);
                } else if (typeof obj === 'object' && obj !== null) {
                    this.stack.push(obj[index]);
                } else {
                    throw new Error(`Cannot subscript ${typeof obj}`);
                }
                break;

            case OPCODES.PIPE: {
                break;

            case OPCODES.NULL:
                this.stack.push(null);
                break;

            case OPCODES.IS_NULL: {
                const a = this.stack.pop();
                this.stack.push(a === null || a === undefined);
                break;

            case OPCODES.DUP:
                this.stack.push(this.stack[this.stack.length - 1]);
                break;

            case OPCODES.POP:
                this.stack.pop();
                break;

            case OPCODES.SWAP: {
                const a = this.stack.pop();
                const b = this.stack.pop();
                this.stack.push(a);
                this.stack.push(b);
                break;

            case OPCODES.LOOP_START:
                this.loopStack.push(this.pc);
                break;

            case OPCODES.LOOP_ITERATE: {
                // Stack: [list, index] (list pushed first, index pushed second, index on top)
                // Pop index first, then list
                const index = this.stack.pop();
                const list = this.stack.pop();
                if (Array.isArray(list) && index < list.length) {
                    this.stack.push(list[index]);
                    this.stack.push(index + 1);
                    this.stack.push(true); // has more
                } else {
                    this.stack.push(null);
                    this.stack.push(index);
                    this.stack.push(false); // no more
                }
                break;

            case OPCODES.LOOP_END:
                this.loopStack.pop();
                break;

            case OPCODES.TRY_START:
                this.tryStack.push(operand);
                break;

            case OPCODES.TRY_END:
                this.tryStack.pop();
                break;

            case OPCODES.CATCH_START:
                break;

            case OPCODES.THROW: {
                const error = this.stack.pop();
                if (this.tryStack.length > 0) {
                    const handler = this.tryStack.pop();
                    this.stack.length = 0;
                    this.stack.push(error);
                    this.pc = handler - 1;
                } else {
                    throw error instanceof Error ? error : new Error(String(error));
                }
                break;

            case OPCODES.SPAWN: {
                // Create a fiber from the compiled body
                const fiberInfo = this.constants[operand];
                const fiberId = fiberInfo.id;

                // Create a new VM for this fiber
                const fiberVm = new VM({
                    instructions: fiberInfo.body.instructions,
                    constants: fiberInfo.body.constants || fiberInfo.constants,
                }, this);

                // Copy current variables to fiber
                fiberVm.variables = new Map(this.variables);

                // Store the fiber
                this.fibers.set(fiberId, {
                    vm: fiberVm,
                    status: 'running',
                });

                // Return fiber reference
                this.stack.push({ __fiber__: fiberId, vm: fiberVm });
                break;

            case OPCODES.AWAIT_FIBER: {
                const fiberRef = this.stack.pop();
                if (fiberRef && fiberRef.__fiber__) {
                    const fiber = this.fibers.get(fiberRef.__fiber__);
                    if (fiber) {
                        const result = fiber.vm.run();
                        this.stack.push(result);
                    } else {
                        this.stack.push(fiberRef.vm ? fiberRef.vm.run() : null);
                    }
                } else {
                    this.stack.push(null);
                }
                break;

            case OPCODES.PUSH: {
                const arr = this.stack.pop();
                const item = this.stack.pop();
                if (Array.isArray(arr)) {
                    arr.push(item);
                }
                this.stack.push(arr);
                break;

            case OPCODES.MAKE_STRING: {
                const parts = [];
                for (let i = 0; i < operand; i++) {
                    parts.unshift(this.stack.pop());
                }
                this.stack.push(parts.join(''));
                break;

            case OPCODES.FIBER_YIELD: {
                const value = this.stack.pop();
                this.hasYielded = true;
                this.yieldedValue = value;
                this.running = false; // suspend the fiber VM
                break;
            case OPCODES.FIBER: {
                const fiberInfo = this.constants[operand];
                const fiberId = ++this.fiberIdCounter;
                const fiberVm = new VM({
                    instructions: fiberInfo.instructions,
                    constants: fiberInfo.constants || fiberInfo.body?.constants,
                }, this);
                // Inherit variables from parent
                fiberVm.variables = new Map(this.variables);
                this.fibers.set(fiberId, { vm: fiberVm, status: 'created' });
                // Push a fiber reference onto the stack
                this.stack.push({ __fiber__: fiberId, vm: fiberVm });
                break;
            default:
                throw new Error(`Unknown opcode: ${opcode}`);
        }
    }
}

module.exports = { VM };
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
}
