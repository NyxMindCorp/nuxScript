#!/usr/bin/env node

/**
 * nuxScript CLI Entry Point
 */

const { Lexer } = require('../src/lexer');
const { Parser } = require('../src/parser');
const { Compiler } = require('../src/compiler');
const { VM } = require('../src/vm');
const { TypeChecker, checkTypes } = require('../src/typechecker');
const fs = require('fs');
const path = require('path');

function runFile(filename, options = {}) {
    const code = fs.readFileSync(filename, 'utf-8');
    return runCode(code, options);
}

function runCode(code, options = {}) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    // Type checking (optional)
    if (options.typecheck) {
        const result = checkTypes(ast);
        if (!result.success) {
            console.error('Type errors found:');
            for (const err of result.errors) {
                console.error(`  ${err.message}`);
                if (err.node && err.node.line) {
                    console.error(`    at line ${err.node.line}`);
                }
            }
            if (options.strict && result.errors.length > 0) {
                process.exit(1);
            }
        }
        if (result.warnings.length > 0) {
            console.log('Type warnings:');
            for (const warn of result.warnings) {
                console.log(`  ${warn.message}`);
            }
        }
        if (result.errors.length > 0 && !options.run) {
            return null;
        }
    }

        const compiler = new Compiler(ast);
        const bytecode = compiler.compile();

        const vm = new VM(bytecode);
        // Add builtins to the VM's variables
        const { builtins } = require('../src/vm');
        for (const [key, value] of Object.entries(builtins)) {
            vm.variables.set(key, value);
        }
        const result = vm.run();

        return result;
}

function printAST(ast, indent = 0) {
    const pad = '  '.repeat(indent);
    if (Array.isArray(ast)) {
        ast.forEach(node => printAST(node, indent));
        return;
    }
    if (!ast || typeof ast !== 'object') {
        console.log(pad + ast);
        return;
    }
    console.log(pad + (ast.type || 'Node') + ':');
    for (const [key, value] of Object.entries(ast)) {
        if (key === 'type' || key === 'loc') continue;
        if (Array.isArray(value)) {
            console.log(pad + '  ' + key + ':');
            value.forEach(v => printAST(v, indent + 2));
        } else if (value && typeof value === 'object') {
            console.log(pad + '  ' + key + ':');
            printAST(value, indent + 2);
        } else {
            console.log(pad + '  ' + key + ': ' + value);
        }
    }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('nuxScript v0.2.0');
    console.log('Usage: nux <command> [options] <file.nux>');
    console.log('');
    console.log('Commands:');
    console.log('  run <file>        Run a nuxScript file');
    console.log('  typecheck <file>  Check types without running');
    console.log('  check <file>      Type check + run');
    console.log('  ast <file>        Print the AST');
    console.log('  tokens <file>     Print tokens');
    console.log('  pkg <action>      Package manager (install, list, remove)');
    console.log('  init <name>       Initialize a new nuxScript project');
    console.log('');
    console.log('Options:');
    console.log('  --strict          Treat warnings as errors');
    process.exit(0);
}

const command = args[0];

// Handle --strict flag
const strict = args.includes('--strict');
const runIdx = args.indexOf('--run');
const runAfterCheck = runIdx !== -1;

function getFileArg() {
    for (let i = 1; i < args.length; i++) {
        if (!args[i].startsWith('--')) {
            return args[i];
        }
    }
    return null;
}

