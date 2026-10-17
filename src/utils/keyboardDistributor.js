// src/utils/keyboardDistributor.js
// Automatic character distributor and layout algorithms for Conlang Engine Keyboard Exporter.

export const ASSIGNABLE_KEYS_HOME_FIRST = [
    // Home row first (ergonomic typing sweet spot)
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'OEM_1', 'OEM_7',
    // Top row
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'OEM_4', 'OEM_6', 'OEM_5',
    // Bottom row
    'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'OEM_COMMA', 'OEM_PERIOD', 'OEM_2',
    // Number row
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'OEM_MINUS', 'OEM_PLUS', 'OEM_3'
];

export const ASSIGNABLE_KEYS_QWERTY_ORDER = [
    // Number row
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'OEM_MINUS', 'OEM_PLUS',
    // Top row
    'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'OEM_4', 'OEM_6', 'OEM_5',
    // Home row
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'OEM_1', 'OEM_7',
    // Bottom row
    'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'OEM_COMMA', 'OEM_PERIOD', 'OEM_2', 'OEM_3'
];

export const PHONETIC_KEY_MAP = {
    // Basic Latin alphabet
    'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F',
    'g': 'G', 'h': 'H', 'i': 'I', 'j': 'J', 'k': 'K', 'l': 'L',
    'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P', 'q': 'Q', 'r': 'R',
    's': 'S', 't': 'T', 'u': 'U', 'v': 'V', 'w': 'W', 'x': 'X',
    'y': 'Y', 'z': 'Z',

    // Multigraphs
    'th': 'T', 'dh': 'D', 'sh': 'S', 'ch': 'C', 'zh': 'Z', 'kh': 'K',
    'gh': 'G', 'ph': 'P', 'wh': 'W', 'ng': 'N', 'ts': 'T', 'dz': 'D',
    'qu': 'Q', 'pf': 'P', 'tl': 'T', 'dl': 'D',

    // IPA and phonetic equivalents
    'ʃ': 'S', 'ʒ': 'Z', 'θ': 'T', 'ð': 'D', 'ŋ': 'N', 'ɲ': 'N',
    'tʃ': 'C', 'dʒ': 'J', 'ʔ': 'OEM_7', 'χ': 'X', 'ħ': 'H',
    'ʕ': 'OEM_7', 'ɣ': 'G', 'β': 'B', 'ɸ': 'F', 'ç': 'C', 'ɬ': 'L',
    'ɮ': 'L', 'ɹ': 'R', 'ɾ': 'R', 'ʁ': 'R', 'ʀ': 'R', 'ʋ': 'V',
    'ɰ': 'W', 'ɥ': 'Y', 'ʎ': 'L', 'ɴ': 'N', 'ɢ': 'G',

    // Diacritic & accented vowels
    'á': 'A', 'à': 'A', 'ä': 'A', 'â': 'A', 'ã': 'A', 'å': 'A', 'ā': 'A', 'æ': 'A',
    'é': 'E', 'è': 'E', 'ë': 'E', 'ê': 'E', 'ē': 'E', 'ə': 'E', 'ɛ': 'E', 'ɜ': 'E',
    'í': 'I', 'ì': 'I', 'ï': 'I', 'î': 'I', 'ī': 'I', 'ɪ': 'I',
    'ó': 'O', 'ò': 'O', 'ö': 'O', 'ô': 'O', 'õ': 'O', 'ø': 'O', 'ō': 'O', 'ɔ': 'O',
    'ú': 'U', 'ù': 'U', 'ü': 'U', 'û': 'U', 'ū': 'U', 'ʊ': 'U', 'ʌ': 'U',
    'ý': 'Y', 'ÿ': 'Y', 'ŷ': 'Y',

    // Numbers
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',

    // Punctuation
    '-': 'OEM_MINUS', '=': 'OEM_PLUS', '[': 'OEM_4', ']': 'OEM_6',
    '\\': 'OEM_5', ';': 'OEM_1', '\'': 'OEM_7', ',': 'OEM_COMMA',
    '.': 'OEM_PERIOD', '/': 'OEM_2', '`': 'OEM_3'
};

/**
 * Extract phonetic target key from character, syllable, or gloss string.
 */
export function getPhoneticTargetKey(token) {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim().toLowerCase();
    if (!clean) return null;

    // 1. Direct dictionary match
    if (PHONETIC_KEY_MAP[clean]) {
        return PHONETIC_KEY_MAP[clean];
    }

    // 2. Multigraph check (first 2 chars e.g. "th", "sh", "ch")
    if (clean.length >= 2 && PHONETIC_KEY_MAP[clean.substring(0, 2)]) {
        return PHONETIC_KEY_MAP[clean.substring(0, 2)];
    }

    // 3. First character check (e.g. "ka" -> "k" -> 'K', "paro" -> "p" -> 'P')
    const firstChar = clean[0];
    if (PHONETIC_KEY_MAP[firstChar]) {
        return PHONETIC_KEY_MAP[firstChar];
    }

    // 4. Fallback: match any Latin character A-Z
    const latinMatch = clean.match(/[a-z]/i);
    if (latinMatch) {
        return latinMatch[0].toUpperCase();
    }

    return null;
}

