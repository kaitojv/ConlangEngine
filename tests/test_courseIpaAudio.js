// tests/test_courseIpaAudio.js
// Verification suite for IPA reading and audio resolution in Course Editor
import assert from 'node:assert/strict';
import { resolvePhraseIpa, generateIpaFromWord } from '../src/utils/ipaGenerator.js';
import { playAzureTTS } from '../src/utils/azureTTS.js';
import { t, SUPPORTED_LANGUAGES } from '../src/i18n/index.js';

console.log('--- test_courseIpaAudio.js ---');

// 1. Degenerate and edge-case inputs
assert.equal(resolvePhraseIpa(''), '', 'Empty string returns empty');
assert.equal(resolvePhraseIpa(null), '', 'Null returns empty');
assert.equal(resolvePhraseIpa(undefined), '', 'Undefined returns empty');
assert.equal(resolvePhraseIpa('   ____   '), '', 'Blanks-only text returns empty');
console.log('  ✓ Degenerate and empty inputs handled cleanly');

// Mock lexicon
const mockLexicon = [
    { word: 'nuvir', ipa: '/nu.viɾ/', translation: 'sun' },
    { word: 'zikrifi', ipa: '[zi.kɾi.fi]', translation: 'star' },
    { word: 'mita', ipa: 'mi.ta', translation: 'water' },
    { word: 'kato', ipa: '/ka.to/', translation: 'cat' },
    { word: 'nuvir zikrifi', ipa: '/nu.viɾ zi.kɾi.fi/', translation: 'solar star' }
];

// 2. Exact full-phrase lexicon match
const exactResult = resolvePhraseIpa('nuvir zikrifi', mockLexicon);
assert.equal(exactResult, 'nu.viɾ zi.kɾi.fi', 'Resolves exact full-phrase IPA without delimiters');
console.log('  ✓ Exact full-phrase lexicon match strips delimiters correctly');

// 3. Multi-word resolution from individual lexicon words
const multiWordResult = resolvePhraseIpa('nuvir mita kato', mockLexicon);
assert.equal(multiWordResult, 'nu.viɾ mi.ta ka.to', 'Resolves each word from lexicon');
console.log('  ✓ Multi-word phrase resolves individual words from lexicon');

// 4. Fill-in-the-blank text resolution (strips ____ blanks)
const fillBlankResult = resolvePhraseIpa('nuvir ____ kato', mockLexicon);
assert.equal(fillBlankResult, 'nu.viɾ ka.to', 'Strips blanks and resolves remaining conlang words');
console.log('  ✓ Fill-in-the-blank text cleans blanks and resolves words');

// 5. Orthography mapping rules fallback for words not in lexicon
const rules = 'sh=ʃ, ch=tʃ, oo=uː, ee=iː';
const ruleGenResult = resolvePhraseIpa('shoo chee', mockLexicon, rules);
assert.equal(ruleGenResult, 'ʃuː tʃiː', 'Generates IPA using ipaMappingRules for unlisted words');
console.log('  ✓ Unlisted words fallback to ipaMappingRules generation');

// 6. Matching pairs individual conlang words
const pairWords = ['nuvir', 'zikrifi', 'mita', 'kato'];
const pairIpas = pairWords.map(w => resolvePhraseIpa(w, mockLexicon));
assert.deepEqual(pairIpas, ['nu.viɾ', 'zi.kɾi.fi', 'mi.ta', 'ka.to'], 'Each matching pair resolves its own IPA');
console.log('  ✓ Matching pair words resolve their individual IPA readings');

// 7. Conjugation drill target answer resolution
const conjugationAnswer = 'zikrifi';
const conjIpa = resolvePhraseIpa(conjugationAnswer, mockLexicon);
assert.equal(conjIpa, 'zi.kɾi.fi', 'Conjugation answer resolves correctly');
console.log('  ✓ Conjugation drill answer resolves correctly');

// 8. Safe headless TTS dispatch
await assert.doesNotReject(async () => {
    await playAzureTTS({
        text: 'nuvir',
        ipa: resolvePhraseIpa('nuvir', mockLexicon),
        voice: 'ipa-default',
        useIpa: true
    });
}, 'playAzureTTS executes safely without throwing');
console.log('  ✓ playAzureTTS safely handles resolved IPA in test environment');

// 9. CourseBuilder i18n keys across all 7 languages
for (const lang of SUPPORTED_LANGUAGES) {
    const code = lang.code;
    const listenIpaText = t('courseBuilder.listenIPA', code);
    assert.ok(listenIpaText && !listenIpaText.includes('courseBuilder.listenIPA'), `listenIPA translated in ${code}: "${listenIpaText}"`);
    const listenText = t('courseBuilder.listen', code);
    assert.ok(listenText && !listenText.includes('courseBuilder.listen'), `listen translated in ${code}: "${listenText}"`);
    const ipaRefText = t('courseBuilder.ipaReference', code);
    assert.ok(ipaRefText && !ipaRefText.includes('courseBuilder.ipaReference'), `ipaReference translated in ${code}: "${ipaRefText}"`);
}
console.log('  ✓ CourseBuilder listen translation keys verified across all 7 supported languages');

console.log('\nAll Course Editor IPA audio tests passed successfully!');
