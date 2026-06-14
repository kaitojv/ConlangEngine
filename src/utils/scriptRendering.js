// src/utils/scriptRendering.js
// Pure word rendering through resolved script.
// No React — usable from exporters, validators, and UI hooks.

import { resolveWordScriptId, getScriptSystem, buildScriptConfig } from './scriptResolver.js';
import { transliterateText } from './transliteration.js';

/**
 * Render a lexicon entry in the resolved script.
 * Returns rich metadata for UI styling and export.
 *
 * @param {Object} entry - Lexicon entry with word, ideogram, scriptForms, etc.
 * @param {Object} config - Full config store state (or compatible object).
 * @param {Array} lexicon - Full lexicon array (for logographic/syllabic lookups).
 * @returns {Object} { text, scriptId, scriptName, scriptType, writingDirection, fontFamily, usedDirectForm }
 */
export function renderWordInScript(entry, config, lexicon = []) {
    if (!entry) {
        return {
            text: '',
            scriptId: 'default',
            scriptName: 'Main Script',
            scriptType: 'alphabetic',
            writingDirection: 'ltr',
            fontFamily: 'conlang-script-default',
            usedDirectForm: false,
        };
    }

    const scriptId = resolveWordScriptId(entry, config);
    const script = getScriptSystem(config, scriptId);
    const scriptConfig = buildScriptConfig(config, scriptId);

    // Check for direct form in scriptForms
    const directForm = entry.scriptForms?.[scriptId]
        || (script.type === 'logographic' ? entry.ideogram : '');

    const text = directForm || transliterateText(entry.word, scriptConfig, lexicon);

    return {
        text,
        scriptId,
        scriptName: script.name,
        scriptType: script.type,
        writingDirection: script.writingDirection || 'ltr',
        fontFamily: `conlang-script-${scriptId}`,
        usedDirectForm: Boolean(directForm),
    };
}

/**
 * Render a raw word string in a specific script (no lexicon lookup).
 * Useful for generated words or inline text.
 */
export function renderWordStringInScript(word, config, scriptId) {
    const script = getScriptSystem(config, scriptId);
    const scriptConfig = buildScriptConfig(config, scriptId);
    const text = transliterateText(word, scriptConfig, []);

    return {
        text,
        scriptId,
        scriptName: script.name,
        scriptType: script.type,
        writingDirection: script.writingDirection || 'ltr',
        fontFamily: `conlang-script-${scriptId}`,
        usedDirectForm: false,
    };
}
