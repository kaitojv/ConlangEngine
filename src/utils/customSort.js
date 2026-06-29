export function createCustomAlphabetCollator(customAlphabetString) {
    if (!customAlphabetString || !customAlphabetString.trim()) {
        return null; // Fallback to localeCompare if no custom alphabet
    }

    const alphabetTokens = customAlphabetString
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
        
    if (alphabetTokens.length === 0) return null;

    // Create a map of token to its sort weight
    const weightMap = new Map();
    alphabetTokens.forEach((token, index) => {
        weightMap.set(token.toLowerCase(), index);
    });

    // Sort tokens by length descending so we match digraphs (e.g. 'ch') before single chars ('c')
    const sortedTokens = [...alphabetTokens].sort((a, b) => b.length - a.length);

    // Helper to tokenize a word into custom alphabet units
    function tokenize(word) {
        const tokens = [];
        let remaining = word.toLowerCase();
        
        while (remaining.length > 0) {
            let matched = false;
            for (const token of sortedTokens) {
                const tokenLower = token.toLowerCase();
                if (remaining.startsWith(tokenLower)) {
                    tokens.push(tokenLower);
                    remaining = remaining.slice(tokenLower.length);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // If character not in custom alphabet, push it as is (put it at end or beginning)
                tokens.push(remaining[0]);
                remaining = remaining.slice(1);
            }
        }
        return tokens;
    }

    return function compare(a, b) {
        const tokensA = tokenize(a);
        const tokensB = tokenize(b);

        const len = Math.min(tokensA.length, tokensB.length);
        for (let i = 0; i < len; i++) {
            const tokenA = tokensA[i];
            const tokenB = tokensB[i];
            
            const weightA = weightMap.has(tokenA) ? weightMap.get(tokenA) : 99999 + tokenA.charCodeAt(0);
            const weightB = weightMap.has(tokenB) ? weightMap.get(tokenB) : 99999 + tokenB.charCodeAt(0);

            if (weightA !== weightB) {
                return weightA - weightB;
            }
        }
        return tokensA.length - tokensB.length;
    };
}

export function extractFirstCustomLetter(word, customAlphabetString) {
    if (!customAlphabetString || !customAlphabetString.trim() || !word) {
        return word ? word.charAt(0).toUpperCase() : '';
    }

    const alphabetTokens = customAlphabetString
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

    const lowerWord = word.toLowerCase();
    for (const token of alphabetTokens) {
        if (lowerWord.startsWith(token.toLowerCase())) {
            // Return with original casing formatting if possible, or just capitalize the token
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
        }
    }
    return word.charAt(0).toUpperCase();
}
