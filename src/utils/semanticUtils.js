/**
 * semanticUtils.js
 * Upgraded to support multi-sense dictionary lookups.
 */

const DATAMUSE_BASE_URL = 'https://api.datamuse.com/words';
const WIKTIONARY_BASE_URL = 'https://en.wiktionary.org/api/rest_v1/page/definition';

/**
 * Fetches full dictionary data from Wiktionary (Multiple senses + IPA)
 */
export const fetchFullDictionary = async (word) => {
    try {
        const response = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word.trim().toLowerCase())}`);
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || !data.en) return null;
        
        const senses = data.en.map(entry => ({
            pos: entry.partOfSpeech,
            definitions: entry.definitions.map(d => d.definition)
        }));

        return {
            lemma: word,
            senses,
            totalSenses: senses.reduce((acc, s) => acc + s.definitions.length, 0)
        };
    } catch (e) {
        return null;
    }
}

/**
 * Fetches synsets and related words using Datamuse with Wiktionary fallback
 */
export async function fetchSynsets(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?ml=${word.toLowerCase()}&max=15&md=dp`);
        if (!response.ok) return [];
        const data = await response.json();
        
        return await Promise.all(data.map(async (item, index) => {
            let def = item.defs?.[0]?.split('\t')[1] || null;
            if (!def) {
                const wikiRes = await fetch(`${WIKTIONARY_BASE_URL}/${item.word.toLowerCase()}`);
                if (wikiRes.ok) {
                    const wikiData = await wikiRes.json();
                    def = wikiData.en?.[0]?.definitions?.[0]?.definition;
                }
            }
            return {
                id: `dm-${item.word}-${index}`,
                lemma: item.word,
                definition: def || `A semantic concept related to ${word}.`,
                pos: item.tags?.[0] || 'n'
            };
        }));
    } catch (err) {
        return [];
    }
}

/**
 * Fetches potential hypernyms (more general terms) for a word,
 * explicitly filtering out synonyms to maintain strict taxonomy.
 */
export async function fetchHypernymOptions(word) {
    try {
        const [genRes, synRes] = await Promise.all([
            fetch(`${DATAMUSE_BASE_URL}?rel_gen=${word.toLowerCase()}&max=15`),
            fetch(`${DATAMUSE_BASE_URL}?rel_syn=${word.toLowerCase()}&max=15`)
        ]);
        
        const genData = await genRes.json();
        const synData = await synRes.json();
        const synWords = new Set(synData.map(s => s.word.toLowerCase()));
        
        // Filter out words that are strictly synonyms
        return genData
            .filter(item => !synWords.has(item.word.toLowerCase()) && item.word.toLowerCase() !== word.toLowerCase())
            .map((item, index) => ({
                id: `gen-${item.word}-${index}`,
                lemma: item.word,
                pos: 'n',
                type: 'hypernym'
            })).slice(0, 15);
    } catch (e) {
        return [];
    }
}

/**
 * Fetches hyponyms (more specific terms) for a word.
 */
export async function fetchHyponymOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_spc=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `spc-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'hyponym'
        }));
    } catch (e) {
        return [];
    }
}

export async function fetchHypernymChain(synset) {
    // We'll keep this for the initial path, but UI will allow branching
    let chain = [synset];
    let currentWord = synset.lemma;
    for (let i = 0; i < 3; i++) {
        try {
            const response = await fetch(`${DATAMUSE_BASE_URL}?rel_gen=${currentWord.toLowerCase()}&max=1`);
            const data = await response.json();
            if (data?.[0] && data[0].word !== currentWord) {
                chain.unshift({ id: `gen-${data[0].word}`, lemma: data[0].word, pos: 'n' });
                currentWord = data[0].word;
            } else break;
        } catch (e) { break; }
    }
    return chain;
}

/**
 * Fetches strict synonyms for a word.
 */
export async function fetchSynonymOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_syn=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `syn-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'synonym'
        }));
    } catch (e) {
        return [];
    }
}

/**
 * Fetches holonyms (the whole that the word is a part of).
 */
export async function fetchHolonymOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_par=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `hol-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'holonym'
        }));
    } catch (e) {
        return [];
    }
}

/**
 * Fetches meronyms (parts that comprise the word).
 */
export async function fetchMeronymOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_com=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `mer-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'meronym'
        }));
    } catch (e) {
        return [];
    }
}

/**
 * Fetches associated semantic domain topics and hypernym categories.
 * Prefers broad classifications (rel_gen + topics) over text triggers.
 */
