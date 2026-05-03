/**
 * nuxScript Exclusive Data Structures
 * Set, Tuple, Dict, Tree, Graph, Heap
 */

class Tuple {
    constructor(...values) {
        this.values = values;
        Object.freeze(this.values);
    }

    get(index) {
        return this.values[index];
    }

    set(index, value) {
        const newValues = [...this.values];
        newValues[index] = value;
        return new Tuple(...newValues);
    }

    length() {
        return this.values.length;
    }

    toArray() {
        return [...this.values];
    }

    map(fn) {
        return new Tuple(...this.values.map(fn));
    }

    filter(fn) {
        return new Tuple(...this.values.filter(fn));
    }

    reduce(fn, init) {
        return this.values.reduce(fn, init);
    }

    find(fn) {
        const index = this.values.findIndex(fn);
        return index >= 0 ? this.values[index] : null;
    }

    findIndex(fn) {
        return this.values.findIndex(fn);
    }

    includes(value) {
        return this.values.includes(value);
    }

    indexOf(value) {
        return this.values.indexOf(value);
    }

    slice(start, end) {
        return new Tuple(...this.values.slice(start, end));
    }

    concat(other) {
        return new Tuple(...this.values, ...other.values);
    }

    reverse() {
        return new Tuple(...[...this.values].reverse());
    }

    first() {
        return this.values[0];
    }

    last() {
        return this.values[this.values.length - 1];
    }

    tail() {
        return new Tuple(...this.values.slice(1));
    }

    init() {
        return new Tuple(...this.values.slice(0, -1));
    }

    take(n) {
        return new Tuple(...this.values.slice(0, n));
    }

    drop(n) {
        return new Tuple(...this.values.slice(n));
    }

    unzip() {
        const first = [];
        const second = [];
        for (const [a, b] of this.values) {
            first.push(a);
            second.push(b);
        }
        return [new Tuple(...first), new Tuple(...second)];
    }

    zip(other) {
        const result = [];
        const len = Math.min(this.values.length, other.values.length);
        for (let i = 0; i < len; i++) {
            result.push([this.values[i], other.values[i]]);
        }
        return new Tuple(...result);
    }

    [Symbol.iterator]() {
        return this.values[Symbol.iterator]();
    }

    toString() {
        return `(${this.values.join(', ')})`;
    }
}

class Set {
    constructor(iterable = []) {
        this._map = new Map();
        for (const item of iterable) {
            this.add(item);
        }
    }

    static from(iterable) {
        return new Set(iterable);
    }

    add(value) {
        const key = this._key(value);
        this._map.set(key, value);
        return this;
    }

    delete(value) {
        const key = this._key(value);
        return this._map.delete(key);
    }

    has(value) {
        const key = this._key(value);
        return this._map.has(key);
    }

    get size() {
        return this._map.size;
    }

    _key(value) {
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    clear() {
        this._map.clear();
    }

    forEach(fn) {
        this._map.forEach(fn);
    }

    map(fn) {
        const result = new Set();
        this._map.forEach(value => {
            result.add(fn(value));
        });
        return result;
    }

    filter(fn) {
        const result = new Set();
        this._map.forEach(value => {
            if (fn(value)) {
                result.add(value);
            }
        });
        return result;
    }

    reduce(fn, init) {
        let acc = init;
        this._map.forEach(value => {
            acc = fn(acc, value);
        });
        return acc;
    }

    union(other) {
        const result = new Set([...this]);
        for (const item of other) {
            result.add(item);
        }
        return result;
    }

    intersect(other) {
        const result = new Set();
        for (const item of this) {
            if (other.has(item)) {
                result.add(item);
            }
        }
        return result;
    }

    diff(other) {
        const result = new Set([...this]);
        for (const item of other) {
            result.delete(item);
        }
        return result;
    }

    symmetricDiff(other) {
        return this.union(other).diff(this.intersect(other));
    }

    isSubsetOf(other) {
        for (const item of this) {
            if (!other.has(item)) return false;
        }
        return true;
    }

    isSupersetOf(other) {
        for (const item of other) {
            if (!this.has(item)) return false;
        }
        return true;
    }

    isEmpty() {
        return this._map.size === 0;
    }

    toArray() {
        return Array.from(this._map.values());
    }

    [Symbol.iterator]() {
        return this._map.values()[Symbol.iterator]();
    }
}

class Dict {
    constructor(iterable = []) {
        this._data = new Map();
        for (const [key, value] of iterable) {
            this.set(key, value);
        }
    }

