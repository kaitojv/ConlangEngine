import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createGrammarAnalyzer } from '../src/utils/grammarAnalyzer.js';
import { transliterateText, normalizeToBase } from '../src/utils/transliteration.js';

describe('Word Assist Remake: Lexicon Choice, POS & Word Order', () => {
    const richLexicon = [
        { id: 'lex_i', word: 'mi', translation: 'I', wordClass: 'Pronoun' },
        { id: 'lex_you', word: 'tu', translation: 'you', wordClass: 'Pronoun' },
        { id: 'lex_cat', word: 'mew', translation: 'cat', wordClass: 'Noun' },
        { id: 'lex_dog', word: 'vuf', translation: 'dog', wordClass: 'Noun' },
        { id: 'lex_bread', word: 'pan', translation: 'bread', wordClass: 'Noun' },
        { id: 'lex_water_n', word: 'akva', translation: 'water', wordClass: 'Noun' },
        { id: 'lex_water_v', word: 'riega', translation: 'water, to water', wordClass: 'Verb' },
        { id: 'lex_plant', word: 'planta', translation: 'plant', wordClass: 'Noun' },
        { id: 'lex_drink_v', word: 'potas', translation: 'drink, to drink', wordClass: 'Verb' },
        { id: 'lex_drink_n', word: 'beba', translation: 'drink, beverage', wordClass: 'Noun' },
        { id: 'lex_cup', word: 'kupa', translation: 'cup', definition: 'a small bowl used to drink water', wordClass: 'Noun' },
        { id: 'lex_eat', word: 'mangi', translation: 'eat, to eat', wordClass: 'Verb' },
        { id: 'lex_see', word: 'vida', translation: 'see', wordClass: 'Verb' },
        { id: 'lex_chase', word: 'kasa', translation: 'chase', wordClass: 'Verb' },
        { id: 'lex_sleep', word: 'dormi', translation: 'sleep', wordClass: 'Verb' },
        { id: 'lex_be', word: 'esa', translation: 'be, is, are', wordClass: 'Verb' },
        { id: 'lex_father', word: 'patro', translation: 'father', wordClass: 'Noun' },
        { id: 'lex_doctor', word: 'mediko', translation: 'doctor', wordClass: 'Noun' },
        { id: 'lex_black', word: 'nigra', translation: 'black', wordClass: 'Adjective' },
        { id: 'lex_cold', word: 'frida', translation: 'cold', wordClass: 'Adjective' },
        { id: 'lex_house', word: 'doma', translation: 'house', wordClass: 'Noun' },
        { id: 'lex_house_alt', word: 'kasa_h', translation: 'house, home', wordClass: 'Noun' },
        { id: 'lex_in', word: 'en', translation: 'in', wordClass: 'Preposition' },
        { id: 'lex_and', word: 'kaj', translation: 'and', wordClass: 'Conjunction' },
        { id: 'lex_quickly', word: 'rapide', translation: 'quickly', wordClass: 'Adverb' },
        { id: 'lex_where', word: 'kvo', translation: 'where', wordClass: 'Interrogative' },
        { id: 'lex_what', word: 'kio', translation: 'what', wordClass: 'Interrogative' },
        { id: 'lex_today', word: 'hodia', translation: 'today', wordClass: 'Adverb' },
        { id: 'lex_gm', word: 'bonmaten', translation: 'good morning', wordClass: 'Interjection' }
    ];

    const rules = [
        { id: 'r_acc', name: 'Accusative', affix: '-m', appliesTo: 'noun' },
        { id: 'r_pst', name: 'Past', affix: '-ta', appliesTo: 'verb' },
        { id: 'r_pl', name: 'Plural', affix: '-s', appliesTo: 'noun' }
    ];

    it('rescues legacy QCTLJNORVMSAPG default when Grammar syntaxOrder is SVO or SOV', () => {
        const analyzerSVO = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SVO',
            waConfig: { syntaxOrder: 'QCTLJNORVMSAPG' },
            transliterate: s => s
        });
        const resSVO = analyzerSVO.computePhraseSuggestion('I drink water', 13);
        assert.strictEqual(resSVO[0].romanized, 'mi potas akvam');

        const analyzerSOV = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SOV',
            waConfig: { syntaxOrder: 'QCTLJNORVMSAPG' },
            transliterate: s => s
        });
        const resSOV = analyzerSOV.computePhraseSuggestion('I drink water', 13);
        assert.strictEqual(resSOV[0].romanized, 'mi akvam potas');
    });

    it('enforces all canonical syntax orders including VSO, OSV, and OVA', () => {
        const check = (order, expected) => {
            const analyzer = createGrammarAnalyzer({
                lexicon: richLexicon,
                grammarRules: rules,
                syntaxOrder: order,
                waConfig: {},
                transliterate: s => s
            });
            const res = analyzer.computePhraseSuggestion('The cat sees the dog', 20, order);
            assert.strictEqual(res[0].romanized, expected, `Failed for ${order}`);
        };

        check('SVO', 'mew vida vufm');
        check('SOV', 'mew vufm vida');
        check('VSO', 'vida mew vufm');
        check('VOS', 'vida vufm mew');
        check('OVS', 'vufm vida mew');
        check('OSV', 'vufm mew vida');
        check('OVA', 'vufm vida mew');
    });

    it('keeps WH-questions & time before core in SOV and orders predicate adjectives cleanly', () => {
        const analyzerSOV = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SOV',
            waConfig: {},
            transliterate: s => s
        });

        const resQ = analyzerSOV.computePhraseSuggestion('Where did the cat sleep today?', 30, 'SOV');
        assert.strictEqual(resQ[0].romanized, 'kvo hodia mew dormita?');
        const romQ = resQ[0].romanized.replace(/[?.,!]/g, '').split(' ');
        // Where (Q) and today (T) must precede cat (S), and cat must precede slept (V)
        assert.ok(romQ.indexOf('kvo') < romQ.indexOf('mew'), 'Q should precede S in SOV');
        assert.ok(romQ.indexOf('hodia') < romQ.indexOf('mew'), 'T should precede S in SOV');
        assert.ok(romQ.indexOf('mew') < romQ.indexOf('dormita'), 'S should precede V-PST in SOV');

        const resPred = analyzerSOV.computePhraseSuggestion('The cat is black', 16, 'SOV');
        assert.strictEqual(resPred[0].romanized, 'mew nigra esa');
    });

    it('disambiguates Noun/Verb homographs by syntactic context and ignores definition-only pollution', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SVO',
            waConfig: {},
            transliterate: s => s
        });

        // "water" as Verb in "I water the plant" -> riega (NOT akva!)
        const r1 = analyzer.computePhraseSuggestion('I water the plant', 17);
        assert.strictEqual(r1[0].romanized, 'mi riega plantam');

        // "water" as Object Noun in "The dog drinks cold water" -> akvam (NOT riega!)
        const r2 = analyzer.computePhraseSuggestion('The dog drinks cold water', 25);
        assert.strictEqual(r2[0].romanized, 'vuf potas frida akvam');

        // "drink" must choose potas (exact verb gloss), NEVER kupa (cup whose definition says "to drink water")
        const r3 = analyzer.computePhraseSuggestion('I drink', 7);
        assert.strictEqual(r3[0].romanized, 'mi potas');
    });

    it('splits coordinated clauses independently while keeping coordinated NPs together', () => {
        const analyzerSOV = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SOV',
            waConfig: {},
            transliterate: s => s
        });

        // Multi-clause: each clause reorders to SOV around 'kaj', 'you' remains Nominative S
        const rMulti = analyzerSOV.computePhraseSuggestion('I eat bread and you drink water', 33);
        assert.strictEqual(rMulti[0].romanized, 'mi panm mangi kaj tu akvam potas');

        // NP-internal coordination in OVS: "cats and dogs" stay grouped as Subject after Verb
        const analyzerOVS = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'OVS',
            waConfig: {},
            transliterate: s => s
        });
        const rNP = analyzerOVS.computePhraseSuggestion('Cats and dogs drink water', 25);
        assert.strictEqual(rNP[0].romanized, 'akvam potas mews kaj vufs');
    });

    it('attaches manner adverbs to Verb complex rather than stranding on Object NP', () => {
        const analyzerSOV = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SOV',
            waConfig: { advPos: 'before' },
            transliterate: s => s
        });

        const res = analyzerSOV.computePhraseSuggestion('The cat chased the dog quickly', 30);
        // S (mew) O (vufm) [Adv (rapide) V (kasata)]
        assert.strictEqual(res[0].romanized, 'mew vufm rapide kasata');
    });

    it('handles multi-word phrases, candidate switching, and per-occurrence role overrides', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SVO',
            waConfig: {},
            transliterate: s => s
        });

        // Multi-word lexicon phrase
        const resPhrase = analyzer.computePhraseSuggestion('Good morning', 12);
        assert.strictEqual(resPhrase[0].romanized, 'bonmaten');

        // Candidate switching: 'house' has 'doma' and 'kasa_h'
        const resHouse = analyzer.computePhraseSuggestion('I see the house', 15);
        const houseTok = resHouse[0].reordered.find(t => t.original.toLowerCase() === 'house');
        assert.ok(houseTok.candidates.length >= 2, 'Should expose multiple house candidates');
        const houseAlt = analyzer.computePhraseSuggestion('I see the house', 15, 'SVO', {}, 'normal', { [houseTok.occKey]: 'lex_house_alt' });
        assert.ok(houseAlt[0].romanized.includes('kasa_hm'), 'User candidate choice should switch to lex_house_alt');

        // Per-occurrence role override: only override 2nd "cat" without affecting 1st "cat"
        const resTwoCats = analyzer.computePhraseSuggestion('cat and cat', 11);
        const firstOccKey = resTwoCats[0].reordered[0].occKey;
        const thirdOccKey = resTwoCats[0].reordered[2].occKey;
        assert.notStrictEqual(firstOccKey, thirdOccKey, 'Identical words must have distinct occKeys');
        const overridden = analyzer.computePhraseSuggestion('cat and cat', 11, 'SVO', { [thirdOccKey]: 'J' });
        const b = overridden[0].wordBreakdown;
        assert.strictEqual(b[0].role, 'S');
        assert.strictEqual(b[2].role, 'J');
    });

    it('keeps copula predicate nominals un-accusatived and fixes What did you eat?', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SVO',
            waConfig: {},
            transliterate: s => s
        });

        const resCop = analyzer.computePhraseSuggestion('Father is a doctor', 18);
        assert.strictEqual(resCop[0].romanized, 'patro esa mediko');

        const resWhQ = analyzer.computePhraseSuggestion('What did you eat?', 17);
        // Question word + Nominative 'tu' + Past 'mangita' (support 'did' swallowed cleanly, 'you' is S)
        assert.strictEqual(resWhQ[0].romanized, 'kio tu mangita?');
    });

    it('never hangs when alphabetGlyphs or syllabaryMap contain empty or mode-only keys', () => {
        const linearConfig = {
            phonologyTypes: 'alphabetic',
            alphabeticScript: 'custom',
            alphabetGlyphs: { '': '\uE000', '_uppercase': '\uE001', '_cursive': '\uE002', a: '\uE003' },
            consonants: 't, k',
            vowels: 'a'
        };
        assert.strictEqual(transliterateText('[cat] ka', linearConfig, richLexicon), '[c\uE003t] k\uE003');
        assert.strictEqual(normalizeToBase('k\uE003', linearConfig), 'ka');

        const syllabicLtr = {
            phonologyTypes: 'syllabic',
            syllabificationAlgorithm: 'ltr',
            syllabaryMap: { '': '\uE010', ka: '\uE011' }
        };
        assert.strictEqual(transliterateText('ka.ta', syllabicLtr, richLexicon), '\uE011ta');

        const syllabicRtl = {
            phonologyTypes: 'syllabic',
            syllabificationAlgorithm: 'rtl',
            syllabaryMap: { '': '\uE010', ka: '\uE011' }
        };
        assert.strictEqual(transliterateText('ka.ta', syllabicRtl, richLexicon), '\uE011ta');

        const analyzer = createGrammarAnalyzer({
            lexicon: richLexicon,
            grammarRules: rules,
            syntaxOrder: 'SVO',
            waConfig: { copulaBehavior: 'zero_copula', copulaReplacement: 'ne' },
            transliterate: (s, lex) => transliterateText(s, linearConfig, lex)
        });
        const suggs = analyzer.computePhraseSuggestion('The cat is unknownword', 22);
        assert.ok(Array.isArray(suggs) && suggs.length > 0);
    });
});
