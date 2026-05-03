/**
 * nuxScript Advanced Type System
 * Type providers, refinement, brand, newtypes
 */

class TypeProvider {
    static from(value) {
        if (value === null) return TypeProvider.of('null');
        if (value === undefined) return TypeProvider.of('undefined');
        if (typeof value === 'number') return TypeProvider.of('number');
        if (typeof value === 'string') return TypeProvider.of('string');
        if (typeof value === 'boolean') return TypeProvider.of('boolean');
        if (typeof value === 'function') return TypeProvider.of('function');
        if (Array.isArray(value)) return TypeProvider.of('array');
        if (value instanceof Date) return TypeProvider.of('date');
        if (value instanceof RegExp) return TypeProvider.of('regexp');
        if (value instanceof Error) return TypeProvider.of('error');
        
        // Check for custom types
        if (value.__struct__) return TypeProvider.struct(value.__struct__);
        if (value.__variant__) return TypeProvider.enum(value.__variant__);
        
        return TypeProvider.of('object');
    }

    static of(typeName) {
        return new TypeDef(typeName);
    }

    static struct(name) {
        return new TypeDef('struct', { name });
    }

    static enum(name) {
        return new TypeDef('enum', { name });
    }

    static union(...types) {
        return new TypeDef('union', { types });
    }

    static intersection(...types) {
        return new TypeDef('intersection', { types });
    }

    static arrayOf(type) {
        return new TypeDef('array', { elementType: type });
    }

    static mapOf(keyType, valueType) {
        return new TypeDef('map', { keyType, valueType });
    }

    static func(params, returnType) {
        return new TypeDef('function', { params, returnType });
    }

    static optional(type) {
        return new TypeDef('option', { type });
    }

    static result(okType, errType) {
        return new TypeDef('result', { okType, errType });
    }

    staticbrand(name) {
        return new TypeDef('brand', { name });
    }

    static newtype(name, baseType) {
        return new TypeDef('newtype', { name, baseType });
    }

    static opaque(name) {
        return new TypeDef('opaque', { name });
    }
}

class TypeDef {
    constructor(kind, props = {}) {
        this.kind = kind;
        this.props = props;
    }

    get name() {
        switch (this.kind) {
            case 'struct': return this.props.name;
            case 'enum': return this.props.name;
            case 'union': return this.props.types.map(t => t.name).join(' | ');
            case 'intersection': return this.props.types.map(t => t.name).join(' & ');
            case 'array': return `${this.props.elementType.name}[]`;
            case 'map': return `Map<${this.props.keyType.name}, ${this.props.valueType.name}>`;
            case 'function': return `fn(...) -> ${this.props.returnType?.name}`;
            case 'option': return `?${this.props.type.name}`;
            case 'result': return `Result<${this.props.okType.name}, ${this.props.errType.name}>`;
            case 'brand': return `Branded<${this.props.name}>`;
            case 'newtype': return `${this.props.name}[${this.props.baseType.name}]`;
            case 'opaque': return `Opaque<${this.props.name}>`;
            default: return this.kind;
        }
    }

    check(value) {
        switch (this.kind) {
            case 'null': return value === null;
            case 'undefined': return value === undefined;
            case 'number': return typeof value === 'number';
            case 'string': return typeof value === 'string';
            case 'boolean': return typeof value === 'boolean';
            case 'function': return typeof value === 'function';
            case 'array': return Array.isArray(value);
            case 'object': return typeof value === 'object' && value !== null;
            case 'any': return true;
            
            case 'struct':
                return value.__struct__ === this.props.name;
            
            case 'enum':
                return value.__variant__ !== undefined;
            
            case 'union':
                return this.props.types.some(t => t.check(value));
            
            case 'intersection':
                return this.props.types.every(t => t.check(value));
            
            case 'array':
                if (!Array.isArray(value)) return false;
                return value.every(v => this.props.elementType.check(v));
            
            case 'map':
                if (typeof value !== 'object') return false;
                return Object.entries(value).every(([k, v]) => 
                    this.props.keyType.check(k) && this.props.valueType.check(v)
                );
            
            case 'function':
                if (typeof value !== 'function') return false;
                // Check params count
                return true;
            
            case 'option':
                return value === null || value === undefined || this.props.type.check(value);
            
            case 'result':
                if (!value || !value.__variant__) return false;
                if (value.__variant__ === 'Ok') return this.props.okType.check(value.value);
                if (value.__variant__ === 'Err') return this.props.errType.check(value.value);
                return false;
            
            case 'brand':
                return value.__brand__ === this.props.name;
            
            case 'newtype':
                return this.props.baseType.check(value.value);
            
            case 'opaque':
                return value.__opaque__ === this.props.name;
            
            default:
                return true;
        }
    }

    assert(value) {
        if (!this.check(value)) {
            throw new TypeError(`Expected ${this.name}, got ${typeof value}`);
        }
        return true;
    }

    satisfies(value) {
        return this.check(value);
    }

    isSupertypeOf(other) {
        // Structural subtyping
        return true;
    }

    isSubtypeOf(other) {
        return other.isSupertypeOf(this);
    }

    equals(other) {
        return this.name === other.name;
    }
}

class TypeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TypeError';
    }
}