    static from(obj) {
        const dict = new Dict();
        for (const key of Object.keys(obj)) {
            dict.set(key, obj[key]);
        }
        return dict;
    }

    static fromEntries(entries) {
        return new Dict(entries);
    }

    set(key, value) {
        this._data.set(key, value);
        return this;
    }

    get(key, defaultValue) {
        if (this._data.has(key)) {
            return this._data.get(key);
        }
        return defaultValue;
    }

    has(key) {
        return this._data.has(key);
    }

    delete(key) {
        return this._data.delete(key);
    }

    clear() {
        this._data.clear();
    }

    get size() {
        return this._data.size;
    }

    keys() {
        return Array.from(this._data.keys());
    }

    values() {
        return Array.from(this._data.values());
    }

    entries() {
        return Array.from(this._data.entries());
    }

    forEach(fn) {
        this._data.forEach(fn);
    }

    map(fn) {
        const result = new Dict();
        this._data.forEach((value, key) => {
            result.set(key, fn(value, key));
        });
        return result;
    }

    filter(fn) {
        const result = new Dict();
        this._data.forEach((value, key) => {
            if (fn(value, key)) {
                result.set(key, value);
            }
        });
        return result;
    }

    reduce(fn, init) {
        let acc = init;
        this._data.forEach((value, key) => {
            acc = fn(acc, value, key);
        });
        return acc;
    }

    merge(other) {
        const result = new Dict([...this.entries()]);
        for (const [key, value] of other.entries()) {
            result.set(key, value);
        }
        return result;
    }

    pick(...keys) {
        const result = new Dict();
        for (const key of keys) {
            if (this.has(key)) {
                result.set(key, this.get(key));
            }
        }
        return result;
    }

    omit(...keys) {
        const result = new Dict([...this.entries()]);
        for (const key of keys) {
            result.delete(key);
        }
        return result;
    }

    getOrElse(key, defaultValue) {
        return this.get(key, defaultValue);
    }

    toObject() {
        const obj = {};
        for (const [key, value] of this._data) {
            obj[key] = value;
        }
        return obj;
    }

    toJSON() {
        return this.toObject();
    }
}

class Tree {
    constructor(value, children = []) {
        this.value = value;
        this.children = children;
    }

    static leaf(value) {
        return new Tree(value);
    }

    static node(value, ...children) {
        return new Tree(value, children);
    }

    getValue() {
        return this.value;
    }

    getChildren() {
        return this.children;
    }

    isLeaf() {
        return this.children.length === 0;
    }

    map(fn) {
        return new Tree(
            fn(this.value),
            this.children.map(child => child.map(fn))
        );
    }

    reduce(fn, init) {
        let acc = fn(init, this.value);
        for (const child of this.children) {
            acc = child.reduce(fn, acc);
        }
        return acc;
    }

    filter(fn) {
        if (!fn(this.value)) {
            return null;
        }
        return new Tree(
            this.value,
            this.children
                .map(child => child.filter(fn))
                .filter(child => child !== null)
        );
    }

    find(fn) {
        if (fn(this.value)) {
            return this;
        }
        for (const child of this.children) {
            const found = child.find(fn);
            if (found) return found;
        }
        return null;
    }

    findAll(fn) {
        const results = [];
        if (fn(this.value)) {
            results.push(this);
        }
        for (const child of this.children) {
            results.push(...child.findAll(fn));
        }
        return results;
    }

    depth() {
        if (this.isLeaf()) return 1;
        return 1 + Math.max(...this.children.map(c => c.depth()));
    }

    size() {
        return 1 + this.children.reduce((acc, c) => acc + c.size(), 0);
    }

