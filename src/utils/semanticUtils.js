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
 * Fetches associated domain topics.
 */
export async function fetchTopicOptions(word) {
    try {
        const response = await fetch(`${DATAMUSE_BASE_URL}?rel_trg=${word.toLowerCase()}&max=10`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map((item, index) => ({
            id: `top-${item.word}-${index}`,
            lemma: item.word,
            pos: 'n',
            type: 'topic'
        }));
    } catch (e) {
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