// Refinement types
class Refinement {
    static from(type, predicate, errorMsg) {
        return {
            type,
            predicate,
            errorMsg,
            check(value) {
                if (!this.type.check(value)) return false;
                return this.predicate(value);
            },
            assert(value) {
                if (!this.check(value)) {
                    throw new TypeError(this.errorMsg || `Refinement failed for ${this.type.name}`);
                }
                return value;
            }
        };
    }

    static positive() {
        return Refinement.from(TypeProvider.of('number'), n => n > 0, 'Expected positive number');
    }

    static negative() {
        return Refinement.from(TypeProvider.of('number'), n => n < 0, 'Expected negative number');
    }

    static nonZero() {
        return Refinement.from(TypeProvider.of('number'), n => n !== 0, 'Expected non-zero number');
    }

    static nonEmpty() {
        return Refinement.from(TypeProvider.of('string'), s => s.length > 0, 'Expected non-empty string');
    }

    static email() {
        return Refinement.from(TypeProvider.of('string'), 
            s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), 
            'Expected valid email'
        );
    }

    static uuid() {
        return Refinement.from(TypeProvider.of('string'),
            s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
            'Expected valid UUID'
        );
    }

    static url() {
        return Refinement.from(TypeProvider.of('string'),
            s => {
                try { new URL(s); return true; } 
                catch { return false; }
            },
            'Expected valid URL'
        );
    }

    static min(n) {
        return Refinement.from(TypeProvider.of('number'), x => x >= n, `Expected >= ${n}`);
    }

    static max(n) {
        return Refinement.from(TypeProvider.of('number'), x => x <= n, `Expected <= ${n}`);
    }

    static length(min, max) {
        return Refinement.from(TypeProvider.of('string'), 
            s => s.length >= min && s.length <= max, 
            `Expected length ${min}-${max}`
        );
    }

    static pattern(regex) {
        return Refinement.from(TypeProvider.of('string'), s => regex.test(s), 'Pattern mismatch');
    }

    static inRange(min, max) {
        return Refinement.from(TypeProvider.of('number'), 
            n => n >= min && n <= max, 
            `Expected ${min}-${max}`
        );
    }
}

// Newtype (branded types)
function newtype(name, baseType) {
    return {
        name,
        baseType,
        wrap(value) {
            if (!baseType.check(value)) {
                throw new TypeError(`Invalid ${name}: ${value}`);
            }
            return { __newtype__: name, value };
        },
        unwrap(wrapped) {
            if (wrapped.__newtype__ !== name) {
                throw new TypeError(`Expected ${name}`);
            }
            return wrapped.value;
        },
        type: TypeProvider.newtype(name, baseType)
    };
}

// Opaque types
function opaque(name) {
    return {
        name,
        type: TypeProvider.opaque(name),
        _value: null,
        wrap(value) {
            this._value = value;
            return { __opaque__: name, _get: () => this._value };
        },
        unwrap(opaque) {
            if (opaque.__opaque__ !== name) {
                throw new TypeError(`Expected opaque ${name}`);
            }
            return opaque._get();
        }
    };
}

// Type system built-ins
const typeSystemBuiltins = {
    // Type providers
    typeof: (val) => TypeProvider.from(val),
    type_of: (val) => TypeProvider.from(val).name,
    is_type: (val, type) => TypeProvider.from(val).name === type,
    
    // Type constructors
    struct_type: (name) => TypeProvider.struct(name),
    enum_type: (name) => TypeProvider.enum(name),
    union_type: (...types) => TypeProvider.union(...types),
    intersection_type: (...types) => TypeProvider.intersection(...types),
    array_of: (type) => TypeProvider.arrayOf(type),
    map_of: (kt, vt) => TypeProvider.mapOf(kt, vt),
    func_type: (params, ret) => TypeProvider.func(params, ret),
    optional_type: (type) => TypeProvider.optional(type),
    result_type: (ok, err) => TypeProvider.result(ok, err),
    brand: (name) => TypeProvider.brand(name),
    newtype: (name, base) => TypeProvider.newtype(name, base),
    opaque_type: (name) => TypeProvider.opaque(name),
    
    // Type checks
    is_struct: (val, name) => val.__struct__ === name,
    is_enum: (val, name) => val.__variant__ !== undefined,
    is_option: (val) => val && (val.__variant__ === 'Some' || val.__variant__ === 'None'),
    is_result: (val) => val && (val.__variant__ === 'Ok' || val.__variant__ === 'Err'),
    
    // Refinements
    pos: () => Refinement.positive(),
    neg: () => Refinement.negative(),
    nonzero: () => Refinement.nonZero(),
    non_empty: () => Refinement.nonEmpty(),
    email: () => Refinement.email(),
    uuid: () => Refinement.uuid(),
    url: () => Refinement.url(),
    min: (n) => Refinement.min(n),
    max: (n) => Refinement.max(n),
    length: (min, max) => Refinement.length(min, max),
    in_range: (min, max) => Refinement.inRange(min, max),
    
    // Newtype/Opaque
    newtype: (name, base) => newtype(name, base),
    opaque: (name) => opaque(name),
    
    // Type assertions
    assert_type: (val, type) => type.assert(val),
    assert_struct: (val, name) => {
        if (val.__struct__ !== name) throw new TypeError(`Expected ${name}`);
        return val;
    },
    
    // Type errors
    type_error: (msg) => new TypeError(msg),
};

module.exports = { 
    TypeProvider, 
    TypeDef, 
    TypeError,
    Refinement,
    newtype,
    opaque,
    typeSystemBuiltins 
};