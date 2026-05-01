import {create} from 'zustand';
import { persist } from 'zustand/middleware';

export const INITIAL_CONFIG = {
    projectId: null,
    conlangName: 'My New Conlang',
    authorName: 'Author Name',
    description: 'A brief description of your conlang.',
    phonologyTypes: 'alphabetic',
    alphabeticScript: 'latin', // e.g. latin, cyrillic, runic, greek
    featuralComponents: {}, // Stores strokes for initials, vowels, finals
    blockSettings: {
        maxChars: 3,
        layoutTemplate: '2top1bottom', 
        slotMapping: ['Initial', 'Vowel', 'Final']
    },
    syntaxOrder:'SVO',
    writingDirection: 'ltr',
    consonants:'p, t, k, m, n, s, l, r',
    vowels:'a, e, i, o, u',
    syllablePattern: 'CVC, VC, CV...',
    otherPhonemes: '',
    otherPhonemeMapping: 'X',
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
    numeralBase: 10,
    sentenceMaps: [],
    // Per-class word markers used by the generator (separate from the grammar rules engine)
    generatorMarkers: {
        noun: '',
        verb: '',      // Initially mirrors verbMarker, but can be overridden
        adjective: '',
        adverb: '',
        pronoun: '',
        particle: '',
    },
    // User-defined parts of speech and semantic tags that persist across sessions
    customWordClasses: [],
    customTags: [],
};

// IndexedDB Helper for handling massive font files without breaking local storage quotas
const DB_NAME = 'ConlangEngineDB';
const STORE_NAME = 'fonts';

const saveFontToDB = (fontBase64) => {
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        req.onsuccess = (e) => {
            try {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(fontBase64, 'customFontBase64');
                tx.oncomplete = () => resolve(true);
            } catch (err) { resolve(false); }
        };
    });
};

export const loadFontFromDB = () => {
    return new Promise((resolve) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        req.onsuccess = (e) => {
            try {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, 'readonly');
                const getReq = tx.objectStore(STORE_NAME).get('customFontBase64');
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

            setFullConfig: (newConfig) => set(() => ({ ...INITIAL_CONFIG, ...newConfig })),
            
            // Cleanup utility to wipe bloated legacy state
            purgeBloatedGlyphs: () => set((state) => {
                if (Object.keys(state.customGlyphs || {}).length > 200) {
                    return { customGlyphs: {} };
                }
                return {};
            }),

            addCustomGlyph: (charCode, strokesArray, base64Font) => {
                if (base64Font) saveFontToDB(base64Font);
                set((state) => ({
                    customGlyphs: { ...state.customGlyphs, [charCode]: strokesArray },
                    customFontBase64: base64Font,
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
                let newActivity = [...(state.activity || [])];
                
                // Prevent spamming the timeline with rapid identical updates (e.g., dragging a color picker)
                if (newActivity.length > 0 && newActivity[0].text === text) {
                    const lastTime = new Date(newActivity[0].time).getTime();
                    if (Date.now() - lastTime < 60000) { // 1 minute debounce window
                        newActivity[0].time = now;
                        if (newConfig.customFontBase64) saveFontToDB(newConfig.customFontBase64);
                        return { ...newConfig, activity: newActivity };
                    }
                }

                newActivity = [{ text, time: now }, ...newActivity].slice(0, 15);
                if (newConfig.customFontBase64) saveFontToDB(newConfig.customFontBase64);
                return { ...newConfig, activity: newActivity };
            }),
        }),
        {
            name: 'conlang-config',
            partialize: (state) => {
                // Exclude customFontBase64 from being saved to localStorage (quota limit)
                const { customFontBase64, ...rest } = state;
                return rest;
            }
        }
    )
);