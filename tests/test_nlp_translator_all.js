import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createGrammarAnalyzer } from '../src/utils/grammarAnalyzer.js';

describe('NLP & Live Translator Enhancements', () => {
    const sampleLexicon = [
        { id: 1, word: 'akva', translation: 'water (noun)', wordClass: 'Noun' },
        { id: 2, word: 'potas', translation: 'to drink', wordClass: 'Verb' },
        { id: 3, word: 'mi', translation: 'I', wordClass: 'Pronoun' },
        { id: 4, word: 'glofur', translation: 'eat, to eat', wordClass: 'Verb' },
        { id: 5, word: 'brizorṫi', translation: 'cold', wordClass: 'Adjective' },
        { id: 6, word: 'brizor', translation: 'cold', wordClass: 'Noun' },
        { id: 7, word: 'liu', translation: 'it', wordClass: 'Pronoun' },
        { id: 8, word: 'volas', translation: 'want', wordClass: 'Verb' },
        { id: 9, word: 'faras', translation: 'do', wordClass: 'Verb' }
    ];

    const sampleRules = [
        { id: 'r_acc', name: 'Accusative', affix: "ir'-", appliesTo: 'all', gloss: 'ACC' }
    ];

    it('translates "I drink water" in OVS order', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleRules,
            syntaxOrder: 'OVS',
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('I drink water', 13, 'OVS');
        assert.ok(res && res.length > 0, 'Should return suggestion');
        const primary = res[0];
        console.log('I drink water (OVS):', primary.romanized);
        // OVS: Object (water with accusative ir'-) -> Verb (potas) -> Subject (mi)
        assert.ok(primary.romanized.includes('ir\'akva') || primary.romanized.includes('akva'));
        assert.ok(primary.romanized.includes('potas'));
        assert.ok(primary.romanized.includes('mi'));
    });

    it('translates "I drink water" even with trailing newline or cursor at end', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleRules,
            syntaxOrder: 'OVS',
            transliterate: s => s
        });

        const textWithNewline = 'I drink water\n';
        const res = analyzer.computePhraseSuggestion(textWithNewline, textWithNewline.length, 'OVS');
        assert.ok(res && res.length > 0, 'Should not return null on trailing newline');
    });

    it('does not duplicate affixes like ir\'ir\'', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleRules,
            syntaxOrder: 'OVS',
            waConfig: {
                triggers: [
                    { id: 'tr_acc', name: 'Accusative', trigger: 'O', marker: "ir'-", position: 'prefix', type: 'trigger' }
                ]
            },
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('I want to do it', 15, 'SVO');
        assert.ok(res && res.length > 0);
        const primary = res[0];
        console.log('I want to do it:', primary.romanized);
        assert.ok(!primary.romanized.includes("ir'ir'"), 'Must not duplicate affix ir\'ir\'');
    });

    it('correctly tags cold as Adjective in "The cold water"', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleRules,
            syntaxOrder: 'SVO',
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The cold water', 14, 'SVO');
        assert.ok(res && res.length > 0);
        const primary = res[0];
        const coldToken = primary.wordBreakdown.find(w => w.original?.toLowerCase() === 'cold');
        assert.ok(coldToken, 'Should find cold token');
        assert.strictEqual(coldToken.role, 'J', 'cold should be classified as Adjective');
        assert.strictEqual(coldToken.entry?.word, 'brizorṫi', 'cold should match the Adjective entry, not the Noun');
    });

    it('correctly follows negation syntactic priority order for "I don\'t want to sleep"', () => {
        const lex = [
            { word: 'mau', translation: 'I', wordClass: 'pronoun' },
            { word: 'vunir', translation: 'want', wordClass: 'verb' },
            { word: 'lɔnur', translation: 'sleep', wordClass: 'verb' },
            { word: 'iṫo', translation: 'not', wordClass: 'particle' }
        ];

        // 1. Negation before Verb (order: OQCLTRNPDVMS)
        const order1 = 'OQCLTRNPDVMS';
        const analyzer1 = createGrammarAnalyzer({
            lexicon: lex,
            syntaxOrder: order1,
            waConfig: { syntaxOrder: order1 }
        });
        const res1 = analyzer1.computePhraseSuggestion("I don't want to sleep", 20, order1);
        assert.ok(res1 && res1.length > 0);
        assert.strictEqual(res1[0].display, 'iṫo vunir lɔnur mau');

        // 2. Negation after Verb (order: OQCLTRPDVMNS)
        const order2 = 'OQCLTRPDVMNS';
        const analyzer2 = createGrammarAnalyzer({
            lexicon: lex,
            syntaxOrder: order2,
            waConfig: { syntaxOrder: order2 }
        });
        const res2 = analyzer2.computePhraseSuggestion("I don't want to sleep", 20, order2);
        assert.ok(res2 && res2.length > 0);
        assert.strictEqual(res2[0].display, 'vunir lɔnur iṫo mau');

        // 3. Negation at end (order: OQCLTRPDVMSN)
        const order3 = 'OQCLTRPDVMSN';
        const analyzer3 = createGrammarAnalyzer({
            lexicon: lex,
            syntaxOrder: order3,
            waConfig: { syntaxOrder: order3 }
        });
        const res3 = analyzer3.computePhraseSuggestion("I don't want to sleep", 20, order3);
        assert.ok(res3 && res3.length > 0);
        assert.strictEqual(res3[0].display, 'vunir lɔnur mau iṫo');
    });
});

