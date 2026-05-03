export function analyzeCode(code) {
    const lines = code.split('\n');
    const result = {
        functions: [],
        classes: [],
        variables: [],
        imports: [],
        exports: []
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNum = i + 1;
        const funcMatch = line.match(/^(?:async\s+)?function\s+(\w+)/);
        if (funcMatch) {
            const paramsMatch = line.match(/\(([^)]*)\)/);
            result.functions.push({
                name: funcMatch[1],
                line: lineNum,
                params: paramsMatch ? paramsMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [],
                async: line.startsWith('async')
            });
        }
        const arrowMatch = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
        if (arrowMatch) {
            const paramsMatch = line.match(/\(([^)]*)\)/);
            result.functions.push({
                name: arrowMatch[1],
                line: lineNum,
                params: paramsMatch ? paramsMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [],
                async: line.includes('async')
            });
        }
        const classMatch = line.match(/^class\s+(\w+)/);
        if (classMatch) {
            result.classes.push({
                name: classMatch[1],
                line: lineNum,
                methods: []
            });
        }
        const varMatch = line.match(/^(?:const|let|var)\s+(\w+)/);
        if (varMatch && !line.includes('=') === false) {
            result.variables.push({
                name: varMatch[1],
                line: lineNum
            });
        }
        const importMatch = line.match(/^import\s+(?:{([^}]*)}|(\w+)|\*)\s+from\s+['"]([^'"]+)['"]/);
        if (importMatch) {
            result.imports.push({
                source: importMatch[3],
                imports: importMatch[1] ? importMatch[1].split(',').map(i => i.trim()) : ['default']
            });
        }
        const exportMatch = line.match(/^export\s+(?:const|let|var|function|class)\s+(\w+)/);
        if (exportMatch) {
            result.exports.push({
                name: exportMatch[1],
                line: lineNum
            });
        }
    }
    return result;
}
export function formatAnalysis(result) {
    let output = '# Code Analysis\n\n';
    if (result.functions.length) {
        output += '## Functions\n';
        for (const f of result.functions) {
            output += `- ${f.name} (line ${f.line})${f.async ? ' [async]' : ''}\n`;
        }
        output += '\n';
    }
    if (result.classes.length) {
        output += '## Classes\n';
        for (const c of result.classes) {
            output += `- ${c.name} (line ${c.line})\n`;
        }
        output += '\n';
    }
    if (result.variables.length) {
        output += '## Variables\n';
        for (const v of result.variables) {
            output += `- ${v.name} (line ${v.line})\n`;
        }
        output += '\n';
    }
    if (result.imports.length) {
        output += '## Imports\n';
        for (const imp of result.imports) {
            output += `- from ${imp.source}: ${imp.imports.join(', ')}\n`;
        }
        output += '\n';
    }
    if (result.exports.length) {
        output += '## Exports\n';
        for (const exp of result.exports) {
            output += `- ${exp.name} (line ${exp.line})\n`;
        }
    }
    return output;
}
