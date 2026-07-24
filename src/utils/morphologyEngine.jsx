// src/utils/morphologyEngine.jsx

// Helper to parse complex affix strings like "-ma-@V" or "re-"
const parseAffix = (affixStr) => {
    if (!affixStr) return null;
    // Regex matches: [startHyphen] [morpheme] [endHyphen] @positionTag
    const match = affixStr.match(/^([-=])?([^-=@]+)([-=])?(?:@(\w+))?$/);
    if (!match) return { clean: affixStr.replace(/^-|-$/g, ''), type: 'unknown' };

    const [_, hasStart, morpheme, hasEnd, position] = match;
    let type = 'suffix'; // Default
    if (hasStart && hasEnd) type = 'infix';
    else if (hasEnd) type = 'prefix';
    else if (hasStart) type = 'suffix';

    return { clean: morpheme, type, position };
};

// Robustly strips an affix, handling orthography normalization and various quote styles
export const stripAffix = (word, affixRule, normalizeToBase) => {
    if (!affixRule || !word) return null;

    // Handle Regex mutation rules (e.g. "em$ => esh")
    if (affixRule.includes('=>')) {
        const [pattern, replacement] = affixRule.split('=>').map(s => s.trim());
        if (!replacement) return null; // Deletion rules are too ambiguous to reverse automatically

        // Heuristic: If the word ends with the replacement, swap it for the pattern (stripped of regex anchors)
        const cleanPattern = pattern.replace(/[\\^$]/g, '');
        const isPrefixStyle = pattern.startsWith('^');
        
        const normWord = normalizeToBase ? normalizeToBase(word.toLowerCase()) : word.toLowerCase();
        const normReplacement = normalizeToBase ? normalizeToBase(replacement.toLowerCase()) : replacement.toLowerCase();

        if (isPrefixStyle) {
            if (normWord.startsWith(normReplacement)) return cleanPattern + normWord.slice(normReplacement.length);
        } else {
            if (normWord.endsWith(normReplacement)) return normWord.slice(0, -normReplacement.length) + cleanPattern;
        }
        return null;
    }

    const parsed = parseAffix(affixRule);
    if (!parsed) return null;

    const { clean, type } = parsed;
    
    // Normalize both word and clean affix to ensure they use the same character styles (e.g. straight vs smart quotes)
    const normWord = normalizeToBase ? normalizeToBase(word.toLowerCase()) : word.toLowerCase();
    const normClean = normalizeToBase ? normalizeToBase(clean.toLowerCase()) : clean.toLowerCase();

    // Secondary normalization for common separators if they aren't in the orthography
    const cleanSep = (s) => s.replace(/[’‘]/g, "'");
    const finalWord = cleanSep(normWord);
    const finalClean = cleanSep(normClean);

    if (type === 'suffix') {
        if (finalWord.endsWith(finalClean)) return finalWord.slice(0, finalWord.length - finalClean.length);
    } else if (type === 'prefix') {
        if (finalWord.startsWith(finalClean)) return finalWord.slice(finalClean.length);
    } else if (type === 'infix') {
        const idx = finalWord.indexOf(finalClean);
        if (idx > 0 && idx < finalWord.length - finalClean.length) {
            return finalWord.slice(0, idx) + finalWord.slice(idx + finalClean.length);
        }
    }
    return null;
};

