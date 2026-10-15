import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createGrammarAnalyzer } from '../src/utils/grammarAnalyzer.js';

describe('Live Conlang Translator Engine (grammarAnalyzer.js)', () => {
    const sampleLexicon = [
        { id: 1, word: 'mew', translation: 'cat', wordClass: 'Noun' },
        { id: 2, word: 'vuf', translation: 'dog', wordClass: 'Noun' },
        { id: 3, word: 'pari', translation: 'see, watch', wordClass: 'Verb' },
        { id: 4, word: 'dona', translation: 'give', wordClass: 'Verb' },
        { id: 5, word: 'doma', translation: 'house', wordClass: 'Noun' },
        { id: 6, word: 'libra', translation: 'book', wordClass: 'Noun' },
        { id: 7, word: 'mari', translation: 'Mary', wordClass: 'Noun' },
        { id: 8, word: 'kala', translation: 'black', wordClass: 'Adjective' }
    ];

    const sampleGrammarRules = [
        { id: 'r_acc', name: 'Accusative Case', affix: '-m', appliesTo: 'noun', gloss: 'ACC' },
        { id: 'r_dat', name: 'Dative Case', affix: '-vi', appliesTo: 'noun', gloss: 'DAT' },
        { id: 'r_loc', name: 'Locative Case', affix: '-ra', appliesTo: 'noun', gloss: 'LOC' },
        { id: 'r_ins', name: 'Instrumental Case', affix: '-to', appliesTo: 'noun', gloss: 'INS' },
        { id: 'r_pst', name: 'Past Tense', affix: '-ta', appliesTo: 'verb', gloss: 'PST' },
        { id: 'r_pl',  name: 'Plural', affix: '-s', appliesTo: 'noun', gloss: 'PL' }
    ];

    const personRules = [
        { id: '1s', person: '1st', number: 'S', freeForm: 'yo', affix: '-mi' },
        { id: '3s', person: '3rd', number: 'S', freeForm: 'ta', affix: '-ti' }
    ];

    it('translates simple SVO sentence with Accusative case on object', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The cat sees the dog', 20);
        assert.ok(res && res.length > 0, 'Should return suggestion');
        const primary = res[0];
        // "cat" is Subject (mew), "sees" is Verb (pari), "dog" is Object with Accusative -m (vufm)
        assert.ok(primary.romanized.includes('mew'), 'Should include cat');
        assert.ok(primary.romanized.includes('pari'), 'Should include see');
        assert.ok(primary.romanized.includes('vufm'), 'Object dog should have accusative -m');
    });

    it('reorders SVO to SOV according to Grammar Page syntaxOrder', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SOV',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The cat sees the dog', 20);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        const words = primary.romanized.split(' ').filter(w => w !== 'the');
        // In SOV: Subject (mew) ... Object (vufm) ... Verb (pari)
        const mewIdx = words.findIndex(w => w.includes('mew'));
        const vufIdx = words.findIndex(w => w.includes('vuf'));
        const pariIdx = words.findIndex(w => w.includes('pari'));
        assert.ok(mewIdx < vufIdx, 'Subject should precede Object in SOV');
        assert.ok(vufIdx < pariIdx, 'Object should precede Verb in SOV');
    });

    it('replaces English prepositions with Locative case affix (Option 1)', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: s => s,
            replacePrepositionsWithCase: true
        });

        const res = analyzer.computePhraseSuggestion('The cat sees the dog in the house', 34);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        // "in" should be swallowed, and "house" (doma) should receive Locative -ra -> domara
        assert.ok(primary.romanized.includes('domara'), 'House should have locative -ra');
        assert.ok(!primary.romanized.includes('[in]'), 'Preposition "in" should be swallowed');
    });

    it('identifies ditransitive Dative case on indirect object', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The cat gives Mary a book', 25);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        // Mary should receive Dative -vi -> marivi
        // book should receive Accusative -m -> libram
        assert.ok(primary.romanized.includes('marivi'), 'Indirect object Mary should receive dative -vi');
        assert.ok(primary.romanized.includes('libram'), 'Direct object book should receive accusative -m');
    });

    it('conjugates verb with past tense from irregular/regular English input', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The cat saw the dog', 19);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        // "saw" is past tense of "see" (pari) -> parita
        assert.ok(primary.romanized.includes('parita'), 'Verb should receive past tense -ta');
    });

    it('supports Ergative-Absolutive alignment when configured', () => {
        const ergGrammarRules = [
            ...sampleGrammarRules,
            { id: 'r_erg', name: 'Ergative Case', affix: '-ka', appliesTo: 'noun', gloss: 'ERG' },
            { id: 'r_abs', name: 'Absolutive Case', affix: '-o', appliesTo: 'noun', gloss: 'ABS' }
        ];

        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: ergGrammarRules,
            syntaxOrder: 'SVO',
            alignment: 'ergative',
            personRulesArray: personRules,
            transliterate: s => s
        });

        // Transitive sentence: Subject cat gets Ergative -ka -> mewka, Object dog gets Absolutive -o -> vufo
        const resTrans = analyzer.computePhraseSuggestion('The cat sees the dog', 20);
        assert.ok(resTrans?.[0]?.romanized.includes('mewka'), 'Transitive subject should receive ergative -ka');
        assert.ok(resTrans?.[0]?.romanized.includes('vufo'), 'Object should receive absolutive -o');
    });

    it('respects post-nominal adjective placement', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: sampleLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            adjectivePlacement: 'post-nominal',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('The black cat sees the dog', 26);
        assert.ok(res && res.length > 0);
        const words = res[0].romanized.split(' ');
        const mewIdx = words.findIndex(w => w.includes('mew'));
        const kalaIdx = words.findIndex(w => w.includes('kala'));
        assert.ok(mewIdx < kalaIdx, 'Noun (mew) should precede post-nominal Adjective (kala)');
    });

    it('matches "eat" to verb "glofur" and avoids noun "brizorθi" containing "heat"', () => {
        const customLexicon = [
            { id: 10, word: 'glofur', translation: 'to eat', wordClass: 'Verb' },
            { id: 11, word: 'brizorθi', translation: 'weather, intense heat, coldness', wordClass: 'Noun' },
            { id: 12, word: "ir'sólai", translation: 'apple', wordClass: 'Noun' },
            { id: 13, word: 'mau', translation: 'I', wordClass: 'Pronoun' }
        ];

        const analyzer = createGrammarAnalyzer({
            lexicon: customLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('I eat an apple', 14);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        assert.ok(primary.romanized.includes('glofur'), 'Should select glofur for eat');
        assert.ok(!primary.romanized.includes('brizor'), 'Should NOT match brizorθi (heat) for eat');
    });

    it('strictly enforces OVS word order (Object -> Verb -> Subject)', () => {
        const customLexicon = [
            { id: 10, word: 'glofur', translation: 'to eat', wordClass: 'Verb' },
            { id: 12, word: "ir'sólai", translation: 'apple', wordClass: 'Noun' },
            { id: 13, word: 'mau', translation: 'I', wordClass: 'Pronoun' }
        ];

        const analyzer = createGrammarAnalyzer({
            lexicon: customLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'OVS',
            personRulesArray: personRules,
            transliterate: s => s
        });

        const res = analyzer.computePhraseSuggestion('I eat an apple', 14, 'OVS');
        assert.ok(res && res.length > 0);
        const primary = res[0];
        const words = primary.romanized.split(' ');
        const appleIdx = words.findIndex(w => w.includes("ir'sólai"));
        const eatIdx = words.findIndex(w => w.includes('glofur'));
        const iIdx = words.findIndex(w => w.includes('mau'));

        assert.ok(appleIdx !== -1, 'Apple must be present');
        assert.ok(eatIdx !== -1, 'Eat must be present');
        assert.ok(iIdx !== -1, 'I must be present');

        assert.ok(appleIdx < eatIdx, 'Object (apple) must precede Verb (eat) in OVS');
        assert.ok(eatIdx < iIdx, 'Verb (eat) must precede Subject (I) in OVS');
    });

    it('displays words with orthographic glyphs (ṫ) instead of raw phonetic sounds (θ)', () => {
        const orthographyLexicon = [
            { id: 20, word: 'brizorθi', translation: 'cold', wordClass: 'Verb' }
        ];

        const fakeTransliterator = (str) => {
            return (str || '').replace(/θ/g, 'ṫ');
        };

        const analyzer = createGrammarAnalyzer({
            lexicon: orthographyLexicon,
            grammarRules: sampleGrammarRules,
            syntaxOrder: 'SVO',
            personRulesArray: personRules,
            transliterate: fakeTransliterator
        });

        const res = analyzer.computePhraseSuggestion('cold', 4);
        assert.ok(res && res.length > 0);
        const primary = res[0];
        assert.ok(primary.romanized.includes('brizorṫi'), 'Romanized should have ṫ');
        assert.ok(!primary.romanized.includes('brizorθi'), 'Romanized should NOT retain raw sound θ');
    });
});


