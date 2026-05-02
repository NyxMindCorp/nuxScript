/**
 * nuxScript Index
 */

const { Lexer } = require('./lexer');
const { Parser } = require('./parser');
const { Compiler } = require('./compiler');
const { VM } = require('./vm');
const nodes = require('./ast/nodes');

function execute(code) {
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const compiler = new Compiler(ast);
    const bytecode = compiler.compile();
    const vm = new VM(bytecode);
    return vm.run();
}

module.exports = {
    Lexer,
    Parser,
    Compiler,
    VM,
    nodes,
    execute,
};
