/**
 * nuxScript External Code Parser
 * Analisa código JavaScript/TypeScript externo
 */

class ExternalParser {
    constructor() {
        this.tokens = [];
        this.current = 0;
    }

    tokenizeJS(code) {
        const tokens = [];
        let i = 0;
        
        while (i < code.length) {
            const char = code[i];
            
            if (/\s/.test(char)) {
                i++;
                continue;
            }
            
            if (char === '/' && code[i + 1] === '/') {
                while (i < code.length && code[i] !== '\n') i++;
                continue;
            }
            
            if (char === '/' && code[i + 1] === '*') {
                i += 2;
                while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
                i += 2;
                continue;
            }
            
            if (/[0-9]/.test(char)) {
                let num = '';
                while (i < code.length && /[0-9.]/.test(code[i])) {
                    num += code[i++];
                }
                tokens.push({ type: 'NUMBER', value: parseFloat(num) });
                continue;
            }
            
            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                let value = '';
                i++;
                while (i < code.length && code[i] !== quote) {
                    if (code[i] === '\\') {
                        value += code[i++];
                    }
                    value += code[i++];
                }
                i++;
                tokens.push({ type: 'STRING', value, raw: quote + value + quote });
                continue;
            }
            
            if (/[a-zA-Z_$]/.test(char)) {
                let name = '';
                while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
                    name += code[i++];
                }
                const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'extends', 'new', 'this', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'from', 'default', 'type', 'interface', 'enum', 'struct'];
                tokens.push({ type: keywords.includes(name) ? 'KEYWORD' : 'IDENT', value: name });
                continue;
            }
            
            const operators = {
                '+': 'PLUS', '-': 'MINUS', '*': 'MULT', '/': 'DIV', '%': 'MOD',
                '=': 'ASSIGN', '==': 'EQ', '===': 'STRICT_EQ',
                '!=': 'NEQ', '!==': 'STRICT_NEQ',
                '<': 'LT', '>': 'GT', '<=': 'LTE', '>=': 'GTE',
                '&&': 'AND', '||': 'OR', '!': 'NOT',
                '?': 'QUESTION', ':': 'COLON',
                '(': 'LPAREN', ')': 'RPAREN',
                '[': 'LBRACKET', ']': 'RBRACKET',
                '{': 'LBRACE', '}': 'RBRACE',
                '.': 'DOT', ',': 'COMMA', ';': 'SEMI',
                '=>': 'ARROW', '...': 'SPREAD',
            };
            
            for (const [op, type] of Object.entries(operators)) {
                if (code.slice(i, i + op.length) === op) {
                    tokens.push({ type, value: op });
                    i += op.length;
                    break;
                }
            }
            
            if (!tokens.length || tokens[tokens.length - 1].type !== type) {
                i++;
            }
        }
        
        return tokens;
    }

    parseJS(code) {
        const tokens = this.tokenizeJS(code);
        return this.buildAST(tokens);
    }

    buildAST(tokens) {
        this.tokens = tokens;
        this.current = 0;
        
        const statements = [];
        while (!this.isAtEnd()) {
            statements.push(this.parseStatement());
        }
        
        return { type: 'Program', body: statements };
    }

    parseStatement() {
        const token = this.peek();
        
        if (token.value === 'const' || token.value === 'let' || token.value === 'var') {
            return this.parseVariableDeclaration();
        }
        
        if (token.value === 'function') {
            return this.parseFunctionDeclaration();
        }
        
        if (token.value === 'class') {
            return this.parseClassDeclaration();
        }
        
        if (token.value === 'async') {
            this.advance();
            return this.parseFunctionDeclaration();
        }
        
        if (token.value === 'if') {
            return this.parseIfStatement();
        }
        
        if (token.value === 'for') {
            return this.parseForStatement();
        }
        
        if (token.value === 'while') {
            return this.parseWhileStatement();
        }
        
        if (token.value === 'return') {
            return this.parseReturnStatement();
        }
        
        if (token.value === 'throw') {
            return this.parseThrowStatement();
        }
        
        if (token.value === 'try') {
            return this.parseTryStatement();
        }
        
        return this.parseExpression();
    }

    parseVariableDeclaration() {
        const kind = this.advance().value;
        const name = this.advance().value;
        
        let value = null;
        if (this.peek().value === '=') {
            this.advance();
            value = this.parseExpression();
        }
        
        return { type: kind === 'const' ? 'ConstDeclaration' : 'LetDeclaration', name, value };
    }

    parseFunctionDeclaration() {
        this.advance();
        const name = this.advance().value;
        
        const params = this.parseParameters();
        
        const body = this.parseBlock();
        
        return { type: 'FnDeclaration', name, params, body };
    }

    parseClassDeclaration() {
        this.advance();
        const name = this.advance().value;
        
        let extends_ = null;
        if (this.peek().value === 'extends') {
            this.advance();
            extends_ = this.advance().value;
        }
        
        const body = this.parseBlock();
        
        return { type: 'ClassDeclaration', name, extends: extends_, body };
    }

    parseParameters() {
        this.expect('LPAREN');
        
        const params = [];
        while (!this.check('RPAREN')) {
            if (params.length > 0) {
                this.expect('COMMA');
            }
            params.push({
                name: this.advance().value,
                typeAnnotation: null,
            });
        }
        
        this.expect('RPAREN');
        return params;
    }

    parseBlock() {
        this.expect('LBRACE');
        
        const body = [];
        while (!this.check('RBRACE')) {
            body.push(this.parseStatement());
        }
        
        this.expect('RBRACE');
        return { type: 'Block', body };
    }

    parseIfStatement() {
        this.advance();
        this.expect('LPAREN');
        const condition = this.parseExpression();
        this.expect('RPAREN');
        const thenBranch = this.parseBlock();
        
        let elseBranch = null;
        if (this.peek().value === 'else') {
            this.advance();
            elseBranch = this.parseBlock();
        }
        
        return { type: 'IfExpr', condition, thenBranch, elseBranch };
    }

    parseForStatement() {
        this.advance();
        this.expect('LPAREN');
        
        let init = null;
        if (!this.check('SEMI')) {
            init = this.parseStatement();
        }
        
        this.expect('SEMI');
        const condition = this.check('SEMI') ? { type: 'BooleanLiteral', value: true } : this.parseExpression();
        this.expect('SEMI');
        const update = this.parseExpression();
        
        this.expect('RPAREN');
        const body = this.parseBlock();
        
        return { type: 'ForExpr', init, condition, update, body };
    }

    parseWhileStatement() {
        this.advance();
        this.expect('LPAREN');
        const condition = this.parseExpression();
        this.expect('RPAREN');
        const body = this.parseBlock();
        
        return { type: 'WhileExpr', condition, body };
    }

    parseReturnStatement() {
        this.advance();
        let value = null;
        if (!this.check('SEMI') && !this.check('LBRACE')) {
            value = this.parseExpression();
        }
        
        return { type: 'ReturnStatement', value };
    }

    parseThrowStatement() {
        this.advance();
        const expr = this.parseExpression();
        
        return { type: 'ThrowExpr', expr };
    }

    parseTryStatement() {
        this.advance();
        const tryBlock = this.parseBlock();
        
        const catches = [];
        while (this.peek().value === 'catch') {
            this.advance();
            this.expect('LPAREN');
            const variable = this.advance().value;
            this.expect('RPAREN');
            const body = this.parseBlock();
            catches.push({ variable, body });
        }
        
        let finallyBlock = null;
        if (this.peek().value === 'finally') {
            this.advance();
            finallyBlock = this.parseBlock();
        }
        
        return { type: 'TryExpr', tryBlock, catches, finallyBlock };
    }

    parseExpression() {
        return this.parseAssignment();
    }

    parseAssignment() {
        const left = this.parseOr();
        
        if (this.check('ASSIGN')) {
            this.advance();
            const right = this.parseAssignment();
            return { type: 'BinaryExpr', op: '=', left, right };
        }
        
        return left;
    }

    parseOr() {
        let left = this.parseAnd();
        
        while (this.check('OR')) {
            const op = this.advance().value;
            const right = this.parseAnd();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseAnd() {
        let left = this.parseEquality();
        
        while (this.check('AND')) {
            const op = this.advance().value;
            const right = this.parseEquality();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseEquality() {
        let left = this.parseComparison();
        
        while (this.check('EQ', 'NEQ', 'STRICT_EQ', 'STRICT_NEQ')) {
            const op = this.advance().value;
            const right = this.parseComparison();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseComparison() {
        let left = this.parseAdditive();
        
        while (this.check('LT', 'GT', 'LTE', 'GTE')) {
            const op = this.advance().value;
            const right = this.parseAdditive();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseAdditive() {
        let left = this.parseMultiplicative();
        
        while (this.check('PLUS', 'MINUS')) {
            const op = this.advance().value;
            const right = this.parseMultiplicative();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseMultiplicative() {
        let left = this.parseUnary();
        
        while (this.check('MULT', 'DIV', 'MOD')) {
            const op = this.advance().value;
            const right = this.parseUnary();
            left = { type: 'BinaryExpr', op, left, right };
        }
        
        return left;
    }

    parseUnary() {
        if (this.check('NOT', 'MINUS')) {
            const op = this.advance().value;
            const operand = this.parseUnary();
            return { type: 'UnaryExpr', op, operand };
        }
        
        return this.parseCall();
    }

    parseCall() {
        let expr = this.parsePrimary();
        
        while (this.check('LPAREN', 'DOT')) {
            if (this.check('DOT')) {
                this.advance();
                const property = this.advance().value;
                
                if (this.check('LPAREN')) {
                    const args = this.parseArguments();
                    expr = { type: 'CallExpr', receiver: expr, name: property, args };
                } else {
                    expr = { type: 'MemberExpr', object: expr, property };
                }
            } else {
                const args = this.parseArguments();
                expr = { type: 'CallExpr', name: expr.name || expr.property, args };
            }
        }
        
        return expr;
    }

    parseArguments() {
        this.expect('LPAREN');
        
        const args = [];
        while (!this.check('RPAREN')) {
            if (args.length > 0) {
                this.expect('COMMA');
            }
            args.push(this.parseExpression());
        }
        
        this.expect('RPAREN');
        return args;
    }

    parsePrimary() {
        const token = this.advance();
        
        if (token.type === 'NUMBER') {
            return { type: 'NumberLiteral', value: token.value };
        }
        
        if (token.type === 'STRING') {
            return { type: 'StringLiteral', value: token.value, raw: token.raw };
        }
        
        if (token.value === 'true' || token.value === 'false') {
            return { type: 'BooleanLiteral', value: token.value === 'true' };
        }
        
        if (token.value === 'null') {
            return { type: 'NullLiteral' };
        }
        
        if (token.value === 'this') {
            return { type: 'Identifier', name: 'this' };
        }
        
        if (token.type === 'IDENT') {
            return { type: 'Identifier', name: token.value };
        }
        
        if (token.value === 'function') {
            return this.parseFunctionDeclaration();
        }
        
        if (token.value === 'new') {
            const name = this.advance().value;
            const args = this.check('LPAREN') ? this.parseArguments() : [];
            return { type: 'CallExpr', name: 'new ' + name, args };
        }
        
        if (token.value === '[') {
            const elements = [];
            while (!this.check(']')) {
                if (elements.length > 0) {
                    this.expect('COMMA');
                }
                elements.push(this.parseExpression());
            }
            this.expect('RBRACKET');
            return { type: 'ListLiteral', elements };
        }
        
        if (token.value === '{') {
            return this.parseMapOrBlock();
        }
        
        if (token.value === '(') {
            const expr = this.parseExpression();
            this.expect(')');
            return expr;
        }
        
        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }

    parseMapOrBlock() {
        const props = [];
        
        while (!this.check('}')) {
            if (props.length > 0) {
                this.expect('COMMA');
            }
            
            const key = this.parseExpression();
            this.expect(':');
            const value = this.parseExpression();
            props.push({ key, value });
        }
        
        this.expect('}');
        return { type: 'MapLiteral', entries: props };
    }

    check(...types) {
        if (this.isAtEnd()) return false;
        const token = this.peek();
        return types.includes(token.value) || types.includes(token.type);
    }

    expect(type) {
        if (this.check(type)) {
            return this.advance();
        }
        throw new Error(`Expected ${type}, got ${JSON.stringify(this.peek())}`);
    }

    advance() {
        if (!this.isAtEnd()) {
            this.current++;
        }
        return this.tokens[this.current - 1];
    }

    peek() {
        return this.tokens[this.current];
    }

    isAtEnd() {
        return this.current >= this.tokens.length;
    }
}

function parseJS(code) {
    const parser = new ExternalParser();
    return parser.parseJS(code);
}

module.exports = { ExternalParser, parseJS };