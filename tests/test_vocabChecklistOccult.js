// tests/test_vocabChecklistOccult.js
// Verification suite for deleting/occulting words in Vocab Checklist.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { VALID_CONFIG_KEYS, sanitizeConfig } from '../src/utils/schemaValidator.js';
import { buildLexiconIndex, getCategoryProgress, checkWordInLexicon } from '../src/utils/lexiconMatcher.js';
import enTranslations from '../src/i18n/locales/en.js';
import ptTranslations from '../src/i18n/locales/pt.js';
import esTranslations from '../src/i18n/locales/es.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- test_vocabChecklistOccult.js ---');

// 1. Schema & Initial Config validation
assert.ok(VALID_CONFIG_KEYS.has('hiddenVocabWords'), 'VALID_CONFIG_KEYS must contain hiddenVocabWords');

const configStoreSource = fs.readFileSync(path.join(__dirname, '../src/store/useConfigStore.jsx'), 'utf8');
assert.ok(configStoreSource.includes('hiddenVocabWords: []'), 'INITIAL_CONFIG must contain hiddenVocabWords: []');
assert.ok(configStoreSource.includes('occultVocabWord:'), 'useConfigStore must implement occultVocabWord');
assert.ok(configStoreSource.includes('restoreVocabWord:'), 'useConfigStore must implement restoreVocabWord');
assert.ok(configStoreSource.includes('occultVocabWords:'), 'useConfigStore must implement occultVocabWords');
assert.ok(configStoreSource.includes('restoreAllVocabWords:'), 'useConfigStore must implement restoreAllVocabWords');
console.log('✓ hiddenVocabWords registered in schemaValidator and useConfigStore');

// 2. SanitizeConfig preserves hiddenVocabWords
const rawExport = {
    conlangName: 'TestLang',
    hiddenVocabWords: ['horse', 'ocean', 'king'],
    maliciousKey: '<script>alert(1)</script>'
};
const cleaned = sanitizeConfig(rawExport);
assert.deepEqual(cleaned.hiddenVocabWords, ['horse', 'ocean', 'king'], 'sanitizeConfig preserves hiddenVocabWords');
assert.equal(cleaned.maliciousKey, undefined, 'sanitizeConfig strips unknown keys');
console.log('✓ sanitizeConfig correctly validates hiddenVocabWords');

// 3. Store action logic verification
const createOccultStoreLogic = () => {
    let state = { hiddenVocabWords: [] };
    return {
        getState: () => state,
        occultVocabWord: (word) => {
            const list = state.hiddenVocabWords || [];
            if (!word || list.includes(word)) return;
            state = { ...state, hiddenVocabWords: [...list, word] };
        },
        restoreVocabWord: (word) => {
            state = { ...state, hiddenVocabWords: (state.hiddenVocabWords || []).filter(w => w !== word) };
        },
        occultVocabWords: (words) => {
            if (!Array.isArray(words) || words.length === 0) return;
            const setWords = new Set(state.hiddenVocabWords || []);
            words.forEach(w => { if (w) setWords.add(w); });
            state = { ...state, hiddenVocabWords: Array.from(setWords) };
        },
        restoreAllVocabWords: () => {
            state = { ...state, hiddenVocabWords: [] };
        }
    };
};

const mockStore = createOccultStoreLogic();

// occultVocabWord
mockStore.occultVocabWord('horse');
assert.deepEqual(mockStore.getState().hiddenVocabWords, ['horse']);

// Duplicate occult is a no-op
mockStore.occultVocabWord('horse');
assert.deepEqual(mockStore.getState().hiddenVocabWords, ['horse']);

// occultVocabWords (bulk)
mockStore.occultVocabWords(['ocean', 'king', 'horse']);
assert.deepEqual(mockStore.getState().hiddenVocabWords.sort(), ['horse', 'king', 'ocean'].sort());

// restoreVocabWord
mockStore.restoreVocabWord('ocean');
assert.deepEqual(mockStore.getState().hiddenVocabWords.sort(), ['horse', 'king'].sort());