// Placeholder for applyRuleToWord - actual implementation would be more complex
export const applyRuleToWord = (baseWord, rule, grammarRules, vowels, consonants, otherPhonemes, _depth = 0) => {
    if (!baseWord || !rule || !rule.affix) return baseWord;
    if (_depth > 5) return baseWord; // Prevent infinite loops

    let currentBase = baseWord;
    
    // Resolve dependencies first
    if (rule.dependency) {
        const depNames = rule.dependency.split(',').map(d => d.trim().toLowerCase());
        for (const depName of depNames) {
            const depRule = grammarRules.find(r => (r.name || '').toLowerCase() === depName);
            if (depRule) {
                const depResult = applyRuleToWord(currentBase, depRule, grammarRules, vowels, consonants, otherPhonemes, _depth + 1);
                if (depResult != null) currentBase = depResult;
            }
        }
    }

    // 0. Enforce Allomorph Conditions (After Vowel / After Consonant / After Other)
    if (rule.condition && rule.condition !== 'always') {
        if (!currentBase) return null;
        const vowelList = vowels ? vowels.split(',').map(v => v.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        const consList = consonants ? consonants.split(',').map(c => c.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        const otherList = otherPhonemes ? otherPhonemes.split(',').map(o => o.trim().split('=')[0].toLowerCase()).filter(Boolean) : [];
        
        const parsed = parseAffix(rule.affix);
        const type = parsed ? parsed.type : 'suffix';
        const isAtStart = type === 'prefix';
        const wordLow = currentBase.toLowerCase();

        // Helper to check if any phoneme from a list matches at the edge
        const checkAtEdge = (list) => {
            const sorted = [...list].sort((a, b) => b.length - a.length);
            for (const p of sorted) {
                if (isAtStart ? wordLow.startsWith(p) : wordLow.endsWith(p)) return true;
            }
            return false;
        };

        const isVowel = checkAtEdge(vowelList);
        const isOther = checkAtEdge(otherList);
        const isCons = checkAtEdge(consList) || (!isVowel && !isOther);

        if (rule.condition === 'vowel' && !isVowel) return null;
        if (rule.condition === 'consonant' && !isCons) return null;
        if (rule.condition === 'other' && !isOther) return null;
    }

    // 1. Check for Regex replacement patterns (e.g. "n(?=[pb]) => m")
    if (rule.affix.includes('=>')) {
        const parts = rule.affix.split('=>');
        if (parts.length === 2) {
            const pattern = parts[0].trim();
            const replacement = parts[1].trim();
            try {
                const regex = new RegExp(pattern, 'gi');
                return currentBase.replace(regex, replacement);
            } catch (e) {
                console.error("Invalid Regex rule:", pattern);
                return currentBase;
            }
        }
    }

    const parsed = parseAffix(rule.affix);
    if (!parsed) return currentBase;

    const { clean, type, position } = parsed;

    if (type === 'suffix') {
        return currentBase + clean;
    } else if (type === 'prefix') {
        return clean + currentBase;
    } else if (type === 'infix') {
        // 1. Handle @V position (after first vowel)
        if (position === 'V' && vowels) {
            const vowelList = vowels.split(',').map(v => v.trim().split('=')[0].toLowerCase());
            for (let i = 0; i < currentBase.length; i++) {
                if (vowelList.includes(currentBase[i].toLowerCase())) {
                    return currentBase.slice(0, i + 1) + clean + currentBase.slice(i + 1);
                }
            }
        }
        
        // 2. Handle @C position (after first consonant)
        if (position === 'C') {
             const vowelList = vowels ? vowels.split(',').map(v => v.trim().split('=')[0].toLowerCase()) : [];
             for (let i = 0; i < currentBase.length; i++) {
                if (!vowelList.includes(currentBase[i].toLowerCase())) {
                    return currentBase.slice(0, i + 1) + clean + currentBase.slice(i + 1);
                }
            }
        }
        
        // Default: Insert in the absolute middle
        const middle = Math.floor(currentBase.length / 2);
        return currentBase.slice(0, middle) + clean + currentBase.slice(middle);
    }
    
    return currentBase;
};

// Simple helper for person agreement affixes
export const applyAffixToBase = (base, affix) => {
    if (!affix || !base) return base;
    if (affix.startsWith('-') && affix.endsWith('-')) {
        const middle = Math.floor(base.length / 2);
        return base.slice(0, middle) + affix.replace(/-/g, '') + base.slice(middle);
    }
    if (affix.startsWith('-')) return base + affix.slice(1);
    if (affix.endsWith('-')) return affix.slice(0, -1) + base;
    return base + affix; // Fallback to suffix
};

/**
 * Processes an array of person rule objects to add a 'name' property
 * in a consistent format (e.g., "1S", "2P.Masc").
 * This function is used by MatrixModal, AnalyzerTab, and GlosserTab.
 *
 * @param {Array<Object>} personRulesArray - An array of person rule objects from the config store.
 * @returns {Array<Object>} The processed array with 'name' properties.
 */
export const getPersonRules = (personRulesStr) => {
    let personRulesArray = personRulesStr;

    if (typeof personRulesStr === 'string' && personRulesStr.trim()) {
        personRulesArray = personRulesStr.split(/[\n,]/).map(line => {
            if (!line.includes(':')) return null;
            const parts = line.split(':');
            const pg = parts[0].trim();
            let person = null, number = 'S', gender = null, clusivity = null;
            
            if (pg.includes('1')) person = '1st';
            else if (pg.includes('2')) person = '2nd';
            else if (pg.includes('3')) person = '3rd';
            else if (pg.includes('4')) person = '4th';
            
            const upperPg = pg.toUpperCase();
            if (upperPg.includes('S')) number = 'S';
            if (upperPg.includes('P')) number = 'P';
            else if (upperPg.includes('C')) number = 'C';
            else if (upperPg.includes('D')) number = 'D';
            else if (upperPg.includes('B')) number = 'B';
            
            if (/masc/i.test(pg)) gender = 'Masc';
            else if (/fem/i.test(pg)) gender = 'Fem';
            else if (/neut/i.test(pg)) gender = 'Neut';
            else if (/anim/i.test(pg)) gender = 'Anim';
            else if (/inan/i.test(pg)) gender = 'Inan';

            if (/incl/i.test(pg)) clusivity = 'Incl';
            else if (/excl/i.test(pg)) clusivity = 'Excl';
            
            const fap = parts[1].trim().split('/');
            return { id: `pr-${pg}`, person, number, gender, clusivity, freeForm: fap[0]?.trim() || '', affix: fap[1]?.trim() || '', appliesTo: 'all' };
        }).filter(Boolean);
    }

    if (!Array.isArray(personRulesArray)) {
        return [];
    }

    return personRulesArray.map(rule => {
        const person = rule.person ? (rule.person.match(/^[1234]/) ? rule.person.charAt(0).toUpperCase() : rule.person) : '';
        const number = rule.number ? rule.number.toUpperCase() : '';
        const gender = rule.gender ? `.${rule.gender}` : '';
        const clusivity = rule.clusivity ? `.${rule.clusivity}` : '';
        const name = `${person}${number}${gender}${clusivity}`;

        return {
            ...rule,
            appliesTo: rule.appliesTo || 'all',
            name: name || (rule.id ? `Rule-${rule.id.substring(0, 4)}` : 'UnnamedRule')
        };
    });
};

export const findAllParsings = (surface, lexicon, config, normalizeToBase, depth = 0) => {
    if (depth > 3) return [];
    let parsings = [];
    const safeSurface = normalizeToBase(surface.toLowerCase());
    const lexiconArray = Array.isArray(lexicon) ? lexicon : (lexicon?.lexicon || []);

    // Exact match in dictionary
    lexiconArray.filter(e => normalizeToBase(e.word.replace(/\*/g, '').toLowerCase()) === safeSurface)
           .forEach(m => parsings.push({ root: m, rules: [] }));

    const personRules = getPersonRules(config.personRules);
    personRules.forEach(rule => { 
        const cleanAffix = rule.affix ? rule.affix.replace(/^-|-$/g, '').toLowerCase() : null;
        const normFree = rule.freeForm ? normalizeToBase(rule.freeForm.toLowerCase()) : null;
        const normAffix = cleanAffix ? normalizeToBase(cleanAffix) : null;

        const isFreeMatch = normFree && normFree === safeSurface;
        
        // Flexible match for affixes: allow matching even if apostrophes are "shared" or slightly different
        const isAffixMatch = normAffix && (
            normAffix === safeSurface || 
            normAffix.replace(/^['’‘]/, '') === safeSurface ||
            normAffix === safeSurface.replace(/^['’‘]/, '')
        );

        if (isFreeMatch || isAffixMatch) {
            parsings.push({
                root: { 
                    word: rule.freeForm || cleanAffix, 
                    wordClass: 'pronoun', 
                    translation: `Person (${rule.name})` 
                },
                rules: []
            });
        }
    });

    // Infinitive verbs
    if (config.verbMarker) {
        const markers = config.verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
        markers.forEach(marker => {
            lexiconArray.filter(e => {
                const isMatch = normalizeToBase(e.word.replace(/\*/g, '').toLowerCase()) === safeSurface + normalizeToBase(marker);
                if (!isMatch) return false;
                const classes = e.wordClass ? e.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
                return classes.includes('verb');
            }).forEach(m => parsings.push({ root: m, rules: [] }));
        });
    }

    // Recursive affix stripping
    let allRules = [...(config.grammarRules || []), ...personRules.filter(p => p.affix).map(p => ({ ...p, appliesTo: p.appliesTo || 'all' }))];
    allRules.forEach(rule => {
        if (!rule.affix) return;
        let stripped = stripAffix(safeSurface, rule.affix, normalizeToBase);
        if (stripped) {
            findAllParsings(stripped, lexicon, config, normalizeToBase, depth + 1).forEach(sp => {
                let applies = rule.appliesTo ? rule.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
                const rootClass = sp.root.wordClass?.toLowerCase();
                const canApplyToPerson = rule.applyToPersons && rootClass === 'pronoun';

                if (applies.includes('all') || rootClass === 'all' || applies.includes(rootClass) || canApplyToPerson) {
                    parsings.push({ root: sp.root, rules: [rule, ...sp.rules] });
                }
            });
        }
    });
    return parsings;
};

export const getUniqueParsings = (surface, lexicon, config, normalizeToBase) => {
    let parsings = findAllParsings(surface, lexicon, config, normalizeToBase);
    let unique = [];
    let sigs = new Set();
    parsings.forEach(p => {
        let sig = p.root.word + '|' + p.root.translation + '|' + p.rules.map(r => r.name).join('|');
        if (!sigs.has(sig)) { sigs.add(sig); unique.push(p); }
    });
    return unique;
};


/**
 * Attempts to segment a single mashed-together token into multiple valid lexicon/rule entries.
 * Uses a Greedy Longest Match approach.
 */
export const segmentToken = (token, lexicon, config, normalizeToBase, getUniqueParsings) => {
    if (!token || !lexicon) return [token];
    
    // Safety check for lexicon format
    const lexiconArray = Array.isArray(lexicon) ? lexicon : (lexicon.lexicon || []);
    if (lexiconArray.length === 0) return [token];

    // 1. If the token is already fully parsable as a single unit (root + affixes), keep it together.
    // This is the primary reason why it might not segment: if the whole thing is found.
    if (getUniqueParsings(token).length > 0) {
        return [token];
    }

    const safeToken = normalizeToBase(token.toLowerCase());
    const resultTokens = [];
    let remaining = safeToken;

    const findLongestMatch = (str) => {
        let longest = null;
        let matchLength = 0;

        // Check Lexicon + Affixes (The key fix: check if the chunk is parsable)
        // We try from longest possible prefix to shortest
        for (let len = str.length; len >= 1; len--) {
            const chunk = str.substring(0, len);
            
            // 1. Check if it's a raw lexicon word
            const inLexicon = lexiconArray.some(e => e.word && normalizeToBase(e.word.toLowerCase()) === normalizeToBase(chunk.toLowerCase()));
            
            // 2. Check if it's a valid inflected form
            const isParsable = getUniqueParsings(chunk).length > 0;

            if (inLexicon || isParsable) {
                return { word: chunk, length: len };
            }
        }

        return { word: null, length: 0 };
    };

    let iterations = 0;
    while (remaining.length > 0 && iterations < 20) {
        iterations++;
        const match = findLongestMatch(remaining);
        
        if (match.word && match.length > 0) {
            resultTokens.push(match.word);
            remaining = remaining.slice(match.length);
        } else {
            // Handle separators and glottal stops that might be in the middle
            if (remaining.startsWith("'") || remaining.startsWith("-") || remaining.startsWith("’") || remaining.startsWith("‘")) {
                remaining = remaining.slice(1);
                continue;
            }

            // If we're stuck, it's not a perfect segmentation. Return original.
            return [token];
        }
    }

    // Only return the segments if we actually found more than one and covered the whole string
    return (resultTokens.length > 1 && remaining.length === 0) ? resultTokens : [token];
};

export const expandWildcardDependencies = (applicableRules, grammarRules) => {
    let expandedRules = [];
    applicableRules.forEach(rule => {
        if (!rule.dependency) {
            expandedRules.push(rule);
            return;
        }

        const depLower = rule.dependency.trim().toLowerCase();
        
        // Check if the dependency is a wildcard
        if (['*suffix', '*prefix', '*infix', '*affix'].includes(depLower)) {
            const targetRules = grammarRules.filter(r => {
                const p = parseAffix(r.affix);
                if (!p || r.id === rule.id) return false;
                
                if (depLower === '*suffix') return p.type === 'suffix';
                if (depLower === '*prefix') return p.type === 'prefix';
                if (depLower === '*infix') return p.type === 'infix';
                if (depLower === '*affix') return ['suffix', 'prefix', 'infix'].includes(p.type);
                
                return false;
            });

            if (targetRules.length === 0) {
                 expandedRules.push(rule);
            } else {
                 targetRules.forEach(tr => {
                     expandedRules.push({
                         ...rule,
                         id: `${rule.id}_after_${tr.id}`,
                         name: `${rule.name} (after ${tr.name})`,
                         dependency: tr.name
                     });
                 });
            }
        } else {
            expandedRules.push(rule);
        }
    });
    return expandedRules;
};

/**
 * Generates a full paradigm of inflected forms for a given word.
 * Used by exporters and MatrixModal.
 */
export const generateParadigm = (baseWord, config, options = {}) => {
    const { 
        grammarRules = [], 
        vowels = "", 
        consonants = "", 
        otherPhonemes = "",
        syntaxOrder = "SVO"
    } = config;
    
    const { 
        inflectionMode = 'compact', // compact, affix, free
        wordClass = 'all'
    } = options;

    const liveClasses = (wordClass || 'all').split(',').map(c => c.trim().toLowerCase());
    let applicableRules = grammarRules.filter(rule => {
        const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
        return ruleClasses.includes('all') || liveClasses.some(lc => ruleClasses.includes(lc));
    });
    
    applicableRules = expandWildcardDependencies(applicableRules, grammarRules);

    const results = [];

    // Compact mode: Only Rule results
    if (inflectionMode === 'compact') {
        applicableRules.forEach(rule => {
            results.push({
                ruleName: rule.name || rule.category || 'General',
                personName: 'BASE',
                result: applyRuleToWord(baseWord, rule, grammarRules, vowels, consonants, otherPhonemes)
            });
        });
        return results;
    }

    // Full mode: Rule x Person results
    const personRules = getPersonRules(config.personRules || []);
    const fullPersonList = [{ name: 'BASE', affix: '', freeForm: '' }, ...personRules];

    applicableRules.forEach(rule => {
        fullPersonList.forEach(person => {
            // Skip non-base person for standalone rules (like Passive or Infinitive)
            if (rule.standalone && person.name !== 'BASE') return;

            let inflected = applyRuleToWord(baseWord, rule, grammarRules, vowels, consonants, otherPhonemes);
            
            // Apply person marker if it's not the base root
            if (inflected && !rule.standalone && person.name !== 'BASE') {
                const useFree = (inflectionMode === 'free' && person.freeForm) || (!person.affix && person.freeForm);
                const useAffix = (inflectionMode === 'affix' && person.affix) || (!person.freeForm && person.affix);

                if (useFree) {
                    const sIndex = syntaxOrder.toUpperCase().indexOf('S');
                    const vIndex = syntaxOrder.toUpperCase().indexOf('V');
                    if (vIndex !== -1 && sIndex !== -1 && vIndex < sIndex) {
                        inflected = `${inflected} ${person.freeForm}`;
                    } else {
                        inflected = `${person.freeForm} ${inflected}`;
                    }
                } else if (useAffix) {
                    inflected = applyRuleToWord(inflected, person, grammarRules, vowels, consonants, otherPhonemes);
                }
            }

            results.push({
                ruleName: rule.name || rule.category || 'General',
                personName: person.name,
                result: inflected
            });
        });
    });

    return results;
};