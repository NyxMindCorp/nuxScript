/**
 * nuxScript Regex Engine
 * Regex nativo com sintaxe única
 */

class RegexEngine {
    constructor(pattern, flags = '') {
        this.pattern = pattern;
        this.flags = flags;
        this.regex = new RegExp(pattern, flags);
    }

    static from(pattern) {
        if (pattern instanceof RegexEngine) return pattern;
        
        // Parse nuxScript regex syntax
        let parsed = this.parseRegex(pattern);
        return new RegexEngine(parsed.pattern, parsed.flags);
    }

    static parseRegex(pattern) {
        let flags = '';
        let regex = pattern;
        
        // Extract flags: /pattern/gim
        const match = pattern.match(/^\/(.*)\/([gimsuy]*)$/);
        if (match) {
            regex = match[1];
            flags = match[2];
        }
        
        return { pattern: regex, flags };
    }

    match(str) {
        if (!str) return null;
        
        if (this.flags.includes('g')) {
            const matches = [];
            let m;
            const re = new RegExp(this.pattern, this.flags.replace('g', ''));
            while ((m = re.exec(str)) !== null) {
                matches.push({
                    full: m[0],
                    groups: m.slice(1),
                    index: m.index,
                });
                if (!re.global) break;
            }
            return matches.length > 0 ? matches : null;
        }
        
        const m = str.match(this.regex);
        if (!m) return null;
        
        return {
            full: m[0],
            groups: m.slice(1),
            index: m.index,
        };
    }

    test(str) {
        return this.regex.test(str);
    }

    replace(str, replacement) {
        if (typeof replacement === 'function') {
            return str.replace(this.regex, (match, ...args) => {
                return replacement(match, ...args.slice(0, -2));
            });
        }
        return str.replace(this.regex, replacement);
    }

    split(str) {
        return str.split(this.regex);
    }

    findAll(str) {
        if (!str) return [];
        
        const matches = [];
        let m;
        const re = new RegExp(this.pattern, this.flags.includes('g') ? this.flags : this.flags + 'g');
        
        while ((m = re.exec(str)) !== null) {
            matches.push({
                full: m[0],
                groups: m.slice(1),
                index: m.index,
            });
            if (m[0].length === 0) re.lastIndex++;
        }
        
        return matches;
    }
}

// nuxScript regex literals
function parseRegexLiteral(code) {
    // r"pattern" ou r'pattern'
    const match = code.match(/^r["'](.+?)["']$/);
    if (match) {
        return RegexEngine.from(match[1]);
    }
    
    // /pattern/flags
    const slashMatch = code.match(/^\/(.+?)\/([gimsuy]*)$/);
    if (slashMatch) {
        return RegexEngine.from(slashMatch[1], slashMatch[2]);
    }
    
    return null;
}

// Built-in regex functions
const regexBuiltins = {
    // Match operator ~ 
    match: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        return re.match(str);
    },
    
    // Test operator ~/r
    test: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        return re.test(str);
    },
    
    // Contains with regex ~ 
    contains: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        return re.test(str);
    },
    
    // Replace with regex
    replace: (str, pattern, replacement) => {
        const re = RegexEngine.from(pattern);
        return re.replace(str, replacement);
    },
    
    // Split with regex
    split: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        return re.split(str);
    },
    
    // Find all matches
    findAll: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        return re.findAll(str);
    },
    
    // Extract groups by name
    extract: (str, pattern) => {
        const re = RegexEngine.from(pattern);
        const match = re.match(str);
        if (!match) return null;
        
        // Return object with named groups
        const result = { full: match.full };
        match.groups.forEach((g, i) => {
            result[`${i + 1}`] = g;
        });
        return result;
    },
    
    // Compile regex from string
    compile: (pattern) => RegexEngine.from(pattern),
    
    // Check if valid regex
    isValid: (pattern) => {
        try {
            RegexEngine.from(pattern);
            return true;
        } catch {
            return false;
        }
    },
    
    // Escape special characters
    escape: (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
};

module.exports = { RegexEngine, regexBuiltins, parseRegexLiteral };