/**
 * Automatically distribute characters across keyboard layers.
 * 
 * @param {Array<Object>} items - Array of { char, unicode, label, category, isUpper }
 * @param {Object} options
 * @param {string} options.strategy - 'smart_phonetic' | 'sequential' | 'syllabic' | 'fill_unmapped'
 * @param {Object} [options.existingMappings] - Current { [vk]: { base, shift, altgr } }
 * @param {boolean} [options.preserveExisting=false] - If true, do not overwrite already mapped keys
 * @returns {Object} nextMappings
 */
export function distributeLetters(items = [], options = {}) {
    const strategy = options.strategy || 'smart_phonetic';
    const preserveExisting = Boolean(options.preserveExisting || strategy === 'fill_unmapped');
    
    // Deep clone existing mappings or create blank map
    const mappings = {};
    if (options.existingMappings && typeof options.existingMappings === 'object') {
        Object.entries(options.existingMappings).forEach(([vk, m]) => {
            mappings[vk] = {
                base: m?.base || '-1',
                shift: m?.shift || '-1',
                altgr: m?.altgr || '-1'
            };
        });
    }

    const keyOrder = ASSIGNABLE_KEYS_HOME_FIRST;
    const layers = ['base', 'shift', 'altgr'];

    // Deduplicate items by their output value
    const uniqueItems = [];
    const seenOutputs = new Set();
    items.forEach(it => {
        const val = it.unicode || it.char;
        if (!val || val === '-1') return;
        if (!seenOutputs.has(val)) {
            seenOutputs.add(val);
            uniqueItems.push(it);
        }
    });

    if (preserveExisting) {
        // Collect already mapped values
        const mappedVals = new Set();
        Object.values(mappings).forEach(m => {
            if (m.base && m.base !== '-1') mappedVals.add(m.base);
            if (m.shift && m.shift !== '-1') mappedVals.add(m.shift);
            if (m.altgr && m.altgr !== '-1') mappedVals.add(m.altgr);
        });

        // Filter out already mapped items
        const remainingItems = uniqueItems.filter(it => !mappedVals.has(it.unicode || it.char));
        
        // Find empty slots
        const emptySlots = [];
        layers.forEach(layer => {
            keyOrder.forEach(vk => {
                const cur = mappings[vk]?.[layer];
                if (!cur || cur === '-1') {
                    emptySlots.push({ vk, layer });
                }
            });
        });

        // Fill remaining items into empty slots
        remainingItems.forEach((it, idx) => {
            if (idx < emptySlots.length) {
                const slot = emptySlots[idx];
                if (!mappings[slot.vk]) mappings[slot.vk] = { base: '-1', shift: '-1', altgr: '-1' };
                mappings[slot.vk][slot.layer] = it.unicode || it.char;
            }
        });

        return mappings;
    }

    // Fresh distribution: reset mappings
    keyOrder.forEach(vk => {
        mappings[vk] = { base: '-1', shift: '-1', altgr: '-1' };
    });

    if (strategy === 'sequential') {
        // Fill home-row first across Base, then Shift, then AltGr
        let itemIdx = 0;
        for (const layer of layers) {
            for (const vk of keyOrder) {
                if (itemIdx >= uniqueItems.length) break;
                const it = uniqueItems[itemIdx++];
                mappings[vk][layer] = it.unicode || it.char;
            }
            if (itemIdx >= uniqueItems.length) break;
        }
        return mappings;
    }

    // Smart Phonetic / Syllabic Distribution
    const unplacedItems = [];

    uniqueItems.forEach(it => {
        const val = it.unicode || it.char;
        const searchToken = it.char || it.label || val;
        const targetVk = getPhoneticTargetKey(searchToken);
        const isUpper = Boolean(it.isUpper || (typeof it.char === 'string' && it.char.length === 1 && it.char !== it.char.toLowerCase() && it.char === it.char.toUpperCase()));

        if (!targetVk || !mappings[targetVk]) {
            unplacedItems.push(it);
            return;
        }

        const keyMap = mappings[targetVk];

        if (isUpper) {
            // Capital letters prefer Shift layer first
            if (keyMap.shift === '-1') {
                keyMap.shift = val;
            } else if (keyMap.altgr === '-1') {
                keyMap.altgr = val;
            } else if (keyMap.base === '-1') {
                keyMap.base = val;
            } else {
                unplacedItems.push(it);
            }
        } else {
            // Standard / lower prefers Base, then Shift, then AltGr
            if (keyMap.base === '-1') {
                keyMap.base = val;
            } else if (keyMap.shift === '-1') {
                keyMap.shift = val;
            } else if (keyMap.altgr === '-1') {
                keyMap.altgr = val;
            } else {
                unplacedItems.push(it);
            }
        }
    });

    // Place remaining unplaced items in available slots (Base -> Shift -> AltGr)
    let unplacedIdx = 0;
    for (const layer of layers) {
        for (const vk of keyOrder) {
            if (unplacedIdx >= unplacedItems.length) break;
            if (mappings[vk][layer] === '-1') {
                const it = unplacedItems[unplacedIdx++];
                mappings[vk][layer] = it.unicode || it.char;
            }
        }
        if (unplacedIdx >= unplacedItems.length) break;
    }

    return mappings;
}
