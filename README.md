# nuxScript

A programming language with exclusive features: regex engine, query system, actors, macros, advanced data structures, type system, and custom operators.

## Installation

```bash
# Local (recommended)
npm install nuxscript-lib

# Global
npm i -g nuxscript-lib

# Usage
nux run <file.nux>
```

## Features

### 1. Reflection System

Introspecção de tipos, funções, structs e enums em runtime.

| Function | Description |
|----------|-------------|
| `reflect(target)` | Get metadata of a function, struct, or enum |
| `reflect_type(val)` | Get type info of a value |
| `reflect_fn(fn)` | Get function metadata (name, params, arity) |
| `reflect_struct(obj)` | Get struct definition with fields |
| `reflect_enum(variant)` | Get enum variant info |
| `get_type(val)` | Get type: 'function', 'struct', 'enum', 'object', etc. |
| `type_of(val)` | Alias for get_type |
| `is_type(val, expected)` | Check if value is of expected type |
| `get_meta(fn)` | Get metadata attached to a function |
| `set_meta(fn, meta)` | Attach metadata to a function |

#### Example

```nux
fn add(a :: Int, b :: Int) -> Int
    a + b
end

let info = reflect(add)
print(info.name)     # "add"
print(info.arity)   # 2
print(info.params)   # ["a", "b"]
```

### 2. Code Generation

Converte AST nodes para código nuxScript.

| Function | Description |
|----------|-------------|
| `generate(node)` | Convert AST node to nuxScript code |
| `pretty_print(node)` | Format code with indentation |
| `ast_to_code(ast)` | Convert full AST to code |

#### Example

```nux
let node = ast_node("BinaryExpr", {
    op: "+",
    left: ast_node("NumberLiteral", {value: 1}),
    right: ast_node("NumberLiteral", {value: 2})
})
print(generate(node))  # "1 + 2"
```

### 3. External Code Analysis

Analisa código JavaScript externo.

| Function | Description |
|----------|-------------|
| `parse_js(code)` | Parse JavaScript to AST |
| `tokenize_js(code)` | Tokenize JavaScript |
| `analyze_js(code)` | Full analysis (functions, classes, etc.) |

#### Example

```nux
let code = "const x = 1; function hello() { return x; }"
let analysis = analyze_js(code)
print(analysis.functions)  # ["hello"]
print(analysis.classes)  # []
print(analysis.statCount) # 2
```

### 4. AST Helper

Cria nós AST manualmente.

| Function | Description |
|----------|-------------|
| `ast_node(type, props)` | Create an AST node |

```nux
let id = ast_node("Identifier", {name: "foo"})
let num = ast_node("NumberLiteral", {value: 42})
let bin = ast_node("BinaryExpr", {op: "+", left: id, right: num})
```

### 5. Built-in Functions

```nux
# Output
print(...)           # Print to console

# Types
type(val)            # Get typeof
isOk(val)            # Check Result::Ok
isErr(val)           # Check Result::Err
isSome(val)          # Check Option::Some
isNone(val)          # Check Option::None

# Collections
len(a)               # Length of array/string
push(arr, val)       # Push to array
pop(arr)            # Pop from array
range(n)            # Create 0..n-1 range

# Option/Result
Ok(val)              # Create Result::Ok
Err(val)             # Create Result::Err
Some(val)            # Create Option::Some
None()               # Create Option::None

# Math (via math namespace)
math.abs(n)
math.floor(n)
math.ceil(n)
math.round(n)
math.sqrt(n)
math.min(...args)
math.max(...args)
math.pow(base, exp)
math.random()
math.sin(n)
math.cos(n)
math.log(n)
math.exp(n)

# List operations (via list namespace)
list.length(l)
list.isEmpty(l)
list.contains(l, x)
list.indexOf(l, x)
list.push(l, x)
list.pop(l)
list.slice(l, start, end)
list.reverse(l)
list.join(l, sep)
list.sum(l)
list.product(l)
list.sort(l)
list.map(fn)
list.filter(fn)
list.reduce(init, fn)
list.find(l, fn)
list.some(l, fn)
list.every(l, fn)

# String operations (via string namespace)
string.length(s)
string.upper(s)
string.lower(s)
string.trim(s)
string.includes(s, sub)
string.startsWith(s, prefix)
string.endsWith(s, suffix)
string.slice(s, start, end)
string.split(s, sep)
string.replace(s, old, new)
string.concat(...args)

# Map operations (via map namespace)
map.keys(m)
map.values(m)
map.entries(m)
map.hasKey(m, k)
map.merge(a, b)
map.size(m)

# IO
readFile(path)
writeFile(path, content)

# Fiber support
fiber_create(fn, constants)
resume(fiberRef)
fibers
```

### 6. Language Syntax

#### Variables

```nux
let x = 10           # immutable
let! x = 10          # mutable
var x = 10           # mutable (alias for let!)
const MAX = 100       # compile-time constant
```

#### Types

```nux
::Int               # type annotation
::String
::?String           # Option[String]
::Result[Int, Err] # Result type
::List[::Int]      # generic container
```

#### Functions

```nux
fn add(a :: Int, b :: Int) -> Int
    a + b
end

# Anonymous function
let add = fn(a, b) -> a + b
```

#### Structs

```nux
struct Point
    x :: Int
    y :: Int
end
```

#### Enums

```nux
enum Shape
    Circle(radius :: Int)
    Rectangle(width :: Int, height :: Int)
    Empty
end
```

#### Pattern Matching

```nux
match shape
    Circle(r)       -> "circle with r={r}"
    Rectangle(w, h) -> "rect {w}x{h}"
    Empty           -> "nothing"
end
```

#### Pipe Operator

```nux
users
    |> filter(.active == true)
    |> map(.name)
    |> join(", ")
```

#### Control Flow

```nux
if x > 10
    "big"
else if x > 5
    "medium"
else
    "small"
end

for item in list
    print(item)
end

while running
    tick()
end
```

#### Fibers

```nux
let gen = fiber {
    yield 1
    yield 2
    yield 3
}

match resume(gen)
    {status: "running", value: v} -> print("yielded: {v}")
    {status: "finished", value: v} -> print("done: {v}")
end
```

## CLI Commands

```bash
nux run <file>        # Run program
nux typecheck <file>  # Check types without running
nux check <file>    # Type check + run
nux ast <file>      # Print AST
nux tokens <file>   # Print tokens
```

## API

```javascript
const { ReflectionBuiltin, CodeGenerator, ExternalParser } = require('nuxscript-lib');

// Reflection
const fn = (x) => x + 1;
console.log(ReflectionBuiltin.reflect(fn));

// Code Generation
const ast = { type: 'BinaryExpr', op: '+', left: { type: 'NumberLiteral', value: 1 }, right: { type: 'NumberLiteral', value: 2 } };
const cg = new CodeGenerator();
console.log(cg.generate(ast));

// External Parser
const code = 'const x = 1; function hello() { return x; }';
console.log(ExternalParser.parseJS(code));
```

## Documentation

See [SPEC.md](./SPEC.md) for full language specification.

## Links

- **npm**: https://npmjs.com/package/nuxscript-lib
- **GitHub**: https://github.com/NyxMindCorp/nuxScript
- **Documentation**: https://nyxmindcorp.github.io/nuxScript/docs/

## License

MIT