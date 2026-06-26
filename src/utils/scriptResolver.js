// src/utils/scriptResolver.js
// Pure script resolution utilities — no React, no hooks.
// Used by exporters, validators, and UI hooks alike.

export const SCRIPT_TYPES = [
    'alphabetic',
    'abjad',
    'abugida',
    'syllabic',
    'logographic',
    'featural_block',
];

export const LEGACY_SCRIPT_TYPE_ALIASES = {
    featural: 'featural_block',
    block: 'featural_block',
};

/**
 * Normalize a script type string to canonical form.
 * Accepts legacy aliases and returns 'alphabetic' for unknowns.
 */
export function normalizeScriptType(type) {
    if (!type || typeof type !== 'string') return 'alphabetic';
    const lower = type.trim().toLowerCase();
    if (SCRIPT_TYPES.includes(lower)) return lower;
    return LEGACY_SCRIPT_TYPE_ALIASES[lower] || 'alphabetic';
}

/**
 * Normalize a rule key (word class, tag, etc.) for case-insensitive matching.
 */
export function normalizeRuleKey(value) {
    return String(value || '').trim().toLowerCase();
}

/**
 * Normalize script name, returning fallback if blank.
 */
export function normalizeScriptName(name, fallback = 'Unnamed Script') {
    const clean = String(name || '').trim();
    return clean || fallback;
}

/**
 * Split comma-separated wordClass string into normalized array.
 * "Noun, Proper" → ["noun", "proper"]
 */
export function getWordClasses(entry) {
    return String(entry.wordClass || '')
        .split(',')
        .map(normalizeRuleKey)
        .filter(Boolean);
}

/**
 * Get the default script ID from config.
 * Returns the first script's ID if no default is set.
 */
export function getDefaultScriptId(config) {
    if (config?.scriptRules?.defaultScriptId) {
        const found = config.scriptSystems?.find(
            (s) => s.id === config.scriptRules.defaultScriptId
        );
        if (found) return found.id;
    }
    // Fallback: find isDefault
    const defaultScript = config?.scriptSystems?.find((s) => s.isDefault);
    if (defaultScript) return defaultScript.id;
    // Fallback: first script
    if (config?.scriptSystems?.length > 0) return config.scriptSystems[0].id;
    return 'default';
}

/**
 * Get a script system object by ID.
 * Falls back to default script, then first script, then a synthetic default.
 */
export function getScriptSystem(config, scriptId) {
    if (!config?.scriptSystems || config.scriptSystems.length === 0) {
        // Return a synthetic default for legacy single-script projects
        return {
            id: 'default',
            name: 'Main Script',
            type: normalizeScriptType(config?.phonologyTypes || 'alphabetic'),
            isDefault: true,
            alphabeticScript: config?.alphabeticScript || 'latin',
            writingDirection: config?.writingDirection || 'ltr',
            syllabificationAlgorithm: config?.syllabificationAlgorithm || 'ltr',
            blockSettings: config?.blockSettings || { maxChars: 3, layoutTemplate: '2top1bottom', slotMapping: ['Initial', 'Vowel', 'Final'] },
            blockTemplates: config?.blockTemplates || [],
            alphabetNames: config?.alphabetNames || {},
        };
    }
    const found = config.scriptSystems.find((s) => s.id === scriptId);
    if (found) return found;
    // Fallback to default
    const defaultId = getDefaultScriptId(config);
    const defaultScript = config.scriptSystems.find((s) => s.id === defaultId);
    return defaultScript || config.scriptSystems[0];
}

/**
 * Get runtime script data (large glyph/font data) for a script.
 * Falls back to empty defaults.
 */
export function getScriptData(config, scriptId) {
    if (config?.scriptDataById?.[scriptId]) {
        return config.scriptDataById[scriptId];
    }
    // Fallback to legacy top-level fields for default script
    const defaultId = getDefaultScriptId(config);
    if (scriptId === defaultId || scriptId === 'default') {
        return {
            customGlyphs: config?.customGlyphs || {},
            syllabaryMap: config?.syllabaryMap || {},
            featuralComponents: config?.featuralComponents || {},
            alphabetGlyphs: config?.alphabetGlyphs || {},
            customFontBase64: config?.customFontBase64 || null,
            customFont: config?.customFont || null,
            puaCounter: config?.puaCounter || 57344,
        };
    }
    return {
        customGlyphs: {},
        syllabaryMap: {},
        featuralComponents: {},
        alphabetGlyphs: {},
        customFontBase64: null,
        customFont: null,
        puaCounter: 57344,
    };
}

/**
 * Resolve which script ID a word entry should use.
 * Precedence: word.scriptOverride → roles → personCategory → tags → wordClasses → default.
 */
