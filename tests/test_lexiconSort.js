// tests/test_lexiconSort.js
// Verification suite for Lexicon sorting (timestamps, custom alphabet, case sensitivity)
// and forced script rendering (renderWordInScript with scriptIdOverride).
import assert from 'node:assert/strict';
import { createCustomAlphabetCollator } from '../src/utils/customSort.js';
import { renderWordInScript } from '../src/utils/scriptRendering.js';
import { t } from '../src/i18n/index.js';

console.log('--- test_lexiconSort.js ---');

// 1. Timestamp helper and date sorting (newest and oldest)
const getTimestamp = (entry) => {
    if (typeof entry.createdAt === 'number' && !isNaN(entry.createdAt)) return entry.createdAt;
    if (entry.createdAt) {
        const parsed = new Date(entry.createdAt).getTime();
        if (!isNaN(parsed)) return parsed;
    }
    if (typeof entry.id === 'number' && !isNaN(entry.id)) return entry.id;
    return 0;
};

const entries = [
    { id: 'entry-1', word: 'sol', createdAt: 100 },
    { id: 'entry-2', word: 'luna', createdAt: '2026-05-01T00:00:00Z' },
    { id: 'entry-3', word: 'terra', createdAt: undefined },
    { id: 'entry-4', word: 'ignis' }
];

const newest = [...entries].sort((a, b) => {
    const diff = getTimestamp(b) - getTimestamp(a);
    if (diff !== 0) return diff;
    return String(b.id || '').localeCompare(String(a.id || ''));
});

assert.equal(newest[0].word, 'luna', 'Newest (ISO date) should be first');
assert.equal(newest[1].word, 'sol', 'Second newest should be sol (100)');
console.log('✓ Newest sorting handles numbers, ISO strings, and missing createdAt without returning NaN');

const oldest = [...entries].sort((a, b) => {
    const diff = getTimestamp(a) - getTimestamp(b);
    if (diff !== 0) return diff;
    return String(a.id || '').localeCompare(String(b.id || ''));
});
assert.equal(oldest[oldest.length - 1].word, 'luna', 'Oldest sort leaves highest timestamp at the end');
console.log('✓ Oldest sorting works correctly');

// 2. Alphabetical sorting A-Z and Z-A (case-insensitive, strips asterisks and hyphens)
const alphaWords = [
    { word: '-kato' },
    { word: 'Ano' },
    { word: '*zulu' },
    { word: 'beta' }
];

const sortedAz = [...alphaWords].sort((a, b) => {
    const strA = (a.word || '').replace(/[*-]/g, '').trim();
    const strB = (b.word || '').replace(/[*-]/g, '').trim();
    const cmp = strA.localeCompare(strB, undefined, { sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return strA.localeCompare(strB);
});

assert.deepEqual(sortedAz.map(w => w.word), ['Ano', 'beta', '-kato', '*zulu'], 'A-Z strips punctuation and ignores case');
console.log('✓ A-Z sorting handles mixed case, hyphens (affixes), and asterisks (proto-roots)');

// 3. Custom Alphabet Collator
const customAlphabet = 'a, b, ch, c, d';
const collator = createCustomAlphabetCollator(customAlphabet);
assert(collator !== null, 'Collator should be created for custom alphabet');

const customWords = [
    { word: 'cat' },
    { word: 'charlie' },
    { word: 'bat' },
    { word: 'apple' }
];

const sortedCustom = [...customWords].sort((a, b) => {
    const strA = (a.word || '').replace(/[*-]/g, '').trim().toLowerCase();
    const strB = (b.word || '').replace(/[*-]/g, '').trim().toLowerCase();
    return collator(strA, strB);
});

assert.deepEqual(sortedCustom.map(w => w.word), ['apple', 'bat', 'charlie', 'cat'], 'Custom collator orders ch before c');
console.log('✓ Custom alphabet collator works as expected');

// 4. renderWordInScript with scriptIdOverride
const multiScriptConfig = {
    scriptSystems: [
        { id: 'script-default', name: 'Latin Default', type: 'alphabetic', alphabeticScript: 'latin' },
        { id: 'script-runic', name: 'Runic Conscript', type: 'alphabetic', alphabeticScript: 'runic' }
    ]
};

const wordWithForm = {
    word: 'kato',
    scriptForms: {
        'script-runic': 'ᚲᚨᛏᛟ'
    }
};

const renderedDefault = renderWordInScript(wordWithForm, multiScriptConfig, [], null);
assert.equal(renderedDefault.text, 'kato', 'Default resolution produces Latin base word');

const renderedRunic = renderWordInScript(wordWithForm, multiScriptConfig, [], 'script-runic');
assert.equal(renderedRunic.text, 'ᚲᚨᛏᛟ', 'renderWordInScript with scriptIdOverride retrieves explicit script form');
assert.equal(renderedRunic.scriptId, 'script-runic', 'Returns correct overridden scriptId');
console.log('✓ renderWordInScript with scriptIdOverride successfully resolves custom script forms');

// 5. Verification of translation keys for sort and script
assert(t('lexicon.sortNewest', 'en').startsWith('Order:'), 'en sortNewest has Order: prefix');
assert(t('lexicon.sortNewest', 'pt').startsWith('Ordem:'), 'pt sortNewest has Ordem: prefix');
assert(t('lexicon.sortTooltip', 'en').length > 0, 'en sortTooltip defined');
assert(t('lexicon.sortTooltip', 'pt').length > 0, 'pt sortTooltip defined');
console.log('✓ i18n translation keys for sort order and tooltips verified in en and pt');

console.log('All Lexicon sorting and script rendering tests passed successfully.');
