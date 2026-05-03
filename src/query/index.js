/**
 * nuxScript Query System
 * SQL-like queries para dados
 */

class QuerySystem {
    constructor(data) {
        this.data = Array.isArray(data) ? data : [data];
    }

    static from(data) {
        return new QuerySystem(data);
    }

    select(...fields) {
        if (fields.length === 0 || (fields.length === 1 && fields[0] === '*')) {
            return this.data.map(item => ({ ...item }));
        }
        
        return this.data.map(item => {
            const result = {};
            for (const field of fields) {
                if (typeof field === 'string') {
                    result[field] = item[field];
                } else if (typeof field === 'function') {
                    const key = field.name || 'computed';
                    result[key] = field(item);
                }
            }
            return result;
        });
    }

    where(condition) {
        const filtered = this.data.filter(item => {
            if (typeof condition === 'function') {
                return condition(item);
            }
            if (typeof condition === 'object') {
                return Object.entries(condition).every(([key, value]) => item[key] === value);
            }
            return true;
        });
        return new QuerySystem(filtered);
    }

    orderBy(field, direction = 'asc') {
        const sorted = [...this.data].sort((a, b) => {
            const aVal = typeof field === 'function' ? field(a) : a[field];
            const bVal = typeof field === 'function' ? field(b) : b[field];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return new QuerySystem(sorted);
    }

    groupBy(field) {
        const groups = {};
        
        for (const item of this.data) {
            const key = typeof field === 'function' ? field(item) : item[field];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        }
        
        return Object.entries(groups).map(([key, items]) => ({
            key,
            items,
            count: items.length,
        }));
    }

    having(condition) {
        const groups = this.groupBy('id');
        const filtered = groups.filter(condition);
        return new QuerySystem(filtered);
    }

    join(other, on, type = 'inner') {
        const left = this.data;
        const right = Array.isArray(other) ? other : [other];
        
        const result = [];
        
        for (const l of left) {
            for (const r of right) {
                const match = on(l, r);
                if (match) {
                    result.push({ ...l, ...r });
                } else if (type === 'left') {
                    result.push({ ...l, ...right[0] });
                }
            }
        }
        
        return new QuerySystem(result);
    }

    limit(count) {
        return new QuerySystem(this.data.slice(0, count));
    }

    offset(start) {
        return new QuerySystem(this.data.slice(start));
    }

    take(count) {
        return new QuerySystem(this.data.slice(0, count));
    }

    skip(count) {
        return new QuerySystem(this.data.slice(count));
    }

    distinct() {
        const seen = new Set();
        const unique = this.data.filter(item => {
            const key = JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return new QuerySystem(unique);
    }

    count() {
        return this.data.length;
    }

    sum(field) {
        return this.data.reduce((acc, item) => acc + (item[field] || 0), 0);
    }

    avg(field) {
        if (this.data.length === 0) return 0;
        return this.sum(field) / this.data.length;
    }

    min(field) {
        if (this.data.length === 0) return null;
        return Math.min(...this.data.map(item => item[field]));
    }

    max(field) {
        if (this.data.length === 0) return null;
        return Math.max(...this.data.map(item => item[field]));
    }

    first() {
        return this.data[0] || null;
    }

    last() {
        return this.data[this.data.length - 1] || null;
    }

    pluck(field) {
        return this.data.map(item => item[field]);
    }

    flatten() {
        const flat = [];
        for (const item of this.data) {
            if (Array.isArray(item)) {
                flat.push(...item);
            } else {
                flat.push(item);
            }
        }
        return new QuerySystem(flat);
    }

    union(other) {
        return new QuerySystem([...this.data, ...other]);
    }

    intersect(other) {
        const otherSet = new Set(other.map(JSON.stringify));
        return new QuerySystem(this.data.filter(item => otherSet.has(JSON.stringify(item))));
    }

    diff(other) {
        const otherSet = new Set(other.map(JSON.stringify));
        return new QuerySystem(this.data.filter(item => !otherSet.has(JSON.stringify(item))));
    }

    toArray() {
        return this.data;
    }

    toJSON() {
        return JSON.stringify(this.data, null, 2);
    }
}

// Query operators for nuxScript
const queryBuiltins = {
    // Main query function
    select: (data, ...fields) => QuerySystem.from(data).select(...fields),
    
    // Where clause
    where: (data, condition) => QuerySystem.from(data).where(condition),
    
    // Order by
    orderBy: (data, field, direction) => QuerySystem.from(data).orderBy(field, direction),
    
    // Group by
    groupBy: (data, field) => QuerySystem.from(data).groupBy(field),
    
    // Join
    join: (left, right, on, type) => QuerySystem.from(left).join(right, on, type),
    
    // Aggregates
    count: (data) => QuerySystem.from(data).count(),
    sum: (data, field) => QuerySystem.from(data).sum(field),
    avg: (data, field) => QuerySystem.from(data).avg(field),
    min: (data, field) => QuerySystem.from(data).min(field),
    max: (data, field) => QuerySystem.from(data).max(field),
    
    // Array operations
    pluck: (data, field) => QuerySystem.from(data).pluck(field),
    flatten: (data) => QuerySystem.from(data).flatten(),
    distinct: (data) => QuerySystem.from(data).distinct(),
    
    // Set operations
    union: (a, b) => QuerySystem.from(a).union(b),
    intersect: (a, b) => QuerySystem.from(a).intersect(b),
    diff: (a, b) => QuerySystem.from(a).diff(b),
    
    // Pagination
    limit: (data, n) => QuerySystem.from(data).limit(n),
    take: (data, n) => QuerySystem.from(data).take(n),
    skip: (data, n) => QuerySystem.from(data).skip(n),
    offset: (data, n) => QuerySystem.from(data).offset(n),
};

module.exports = { QuerySystem, queryBuiltins };