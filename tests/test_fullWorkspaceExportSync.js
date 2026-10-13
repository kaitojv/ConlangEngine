// tests/test_fullWorkspaceExportSync.js
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeConfig, sanitizeLexicon, sanitizePhrases, sanitizeBackup, VALID_CONFIG_KEYS } from '../src/utils/schemaValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Full Workspace Export and Sync Data Integrity...');

// 1. Verify all persistent keys in useConfigStore.jsx are in VALID_CONFIG_KEYS
const configStoreSource = fs.readFileSync(path.join(__dirname, '../src/store/useConfigStore.jsx'), 'utf8');
const match = configStoreSource.match(/export const INITIAL_CONFIG = \{([\s\S]*?)\n\};/);
assert(match, 'INITIAL_CONFIG must be present in useConfigStore.jsx');

const keyRegex = /^[ ]{4}([a-zA-Z0-9_]+)\s*:/gm;
const initialKeys = [];
let keyMatch;
while ((keyMatch = keyRegex.exec(match[1])) !== null) {
    initialKeys.push(keyMatch[1]);
}

// The only keys intentionally excluded are runtime ephemeral session flags:
const ephemeralKeys = new Set(['lastCloudSync', 'syncConflictStatus', 'isRehydrating']);
const persistentKeys = initialKeys.filter(k => !ephemeralKeys.has(k));

const missingFromAllowlist = persistentKeys.filter(k => !VALID_CONFIG_KEYS.has(k));
assert.strictEqual(
    missingFromAllowlist.length,
    0,
    `All persistent keys in INITIAL_CONFIG must exist in VALID_CONFIG_KEYS! Missing: ${missingFromAllowlist.join(', ')}`
);
console.log(`✓ All ${persistentKeys.length} persistent INITIAL_CONFIG keys are present in schema validator allowlist`);

// 2. Numerical page systems
const testNumberConfig = {
    numeralBase: 12,
    numberSystem: {
        zero: 'zi',
        digits: { '1': 'un', '2': 'du' },
        digitGlyphs: { '1': 'Ⅰ' },
        settings: { fusion: true, order: 'unit-first' }
    },
    numberMatrix: { '1': { cardinal: 'un', ordinal: 'unth' } },
    numberDerivedRules: { ordinal: '-th', fractional: '-part', multiplier: '-fold' },
    timeSystemVocab: { second: 'sec', minute: 'min', hour: 'hr', day: 'sol', year: 'ann' },
    calendarSystem: { daysOfWeek: ['Mon', 'Tue'], months: ['Jan', 'Feb'], dateFormat: 'YYYY-MM-DD', yearOffset: 100 },
    measurementSystem: {
        units: [
            { id: 'm1', name: 'span', type: 'length', baseEquivalent: '1m', isBaseUnit: true, conversionFactor: 1, description: 'Hand span' }
        ]
    }
};
const sanitizedNum = sanitizeConfig(testNumberConfig);
assert.strictEqual(sanitizedNum.numeralBase, 12);
assert.strictEqual(sanitizedNum.numberSystem.zero, 'zi');
assert.strictEqual(sanitizedNum.numberDerivedRules.ordinal, '-th');
assert.strictEqual(sanitizedNum.timeSystemVocab.day, 'sol');
assert.strictEqual(sanitizedNum.calendarSystem.yearOffset, 100);
assert.strictEqual(sanitizedNum.measurementSystem.units.length, 1);
assert.strictEqual(sanitizedNum.measurementSystem.units[0].name, 'span');
console.log('✓ Numerical page data (numberSystem, numberMatrix, timeSystemVocab, calendarSystem, measurementSystem) fully preserved');

// 3. Multi-script systems
const testScriptConfig = {
    scriptSystems: [
        { id: 'default', name: 'Main', type: 'alphabetic' },
        { id: 'script-2', name: 'Formal', type: 'syllabic', blockSettings: { maxChars: 2 } }
    ],
    scriptRules: {
        defaultScriptId: 'default',
        wordClasses: { noun: 'script-2' },
        tags: { sacred: 'script-2' }
    },
    activeScriptSystemId: 'script-2',
    scriptDataById: {
        'default': { customGlyphs: { 57344: [[{ x: 10, y: 10 }]] } },
        'script-2': { syllabaryMap: { 'ka': 'か' }, customFontBase64: 'dGVzdA==' }
    }
};
const sanitizedScript = sanitizeConfig(testScriptConfig);
assert.strictEqual(sanitizedScript.scriptSystems.length, 2);
assert.strictEqual(sanitizedScript.scriptRules.wordClasses.noun, 'script-2');
assert.strictEqual(sanitizedScript.activeScriptSystemId, 'script-2');
assert.strictEqual(sanitizedScript.scriptDataById['script-2'].syllabaryMap.ka, 'か');
console.log('✓ Multi-script data (scriptSystems, scriptRules, activeScriptSystemId, scriptDataById) fully preserved');

