import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const INITIAL_CONFIG = {
    projectId: null,
    conlangName: 'My New Conlang',
    authorName: 'Author Name',
    description: 'A brief description of your conlang.',
    phonologyTypes: 'alphabetic',
    isPublic: false,
    conlangIcon: 'Globe',
    alphabeticScript: 'latin', // e.g. latin, cyrillic, runic, greek
    featuralComponents: {}, // Stores strokes for initials, vowels, finals
    blockSettings: {
        maxChars: 3,
        layoutTemplate: '2top1bottom',
        slotMapping: ['Initial', 'Vowel', 'Final']
    },
    blockTemplates: [
        {
            id: 'default',
            maxChars: 3,
            layoutTemplate: '2top1bottom',
            slotMapping: ['Initial', 'Vowel', 'Final']
        }
    ],
    syllabificationAlgorithm: 'ltr',
    syntaxOrder:'SVO',
    adjectivePlacement: 'pre-nominal',
    adjectiveAgreement: false,
    writingDirection: 'ltr',
    consonants:'p, t, k, m, n, s, l, r',
    vowels:'a, e, i, o, u',
    syllablePattern: 'CVC, VC, CV',
    otherPhonemes: '',
    otherPhonemeMapping: 'X',
    enableToneAndStress: true,
    skipSyllableValidation: false,
    historicalRules:'^(.{2})(.*)',
    syllabaryMap: {},
    grammarRules: [],
    verbMarker: '-r',
    cliticsRules: 's, ll',
    personRules: "1S: mau / \'ma, 2S: tau / \'ta, 3S Masc: lou / \'lo",
    wikiPages: { phonology: "<h1>Phonology</h1><p>Start documenting your language rules here...</p>" },
    streak: 0,
    unlockedBadges: ['genesis'],
    activity: [],
    isProActive: false,
    lastStudyDate: null,
    customFont: null,
    theme: 'dark',
    colors: {
        bg: '#0b0f19',
        header: '#080812',
        s1: '#151a28',
        s2: '#1a2033',
        s3: '#1f283d',
        s4: '#12121c',
        font: '#f8fafc',
        font2: '#94a3b8',
        accent: '#7c3aed',
        accent2: '#8b5cf6',
        accent3: '#4c1d95',
        border: 'rgba(255, 255, 255, 0.08)',
        blur: '0px',
        glow: '#1a1638'
    },
    customGlyphs: {},
    puaCounter: 57344,
    customFontBase64: null,
    isRehydrating: false,
    numeralBase: 10,
    sentenceMaps: [],
    // Per-class word markers used by the generator (separate from the grammar rules engine)
    generatorMarkers: {
        noun: '',
        // Initially mirrors verbMarker, but can be overridden
        verb: '',
        adjective: '',
        adverb: '',
        pronoun: '',
        particle: '',
    },
    // User-defined parts of speech and semantic tags that persist across sessions
    customWordClasses: [],
    customTags: [],
    autoReturnToLexicon: false,
    alphabetNames: {},
    numberSystem: {
        zero: '',
        digits: {},
        stems: {},
        powers: {},
        irregulars: {},
        settings: {
            fusion: false,
            separator: ' ',
            // or 'unit-first'
            order: 'digit-first'
        }
    },
    azureTtsUseIpa: true,
    numberMatrix: {},
    numberDerivedRules: {
        ordinal: '',
        fractional: '',
        multiplier: ''
    },
    timeSystemVocab: {
        second: '',
        minute: '',
        hour: '',
        day: '',
        week: '',
        month: '',
        year: ''
    },
    // { 'a': '\uE001', 'b': '\uE002' }
    alphabetGlyphs: {},
    // { [synsetId]: { word: '...', ipa: '...', meaning: '...' } },
    semanticMappings: {},
    wordAssistConfig: {
        syntaxOrder: 'QCTLJNORVMSAPG',
        copulaBehavior: 'normal',
        copulaReplacement: '',
        triggers: [
            { id: 'obj-1', name: 'Direct Object', trigger: 'O', marker: '', type: 'trigger', position: 'suffix', priority: 4 },
            { id: 'neg-1', name: 'Negation', trigger: 'not', marker: '', type: 'word', position: 'beforeVerb', priority: 1 },
            { id: 'comp-1', name: 'Comparative', trigger: 'more, -er', marker: '', type: 'word', position: 'before', priority: 2 },
            { id: 'pl-1', name: 'Plural', trigger: '-s', marker: '', type: 'suffix', position: 'suffix', priority: 3 }
        ]
    },
    functionWords: [],
    // Prosody rules — evaluated at display time to auto-compute stress & tone
    // Array of { id, type, value, fallback? }
    stressRules: [],
    // Array of { id, condition, value }
    toneRules: [],
    // Array of { id, title, phrases: [{ id, conlang, english }] }
    customCourse: [],
};