export function resolveWordScriptId(entry, config) {
    if (!entry || !config) return getDefaultScriptId(config);

    // 1. Per-word override
    if (entry.scriptOverride) {
        const exists = config.scriptSystems?.find((s) => s.id === entry.scriptOverride);
        if (exists) return entry.scriptOverride;
    }

    const rules = config.scriptRules || {};

    // 2. Script role
    if (entry.scriptRole && rules.roles?.[normalizeRuleKey(entry.scriptRole)]) {
        return rules.roles[normalizeRuleKey(entry.scriptRole)];
    }

    // 3. Person category
    if (entry.personCategory && rules.personCategories?.[normalizeRuleKey(entry.personCategory)]) {
        return rules.personCategories[normalizeRuleKey(entry.personCategory)];
    }

    // 4. Tags (first match)
    if (Array.isArray(entry.tags) && rules.tags) {
        for (const tag of entry.tags) {
            const normalized = normalizeRuleKey(tag);
            if (rules.tags[normalized]) {
                return rules.tags[normalized];
            }
        }
    }

    // 5. Word classes (first match)
    if (rules.wordClasses) {
        const classes = getWordClasses(entry);
        for (const wc of classes) {
            if (rules.wordClasses[wc]) {
                return rules.wordClasses[wc];
            }
        }
    }

    // 6. Default
    return getDefaultScriptId(config);
}

/**
 * Build a compatibility config object for one script.
 * This overlays script-specific settings onto the base config
 * so existing transliteration/rendering code can use it unchanged.
 */
export function buildScriptConfig(config, scriptId) {
    const script = getScriptSystem(config, scriptId);
    const data = getScriptData(config, scriptId);

    return {
        ...config,
        phonologyTypes: script.type,
        alphabeticScript: script.alphabeticScript,
        writingDirection: script.writingDirection,
        syllabificationAlgorithm: script.syllabificationAlgorithm,
        blockSettings: script.blockSettings,
        blockTemplates: script.blockTemplates,
        alphabetNames: script.alphabetNames,
        customGlyphs: data.customGlyphs,
        syllabaryMap: data.syllabaryMap,
        featuralComponents: data.featuralComponents,
        alphabetGlyphs: data.alphabetGlyphs,
        customFontBase64: data.customFontBase64,
        customFont: data.customFont,
        puaCounter: data.puaCounter,
    };
}

/**
 * Repair scriptSystems array to ensure invariants:
 * - At least one script exists
 * - Exactly one has isDefault: true
 * - All have non-empty names
 * - scriptRules.defaultScriptId points to default
 */
export function repairScriptSystems(config) {
    const systems = config.scriptSystems ? [...config.scriptSystems] : [];
    const rules = { ...(config.scriptRules || {}) };

    // Ensure at least one script
    if (systems.length === 0) {
        systems.push({
            id: 'default',
            name: normalizeScriptName(config.scriptName || 'Main Script', 'Main Script'),
            type: normalizeScriptType(config.phonologyTypes || 'alphabetic'),
            isDefault: true,
            alphabeticScript: config.alphabeticScript || 'latin',
            writingDirection: config.writingDirection || 'ltr',
            syllabificationAlgorithm: config.syllabificationAlgorithm || 'ltr',
            blockSettings: config.blockSettings || { maxChars: 3, layoutTemplate: '2top1bottom', slotMapping: ['Initial', 'Vowel', 'Final'] },
            blockTemplates: config.blockTemplates || [],
            alphabetNames: config.alphabetNames || {},
        });
    }

    // Repair blank names
    const usedNames = new Set();
    systems.forEach((s, i) => {
        s.name = normalizeScriptName(s.name, `Script ${i + 1}`);
        // Deduplicate names
        let candidate = s.name;
        let counter = 2;
        while (usedNames.has(candidate)) {
            candidate = `${s.name} ${counter}`;
            counter++;
        }
        s.name = candidate;
        usedNames.add(s.name);
    });

    // Ensure exactly one default
    const defaults = systems.filter((s) => s.isDefault);
    if (defaults.length === 0) {
        systems[0].isDefault = true;
    } else if (defaults.length > 1) {
        // Keep the one referenced by scriptRules.defaultScriptId if valid
        const preferred = rules.defaultScriptId
            ? systems.find((s) => s.id === rules.defaultScriptId && s.isDefault)
            : null;
        let foundPreferred = false;
        systems.forEach((s) => {
            if (preferred && s.id === preferred.id && !foundPreferred) {
                foundPreferred = true;
            } else {
                s.isDefault = false;
            }
        });
        if (!foundPreferred) {
            // Clear all and set first as default
            systems.forEach((s) => (s.isDefault = false));
            systems[0].isDefault = true;
        }
    }

    // Ensure scriptRules.defaultScriptId points to default
    const defaultScript = systems.find((s) => s.isDefault);
    rules.defaultScriptId = defaultScript.id;

    // Ensure scriptRules structure
    if (!rules.wordClasses) rules.wordClasses = {};
    if (!rules.tags) rules.tags = {};
    if (!rules.personCategories) rules.personCategories = {};
    if (!rules.roles) rules.roles = {};

    return { scriptSystems: systems, scriptRules: rules };
}