export async function fetchTopicOptions(word) {
    try {
        let core = word.toLowerCase().trim();
        if (core.startsWith('to ')) core = core.substring(3);
        if (core.startsWith('a ')) core = core.substring(2);
        if (core.startsWith('an ')) core = core.substring(3);
        if (core.startsWith('the ')) core = core.substring(4);
        core = core.split(/[\s(,;]/)[0];
        if (!core) return [];

        const [genRes, topicRes] = await Promise.all([
            fetch(`${DATAMUSE_BASE_URL}?rel_gen=${encodeURIComponent(core)}&max=12`),
            fetch(`${DATAMUSE_BASE_URL}?topics=${encodeURIComponent(core)}&max=12`)
        ]);

        const genData = genRes.ok ? await genRes.json() : [];
        const topicData = topicRes.ok ? await topicRes.json() : [];

        // Prioritize general hypernym categories (e.g. time, liquid, emotion)
        const combined = [...genData, ...topicData];
        const tagsSet = new Set();
        const results = [];

        for (const item of combined) {
            const tag = item.word.toLowerCase().trim();
            // Filter: single concise words, no spaces/special chars, not equal to base word
            if (
                tag &&
                /^[a-z]+$/.test(tag) &&
                tag !== core &&
                tag.length > 2 &&
                !tagsSet.has(tag)
            ) {
                tagsSet.add(tag);
                results.push({
                    id: `top-${tag}`,
                    lemma: tag,
                    pos: 'n',
                    type: 'topic'
                });
            }
        }

        return results;
    } catch {
        return [];
    }
}

export async function fetchWordFamily(synset) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?sp=*${synset.lemma.toLowerCase()}*&max=20`);
        const data = await response.json();
        return data
            .filter(item => item.word.toLowerCase() !== synset.lemma.toLowerCase()) // Don't include the exact root word in its own children
            .map(item => ({ id: `fam-${item.word}`, lemma: item.word, pos: 'n' }));
    } catch (e) { return []; }
}

/**
 * CREATIVE BRANCHES
 */

export async function fetchAntonymOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_ant=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `ant-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'antonym'
        }));
    } catch (e) {
        return [];
    }
}

export async function fetchRhymeOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_rhy=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `rhy-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'rhyme'
        }));
    } catch (e) {
        return [];
    }
}

export async function fetchModifierOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_jjb=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `jjb-${item.word}-${index}`,
            lemma: item.word,
            pos: 'adj',
            type: 'modifier'
        }));
    } catch (e) {
        return [];
    }
}

export async function fetchFollowerOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_bga=${word.toLowerCase()}&max=15`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `bga-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'follower'
        }));
    } catch (e) {
        return [];
    }
}

/**
 * Fetches a concise English definition for a word.
 * Strategy:
 *   1. Datamuse (?sp=<word>&md=d&max=1) — fast, returns defs inline
 *   2. Wiktionary via fetchFullDictionary() — richer, but slower
 * 
 * @param {string} translation  The English translation/gloss (e.g. "water", "to run")
 * @param {string} [wordClass]  Optional POS to prefer matching definitions (e.g. "noun")
 * @returns {Promise<string|null>}  Plain-text definition string, or null
 */
export async function fetchDefinitionForWord(translation, wordClass) {
    if (!translation) return null;

    // Extract core word: "to run away" → "run", "an apple" → "apple"
    let core = translation.toLowerCase().trim();
    if (core.startsWith('to ')) core = core.substring(3);
    if (core.startsWith('a ')) core = core.substring(2);
    if (core.startsWith('an ')) core = core.substring(3);
    if (core.startsWith('the ')) core = core.substring(4);
    core = core.split(/[\s(,;]/)[0];
    if (!core) return null;

    // Normalize POS label for matching
    const posNorm = (wordClass || '').split(',')[0].trim().toLowerCase();

    // Map our POS labels to Datamuse defs prefixes
    const POS_MAP = {
        noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv',
        pronoun: 'n', preposition: 'adv', conjunction: 'adv', particle: 'adv'
    };
    const targetPrefix = POS_MAP[posNorm] || null;

    // ── 1. Datamuse (fast) ──────────────────────────────────────
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${DATAMUSE_BASE_URL}?sp=${encodeURIComponent(core)}&md=d&max=3`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            // Find exact match
            const exact = data.find(d => d.word.toLowerCase() === core);
            if (exact?.defs && exact.defs.length > 0) {
                // Each def is "pos\tDefinition text"
                // Try to match POS first
                if (targetPrefix) {
                    const matched = exact.defs.find(d => d.startsWith(targetPrefix + '\t'));
                    if (matched) return matched.split('\t')[1];
                }
                // Otherwise take the first definition
                return exact.defs[0].split('\t')[1];
            }
        }
    } catch (e) { /* fall through to Wiktionary */ }

    // ── 2. Wiktionary (richer, slower) ──────────────────────────
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        // Use a wrapper to enforce timeout on the dictionary call
        const wikiPromise = fetchFullDictionary(core);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('timeout')), 4000);
        });
        
        const wiki = await Promise.race([wikiPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        if (wiki?.senses && wiki.senses.length > 0) {
            // Try POS match
            if (posNorm) {
                const matchSense = wiki.senses.find(s =>
                    s.pos?.toLowerCase().includes(posNorm)
                );
                if (matchSense?.definitions?.[0]) {
                    return stripHtml(matchSense.definitions[0]);
                }
            }
            // Fallback: first available definition
            for (const sense of wiki.senses) {
                if (sense.definitions?.[0]) {
                    return stripHtml(sense.definitions[0]);
                }
            }
        }
    } catch (e) { /* no definition found */ }

    return null;
}

