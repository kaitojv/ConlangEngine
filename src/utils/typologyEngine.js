// src/utils/typologyEngine.js
//
// Naturalness / Typology scoring engine.
//
// Evaluates a conlang's configuration against well-documented cross-linguistic
// tendencies (the kind catalogued by WALS — the World Atlas of Language
// Structures) and Greenbergian implicational universals. The goal is EDUCATIONAL:
// we surface where a language sits relative to the world's natural languages and
// flag statistically unusual combinations — never to say a conlang is "wrong".
// A gloriously alien language is a valid design goal; this report just tells you
// how far from the beaten path you've wandered, and why.
//
// The engine is a pure function of (config, lexicon) so it can be unit-reasoned
// about and reused (report page, health check, exports) without side effects.

import { IPA_INFO } from './ipaData.js';

// ── Observation status levels ────────────────────────────────────────────────
// natural  — matches the common cross-linguistic pattern (unmarked)
// marked   — a rarer-but-fully-attested feature (clicks, vigesimal, VSO…). Not
//            penalized: real languages do this. Flagged for awareness/flavor.
// notable  — a mild statistical oddity or a weak-tendency mismatch worth noting
// unusual  — violates a strong implicational universal / is cross-linguistically
//            rare enough that few or no natural languages do it
// info     — neutral context, no naturalness judgement
export const STATUS = {
    natural: { rank: 0, penalty: 0,  color: 'var(--ok)',   label: 'Natural' },
    marked:  { rank: 1, penalty: 0,  color: 'var(--acc)',  label: 'Marked but attested' },
    notable: { rank: 2, penalty: 3,  color: 'var(--warn)', label: 'Notable' },
    unusual: { rank: 3, penalty: 9,  color: 'var(--err)',  label: 'Unusual' },
    info:    { rank: 0, penalty: 0,  color: 'var(--tx2)',  label: 'Info' },
};

// ── Phoneme helpers ──────────────────────────────────────────────────────────

/** Split a comma / whitespace separated inventory string into clean symbols. */
export function parsePhonemes(str) {
    if (!str || typeof str !== 'string') return [];
    return str
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
}

/**
 * Look up IPA metadata for a symbol, tolerating diacritics/modifiers that the
 * base chart doesn't index (aspiration, length, labialization, tie bars…).
 */
export function lookupPhoneme(symbol) {
    if (!symbol) return null;
    if (IPA_INFO[symbol]) return IPA_INFO[symbol];
    // Strip combining marks and common modifier letters, then retry on the base.
    const base = symbol
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')      // combining diacritics
        .replace(/[ʰʷʲˠˤːˑˀ˞]/g, '')            // spacing modifier letters
        .replace(/[͜͡]/g, '');       // tie bars (affricates)
    if (base && IPA_INFO[base]) return IPA_INFO[base];
    return null;
}

// Symbol groups for marked / non-pulmonic detection.
const CLICK_SYMBOLS = ['ʘ', 'ǀ', 'ǃ', 'ǂ', 'ǁ'];
const IMPLOSIVE_SYMBOLS = ['ɓ', 'ɗ', 'ʄ', 'ɠ', 'ʛ'];

// Voiceless→voiced plosive pairs used to test the voicing implicational universal.
const PLOSIVE_PAIRS = [
    ['p', 'b'], ['t', 'd'], ['k', 'g'],
    ['q', 'ɢ'], ['c', 'ɟ'], ['ʈ', 'ɖ'],
];

const CLOSE_VOWELS = ['i', 'y', 'ɨ', 'ʉ', 'ɯ', 'u', 'ɪ', 'ʏ', 'ʊ'];
const OPEN_VOWELS = ['a', 'ɶ', 'ɑ', 'ɒ', 'æ', 'ɐ'];
const FRONT_ROUNDED_VOWELS = ['y', 'ø', 'œ', 'ʏ', 'ɶ'];
const BACK_ROUNDED_VOWELS = ['u', 'o', 'ɔ', 'ʊ', 'ɒ', 'ɵ'];
const MID_VOWELS = ['e', 'ø', 'ɘ', 'ɵ', 'ɤ', 'o', 'ə', 'ɛ', 'œ', 'ɜ', 'ɞ', 'ʌ', 'ɔ'];