if (command === 'run' || command === 'check') {
    const filename = getFileArg();
    if (!filename) {
        console.error('Usage: nux run <file.nux>');
        process.exit(1);
    }
    const filepath = path.resolve(filename);
    if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
    }
    try {
        const doTypeCheck = command === 'check';
        const result = runFile(filepath, { typecheck: doTypeCheck, strict, run: doTypeCheck });
        if (result !== undefined) {
            console.log('→', result);
        }
    } catch (err) {
        console.error('Runtime error:', err.message);
        process.exit(1);
    }
} else if (command === 'typecheck') {
    const filename = getFileArg();
    if (!filename) {
        console.error('Usage: nux typecheck <file.nux>');
        process.exit(1);
    }
    const filepath = path.resolve(filename);
    if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
    }
    const code = fs.readFileSync(filepath, 'utf-8');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const result = checkTypes(ast);
    if (result.success) {
        console.log('✓ No type errors');
    } else {
        console.error('✗ Type errors:');
        for (const err of result.errors) {
            console.error(`  ${err.message}`);
            if (err.node && err.node.line) {
                console.error(`    at line ${err.node.line}`);
            }
        }
        process.exit(1);
    }
    if (result.warnings.length > 0) {
        console.log('Warnings:');
        for (const warn of result.warnings) {
            console.log(`  ${warn.message}`);
        }
    }
} else if (command === 'ast') {
    const filename = getFileArg();
    if (!filename) {
        console.error('Usage: nux ast <file.nux>');
        process.exit(1);
    }
    const filepath = path.resolve(filename);
    const code = fs.readFileSync(filepath, 'utf-8');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    printAST(ast);
} else if (command === 'tokens') {
    const filename = getFileArg();
    if (!filename) {
        console.error('Usage: nux tokens <file.nux>');
        process.exit(1);
    }
    const filepath = path.resolve(filename);
    const code = fs.readFileSync(filepath, 'utf-8');
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    console.log(JSON.stringify(tokens, null, 2));
} else if (command === 'pkg') {
    const subcommand = args[1];
    const pkgName = args[2];
    const version = args[3];

    if (!subcommand) {
        console.error('Usage: nux pkg <action> [name] [version]');
        console.log('Actions: install, list, remove');
        process.exit(1);
    }

    if (subcommand === 'install') {
        if (!pkgName) {
            console.error('Usage: nux pkg install <name> [version]');
            process.exit(1);
        }
        // Call the pkg_install built-in function via VM
        const { VM } = require('../src/vm');
        // We need to run a small script that calls pkg_install
        const code = `pkg_install("${pkgName}", "${version || "latest"}")`;
        const vm = new VM({ instructions: [], constants: [] }); // This is a simplified approach; better to reuse runCode
        // Instead, let's reuse the existing runCode function but we need to adapt.
        // For simplicity, we'll create a temporary VM with the builtins.
        const { builtins } = require('../src/vm');
        const vm2 = new VM({ instructions: [], constants: [] }, null);
        vm2.variables = new Map(Object.entries(builtins));
        try {
            // We need to compile and run the code. Let's reuse the runCode function from this file.
            // But we are inside the same file, so we can call runCode.
            // However, runCode expects a file or code string and does full compilation.
            // We'll do that.
            const result = runCode(code, {});
            console.log(`→ ${JSON.stringify(result)}`);
        } catch (err) {
            console.error('Error:', err.message);
            process.exit(1);
        }
    } else if (subcommand === 'list') {
        const code = `pkg_list()`;
        try {
            const result = runCode(code, {});
            console.log('Installed packages:');
            if (Array.isArray(result) && result.length === 0) {
                console.log('  (none)');
            } else {
                for (const pkg of result) {
                    console.log(`  ${pkg.name}@${pkg.version}`);
                }
            }
        } catch (err) {
            console.error('Error:', err.message);
            process.exit(1);
        }
    } else if (subcommand === 'remove') {
        if (!pkgName) {
            console.error('Usage: nux pkg remove <name>');
            process.exit(1);
        }
        const code = `pkg_remove("${pkgName}")`;
        try {
            const result = runCode(code, {});
            console.log(`→ ${JSON.stringify(result)}`);
        } catch (err) {
            console.error('Error:', err.message);
            process.exit(1);
        }
    } else {
        console.error(`Unknown pkg action: ${subcommand}`);
        console.log('Available actions: install, list, remove');
        process.exit(1);
    }
} else if (command === 'init') {
    const projectName = args[1];
    if (!projectName) {
        console.error('Usage: nux init <project-name>');
        process.exit(1);
    }

    const projectDir = path.resolve(projectName);
    if (fs.existsSync(projectDir)) {
        console.error(`Directory ${projectName} already exists`);
        process.exit(1);
    }

    fs.mkdirSync(projectDir);
    fs.mkdirSync(path.join(projectDir, 'src'));
    fs.mkdirSync(path.join(projectDir, 'test'));

    // Create a basic.nux file
    const mainContent = `fn main() -> Int
    print("Hello, nuxScript!")
    0
end
`;
    fs.writeFileSync(path.join(projectDir, 'main.nux'), mainContent);

    // Create a nuxpackage.json (package manifest)
    const manifest = {
        name: projectName,
        version: "0.1.0",
        main: "main.nux",
        dependencies: {}
    };
    fs.writeFileSync(path.join(projectDir, 'nuxpackage.json'), JSON.stringify(manifest, null, 2));

    // Create a README.md
    const readmeContent = `# ${projectName}

A nuxScript project.

## Build and Run

\`\`\ bash
nux run main.nux
\`\`\ 
`;
    fs.writeFileSync(path.join(projectDir, 'README.md'), readmeContent);

    console.log(`Created new nuxScript project in ${projectDir}`);
    console.log('  - main.nux: entry point');
    console.log('  - nuxpackage.json: project manifest');
    console.log('  - README.md: documentation');
    console.log('');
    console.log('To run:');
    console.log(`  cd ${projectName} && nux run main.nux`);
} else {
    console.error(`Unknown command: ${command}`);
    console.error('Run \`nux\` without arguments for usage.');
    process.exit(1);
}

module.exports = { runFile, runCode };
