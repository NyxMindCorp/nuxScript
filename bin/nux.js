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

const { loadModule } = require('../src/module');

function runFile(filename, options = {}) {
    const code = fs.readFileSync(filename, 'utf-8');
    return runCode(code, { ...options, filename });
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
        const { builtins } = require('../src/vm');
        for (const [key, value] of Object.entries(builtins)) {
            vm.variables.set(key, value);
        }

        const fileDir = options.filename ? path.dirname(path.resolve(options.filename)) : process.cwd();
        vm.variables.set('use', (modName) => {
            const exports = loadModule(modName, fileDir);
            for (const [key, value] of Object.entries(exports)) {
                vm.variables.set(key, value);
            }
            return exports;
        });

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
    const pkg = require('../package.json');
    console.log(`nuxScript v${pkg.version}`);
    console.log('Usage: nux <command> [options] [args]');
    console.log('');
    console.log('Commands:');
    console.log('  run <file>        Run a nuxScript file');
    console.log('  typecheck <file>  Check types without running');
    console.log('  check <file>      Type check + run');
    console.log('  watch <file>      Run file and auto-reload on changes');
    console.log('  repl              Start interactive REPL');
    console.log('  ast <file>        Print the AST');
    console.log('  tokens <file>     Print tokens');
    console.log('  pkg <action>      Package manager (install, list, remove, update, search, create)');
    console.log('  init <name>       Initialize a new nuxScript project');
    console.log('  lsp               Start LSP server (for IDE integration)');
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
} else if (command === 'watch') {
    const filename = getFileArg();
    if (!filename) {
        console.error('Usage: nux watch <file.nux>');
        process.exit(1);
    }
    const filepath = path.resolve(filename);
    if (!fs.existsSync(filepath)) {
        console.error(`File not found: ${filepath}`);
        process.exit(1);
    }
    const { watchFile } = require('../src/watch');
    watchFile(filepath, { strict });
} else if (command === 'repl') {
    const { startREPL } = require('../src/repl');
    startREPL();
} else if (command === 'lsp') {
    const { startLSP } = require('../src/lsp');
    startLSP();
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

    const pkgManager = require('../src/pkg');
    const projectRoot = pkgManager.resolveProjectRoot(process.cwd());

    if (!subcommand) {
        console.error('Usage: nux pkg <action> [name] [version]');
        console.log('');
        console.log('Actions:');
        console.log('  install <name>     Install a package (local or from registry)');
        console.log('  list               List installed packages');
        console.log('  remove <name>      Remove a package');
        console.log('  update             Update all packages');
        console.log('  search <query>     Search packages in registry');
        console.log('  info <name>        Show package info');
        console.log('  create <name>      Create a new package');
        console.log('  registry           Show registry info');
        console.log('');
        console.log('Registry packages use :: namespace:');
        console.log('  nux pkg install std::json');
        console.log('  nux pkg install std::http');
        console.log('  nux pkg search json');
        process.exit(1);
    }

    if (subcommand === 'install') {
        if (!pkgName) {
            console.error('Usage: nux pkg install <name> [version]');
            console.log('');
            console.log('Examples:');
            console.log('  nux pkg install std::json');
            console.log('  nux pkg install std::http@1.0.0');
            console.log('  nux pkg install ./path/to/package');
            process.exit(1);
        }
        if (!projectRoot) {
            console.error('No nuxpackage.json found. Run nux init first.');
            process.exit(1);
        }
        // Check if it's a registry package (contains ::)
        if (pkgName.includes('::')) {
            const parts = pkgName.split('::');
            const namespace = parts[0];
            const name = parts[1];
            const nameVersion = name.split('@');
            const pkgVersion = nameVersion[1] || version;
            const cleanName = nameVersion[0];
            pkgManager.installPackageFromRegistry(projectRoot, namespace, cleanName, pkgVersion)
                .then(result => console.log(result.message))
                .catch(err => console.error('Install failed:', err.message));
        } else {
            const result = pkgManager.installPackage(projectRoot, pkgName, version);
            console.log(result.message);
        }
    } else if (subcommand === 'list') {
        if (!projectRoot) {
            console.error('No nuxpackage.json found.');
            process.exit(1);
        }
        const packages = pkgManager.listPackages(projectRoot);
        console.log('Installed packages:');
        if (packages.length === 0) {
            console.log('  (none)');
        } else {
            for (const pkg of packages) {
                console.log(`  ${pkg.name}@${pkg.version}`);
            }
        }
    } else if (subcommand === 'remove') {
        if (!pkgName) {
            console.error('Usage: nux pkg remove <name>');
            process.exit(1);
        }
        if (!projectRoot) {
            console.error('No nuxpackage.json found.');
            process.exit(1);
        }
        const result = pkgManager.removePackage(projectRoot, pkgName);
        console.log(result.message);
    } else if (subcommand === 'update') {
        if (!projectRoot) {
            console.error('No nuxpackage.json found.');
            process.exit(1);
        }
        const result = pkgManager.updatePackages(projectRoot);
        console.log(result.message);
        if (result.updated) {
            for (const u of result.updated) {
                console.log(`  Updated ${u.name}: ${u.from} -> ${u.to}`);
            }
        }
    } else if (subcommand === 'search') {
        if (!pkgName) {
            console.error('Usage: nux pkg search <query>');
            process.exit(1);
        }
        console.log(`Search results for "${pkgName}":`);
        const localResults = pkgManager.searchPackages(pkgName);
        for (const pkg of localResults) {
            console.log(`  ${pkg.name} - ${pkg.description}`);
        }
        // Fetch registry results async
        pkgManager.searchPackagesAsync(pkgName).then(remoteResults => {
            const remoteOnly = remoteResults.filter(r => !localResults.find(l => l.name === r.name));
            for (const pkg of remoteOnly) {
                console.log(`  ${pkg.name} - ${pkg.description} [registry]`);
            }
            if (localResults.length === 0 && remoteOnly.length === 0) {
                console.log('  (no results)');
            }
        }).catch(() => {
            if (localResults.length === 0) console.log('  (no results)');
        });
    } else if (subcommand === 'info') {
        if (!pkgName) {
            console.error('Usage: nux pkg info <name>');
            process.exit(1);
        }
        if (!projectRoot) {
            console.error('No nuxpackage.json found.');
            process.exit(1);
        }
        const info = pkgManager.getPackageInfo(projectRoot, pkgName);
        if (info) {
            console.log(`Package: ${info.name}`);
            console.log(`Version: ${info.version}`);
            console.log(`Description: ${info.description || 'N/A'}`);
            console.log(`Main: ${info.main || 'N/A'}`);
            console.log(`Installed: ${info.installedAt || 'N/A'}`);
        } else {
            console.log(`Package ${pkgName} not installed`);
        }
    } else if (subcommand === 'create') {
        if (!pkgName) {
            console.error('Usage: nux pkg create <package-name> [description]');
            process.exit(1);
        }
        const description = args.slice(3).join(' ') || `Package ${pkgName}`;
        const pkgDir = path.resolve(pkgName);

        if (fs.existsSync(pkgDir)) {
            console.error(`Directory ${pkgName} already exists`);
            process.exit(1);
        }

        fs.mkdirSync(pkgDir, { recursive: true });

        const mainContent = pkgManager.generatePackageTemplate(pkgName, description);
        fs.writeFileSync(path.join(pkgDir, 'main.nux'), mainContent);

        const manifest = {
            name: pkgName,
            version: '0.1.0',
            description,
            main: 'main.nux',
            dependencies: {}
        };
        fs.writeFileSync(path.join(pkgDir, 'nuxpackage.json'), JSON.stringify(manifest, null, 2));

        console.log(`Created package ${pkgName} in ${pkgDir}`);
        console.log('  - main.nux: package source code');
        console.log('  - nuxpackage.json: package manifest');
        console.log('');
        console.log('Edit main.nux to add your functions.');
        console.log('Users can install with: nux pkg install ' + path.relative(process.cwd(), pkgDir));
    } else if (subcommand === 'registry') {
        console.log('nuxScript Package Registry');
        console.log('  URL: https://github.com/Sldark23/nux-pacotes');
        console.log('  API: https://raw.githubusercontent.com/Sldark23/nux-pacotes/master/api-packages.json');
        console.log('');
        console.log('Usage:');
        console.log('  nux pkg install std::<package>   Install from registry');
        console.log('  nux pkg search <query>           Search registry');
        console.log('');
        // Fetch and display available packages
        pkgManager.fetchRegistryIndex().then(index => {
            if (index && index.packages) {
                console.log(`Available packages (${index.packages.length}):`);
                for (const pkg of index.packages) {
                    console.log(`  ${pkg.name}@${pkg.version} - ${pkg.description}`);
                }
            }
        }).catch(() => {
            console.log('Could not fetch registry index. Check your internet connection.');
        });
    } else {
        console.error(`Unknown pkg action: ${subcommand}`);
        console.log('Available actions: install, list, remove, update, search, info, create, registry');
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
    print("Hello from nuxScript!")
    0
end

export main
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

\`\`\`bash
nux run main.nux
\`\`\`
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
