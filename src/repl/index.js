const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Lexer } = require('../lexer');
const { Parser } = require('../parser');
const { Compiler } = require('../compiler');
const { VM, builtins } = require('../vm');
const { loadModule } = require('../module');

function startREPL(options = {}) {
  const history = [];
  let historyIndex = -1;
  let buffer = '';
  let parenDepth = 0;
  let braceDepth = 0;

  console.log(`nuxScript REPL v${require('../../package.json').version}`);
  console.log('Type ".help" for help, ".exit" to quit');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: buffer ? '... ' : 'nux> '
  });

  rl.on('line', (line) => {
    if (line.startsWith('.')) {
      handleDotCommand(line.trim(), rl);
      return;
    }

    buffer += (buffer ? '\n' : '') + line;

    for (const ch of line) {
      if (ch === '(') parenDepth++;
      if (ch === ')') parenDepth--;
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    if (parenDepth <= 0 && braceDepth <= 0 && buffer.trim()) {
      try {
        const result = evaluate(buffer);
        if (result !== undefined) {
          console.log('=>', formatResult(result));
        }
      } catch (err) {
        console.error('Error:', err.message);
      }
      buffer = '';
      parenDepth = 0;
      braceDepth = 0;
    }

    rl.setPrompt(buffer ? '... ' : 'nux> ');
    rl.prompt();
  });

  rl.on('close', () => {
    console.log();
    process.exit(0);
  });

  rl.prompt();

  function evaluate(code) {
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
    return vm.run();
  }

  function formatResult(val) {
    if (val === null) return 'nil';
    if (val === undefined) return 'nil';
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'function') return '<function>';
    if (Array.isArray(val)) {
      const items = val.map(v => formatResult(v)).join(', ');
      return `[${items}]`;
    }
    if (typeof val === 'object') {
      if (val.__variant__) return `${val.__variant__}(${formatResult(val.value)})`;
      if (val.__struct__) {
        const fields = Object.entries(val)
          .filter(([k]) => !k.startsWith('__'))
          .map(([k, v]) => `${k}: ${formatResult(v)}`)
          .join(', ');
        return `${val.__struct__}{${fields}}`;
      }
      try { return JSON.stringify(val); }
      catch { return String(val); }
    }
    return String(val);
  }

  function handleDotCommand(cmd, rl) {
    const parts = cmd.split(/\s+/);
    switch (parts[0]) {
      case '.help':
        console.log('Commands:');
        console.log('  .help      Show this help');
        console.log('  .exit      Exit REPL');
        console.log('  .clear     Clear screen');
        console.log('  .history   Show command history');
        break;
      case '.exit':
        rl.close();
        break;
      case '.clear':
        console.clear();
        break;
      case '.history':
        console.log('History:');
        for (let i = 0; i < history.length; i++) {
          console.log(`  ${i + 1}: ${history[i]}`);
        }
        break;
      default:
        console.log(`Unknown command: ${parts[0]}. Type .help`);
    }
  }
}

module.exports = { startREPL };