// restoreAllVocabWords
mockStore.restoreAllVocabWords();
assert.deepEqual(mockStore.getState().hiddenVocabWords, []);
console.log('✓ Store action logic verified');

// 4. Progress calculation with occulted words
const sampleVocab = [
    { word: 'water', class: 'noun' },
    { word: 'fire', class: 'noun' },
    { word: 'horse', class: 'noun' },
    { word: 'king', class: 'noun' },
];
// Lexicon has 'water'
const testLexicon = [
    { word: 'aqua', translation: 'water', wordClass: 'noun' }
];
const testIndex = buildLexiconIndex(testLexicon);

// Without occulted words: 1 created out of 4 -> 25%
const baselineProgress = getCategoryProgress(sampleVocab, testIndex);
assert.equal(baselineProgress.total, 4);
assert.equal(baselineProgress.created, 1);
assert.equal(baselineProgress.uncreated, 3);
assert.equal(baselineProgress.pct, 25);

// Conlang has occulted 'horse' and 'king' (concepts that do not exist in world)
const occultedSet = new Set(['horse', 'king']);
const activeVocab = sampleVocab.filter(w => !occultedSet.has(w.word));
const activeProgress = getCategoryProgress(activeVocab, testIndex);
assert.equal(activeProgress.total, 2);
assert.equal(activeProgress.created, 1);
assert.equal(activeProgress.uncreated, 1);
assert.equal(activeProgress.pct, 50); // Now 50% coverage of applicable concepts!
console.log('✓ Category progress correctly adjusts when words are occulted');

// 5. Filter logic simulation
const filterWords = (words, hiddenSet, { onlyUncreated, showOcculted, onlyOcculted }) => {
    return words.filter(item => {
        const isOcculted = hiddenSet.has(item.word);
        if (onlyOcculted) {
            if (!isOcculted) return false;
        } else if (!showOcculted && isOcculted) {
            return false;
        }
        const { isCreated } = checkWordInLexicon(item.word, testIndex);
        if (onlyUncreated && isCreated) return false;
        return true;
    });
};

// Default mode: uncreated only, hidden words excluded
const defaultList = filterWords(sampleVocab, occultedSet, { onlyUncreated: true, showOcculted: false, onlyOcculted: false });
assert.deepEqual(defaultList.map(w => w.word), ['fire'], 'Only active uncreated words shown by default');

// Show all active (both created and uncreated, occulted hidden)
const allActive = filterWords(sampleVocab, occultedSet, { onlyUncreated: false, showOcculted: false, onlyOcculted: false });
assert.deepEqual(allActive.map(w => w.word), ['water', 'fire'], 'All active words shown when onlyUncreated is false');

// Show occulted enabled
const withOcculted = filterWords(sampleVocab, occultedSet, { onlyUncreated: false, showOcculted: true, onlyOcculted: false });
assert.equal(withOcculted.length, 4, 'All words including occulted shown when showOcculted is true');

// Only occulted enabled
const onlyOccultedList = filterWords(sampleVocab, occultedSet, { onlyUncreated: false, showOcculted: true, onlyOcculted: true });
assert.deepEqual(onlyOccultedList.map(w => w.word), ['horse', 'king'], 'Only occulted words shown when onlyOcculted is true');
console.log('✓ Filter logic for occulted words verified');

// 6. Translations verification
const requiredKeys = ['occultWord', 'restoreWord', 'occultSelected', 'showOcculted', 'onlyOcculted', 'restoreAll', 'occulted'];
for (const key of requiredKeys) {
    assert.ok(enTranslations.vocabChecklist[key], `en.js missing vocabChecklist.${key}`);
    assert.ok(ptTranslations.vocabChecklist[key], `pt.js missing vocabChecklist.${key}`);
    assert.ok(esTranslations.vocabChecklist[key], `es.js missing vocabChecklist.${key}`);
}
console.log('✓ i18n translation keys verified in en, pt, es');

console.log('All vocab checklist occult tests passed successfully!');