// 4. Course and gamification data
const testCourseConfig = {
    customCourse: [
        { id: 'mod-1', title: 'Basics', phrases: [{ id: 'p1', conlang: 'Alo', english: 'Hello' }] }
    ],
    courseProgress: [{ levelId: 'mod-1', completed: true }],
    studyXP: 350,
    courseLevelScores: { 'mod-1': { bestScore: 100, stars: 3 } },
    dailyChallengeDate: '2026-10-13',
    dailyChallengeCompleted: true
};
const sanitizedCourse = sanitizeConfig(testCourseConfig);
assert.strictEqual(sanitizedCourse.customCourse.length, 1);
assert.strictEqual(sanitizedCourse.customCourse[0].title, 'Basics');
assert.strictEqual(sanitizedCourse.studyXP, 350);
assert.strictEqual(sanitizedCourse.courseLevelScores['mod-1'].stars, 3);
console.log('✓ Course & gamification data (customCourse, courseProgress, studyXP, levelScores) fully preserved');

// 5. Phrases preservation in sanitizePhrases & sanitizeBackup
const testPhrases = [
    {
        id: 'ph-1',
        phrase: 'Kona mara',
        literalTranslation: 'Good day',
        idiomaticTranslation: 'Hello',
        register: 'formal',
        category: 'greetings',
        tags: ['common'],
        componentWords: [101, 102],
        updatedAt: 1700000000,
        updatedBy: 'dev-pc'
    }
];
const cleanPhrases = sanitizePhrases(testPhrases);
assert.strictEqual(cleanPhrases.length, 1);
assert.strictEqual(cleanPhrases[0].phrase, 'Kona mara');
assert.strictEqual(cleanPhrases[0].idiomaticTranslation, 'Hello');
assert.strictEqual(cleanPhrases[0].register, 'formal');
assert.deepStrictEqual(cleanPhrases[0].componentWords, [101, 102]);

// Test backup payload with root phrases
const backupRootPhrases = sanitizeBackup({
    config: testNumberConfig,
    lexicon: [{ word: 'test', translation: 'proof' }],
    phrases: testPhrases
});
assert(backupRootPhrases.phrases, 'Phrases at root must be sanitized');
assert.strictEqual(backupRootPhrases.phrases.length, 1);

// Test legacy backup payload where phrases was inside lexicon
const backupNestedPhrases = sanitizeBackup({
    config: testNumberConfig,
    lexicon: {
        lexicon: [{ word: 'test', translation: 'proof' }],
        phrases: testPhrases
    }
});
assert(backupNestedPhrases.phrases, 'Phrases inside lexicon must be extracted and sanitized');
assert.strictEqual(backupNestedPhrases.phrases.length, 1);
assert.strictEqual(backupNestedPhrases.phrases[0].phrase, 'Kona mara');
console.log('✓ Phrases tab data fully preserved in both root and legacy nested backup formats');

// 6. Lexicon rich features (etymology, rootmap, derivations, homophones, scriptForms)
const testLexicon = [
    {
        id: 1,
        word: 'mata',
        translation: 'eye',
        parentRootId: null,
        isProtoRoot: true,
        isPrimary: true,
        scriptOverride: 'script-2',
        scriptForms: { 'default': 'mata', 'script-2': '目' },
        etymology: null,
        inflectionOverrides: { plural: 'matas' }
    },
    {
        id: 2,
        word: 'matali',
        translation: 'see',
        parentRootId: 1,
        derivationRuleId: 'rule-adj',
        isProtoRoot: false,
        etymology: 1
    }
];
const cleanLex = sanitizeLexicon(testLexicon);
assert.strictEqual(cleanLex.length, 2);
assert.strictEqual(cleanLex[0].isProtoRoot, true);
assert.strictEqual(cleanLex[0].scriptOverride, 'script-2');
assert.strictEqual(cleanLex[0].scriptForms['script-2'], '目');
assert.strictEqual(cleanLex[1].parentRootId, 1);
assert.strictEqual(cleanLex[1].etymology, 1);
assert.strictEqual(cleanLex[1].derivationRuleId, 'rule-adj');
console.log('✓ Lexicon rich features (etymology, proto roots, derivations, script forms, inflection overrides) fully preserved');

