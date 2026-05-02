/**
 * nuxScript Lexer
 * Tokenizes nuxScript source code
 */

const KEYWORDS = new Map([
    ['fn', 'FN'],
    ['let', 'LET'],
    ['let!', 'LETMUT'],
    ['var', 'VAR'],
    ['const', 'CONST'],
    ['if', 'IF'],
    ['elsif', 'ELSIF'],
    ['else', 'ELSE'],
    ['end', 'END'],
    ['for', 'FOR'],
    ['in', 'IN'],
    ['while', 'WHILE'],
    ['fiber', 'FIBER'],
    ['loop', 'LOOP'],
    ['break', 'BREAK'],
    ['continue', 'CONTINUE'],
    ['match', 'MATCH'],
    ['when', 'WHEN'],
    ['then', 'THEN'],
    ['is', 'IS'],
    ['as', 'AS'],
    ['try', 'TRY'],
    ['catch', 'CATCH'],
    ['throw', 'THROW'],
    ['return', 'RETURN'],
    ['spawn', 'SPAWN'],
    ['await', 'AWAIT'],
    ['yield', 'YIELD'],
    ['resume', 'RESUME'],
    ['async', 'ASYNC'],
    ['struct', 'STRUCT'],
    ['enum', 'ENUM'],
    ['trait', 'TRAIT'],
    ['impl', 'IMPL'],
    ['type', 'TYPE'],
    ['alias', 'ALIAS'],
    ['pub', 'PUB'],
    ['priv', 'PRIV'],
    ['use', 'USE'],
    ['mod', 'MOD'],
    ['from', 'FROM'],
    ['and', 'AND'],
    ['or', 'OR'],
    ['not', 'NOT'],
    ['true', 'TRUE'],
    ['false', 'FALSE'],
    ['nil', 'NIL'],
    ['Option', 'OPTION_TYPE'],
    ['Result', 'RESULT_TYPE'],
]);

const SINGLE_TOKENS = new Map([
    ['+', 'PLUS'],
    ['-', 'MINUS'],
    ['*', 'STAR'],
    ['/', 'SLASH'],
    ['%', 'PERCENT'],
    ['=', 'ASSIGN'],
    ['<', 'LT'],
    ['>', 'GT'],
    ['(', 'LPAREN'],
    [')', 'RPAREN'],
    ['[', 'LBRACKET'],
    [']', 'RBRACKET'],
    ['{', 'LBRACE'],
    ['}', 'RBRACE'],
    [',', 'COMMA'],
    ['.', 'DOT'],
    [':', 'COLON'],
    [';', 'SEMICOLON'],
    ['!', 'BANG'],
    ['?', 'QUESTION'],
    ['_', 'UNDERSCORE'],
    ['#', 'HASH'],
    ['^', 'CARET'],
    ['&', 'AMPERSAND'],
    ['~', 'TILDE'],
]);

const TWO_CHAR_TOKENS = new Map([
    ['==', 'EQ'],
    ['!=', 'NEQ'],
    ['<=', 'LTE'],
    ['>=', 'GTE'],
    ['===', 'STRICT_EQ'],
    ['!==', 'STRICT_NEQ'],
    ['**', 'POWER'],
    ['+=', 'PLUS_EQ'],
    ['-=', 'MINUS_EQ'],
    ['*=', 'STAR_EQ'],
    ['/=', 'SLASH_EQ'],
    ['%=', 'PERCENT_EQ'],
    ['->', 'ARROW'],
    ['=>', 'FAT_ARROW'],
    ['..', 'RANGE'],
    ['<<', 'SHL'],
    ['>>', 'SHR'],
    ['||', 'OR2'],
    ['&&', 'AND2'],
    ['?.', 'NULL_DOT'],
    ['?[', 'NULL_BRACKET'],
    ['::', 'DOUBLE_COLON'],
    ['|>', 'PIPE'],
]);

class Token {
    constructor(type, value, line, col) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.col = col;
    }
}

class Lexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
    }

    peek(offset = 0) {
        return this.source[this.pos + offset] || null;
    }

    advance() {
        const char = this.source[this.pos++];
        if (char === '\n') {
            this.line++;
            this.col = 1;
        } else {
            this.col++;
        }
        return char;
    }

    isAtEnd() {
        return this.pos >= this.source.length;
    }

    isWhitespace(char) {
        return char === ' ' || char === '\t' || char === '\n' || char === '\r';
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isAlpha(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
    }

    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }

    skipWhitespaceAndComments() {
        while (!this.isAtEnd()) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r') {
                this.advance();
            } else if (char === '\n') {
                this.line++;
                this.col = 0;
                this.advance();
            } else if (char === '#') {
                while (!this.isAtEnd() && this.peek() !== '\n') {
                    this.advance();
                }
            } else {
                break;
            }
        }
    }

    readString(quote) {
        let value = '';
        this.advance(); // consume opening quote
        while (!this.isAtEnd() && this.peek() !== quote) {
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case 'r': value += '\r'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case "'": value += "'"; break;
                    case '{': value += '{'; break; // For template interpolation
                    default: value += escaped;
                }
            } else {
                value += this.advance();
            }
        }
        this.advance(); // consume closing quote
        return value;
    }

    readNumber() {
        let value = '';
        let isFloat = false;

        while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '_')) {
            if (this.peek() !== '_') value += this.advance();
            else this.advance();
        }

        if (this.peek() === '.' && this.isDigit(this.peek(1))) {
            isFloat = true;
            value += this.advance();
            while (!this.isAtEnd() && (this.isDigit(this.peek()) || this.peek() === '_')) {
                if (this.peek() !== '_') value += this.advance();
                else this.advance();
            }
        }

        // Hex, binary, octal
        if (this.peek() === 'x' || this.peek() === 'b' || this.peek() === 'o') {
            const base = this.advance();
            let numValue = '';
            while (!this.isAtEnd() && /[0-9a-fA-F_]/.test(this.peek())) {
                if (this.peek() !== '_') numValue += this.advance();
                else this.advance();
            }
            if (base === 'x') return parseInt(numValue, 16);
            if (base === 'b') return parseInt(numValue, 2);
            if (base === 'o') return parseInt(numValue, 8);
        }

        return isFloat ? parseFloat(value) : parseInt(value, 10);
    }

    readIdentifier() {
        let value = '';
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }
        return value;
    }

    readTemplateString() {
        let value = '';
        this.advance(); // consume opening backtick
        while (!this.isAtEnd() && this.peek() !== '`') {
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case 'r': value += '\r'; break;
                    case '\\': value += '\\'; break;
                    case '`': value += '`'; break;
                    case '{': value += '{'; break;
                    default: value += escaped;
                }
            } else {
                value += this.advance();
            }
        }
        this.advance(); // consume closing backtick
        return value;
    }

    tokenize() {
        while (!this.isAtEnd()) {
            this.skipWhitespaceAndComments();
            if (this.isAtEnd()) break;

            const line = this.line;
            const col = this.col;

            const char = this.peek();

            // Template string (backtick)
            if (char === '`') {
                const value = this.readTemplateString();
                this.tokens.push(new Token('TEMPLATE', value, line, col));
                continue;
            }

            // String
            if (char === '"' || char === "'") {
                const value = this.readString(char);
                this.tokens.push(new Token('STRING', value, line, col));
                continue;
            }

            // Number
            if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
                const raw = this.source.slice(this.pos, this.pos + 20);
                const value = this.readNumber();
                this.tokens.push(new Token('NUMBER', value, line, col));
                continue;
            }

            // Identifier or keyword
            if (this.isAlpha(char)) {
                const ident = this.readIdentifier();
                const type = KEYWORDS.get(ident) || 'IDENT';
                this.tokens.push(new Token(type, ident, line, col));
                continue;
            }

            // Multi-char operators
            const two = char + (this.peek(1) || '');
            if (TWO_CHAR_TOKENS.has(two)) {
                this.advance();
                this.advance();
                const type = TWO_CHAR_TOKENS.get(two);
                this.tokens.push(new Token(type, two, line, col));
                continue;
            }

            // Single-char tokens
            if (SINGLE_TOKENS.has(char)) {
                this.advance();
                const type = SINGLE_TOKENS.get(char);
                this.tokens.push(new Token(type, char, line, col));
                continue;
            }

            // Unknown character
            throw new Error(`Unexpected character '${char}' at ${line}:${col}`);
        }

        this.tokens.push(new Token('EOF', null, this.line, this.col));
        return this.tokens;
    }
}

module.exports = { Lexer, Token };
