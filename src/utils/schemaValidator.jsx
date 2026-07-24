// src/utils/schemaValidator.jsx
// SEC-4: Schema validator for imported JSON backups and cloud data.
// Only allows known keys to be merged into stores,
// preventing injection of arbitrary keys or XSS payloads.
import LZString from 'lz-string';

// Static allowlist of valid config keys (mirrors INITIAL_CONFIG in useConfigStore).
// Kept as a flat set to avoid importing the store and bloating the bundle.
const VALID_CONFIG_KEYS = new Set([
    'projectId', 'conlangName', 'authorName', 'description',
    'phonologyTypes', 'alphabeticScript', 'featuralComponents', 'blockSettings',
    'syntaxOrder', 'adjectivePlacement', 'adjectiveAgreement', 'writingDirection', 'consonants', 'vowels',
    'syllablePattern', 'historicalRules', 'syllabaryMap',
    'grammarRules', 'verbMarker', 'cliticsRules', 'personRules',
    'wikiPages', 'streak', 'unlockedBadges', 'activity',
    'isProActive', 'lastStudyDate', 'customFont', 'theme',
    'colors', 'customGlyphs', 'puaCounter', 'customFontBase64', 'numeralBase', 'sentenceMaps',
    'generatorMarkers', 'customCourse',
    'customWordClasses', 'customTags',
    'otherPhonemes', 'otherPhonemeMapping', 'skipSyllableValidation',
    'syllabificationAlgorithm', 'blockTemplates',
    'alphabetNames', 'numberSystem',
    'numberMatrix', 'numberDerivedRules', 'timeSystemVocab', 'alphabetGlyphs',
    'semanticMappings', 'wordAssistConfig', 'autoReturnToLexicon', 'syllablePatternWeights',
    'enableToneAndStress', 'functionWords', 'calendarSystem',
    'stressRules', 'toneRules', 'isPublic', 'conlangIcon', 'parentId',
    'pronounMatrixData', 'pronounMatrixSettings',
    'vowelHarmonyMode', 'vowelHarmonySets', 'vowelHarmonyOverrideWordClasses', 'vowelHarmonyOverrideTags',
    'backupSettings',
    'evolutionEpochs', 'worldMap', 'customLabels', 'ipaMappingRules', 'typographySettings', 'azureTtsUseIpa', 'azureTtsVoice',
    // Multi-script fields
    'scriptSystems', 'scriptRules', 'activeScriptSystemId', 'configVersion', 'scriptDataById',
    // Particle fields
    'morphologyMode', 'morphSlots', 'fusionRules', 'boundaryRules',
    'particleDatabase', 'compositeParticles', 'allowRecursiveComposites',
    'usesParticles',
    // UI state
    'isDialect', 'hasCompletedOnboarding', 'floatingBackground',
    // Study / Course gamification
    'studyXP', 'courseLevelScores', 'dailyChallengeDate', 'dailyChallengeCompleted',
    'studySoundEffects', 'courseProgress'
]);

/**
 * Strips unknown keys from a config object, keeping only those
 * present in INITIAL_CONFIG. Also does basic type sanitization.
 */
export function sanitizeConfig(rawConfig, isSave = false) {
    if (!rawConfig || typeof rawConfig !== 'object') return {};

    const clean = {};
    for (const key of Object.keys(rawConfig)) {
        // Only allow keys that exist in our schema
        if (!VALID_CONFIG_KEYS.has(key)) continue;

        // Skip functions entirely (they shouldn't be in serialized data)
        if (typeof rawConfig[key] === 'function') continue;

        clean[key] = rawConfig[key];
    }

    // Default hasCompletedOnboarding to true for older projects that lack this key
    if (clean.hasCompletedOnboarding === undefined) {
        clean.hasCompletedOnboarding = true;
    }

    // Deduplicate legacy root bloat fields to prevent doubled JSON file size
    // when scriptDataById is present (as of PR 7). rehydrateBloat handles
    // reconstructing these into the root during startup.
    if (isSave && clean.scriptDataById && Object.keys(clean.scriptDataById).length > 0) {
        delete clean.customGlyphs;
        delete clean.alphabetGlyphs;
        delete clean.syllabaryMap;
        delete clean.featuralComponents;
        delete clean.customFont;
        delete clean.customFontBase64;
    }

    return clean;
}

