const lexicon = [ { word: 'nit', wordClass: 'noun' }, { word: 'mas', wordClass: 'pronoun' } ];
const affixMap = { "ir'": { label: 'Acusative' } };

const findEntry = (token) => {
    const clean = token.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
    
    let entry = lexicon.find(e => e.word.replace(/\*/g,'').toLowerCase() === clean);
    if (entry) return { entry, isExact: true };

    const sortedLexicon = [...lexicon].sort((a, b) => b.word.length - a.word.length);
    for (const e of sortedLexicon) {
        const root = e.word.replace(/\*/g,'').toLowerCase();
        if (root.length >= 2 && clean.includes(root) && clean !== root) {
            const affixPart = clean.replace(root, '');
            const affixData = affixMap[affixPart] || affixMap[affixPart.replace(/^['"-]|['"-]$/g, '')];
            if (affixData) {
                return { entry: e, isExact: false, personData: affixData };
            }
        }
    }
    return { entry: null, isExact: false };
};

console.log(findEntry("ir'mas"));
