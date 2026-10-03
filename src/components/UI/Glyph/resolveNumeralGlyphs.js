// src/components/UI/Glyph/resolveNumeralGlyphs.js
// Builds numbers out of their numeral atoms and resolves every atom to the glyphs
// the ACTIVE script would actually draw for it.
//
// WHY THIS EXISTS
// A numeral name ("nī", "fō", "nūnī") is a *written word*, not a single character.
// Three separate defects came from treating it as one:
//
//   1. Cross-script glyph lookups. Every script allocates its own PUA codepoints
//      starting at U+E000, so the same codepoint means a DIFFERENT drawing in each
//      script. Searching "any script that has this codepoint" therefore drew a
//      random glyph from the wrong script (e.g. a logographic ideogram's codepoint
//      looked up in the alphabetic script's table rendered the letter "h" for
//      "sa"). Glyph lookup here is strictly scoped to the one script being shown.
//
//   2. Script type. Lexicon ideograms are the logographic way of writing a word.
//      For alphabetic / syllabic / block scripts the name must instead be
//      transliterated with THAT script's own mapping and drawn per character.
//
//   3. Stems and fusion. With Internal Fusion on, a component such as "nūnī" is
//      power "nū" fused with the stem "nī". Stems are spoken variants of a digit
//      and usually have no lexicon entry or drawing of their own, so the whole
//      component used to vanish from the preview (12+ in base 6). Components are
//      now built from atoms, and a stem without its own drawing falls back to the
//      drawing of its digit - which is how the number is written.
//
// Kept import-free and JSX-free so it is unit testable straight from Node.

/** Normalised form used to match lexicon words (mirrors transliterateText). */
export const normWord = (s) => (s || '').replace(/\*/g, '').toLowerCase().trim();

/** Lookup key a `customGlyphs` map may use for a character. */
export const glyphKeys = (ch) => {
    if (!ch && ch !== 0) return [];
    const cp = typeof ch === 'number' ? ch : ch.codePointAt(0);
    return [cp, String(cp), ch];
};

/**
 * Finds a drawn glyph for a single character in customGlyphs (or scriptDataById).
 */
export function findCharGlyph(ch, { customGlyphs = {}, scriptDataById = {}, scriptId = null, strokes = null } = {}) {
    if (strokes && Array.isArray(strokes)) return strokes;
    if (!ch && ch !== 0) return null;

    const keys = glyphKeys(ch);
    for (const k of keys) {
        if (customGlyphs[k]) return customGlyphs[k];
    }
    if (scriptId && scriptDataById[scriptId]?.customGlyphs) {
        const sg = scriptDataById[scriptId].customGlyphs;
        for (const k of keys) {
            if (sg[k]) return sg[k];
        }
        return null;
    }
    if (scriptDataById && typeof scriptDataById === 'object') {
        for (const scriptData of Object.values(scriptDataById)) {
            const sg = scriptData?.customGlyphs;
            if (!sg) continue;
            for (const k of keys) {
                if (sg[k]) return sg[k];
            }
        }
    }
    return null;
}

export function getGlyphEntry(ch, customGlyphs = {}) {
    return findCharGlyph(ch, { customGlyphs });
}

export function hasDrawnGlyph(text, opts = {}) {
    return Array.from(text || '').some((ch) => Boolean(findCharGlyph(ch, opts)));
}

/**
 * Builds a word -> entry index once, so a run of numeral atoms does not re-scan
 * the whole lexicon per lookup. The lexicon can hold 500+ entries.
 */
export function buildLexiconIndex(lexicon = []) {
    const byWord = new Map();
    for (const entry of lexicon) {
        if (!entry) continue;
        const key = normWord(entry.word);
        if (!key) continue;
        const existing = byWord.get(key);
        // Prefer an entry that actually has a drawn form, so a bare duplicate
        // never shadows a usable one.
        if (!existing || (entry.ideogram && !existing.ideogram)) byWord.set(key, entry);
    }
    return byWord;
}

/**
 * Resolves ONE numeral name to the text that should be drawn.
 *
 * Returns `{ text, source }` where `source` is one of:
 *   'lexicon' - the conlang's own ideogram for this word (logographic)
 *   'glyph'   - the name is itself a single drawn glyph
 *   'chars'   - resolved per character (alphabetic / abugida conlangs)
 *   'none'    - nothing drawable; the caller should show a placeholder
 */
