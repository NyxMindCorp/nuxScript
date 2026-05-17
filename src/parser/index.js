/**

 * nuxScript Parser

 * Recursive descent parser that builds an AST

 */

const {
    NumberLiteral,
    StringLiteral,
    BooleanLiteral,
    NullLiteral,
    ListLiteral,
    MapLiteral,
    ListComp,
    TemplateLiteral,
    Identifier,
    LetDeclaration,
    VarDeclaration,
    ConstDeclaration,
    Param,
    FnDeclaration,
    StructDeclaration,
    Property,
    EnumVariant,
    EnumDeclaration,
    BinaryExpr,
    UnaryExpr,
    CallExpr,
    IndexExpr,
    MemberExpr,
    PipeExpr,
    MatchCase,
    MatchExpr,
    IfExpr,
    ForExpr,
    WhileExpr,
    Block,
    LambdaExpr,
    SpawnExpr,
    AwaitExpr,
    FiberLiteral,
    TryExpr,
    ThrowExpr,
    ReturnStatement,
    BreakStatement,
    ContinueStatement,
    TypeAnnotation,
    UseStatement,
    ExportStatement,
    ImportStatement,
} = require('../ast/nodes');

class Parser {

    constructor(tokens) {

        this.tokens = tokens;

        this.pos = 0;

    }

