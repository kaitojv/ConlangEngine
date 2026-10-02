// src/components/UI/Glyph/resolveNumeralGlyphs.js
// Resolves the written name of a numeral component to the characters that should
// actually be drawn for it.
//
// WHY THIS EXISTS
// A numeral name ("nī", "fō", "nūnī") is a *written word*, not a single character,
// and for a logographic conlang it maps to a drawn ideogram rather than to
// per-letter glyphs. Running such a name through transliterate() is what used to
// break the preview: the logographic branch of transliterateText() only knows how
// to return a lexicon entry's `ideogram`, so any name that is not itself a lexicon
// entry falls through to `return cleanWord` - the literal romanized letters, which
// have no drawn glyph anywhere and therefore render as empty placeholders.
//
// So resolution is done here, explicitly, in the order the conlang actually uses,
// and each step is a real lookup rather than a hopeful fallback:
//
//   1. lexicon entry for the name -> its `ideogram` (word-level, the logographic way)
//   2. a direct drawn glyph for the name itself (a one-glyph numeral name)
//   3. per-character resolution, for genuinely alphabetic conlangs where the
//      name's letters are the glyphs
//
// Kept import-free and JSX-free so it is unit testable straight from Node.

/** Lookup key a `customGlyphs` map may use for a character. */
const glyphKeys = (ch) => {
    const cp = ch.codePointAt(0);
    return [cp, String(cp), ch];
};

/**
 * Finds a drawn glyph for a single character, mirroring resolveRawGlyph's search
 * order: explicit strokes, then the root map, then each script's own map.
 */
export function findCharGlyph(ch, { customGlyphs = {}, scriptDataById = {}, strokes = null } = {}) {
    if (strokes && Array.isArray(strokes)) return strokes;
    if (!ch) return null;

    const keys = glyphKeys(ch);
    for (const k of keys) {
        if (customGlyphs[k]) return customGlyphs[k];
    }
    for (const scriptData of Object.values(scriptDataById)) {
        const sg = scriptData?.customGlyphs;
        if (!sg) continue;
        for (const k of keys) {
            if (sg[k]) return sg[k];
        }
    }
    return null;
}

/** True when at least one character of `text` has a drawn glyph. */
export function hasDrawnGlyph(text, opts = {}) {
    return Array.from(text || '').some((ch) => Boolean(findCharGlyph(ch, opts)));
}


/**
 * Builds a word -> entry index once, so a run of numeral components does not
 * re-scan the whole lexicon per character. The lexicon can hold 500+ entries.
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
 * Resolves ONE numeral component name to the text that should be drawn.
 *
 * Returns `{ text, source }` where `source` is one of:
 *   'lexicon' - the conlang's own ideogram for this word (logographic)
 *   'glyph'   - the name is itself a single drawn glyph
 *   'chars'   - resolved per character (alphabetic / abugida conlangs)
 *   'none'    - nothing drawable; the caller should show a placeholder
 */
export function resolveNumeralName(name, opts = {}) {
    const { customGlyphs = {}, scriptDataById = {} } = opts;
    const raw = (name || '').trim();
    if (!raw) return { text: '', source: 'none' };

    // 1. The logographic path: this word is a known conlang word with a drawn form.
    //    The index is built once per render by resolveNumeralComponents, but a bare
    //    `lexicon` is accepted here too so this function is usable on its own.
    const index = opts.lexiconIndex || (opts.lexicon?.length ? buildLexiconIndex(opts.lexicon) : null);
    const entry = index?.get(normWord(raw));
    if (entry?.ideogram) {
        return { text: entry.ideogram, source: 'lexicon' };
    }

    // 2. A one-glyph numeral name (e.g. a digit drawn as a single ideogram).
    //    Restricted to a SINGLE character on purpose: findCharGlyph keys on the
    //    first codepoint, so passing a multi-character name would happily match the
    //    glyph for that name's first letter and report it as a whole drawn glyph.
    //    That is precisely the misclassification this module exists to prevent.
    if (Array.from(raw).length === 1 && findCharGlyph(raw, { customGlyphs, scriptDataById })) {
        return { text: raw, source: 'glyph' };
    }

    // 3. Per character, for conlangs whose letters are the glyphs. Only meaningful
    //    once every character has a glyph, otherwise the name would render as a
    //    mix of drawn and blank boxes.
    const chars = Array.from(raw).filter((ch) => !/\s/.test(ch));
    if (chars.length && chars.every((ch) => findCharGlyph(ch, { customGlyphs, scriptDataById }))) {
        return { text: chars.join(''), source: 'chars' };
    }

    // Nothing drawable. Handing back the raw name would render a run of empty
    // boxes that look like a broken glyph rather than a missing one.
    return { text: '', source: 'none' };
}

/**
 * Resolves a full list of numeral components, keeping the per-component
 * boundaries so a separator is still drawn *between* components and never inside
 * a fused one.
 *
 * Each returned part mirrors the shape GlyphBaselineRow expects.
 */
export function resolveNumeralComponents(components = [], opts = {}) {
    const { customGlyphs = {}, scriptDataById = {}, getMetrics } = opts;
    const lexiconIndex = opts.lexiconIndex || buildLexiconIndex(opts.lexicon || []);

    const parts = [];
    components.forEach((component, ci) => {
        if (!component) return;
        const { text, source } = resolveNumeralName(component, { lexiconIndex, customGlyphs, scriptDataById });
        if (!text) return;

        Array.from(text).forEach((ch, gi) => {
            if (/\s/.test(ch)) return;
            const raw = findCharGlyph(ch, { customGlyphs, scriptDataById });
            const metrics = raw && getMetrics ? getMetrics(raw) : null;
            parts.push({
                char: ch,
                label: component,
                isComponentStart: gi === 0,
                isNewComponent: ci > 0 && gi === 0,
                // Recorded so the UI can explain *why* a number has no drawing
                // instead of silently showing an empty box.
                source,
                metrics,
                strokes: metrics?.strokes ?? null
            });
        });
    });

    return parts;
}

/** Normalised form used to match lexicon words (mirrors transliterateText). */
const normWord = (s) => (s || '').replace(/\*/g, '').toLowerCase().trim();
