// src/utils/prosodyEngine.jsx
// Pure utility — no React dependencies.
// Computes stress position and tone assignment for a word based on
// the user's language-wide prosody rules (defined in Phonology settings).

/**
 * Split a word into syllable nuclei using the user's vowel inventory.
 * Returns an array of { nucleus, onset, coda, isHeavy } objects.
 */
function syllabify(word, vowelsArr) {
    if (!word || vowelsArr.length === 0) return [];

    // Sort vowels longest-first so multi-char vowels match before single-char
    const sorted = [...vowelsArr].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const vowelPattern = new RegExp(`(${escaped.join('|')})`, 'gi');

    // Split word around vowel nuclei
    const parts = [];
    let lastIndex = 0;
    let match;
    const regex = new RegExp(vowelPattern.source, 'gi');

    while ((match = regex.exec(word)) !== null) {
        const before = word.slice(lastIndex, match.index);
        parts.push({ before, nucleus: match[0], nucleusIndex: match.index });
        lastIndex = regex.lastIndex;
    }
    const trailing = word.slice(lastIndex);

    if (parts.length === 0) {
        // No vowels found — treat the whole word as one syllable
        return [{ nucleus: '', onset: word, coda: '', isHeavy: false }];
    }

    // Build syllable objects with onset/coda analysis
    const syllables = parts.map((part, i) => {
        let onset = part.before;
        let coda = '';

        // The coda is the consonant material between this nucleus and the next
        if (i < parts.length - 1) {
            const gap = word.slice(
                part.nucleusIndex + part.nucleus.length,
                parts[i + 1].nucleusIndex
            );
            // Split consonant cluster: first half = coda of current, second half = onset of next
            // Simple heuristic: if cluster length > 1, split at midpoint
            if (gap.length > 1) {
                const splitAt = Math.ceil(gap.length / 2);
                coda = gap.slice(0, splitAt);
            } else if (gap.length === 1) {
                // Single consonant goes to onset of next syllable (open syllable preference)
                coda = '';
            }
        } else {
            // Last syllable — trailing consonants are its coda
            coda = trailing;
        }

        // A syllable is "heavy" if it has a coda (closed) or a long vowel (length > 1)
        const isHeavy = coda.length > 0 || part.nucleus.length > 1;

        return { nucleus: part.nucleus, onset, coda, isHeavy };
    });

    return syllables;
}

/**
 * Determine which syllable index should receive primary stress.
 *
 * @param {Array} syllables — output of syllabify()
 * @param {Array} stressRules — user rules from config
 * @returns {number} — 0-based syllable index, or -1 if no rule matches
 */
function resolveStressIndex(syllables, stressRules) {
    const count = syllables.length;
    if (count === 0) return -1;
    if (count === 1) return 0; // Monosyllabic words are trivially stressed

    if (!stressRules || stressRules.length === 0) return -1;

    // Use the first active rule (rules are ordered by priority)
    for (const rule of stressRules) {
        if (rule.type === 'fixed') {
            switch (rule.value) {
                case 'initial':          return 0;
                case 'penultimate':      return Math.max(0, count - 2);
                case 'ultimate':         return count - 1;
                case 'antepenultimate':  return Math.max(0, count - 3);
                default: {
                    const n = parseInt(rule.value, 10);
                    if (!isNaN(n) && n >= 1 && n <= count) return n - 1;
                }
            }
        } else if (rule.type === 'weight') {
            if (rule.value === 'heaviest') {
                // Find the last heavy syllable (prefer rightmost in case of tie)
                let heaviestIdx = -1;
                for (let i = syllables.length - 1; i >= 0; i--) {
                    if (syllables[i].isHeavy) {
                        heaviestIdx = i;
                        break;
                    }
                }
                if (heaviestIdx !== -1) return heaviestIdx;

                // Fallback: if no heavy syllable, use the fallback value
                if (rule.fallback) {
                    switch (rule.fallback) {
                        case 'initial':         return 0;
                        case 'penultimate':     return Math.max(0, count - 2);
                        case 'ultimate':        return count - 1;
                        case 'antepenultimate': return Math.max(0, count - 3);
                    }
                }
                // Default fallback: penultimate
                return Math.max(0, count - 2);
            }
        }
    }

    return -1;
}

