import assert from 'node:assert/strict';
import {
    applyRuleToWord,
    expandPhonemeMacros,
    validateRegexRule,
} from '../src/utils/morphologyEngine.js';
import {
    getCommonPatterns,
    getSyllablePresetBundles,
    importClassMarkersFromGrammar,
    extractComplexGrammarRules,
    generateWordFromConfig,
} from '../src/utils/wordGeneratorEngine.js';
import { VALID_CONFIG_KEYS } from '../src/utils/schemaValidator.js';

console.log('Running Word Generator & Complex Regex Rules Tests...');

// 1. Common patterns & preset bundles (including otherPhonemeMapping)
{
    const basePatterns = getCommonPatterns('');
    assert.ok(basePatterns.includes('CV'));
    assert.ok(basePatterns.includes('(C)V(C)'));

    const withOther = getCommonPatterns('N');
    assert.ok(withOther.includes('CVN'));
    assert.ok(withOther.includes('(C)VN'));

    const bundles = getSyllablePresetBundles('N');
    assert.ok(bundles.some(b => b.id === 'open' && b.patterns === 'CV, V'));
    assert.ok(bundles.some(b => b.id === 'otherCoda' && b.patterns.includes('CVN')));
}

// 2. Phoneme class macros (@V, @C, @O) and chained regex rules (;) in morphologyEngine
{
    const phon = { vowels: 'a, e, ɪ=i', consonants: 'p, t, k, ʃ=sh', otherPhonemes: 'n, ŋ=ng' };

    const expandedV = expandPhonemeMacros('@V$', phon);
    assert.ok(expandedV.startsWith('(?:') && expandedV.endsWith(')$'));
    assert.ok(expandedV.includes('sh') === false && expandedV.includes('a'));

    // Replace trailing vowel using @V macro and chain k(?=[ie]) => ch
    const rule = { affix: 'k(?=[ie]) => ch; (@C)@V$ => $1o', condition: 'always' };
    assert.equal(applyRuleToWord('kika', rule, [], phon.vowels, phon.consonants, phon.otherPhonemes), 'chiko');

    // Hiatus resolution with non-capturing macro inside capturing group (@V)(@V)
    const hiatusRule = { affix: '(@V)(@V) => $1j$2', condition: 'always' };
    assert.equal(applyRuleToWord('kae', hiatusRule, [], 'a, e, i, o, u', 'p, t, k', ''), 'kaje');

    // Macro inside character class [^@V]
    const charClassRule = { affix: '^([^@V])@V => $1o', condition: 'always' };
    assert.equal(applyRuleToWord('taka', charClassRule, [], 'a, e, i, o, u', 'p, t, k', ''), 'toka');

    // Validate valid & invalid regex rules
    assert.equal(validateRegexRule('(@V)$ => $1n', phon).valid, true);
    assert.equal(validateRegexRule('([unclosed => a', phon).valid, false);
}

// 3. Smart Grammar Import (custom classes, aliases, glosses, derivational targetPOS, regex rules)
{
    const grammarRules = [
        { id: '1', name: 'Past Tense', affix: '-ed', appliesTo: 'verb', gloss: 'PST' },
        { id: '2', name: 'Nominalizer', affix: '-ness', appliesTo: 'adjective', targetPOS: 'noun', isDerivational: true, gloss: 'NMLZ' },
        { id: '3', name: 'Adj', affix: '[aeiou]$ => a', appliesTo: 'all', gloss: 'ADJ' },
        { id: '4', name: 'Aspectualizer', affix: '-ka', appliesTo: 'verb', targetPOS: 'aspect', isDerivational: true },
        { id: '5', name: 'Final Devoicing', affix: 'd$ => t', appliesTo: 'noun' },
    ];

    const imported = importClassMarkersFromGrammar({
        grammarRules,
        verbMarker: '-en',
        currentMarkers: { noun: '', verb: '', adjective: '', adverb: '', pronoun: '', particle: '' },
        customWordClasses: ['aspect'],
    });

    assert.equal(imported.markers.verb, '-en');
    assert.equal(imported.markers.noun, '-ness');
    assert.equal(imported.markers.adjective, '[aeiou]$ => a');
    assert.equal(imported.markers.aspect, '-ka');
    assert.ok(imported.updatedCount >= 4);

    const complexExtracted = extractComplexGrammarRules(grammarRules, []);
    assert.equal(complexExtracted.addedCount, 2);
    assert.ok(complexExtracted.newRules.some(r => r.rule === '[aeiou]$ => a'));
    assert.ok(complexExtracted.newRules.some(r => r.rule === 'd$ => t'));

    // Re-running extraction skips already imported duplicates
    const secondRun = extractComplexGrammarRules(grammarRules, complexExtracted.newRules);
    assert.equal(secondRun.addedCount, 0);
}

// 4. Generator Engine: otherPhonemes, regex class marker, post-gen complex rules, vowel harmony & duplicate avoidance
{
    const config = {
        phonologyTypes: 'alphabetic',
        consonants: 'k, t, n',
        vowels: 'a, u, i, e',
        otherPhonemes: 'ŋ=ng',
        otherPhonemeMapping: 'N',
        syllablePattern: 'CVN',
        syllablePatternWeights: { CVN: 1 },
        generatorMarkers: {
            noun: 'k$ => g; ^(.+)$ => $1a',
            verb: '-ti',
        },
        generatorRegexRules: [
            { id: 'r1', name: 'Assimilation', rule: 'ng => q', appliesTo: 'all', enabled: true },
        ],
        vowelHarmonySets: [
            { name: 'Back', vowels: ['a', 'u'], neutral: false },
            { name: 'Front', vowels: ['i', 'e'], neutral: false },
        ],
    };

    const resNoun = generateWordFromConfig(config, { lengths: [1], targetClass: 'noun' });
    assert.ok(resNoun && resNoun.word.endsWith('a'));
    assert.ok(resNoun.word.includes('q'), `Expected regex rule ng => q to fire on "${resNoun.word}"`);
    assert.ok(resNoun.stem, 'Expected original stem preserved separately');

    // Respect vowel harmony: generated stem vowels must all belong to whichever harmony set was picked
    for (let i = 0; i < 10; i++) {
        const vhRes = generateWordFromConfig(
            { ...config, syllablePattern: 'CV', generatorMarkers: {}, generatorRegexRules: [] },
            { lengths: [3], targetClass: 'verb', respectVowelHarmony: true }
        );
        const hasBack = /[au]/.test(vhRes.stem);
        const hasFront = /[ie]/.test(vhRes.stem);
        assert.equal(hasBack && hasFront, false, `Harmony violated in stem "${vhRes.stem}"`);
    }
}

// 5. Schema validator allowlist includes new config fields
assert.ok(VALID_CONFIG_KEYS.has('generatorRegexRules'));
assert.ok(VALID_CONFIG_KEYS.has('generatorOptions'));

console.log('All Word Generator & Complex Regex Rules tests passed successfully!');