/**
 * Fetches all available definition options and senses for a given translation word.
 * Queries Free Dictionary API, Datamuse, and Wiktionary.
 *
 * @param {string} translation  The English translation/gloss (e.g. "sharp", "water", "run")
 * @returns {Promise<Array<{id: string, pos: string, definition: string, example: string|null, source: string}>>}
 */
export async function fetchDefinitionOptions(translation) {
    if (!translation) return [];

    let core = translation.toLowerCase().trim();
    if (core.startsWith('to ')) core = core.substring(3);
    if (core.startsWith('a ')) core = core.substring(2);
    if (core.startsWith('an ')) core = core.substring(3);
    if (core.startsWith('the ')) core = core.substring(4);
    core = core.split(/[\s(,;]/)[0];
    if (!core) return [];

    const results = [];
    const seenDefs = new Set();

    const addDef = (pos, defText, example = null, source = 'Dictionary') => {
        if (!defText) return;
        const cleanDef = stripHtml(defText).trim();
        if (!cleanDef) return;
        const key = cleanDef.toLowerCase();
        if (seenDefs.has(key)) return;
        seenDefs.add(key);

        let cleanPos = (pos || 'noun').toLowerCase().trim();
        if (cleanPos === 'n') cleanPos = 'noun';
        if (cleanPos === 'v') cleanPos = 'verb';
        if (cleanPos === 'adj') cleanPos = 'adjective';
        if (cleanPos === 'adv') cleanPos = 'adverb';

        results.push({
            id: `def-opt-${results.length}`,
            pos: cleanPos,
            definition: cleanDef,
            example: example ? stripHtml(example).trim() : null,
            source
        });
    };

    // Parallel fetch from all 3 dictionary APIs simultaneously
    const freeDictPromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(core)}`, {
                signal: controller.signal
            });
            if (res.ok) return await res.json();
        } catch { /* fall through */ } finally {
            clearTimeout(timeoutId);
        }
        return null;
    })();

    const datamusePromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await fetch(`${DATAMUSE_BASE_URL}?sp=${encodeURIComponent(core)}&md=d&max=8`, {
                signal: controller.signal
            });
            if (res.ok) return await res.json();
        } catch { /* fall through */ } finally {
            clearTimeout(timeoutId);
        }
        return null;
    })();

    const wikiPromise = (async () => {
        try {
            return await fetchFullDictionary(core);
        } catch {
            return null;
        }
    })();

    const [freeDictResult, datamuseResult, wikiResult] = await Promise.allSettled([
        freeDictPromise,
        datamusePromise,
        wikiPromise
    ]);

    // 1. Process Free Dictionary API results
    if (freeDictResult.status === 'fulfilled' && Array.isArray(freeDictResult.value)) {
        for (const entry of freeDictResult.value) {
            if (entry?.meanings) {
                for (const meaning of entry.meanings) {
                    const pos = meaning.partOfSpeech || 'noun';
                    if (meaning.definitions) {
                        for (const d of meaning.definitions) {
                            addDef(pos, d.definition, d.example, 'Free Dictionary API');
                        }
                    }
                }
            }
        }
    }

    // 2. Process Datamuse results
    if (datamuseResult.status === 'fulfilled' && Array.isArray(datamuseResult.value)) {
        const exact = datamuseResult.value.find(d => d.word.toLowerCase() === core);
        if (exact?.defs) {
            const POS_MAP_REVERSE = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
            for (const defLine of exact.defs) {
                const parts = defLine.split('\t');
                if (parts.length >= 2) {
                    const rawPos = parts[0];
                    const text = parts[1];
                    const fullPos = POS_MAP_REVERSE[rawPos] || rawPos;
                    addDef(fullPos, text, null, 'Datamuse');
                }
            }
        }
    }

    // 3. Process Wiktionary results
    if (wikiResult.status === 'fulfilled' && wikiResult.value?.senses) {
        for (const sense of wikiResult.value.senses) {
            const pos = sense.pos || 'noun';
            if (sense.definitions) {
                for (const defText of sense.definitions) {
                    addDef(pos, defText, null, 'Wiktionary');
                }
            }
        }
    }

    return results;
}

/** Strips HTML tags from a Wiktionary definition string */
function stripHtml(html) {
    if (!html) return '';
    return html
        .replace(/<[^>]+>/g, '')    // remove tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/\s+/g, ' ')       // collapse whitespace
        .trim();
}

