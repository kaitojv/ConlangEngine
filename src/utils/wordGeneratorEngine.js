// src/utils/wordGeneratorEngine.js
// Pure word generation, syllable pattern presets, smart grammar import, and complex regex rule helpers.
import { applyRuleToWord } from './morphologyEngine.js';

export const STANDARD_WORD_CLASSES = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'particle'];

export const COMMON_SYLLABLE_PATTERNS = [
    'CV', 'CVC', 'V', 'VC', '(C)V', '(C)V(C)', 'CCV', 'CVV', 'CCVC', 'CVCC'
];

export const COMPLEX_REGEX_PRESETS = [
    { id: 'hiatusRepair', name: 'Hiatus Repair (V+V)', rule: '(@V)(@V) => $1j$2', appliesTo: 'all' },
    { id: 'geminateCollapse', name: 'Collapse Geminates', rule: '(.)\\1 => $1', appliesTo: 'all' },
    { id: 'nasalAssimilation', name: 'Nasal Assimilation', rule: 'n(?=[pbm]) => m', appliesTo: 'all' },
    { id: 'palatalization', name: 'Palatalization (k > ch)', rule: 'k(?=[ie]) => ch', appliesTo: 'all' },
    { id: 'dropFinalVowel', name: 'Drop Final Vowel', rule: '(@C)@V$ => $1', appliesTo: 'all' },
    { id: 'intervocalicVoicing', name: 'Intervocalic Voicing', rule: '(?<=@V)t(?=@V) => d; (?<=@V)p(?=@V) => b; (?<=@V)k(?=@V) => g', appliesTo: 'all' },
];

export const parsePhonemeList = (str) => {
    if (!str || typeof str !== 'string') return [];
    return str
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(item => {
            const eqIdx = item.indexOf('=');
            if (eqIdx !== -1) {
                return {
                    ipa: item.slice(0, eqIdx).trim(),
                    orth: item.slice(eqIdx + 1).trim(),
                };
            }
            return { ipa: item, orth: item };
        })
        .filter(p => p.orth || p.ipa);
};

export const parsePatternTokens = (syllablePattern) => {
    if (!syllablePattern || typeof syllablePattern !== 'string') return [];
    const tokens = syllablePattern
        .toUpperCase()
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    return [...new Set(tokens)];
};

export const getCommonPatterns = (otherPhonemeMapping = '') => {
    const cleanMap = (otherPhonemeMapping || '').trim().toUpperCase();
    const list = [...COMMON_SYLLABLE_PATTERNS];
    if (cleanMap && cleanMap.length === 1 && !['C', 'V'].includes(cleanMap)) {
        list.push(`CV${cleanMap}`, `(C)V${cleanMap}`);
    }
    return list;
};

export const getSyllablePresetBundles = (otherPhonemeMapping = '') => {
    const cleanMap = (otherPhonemeMapping || '').trim().toUpperCase();
    const mapChar = (cleanMap && cleanMap.length === 1 && !['C', 'V'].includes(cleanMap)) ? cleanMap : 'X';
    return [
        { id: 'open', patterns: 'CV, V' },
        { id: 'balanced', patterns: 'CV, CVC, V, VC' },
        { id: 'flexible', patterns: '(C)V, (C)V(C)' },
        { id: 'complex', patterns: 'CV, CVC, CCV, CCVC, VC' },
        { id: 'otherCoda', patterns: `CV, V, CV${mapChar}` },
    ];
};

export const getAvailableWordClasses = (customWordClasses = [], generatorMarkers = {}) => {
    const merged = [...STANDARD_WORD_CLASSES];
    const seen = new Set(merged);
    const pushUnique = (cls) => {
        const clean = (cls || '').trim().toLowerCase();
        if (clean && !seen.has(clean)) {
            seen.add(clean);
            merged.push(clean);
        }
    };
    if (Array.isArray(customWordClasses)) customWordClasses.forEach(pushUnique);
    if (generatorMarkers && typeof generatorMarkers === 'object') Object.keys(generatorMarkers).forEach(pushUnique);
    return merged;
};

const CLASS_NAME_ALIASES = {
    noun: ['noun', 'noun marker', 'nominal', 'nominalizer', 'n.'],
    verb: ['verb', 'verb marker', 'infinitive', 'verbalizer', 'v.'],
    adjective: ['adjective', 'adjective marker', 'adj', 'adj.', 'adjectival', 'adjectivizer'],
    adverb: ['adverb', 'adverb marker', 'adv', 'adv.', 'adverbial', 'adverbializer'],
    pronoun: ['pronoun', 'pronoun marker', 'pron', 'pron.'],
    particle: ['particle', 'particle marker', 'part', 'part.'],
};

