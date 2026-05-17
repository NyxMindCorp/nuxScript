/**
 * nuxScript Utilities
 * Helper functions for the nuxScript runtime
 */

function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const cloned = {};
    for (const key of Object.keys(obj)) {
        cloned[key] = deepClone(obj[key]);
    }
    return cloned;
}

function deepEquals(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEquals(a[key], b[key])) return false;
    }
    return true;
}

function formatValue(val, indent = 0) {
    if (val === null) return 'nil';
    if (val === undefined) return 'undefined';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) {
        if (val.length === 0) return '[]';
        const pad = '  '.repeat(indent + 1);
        const items = val.map(v => pad + formatValue(v, indent + 1)).join(',\n');
        return '[\n' + items + '\n' + '  '.repeat(indent) + ']';
    }
    if (typeof val === 'object') {
        if (val.__variant__) return `${val.__variant__}(${formatValue(val.value, indent)})`;
        if (val.__struct__) {
            const pad = '  '.repeat(indent + 1);
            const fields = Object.keys(val)
                .filter(k => !k.startsWith('__'))
                .map(k => pad + k + ': ' + formatValue(val[k], indent + 1))
                .join(',\n');
            return val.__struct__ + '(\n' + fields + '\n' + '  '.repeat(indent) + ')';
        }
        const keys = Object.keys(val);
        if (keys.length === 0) return '{}';
        const pad = '  '.repeat(indent + 1);
        const entries = keys.map(k => pad + k + ': ' + formatValue(val[k], indent + 1)).join(',\n');
        return '{\n' + entries + '\n' + '  '.repeat(indent) + '}';
    }
    if (typeof val === 'function') return `<fn ${val.name || 'anonymous'}>`;
    return String(val);
}

function merge(target, ...sources) {
    for (const source of sources) {
        if (source && typeof source === 'object') {
            for (const key of Object.keys(source)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        target[key] = {};
                    }
                    merge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
    }
    return target;
}

function partial(fn, ...boundArgs) {
    return function(...args) {
        return fn(...boundArgs, ...args);
    };
}

function compose(...fns) {
    return function(x) {
        return fns.reduceRight((acc, fn) => fn(acc), x);
    };
}

function pipe(x, ...fns) {
    return fns.reduce((acc, fn) => fn(acc), x);
}

function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

function tryCatch(fn, handler) {
    try {
        return { success: true, value: fn() };
    } catch (e) {
        return { success: false, error: handler ? handler(e) : e };
    }
}

function match(value, patterns) {
    for (const [pattern, result] of patterns) {
        if (typeof pattern === 'function') {
            if (pattern(value)) return typeof result === 'function' ? result(value) : result;
        } else if (pattern === value) {
            return typeof result === 'function' ? result(value) : result;
        }
    }
    return undefined;
}

module.exports = {
    deepClone,
    deepEquals,
    formatValue,
    merge,
    partial,
    compose,
    pipe: pipe,
    memoize,
    tryCatch,
    match,
};
