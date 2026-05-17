/**
 * nuxScript Code Generator
 * Converte AST nodes para código nuxScript
 */

class CodeGenerator {
    constructor(options = {}) {
        this.indent = options.indent || '    ';
        this.currentIndent = '';
        this.line = 1;
    }

    generate(node) {
        if (!node) return '';
        
        switch (node.type) {
            case 'NumberLiteral':
                return node.raw || String(node.value);
            
            case 'StringLiteral':
                return this.generateString(node);
            
            case 'BooleanLiteral':
                return String(node.value);
            
            case 'NullLiteral':
                return 'null';
            
            case 'Identifier':
                return node.name;
            
            case 'BinaryExpr':
                return this.generateBinaryExpr(node);
            
            case 'UnaryExpr':
                return this.generateUnaryExpr(node);
            
            case 'CallExpr':
                return this.generateCallExpr(node);
            
            case 'MemberExpr':
                return this.generateMemberExpr(node);
            
            case 'PipeExpr':
                return this.generatePipeExpr(node);
            
            case 'ListLiteral':
                return this.generateList(node);
            
            case 'MapLiteral':
                return this.generateMap(node);
            
            case 'LetDeclaration':
                return this.generateLet(node);
            
            case 'VarDeclaration':
                return this.generateVar(node);
            
            case 'ConstDeclaration':
                return this.generateConst(node);
            
            case 'FnDeclaration':
                return this.generateFn(node);
            
            case 'StructDeclaration':
                return this.generateStruct(node);
            
            case 'EnumDeclaration':
                return this.generateEnum(node);
            
            case 'LambdaExpr':
                return this.generateLambda(node);
            
            case 'Block':
                return this.generateBlock(node);
            
            case 'IfExpr':
                return this.generateIf(node);
            
            case 'MatchExpr':
                return this.generateMatch(node);
            
            case 'ForExpr':
                return this.generateFor(node);
            
            case 'WhileExpr':
                return this.generateWhile(node);
            
            case 'ReturnStatement':
                return 'return ' + this.generate(node.value);
            
            case 'BreakStatement':
                return 'break';
            
            case 'ContinueStatement':
                return 'continue';
            
            case 'ThrowExpr':
                return 'throw ' + this.generate(node.expr);
            
            case 'TryExpr':
                return this.generateTry(node);
            
            case 'YieldExpr':
                return 'yield ' + this.generate(node.expr);
            
            case 'FiberLiteral':
                return this.generateFiber(node);
            
            case 'SpawnExpr':
                return 'spawn ' + this.generate(node.expr);
            
            case 'TemplateLiteral':
                return this.generateTemplate(node);
            
            case 'IndexExpr':
                return this.generateIndexExpr(node);
            
            case 'MatchCase':
                return this.generate(node.pattern) + ' -> ' + this.generate(node.body);

            case 'TraitDeclaration':
                return this.generateTrait(node);

            case 'ImplDeclaration':
                return this.generateImpl(node);

            case 'ExternFn':
                return this.generateExternFn(node);

            default:
                return `/* unknown node: ${node.type} */`;
        }
    }