const CLASS_GLOSS_ALIASES = {
    noun: ['N', 'NOUN', 'NMLZ', 'NOM'],
    verb: ['V', 'VERB', 'INF', 'VBLZ'],
    adjective: ['ADJ', 'ADJV', 'ADJZ'],
    adverb: ['ADV', 'ADVZ'],
    pronoun: ['PRON', 'PRO'],
    particle: ['PART', 'PTCL'],
};

// Finds the best grammar rule matching a word class (exact name -> alias/gloss -> derivational targetPOS).
export const findBestGrammarRuleForClass = (cls, grammarRules = []) => {
    const normCls = (cls || '').trim().toLowerCase();
    if (!normCls || !Array.isArray(grammarRules) || grammarRules.length === 0) return null;

    const withAffix = grammarRules.filter(r => r && typeof r.affix === 'string' && r.affix.trim());
    if (withAffix.length === 0) return null;

    const exact = withAffix.find(r => {
        const name = (r.name || '').trim().toLowerCase();
        return name === normCls || name === `${normCls} marker`;
    });
    if (exact) return exact;

    const nameAliases = CLASS_NAME_ALIASES[normCls] || [normCls, `${normCls} marker`];
    const byNameAlias = withAffix.find(r => nameAliases.includes((r.name || '').trim().toLowerCase()));
    if (byNameAlias) return byNameAlias;

    const glossAliases = CLASS_GLOSS_ALIASES[normCls] || [normCls.toUpperCase()];
    const byGloss = withAffix.find(r => glossAliases.includes((r.gloss || '').trim().toUpperCase()));
    if (byGloss) return byGloss;

    const byTargetPOS = withAffix.find(r => {
        const target = (r.targetPOS || '').trim().toLowerCase();
        if (!target) return false;
        const targets = target.split(',').map(s => s.trim());
        return targets.includes(normCls) && (r.isDerivational || (r.appliesTo || 'all').toLowerCase() !== normCls);
    });
    return byTargetPOS || null;
};

export const importClassMarkersFromGrammar = ({
    grammarRules = [],
    verbMarker = '',
    currentMarkers = {},
    customWordClasses = [],
} = {}) => {
    const classes = getAvailableWordClasses(customWordClasses, currentMarkers);
    const markers = { ...currentMarkers };
    const updatedClasses = [];
    const sourceMap = {};

    classes.forEach(cls => {
        if (cls === 'verb') {
            const firstVerbMarker = verbMarker ? verbMarker.split(',')[0].trim() : '';
            if (firstVerbMarker) {
                markers.verb = firstVerbMarker;
                updatedClasses.push('verb');
                sourceMap.verb = 'verbMarker';
                return;
            }
        }
        const matchedRule = findBestGrammarRuleForClass(cls, grammarRules);
        if (matchedRule && matchedRule.affix.trim()) {
            markers[cls] = matchedRule.affix.trim();
            updatedClasses.push(cls);
            sourceMap[cls] = matchedRule.name || matchedRule.gloss || cls;
        }
    });

    return {
        markers,
        updatedClasses,
        updatedCount: updatedClasses.length,
        sourceMap,
    };
};

export const extractComplexGrammarRules = (grammarRules = [], existingGeneratorRules = []) => {
    if (!Array.isArray(grammarRules) || grammarRules.length === 0) {
        return { newRules: [], addedCount: 0 };
    }
    const existingSet = new Set(
        (existingGeneratorRules || []).map(r => (r.rule || '').trim())
    );
    const newRules = [];

    grammarRules.forEach((gr, idx) => {
        const affix = (gr?.affix || '').trim();
        if (!affix) return;
        const isComplex = affix.includes('=>') || /@[VCO]\b/.test(affix);
        if (!isComplex || existingSet.has(affix)) return;

        existingSet.add(affix);
        newRules.push({
            id: `gen_gr_${gr.id || idx}_${Date.now()}_${newRules.length}`,
            name: gr.name || gr.gloss || `Rule ${idx + 1}`,
            rule: affix,
            appliesTo: gr.appliesTo || 'all',
            enabled: true,
        });
    });

    return { newRules, addedCount: newRules.length };
};

const pickWeighted = (items, weights) => {
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)];
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r <= 0) return items[i];
    }
    return items[items.length - 1];
};