export function resolveNumeralName(name, opts = {}) {
    const { customGlyphs = {}, scriptDataById = {}, scriptType, transliterate } = opts;
    const raw = (name || '').trim();
    if (!raw) return { text: '', source: 'none' };

    const isLogographic = scriptType === 'logographic' || (!scriptType && (opts.lexiconIndex?.size > 0 || (opts.lexicon && opts.lexicon.length > 0)));

    // 1. The logographic path: this word is a known conlang word with a drawn form.
    // Only used when scriptType is logographic (or not specified when lexicon is available).
    if (isLogographic) {
        const index = opts.lexiconIndex || (opts.lexicon?.length ? buildLexiconIndex(opts.lexicon) : null);
        const entry = index?.get(normWord(raw));
        if (entry?.ideogram) {
            return { text: entry.ideogram, source: 'lexicon' };
        }
    }

    // 2. A one-glyph numeral name (e.g. a digit drawn as a single ideogram).
    // Restricted to a SINGLE character on purpose: findCharGlyph keys on the
    // first codepoint, so passing a multi-character name would happily match the
    // glyph for that name's first letter and report it as a whole drawn glyph.
    if (Array.from(raw).length === 1 && findCharGlyph(raw, { customGlyphs, scriptDataById })) {
        return { text: raw, source: 'glyph' };
    }

    // Also support multi-character ideogram strings where EVERY character is a drawn glyph:
    if (isLogographic && Array.from(raw).length > 1 && Array.from(raw).every((ch) => findCharGlyph(ch, { customGlyphs, scriptDataById }))) {
        return { text: raw, source: 'glyph' };
    }

    // In logographic scripts, words and numbers are represented by ideograms.
    // We must NEVER decompose romanized names into Latin letters or transliterate phonetically,
    // because logographic characters represent morphemes/concepts, not phonetic Latin spellings.
    if (isLogographic) {
        return { text: '', source: 'none' };
    }

    // 3. For alphabetic / syllabic / featural scripts with a transliterate function:
    if (transliterate && scriptType !== 'logographic') {
        const transliterated = transliterate(raw);
        if (transliterated) {
            const tChars = Array.from(transliterated).filter((ch) => !/\s/.test(ch));
            if (tChars.length && tChars.every((ch) => findCharGlyph(ch, { customGlyphs, scriptDataById }))) {
                return { text: tChars.join(''), source: 'chars' };
            }
        }
    }

    // 4. Per character, for conlangs whose letters are the glyphs. Only meaningful
    // once every character has a glyph, otherwise the name would render as a
    // mix of drawn and blank boxes.
    const chars = Array.from(raw).filter((ch) => !/\s/.test(ch));
    if (chars.length && chars.every((ch) => findCharGlyph(ch, { customGlyphs, scriptDataById }))) {
        return { text: chars.join(''), source: 'chars' };
    }

    return { text: '', source: 'none' };
}

/**
 * Resolves ONE written name to the characters the script draws for it.
 */
export function resolveWordGlyphs(name, opts = {}) {
    const res = resolveNumeralName(name, opts);
    if (!res || res.source === 'none' || !res.text) {
        return { chars: [], complete: false };
    }
    const chars = Array.from(res.text).map((ch) => ({
        char: ch,
        raw: findCharGlyph(ch, opts)
    }));
    return { chars, complete: chars.length > 0 && chars.every((c) => Boolean(c.raw)) };
}

/**
 * Builds a number as components, each an ordered list of atoms:
 *   { kind: 'zero' | 'digit' | 'stem' | 'power' | 'irregular', value, name, fallbackName? }
 */
export function buildNumeralAtoms(num, numberSystem = {}, numeralBase = 10, { ignoreIrregulars = false } = {}) {
    const ns = numberSystem || {};
    const irregulars = ignoreIrregulars ? {} : (ns.irregulars || {});

    if (num === 0) return [[{ kind: 'zero', value: 0, name: ns.zero || '0' }]];
    if (irregulars[num]) {
        return [[{
            kind: 'irregular',
            value: num,
            name: irregulars[num],
            fallback: buildNumeralAtoms(num, ns, numeralBase, { ignoreIrregulars: true })
        }]];
    }

    const base = numeralBase > 1 ? numeralBase : 10;
    const {
        fusion = false,
        useStemsForUnits = false,
        internalOrder = 'digit-first',
        magnitudeOrder = 'standard',
        hideOne = false
    } = ns.settings || {};

    const digitAtom = (digit, preferStem) => {
        const digitName = ns.digits?.[digit] || `(${digit})`;
        const stem = ns.stems?.[digit];
        if (preferStem && stem) {
            return { kind: 'stem', value: digit, name: stem, fallbackName: ns.digits?.[digit] || '' };
        }
        return { kind: 'digit', value: digit, name: digitName };
    };

    const components = [];
    let remaining = num;
    let power = 0;

    while (remaining > 0) {
        const digit = remaining % base;
        if (digit > 0) {
            if (power === 0) {
                components.push([digitAtom(digit, useStemsForUnits)]);
            } else {
                const powerVal = Math.pow(base, power);
                const pAtom = { kind: 'power', value: powerVal, name: ns.powers?.[powerVal] || `[Base^${power}]` };
                const dAtom = (hideOne && digit === 1) ? null : digitAtom(digit, fusion);
                if (!dAtom) components.push([pAtom]);
                else components.push(internalOrder === 'unit-first' ? [pAtom, dAtom] : [dAtom, pAtom]);
            }
        }
        remaining = Math.floor(remaining / base);
        power++;
        if (power > 20) break;
    }

    if (magnitudeOrder === 'standard') components.reverse();
    return components;
}

