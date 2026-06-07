/**
 * Utility to auto-generate IPA from an orthographic word using a set of comma-separated rules.
 * Rules format: "oo=oʊ, uu=uː, ch=tʃ, c=k"
 */

export const generateIpaFromWord = (word, mappingString) => {
    if (!mappingString || !word) return '';

    // Parse the mapping string into an array of rules
    const rules = mappingString.split(',').map(s => {
        const parts = s.split('=');
        if (parts.length === 2) {
            return { from: parts[0].trim(), to: parts[1].trim() };
        }
        return null;
    }).filter(rule => rule && rule.from && rule.to);

    if (rules.length === 0) return word.toLowerCase();

    // Sort rules by length of 'from' string descending so longer matches happen first
    rules.sort((a, b) => b.from.length - a.from.length);

    // Escape regex special characters in 'from' strings
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a regex that matches any of the 'from' patterns
    const escapedFroms = rules.map(r => escapeRegex(r.from));
    const regex = new RegExp(`(${escapedFroms.join('|')})`, 'g');

    // Create a fast lookup map for the replacements
    const ruleMap = Object.fromEntries(rules.map(r => [r.from, r.to]));

    // Perform a single-pass replacement to avoid rule chaining issues
    // Example: if a=b and b=c, 'a' should become 'b', not 'c'.
    return word.toLowerCase().replace(regex, match => ruleMap[match]);
};