const getHarmonyEligibleVowels = (vogsList, vowelHarmonySets = []) => {
    if (!Array.isArray(vowelHarmonySets) || vowelHarmonySets.length === 0 || vogsList.length === 0) {
        return { vowels: vogsList, setName: '' };
    }
    const normalized = vowelHarmonySets
        .map((s, i) => Array.isArray(s)
            ? { name: `Set ${i + 1}`, vowels: s, neutral: false }
            : (s && Array.isArray(s.vowels) ? { name: s.name || `Set ${i + 1}`, vowels: s.vowels, neutral: !!s.neutral } : null))
        .filter(s => s && s.vowels.length > 0);

    if (normalized.length === 0) return { vowels: vogsList, setName: '' };

    const nonNeutral = normalized.filter(s => !s.neutral);
    const pool = nonNeutral.length > 0 ? nonNeutral : normalized;
    const chosenSet = pool[Math.floor(Math.random() * pool.length)];

    const neutralTokens = new Set();
    normalized.filter(s => s.neutral).forEach(s => s.vowels.forEach(v => neutralTokens.add(v.toLowerCase())));
    chosenSet.vowels.forEach(v => neutralTokens.add(v.toLowerCase()));

    const filtered = vogsList.filter(v =>
        neutralTokens.has((v.orth || '').toLowerCase()) || neutralTokens.has((v.ipa || '').toLowerCase())
    );
    if (filtered.length === 0) return { vowels: vogsList, setName: '' };
    return { vowels: filtered, setName: chosenSet.name };
};

