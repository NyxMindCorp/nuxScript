# nuxScript — Language Specification

> A typed, expression-oriented language with a pleasing, minimal syntax.

---

## Philosophy

nuxScript is designed to feel **intentional**. Every syntactic choice prioritizes:
- **Readability first** — code reads like prose, not like punctuation
- **Fewer symbols, more meaning** — no sigils unless they carry weight
- **Immutability by default** — data flows in one direction
- **Errors as values** — no exceptions, only Results

---

## Design Goals

- **No classes** — structs + enums + traits instead
- **No null** — use `Option[T]` or `Result[T, E]`
- **Indentation + `end`** — blocks are clear and explicit
- **Type inference everywhere** — annotate only when necessary
- **Pipe-first** — `|>` is the primary data flow operator
- **Pattern matching native** — match is an expression
- **Algebraic data types** — enums with payloads

---

## Syntax Overview

### Variables

```
let name    = "Fernando"       # immutable by default
let! age    = 28               # mutable with !
var count   = 0                # mutable alias (desugars to let!)
const MAX   = 100              # compile-time constant
```

### Types

```
::Int              # type annotation
::String           # explicit type
::?String          # Option[String] — nullable
::Result[Int, Err] # Result type
::List[::Int]      # generic container
```

### Implemented Type System

```nux
# Type inference (no annotation needed)
let x = 10          # Int
let y = "hello"    # String
let z = [1, 2, 3]  # List[Int]

# Explicit type annotations
let name :: String = "Fernando"
let age :: Int = 28

# Function type signatures
fn add(a :: Int, b :: Int) -> Int
    a + b
end

fn greet(person :: String) -> String
    "Hello, " + person
end

# Struct
struct Point
    x :: Int
    y :: Int
end

# Enum
enum Shape
    Circle(radius :: Int)
    Rectangle(width :: Int, height :: Int)
end
```

### Commands

```bash
nux run <file>          # Run program
nux typecheck <file>    # Check types without running
nux check <file>        # Type check + run
nux ast <file>          # Print AST
nux tokens <file>       # Print tokens
```

### Function Syntax

```
fn greet(name :: String) -> String
    "Hello, " + name
end

fn safe_div(a :: Int, b :: Int) -> Result[Int, Err]
    if b == 0
        Err("division by zero")
    else
        Ok(a / b)
    end
end
```

### Structs & Enums

```
struct Point
    x :: Int
    y :: Int
end

enum Shape
    Circle(radius :: Int)
    Rectangle(width :: Int, height :: Int)
    Empty
end
```

### Pattern Matching

```
match shape
    Circle(r)       -> "circle with r={r}"
    Rectangle(w, h) -> "rect {w}x{h}"
    Empty           -> "nothing"
end
```

### Pipe Operator

```
users
    |> filter(.active == true)
    |> map(.name)
    |> join(", ")
```

### Control Flow

```
if count > 10
    "big"
else if count > 5
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

### Error Handling

```
let result = try safe_div(10, 0)?
match result
    Ok(value) -> print(value)
    Err(e)   -> print("failed: {e}")
end
```



## Fibers

Fibers provide lightweight cooperative multitasking, allowing functions to be paused and resumed.

### Syntax

```nux
# Create a fiber (starts suspended)
let my_fiber = fiber {
    // fiber body
    yield 42
    yield "hello"
}

// Resume a fiber with optional argument
match resume(my_fiber) {
    {status: "running", value: v} -> print("yielded: {v}")
    {status: "finished", value: v} -> print("finished with: {v}")
}

// Inside a fiber, yield returns control
fiber {
    for i in 0..5 {
        yield i * 2
        // execution pauses here until resumed
    }
}

// Shorthand: spawn fiber expression (desugars to fiber { expr })
let gen = spawn fiber (0..5) |> map(. * 2)
```

### Semantics

- `fiber { block }` creates a new fiber that begins in a suspended state.
- `yield expr` suspends the current fiber and returns `expr` as the yielded value.
- `resume(fiber_expr, opt_arg)` resumes a fiber:
  - Returns `{status: "running", value: yielded_value}` if the fiber yielded
  - Returns `{status: "finished", value: return_value}` if the fiber completed
  - If `opt_arg` is provided, it becomes the value of the last `yield` expression
- Fibers are cooperative: they only suspend when explicitly calling `yield` or when they finish
- The main program runs as the initial fiber; when it finishes, any remaining ready fibers are scheduled

### Example: Simple Generator

```nux
let count_from = fn(start :: Int) -> fiber {
    let i = start
    while true {
        yield i
        i = i + 1
    }
}

let counter = count_from(10)
let n = 0
while n < 5 {
    match resume(counter) {
        {status: "running", value: v} -> {
            print("count: {v}")
            n = n + 1
        }
        {status: "finished", value: v} -> break
    }
}
```

### Example: Async-like Operations

```nux
let fetch_data = fn() -> fiber {
    // Simulate async work
    yield "loading..."
    // In real implementation: yield to event loop, resume when data arrives
    yield {status: 200, data: "{"id": 1}"}
}

