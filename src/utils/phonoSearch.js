// src/utils/phonoSearch.js
// Phoneme-pattern search over the lexicon.
//
// Query syntax (used in the Lexicon search box with a leading "/"):
//   literal IPA      tʰa, st, t͡ʃ        matches those exact phonemes
//   C / V            uppercase only      any consonant / any vowel
//   [features]       [nasal], [+voiced,fricative], [velar], [-rounded], [close]
//   *                wildcard            any sequence of phonemes (incl. none)
//   #                word boundary       only meaningful at pattern start/end
//
// Without "#" the pattern matches anywhere inside the word.
// Examples:
//   #st     word begins with /st/
//   VnV     vowel-n-vowel anywhere
//   [nasal]V#   nasal + vowel word-finally
//
// Matching is token-based, not raw-regex-based: entry IPA strings are
// tokenized into phonemes first (multigraphs, tie-bar affricates and
// diacritics handled), then matched against the compiled pattern. This
// avoids regex injection and keeps diacritic semantics sane:
//   - a plain query token ("t") matches any token with that base ("t", "tʰ")
//   - a query token carrying diacritics ("tʰ") requires the exact form

import { IPA_INFO } from './ipaData.js';

// ─── Tokenizer ────────────────────────────────────────────────────────────────

const TIE_BARS = '\u0361\u035C'; // ͡  ͜

// Combining marks + spacing modifier letters that attach to the previous
// base symbol (ʰ ʷ ʲ ˠ ˤ ː ˑ ˞ nasalization, voicing diacritics, ...).
// Deliberately EXCLUDES the stress marks ˈ (02C8) and ˌ (02CC), which are
// treated as separators.
// Intentional: we iterate code units and match lone combining marks so they
// can be attached to the preceding base symbol.
// eslint-disable-next-line no-misleading-character-class
const ATTACHING_MARK_RE = /[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F\u02B0-\u02C7\u02C9-\u02CB\u02CD-\u02FF\u207F\u2071]/;

