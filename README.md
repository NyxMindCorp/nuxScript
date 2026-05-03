# nuxscript-lib

A programming language with built-in code analysis, reflection, and code generation capabilities.

## Installation

```bash
# Local (recommended)
npm install nuxscript-lib

# Global
npm i -g nuxscript-lib
```

## Features

### 1. Reflection System
```nux
reflect(fn)           # Get metadata of a function
reflect_type(val)    # Get type of a value
reflect_struct(obj)  # Get struct definition
reflect_enum(variant) # Get enum variant info
type_of(val)         # Get type: 'function', 'struct', 'enum', etc.
```

### 2. Code Generation
```nux
generate(node)       # Convert AST node to nuxScript code
pretty_print(node)    # Format code with indentation
ast_to_code(ast)      # Convert full AST to code
```

### 3. External Code Analysis
```nux
parse_js(code)        # Parse JavaScript to AST
tokenize_js(code)   # Tokenize JavaScript
analyze_js(code)     # Full analysis (functions, classes, etc.)
```

### 4. AST Nodes
```nux
# Built-in AST node types
ast_node("Identifier", {name: "foo"})
ast_node("NumberLiteral", {value: 42})
ast_node("BinaryExpr", {op: "+", left, right})
```

## Usage

### CLI
```bash
npx nuxscript-lib run <file.nux>
npx nuxscript-lib typecheck <file.nux>
npx nuxscript-lib check <file.nux>
```

### As Library
```javascript
const { ReflectionBuiltin, CodeGenerator, ExternalParser } = require('nuxscript-lib');

// Reflection
const fn = (x) => x + 1;
console.log(ReflectionBuiltin.reflect(fn));

// Code Generation
const ast = { type: 'BinaryExpr', op: '+', left: { type: 'NumberLiteral', value: 1 }, right: { type: 'NumberLiteral', value: 2 } };
console.log(CodeGenerator.prototype.generate.call({ generate: CodeGenerator.prototype.generate }, ast));

// Parse JS
const code = 'const x = 1; function hello() { return x; }';
console.log(ExternalParser.parseJS(code));
```

## Documentation

See [SPEC.md](./SPEC.md) for full language specification.