const extendedLexicon = [
    { word: "mas", translation: "1st P" }
];

const affixMap = {
    "ir'": { label: "Acusative", translation: "" }
};

const findEntry = (token) => {
    const clean = token.replace(/[.,!?()[\]{}"`:;]/g, '').replace(/[‘’]/g, "'").toLowerCase();
    
    let entry = extendedLexicon.find(e => e.word.replace(/\*/g,'').replace(/[‘’]/g, "'").toLowerCase() === clean);
    if (entry) return { entry, isExact: true };

    const sortedLexicon = [...extendedLexicon].sort((a, b) => b.word.length - a.word.length);
    for (const e of sortedLexicon) {
        const root = e.word.replace(/\*/g,'').replace(/[‘’]/g, "'").toLowerCase();
        if (root.length >= 2 && clean.includes(root) && clean !== root) {
            const affixPart = clean.replace(root, '');
            const affixData = affixMap[affixPart] || affixMap[affixPart.replace(/^['"-]|['"-]$/g, '')] || { label: affixPart, translation: '' };
            return { entry: e, isExact: false, personData: affixData };
        }
    }
    return { entry: null, isExact: false };
};

console.log(findEntry("ir'mas"));