    preorder() {
        const result = [this.value];
        for (const child of this.children) {
            result.push(...child.preorder());
        }
        return result;
    }

    postorder() {
        const result = [];
        for (const child of this.children) {
            result.push(...child.postorder());
        }
        result.push(this.value);
        return result;
    }

    levelOrder() {
        const result = [];
        const queue = [this];
        
        while (queue.length > 0) {
            const node = queue.shift();
            result.push(node.value);
            queue.push(...node.children);
        }
        
        return result;
    }

    toString() {
        return `Tree(${this.value}, [${this.children.length} children])`;
    }
}

class Heap {
    constructor(comparator = (a, b) => a - b) {
        this.data = [];
        this.comparator = comparator;
    }

    static min() {
        return new Heap((a, b) => a - b);
    }

    static max() {
        return new Heap((a, b) => b - a);
    }

    push(value) {
        this.data.push(value);
        this._bubbleUp(this.data.length - 1);
        return this;
    }

    pop() {
        if (this.data.length === 0) return null;
        
        const min = this.data[0];
        const last = this.data.pop();
        
        if (this.data.length > 0) {
            this.data[0] = last;
            this._bubbleDown(0);
        }
        
        return min;
    }

    peek() {
        return this.data[0];
    }

    get size() {
        return this.data.length;
    }

    isEmpty() {
        return this.data.length === 0;
    }

    clear() {
        this.data = [];
    }

    _parent(i) {
        return Math.floor((i - 1) / 2);
    }

    _left(i) {
        return 2 * i + 1;
    }

    _right(i) {
        return 2 * i + 2;
    }

    _swap(i, j) {
        [this.data[i], this.data[j]] = [this.data[j], this.data[i]];
    }

    _bubbleUp(i) {
        while (i > 0) {
            const parent = this._parent(i);
            if (this.comparator(this.data[i], this.data[parent]) < 0) {
                this._swap(i, parent);
                i = parent;
            } else {
                break;
            }
        }
    }

    _bubbleDown(i) {
        while (true) {
            const left = this._left(i);
            const right = this._right(i);
            let smallest = i;
            
            if (left < this.data.length && this.comparator(this.data[left], this.data[smallest]) < 0) {
                smallest = left;
            }
            if (right < this.data.length && this.comparator(this.data[right], this.data[smallest]) < 0) {
                smallest = right;
            }
            
            if (smallest !== i) {
                this._swap(i, smallest);
                i = smallest;
            } else {
                break;
            }
        }
    }

    toArray() {
        return [...this.data];
    }
}

class Graph {
    constructor(directed = true) {
        this.directed = directed;
        this.edges = new Map();
        this.nodes = new Set();
    }

    static undirected() {
        return new Graph(false);
    }

    addNode(value) {
        this.nodes.add(value);
        if (!this.edges.has(value)) {
            this.edges.set(value, new Set());
        }
        return this;
    }

    addEdge(from, to, weight = 1) {
        this.addNode(from);
        this.addNode(to);
        
        this.edges.get(from).add(to);
        
        if (!this.directed) {
            this.edges.get(to).add(from);
        }
        
        return this;
    }

    hasNode(value) {
        return this.nodes.has(value);
    }

    hasEdge(from, to) {
        return this.edges.has(from) && this.edges.get(from).has(to);
    }

    getNeighbors(node) {
        return this.edges.get(node) ? Array.from(this.edges.get(node)) : [];
    }

    removeNode(value) {
        this.nodes.delete(value);
        this.edges.delete(value);
        
        for (const [node, neighbors] of this.edges) {
            neighbors.delete(value);
        }
        
        return this;
    }

    removeEdge(from, to) {
        if (this.edges.has(from)) {
            this.edges.get(from).delete(to);
        }
        return this;
    }

    bfs(start) {
        const visited = new Set();
        const result = [];
        const queue = [start];
        
        while (queue.length > 0) {
            const node = queue.shift();
            if (visited.has(node)) continue;
            
            visited.add(node);
            result.push(node);
            
            for (const neighbor of this.getNeighbors(node)) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }
        
        return result;
    }