let fiber = fetch_data()
match resume(fiber) {
    {status: "running", value: "loading..."} -> print("Fetching...")
    _ => ()
}
match resume(fiber) {
    {status: "running", value: resp} -> print("Response: {resp}")
    _ => ()
}
```
---

## Keywords

```
fn       let      let!     var      const
if       else     elsif    end
for      in       while    loop     break    continue
match    when     then     is       as
try      catch    throw    return   yield
struct   enum     trait    impl
type     alias    pub      priv
use      mod      from
```

---

## Operators

```
# Arithmetic
+   -   *   /   %   **

# Comparison
==  !=  <   >   <=  >=  ===

# Logical
and or  not

# Bitwise
&   |   ^   ~   <<  >>

# Assignment
=   +=  -=  *=  /=  %=  **=

# Pipe
|>

# Type annotation
::

# Null-safe
?.   ?[

# Lambda
->   =>   _
```

---

## Naming Conventions

- **Variables/functions**: `snake_case`
- **Types/Traits**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Private members**: `_underscore_prefix`

---

## Example: Full Program

```
use std::io

struct User
    name     :: String
    age      :: Int
    active   :: Bool
end

fn main() -> Result[::Int, Err]
    let users = [
        User(name: "Fernanda", age: 25, active: true)
        User(name: "Carlos", age: 30, active: false)
        User(name: "Ana", age: 28, active: true)
    ]

    let message = users
        |> filter(.active)
        |> map(.name)
        |> join(", ")

    print("Active users: {message}")

    Ok(0)
end
```

---

## Comparison with Other Languages

| Feature              | Python       | TypeScript   | Node.js      | nuxScript         |
|-----------------------|--------------|--------------|--------------|-------------------|
| Block delimiter       | indentation  | `{}`         | `{}`         | `end`             |
| Type annotation       | `x: int`     | `x: number`  | —            | `::` or inference |
| Null                  | `None`       | `null`       | `null`       | `Option[T]`       |
| Generic syntax        | `[T]`        | `Array<T>`   | `Array<T>`   | `[T]`             |
| Function syntax       | `def`        | `function`   | `function`   | `fn`              |
| Lambda                | `lambda`     | `() =>`      | `() =>`      | `->` or `=>`      |
| Pattern matching      | `match` (3.10+)| `switch`    | `switch`     | native `match`    |
| Pipe operator         | —            | —            | —            | `\|>`             |
| Algebraic types       | `@dataclass` | `type` union | —            | native `enum`     |
| Immutability default  | mutable      | mutable      | mutable      | **immutable**     |

---

## Grammar Conventions (EBNF)

```
program        ::= stmt*

stmt           ::= let_decl | fn_decl | struct_decl | enum_decl
                 | expr_stmt | if_expr | match_expr | control_flow

let_decl       ::= 'let' '!'? IDENT ('::' type)? '=' expr
var_decl       ::= 'var' IDENT '=' expr
const_decl     ::= 'const' IDENT '=' expr

fn_decl        ::= 'fn' IDENT '(' params? ')' '->' type? block
params         ::= param (',' param)*
param          ::= IDENT '::' type

struct_decl    ::= 'struct' IDENT block 'end'
enum_decl      ::= 'enum' IDENT block 'end'
variant        ::= IDENT ('(' fields ')')?

block          ::= stmt*
expr_stmt      ::= expr

expr           ::= pipe_expr
pipe_expr      ::= or_expr ('|>' or_expr)*
or_expr        ::= and_expr ('or' and_expr)*
and_expr       ::= not_expr ('and' not_expr)*
not_expr       ::= 'not' cmp_expr | cmp_expr
cmp_expr       ::= shift_expr (('==' | '!=' | '<' | '>' | '<=' | '>=') shift_expr)*
shift_expr     ::= add_expr (('<<' | '>>') add_expr)*
add_expr       ::= mul_expr (('+' | '-') mul_expr)*
mul_expr       ::= unary_expr (('*' | '/' | '%') unary_expr)*
unary_expr     ::= ('-' | 'not' | '?') unary_expr | postfix_expr
postfix_expr   ::= primary ('?' '.' IDENT | '?' '[' expr ']')*
primary        ::= literal | IDENT | '(' expr ')' | list_literal | map_literal
                 | if_expr | match_expr | lambda_expr | block_expr

literal        ::= INT | FLOAT | STRING | 'true' | 'false' | 'nil'
list_literal   ::= '[' expr (',' expr)* ']'
map_literal    ::= '{' (expr ':' expr)+ '}'

if_expr        ::= 'if' expr block ('elsif' expr block)* ('else' block)? 'end'
match_expr     ::= 'match' expr (case)+ 'end'
case           ::= pattern ('when' expr)? '->' expr
pattern        ::= literal | IDENT | '_' | '(' pattern (',' pattern)* ')'
                 | IDENT '(' pattern (',' pattern)* ')'

lambda_expr    ::= 'fn' '(' params? ')' '->' expr
               |  IDENT '->' expr
               |  '_' '->' expr

type           ::= '?'? IDENT ('[' type (',' type)* ']')?
               |  'Result' '[' type ',' type ']'
               |  'Option' '[' type ']'
```