    peek(offset = 0) {

        return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1];

    }

    advance() {

        return this.tokens[this.pos++];

    }

    isAtEnd() {

        return this.peek().type === 'EOF';

    }

    check(type) {

        return this.peek().type === type;

    }

    match(...types) {

        if (types.includes(this.peek().type)) {

            return this.advance();

        }

        return null;

    }

    expect(type, message) {

        if (this.check(type)) return this.advance();

        throw new Error(`${message} at ${this.peek().line}:${this.peek().col}. Got '${this.peek().value}'`);

    }

    // --- Program ---

    parse() {

        const statements = [];

        while (!this.isAtEnd()) {

            const stmt = this.parseStatement();

            if (stmt) statements.push(stmt);

        }

        return statements;

    }

    parseStatement() {

        if (this.check('END')) {

            this.advance();

            return null;

        }

        if (this.check('FN')) return this.parseFnDeclaration();

        if (this.check('LET')) return this.parseLetDeclaration();

        if (this.check('LETMUT')) return this.parseLetMutDeclaration();

        if (this.check('VAR')) return this.parseVarDeclaration();

        if (this.check('CONST')) return this.parseConstDeclaration();

        if (this.check('STRUCT')) return this.parseStructDeclaration();

        if (this.check('ENUM')) return this.parseEnumDeclaration();

        if (this.check('TRAIT')) return this.parseTraitDeclaration();

        if (this.check('IMPL')) return this.parseImplDeclaration();

        if (this.check('EXTERN')) return this.parseExternDeclaration();

        if (this.check('USE')) return this.parseUseStatement();

        if (this.check('RETURN')) return this.parseReturnStatement();

        if (this.check('BREAK')) return this.parseBreakStatement();

        if (this.check('CONTINUE')) return this.parseContinueStatement();

        if (this.check('THROW')) return this.parseThrowStatement();
        if (this.check('YIELD')) return this.parseYieldStatement();
        if (this.check('EXPORT')) return this.parseExportStatement();
        if (this.check('IMPORT')) return this.parseImportStatement();

        return this.parseExprStatement();

    }

    // --- Declarations ---

    parseFnDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected function name').value;

        this.expect('LPAREN', 'Expected (');

        const params = this.parseParams();

        this.expect('RPAREN', 'Expected )');

        let returnType = null;

        if (this.check('ARROW') || this.check('DOUBLE_COLON')) {

            returnType = this.parseTypeAnnotation();

        }

        const body = this.parseBlock();

        return new FnDeclaration(name, params, body, returnType);

    }

    parseParams() {

        const params = [];

        while (!this.check('RPAREN') && !this.isAtEnd()) {

            const name = this.expect('IDENT', 'Expected parameter name').value;

            let typeAnnotation = null;

            if (this.check('DOUBLE_COLON')) {

                this.advance();

                typeAnnotation = this.parseType();

            }

            let defaultValue = null;

            if (this.check('ASSIGN')) {

                this.advance();

                defaultValue = this.parseExpr();

            }

            params.push(new Param(name, typeAnnotation, defaultValue));

            if (!this.check('RPAREN')) {

                this.expect('COMMA', 'Expected , between parameters');

            }

        }

        return params;

    }

    parseLetDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected variable name').value;

        let typeAnnotation = null;

        if (this.check('DOUBLE_COLON')) {

            this.advance();

            typeAnnotation = this.parseType();

        }

        this.expect('ASSIGN', 'Expected =');

        const value = this.parseExpr();

        return new LetDeclaration(name, value, false, typeAnnotation);

    }

    parseLetMutDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected variable name').value;

        let typeAnnotation = null;

        if (this.check('DOUBLE_COLON')) {

            this.advance();

            typeAnnotation = this.parseType();

        }

        this.expect('ASSIGN', 'Expected =');

        const value = this.parseExpr();

        return new LetDeclaration(name, value, true, typeAnnotation);

    }

    parseVarDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected variable name').value;

        this.expect('ASSIGN', 'Expected =');

        const value = this.parseExpr();

        return new VarDeclaration(name, value);

    }

    parseConstDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected constant name').value;

        this.expect('ASSIGN', 'Expected =');

        const value = this.parseExpr();

        return new ConstDeclaration(name, value);

    }

    parseReturnStatement() {

        this.advance();

        let value = null;

        if (!this.check('END') && !this.check('ELSE') && !this.check('ELSIF') && !this.check('CATCH') && !this.check('RBRACE') && !this.isAtEnd()) {

            value = this.parseExpr();

        }

        return new ReturnStatement(value);

    }

    parseBreakStatement() {

        this.advance();

        return new BreakStatement();

    }

    parseContinueStatement() {

        this.advance();

        return new ContinueStatement();
    }

    parseThrowStatement() {

        this.advance();

        const arg = this.parseExpr();

        return new ThrowExpr(arg);

    }

    parseYieldStatement() {
        this.advance();
        let value = null;
        if (!this.check('SEMICOLON') && !this.check('RBRACE') && !this.isAtEnd()) {
            value = this.parseExpr();
        }
        return new YieldExpr(value);
    }

    parseExportStatement() {
        this.advance();
        const name = this.expect('IDENT', 'Expected export name').value;
        return new ExportStatement(name, null);
    }

    parseImportStatement() {
        this.advance();
        const names = [];
        let source = null;
        if (this.check('STRING')) {
            source = this.advance().value;
        } else {
            while (!this.check('FROM') && !this.isAtEnd() && !this.check('STRING')) {
                names.push(this.expect('IDENT', 'Expected import name').value);
                if (this.check('COMMA')) this.advance();
            }
            if (this.check('FROM')) {
                this.advance();
                source = this.expect('STRING', 'Expected module path').value;
            }
        }
        return new ImportStatement(source, names);
    }

    parseStructDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected struct name').value;

        const properties = [];

        while (!this.check('END') && !this.isAtEnd()) {

            const propName = this.expect('IDENT', 'Expected property name').value;

            this.expect('DOUBLE_COLON', 'Expected ::');

            const typeAnnotation = this.parseType();

            properties.push(new Property(propName, typeAnnotation));

        }

        this.expect('END', 'Expected end');

        return new StructDeclaration(name, properties);

    }

    parseEnumDeclaration() {

        this.advance();

        const name = this.expect('IDENT', 'Expected enum name').value;

        const variants = [];

        while (!this.check('END') && !this.isAtEnd()) {

            const variantName = this.expect('IDENT', 'Expected variant name').value;

            let fields = [];

            if (this.check('LPAREN')) {

                this.advance();

                while (!this.check('RPAREN') && !this.isAtEnd()) {

                    const fieldName = this.expect('IDENT', 'Expected field name').value;

                    this.expect('DOUBLE_COLON', 'Expected ::');

                    const fieldType = this.parseType();

                    fields.push(new Param(fieldName, fieldType));

                    if (!this.check('RPAREN')) {

                        this.expect('COMMA', 'Expected , between fields');

                    }

                }

                this.expect('RPAREN', 'Expected )');

            }

            variants.push(new EnumVariant(variantName, fields));

        }

        this.expect('END', 'Expected end');

        return new EnumDeclaration(name, variants);

    }

    parseTraitDeclaration() {
        this.advance();
        const name = this.expect('IDENT', 'Expected trait name').value;
        const methods = [];

        while (!this.check('END') && !this.isAtEnd()) {
            if (this.check('FN')) {
                this.advance();
                const methodName = this.expect('IDENT', 'Expected method name').value;
                this.expect('LPAREN', 'Expected (');
                const params = this.parseParams();
                this.expect('RPAREN', 'Expected )');
                let returnType = null;
                if (this.check('ARROW') || this.check('DOUBLE_COLON')) {
                    returnType = this.parseTypeAnnotation();
                }
                methods.push(new (require('../ast/nodes').TraitMethod)(methodName, params, returnType));
            } else {
                break;
            }
        }

        this.expect('END', 'Expected end');
        return new (require('../ast/nodes').TraitDeclaration)(name, methods);
    }

    parseImplDeclaration() {
        this.advance();
        const traitName = this.expect('IDENT', 'Expected trait name').value;
        this.expect('FOR', 'Expected for');
        const typeName = this.expect('IDENT', 'Expected type name').value;
        const methods = [];

        while (!this.check('END') && !this.isAtEnd()) {
            if (this.check('FN')) {
                this.advance();
                const methodName = this.expect('IDENT', 'Expected method name').value;
                this.expect('LPAREN', 'Expected (');
                const params = this.parseParams();
                this.expect('RPAREN', 'Expected )');
                let returnType = null;
                if (this.check('ARROW') || this.check('DOUBLE_COLON')) {
                    returnType = this.parseTypeAnnotation();
                }
                const body = this.parseBlock();
                methods.push(new (require('../ast/nodes').FnDeclaration)(methodName, params, body, returnType));
            } else {
                break;
            }
        }

        this.expect('END', 'Expected end');
        return new (require('../ast/nodes').ImplDeclaration)(traitName, typeName, methods);
    }

    parseExternDeclaration() {
        this.advance();
        const lang = this.expect('IDENT', 'Expected language name').value;
        this.expect('IDENT', 'Expected extern function name');
        const name = this.peek(-1).value;

        this.expect('LPAREN', 'Expected (');
        const params = this.parseParams();
        this.expect('RPAREN', 'Expected )');
        let returnType = null;
        if (this.check('ARROW') || this.check('DOUBLE_COLON')) {
            returnType = this.parseTypeAnnotation();
        }

        return new (require('../ast/nodes').ExternFn)(name, params, returnType, name);
    }

    parseUseStatement() {
        this.advance();

        let imports = [];
        if (this.check('LBRACE')) {
            this.advance();
            while (!this.check('RBRACE') && !this.isAtEnd()) {
                const name = this.expect('IDENT', 'Expected import name').value;
                imports.push(name);
                if (!this.check('RBRACE')) this.expect('COMMA', 'Expected ,');
            }
            this.expect('RBRACE', 'Expected }');
        }

        let modulePath;
        if (this.check('STRING')) {
            modulePath = this.advance().value;
        } else if (this.check('IDENT')) {
            const parts = [this.advance().value];
            while (this.check('DOUBLE_COLON')) {
                this.advance();
                parts.push(this.expect('IDENT', 'Expected module name').value);
            }
            modulePath = parts.join('::');
        } else {
            throw new Error('Expected module path string or identifier after use');
        }

        return new UseStatement(modulePath, imports);
    }

    // --- Expressions ---

    parseExprStatement() {

        const expr = this.parseExpr();

        return expr;

    }

    parseExpr() {

        return this.parsePipe();

    }

    parsePipe() {

        let left = this.parseOr();

        while (this.check('PIPE')) {

            this.advance();

            const right = this.parseOr();

            left = new PipeExpr(left, right);

        }

        return left;

    }

    parseOr() {

        let left = this.parseAnd();

        while (this.check('OR') || this.check('OR2')) {

            const op = this.advance().value;

            const right = this.parseAnd();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseAnd() {

        let left = this.parseNot();

        while (this.check('AND') || this.check('AND2')) {

            const op = this.advance().value;

            const right = this.parseNot();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseNot() {

        if (this.check('NOT')) {

            this.advance();

            const operand = this.parseNot();

            return new UnaryExpr('not', operand);

        }

        return this.parseComparison();

    }

    parseComparison() {

        let left = this.parseShift();

        const ops = ['EQ', 'NEQ', 'LT', 'GT', 'LTE', 'GTE', 'STRICT_EQ', 'STRICT_NEQ'];

        while (ops.includes(this.peek().type)) {

            const op = this.advance().value;

            const right = this.parseShift();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseShift() {

        let left = this.parseAdd();

        while (this.check('SHL') || this.check('SHR')) {

            const op = this.advance().value;

            const right = this.parseAdd();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseAdd() {

        let left = this.parseMul();

        while (this.check('PLUS') || this.check('MINUS')) {

            const op = this.advance().value;

            const right = this.parseMul();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseMul() {

        let left = this.parseUnary();

        while (this.check('STAR') || this.check('SLASH') || this.check('PERCENT')) {

            const op = this.advance().value;

            const right = this.parseUnary();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parseUnary() {

        if (this.check('MINUS')) {

            this.advance();

            const operand = this.parseUnary();

            return new UnaryExpr('-', operand);

        }

        if (this.check('PLUS')) {

            this.advance();

            return this.parseUnary();

        }

        if (this.check('BANG')) {

            this.advance();

            const operand = this.parseUnary();

            return new UnaryExpr('!', operand);

        }

        if (this.check('QUESTION')) {

            this.advance();

            const operand = this.parseUnary();

            return new UnaryExpr('?', operand);

        }

        return this.parsePower();

    }

    parsePower() {

        let left = this.parsePostfix();

        while (this.check('POWER')) {

            const op = this.advance().value;

            const right = this.parseUnary();

            left = new BinaryExpr(left, op, right);

        }

        return left;

    }

    parsePostfix() {

        let expr = this.parsePrimary();

        while (true) {

            if (this.check('LPAREN')) {

                this.advance();

                const args = [];

                let first = true;

                while (!this.check('RPAREN') && !this.isAtEnd()) {

                    if (!first) this.expect('COMMA', 'Expected ,');

                    first = false;

                    if (this.check('IDENT') && this.peek(1) && this.peek(1).type === 'COLON') {

                        const name = this.advance().value;

                        this.advance();

                        const value = this.parseExpr();

                        args.push({ type: 'named_arg', name, value });

                    } else {

                        args.push(this.parseExpr());

                    }

                }

                this.expect('RPAREN', 'Expected )');

                expr = new CallExpr(expr, args);

            } else if (this.check('DOT')) {

                this.advance();

                const property = this.expect('IDENT', 'Expected property name').value;

                expr = new MemberExpr(expr, property);

            } else if (this.check('LBRACKET')) {

                this.advance();

                const index = this.parseExpr();

                this.expect('RBRACKET', 'Expected ]');

                expr = new IndexExpr(expr, index);

            } else if (this.check('NULL_DOT')) {

                this.advance();

                const property = this.expect('IDENT', 'Expected property name').value;

                expr = new MemberExpr(expr, property, true);

            } else if (this.check('NULL_BRACKET')) {

                this.advance();

                const index = this.parseExpr();

                this.expect('RBRACKET', 'Expected ]');

                expr = new IndexExpr(expr, index, true);

            } else {

                break;

            }

        }

        return expr;

    }

    parsePrimary() {

        if (this.check('NUMBER')) {

            const token = this.advance();

            return new NumberLiteral(token.value, token.value);

        }

        if (this.check('STRING')) {

            const token = this.advance();

            return new StringLiteral(token.value, token.value);

        }

        if (this.check('TEMPLATE')) {

            return this.parseTemplateLiteral();

        }

        if (this.check('TRUE')) {

            this.advance();

            return new BooleanLiteral(true);

        }

        if (this.check('FALSE')) {

            this.advance();

            return new BooleanLiteral(false);

        }

        if (this.check('NIL')) {

            this.advance();

            return new NullLiteral();

        }

        if (this.check('IDENT')) {

            const name = this.advance().value;

            // Check for arrow function: x => expr or (x) => expr
            if (this.check('ARROW') || this.check('FAT_ARROW')) {
                this.advance();
                const body = this.parseExpr();
                return new LambdaExpr([new Identifier(name)], body);
            }

            return new Identifier(name);

        }

        // Arrow function: (x) => expr
        if (this.check('LPAREN')) {
            const startPos = this.current;
            this.advance();
            const params = [];
            while (!this.check('RPAREN')) {
                params.push(this.expect('IDENT', 'Expected param name'));
                if (!this.check('RPAREN')) {
                    this.expect('COMMA', 'Expected ,');
                }
            }
            this.expect('RPAREN', 'Expected )');
            if (this.check('ARROW') || this.check('FAT_ARROW')) {
                this.advance();
                const body = this.parseExpr();
                return new LambdaExpr(params, body);
            }
            // Not a lambda - rollback and fall through
            this.current = startPos;
        }

        if (this.check('DOT') || this.check('NULL_DOT')) {

            const isNull = this.check('NULL_DOT');
            this.advance(); // consume DOT or NULL_DOT

            // We expect an identifier (or maybe a number? but for now, ident) for the first property
            const property = this.expect('IDENT', 'Expected property name').value;
            let obj = new MemberExpr(new Identifier('_'), property, isNull);

            while (true) {
                if (this.check('DOT')) {
                    this.advance();
                    const property = this.expect('IDENT', 'Expected property name').value;
                    obj = new MemberExpr(obj, property, false);
                } else if (this.check('NULL_DOT')) {
                    this.advance();
                    const property = this.expect('IDENT', 'Expected property name').value;
                    obj = new MemberExpr(obj, property, true);
                } else if (this.check('LBRACKET')) {
                    this.advance();
                    const index = this.parseExpr();
                    this.expect('RBRACKET', 'Expected ]');
                    obj = new IndexExpr(obj, index, isNull);
                } else {
                    break;
                }
            }

            // Now, we want to create a function that takes one argument and applies the chain to it.
            // The chain we built uses the identifier '_' as the base.
            // We create a lambda with one parameter named '_' and the body as `obj`.
            return new LambdaExpr([new Identifier('_')], obj);
        }

        if (this.check('OK')) {

            this.advance();

            const value = this.parsePostfix();

            return new CallExpr(new Identifier('Ok'), [value]);

        }

        if (this.check('ERR')) {

            this.advance();

            const value = this.parsePostfix();

            return new CallExpr(new Identifier('Err'), [value]);

        }

        if (this.check('LBRACKET')) {

            return this.parseListLiteralOrComp();

        }

        if (this.check('LBRACE')) {

            // Differentiate block from map literal

            // If next token is IDENT followed by COLON, it's a map

            // Otherwise it's a block

            if (this.peek(1) && this.peek(1).type === 'IDENT' && this.peek(2) && this.peek(2).type === 'COLON') {

                return this.parseMapLiteral();

            }

            return this.parseBlock();

        }

        if (this.check('LPAREN')) {

            return this.parseParenExpr();

        }

        if (this.check('IF')) return this.parseIfExpr();

        if (this.check('MATCH')) return this.parseMatchExpr();

        if (this.check('FOR')) return this.parseForExpr();

        if (this.check('WHILE')) return this.parseWhileExpr();

        if (this.check('FN')) return this.parseLambda();

        if (this.check('TRY')) return this.parseTryExpr();

        if (this.check('THROW')) {
        if (this.check('YIELD')) return this.parseYieldStatement();

            this.advance();

            const arg = this.parseExpr();

            return new ThrowExpr(arg);

        }

        if (this.check('SPAWN')) return this.parseSpawnExpr();

        if (this.check('AWAIT')) return this.parseAwaitExpr();

        if (this.check('FIBER')) return this.parseFiberExpr();

        if (this.check('LBRACE')) return this.parseBlock();

        throw new Error(`Unexpected token '${this.peek().value}' at ${this.peek().line}:${this.peek().col}`);

    }

    // --- Template Literal (String Interpolation) ---

    parseTemplateLiteral() {

        const token = this.advance();

        const raw = token.value;

        const parts = [];

        // Parse template string into parts

        let current = '';

        let i = 0;

        while (i < raw.length) {

            if (raw[i] === '{') {

                // Find closing brace

                let j = i + 1;

                let depth = 1;

                while (j < raw.length && depth > 0) {

                    if (raw[j] === '{') depth++;

                    else if (raw[j] === '}') depth--;

                    j++;

                }

                if (depth !== 0) throw new Error('Unmatched braces in template');

                const exprStr = raw.slice(i + 1, j - 1);

                if (current.length > 0) {

                    parts.push({ type: 'str', value: current });

                    current = '';

                }

                // Parse the expression string

                const innerTokens = this.tokenizeSimple(exprStr);

                const innerParser = new Parser(innerTokens);

                parts.push({ type: 'expr', value: innerParser.parseExpr() });

                i = j;

            } else {

                current += raw[i];

                i++;

            }

        }

        if (current.length > 0) {

            parts.push({ type: 'str', value: current });

        }

        return new TemplateLiteral(parts);

    }

    // Simple tokenizer for template expressions

    tokenizeSimple(source) {

        const KEYWORDS = ['fn', 'let', 'if', 'else', 'for', 'while', 'match', 'true', 'false', 'nil', 'in', 'not', 'and', 'or', 'try', 'catch', 'throw', 'return'];

        const SINGLE = { '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH', '%': 'PERCENT', '=': 'ASSIGN', '<': 'LT', '>': 'GT', '(': 'LPAREN', ')': 'RPAREN', '[': 'LBRACKET', ']': 'RBRACKET', '{': 'LBRACE', '}': 'RBRACE', ',': 'COMMA', '.': 'DOT', ':': 'COLON', '|': 'PIPE', '!': 'BANG', '?': 'QUESTION', '_': 'UNDERSCORE', '&': 'AMPERSAND', '^': 'CARET', '#': 'HASH', '~': 'TILDE', ';': 'SEMICOLON' };

        const DOUBLE = { '==': 'EQ', '!=': 'NEQ', '<=': 'LTE', '>=': 'GTE', '**': 'POWER', '->': 'ARROW', '=>': 'FAT_ARROW', '..': 'RANGE', '::': 'DOUBLE_COLON' };

        const tokens = [];

        let pos = 0;

        let line = 1, col = 1;

        while (pos < source.length) {

            const c = source[pos];

            if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { pos++; col++; continue; }

            if (c === '"' || c === "'") {

                let val = ''; pos++; while (pos < source.length && source[pos] !== c) { if (source[pos] === '\\') { pos++; val += source[pos]; } else val += source[pos]; pos++; }

                pos++;

                tokens.push({ type: 'STRING', value: val, line, col });

                continue;

            }

            if (c >= '0' && c <= '9') {

                let val = '';

                while (pos < source.length && (source[pos] >= '0' && source[pos] <= '9' || source[pos] === '.')) val += source[pos++];

                tokens.push({ type: 'NUMBER', value: parseFloat(val), line, col });

                continue;

            }

            if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {

                let val = c; pos++;

                while (pos < source.length && ((source[pos] >= 'a' && source[pos] <= 'z') || (source[pos] >= 'A' && source[pos] <= 'Z') || (source[pos] >= '0' && source[pos] <= '9') || source[pos] === '_')) val += source[pos++];

                tokens.push({ type: KEYWORDS.includes(val) ? val.toUpperCase() : 'IDENT', value: val, line, col });

                continue;

            }

            const two = source.slice(pos, pos + 2);

            if (DOUBLE[two]) { tokens.push({ type: DOUBLE[two], value: two, line, col }); pos += 2; col += 2; continue; }

            if (SINGLE[c]) { tokens.push({ type: SINGLE[c], value: c, line, col }); pos++; col++; continue; }

            throw new Error(`Unexpected '${c}' in template`);

        }

        tokens.push({ type: 'EOF', value: null, line, col });

        return tokens;

    }

    // --- List Literal or List Comprehension ---

    parseListLiteralOrComp() {

        const startLine = this.peek().line;

        const startCol = this.peek().col;

        this.advance(); // consume '['

        const firstExpr = this.parseExpr();

        // List comprehension: [expr for x in list if cond]

        if (this.check('FOR')) {

            this.advance();

            const variable = this.expect('IDENT', 'Expected variable name').value;

            this.expect('IN', 'Expected in');

            const iterable = this.parseExpr();

            let filter = null;

            if (this.check('IF') || this.check('WHEN')) {

                this.advance();

                filter = this.parseExpr();

            }

            this.expect('RBRACKET', 'Expected ]');

            return new ListComp(firstExpr, variable, iterable, filter);

        }

        // Regular list literal

        const elements = [firstExpr];

        while (!this.check('RBRACKET') && !this.isAtEnd()) {

            this.expect('COMMA', 'Expected ,');

            if (this.check('RBRACKET')) break;

            elements.push(this.parseExpr());

        }

        this.expect('RBRACKET', 'Expected ]');

        return new ListLiteral(elements);

    }

    parseParenExpr() {

        this.advance();

        const expr = this.parseExpr();

        this.expect('RPAREN', 'Expected )');

        return expr;

    }

    parseMapLiteral() {

        this.advance();

        const pairs = [];

        while (!this.check('RBRACE') && !this.isAtEnd()) {

            const key = this.parseExpr();

            this.expect('COLON', 'Expected :');

            const value = this.parseExpr();

            pairs.push({ key, value });

            if (!this.check('RBRACE')) this.expect('COMMA', 'Expected ,');

        }

        this.expect('RBRACE', 'Expected }');

        return new MapLiteral(pairs);

    }

    parseIfExpr() {

        this.advance();

        const condition = this.parseExpr();

        const consequent = this.parseBlock();

        const alternates = [];

        while (this.check('ELSIF')) {

            this.advance();

            const elsifCond = this.parseExpr();

            const elsifBlock = this.parseBlock();

            alternates.push({ condition: elsifCond, body: elsifBlock });

        }

        let alternate = null;

        if (this.check('ELSE')) {

            this.advance();

            alternate = this.parseBlock();

        }

        this.expect('END', 'Expected end');

        let result = alternate ? new IfExpr(condition, consequent, alternate) : new IfExpr(condition, consequent, null);

        if (alternates.length > 0) {

            for (let i = alternates.length - 1; i >= 0; i--) {

                result = new IfExpr(alternates[i].condition, alternates[i].body, result);

            }

        }

        return result;

    }

    parseMatchExpr() {

        this.advance();

        const subject = this.parseExpr();

        const cases = [];

        while (!this.check('END') && !this.isAtEnd()) {

            const pattern = this.parsePattern();

            let guard = null;

            if (this.check('WHEN')) {

                this.advance();

                guard = this.parseExpr();

            }

            this.expect('ARROW', 'Expected ->');

            const body = this.parseExpr();

            cases.push(new MatchCase(pattern, guard, body));

        }

        this.expect('END', 'Expected end');

        return new MatchExpr(subject, cases);

    }

    parsePattern() {

        if (this.check('UNDERSCORE')) {

            this.advance();

            return { type: 'wildcard' };

        }

        if (this.check('IDENT')) {

            const name = this.advance().value;

            if (this.check('LPAREN')) {

                this.advance();

                const fields = [];

                while (!this.check('RPAREN') && !this.isAtEnd()) {

                    fields.push(this.parsePattern());

                    if (!this.check('RPAREN')) this.expect('COMMA', 'Expected ,');

                }

                this.expect('RPAREN', 'Expected )');

                return { type: 'enum', name, fields };

            }

            if (['None', 'Some', 'Ok', 'Err', 'True', 'False'].includes(name)) {

                return { type: 'enum', name, fields: [] };

            }

            return { type: 'ident', name };

        }

        if (this.check('NUMBER') || this.check('STRING') || this.check('TRUE') || this.check('FALSE') || this.check('NIL')) {

            const token = this.advance();

            return { type: 'literal', value: token.value };

        }

        return { type: 'wildcard' };

    }

    parseForExpr() {

        this.advance();

        const variable = this.expect('IDENT', 'Expected variable name').value;

        this.expect('IN', 'Expected in');

        const iterable = this.parseExpr();

        const body = this.parseBlockWithBraces();

        return new ForExpr(variable, iterable, body);

    }

    parseWhileExpr() {

        this.advance();

        const condition = this.parseExpr();

        const body = this.parseBlockWithBraces();

        return new WhileExpr(condition, body);

    }

    parseTryExpr() {
        this.advance();
        const body = this.parseBlockWithBraces();
        this.expect('CATCH', 'Expected catch');
        let catchVar = null;
        if (this.check('IDENT')) {
            catchVar = this.advance().value;
        }
        const catchBody = this.parseBlockWithBraces();
        return new TryExpr(body, { var: catchVar, body: catchBody });
    }

    parseLambda() {

        this.advance();

        this.expect('LPAREN', 'Expected (');

        const params = this.parseParams();

        this.expect('RPAREN', 'Expected )');

        if (this.check('ARROW')) {

            this.advance();

            const body = this.parseExpr();

            return new LambdaExpr(params, body);

        }

        const body = this.parseBlockWithBraces();

        return new LambdaExpr(params, body);

    }

    // --- Fibers (Concurrency) ---

    parseSpawnExpr() {

        this.advance();

        // spawn { block } - immediately executes block as a fiber

        if (!this.check('LBRACE')) {

            throw new Error(`Expected {{ after spawn at ${this.peek().line}:${this.peek().col}`);

        }

        const body = this.parseBlockWithBraces();

        return new SpawnExpr(body);

    }

    parseAwaitExpr() {

        this.advance();

        const fiber = this.parseExpr();

        return new AwaitExpr(fiber);

    }

    parseFiberExpr() {

        this.advance(); // consume FIBER

        if (!this.check('LBRACE')) {

            throw new Error(`Expected {{ after fiber at ${this.peek().line}:${this.peek().col}`);

        }

        const body = this.parseBlockWithBraces();

        return new FiberExpr(body);

    }

    parseBlock() {

        const statements = [];

        while (!this.check('END') && !this.check('ELSE') && !this.check('ELSIF') && !this.check('CATCH') && !this.check('RBRACE') && !this.isAtEnd()) {

            statements.push(this.parseStatement());

        }

        return new Block(statements);

    }

    // Parse a block that uses { } delimiters only (for fn, lambda, spawn bodies)

    parseBlockWithBraces() {

        this.expect('LBRACE', 'Expected {');

        const statements = [];

        while (!this.check('RBRACE') && !this.isAtEnd()) {

            statements.push(this.parseStatement());

        }

        this.expect('RBRACE', 'Expected }');

        return new Block(statements);

    }

    // --- Types ---

    parseType() {

        let isOptional = false;

        if (this.check('QUESTION')) {

            isOptional = true;

            this.advance();

        }

        let typeName = this.expect('IDENT', 'Expected type name').value;

        if (this.check('LT')) {

            this.advance();

            const generics = [];

            while (!this.check('GT') && !this.isAtEnd()) {

                generics.push(this.parseType());

                if (!this.check('GT')) this.expect('COMMA', 'Expected ,');

            }

            this.expect('GT', 'Expected >');

            typeName = typeName + '<' + generics.map(g => g.name || g).join(', ') + '>';

        }

        if (isOptional) {

            return new TypeAnnotation('Option', [typeName]);

        }

        return new TypeAnnotation(typeName);

    }

    parseTypeAnnotation() {

        if (this.check('DOUBLE_COLON')) {

            this.advance();

            return this.parseType();

        }

        if (this.check('ARROW')) {

            this.advance();

            return this.parseType();

        }

        return null;

    }

    }

module.exports = { Parser };
