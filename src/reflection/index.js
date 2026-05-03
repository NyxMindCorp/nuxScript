/**
 * nuxScript Reflection System
 * Provides introspecção de tipos, funções, structs e enums em runtime
 */

class ReflectionBuiltin {
    static reflect(target) {
        if (typeof target === 'function') {
            return this.reflectFn(target);
        } else if (typeof target === 'object' && target !== null) {
            if (target.__struct__) {
                return this.reflectStruct(target);
            } else if (target.__variant__) {
                return this.reflectEnum(target);
            } else if (target.__enum__) {
                return this.reflectEnumDef(target);
            }
            return this.reflectObject(target);
        }
        return { type: typeof target, value: target };
    }

    static reflectFn(fn) {
        const info = {
            type: 'function',
            name: fn.name || 'anonymous',
            params: fn.params || [],
            arity: fn.params ? fn.params.length : 0,
        };
        
        if (fn.return_type) {
            info.returnType = fn.return_type;
        }
        if (fn.source) {
            info.source = fn.source;
            info.line = fn.line || null;
        }
        if (fn.meta) {
            info.meta = fn.meta;
        }
        
        return info;
    }

    static reflectStruct(instance) {
        const structName = instance.__struct__;
        const fields = {};
        
        for (const key of Object.keys(instance)) {
            if (key !== '__struct__') {
                fields[key] = {
                    value: instance[key],
                    type: typeof instance[key],
                };
            }
        }
        
        return {
            type: 'struct',
            name: structName,
            fields,
            instanceOf: structName,
        };
    }

    static reflectEnum(variant) {
        return {
            type: 'enum',
            variant: variant.__variant__,
            value: variant.value,
        };
    }

    static reflectEnumDef(enumDef) {
        if (!enumDef.__enum__) {
            return { error: 'Not an enum definition' };
        }
        
        const variants = {};
        for (const v of enumDef.variants || []) {
            variants[v.name] = {
                name: v.name,
                arity: v.arity,
                hasPayload: v.arity > 0,
            };
        }
        
        return {
            type: 'enum_definition',
            name: enumDef.name,
            variants,
        };
    }

    static reflectObject(obj) {
        const keys = Object.keys(obj);
        const properties = {};
        
        for (const key of keys) {
            properties[key] = {
                value: obj[key],
                type: typeof obj[key],
                writable: Object.getOwnPropertyDescriptor(obj, key)?.writable || false,
                enumerable: Object.getOwnPropertyDescriptor(obj, key)?.enumerable || false,
            };
        }
        
        return {
            type: 'object',
            properties,
            keys,
            size: keys.length,
        };
    }

    static getType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'list';
        if (typeof value === 'object') {
            if (value.__struct__) return 'struct';
            if (value.__variant__) return 'enum';
            if (value.__enum__) return 'enum_definition';
            return 'object';
        }
        return typeof value;
    }

    static typeOf(value) {
        return this.getType(value);
    }

    static isType(value, expectedType) {
        return this.getType(value) === expectedType;
    }

    static getMetadata(fn) {
        if (typeof fn === 'function' && fn.meta) {
            return fn.meta;
        }
        return null;
    }

    static setMetadata(fn, meta) {
        if (typeof fn === 'function') {
            fn.meta = meta;
            return true;
        }
        return false;
    }
}

module.exports = { ReflectionBuiltin };