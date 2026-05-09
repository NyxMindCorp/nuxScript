/**
 * nuxScript Virtual Machine
 * Executes nuxScript bytecode
 */

const { OPCODES } = require('../compiler');
const { ReflectionBuiltin } = require('../reflection');
const { CodeGenerator } = require('../codegen');
const { ExternalParser } = require('../parser/external');
const { regexBuiltins, parseRegexLiteral } = require('../regex');
const { queryBuiltins } = require('../query');
const { concurrencyBuiltins, Actor, Channel, Process, ProcessSystem } = require('../concurrency');
const { metaBuiltins, MacroEngine, ASTManipulator, CompileTime } = require('../meta');
const { dataStructBuiltins, Tuple, Set, Dict, Tree, Heap, Graph } = require('../datastructs');
const { typeSystemBuiltins, TypeProvider, TypeDef, Refinement } = require('../typesys');
const { operatorBuiltins, evalOperator, hasOperator, listOperators, defineOperator } = require('../operators');

const __THROW__ = Symbol('THROW');

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
    Ok: (val) => ({ __variant__: 'Ok', value: val }),
    Err: (val) => ({ __variant__: 'Err', value: val }),
    Some: (val) => ({ __variant__: 'Some', value: val }),
    None: () => ({ __variant__: 'None' }),
    type: (val) => typeof val,
    isOk: (val) => val && val.__variant__ === 'Ok',
    isErr: (val) => val && val.__variant__ === 'Err',
    isSome: (val) => val && val.__variant__ === 'Some',
    isNone: (val) => val && val.__variant__ === 'None',
    // Stdlib namespaces
    math: stdlib_math,
    list: stdlib_list,
    string: stdlib_string,
    map: stdlib_map,
    // Top-level filter for pipe operator
    filter: stdlib_list.filter,
    // IO
    readFile: (path) => require('fs').readFileSync(path, 'utf-8'),
    writeFile: (path, content) => require('fs').writeFileSync(path, content),
    // Fiber support
    fiber_create: (fn, constants) => {
        const vm = new VM({ instructions: fn.instructions, constants: fn.constants });
        return vm;
    },
    resume: (fiberRef) => {
        if (!fiberRef || !fiberRef.__fiber__) {
            throw new Error("Invalid fiber reference");
        }
        const fiber = builtins.fibers.get(fiberRef.__fiber__);
        if (!fiber) {
            throw new Error("Fiber not found");
        }
        const fiberVm = fiber.vm;
        const result = fiberVm.run();
        if (fiberVm.hasYielded) {
            return { status: "running", value: fiberVm.yieldedValue };
        } else {
            return { status: "finished", value: result };
        }
    },
    fibers: new Map(),

    // Reflection functions
    reflect: (target) => ReflectionBuiltin.reflect(target),
    reflect_type: (val) => ReflectionBuiltin.typeOf(val),
    reflect_fn: (fn) => ReflectionBuiltin.reflectFn(fn),
    reflect_struct: (obj) => ReflectionBuiltin.reflectStruct(obj),
    reflect_enum: (variant) => ReflectionBuiltin.reflectEnum(variant),
    get_type: (val) => ReflectionBuiltin.getType(val),
    type_of: (val) => ReflectionBuiltin.typeOf(val),
    is_type: (val, expected) => ReflectionBuiltin.isType(val, expected),
    get_meta: (fn) => ReflectionBuiltin.getMetadata(fn),
    set_meta: (fn, meta) => ReflectionBuiltin.setMetadata(fn, meta),

    // Code generation
    generate: (node) => {
        const cg = new CodeGenerator();
        return cg.generate(node);
    },
    pretty_print: (node) => {
        const cg = new CodeGenerator({ indent: '    ' });
        return cg.prettyPrint(node);
    },
    ast_to_code: (node) => {
        const cg = new CodeGenerator();
        return cg.generate(node);
    },

    // External code parsing
    parse_js: (code) => ExternalParser.parseJS(code),
    tokenize_js: (code) => ExternalParser.prototype.tokenizeJS.call({ tokenizeJS: ExternalParser.prototype.tokenizeJS }, code),
    analyze_js: (code) => {
        const ast = ExternalParser.parseJS(code);
        return {
            ast,
            tokens: [],
            statCount: ast.body ? ast.body.length : 0,
            functions: ast.body ? ast.body.filter(n => n.type === 'FnDeclaration').map(f => f.name) : [],
            classes: ast.body ? ast.body.filter(n => n.type === 'ClassDeclaration').map(c => c.name) : [],
        };
    },

    // AST helpers
    ast_node: (type, props) => ({ type, ...props }),

    // Regex engine
    r: parseRegexLiteral,
    regex_match: regexBuiltins.match,
    regex_test: regexBuiltins.test,
    regex_replace: regexBuiltins.replace,
    regex_split: regexBuiltins.split,
    regex_find_all: regexBuiltins.findAll,
    regex_extract: regexBuiltins.extract,
    regex_compile: regexBuiltins.compile,
    regex_is_valid: regexBuiltins.isValid,
    regex_escape: regexBuiltins.escape,

    // Query system
    select: queryBuiltins.select,
    where: queryBuiltins.where,
    order_by: queryBuiltins.orderBy,
    group_by: queryBuiltins.groupBy,
    join: queryBuiltins.join,
    count: queryBuiltins.count,
    sum: queryBuiltins.sum,
    avg: queryBuiltins.avg,
    min: queryBuiltins.min,
    max: queryBuiltins.max,
    pluck: queryBuiltins.pluck,
    distinct: queryBuiltins.distinct,
    union: queryBuiltins.union,
    intersect: queryBuiltins.intersect,
    diff: queryBuiltins.diff,
    limit: queryBuiltins.limit,
    take: queryBuiltins.take,
    skip: queryBuiltins.skip,
    offset: queryBuiltins.offset,

    // Concurrency (actors, channels)
    actor: concurrencyBuiltins.actor,
    send_to: concurrencyBuiltins.send,
    tell: concurrencyBuiltins.tell,
    ask: concurrencyBuiltins.ask,
    stop_actor: concurrencyBuiltins.stop,
    actors: concurrencyBuiltins.actors,
    actor_of: concurrencyBuiltins.actor_of,
    channel: concurrencyBuiltins.channel,
    channel_buffer: concurrencyBuiltins.channel_buffer,
    receive_from: concurrencyBuiltins.receive_from,
    poll: concurrencyBuiltins.poll,
    select: concurrencyBuiltins.select,
    alts: concurrencyBuiltins.alts,
    spawn: concurrencyBuiltins.spawn,
    kill: concurrencyBuiltins.kill,
    killall: concurrencyBuiltins.killall,
    sleep: concurrencyBuiltins.sleep,
    after: concurrencyBuiltins.after,
    every: concurrencyBuiltins.every,

    // Meta-programming
    macro_define: metaBuiltins.macro_define,
    macro_expand: metaBuiltins.macro_expand,
    macro_eval: metaBuiltins.macro_eval,
    ast_walk: metaBuiltins.ast_walk,
    ast_map: metaBuiltins.ast_map,
    ast_find: metaBuiltins.ast_find,
    ast_clone: metaBuiltins.ast_clone,
    const_eval: metaBuiltins.const_eval,

    // Data structures
    tuple: dataStructBuiltins.tuple,
    tuple_get: dataStructBuiltins.tuple_get,
    tuple_len: dataStructBuiltins.tuple_len,
    tuple_first: dataStructBuiltins.tuple_first,
    tuple_last: dataStructBuiltins.tuple_last,
    tuple_zip: dataStructBuiltins.tuple_zip,
    set: dataStructBuiltins.set,
    set_add: dataStructBuiltins.set_add,
    set_has: dataStructBuiltins.set_has,
    set_union: dataStructBuiltins.set_union,
    set_intersect: dataStructBuiltins.set_intersect,
    dict: dataStructBuiltins.dict,
    dict_get: dataStructBuiltins.dict_get,
    dict_set: dataStructBuiltins.dict_set,
    dict_keys: dataStructBuiltins.dict_keys,
    dict_values: dataStructBuiltins.dict_values,
    tree_leaf: dataStructBuiltins.tree_leaf,
    tree_node: dataStructBuiltins.tree_node,
    tree_map: dataStructBuiltins.tree_map,
    tree_find: dataStructBuiltins.tree_find,
    tree_depth: dataStructBuiltins.tree_depth,
    tree_preorder: dataStructBuiltins.tree_preorder,
    heap_min: dataStructBuiltins.heap_min,
    heap_max: dataStructBuiltins.heap_max,
    heap_push: dataStructBuiltins.heap_push,
    heap_pop: dataStructBuiltins.heap_pop,
    graph: dataStructBuiltins.graph,
    graph_undirected: dataStructBuiltins.graph_undirected,
    graph_add_node: dataStructBuiltins.graph_add_node,
    graph_add_edge: dataStructBuiltins.graph_add_edge,
    graph_bfs: dataStructBuiltins.graph_bfs,
    graph_dfs: dataStructBuiltins.graph_dfs,

    // Type system
    typeof: typeSystemBuiltins.type_of,
    type_of: typeSystemBuiltins.type_of,
    is_type: typeSystemBuiltins.is_type,
    struct_type: typeSystemBuiltins.struct_type,
    enum_type: typeSystemBuiltins.enum_type,
    union_type: typeSystemBuiltins.union_type,
    optional_type: typeSystemBuiltins.optional_type,
    result_type: typeSystemBuiltins.result_type,
    brand: typeSystemBuiltins.brand,
    newtype: (name, base) => typeSystemBuiltins.newtype(name, base),
    opaque: (name) => typeSystemBuiltins.opaque_type(name),
    // Refinements
    pos: typeSystemBuiltins.pos,
    neg: typeSystemBuiltins.neg,
    nonzero: typeSystemBuiltins.nonzero,
    non_empty: typeSystemBuiltins.non_empty,
    email: typeSystemBuiltins.email,
    uuid: typeSystemBuiltins.uuid,
    url: typeSystemBuiltins.url,
    in_range: typeSystemBuiltins.in_range,

    // Custom operators
    eval_op: (op, left, right) => evalOperator(op, left, right),
    has_op: (op) => hasOperator(op),
    list_ops: () => listOperators(),
    def_op: (op, fn, opts) => defineOperator(op, fn, opts),
    pipe: operatorBuiltins.pipe,
    compose: operatorBuiltins.compose,
    null_safe: operatorBuiltins.null_safe,
    coalesce: operatorBuiltins.coalesce,
    range_op: operatorBuiltins.range,
    cmp: operatorBuiltins.cmp,
    // Package Loader (Package Manager)
    pkg_install: (name, version = "latest") => {
      const { install } = require('../package');
      return install(name, version);
    },
    pkg_list: () => {
      const { list } = require('../package');
      return list();
    },
    pkg_remove: (name) => {
      const { remove } = require('../package');
      return remove(name);
    },
};

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
        this.hasYielded = false;
        this.yieldedValue = null;
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

            case OPCODES.STORE_VAR: {
                const val = this.stack.pop();
                this.variables.set(operand, val);
                break;
            }

            case OPCODES.ADD: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a + b);
                break;
            }
            case OPCODES.SUB: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a - b);
                break;
            }
            case OPCODES.MUL: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a * b);
                break;
            }
            case OPCODES.DIV: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                if (b === 0) throw new Error('Division by zero');
                this.stack.push(a / b);
                break;
            }
            case OPCODES.MOD: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a % b);
                break;
            }
            case OPCODES.POW: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(Math.pow(a, b));
                break;
            }
            case OPCODES.NEG: {
                const a = this.stack.pop();
                this.stack.push(-a);
                break;
            }

            case OPCODES.EQ: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a === b);
                break;
            }
            case OPCODES.NEQ: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a !== b);
                break;
            }
            case OPCODES.LT: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a < b);
                break;
            }
            case OPCODES.GT: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a > b);
                break;
            }
            case OPCODES.LTE: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a <= b);
                break;
            }
            case OPCODES.GTE: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a >= b);
                break;
            }

            case OPCODES.AND: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a && b);
                break;
            }
            case OPCODES.OR: {
                const b = this.stack.pop();
                const a = this.stack.pop();
                this.stack.push(a || b);
                break;
            }
            case OPCODES.NOT: {
                const a = this.stack.pop();
                this.stack.push(!a);
                break;
            }

            case OPCODES.JUMP: {
                this.pc = operand - 1;
                break;
            }
            case OPCODES.JUMP_IF_FALSE: {
                const cond = this.stack.pop();
                if (!cond) {
                    this.pc = operand - 1;
                }
                break;
            }
            case OPCODES.JUMP_IF_TRUE: {
                const cond = this.stack.pop();
                if (cond) {
                    this.pc = operand - 1;
                }
                break;
            }

            case OPCODES.PM_JUMP_IF_FALSE: {
                const cond = this.stack.pop();
                if (!cond) {
                    this.pc = operand - 1;
                }
                break;
            }

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
                    } else {
                        this.stack.push(result);
                    }
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
            }

            case OPCODES.RETURN: {
                this.running = false;
                break;
            }

            case OPCODES.MAKE_FUNCTION: {
                const fnInfo = this.constants[operand];
                this.stack.push(fnInfo);
                break;
            }

            case OPCODES.MAKE_LIST: {
                const items = [];
                for (let i = 0; i < operand; i++) {
                    items.unshift(this.stack.pop());
                }
                this.stack.push(items);
                break;
            }

            case OPCODES.MAKE_MAP: {
                const pairs = {};
                for (let i = 0; i < operand; i++) {
                    const value = this.stack.pop();
                    const key = this.stack.pop();
                    pairs[key] = value;
                }
                this.stack.push(pairs);
                break;
            }

            case OPCODES.MAKE_STRUCT: {
                const structInfo = this.constants[operand];
                const instance = {};
                for (let i = structInfo.properties.length - 1; i >= 0; i--) {
                    instance[structInfo.properties[i].name] = this.stack.pop();
                }
                instance.__struct__ = structInfo.name;
                this.stack.push(instance);
                break;
            }

            case OPCODES.MAKE_ENUM: {
                const enumInfo = this.constants[operand];
                this.stack.push(enumInfo);
                break;
            }

            case OPCODES.GET_FIELD: {
                const obj = this.stack.pop();
                if (obj == null) throw new Error(`Cannot get field '${operand}' of null`);
                this.stack.push(obj[operand]);
                break;
            }

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
            }

            case OPCODES.PIPE: {
                break;
            }

            case OPCODES.NULL:
                this.stack.push(null);
                break;

            case OPCODES.IS_NULL: {
                const a = this.stack.pop();
                this.stack.push(a === null || a === undefined);
                break;
            }

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
            }

            case OPCODES.LOOP_START:
                this.loopStack.push(this.pc);
                break;

            case OPCODES.LOOP_ITERATE: {
                const index = this.stack.pop();
                const list = this.stack.pop();
                if (Array.isArray(list) && index < list.length) {
                    this.stack.push(list[index]);
                    this.stack.push(index + 1);
                    this.stack.push(true);
                } else {
                    this.stack.push(null);
                    this.stack.push(index);
                    this.stack.push(false);
                }
                break;
            }

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
            }

            case OPCODES.SPAWN: {
                const fiberInfo = this.constants[operand];
                const fiberId = fiberInfo.id;
                const fiberVm = new VM({
                    instructions: fiberInfo.body.instructions,
                    constants: fiberInfo.body.constants || fiberInfo.constants,
                }, this);
                fiberVm.variables = new Map(this.variables);
                this.fibers.set(fiberId, {
                    vm: fiberVm,
                    status: 'running',
                });
                this.stack.push({ __fiber__: fiberId, vm: fiberVm });
                break;
            }

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
            }

            case OPCODES.PUSH: {
                const arr = this.stack.pop();
                const item = this.stack.pop();
                if (Array.isArray(arr)) {
                    arr.push(item);
                }
                this.stack.push(arr);
                break;
            }

            case OPCODES.MAKE_STRING: {
                const parts = [];
                for (let i = 0; i < operand; i++) {
                    parts.unshift(this.stack.pop());
                }
                this.stack.push(parts.join(''));
                break;
            }

            case OPCODES.FIBER_YIELD: {
                const value = this.stack.pop();
                this.hasYielded = true;
                this.yieldedValue = value;
                this.running = false;
                break;
            }
            case OPCODES.FIBER: {
                const fiberInfo = this.constants[operand];
                const fiberId = ++this.fiberIdCounter;
                const fiberVm = new VM({
                    instructions: fiberInfo.instructions,
                    constants: fiberInfo.constants || fiberInfo.body?.constants,
                }, this);
                fiberVm.variables = new Map(this.variables);
                this.fibers.set(fiberId, { vm: fiberVm, status: 'created' });
                this.stack.push({ __fiber__: fiberId, vm: fiberVm });
                break;
            }
            default:
                throw new Error(`Unknown opcode: ${opcode}`);
        }
    }
}

module.exports = { VM, builtins, __THROW__ };