const fs = require('fs');
const path = require('path');
const { Lexer } = require('../lexer');
const { Parser } = require('../parser');
const { Compiler } = require('../compiler');
const { VM, builtins } = require('../vm');
const { resolveProjectRoot, resolveModulePath, readManifest } = require('../pkg');

const moduleCache = new Map();

function compileModule(code, filename) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const exportNames = [];
  const moduleStatements = [];
  const imports = [];

  for (const node of ast) {
    if (node.type === 'UseStatement') {
      imports.push(node);
    } else if (node.type === 'ExportStatement') {
      exportNames.push(node.name);
    } else if (node.type === 'ImportStatement') {
      imports.push(node);
    } else {
      moduleStatements.push(node);
    }
  }

  const compiler = new Compiler(moduleStatements);
  const bytecode = compiler.compile();

  return { bytecode, exportNames, imports, ast };
}

function findModuleFile(name, baseDir) {
  if (name.startsWith('./') || name.startsWith('../') || path.isAbsolute(name)) {
    const resolved = path.resolve(baseDir, name);
    if (fs.existsSync(resolved)) return resolved;
    if (fs.existsSync(resolved + '.nux')) return resolved + '.nux';
    return null;
  }

  const projectRoot = resolveProjectRoot(baseDir);
  if (projectRoot) {
    const pkgPath = resolveModulePath(projectRoot, name);
    if (pkgPath) return pkgPath;
  }

  const inNodeModules = path.join(baseDir, 'node_modules', name, 'index.nux');
  if (fs.existsSync(inNodeModules)) return inNodeModules;

  return null;
}

function loadModule(name, callerDir) {
  const moduleFile = findModuleFile(name, callerDir);
  if (!moduleFile) {
    throw new Error(`Module not found: ${name}`);
  }

  const resolved = path.resolve(moduleFile);
  if (moduleCache.has(resolved)) {
    return moduleCache.get(resolved);
  }

  const code = fs.readFileSync(resolved, 'utf-8');
  const compiled = compileModule(code, resolved);

  for (const imp of compiled.imports) {
    const modulePath = imp.path || imp.source || imp.name;
    loadModule(modulePath, path.dirname(resolved));
  }

  const vm = new VM(compiled.bytecode);
  for (const [key, value] of Object.entries(builtins)) {
    vm.variables.set(key, value);
  }

  vm.variables.set('use', (modName) => {
    const exports = loadModule(modName, path.dirname(resolved));
    for (const [key, value] of Object.entries(exports)) {
      vm.variables.set(key, value);
    }
    return exports;
  });

  vm.variables.set('exports', {});

  vm.run();

  const exports = {};
  for (const name of compiled.exportNames) {
    if (vm.variables.has(name)) {
      exports[name] = vm.variables.get(name);
    }
  }

  moduleCache.set(resolved, exports);
  return exports;
}

function evaluateCode(code, context = {}) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const compiler = new Compiler(ast);
  const bytecode = compiler.compile();

  const vm = new VM(bytecode);
  for (const [key, value] of Object.entries(builtins)) {
    vm.variables.set(key, value);
  }

  vm.variables.set('use', (modName) => {
    const exports = loadModule(modName, process.cwd());
    for (const [key, value] of Object.entries(exports)) {
      vm.variables.set(key, value);
    }
    return exports;
  });

  for (const [key, value] of Object.entries(context)) {
    vm.variables.set(key, value);
  }

  return vm.run();
}

function clearCache() {
  moduleCache.clear();
}

module.exports = {
  compileModule,
  loadModule,
  evaluateCode,
  clearCache,
  moduleCache,
  findModuleFile
};