// IndexedDB Helper for handling massive data without breaking local storage quotas
const DB_NAME = 'ConlangEngineDB';
const STORE_NAME = 'bloat';

const saveLargeDataToDB = (projectId, data) => {
    return new Promise((resolve) => {
        if (!projectId) return resolve(false);
        const req = indexedDB.open(DB_NAME, 3);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = (e) => {
            try {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                // Get existing data to merge
                const getReq = store.get(projectId);
                getReq.onsuccess = () => {
                    const existing = getReq.result || {};
                    store.put({ ...existing, ...data }, projectId);
                };
                tx.oncomplete = () => resolve(true);
            } catch (err) { resolve(false); }
        };
    });
};

const loadLargeDataFromDB = (projectId) => {
    return new Promise((resolve) => {
        if (!projectId) return resolve(null);
        const req = indexedDB.open(DB_NAME, 3);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = (e) => {
            try {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) return resolve(null);
                const tx = db.transaction(STORE_NAME, 'readonly');
                const getReq = tx.objectStore(STORE_NAME).get(projectId);
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            } catch (err) { resolve(null); }
        };
        req.onerror = () => resolve(null);
    });
};

export const useConfigStore = create(
    persist(
        (set) => ({
            ...INITIAL_CONFIG,

            rehydrateBloat: async () => {
                const { projectId } = useConfigStore.getState();
                if (!projectId) return;
                set({ isRehydrating: true });
                try {
                    const bloat = await loadLargeDataFromDB(projectId);
                    if (bloat) {
                        const font = bloat.customFontBase64 || bloat.customFont || null;
                        set(() => ({
                            customFont: font,
                            customFontBase64: font,
                            syllabaryMap: bloat.syllabaryMap || {},
                            customGlyphs: bloat.customGlyphs || {}
                        }));
                    }
                } finally {
                    set({ isRehydrating: false });
                }
            },

            setFullConfig: (newConfig) => {
                const projectId = newConfig.projectId || useConfigStore.getState().projectId;
                if (projectId) {
                    const bloat = {};
                    if (newConfig.customFontBase64) bloat.customFontBase64 = newConfig.customFontBase64;
                    if (newConfig.customFont) bloat.customFont = newConfig.customFont;
                    if (newConfig.syllabaryMap) bloat.syllabaryMap = newConfig.syllabaryMap;
                    if (newConfig.customGlyphs) bloat.customGlyphs = newConfig.customGlyphs;
                    if (Object.keys(bloat).length > 0) saveLargeDataToDB(projectId, bloat);
                }
                set(() => ({ ...INITIAL_CONFIG, ...newConfig }));
            },

            // Cleanup utility to wipe bloated legacy state
            purgeBloatedGlyphs: () => set((state) => {
                if (Object.keys(state.customGlyphs || {}).length > 200) {
                    return { customGlyphs: {} };
                }
                return {};
            }),

            addCustomGlyph: (charCode, strokesArray, base64Font) => {
                const { projectId } = useConfigStore.getState();
                if (projectId) {
                    const bloat = { customGlyphs: { ...useConfigStore.getState().customGlyphs, [charCode]: strokesArray } };
                    if (base64Font) {
                        bloat.customFontBase64 = base64Font;
                        bloat.customFont = base64Font;
                    }
                    saveLargeDataToDB(projectId, bloat);
                }
                set((state) => ({
                    customGlyphs: { ...state.customGlyphs, [charCode]: strokesArray },
                    customFontBase64: base64Font,
                    customFont: base64Font,
                    activity: [{ text: `Created custom glyph (${charCode})`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
                }));
            },

            incrementPuaCounter: () => set((state) => ({ puaCounter: state.puaCounter + 1 })),

            addCustomWordClass: (cls) => set((state) => {
                const list = state.customWordClasses || [];
                const normalized = cls.trim().toLowerCase();
                if (!normalized || list.includes(normalized)) return {};
                return { customWordClasses: [...list, normalized] };
            }),

            removeCustomWordClass: (cls) => set((state) => ({
                customWordClasses: (state.customWordClasses || []).filter(c => c !== cls)
            })),

            renameCustomWordClass: (oldName, newName) => set((state) => ({
                customWordClasses: (state.customWordClasses || []).map(c => c === oldName ? newName.trim().toLowerCase() : c)
            })),

            addCustomTag: (tag) => set((state) => {
                const list = state.customTags || [];
                const normalized = tag.trim().toLowerCase();
                if (!normalized || list.includes(normalized)) return {};
                return { customTags: [...list, normalized] };
            }),

            removeCustomTag: (tag) => set((state) => ({
                customTags: (state.customTags || []).filter(t => t !== tag)
            })),

            renameCustomTag: (oldName, newName) => set((state) => ({
                customTags: (state.customTags || []).map(t => t === oldName ? newName.trim().toLowerCase() : t)
            })),

            saveWikiPage: (pageId, content) => set((state) => {
                const existing = state.wikiPages[pageId];
                if (existing && typeof existing === 'object' && existing.type === 'corpus') {
                    return { wikiPages: { ...state.wikiPages, [pageId]: { ...existing, content } } };
                }
                return { wikiPages: { ...state.wikiPages, [pageId]: content } };
            }),

            addWikiPage: (pageId, title, type = 'wiki') => set((state) => ({
                wikiPages: {
                    ...state.wikiPages,
                    [pageId]: type === 'corpus'
                        ? { type: 'corpus', title: title, content: '' }
                        : `<h1>${title}</h1><p>Start typing...</p>`
                },
                activity: [{ text: `Created document: ${title}`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
            })),

            deleteWikiPage: (pageId) => set((state) => {
                const newPages = { ...state.wikiPages };
                delete newPages[pageId];
                return {
                    wikiPages: newPages,
                    activity: [{ text: `Deleted wiki page`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
                };
            }),

            reorderWikiPage: (pageId, direction) => set((state) => {
                const keys = Object.keys(state.wikiPages || {});
                const idx = keys.indexOf(pageId);
                if (idx < 0) return {};

                const newIdx = direction === 'up' ? idx - 1 : idx + 1;
                if (newIdx < 0 || newIdx >= keys.length) return {};

                const newKeys = [...keys];
                [newKeys[idx], newKeys[newIdx]] = [newKeys[newIdx], newKeys[idx]];

                const newPages = {};
                for (const k of newKeys) {
                    newPages[k] = state.wikiPages[k];
                }
                return { wikiPages: newPages };
            }),

            logActivity: (text) => set((state) => ({
                activity: [{ text, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
            })),

            unlockBadge: (badgeId, badgeName) => set((state) => {
                const badges = state.unlockedBadges || [];
                if (!badges.includes(badgeId)) {
                    return { unlockedBadges: [...badges, badgeId] };
                }
                return {};
            }),

            updateConfig: (newConfig) => set((state) => {
                const keys = Object.keys(newConfig);
                if (keys.length === 0) return {};

                let label = keys.join(', ');
                if (keys.includes('colors')) label = 'Theme & Colors';
                else if (keys.includes('customFont')) label = 'Custom Font';
                else if (keys.includes('streak') || keys.includes('lastStudyDate')) label = 'Study Streak';
                else if (keys.length > 3) label = 'Multiple Settings';

                const text = `Updated ${label}`;
                const now = new Date().toISOString();
                let newActivity = [...(state.activity || [])].filter(a => !a.text.includes('isProActive'));

                // Prevent spamming the timeline with system updates or rapid identical updates
                const systemKeys = ['isProActive', 'activity', 'theme', 'autoReturnToLexicon', 'conlangName'];
                const isSystemOnly = keys.every(k => systemKeys.includes(k));

                if (!isSystemOnly) {
                    newActivity = [{ text, time: now }, ...newActivity].slice(0, 15);
                }

                if (state.projectId) {
                    const bloat = {};
                    if (newConfig.customFontBase64) {
                        bloat.customFontBase64 = newConfig.customFontBase64;
                        bloat.customFont = newConfig.customFontBase64;
                    } else if (newConfig.customFont) {
                        bloat.customFont = newConfig.customFont;
                        bloat.customFontBase64 = newConfig.customFont;
                    }
                    if (newConfig.syllabaryMap) bloat.syllabaryMap = newConfig.syllabaryMap;
                    if (newConfig.customGlyphs) bloat.customGlyphs = newConfig.customGlyphs;
                    if (Object.keys(bloat).length > 0) saveLargeDataToDB(state.projectId, bloat);
                }

                return { ...newConfig, activity: newActivity };
            }),
        }),
        {
            name: 'conlang-config',
            partialize: (state) => {
                // Exclude large fields from localStorage (quota limit)
                const { customFontBase64, customFont, syllabaryMap, customGlyphs, ...rest } = state;
                return rest;
            }
        }
    )
);

// Cross-tab sync via BroadcastChannel
// Single channel for all config keys (avoids MaxListenersExceededWarning from per-key share() calls)
if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('conlang-config-sync');
    let externalUpdate = false;

    useConfigStore.subscribe((state) => {
        if (externalUpdate) {
            externalUpdate = false;
            return;
        }
        const { customFontBase64, customFont, syllabaryMap, customGlyphs, isRehydrating, ...rest } = state;
        channel.postMessage(JSON.stringify(rest));
    });

    channel.onmessage = (evt) => {
        externalUpdate = true;
        useConfigStore.setState(JSON.parse(evt.data));
    };
}