const resolveSingleWord = (config, options = {}) => {
    const {
        phonologyTypes = 'alphabetic',
        syllabaryMap = {},
        consonants = '',
        vowels = '',
        otherPhonemes = '',
        otherPhonemeMapping = 'X',
        syllablePattern = '',
        syllablePatternWeights = {},
        verbMarker = '',
        generatorMarkers = {},
        generatorRegexRules = [],
        grammarRules = [],
        vowelHarmonySets = [],
        customWordClasses = [],
    } = config;

    const {
        lengths = [2],
        targetClass = 'random',
        respectVowelHarmony = false,
    } = options;

    const validLengths = Array.isArray(lengths) && lengths.length > 0 ? lengths : [2];
    const numSyllables = validLengths[Math.floor(Math.random() * validLengths.length)];

    const classPool = getAvailableWordClasses(customWordClasses, generatorMarkers).filter(c => c !== 'particle' && c !== 'pronoun');
    const fallbackClasses = classPool.length > 0 ? classPool : ['noun', 'verb', 'adjective'];
    const classFinal = (targetClass && targetClass !== 'random')
        ? targetClass
        : fallbackClasses[Math.floor(Math.random() * fallbackClasses.length)];

    let orthResult = '';
    let ipaResult = '';
    let harmonySetName = '';

    if (phonologyTypes === 'syllabic') {
        const validSyllables = Object.keys(syllabaryMap || {});
        if (validSyllables.length === 0) {
            return { error: 'empty_syllabary' };
        }
        for (let i = 0; i < numSyllables; i++) {
            const s = validSyllables[Math.floor(Math.random() * validSyllables.length)];
            orthResult += s;
            ipaResult += s;
        }
    } else {
        const consList = parsePhonemeList(consonants);
        const vogsList = parsePhonemeList(vowels);
        const otherList = parsePhonemeList(otherPhonemes);
        const otherChar = ((otherPhonemeMapping || 'X').trim().toUpperCase())[0] || 'X';

        const pads = parsePatternTokens(syllablePattern);
        if (pads.length === 0 || consList.length === 0 || vogsList.length === 0) {
            return { error: 'missing_phonology' };
        }

        const patternWeights = pads.map(p => {
            const w = syllablePatternWeights[p] ?? syllablePatternWeights[p.toLowerCase()];
            return (w !== undefined && w >= 0) ? w : 1;
        });

        let activeVowels = vogsList;
        if (respectVowelHarmony) {
            const harmony = getHarmonyEligibleVowels(vogsList, vowelHarmonySets);
            activeVowels = harmony.vowels;
            harmonySetName = harmony.setName;
        }

        let currentVCount = 0;
        let safetyCount = 0;

        while (currentVCount < numSyllables && safetyCount < 100) {
            safetyCount++;
            const padraoStr = pickWeighted(pads, patternWeights);

            let resolvedPattern = '';
            for (let k = 0; k < padraoStr.length; k++) {
                if (padraoStr[k] === '(') {
                    const end = padraoStr.indexOf(')', k);
                    if (end !== -1) {
                        const optionalPart = padraoStr.slice(k + 1, end);
                        if (Math.random() > 0.5) resolvedPattern += optionalPart;
                        k = end;
                    }
                } else if (padraoStr[k] === 'C' || padraoStr[k] === 'V' || (otherList.length > 0 && padraoStr[k] === otherChar)) {
                    resolvedPattern += padraoStr[k];
                }
            }

            // Guarantee progress if every pattern selected yielded 0 vowels after many iterations
            if (safetyCount > 40 && !resolvedPattern.includes('V')) {
                resolvedPattern += 'V';
            }

            for (let j = 0; j < resolvedPattern.length; j++) {
                const sym = resolvedPattern[j];
                if (currentVCount >= numSyllables && sym === 'V') break;

                if (sym === 'C') {
                    const c = consList[Math.floor(Math.random() * consList.length)];
                    orthResult += c.orth;
                    ipaResult += c.ipa;
                } else if (sym === 'V') {
                    const v = activeVowels[Math.floor(Math.random() * activeVowels.length)];
                    orthResult += v.orth;
                    ipaResult += v.ipa;
                    currentVCount++;
                } else if (otherList.length > 0 && sym === otherChar) {
                    const o = otherList[Math.floor(Math.random() * otherList.length)];
                    orthResult += o.orth;
                    ipaResult += o.ipa;
                }
            }
        }
    }

    const stemOrth = orthResult;

    // Apply class marker (supports standard affixes, @V/@C infixes, and => complex regex rules)
    const markerForClass = generatorMarkers[classFinal];
    const resolvedMarker = (markerForClass !== undefined && markerForClass !== '')
        ? markerForClass
        : (classFinal === 'verb' ? verbMarker : '');

    if (resolvedMarker) {
        const primaryRule = resolvedMarker.includes('=>')
            ? resolvedMarker.trim()
            : resolvedMarker.split(',')[0].trim();

        if (primaryRule.includes('=>') || primaryRule.includes('@')) {
            const ruleObj = { affix: primaryRule, condition: 'always' };
            const transformedOrth = applyRuleToWord(orthResult, ruleObj, grammarRules, vowels, consonants, otherPhonemes);
            if (transformedOrth) orthResult = transformedOrth;
            const transformedIpa = applyRuleToWord(ipaResult, ruleObj, grammarRules, vowels, consonants, otherPhonemes);
            if (transformedIpa) ipaResult = transformedIpa;
        } else if (primaryRule) {
            let cleanMarker = primaryRule;
            if (cleanMarker.endsWith('-')) {
                cleanMarker = cleanMarker.slice(0, -1);
                if (cleanMarker && !orthResult.startsWith(cleanMarker)) {
                    orthResult = cleanMarker + orthResult;
                    ipaResult = cleanMarker + ipaResult;
                }
            } else {
                cleanMarker = cleanMarker.replace(/^-/, '');
                if (cleanMarker && !orthResult.endsWith(cleanMarker)) {
                    orthResult += cleanMarker;
                    ipaResult += cleanMarker;
                }
            }
        }
    }

    // Apply enabled post-generation complex regex rules matching all or classFinal
    if (Array.isArray(generatorRegexRules) && generatorRegexRules.length > 0) {
        for (const r of generatorRegexRules) {
            if (!r || r.enabled === false || !r.rule || !r.rule.trim()) continue;
            const applies = (r.appliesTo || 'all')
                .toLowerCase()
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            if (!applies.includes('all') && !applies.includes(classFinal.toLowerCase())) continue;

            const ruleObj = { affix: r.rule.trim(), condition: 'always' };
            const nextOrth = applyRuleToWord(orthResult, ruleObj, grammarRules, vowels, consonants, otherPhonemes);
            if (nextOrth) orthResult = nextOrth;
            const nextIpa = applyRuleToWord(ipaResult, ruleObj, grammarRules, vowels, consonants, otherPhonemes);
            if (nextIpa) ipaResult = nextIpa;
        }
    }

    return {
        word: orthResult,
        ipa: ipaResult,
        wordClass: classFinal,
        stem: stemOrth,
        harmonySetName,
    };
};

export const generateWordFromConfig = (config, options = {}) => {
    const {
        avoidDuplicates = false,
        existingWords = null,
        maxAttempts = 25,
    } = options;

    const hasDupCheck = Boolean(avoidDuplicates && existingWords && existingWords.size > 0);
    const attempts = hasDupCheck ? Math.max(1, maxAttempts) : 1;

    let lastResult = null;
    for (let i = 0; i < attempts; i++) {
        const res = resolveSingleWord(config, options);
        if (!res || res.error) return res;
        lastResult = res;
        if (!hasDupCheck || !existingWords.has((res.word || '').toLowerCase())) {
            return { ...res, duplicateAvoided: i > 0 };
        }
    }

    return lastResult ? { ...lastResult, duplicateAvoided: false } : null;
};