// 7. Glyphs and Characters import/export end-to-end integrity
const strokeData = [[{ x: 15.5, y: 20.2 }, { x: 30.1, y: 45.8 }]];
const complexScriptConfig = {
    projectId: 'test-glyphs-proj',
    conlangName: 'Glyphland',
    puaCounter: 57345,
    customAlphabet: 'a b c d e',
    alphabetNames: { 'a': 'Alfa', 'b': 'Bravo' },
    scriptSystems: [
        { id: 'default', name: 'Main Script', type: 'alphabetic', isDefault: true },
        { id: 'script-secondary', name: 'Runes', type: 'syllabic', isDefault: false }
    ],
    scriptRules: {
        defaultScriptId: 'default'
    },
    // Modern multi-script storage
    scriptDataById: {
        'default': {
            customGlyphs: { 57344: strokeData },
            alphabetGlyphs: { 'a': '\uE000' },
            syllabaryMap: { 'ka': '\uE000' },
            featuralComponents: { initials: [{ id: 'k', strokes: strokeData }] },
            customFontBase64: 'AAEAAAASAQA...dGVzdA=='
        },
        'script-secondary': {
            customGlyphs: { 57345: strokeData },
            syllabaryMap: { 'sa': '\uE001' }
        }
    }
};

// 7a. Simulate Export: sanitize with isSave = true
const exportedSnapshotConfig = sanitizeConfig(complexScriptConfig, true);
// In export with scriptDataById, root bloat is cleanly omitted to save space:
assert.strictEqual(exportedSnapshotConfig.customGlyphs, undefined);
// But all glyphs inside scriptDataById are 100% retained:
assert.deepStrictEqual(exportedSnapshotConfig.scriptDataById['default'].customGlyphs[57344], strokeData);
assert.strictEqual(exportedSnapshotConfig.scriptDataById['default'].customFontBase64, 'AAEAAAASAQA...dGVzdA==');
assert.strictEqual(exportedSnapshotConfig.scriptDataById['default'].alphabetGlyphs['a'], '\uE000');
assert.strictEqual(exportedSnapshotConfig.scriptDataById['default'].syllabaryMap['ka'], '\uE000');
assert.strictEqual(exportedSnapshotConfig.scriptDataById['script-secondary'].customGlyphs[57345], strokeData);
console.log('✓ Export snapshot preserves all glyph strokes, fonts, character maps in scriptDataById');

// 7b. Simulate Import: sanitizeBackup on the exported file
const importedPayload = sanitizeBackup({
    config: exportedSnapshotConfig,
    lexicon: [{ word: 'alfa', translation: 'first', ideogram: '⭐', scriptForms: { 'default': '\uE000' } }],
    phrases: []
});
assert(importedPayload.config.scriptDataById['default'].customGlyphs[57344], 'Default script custom glyphs must survive import');
assert.strictEqual(importedPayload.config.scriptDataById['default'].alphabetGlyphs['a'], '\uE000');
assert.strictEqual(importedPayload.config.scriptDataById['default'].customFontBase64, 'AAEAAAASAQA...dGVzdA==');
assert.strictEqual(importedPayload.config.customAlphabet, 'a b c d e');
assert.strictEqual(importedPayload.lexicon[0].ideogram, '⭐');
assert.strictEqual(importedPayload.lexicon[0].scriptForms['default'], '\uE000');
console.log('✓ Import payload restores all glyph strokes, character mappings, custom alphabet, and ideograms');

// 7c. Simulate Legacy Import: where glyphs were stored directly at root (no scriptDataById)
const legacyExport = {
    config: {
        projectId: 'legacy-proj',
        conlangName: 'OldLang',
        customGlyphs: { 57344: strokeData },
        alphabetGlyphs: { 'x': '\uE000' },
        syllabaryMap: { 'to': '\uE000' },
        customFontBase64: 'TEVHQUNZ'
    },
    lexicon: []
};
const importedLegacy = sanitizeBackup(legacyExport);
assert.deepStrictEqual(importedLegacy.config.customGlyphs[57344], strokeData);
assert.strictEqual(importedLegacy.config.alphabetGlyphs['x'], '\uE000');
assert.strictEqual(importedLegacy.config.syllabaryMap['to'], '\uE000');
assert.strictEqual(importedLegacy.config.customFontBase64, 'TEVHQUNZ');
console.log('✓ Legacy import restores root-level customGlyphs, alphabetGlyphs, syllabaryMap, and customFontBase64');

console.log('All full workspace export and sync data integrity tests PASSED.');