// Characters that never belong to a phoneme: slashes/brackets around IPA,
// punctuation, stress marks, tone letters, syllable dots, the lexicon's
// root marker "*", etc.
const SEPARATOR_RE = /[\s/\\[\]().,;:!?'"’*\-|‖‿ˈˌ↗↘˥˦˧˨˩=]/;

const EMPTY_INV = { vowelSet: new Set(), consonantSet: new Set(), multigraphs: [] };

/**
 * Builds tokenizer/classifier inventories from the user's phonology config.
 * Accepts the raw config-store strings, e.g. consonants: "p, t, k, ʃ=sh".
 * The left side of "=" is the stored (base) form, matching validationEngine.
 */
export function buildInventories(config = {}) {
    const parse = (str) =>
        String(str || '')
            .split(',')
            .map((s) => s.trim().split('=')[0].trim().normalize('NFC').toLowerCase())
            .filter(Boolean);

    const vowels = parse(config.vowels);
    const consonants = [...parse(config.consonants), ...parse(config.otherPhonemes)];
    const multigraphs = [...vowels, ...consonants]
        .filter((p) => [...p].length > 1)
        .sort((a, b) => b.length - a.length); // longest first for greedy matching

    return {
        vowelSet: new Set(vowels),
        consonantSet: new Set(consonants),
        multigraphs,
    };
}

/**
 * Tokenizes an IPA string (or a romanized word, using the user's multigraphs)
 * into phoneme tokens: { base, full }.
 *   base — the bare symbol(s), diacritics stripped ("t" for "tʰ", "t͡ʃ" stays whole)
 *   full — base plus any attached diacritics/length marks
 */
export function tokenizeIPA(input, inv = EMPTY_INV) {
    if (!input) return [];
    const s = String(input).normalize('NFC').toLowerCase();
    const tokens = [];
    let i = 0;

    outer: while (i < s.length) {
        const ch = s[i];
        if (SEPARATOR_RE.test(ch)) {
            i++;
            continue;
        }

        // 1. User-defined multigraphs (e.g. "ch", "ng", "aa") — longest first
        for (const mg of inv.multigraphs) {
            if (s.startsWith(mg, i)) {
                let j = i + mg.length;
                let full = mg;
                while (j < s.length && ATTACHING_MARK_RE.test(s[j])) {
                    full += s[j];
                    j++;
                }
                tokens.push({ base: mg, full });
                i = j;
                continue outer;
            }
        }

        // 2. Single base char, extended by tie-bar affricates and diacritics
        let base = ch;
        let full = ch;
        let j = i + 1;
        while (j < s.length) {
            const c = s[j];
            if (TIE_BARS.includes(c) && j + 1 < s.length && !SEPARATOR_RE.test(s[j + 1])) {
                // tie bar glues the next base char on: t + ͡ + ʃ → t͡ʃ
                base = full + c + s[j + 1];
                full = base;
                j += 2;
            } else if (ATTACHING_MARK_RE.test(c)) {
                full += c;
                j++;
            } else {
                break;
            }
        }
        tokens.push({ base, full });
        i = j;
    }
    return tokens;
}

// ─── Classification & features ───────────────────────────────────────────────

/**
 * C/V classification. User config wins over IPA defaults (a conlanger may
 * declare "y" a vowel). Falls back to the first component for affricates
 * and symbols not in IPA_INFO.
 */
function classify(token, inv) {
    const b = token.base;
    if (inv.vowelSet.has(b)) return 'V';
    if (inv.consonantSet.has(b)) return 'C';
    const info = IPA_INFO[b];
    if (info) return info.isVowel ? 'V' : 'C';
    const first = [...b][0];
    const firstInfo = IPA_INFO[first];
    if (firstInfo) return firstInfo.isVowel ? 'V' : 'C';
    return null;
}

const FEATURE_ALIASES = {
    stop: 'plosive',
    occlusive: 'plosive',
    approx: 'approximant',
    round: 'rounded',
    labialized: 'rounded',
    unround: 'unrounded',
};

const PLACE_KEYWORDS = new Set([
    'bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar', 'retroflex',
    'palatal', 'velar', 'uvular', 'pharyngeal', 'glottal',
    // vowel backness lives in the same `place` field in IPA_INFO
    'front', 'central', 'back',
]);

const MANNER_KEYWORDS = new Set([
    'plosive', 'nasal', 'trill', 'tap', 'flap', 'fricative', 'approximant', 'lateral',
]);

const HEIGHT_KEYWORDS = new Set([
    'close', 'near-close', 'close-mid', 'mid', 'open-mid', 'near-open', 'open',
]);

function parseFeatureItem(raw) {
    let item = String(raw).trim().toLowerCase();
    if (!item) return null;
    let positive = true;
    if (item[0] === '+') item = item.slice(1).trim();
    else if (item[0] === '-' || item[0] === '−') {
        positive = false;
        item = item.slice(1).trim();
    }
    if (FEATURE_ALIASES[item]) item = FEATURE_ALIASES[item];

    if (item === 'voiced') return { kind: 'voiced', positive };
    if (item === 'voiceless') return { kind: 'voiced', positive: !positive };
    if (item === 'vowel') return { kind: 'vowel', positive };
    if (item === 'consonant') return { kind: 'vowel', positive: !positive };
    if (item === 'rounded') return { kind: 'rounded', positive };
    if (item === 'unrounded') return { kind: 'rounded', positive: !positive };
    if (PLACE_KEYWORDS.has(item)) return { kind: 'place', value: item, positive };
    if (MANNER_KEYWORDS.has(item)) return { kind: 'manner', value: item, positive };
    if (HEIGHT_KEYWORDS.has(item)) return { kind: 'height', value: item, positive };
    return { error: `Unknown feature "${String(raw).trim()}"` };
}

/**
 * Tests a token's base symbol against a feature bundle. Strict: the base must
 * exist in IPA_INFO (diacritic-altered values like devoiced [d̥] are judged by
 * their base symbol).
 */
function checkFeatures(token, constraints) {
    const info = IPA_INFO[token.base];
    if (!info) return false;
    const manner = (info.manner || '').toLowerCase().replace('approx.', 'approximant');
    const place = (info.place || '').toLowerCase();
    const backness = (info.backness || '').toLowerCase();
    const height = (info.height || '').toLowerCase();

    for (const c of constraints) {
        let hit;
        switch (c.kind) {
            case 'voiced': hit = !!info.voiced; break;
            case 'vowel': hit = !!info.isVowel; break;
            case 'rounded': hit = !!info.rounded; break;
            case 'place': hit = place === c.value || backness === c.value; break;
            case 'manner': hit = manner.includes(c.value); break;
            case 'height': hit = height === c.value; break;
            default: hit = false;
        }
        if (hit !== c.positive) return false;
    }
    return true;
}

// ─── Query parser ────────────────────────────────────────────────────────────

/**
 * Parses a phoneme pattern into matchable elements.
 * Returns { elements, anchorStart, anchorEnd } or { error }.
 */
export function parsePhonoQuery(raw, inv = EMPTY_INV) {
    let q = String(raw || '').normalize('NFC').trim();
    if (q.startsWith('/')) q = q.slice(1);
    if (q.endsWith('/')) q = q.slice(0, -1);
    q = q.trim();
    if (!q) return { error: 'Empty pattern' };

    let anchorStart = false;
    let anchorEnd = false;
    if (q[0] === '#') {
        anchorStart = true;
        q = q.slice(1);
    }
    if (q[q.length - 1] === '#') {
        anchorEnd = true;
        q = q.slice(0, -1);
    }

    const elements = [];
    let literalBuf = '';
    const flushLiteral = () => {
        if (!literalBuf) return;
        for (const tok of tokenizeIPA(literalBuf, inv)) {
            elements.push({
                type: 'literal',
                base: tok.base,
                full: tok.full,
                exact: tok.full !== tok.base, // diacritics present → exact match required
            });
        }
        literalBuf = '';
    };

    for (let i = 0; i < q.length; i++) {
        const ch = q[i];
        if (ch === '*') {
            flushLiteral();
            if (!elements.length || elements[elements.length - 1].type !== 'any') {
                elements.push({ type: 'any' });
            }
        } else if (ch === 'C' || ch === 'V') {
            flushLiteral();
            elements.push({ type: 'class', cls: ch });
        } else if (ch === '[') {
            flushLiteral();
            const close = q.indexOf(']', i);
            if (close === -1) return { error: 'Unclosed "[" — feature bundles look like [+voiced, fricative]' };
            const constraints = [];
            for (const part of q.slice(i + 1, close).split(',')) {
                const c = parseFeatureItem(part);
                if (!c) continue;
                if (c.error) return { error: c.error };
                constraints.push(c);
            }
            if (!constraints.length) return { error: 'Empty feature bundle "[]"' };
            elements.push({ type: 'features', constraints });
            i = close;
        } else if (ch === '#' || /\s/.test(ch)) {
            // '#' is only an anchor at the edges; mid-pattern it is ignored
            flushLiteral();
        } else {
            literalBuf += ch;
        }
    }
    flushLiteral();

    if (!elements.length) return { error: 'Empty pattern' };
    return { elements, anchorStart, anchorEnd };
}

// ─── Matcher ─────────────────────────────────────────────────────────────────

function matchOne(el, token, inv) {
    switch (el.type) {
        case 'literal':
            return el.exact ? token.full === el.full : token.base === el.base;
        case 'class':
            return classify(token, inv) === el.cls;
        case 'features':
            return checkFeatures(token, el.constraints);
        default:
            return false;
    }
}

/**
 * Glob-style match of a parsed pattern against a token array.
 * Unanchored sides get an implicit leading/trailing wildcard.
 */
export function matchTokenPattern(parsed, tokens, inv = EMPTY_INV) {
    const withAnchors = [];
    if (!parsed.anchorStart) withAnchors.push({ type: 'any' });
    withAnchors.push(...parsed.elements);
    if (!parsed.anchorEnd) withAnchors.push({ type: 'any' });

    // collapse adjacent wildcards
    const pat = [];
    for (const el of withAnchors) {
        if (el.type === 'any' && pat.length && pat[pat.length - 1].type === 'any') continue;
        pat.push(el);
    }

    // classic greedy glob match with backtracking
    let e = 0;
    let t = 0;
    let starE = -1;
    let starT = 0;
    while (t < tokens.length) {
        if (e < pat.length && pat[e].type === 'any') {
            starE = e++;
            starT = t;
        } else if (e < pat.length && matchOne(pat[e], tokens[t], inv)) {
            e++;
            t++;
        } else if (starE !== -1) {
            e = starE + 1;
            t = ++starT;
        } else {
            return false;
        }
    }
    while (e < pat.length && pat[e].type === 'any') e++;
    return e === pat.length;
}

// ─── Public entry point ──────────────────────────────────────────────────────

/**
 * Compiles a phoneme pattern once and returns an entry matcher.
 *
 *   const { match, error } = createPhonoMatcher('/#st', { consonants, vowels, otherPhonemes });
 *   lexicon.filter(match)
 *
 * Matches against entry.ipa when present, falling back to entry.word
 * (tokenized with the user's multigraphs). Tokenization is cached per
 * source string for the lifetime of the matcher.
 */
export function createPhonoMatcher(rawQuery, config = {}) {
    const inv = buildInventories(config);
    const parsed = parsePhonoQuery(rawQuery, inv);
    if (parsed.error) {
        return { match: () => false, error: parsed.error };
    }
    const cache = new Map();
    const match = (entry) => {
        if (!entry) return false;
        const ipa = entry.ipa && String(entry.ipa).trim();
        const src = ipa || (entry.word ? String(entry.word) : '');
        if (!src) return false;
        let tokens = cache.get(src);
        if (!tokens) {
            tokens = tokenizeIPA(src, inv);
            cache.set(src, tokens);
        }
        return matchTokenPattern(parsed, tokens, inv);
    };
    return { match, error: null };
}