    generateString(node) {
        if (node.raw) return node.raw;
        const s = String(node.value);
        if (s.includes("'") || s.includes('\n')) {
            return `"${s.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
        }
        return `'${s}'`;
    }

    generateBinaryExpr(node) {
        const left = this.generate(node.left);
        const right = this.generate(node.right);
        return `${left} ${node.op} ${right}`;
    }

    generateUnaryExpr(node) {
        const operand = this.generate(node.operand);
        if (node.op === '-') {
            return '-' + operand;
        }
        return node.op + operand;
    }

    generateCallExpr(node) {
        const args = node.args.map(a => this.generate(a)).join(', ');
        
        if (node.receiver) {
            return this.generate(node.receiver) + '.' + node.name + '(' + args + ')';
        }
        return node.name + '(' + args + ')';
    }

    generateMemberExpr(node) {
        return this.generate(node.object) + '.' + node.property;
    }

    generatePipeExpr(node) {
        const parts = [this.generate(node.left)];
        for (const op of node.ops || []) {
            if (op.type === 'CallExpr') {
                parts.push('|> ' + op.name + '(' + (op.args || []).map(a => this.generate(a)).join(', ') + ')');
            } else {
                parts.push('|> ' + this.generate(op));
            }
        }
        return parts.join('\n' + this.currentIndent);
    }

    generateList(node) {
        if (!node.elements || node.elements.length === 0) {
            return '[]';
        }
        const elements = node.elements.map(e => this.generate(e)).join(', ');
        return '[' + elements + ']';
    }

    generateMap(node) {
        if (!node.entries || node.entries.length === 0) {
            return '{}';
        }
        const entries = node.entries.map(e => this.generate(e.key) + ': ' + this.generate(e.value)).join(', ');
        return '{' + entries + '}';
    }

    generateLet(node) {
        let result = 'let ' + node.name;
        if (node.typeAnnotation) {
            result += ' :: ' + this.generateTypeAnnotation(node.typeAnnotation);
        }
        result += ' = ' + this.generate(node.value);
        return result;
    }

    generateVar(node) {
        let result = 'var ' + node.name;
        if (node.typeAnnotation) {
            result += ' :: ' + this.generateTypeAnnotation(node.typeAnnotation);
        }
        result += ' = ' + this.generate(node.value);
        return result;
    }

    generateConst(node) {
        let result = 'const ' + node.name;
        if (node.typeAnnotation) {
            result += ' :: ' + this.generateTypeAnnotation(node.typeAnnotation);
        }
        result += ' = ' + this.generate(node.value);
        return result;
    }

    generateFn(node) {
        let result = 'fn ' + node.name + '(';
        
        if (node.params && node.params.length > 0) {
            result += node.params.map(p => {
                let s = p.name;
                if (p.typeAnnotation) {
                    s += ' :: ' + this.generateTypeAnnotation(p.typeAnnotation);
                }
                return s;
            }).join(', ');
        }
        
        result += ')';
        
        if (node.returnType) {
            result += ' -> ' + this.generateTypeAnnotation(node.returnType);
        }
        
        if (node.body) {
            result += '\n' + this.generateBlock(node.body);
        }
        
        return result;
    }

    generateStruct(node) {
        let result = 'struct ' + node.name + '\n';
        this.currentIndent += this.indent;
        
        for (const prop of node.properties || []) {
            result += this.currentIndent + prop.name;
            if (prop.typeAnnotation) {
                result += ' :: ' + this.generateTypeAnnotation(prop.typeAnnotation);
            }
            result += '\n';
        }
        
        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        result += 'end';
        return result;
    }

    generateEnum(node) {
        let result = 'enum ' + node.name + '\n';
        this.currentIndent += this.indent;
        
        for (const variant of node.variants || []) {
            let v = this.currentIndent + variant.name;
            if (variant.params && variant.params.length > 0) {
                v += '(' + variant.params.map(p => {
                    let s = p.name;
                    if (p.typeAnnotation) {
                        s += ' :: ' + this.generateTypeAnnotation(p.typeAnnotation);
                    }
                    return s;
                }).join(', ') + ')';
            }
            result += v + '\n';
        }
        
        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        result += 'end';
        return result;
    }

    generateLambda(node) {
        let result = 'fn(';
        
        if (node.params && node.params.length > 0) {
            result += node.params.map(p => p.name).join(', ');
        }
        
        result += ')';
        
        if (node.returnType) {
            result += ' -> ' + this.generateTypeAnnotation(node.returnType);
        }
        
        if (node.body) {
            result += ' ' + this.generate(node.body);
        }
        
        return result;
    }

    generateBlock(node) {
        this.currentIndent += this.indent;
        
        let result = '';
        for (const stmt of node.statements || []) {
            result += this.currentIndent + this.generate(stmt) + '\n';
        }
        
        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        
        return result.trimEnd();
    }

    generateIf(node) {
        let result = 'if ' + this.generate(node.condition) + '\n' + this.generate(node.thenBranch);
        
        if (node.elseBranch) {
            if (node.elseBranch.type === 'IfExpr') {
                result += '\nelse ' + this.generate(node.elseBranch);
            } else {
                result += '\nelse\n' + this.generate(node.elseBranch);
            }
        }
        
        result += '\nend';
        return result;
    }

    generateMatch(node) {
        let result = 'match ' + this.generate(node.expr) + '\n';
        this.currentIndent += this.indent;
        
        for (const case_ of node.cases || []) {
            result += this.currentIndent + this.generate(case_) + '\n';
        }
        
        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        result += 'end';
        return result;
    }

    generateFor(node) {
        let result = 'for ' + node.variable + ' in ' + this.generate(node.iterable) + '\n';
        result += this.generate(node.body) + '\nend';
        return result;
    }

    generateWhile(node) {
        let result = 'while ' + this.generate(node.condition) + '\n';
        result += this.generate(node.body) + '\nend';
        return result;
    }

    generateTry(node) {
        let result = 'try\n' + this.generate(node.tryBlock);
        
        for (const catch_ of node.catches || []) {
            result += '\ncatch ' + catch_.variable + '\n' + this.generate(catch_.body);
        }
        
        if (node.finallyBlock) {
            result += '\nfinally\n' + this.generate(node.finallyBlock);
        }
        
        result += '\nend';
        return result;
    }

    generateFiber(node) {
        let result = 'fiber {\n';
        result += this.generate(node.body);
        result += '\n}';
        return result;
    }

    generateTemplate(node) {
        const parts = [];
        for (const part of node.parts || []) {
            if (part.type === 'StringLiteral') {
                parts.push(part.value);
            } else {
                parts.push('{');
                parts.push(this.generate(part));
                parts.push('}');
            }
        }
        return '`' + parts.join('') + '`';
    }

    generateIndexExpr(node) {
        return this.generate(node.object) + '[' + this.generate(node.index) + ']';
    }

    generateTrait(node) {
        let result = 'trait ' + node.name + '\n';
        this.currentIndent += this.indent;

        for (const method of node.methods || []) {
            result += this.currentIndent + 'fn ' + method.name + '(';
            result += (method.params || []).map(p => {
                let s = p.name;
                if (p.typeAnnotation) s += ' :: ' + this.generateTypeAnnotation(p.typeAnnotation);
                return s;
            }).join(', ');
            result += ')';
            if (method.returnType) {
                result += ' -> ' + this.generateTypeAnnotation(method.returnType);
            }
            result += '\n';
        }

        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        result += 'end';
        return result;
    }

    generateImpl(node) {
        let result = 'impl ' + node.traitName + ' for ' + node.typeName + '\n';
        this.currentIndent += this.indent;

        for (const method of node.methods || []) {
            result += this.currentIndent + 'fn ' + method.name + '(';
            result += (method.params || []).map(p => {
                let s = p.name;
                if (p.typeAnnotation) s += ' :: ' + this.generateTypeAnnotation(p.typeAnnotation);
                return s;
            }).join(', ');
            result += ')\n';
            result += this.generateBlock(method.body) + '\n';
        }

        this.currentIndent = this.currentIndent.slice(0, -this.indent.length);
        result += 'end';
        return result;
    }

    generateExternFn(node) {
        let result = 'extern ' + (node.lang || 'js') + ' ' + node.name + '(';
        result += (node.params || []).map(p => {
            let s = p.name;
            if (p.typeAnnotation) s += ' :: ' + this.generateTypeAnnotation(p.typeAnnotation);
            return s;
        }).join(', ');
        result += ')';
        if (node.returnType) {
            result += ' -> ' + this.generateTypeAnnotation(node.returnType);
        }
        return result;
    }

    generateTypeAnnotation(type) {
        if (!type) return '';
        
        switch (type.kind) {
            case 'base':
                return type.name;
            case 'option':
                return '?' + type.name;
            case 'result':
                return 'Result[' + type.ok + ', ' + type.err + ']';
            case 'list':
                return 'List[' + this.generateTypeAnnotation(type.element) + ']';
            case 'map':
                return 'Map[' + this.generateTypeAnnotation(type.key) + ', ' + this.generateTypeAnnotation(type.value) + ']';
            case 'function':
                return 'fn(' + type.params.map(p => this.generateTypeAnnotation(p)).join(', ') + ') -> ' + this.generateTypeAnnotation(type.return);
            case 'struct':
                return type.name;
            case 'enum':
                return type.name;
            default:
                return 'Any';
        }
    }

    prettyPrint(node) {
        return this.generate(node);
    }
}

module.exports = { CodeGenerator };