/** Written form of each component ("nū" + "nī" -> "nūnī" with fusion). */
export function joinNumeralComponents(components = [], settings = {}) {
    const inner = settings?.fusion ? '' : (settings?.separator ?? ' ');
    return components.map((atoms) => {
        if (Array.isArray(atoms)) return atoms.map((a) => (typeof a === 'string' ? a : a?.name || '')).join(inner);
        return String(atoms || '');
    }).filter(Boolean);
}

/** Full written name of a number, joined with the configured separator. */
export function numeralName(components = [], settings = {}) {
    const outer = settings?.globalFusion ? '' : (settings?.separator ?? ' ');
    return joinNumeralComponents(components, settings).join(outer);
}

/**
 * Resolves one atom, applying the fallbacks a numeral legitimately has.
 * Returns `{ text, source }`, or null when nothing drawable exists.
 */
function resolveAtom(atom, opts) {
    if (!atom) return null;
    const isStem = typeof atom === 'object' && atom.kind === 'stem';
    const isLogographic = opts.scriptType === 'logographic' || (!opts.scriptType && (opts.lexiconIndex?.size > 0 || (opts.lexicon && opts.lexicon.length > 0)));

    if (isStem) {
        // 1. In logographic scripts, stems are spoken readings and are written with the digit's ideogram.
        // If the stem has an explicit ideogram in the lexicon or drawn glyph, use it:
        if (atom.name) {
            const stemRes = resolveNumeralName(atom.name, opts);
            if (stemRes && stemRes.text && (stemRes.source === 'lexicon' || stemRes.source === 'glyph')) {
                return stemRes;
            }
            if (!isLogographic && stemRes && stemRes.text && stemRes.source !== 'none') {
                return stemRes;
            }
        }

        // 2. The standard logographic & phonetic fallback: stems are written with their base digit's glyph!
        if (atom.fallbackName) {
            const digitRes = resolveNumeralName(atom.fallbackName, opts);
            if (digitRes && digitRes.text && digitRes.source !== 'none') {
                return { ...digitRes, source: 'stem-digit' };
            }
        }

        // 3. If neither resolved:
        if (isLogographic) {
            return null;
        }
        if (atom.name) {
            const fallback = resolveNumeralName(atom.name, opts);
            return (fallback && fallback.text) ? fallback : null;
        }
        return null;
    }

    const name = typeof atom === 'string' ? atom : atom.name;
    const res = resolveNumeralName(name, opts);
    if (res && res.text && res.source !== 'none') return res;

    return null;
}

/**
 * Resolves numeral components into a flat list of parts for GlyphBaselineRow.
 * Accepts either:
 *   - an array of atom arrays: `[[atom, atom], [atom]]` (from buildNumeralAtoms)
 *   - an array of component strings: `['fō', 'nūnī']`
 *
 * Each returned part mirrors the shape GlyphBaselineRow expects:
 *   { char, label, isComponentStart, isNewComponent, source, metrics, strokes }
 */
export function resolveNumeralComponents(components = [], opts = {}) {
    const { customGlyphs = {}, scriptDataById = {}, getMetrics, keepMissing = false } = opts;
    const lexiconIndex = opts.lexiconIndex || buildLexiconIndex(opts.lexicon || []);
    const resolveOpts = { ...opts, lexiconIndex, customGlyphs, scriptDataById };

    const parts = [];

    const pushAtoms = (atoms, isFirstComponent) => {
        let firstInComponent = true;

        for (const atom of atoms) {
            if (!atom) continue;
            const name = typeof atom === 'string' ? atom : atom.name;
            if (!name || !name.trim()) continue;

            const resolved = resolveAtom(atom, resolveOpts);

            if (resolved && resolved.text) {
                Array.from(resolved.text).forEach((ch) => {
                    if (/\s/.test(ch)) return;
                    const raw = findCharGlyph(ch, resolveOpts);
                    const metrics = raw && getMetrics ? getMetrics(raw) : null;
                    parts.push({
                        char: ch,
                        label: name,
                        isComponentStart: firstInComponent,
                        isNewComponent: !isFirstComponent && firstInComponent,
                        source: resolved.source,
                        metrics,
                        strokes: metrics?.strokes ?? null
                    });
                    firstInComponent = false;
                });
                continue;
            }

            // An irregular word with no drawing falls back to regular composition
            if (typeof atom === 'object' && atom.kind === 'irregular' && Array.isArray(atom.fallback) && atom.fallback.length) {
                atom.fallback.forEach((fbAtoms, fi) => pushAtoms(fbAtoms, isFirstComponent && fi === 0));
                continue;
            }

            // If keepMissing is requested, preserve placeholder for undrawn atom
            if (keepMissing) {
                parts.push({
                    char: name,
                    label: name,
                    isComponentStart: firstInComponent,
                    isNewComponent: !isFirstComponent && firstInComponent,
                    source: 'none',
                    missing: true,
                    metrics: null,
                    strokes: null
                });
                firstInComponent = false;
            }
        }
    };

    components.forEach((comp, ci) => {
        if (!comp) return;
        const atoms = Array.isArray(comp) ? comp : [comp];
        if (atoms.length) pushAtoms(atoms, ci === 0);
    });

    return parts;
}