// ── Inventory classification (WALS bins) ─────────────────────────────────────

function classifyConsonantCount(n) {
    // WALS "Consonant Inventories" (Maddieson): the world mean is ~22.
    if (n === 0) return { key: 'empty', label: 'empty' };
    if (n < 15) return { key: 'small', label: 'small' };
    if (n <= 25) return { key: 'average', label: 'average' };
    if (n <= 33) return { key: 'large', label: 'large' };
    return { key: 'very-large', label: 'very large' };
}

function classifyVowelCount(n) {
    // WALS "Vowel Quality Inventories": small 2–4, average 5–6, large 7–14.
    if (n === 0) return { key: 'empty', label: 'empty' };
    if (n <= 4) return { key: 'small', label: 'small' };
    if (n <= 6) return { key: 'average', label: 'average' };
    return { key: 'large', label: 'large' };
}

// ── Syllable structure parsing ───────────────────────────────────────────────

/**
 * Inspect the syllable patterns (e.g. "CVC, CV, V, CCVC") and derive structural
 * facts: max onset/coda cluster length, whether open (CV) and onsetless (V…)
 * syllables are allowed, and an overall WALS-style complexity bucket.
 */
function analyzeSyllablePatterns(patternStr) {
    const patterns = parsePhonemes(patternStr).map(p => p.toUpperCase());
    let maxOnset = 0;
    let maxCoda = 0;
    let allowsOpen = false;      // ends in a vowel (no coda)
    let allowsOnsetless = false; // starts with a vowel (no onset)
    let hasNucleus = false;

    patterns.forEach(p => {
        const vIdx = p.indexOf('V');
        if (vIdx === -1) return; // not a real syllable template
        hasNucleus = true;
        // Onset = leading run of C before the first V.
        const onset = (p.slice(0, vIdx).match(/C/g) || []).length;
        // Coda = trailing run of C after the last V.
        const lastV = p.lastIndexOf('V');
        const coda = (p.slice(lastV + 1).match(/C/g) || []).length;
        maxOnset = Math.max(maxOnset, onset);
        maxCoda = Math.max(maxCoda, coda);
        if (coda === 0) allowsOpen = true;
        if (onset === 0) allowsOnsetless = true;
    });

    let complexity;
    if (!hasNucleus) complexity = 'none';
    else if (maxOnset <= 1 && maxCoda === 0) complexity = 'simple';          // (C)V
    else if (maxOnset <= 2 && maxCoda <= 1) complexity = 'moderate';         // (C)(C)VC
    else complexity = 'complex';                                             // bigger clusters

    return { patterns, maxOnset, maxCoda, allowsOpen, allowsOnsetless, hasNucleus, complexity };
}

// ── Word order data ──────────────────────────────────────────────────────────
// Frequencies from Dryer (WALS ch. 81), languages with a dominant order.
const WORD_ORDER_INFO = {
    SOV: { freq: '~41%', kind: 'natural', note: 'the single most common basic word order (e.g. Japanese, Turkish, Hindi).' },
    SVO: { freq: '~35%', kind: 'natural', note: 'the second most common order (e.g. English, Mandarin, Swahili).' },
    VSO: { freq: '~7%',  kind: 'marked',  note: 'verb-initial; attested in e.g. Irish, Classical Arabic, Tagalog.' },
    VOS: { freq: '~2%',  kind: 'marked',  note: 'rare but attested (e.g. Malagasy, Fijian).' },
    OVS: { freq: '~1%',  kind: 'notable', note: 'object-initial; genuinely rare (e.g. Hixkaryana).' },
    OSV: { freq: '<1%',  kind: 'notable', note: 'the rarest attested order, found in only a handful of languages (e.g. Warao).' },
    OVA: { freq: 'n/a',  kind: 'notable', note: 'a non-standard template (adverb, not a core argument); no natural language uses this as its basic clause order.' },
};

// ── Main analysis ────────────────────────────────────────────────────────────