/**
 * Assign tone values to syllables based on tone rules and stress position.
 *
 * @param {number} stressIndex — which syllable is stressed
 * @param {number} syllableCount — total syllable count
 * @param {Array} toneRules — user rules from config
 * @returns {string} — the tone label for the stressed syllable (for display)
 */
function resolveTone(stressIndex, syllableCount, toneRules) {
    if (!toneRules || toneRules.length === 0) return '';
    if (syllableCount === 0) return '';

    // Look for the first rule that matches
    for (const rule of toneRules) {
        switch (rule.condition) {
            case 'stressed':
                // Only fires if we actually have a stressed syllable
                if (stressIndex >= 0) return rule.value;
                break;
            case 'unstressed':
                // Not useful for single-value display — skip
                break;
            case 'initial':
                // Positional: the initial syllable always exists
                if (syllableCount > 0) return rule.value;
                break;
            case 'final':
                // Positional: the final syllable always exists
                if (syllableCount > 0) return rule.value;
                break;
            case 'all':
                return rule.value;
            default:
                break;
        }
    }

    return '';
}

// ─── TONE OPTIONS (mirroring ToneStressSelector.jsx) ───
export const TONE_OPTIONS = ["High", "Low", "Mid", "Rising", "Falling", "Dipping", "Peaking"];

// ─── STRESS POSITION OPTIONS ───
export const STRESS_POSITIONS = [
    { value: 'initial',         label: 'Initial (1st syllable)' },
    { value: 'penultimate',     label: 'Penultimate (2nd-to-last)' },
    { value: 'ultimate',        label: 'Ultimate (last syllable)' },
    { value: 'antepenultimate', label: 'Antepenultimate (3rd-to-last)' },
];

// ─── TONE CONDITION OPTIONS ───
export const TONE_CONDITIONS = [
    { value: 'stressed',   label: 'Stressed syllable' },
    { value: 'unstressed', label: 'Unstressed syllables' },
    { value: 'initial',    label: 'Initial syllable' },
    { value: 'final',      label: 'Final syllable' },
    { value: 'all',        label: 'All syllables' },
];

/**
 * Main entry point. Computes stress and tone for a word.
 *
 * @param {string} word — the conlang word (base form, no asterisks)
 * @param {object} config — { vowels: string, stressRules: Array, toneRules: Array }
 * @returns {{ stress: string, tone: string, syllableCount: number, stressIndex: number }}
 */
export function computeProsody(word, config) {
    const empty = { stress: '', tone: '', syllableCount: 0, stressIndex: -1 };
    if (!word || !config) return empty;

    const { vowels, stressRules, toneRules } = config;
    if ((!stressRules || stressRules.length === 0) && (!toneRules || toneRules.length === 0)) {
        return empty;
    }

    // Parse vowel inventory
    let vowelsArr = [];
    if (vowels) {
        vowelsArr = vowels.split(',').map(v => {
            const trimmed = v.trim();
            // Handle orthography mappings like "ʃ=sh" — use the IPA side
            return trimmed.includes('=') ? trimmed.split('=')[0].trim() : trimmed;
        }).filter(Boolean);
    }

    // Add common fallback vowels that might be in the word but not in the inventory
    const fallbacks = ['a', 'e', 'i', 'o', 'u'];
    const wordLower = word.toLowerCase();
    fallbacks.forEach(fv => {
        if (wordLower.includes(fv) && !vowelsArr.some(v => v.toLowerCase() === fv)) {
            vowelsArr.push(fv);
        }
    });

    if (vowelsArr.length === 0) return empty;

    const syllables = syllabify(word, vowelsArr);
    const syllableCount = syllables.length;

    if (syllableCount === 0) return empty;

    // Resolve stress
    const stressIndex = resolveStressIndex(syllables, stressRules);
    // Convert to 1-based string for compatibility with the existing stress system
    const stress = stressIndex >= 0 ? String(stressIndex + 1) : '';

    // Resolve tone
    const tone = resolveTone(stressIndex, syllableCount, toneRules);

    return { stress, tone, syllableCount, stressIndex };
}
