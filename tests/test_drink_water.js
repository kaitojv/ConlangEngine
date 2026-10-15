import { createGrammarAnalyzer } from '../src/utils/grammarAnalyzer.js';

const mockLexicon = [
    { id: '1', word: 'mau', translation: 'I', wordClass: 'pronoun' },
    { id: '2', word: 'potas', translation: 'drink', wordClass: 'verb' },
    { id: '3', word: 'akva', translation: 'water', wordClass: 'noun' },
    { id: '4', word: 'vunir', translation: 'want', wordClass: 'verb' },
    { id: '5', word: 'ajλr', translation: 'do', wordClass: 'verb' },
    { id: '6', word: 'liu', translation: 'it', wordClass: 'pronoun' },
    { id: '7', word: 'glofur', translation: 'eat, to eat', wordClass: 'verb' },
    { id: '8', word: 'brizorṫi', translation: 'cold', wordClass: 'noun' }, // abstract noun
    { id: '9', word: 'frio', translation: 'cold', wordClass: 'adjective' }, // adjective
    { id: '10', word: 'kaldo', translation: 'cold', wordClass: 'verb' } // verb "to cold"
];

const mockGrammarRules = [
    { id: 'r1', name: 'accusative', affix: "ir'", position: 'prefix', appliesTo: 'all' },
    { id: 'r2', name: 'nominative', affix: '', position: 'suffix', appliesTo: 'all' }
];

console.log("=== 1. Testing 'I drink water' (OVS) ===");
const analyzerOVS = createGrammarAnalyzer({
    lexicon: mockLexicon,
    grammarRules: mockGrammarRules,
    syntaxOrder: 'OVS',
    waConfig: {
        syntaxOrder: 'OVS'
    },
    personRulesArray: [],
    transliterate: (s) => s
});

const res1 = analyzerOVS.computePhraseSuggestion("I drink water", 13, 'OVS', {});
console.log("Suggestions count:", res1?.length);
const p1 = res1?.[0];
console.log("Romanized:", p1?.romanized);
console.log("Roles:", p1?.reordered?.map(t => `${t.original}:${t.role}${t.found ? '(found)' : '(missing)'}${t.swallowed ? '(swallowed)' : ''}`).join(', '));

console.log("\n=== 2. Testing 'I want to do it' (OVS) ===");
const res2 = analyzerOVS.computePhraseSuggestion("I want to do it", 16, 'OVS', {});
const p2 = res2?.[0];
console.log("Romanized:", p2?.romanized);
console.log("Roles:", p2?.reordered?.map(t => `${t.original}:${t.role}${t.found ? '(found)' : '(missing)'}${t.swallowed ? '(swallowed)' : ''}`).join(', '));

console.log("\n=== 3. Testing Syntactic Priority custom order (SOV vs VOS) ===");
const analyzerSOV = createGrammarAnalyzer({
    lexicon: mockLexicon,
    grammarRules: mockGrammarRules,
    syntaxOrder: 'SOV',
    waConfig: { syntaxOrder: 'SOV' },
    personRulesArray: [],
    transliterate: (s) => s
});
const resSOV = analyzerSOV.computePhraseSuggestion("I drink water", 13, 'SOV', {});
console.log("SOV Romanized:", resSOV?.[0]?.romanized);

const analyzerVOS = createGrammarAnalyzer({
    lexicon: mockLexicon,
    grammarRules: mockGrammarRules,
    syntaxOrder: 'VOS',
    waConfig: { syntaxOrder: 'VOS' },
    personRulesArray: [],
    transliterate: (s) => s
});
const resVOS = analyzerVOS.computePhraseSuggestion("I drink water", 13, 'VOS', {});
console.log("VOS Romanized:", resVOS?.[0]?.romanized);

console.log("\n=== 4. Testing full 14-role custom priority string VJOQLTNRMAPGS ===");
const analyzerFull14 = createGrammarAnalyzer({
    lexicon: mockLexicon,
    grammarRules: mockGrammarRules,
    syntaxOrder: 'SVO',
    waConfig: { syntaxOrder: 'VJOQLTNRMAPGS' },
    personRulesArray: [],
    transliterate: (s) => s
});
const res14 = analyzerFull14.computePhraseSuggestion("I drink water", 13, 'VJOQLTNRMAPGS', {});
console.log("VJOQLTNRMAPGS Romanized:", res14?.[0]?.romanized);

console.log("\n=== 5. Testing Part of Speech disambiguation (noun vs adj vs verb for 'cold') ===");
// In "The cold water", "cold" is before noun "water" -> Adjective (should pick 'frio', not 'brizorṫi' or 'kaldo')
const resAdj = analyzerOVS.computePhraseSuggestion("The cold water", 14, 'OVS', {});
const pAdj = resAdj?.[0];
console.log("Adjective 'cold' -> Conlang word:", pAdj?.reordered?.find(t => t.original.toLowerCase() === 'cold')?.entry?.word);
console.log("Adjective 'cold' -> WordClass:", pAdj?.reordered?.find(t => t.original.toLowerCase() === 'cold')?.entry?.wordClass);

// In "I want to cold", "cold" is after infinitive "to" -> Verb (should pick 'kaldo')
const resVerb = analyzerOVS.computePhraseSuggestion("I want to cold", 14, 'OVS', {});
const pVerb = resVerb?.[0];
console.log("Verb 'cold' -> Conlang word:", pVerb?.reordered?.find(t => t.original.toLowerCase() === 'cold')?.entry?.word);
console.log("Verb 'cold' -> WordClass:", pVerb?.reordered?.find(t => t.original.toLowerCase() === 'cold')?.entry?.wordClass);

console.log("\n=== 6. Testing direct Conlang word lookup (glofur = eat) ===");
const resConlang = analyzerOVS.computePhraseSuggestion("I glofur water", 14, 'OVS', {});
const pConlang = resConlang?.[0];
console.log("Direct Conlang word 'glofur' -> Found:", pConlang?.reordered?.find(t => t.original.toLowerCase() === 'glofur')?.found);
console.log("Direct Conlang word 'glofur' -> Role:", pConlang?.reordered?.find(t => t.original.toLowerCase() === 'glofur')?.role);
console.log("Direct Conlang word 'glofur' -> WordClass:", pConlang?.reordered?.find(t => t.original.toLowerCase() === 'glofur')?.entry?.wordClass);
