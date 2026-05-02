# nuxScript Product Requirements Document

## Overview
nuxScript is a typed, expression-oriented programming language designed to be intuitive, safe, and expressive. It combines functional programming concepts with a minimal, readable syntax that prioritizes developer experience.

## Vision
To create a language that feels intentional where every syntactic choice prioritizes readability, minimizes unnecessary symbols, embraces immutability by default, and treats errors as values rather than exceptions.

## Core Principles
1. **Readability first** — code reads like prose, not like punctuation
2. **Fewer symbols, more meaning** — no sigils unless they carry weight
3. **Immutability by default** — data flows in one direction
4. **Errors as values** — no exceptions, only Results

## Target Audience
- Developers seeking a safer alternative to JavaScript/TypeScript
- Functional programming enthusiasts
- Teams looking to reduce runtime errors through strong typing
- Educators teaching programming concepts

## Key Features

### Type System
- **Type Inference**: Types inferred automatically when possible
- **Explicit Annotations**: Available when needed for clarity
- **Algebraic Data Types**: Enums with payloads (sum types)
- **Structs**: Product types with named fields
- **Option Types**: `::?T` for nullable values instead of null
- **Result Types**: `::Result[T, E]` for error handling
- **Generics**: Parameterized types like `::List[::T]`

### Syntax Highlights
- **Variable Declarations**:
  - `let name = "value"` (immutable by default)
  - `let! age = 28` (mutable with !)
  - `var count = 0` (mutable alias)
  - `const MAX = 100` (compile-time constant)
- **Function Syntax**:
  - `fn add(a :: Int, b :: Int) -> Int { a + b }`
  - Arrow functions: `x -> x * 2`
- **Control Flow**:
  - `if/else/elsif/end` expressions
  - `for item in list end` loops
  - `while condition end` loops
  - `match` expressions for pattern matching
- **Pipe Operator**: `|>` as primary data flow operator
- **Error Handling**: `try expr?` with `Result` types
- **Fibers**: Lightweight cooperative multitasking with `fiber {}` and `yield`

### Data Structures
- **Lists**: `[1, 2, 3]` with type `::List[::Int]`
- **Maps**: `{key: value}` literals
- **Tuples**: Implicit in pattern matching and function returns
- **Records**: Structs with named fields

### Standard Library (Planned)
- Basic I/O operations
- Collection manipulation (map, filter, reduce)
- String utilities
- Math functions
- Fiber utilities for async-like operations

## Compiler Pipeline
1. **Lexing**: Tokenize source code
2. **Parsing**: Generate Abstract Syntax Tree (AST)
3. **Type Checking**: Verify type safety and infer types
4. **Compilation**: Generate bytecode
5. **Execution**: Run on Virtual Machine (VM)

## Language Design Decisions

### What We Exclude
- **Classes**: Prefer structs + enums + traits for composition
- **Null References**: Use Option[T] instead
- **Exceptions**: Errors are values returned via Result[T, E]
- **Implicit Type Coercion**: Strict type system prevents surprises
- **Semicolons**: Not required; newlines terminate statements

### Block Delimiters
- Use `end` keyword instead of braces `{}` for visual clarity
- Combined with indentation for readable structure

### Pattern Matching
- Native support as expressions (not just statements)
- Exhaustiveness checking planned for future versions

### Pipe-First Philosophy
- `|>` operator encourages readable data transformation pipelines
- Functions designed to work well with pipe operator

## Non-Goals
- **Object-Oriented Programming**: Focus on functional/data-oriented paradigms
- **Low-Level Systems Programming**: Target application development, not OS/kernel dev
- **Macro System**: Keep language simple and predictable initially
- **Runtime Reflection**: Prioritize safety and predictability

## Development Roadmap

### Phase 1: Core Language (Current)
- ✅ Basic syntax (variables, functions, control flow)
- ✅ Type inference and checking
- ✅ Structs and enums
- ✅ Pattern matching
- ✅ Pipe operator
- ✅ Basic standard library
- ✅ VM execution

### Phase 2: Enhanced Features
- 🔄 Trait system for behavior abstraction
- 🔄 Exhaustiveness checking for pattern matching
- 🔄 Module system with `use`/`mod`
- 🔄 Enhanced fiber implementation
- 🔄 Foreign function interface (FFI)

### Phase 3: Tooling & Ecosystem
- 📘 Language server protocol (LSP) support
- 📦 Package manager
- 🧪 Testing framework integration
- 📚 Comprehensive documentation
- 🛠️ Editor plugins (VS Code, Neovim)

## Success Metrics
- **Adoption**: Number of active projects using nuxScript
- **Developer Satisfaction**: Survey feedback on language usability
- **Safety**: Reduction in runtime type errors compared to JavaScript/TypeScript
- **Performance**: Competitive with similar VM-based languages
- **Ecosystem**: Number of community-contributed packages

## Open Questions
1. Should we support operator overloading?
2. What should the standard library include in MVP?
3. How should we handle concurrency beyond fibers?
4. What's our strategy for IDE integration?
5. Should we target WebAssembly compilation?

## Constraints
- **License**: MIT (per package.json)
- **Runtime**: Node.js compatible VM
- **Syntax Stability**: Avoid breaking changes once 1.0 is released
- **Backwards Compatibility**: Major versions may break; minor/patch should not

## Appendix: Example Programs

### Hello World
```nux
print("Hello, World!")
```

### Fibonacci with Fibers
```nux
let fib = fn() -> fiber {
    let a = 0
    let b = 1
    while true {
        yield a
        let temp = a + b
        a = b
        b = temp
    }
}

let generator = fib()
for i in 0..9 {
    match resume(generator) {
        {status: "running", value: v} -> print(v)
        _ => ()
    }
}
```

### Data Processing Pipeline
```nux
use std::io

struct User
    name :: String
    age  :: Int
    active :: Bool
end

let users = [
    User(name: "Alice", age: 25, active: true)
    User(name: "Bob", age: 30, active: false)
    User(name: "Charlie", age: 35, active: true)
]

let activeNames = users
    |> filter(.active)
    |> map(.name)
    |> join(", ")

print("Active users: {activeNames}")
```