    dfs(start) {
        const visited = new Set();
        const result = [];
        
        const dfs = (node) => {
            if (visited.has(node)) return;
            visited.add(node);
            result.push(node);
            
            for (const neighbor of this.getNeighbors(node)) {
                dfs(neighbor);
            }
        };
        
        dfs(start);
        return result;
    }

    dijkstra(start, end) {
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const heap = Heap.min();
        
        for (const node of this.nodes) {
            distances.set(node, Infinity);
        }
        distances.set(start, 0);
        heap.push({ node: start, dist: 0 });
        
        while (!heap.isEmpty()) {
            const { node, dist } = heap.pop();
            
            if (visited.has(node)) continue;
            visited.add(node);
            
            if (node === end) break;
            
            for (const neighbor of this.getNeighbors(node)) {
                const newDist = dist + 1;
                if (newDist < distances.get(neighbor)) {
                    distances.set(neighbor, newDist);
                    previous.set(neighbor, node);
                    heap.push({ node: neighbor, dist: newDist });
                }
            }
        }
        
        // Reconstruct path
        const path = [];
        let node = end;
        while (node) {
            path.unshift(node);
            node = previous.get(node);
        }
        
        return {
            distance: distances.get(end),
            path
        };
    }

    toMermaid() {
        let result = this.directed ? 'graph TD' : 'graph';
        
        for (const [node, neighbors] of this.edges) {
            for (const neighbor of neighbors) {
                result += `\n${node} --> ${neighbor}`;
            }
        }
        
        return result;
    }

    get size() {
        return this.nodes.size;
    }
}

// Exclusive data structures built-ins
const dataStructBuiltins = {
    // Tuple
    tuple: (...values) => new Tuple(...values),
    tuple_get: (t, i) => t.get(i),
    tuple_len: (t) => t.length(),
    tuple_first: (t) => t.first(),
    tuple_last: (t) => t.last(),
    tuple_map: (t, fn) => t.map(fn),
    tuple_zip: (a, b) => a.zip(b),

    // Set
    set: (iterable) => new Set(iterable),
    set_add: (s, v) => s.add(v),
    set_has: (s, v) => s.has(v),
    set_delete: (s, v) => s.delete(v),
    set_union: (a, b) => a.union(b),
    set_intersect: (a, b) => a.intersect(b),
    set_diff: (a, b) => a.diff(a, b),

    // Dict
    dict: (obj) => Dict.from(obj),
    dict_get: (d, k, def) => d.get(k, def),
    dict_set: (d, k, v) => d.set(k, v),
    dict_has: (d, k) => d.has(k),
    dict_keys: (d) => d.keys(),
    dict_values: (d) => d.values(),
    dict_entries: (d) => d.entries(),
    dict_merge: (a, b) => a.merge(b),
    dict_pick: (d, ...ks) => d.pick(...ks),
    dict_omit: (d, ...ks) => d.omit(...ks),

    // Tree
    tree_leaf: (v) => Tree.leaf(v),
    tree_node: (v, ...cs) => Tree.node(v, ...cs),
    tree_map: (t, fn) => t.map(fn),
    tree_find: (t, fn) => t.find(fn),
    tree_depth: (t) => t.depth(),
    tree_size: (t) => t.size(),
    tree_preorder: (t) => t.preorder(),
    tree_levelorder: (t) => t.levelOrder(),

    // Heap
    heap_min: () => Heap.min(),
    heap_max: () => Heap.max(),
    heap_push: (h, v) => h.push(v),
    heap_pop: (h) => h.pop(),
    heap_peek: (h) => h.peek(),

    // Graph
    graph: () => new Graph(),
    graph_undirected: () => Graph.undirected(),
    graph_add_node: (g, v) => g.addNode(v),
    graph_add_edge: (g, f, t, w) => g.addEdge(f, t, w),
    graph_bfs: (g, s) => g.bfs(s),
    graph_dfs: (g, s) => g.dfs(s),
    graph_dijkstra: (g, s, e) => g.dijkstra(s, e),
};

module.exports = { 
    Tuple, Set, Dict, Tree, Heap, Graph,
    dataStructBuiltins 
};