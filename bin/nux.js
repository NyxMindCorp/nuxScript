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
} else {
    console.error(`Unknown command: ${command}`);
    console.error('Run `nux` without arguments for usage.');
    process.exit(1);
}

module.exports = { runFile, runCode };
