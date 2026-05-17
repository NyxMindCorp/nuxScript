const { Lexer } = require('../lexer');
const { Parser } = require('../parser');
const { TypeChecker, checkTypes } = require('../typechecker');

let nextId = 1;
let documents = new Map();
let diagnostics = new Map();

function startLSP() {
  let buffer = '';
  const stdin = process.stdin;

  stdin.on('data', (chunk) => {
    buffer += chunk.toString();
    while (true) {
      const match = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!match) break;

      const contentLength = parseInt(match[1], 10);
      const headerEnd = match.index + match[0].length;
      const messageStart = headerEnd;

      if (buffer.length < messageStart + contentLength) break;

      const content = buffer.slice(messageStart, messageStart + contentLength);
      buffer = buffer.slice(messageStart + contentLength);

      try {
        const msg = JSON.parse(content);
        handleMessage(msg);
      } catch (err) {
        console.error('LSP parse error:', err.message);
      }
    }
  });

  stdin.on('end', () => process.exit(0));
}

function sendMessage(msg) {
  const body = JSON.stringify(msg);
  const header = `Content-Length: ${Buffer.byteLength(body, 'utf-8')}\r\n\r\n`;
  process.stdout.write(header + body);
}

function handleMessage(msg) {
  const method = msg.method;
  const params = msg.params;

  switch (method) {
    case 'initialize':
      sendMessage({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          capabilities: {
            textDocumentSync: { openClose: true, change: 1 },
            completionProvider: { triggerCharacters: ['.', ':', ':'] },
            hoverProvider: true,
            definitionProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true
          },
          serverInfo: { name: 'nuxScript LSP', version: '0.1.0' }
        }
      });
      break;

    case 'initialized':
      break;

    case 'textDocument/didOpen':
      onDidOpen(params);
      break;

    case 'textDocument/didChange':
      onDidChange(params);
      break;

    case 'textDocument/didClose':
      onDidClose(params);
      break;

    case 'textDocument/completion':
      onCompletion(msg.id, params);
      break;

    case 'textDocument/hover':
      onHover(msg.id, params);
      break;

    case 'textDocument/definition':
      onDefinition(msg.id, params);
      break;

    case 'textDocument/documentSymbol':
      onDocumentSymbol(msg.id, params);
      break;

    case 'shutdown':
      sendMessage({ jsonrpc: '2.0', id: msg.id, result: null });
      break;

    case 'exit':
      process.exit(0);
      break;

    default:
      if (msg.id) {
        sendMessage({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${method}` } });
      }
  }
}

function onDidOpen(params) {
  const uri = params.textDocument.uri;
  const text = params.textDocument.text;
  documents.set(uri, text);
  validateDocument(uri, text);
}

function onDidChange(params) {
  const uri = params.textDocument.uri;
  const text = params.contentChanges[0].text;
  documents.set(uri, text);
  validateDocument(uri, text);
}

function onDidClose(params) {
  documents.delete(params.textDocument.uri);
  diagnostics.delete(params.textDocument.uri);
}

function validateDocument(uri, text) {
  try {
    const lexer = new Lexer(text);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const result = checkTypes(ast);

    const diags = [];

    for (const err of result.errors) {
      diags.push({
        range: errorToRange(err),
        severity: 1,
        message: err.message,
        source: 'nuxScript'
      });
    }

    for (const warn of result.warnings) {
      diags.push({
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 }
        },
        severity: 2,
        message: typeof warn === 'string' ? warn : warn.message || 'Warning',
        source: 'nuxScript'
      });
    }

    diagnostics.set(uri, diags);

    sendMessage({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri, diagnostics: diags }
    });
  } catch (err) {
    const diags = [{
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
      severity: 1,
      message: err.message,
      source: 'nuxScript'
    }];

    sendMessage({
      jsonrpc: '2.0',
      method: 'textDocument/publishDiagnostics',
      params: { uri, diagnostics: diags }
    });
  }
}

function errorToRange(err) {
  if (err.line !== undefined) {
    return {
      start: { line: err.line - 1, character: 0 },
      end: { line: err.line - 1, character: 1 }
    };
  }
  return {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 1 }
  };
}

function onCompletion(id, params) {
  const uri = params.textDocument.uri;
  const text = documents.get(uri);
  if (!text) {
    sendMessage({ jsonrpc: '2.0', id, result: [] });
    return;
  }

  const keywords = [
    'fn', 'let', 'let!', 'var', 'const', 'if', 'elsif', 'else', 'end',
    'for', 'in', 'while', 'loop', 'break', 'continue',
    'match', 'when', 'then', 'is', 'as',
    'try', 'catch', 'throw', 'return',
    'spawn', 'await', 'yield', 'resume', 'async',
    'struct', 'enum', 'trait', 'impl', 'type', 'alias',
    'pub', 'priv', 'use', 'mod', 'from', 'extern',
    'true', 'false', 'nil',
    'Option', 'Result', 'Some', 'None', 'Ok', 'Err',
    'and', 'or', 'not', 'fiber', 'loop'
  ];

  const builtins = [
    'print', 'len', 'push', 'pop', 'range', 'assert', 'error',
    'Ok', 'Err', 'Some', 'None', 'type', 'math', 'list', 'string', 'map', 'filter',
    'readFile', 'writeFile', 'sleep', 'spawn',
    'select', 'where', 'order_by', 'group_by', 'join',
    'count', 'sum', 'avg', 'min', 'max',
    'tuple', 'set', 'dict', 'tree', 'heap', 'graph',
    'pipe', 'compose', 'extern_loader', 'fiber_spawn',
    'fiber_status', 'fiber_resume_with',
    'reflect', 'type_of', 'is_type', 'brand', 'newtype',
    'macro_define', 'macro_expand', 'regex_match', 'regex_test',
  ];

  const items = [
    ...keywords.map(k => ({ label: k, kind: 14, detail: 'keyword' })),
    ...builtins.map(b => ({ label: b, kind: 3, detail: 'built-in function' }))
  ];

  sendMessage({ jsonrpc: '2.0', id, result: { isIncomplete: false, items } });
}

function onHover(id, params) {
  const uri = params.textDocument.uri;
  const text = documents.get(uri);
  if (!text) {
    sendMessage({ jsonrpc: '2.0', id, result: null });
    return;
  }

  const pos = params.position;
  const lines = text.split('\n');
  const line = lines[pos.line] || '';
  const wordMatch = line.slice(pos.character).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
  const word = wordMatch ? wordMatch[0] : null;

  if (!word) {
    sendMessage({ jsonrpc: '2.0', id, result: null });
    return;
  }

  const keywords = ['fn', 'let', 'if', 'match', 'for', 'while', 'struct', 'enum', 'trait', 'impl', 'try', 'catch', 'return', 'true', 'false', 'nil', 'spawn', 'await', 'extern', 'use', 'mod', 'export', 'import', 'pub', 'priv', 'yield', 'resume', 'fiber', 'loop', 'break', 'continue'];
  const isKeyword = keywords.includes(word);

  let content;
  if (isKeyword) {
    const keywordDocs = {
      'fn': 'Declare a function\n```nux\nfn add(a :: Int, b :: Int) -> Int\na + b\nend\n```',
      'trait': 'Define a trait (interface)\n```nux\ntrait Show\n    fn to_string(self) -> String\nend\n```',
      'impl': 'Implement a trait for a type\n```nux\nimpl Show for Point\n    fn to_string(self) -> String\n        self.x.to_string() + ", " + self.y.to_string()\n    end\nend\n```',
      'extern': 'Declare an external (FFI) function\n```nux\nextern js readFileSync(path :: String) -> String\n```',
      'match': 'Pattern matching expression\n```nux\nmatch value\n    pattern -> expr\n    _ -> default\nend\n```',
      'use': 'Import a module\n```nux\nuse std::io\nuse { readFile, writeFile } from "fs"\n```',
    };
    content = `**${word}** - nuxScript keyword\n\n${keywordDocs[word] || ''}`;
  } else {
    // Try to find type info using the lexer+parser
    try {
      const lexer = new Lexer(text);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      const result = checkTypes(ast);
      content = `**${word}** - identifier`;
    } catch (e) {
      content = `**${word}** - identifier`;
    }
  }

  sendMessage({
    jsonrpc: '2.0',
    id,
    result: {
      contents: { kind: 'markdown', value: content },
      range: {
        start: { line: pos.line, character: Math.max(0, pos.character - word.length) },
        end: { line: pos.line, character: pos.character }
      }
    }
  });
}

function onDefinition(id, params) {
  const uri = params.textDocument.uri;
  const text = documents.get(uri);
  if (!text) {
    sendMessage({ jsonrpc: '2.0', id, result: null });
    return;
  }

  const pos = params.position;
  const lines = text.split('\n');
  const line = lines[pos.line] || '';
  const wordMatch = line.slice(pos.character).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
  const word = wordMatch ? wordMatch[0] : null;

  if (!word) {
    sendMessage({ jsonrpc: '2.0', id, result: null });
    return;
  }

  // Search for definition in the document
  for (let i = 0; i < lines.length; i++) {
    const fnDef = new RegExp(`^\\s*fn\\s+${word}\\s*\\(`);
    const letDef = new RegExp(`^\\s*(?:let|let!|var|const)\\s+${word}\\b`);
    const structDef = new RegExp(`^\\s*struct\\s+${word}\\b`);
    const enumDef = new RegExp(`^\\s*enum\\s+${word}\\b`);
    const traitDef = new RegExp(`^\\s*trait\\s+${word}\\b`);

    if (fnDef.test(lines[i]) || letDef.test(lines[i]) ||
        structDef.test(lines[i]) || enumDef.test(lines[i]) ||
        traitDef.test(lines[i])) {
      sendMessage({
        jsonrpc: '2.0',
        id,
        result: {
          uri,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: lines[i].length }
          }
        }
      });
      return;
    }
  }

  sendMessage({ jsonrpc: '2.0', id, result: null });
}

function onDocumentSymbol(id, params) {
  const uri = params.textDocument.uri;
  const text = documents.get(uri);
  if (!text) {
    sendMessage({ jsonrpc: '2.0', id, result: [] });
    return;
  }

  const symbols = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const fnMatch = lines[i].match(/^\s*fn\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (fnMatch) {
      symbols.push({
        name: fnMatch[1],
        kind: 12,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: lines[i].length }
        },
        selectionRange: {
          start: { line: i, character: lines[i].indexOf(fnMatch[1]) },
          end: { line: i, character: lines[i].indexOf(fnMatch[1]) + fnMatch[1].length }
        }
      });
    }

    const letMatch = lines[i].match(/^\s*(?:let|let!|var|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (letMatch) {
      symbols.push({
        name: letMatch[1],
        kind: 13,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: lines[i].length }
        },
        selectionRange: {
          start: { line: i, character: lines[i].indexOf(letMatch[1]) },
          end: { line: i, character: lines[i].indexOf(letMatch[1]) + letMatch[1].length }
        }
      });
    }
  }

  sendMessage({ jsonrpc: '2.0', id, result: symbols });
}

module.exports = { startLSP };