/**
 * Validates and sanitizes a lexicon array from imported data.
 * Each entry must have at minimum a word and translation string.
 */
export function sanitizeLexicon(rawLexicon) {
    if (!Array.isArray(rawLexicon)) {
        // Handle the case where the lexicon store was serialized as { lexicon: [...] }
        if (rawLexicon && Array.isArray(rawLexicon.lexicon)) {
            return sanitizeLexicon(rawLexicon.lexicon);
        }
        return [];
    }

    return rawLexicon.filter(entry => {
        // Must be an object with at least word and translation
        if (!entry || typeof entry !== 'object') return false;
        if (typeof entry.word !== 'string') return false;
        if (typeof entry.translation !== 'string') return false;
        return true;
    }).map(entry => ({
        id: entry.id || Date.now() + Math.random(),
        word: entry.word,
        ipa: typeof entry.ipa === 'string' ? entry.ipa : '',
        wordClass: typeof entry.wordClass === 'string' ? entry.wordClass : '',
        translation: entry.translation,
        definition: typeof entry.definition === 'string' ? entry.definition : '',
        tags: Array.isArray(entry.tags) ? entry.tags.filter(t => typeof t === 'string') : [],
        tagSource: typeof entry.tagSource === 'string' ? entry.tagSource : 'manual',
        ideogram: typeof entry.ideogram === 'string' ? entry.ideogram : '',
        personCategory: typeof entry.personCategory === 'string' ? entry.personCategory : '',
        parentRootId: entry.parentRootId !== undefined ? entry.parentRootId : null,
        derivationRuleId: entry.derivationRuleId !== undefined ? entry.derivationRuleId : null,
        inflectionOverrides: (entry.inflectionOverrides && typeof entry.inflectionOverrides === 'object')
            ? entry.inflectionOverrides : {},
        tone: typeof entry.tone === 'string' ? entry.tone : '',
        stress: typeof entry.stress === 'string' ? entry.stress : '',
        relatedWords: Array.isArray(entry.relatedWords) ? entry.relatedWords : [],
        srs: (entry.srs && typeof entry.srs === 'object') ? entry.srs : null,
        createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
        // Multi-script fields
        scriptOverride: entry.scriptOverride || null,
        scriptForms: (entry.scriptForms && typeof entry.scriptForms === 'object') ? entry.scriptForms : {},
        scriptRole: typeof entry.scriptRole === 'string' ? entry.scriptRole : '',
    }));
}

/** Validates the full backup structure used by Save/Load in the Header.
 Returns a sanitized copy of the data with only valid fields. */
export function sanitizeBackup(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup file: not a valid JSON object.');
    }

    return {
        config: data.config ? sanitizeConfig(data.config) : null,
        lexicon: data.lexicon ? sanitizeLexicon(data.lexicon) : null,
        project: data.project && typeof data.project === 'object' ? data.project : null
    };
}

/** 
 * Automatically decompresses cloud payloads if they were zipped by the client 
 * to bypass Supabase size limits. Returns the raw payload if uncompressed.
 */
export function decompressPayload(payload) {
    if (!payload) return payload;

    // Handle new partial compression (dictionary & wiki compressed, config left intact for querying)
    if (payload.compressed_payload && typeof payload.compressed_payload === 'string') {
        try {
            const decompressedString = LZString.decompressFromBase64(payload.compressed_payload);
            const decompressed = JSON.parse(decompressedString);
            return {
                ...payload,
                dictionary: decompressed.dictionary,
                wiki: decompressed.wiki
            };
        } catch (e) {
            console.error("Failed to decompress partial cloud payload:", e);
            return null;
        }
    }

    // Handle full compression (legacy if any were pushed before the change)
    if (payload.compressed && typeof payload.compressed === 'string') {
        try {
            const decompressedString = LZString.decompressFromBase64(payload.compressed);
            return JSON.parse(decompressedString);
        } catch (e) {
            console.error("Failed to decompress full cloud payload:", e);
            return null;
        }
    }
    
    return payload;
}