/**
 * Analyze a conlang config for naturalness. Purely structural — it reads the
 * phonology, syllable, grammar, numeral and suprasegmental settings.
 * @returns {{ naturalnessScore:number, grade:{label,color,blurb}, summary:object,
 *            inventory:object, observations:Array }}
 */
export function analyzeTypology(config = {}) {
    const observations = [];
    const add = (category, status, title, detail, universal) =>
        observations.push({
            id: `${category}-${observations.length}`,
            category, status, title, detail, universal: universal || null,
        });

    // --- Parse inventories ---
    const consonants = parsePhonemes(config.consonants);
    const vowels = parsePhonemes(config.vowels);
    const cset = new Set(consonants);
    const vset = new Set(vowels);
    const cInfo = consonants.map(lookupPhoneme).filter(Boolean);

    const consonantCount = consonants.length;
    const vowelCount = vowels.length;
    const cClass = classifyConsonantCount(consonantCount);
    const vClass = classifyVowelCount(vowelCount);
    const ratio = vowelCount > 0 ? consonantCount / vowelCount : 0;

    // ── PHONOLOGY: inventory size ────────────────────────────────────────────
    if (consonantCount === 0) {
        add('Phonology', 'info',
            'No consonants defined yet',
            'Add a consonant inventory in Settings → Phonology to unlock phonological analysis.');
    } else if (cClass.key === 'small') {
        add('Phonology', 'notable',
            `Small consonant inventory (${consonantCount})`,
            `You have ${consonantCount} consonants. Small inventories are perfectly natural — Hawaiian famously has just 8 — but the world average is around 22.`,
            'WALS: consonant inventories range from 6 to 122; the cross-linguistic mean is ~22.');
    } else if (cClass.key === 'very-large') {
        add('Phonology', 'marked',
            `Very large consonant inventory (${consonantCount})`,
            `${consonantCount} consonants places you among the world's largest systems (think Caucasian or Khoisan languages). Rich, but demanding for learners.`,
            'WALS: only a small minority of languages exceed 34 consonants.');
    } else {
        add('Phonology', 'natural',
            `Healthy consonant inventory (${consonantCount})`,
            `${consonantCount} consonants sits comfortably within the typical ${cClass.label} range for natural languages.`,
            'WALS: the cross-linguistic mean is ~22 consonants.');
    }

    if (vowelCount === 0) {
        add('Phonology', 'info',
            'No vowels defined yet',
            'Add a vowel inventory in Settings → Phonology to unlock vowel-system analysis.');
    } else if (vClass.key === 'small') {
        add('Phonology', 'notable',
            `Small vowel inventory (${vowelCount})`,
            `${vowelCount} vowel qualities is a small system. Attested (e.g. some Northwest Caucasian languages arguably have 2–3), but most languages have more.`,
            'WALS: the most common vowel-inventory size is 5.');
    } else if (vClass.key === 'large') {
        add('Phonology', 'marked',
            `Large vowel inventory (${vowelCount})`,
            `${vowelCount} vowel qualities is a rich system (e.g. English, Germanic languages). Fully naturalistic, just on the larger side.`,
            'WALS: large systems have 7–14 vowel qualities.');
    } else {
        add('Phonology', 'natural',
            `Balanced vowel inventory (${vowelCount})`,
            `${vowelCount} vowels is right in the sweet spot — the most common vowel-system size worldwide is 5.`,
            'WALS: 5-vowel systems (/i e a o u/) are the global favourite.');
    }

    // ── PHONOLOGY: consonant-to-vowel ratio ──────────────────────────────────
    if (consonantCount > 0 && vowelCount > 0) {
        const r = ratio.toFixed(1);
        if (ratio < 2) {
            add('Phonology', 'notable',
                `Low consonant-to-vowel ratio (${r}:1)`,
                `Your language leans vowel-heavy. Most languages have noticeably more consonants than vowels.`,
                'The cross-linguistic average C:V ratio is roughly 4:1.');
        } else if (ratio > 7) {
            add('Phonology', 'notable',
                `High consonant-to-vowel ratio (${r}:1)`,
                `A very consonant-heavy profile. Attested in e.g. Caucasian languages, but above the typical range.`,
                'The cross-linguistic average C:V ratio is roughly 4:1.');
        } else {
            add('Phonology', 'natural',
                `Typical consonant-to-vowel ratio (${r}:1)`,
                `Your consonant-to-vowel balance matches the usual cross-linguistic proportion.`,
                'The cross-linguistic average C:V ratio is roughly 4:1.');
        }
    }

    // ── PHONOLOGY: nasals (near-universal) ───────────────────────────────────
    if (consonantCount > 0) {
        const nasals = cInfo.filter(p => p.manner === 'Nasal');
        if (nasals.length === 0) {
            add('Phonology', 'unusual',
                'No nasal consonants',
                'Your inventory has no nasals (/m/, /n/, /ŋ/…). Languages without any nasal are exceedingly rare — a handful on the planet.',
                'Roughly 96% of languages have at least one nasal consonant.');
        } else if (!cset.has('n')) {
            add('Phonology', 'notable',
                'Missing /n/',
                'You have nasals but not the alveolar /n/ — the single most common consonant in the world. Unusual, though not impossible.',
                '/n/ and /m/ are the two most widespread consonants cross-linguistically.');
        } else {
            add('Phonology', 'natural',
                'Nasal consonants present',
                'Your inventory includes nasal consonants, as virtually every natural language does.',
                'Roughly 96% of languages have at least one nasal.');
        }
    }

    // ── PHONOLOGY: plosives + voicing implicational universal ────────────────
    if (consonantCount > 0) {
        const plosives = cInfo.filter(p => p.manner === 'Plosive');
        if (plosives.length === 0) {
            add('Phonology', 'unusual',
                'No plosive/stop consonants',
                'There are no plosives (/p t k/ …) in your inventory. Every known natural language has at least some stops.',
                'Oral stops are considered a true phonological universal.');
        }

        // Voiced-without-voiceless is typologically marked (voiceless is less marked).
        PLOSIVE_PAIRS.forEach(([voiceless, voiced]) => {
            if (cset.has(voiced) && !cset.has(voiceless)) {
                add('Phonology', 'unusual',
                    `Voiced /${voiced}/ without voiceless /${voiceless}/`,
                    `Having /${voiced}/ but not its voiceless counterpart /${voiceless}/ inverts the usual markedness relationship — most languages that have the voiced stop also have the voiceless one.`,
                    'Implicational universal: the presence of a voiced plosive generally implies its voiceless counterpart.');
            }
        });

        // The /g/ gap is the WELL-KNOWN natural exception — reassure the user.
        if (cset.has('k') && !cset.has('g') && cset.has('b') && cset.has('d')) {
            add('Phonology', 'natural',
                'Voiced series with a /g/ gap',
                'You have /b/ and /d/ but no /g/. Far from an error, this is the most common gap in voiced-stop systems — /g/ is aerodynamically the hardest voiced stop to sustain.',
                '/g/ is the most frequently absent member of a voiced plosive series.');
        }
    }

    // ── PHONOLOGY: fricatives ────────────────────────────────────────────────
    if (consonantCount > 0) {
        const fricatives = cInfo.filter(p => p.manner === 'Fricative' || p.manner === 'Lateral Fricative');
        if (fricatives.length === 0) {
            add('Phonology', 'marked',
                'No fricatives',
                'Your language has no fricatives (/s/, /f/, /h/ …). This is attested — several Australian languages lack them — but uncommon.',
                'About 8% of languages have no fricatives at all.');
        } else if (!cset.has('s') && cClass.key !== 'small') {
            add('Phonology', 'notable',
                'Fricatives present, but no /s/',
                'You have fricatives but not /s/, the most common fricative worldwide. A mid-to-large inventory usually includes it.',
                '/s/ is the most frequent fricative cross-linguistically.');
        }
    }

    // ── PHONOLOGY: marked / non-pulmonic consonant types ─────────────────────
    if (consonantCount > 0) {
        const hasClicks = consonants.some(c => CLICK_SYMBOLS.includes(c));
        const hasEjectives = consonants.some(c => c.includes('ʼ') || c.includes("'"));
        const hasImplosives = consonants.some(c => IMPLOSIVE_SYMBOLS.includes(c));
        const exotic = [];
        if (hasClicks) exotic.push('clicks');
        if (hasEjectives) exotic.push('ejectives');
        if (hasImplosives) exotic.push('implosives');
        if (exotic.length) {
            add('Phonology', 'marked',
                `Contains ${exotic.join(', ')}`,
                `Your inventory uses ${exotic.join(', ')} — striking, regionally-clustered sounds. Perfectly naturalistic where they occur, but globally rare, so they give a strong "areal" flavour.`,
                'Clicks appear in <2% of languages (mostly southern Africa); ejectives and implosives are also areally concentrated.');
        }
    }

    // ── PHONOLOGY: vowel-system universals ───────────────────────────────────
    if (vowelCount > 0) {
        const hasClose = vowels.some(v => CLOSE_VOWELS.includes(v));
        const hasOpen = vowels.some(v => OPEN_VOWELS.includes(v));
        const hasMid = vowels.some(v => MID_VOWELS.includes(v));
        const hasFrontRounded = vowels.some(v => FRONT_ROUNDED_VOWELS.includes(v));
        const hasBackRounded = vowels.some(v => BACK_ROUNDED_VOWELS.includes(v));

        // Classic 5-vowel system.
        const isCanonical5 = vowelCount === 5 &&
            ['i', 'e', 'a', 'o', 'u'].every(v => vset.has(v));
        if (isCanonical5) {
            add('Phonology', 'natural',
                'Canonical 5-vowel system /i e a o u/',
                'You use the /i e a o u/ system — the single most common vowel inventory on Earth. Maximally learnable and natural.',
                'WALS: the 5-vowel /i e a o u/ system is the world\'s most frequent.');
        }

        // Front rounded implies back rounded.
        if (hasFrontRounded && !hasBackRounded) {
            add('Phonology', 'unusual',
                'Front rounded vowels without back rounded vowels',
                'You have front rounded vowels (like /y/ or /ø/) but no back rounded vowels (/u/, /o/…). This violates a strong universal — front rounded vowels almost always presuppose back rounded ones.',
                'Implicational universal: front rounded vowels imply the presence of back rounded vowels.');
        }

        // Mid vowels imply both a high and a low vowel.
        if (hasMid && (!hasClose || !hasOpen)) {
            const missing = !hasClose ? 'high/close' : 'low/open';
            add('Phonology', 'unusual',
                `Mid vowels without ${missing} vowels`,
                `Your system has mid vowels but lacks ${missing} vowels. Vowel space usually fills the extremes (high and low) before the middle.`,
                'Implicational tendency: the presence of mid vowels implies both high and low vowels.');
        }
    }

    // ── SYLLABLE STRUCTURE ───────────────────────────────────────────────────
    const syl = analyzeSyllablePatterns(config.syllablePattern);
    if (syl.hasNucleus) {
        if (syl.complexity === 'simple') {
            add('Syllable Structure', 'natural',
                'Simple (C)V syllable structure',
                'Open, cluster-free syllables are the most cross-linguistically common and the least marked — every language permits CV.',
                'WALS: simple syllable structure is one of the most widespread types.');
        } else if (syl.complexity === 'moderate') {
            add('Syllable Structure', 'natural',
                'Moderately complex syllables',
                `Allowing codas and small onset clusters (max onset ${syl.maxOnset}, max coda ${syl.maxCoda}) is the single most common syllable-complexity type.`,
                'WALS: "moderately complex" is the most frequent syllable-structure category.');
        } else {
            add('Syllable Structure', 'marked',
                'Complex consonant clusters',
                `Large clusters (max onset ${syl.maxOnset}, max coda ${syl.maxCoda}) are attested (English "strengths", Georgian) but sit among the more marked syllable types and are harder to pronounce.`,
                'WALS: complex syllable structure is the least common of the three complexity types.');
        }
        if (!syl.allowsOpen && syl.hasNucleus) {
            add('Syllable Structure', 'notable',
                'No open syllables permitted',
                'Every one of your syllable templates ends in a consonant. Most languages allow at least some open (vowel-final) syllables.',
                'Open syllables (CV) are permitted in essentially every natural language.');
        }
    } else if (config.syllablePattern) {
        add('Syllable Structure', 'info',
            'Syllable patterns need a vowel slot',
            'None of your syllable templates contain a "V" nucleus. Add patterns like CV or CVC in Settings → Phonology.');
    }

    // ── WORD ORDER (Greenbergian) ────────────────────────────────────────────
    const order = (config.syntaxOrder || '').toUpperCase();
    const orderInfo = WORD_ORDER_INFO[order];
    if (orderInfo) {
        add('Word Order', orderInfo.kind,
            `Basic word order: ${order}`,
            `${order} is ${orderInfo.note}`,
            orderInfo.freq === 'n/a'
                ? 'The six basic orders (by subject/verb/object) are what typology measures; adverb-based templates fall outside that.'
                : `WALS: ${order} accounts for ${orderInfo.freq} of languages with a dominant order.`);

        // Adjective–noun order tendency (weak, but worth a gentle note).
        const isVerbObject = ['SVO', 'VSO', 'VOS'].includes(order); // VO languages
        const adjPlacement = config.adjectivePlacement || 'pre-nominal';
        const isPreNominal = adjPlacement === 'pre-nominal';
        // Tendency: VO → N-Adj (post-nominal); OV → Adj-N (pre-nominal).
        const aligned = (isVerbObject && !isPreNominal) || (!isVerbObject && isPreNominal);
        if (aligned) {
            add('Word Order', 'natural',
                'Adjective order fits the word-order tendency',
                `Your ${isVerbObject ? 'VO' : 'OV'} order pairs with ${isPreNominal ? 'pre-nominal' : 'post-nominal'} adjectives, matching the common harmonic pattern.`,
                'Greenbergian harmony: VO languages tend toward Noun–Adjective, OV toward Adjective–Noun.');
        } else {
            add('Word Order', 'notable',
                'Adjective order runs against the usual tendency',
                `Your ${isVerbObject ? 'VO' : 'OV'} order with ${isPreNominal ? 'pre-nominal' : 'post-nominal'} adjectives goes against the typical harmony — though this is only a tendency (English is VO yet pre-nominal!), so it is far from unnatural.`,
                'Greenbergian harmony is a statistical tendency, not an absolute rule.');
        }
    }

    // ── MORPHOLOGY ───────────────────────────────────────────────────────────
    const morph = config.morphologyMode;
    const MORPH_INFO = {
        isolating: { status: 'natural', note: 'Isolating morphology (few or no affixes, e.g. Mandarin, Vietnamese) is common and simple to learn.' },
        agglutinative: { status: 'natural', note: 'Agglutinative morphology (clear, stackable affixes, e.g. Turkish, Japanese, Swahili) is extremely widespread.' },
        fusional: { status: 'natural', note: 'Fusional morphology (affixes bundling several meanings, e.g. Latin, Russian) is very common.' },
        polysynthetic: { status: 'marked', note: 'Polysynthetic morphology (many roots/affixes per word, e.g. Inuktitut, Mohawk) is naturalistic but the rarest of the four broad types.' },
    };
    if (morph && MORPH_INFO[morph]) {
        add('Morphology', MORPH_INFO[morph].status,
            `${morph.charAt(0).toUpperCase() + morph.slice(1)} morphology`,
            MORPH_INFO[morph].note,
            morph === 'polysynthetic'
                ? 'Polysynthesis is areally concentrated and comparatively rare worldwide.'
                : 'All three of isolating, agglutinative and fusional are richly attested.');
    }

    // Vowel harmony correlates strongly with agglutination.
    const harmonySets = Array.isArray(config.vowelHarmonySets) ? config.vowelHarmonySets : [];
    if (harmonySets.length > 0) {
        if (morph === 'isolating') {
            add('Morphology', 'notable',
                'Vowel harmony with isolating morphology',
                'Vowel harmony operates across affixes, so it overwhelmingly appears in agglutinative languages. Pairing it with isolating morphology (which has few affixes) leaves little for the harmony to act on.',
                'Vowel harmony is strongly associated with agglutinative morphology (Turkic, Uralic, Mongolic).');
        } else {
            add('Morphology', 'natural',
                'Vowel harmony present',
                'Vowel harmony is a naturalistic and elegant feature, especially alongside your affix-rich morphology.',
                'Vowel harmony is common in agglutinative families such as Turkic and Uralic.');
        }
    }

    // ── NUMERALS ─────────────────────────────────────────────────────────────
    const base = Number(config.numeralBase) || 10;
    if (base === 10) {
        add('Numerals', 'natural',
            'Base-10 (decimal) number system',
            'Decimal is the most widespread numeral base in the world — a safe, natural default rooted in ten fingers.',
            'WALS: decimal systems are by far the most common numeral base.');
    } else if (base === 20) {
        add('Numerals', 'marked',
            'Base-20 (vigesimal) number system',
            'Vigesimal counting is well attested (Maya, Basque, and vestigially in French "quatre-vingts"). Naturalistic and characterful.',
            'WALS: vigesimal is the main documented alternative to decimal.');
    } else if (base === 12) {
        add('Numerals', 'marked',
            'Base-12 (duodecimal) number system',
            'Duodecimal appears in a few natural systems and in cultural counting (dozens, clock hours). Uncommon as a full base but plausible.',
            'Pure base-12 counting systems are rare but attested in pockets.');
    } else {
        add('Numerals', 'marked',
            `Base-${base} number system`,
            `Base-${base} is an unusual choice. Natural languages do use non-decimal bases (5, 20, and mixed/body-part systems), so it is not impossible — just distinctive.`,
            'WALS: attested non-decimal bases cluster around 5 and 20; other pure bases are very rare.');
    }

    // ── SUPRASEGMENTALS: tone ────────────────────────────────────────────────
    const toneRules = Array.isArray(config.toneRules) ? config.toneRules : [];
    if (config.enableToneAndStress && toneRules.length > 0) {
        add('Suprasegmentals', 'natural',
            'Uses lexical tone',
            'Tone is a thoroughly naturalistic feature — nearly half of the world\'s languages use it, concentrated in Africa and East/Southeast Asia.',
            'WALS: a large share of languages (especially in Africa and SE Asia) are tonal.');
    }

    // ── Score & grade ────────────────────────────────────────────────────────
    const summary = { natural: 0, marked: 0, notable: 0, unusual: 0, info: 0 };
    let penalty = 0;
    observations.forEach(o => {
        summary[o.status] = (summary[o.status] || 0) + 1;
        penalty += STATUS[o.status]?.penalty || 0;
    });

    const naturalnessScore = Math.max(0, Math.min(100, 100 - penalty));
    const grade = getGrade(naturalnessScore);

    return {
        naturalnessScore,
        grade,
        summary,
        inventory: {
            consonantCount,
            vowelCount,
            ratio: Number(ratio.toFixed(2)),
            consonantClass: cClass.label,
            vowelClass: vClass.label,
            syllableComplexity: syl.complexity,
        },
        observations,
    };
}

export function getGrade(score) {
    if (score >= 90) return { label: 'Highly Naturalistic', color: 'var(--ok)', blurb: 'Your language reads like it could have evolved on Earth.' };
    if (score >= 75) return { label: 'Naturalistic', color: 'var(--acc)', blurb: 'Solidly plausible with a few characterful quirks.' };
    if (score >= 60) return { label: 'Plausible', color: 'var(--acc2)', blurb: 'Believable overall, with some marked or unusual choices.' };
    if (score >= 40) return { label: 'Experimental', color: 'var(--warn)', blurb: 'Several features stray from cross-linguistic norms — intentional or not.' };
    return { label: 'Boldly Alien', color: 'var(--err)', blurb: 'Far from the beaten path. Perfect if you\'re building something otherworldly!' };
}
