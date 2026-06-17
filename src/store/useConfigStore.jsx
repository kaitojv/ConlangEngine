import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeScriptType, normalizeScriptName, repairScriptSystems, normalizeRuleKey } from '../utils/scriptResolver.js';

export const INITIAL_CONFIG = {
    projectId: null,
    parentId: null,
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
    evolutionEpochs: [
        { id: 'epoch_1', name: 'Proto-Language', rules: '' }
    ],
    verbMarker: '-r',
    cliticsRules: 's, ll',
    personRules: "1S: mau / 'ma, 2S: tau / 'ta, 3S Masc: lou / 'lo",
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
    // Per-pattern weight for the word generator (e.g. { 'CV': 60, 'CVC': 30, 'V': 10 })
    syllablePatternWeights: {},
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
    calendarSystem: {
        daysOfWeek: ['', '', '', '', '', '', ''],
        months: ['', '', '', '', '', '', '', '', '', '', '', ''],
        dateFormat: 'DD/MM/YYYY',
        yearOffset: 0
    },
    // Vowel harmony configuration
    vowelHarmonyMode: 'flexible', // 'complete' | 'flexible' | 'optional'
    vowelHarmonySets: [], // Array<{ name: string, vowels: string[] }>
    vowelHarmonyOverrideWordClasses: [], // word classes exempted in 'flexible' mode
    vowelHarmonyOverrideTags: [], // semantic tags exempted in 'flexible' mode
    // { 'a': '\uE001', 'b': '\uE002' }
    alphabetGlyphs: {},
    // Multi-script systems (v2)
    scriptSystems: [
        {
            id: 'default',
            name: 'Main Script',
            type: 'alphabetic',
            isDefault: true,
            alphabeticScript: 'latin',
            writingDirection: 'ltr',
            syllabificationAlgorithm: 'ltr',
            blockSettings: { maxChars: 3, layoutTemplate: '2top1bottom', slotMapping: ['Initial', 'Vowel', 'Final'] },
            blockTemplates: [],
            alphabetNames: {},
        },
    ],
    activeScriptSystemId: 'default',
    scriptRules: {
        defaultScriptId: 'default',
        wordClasses: {},
        tags: {},
        personCategories: {},
        roles: {},
    },
    // { [synsetId]: { word: '...', ipa: '...', meaning: '...' } },
    semanticMappings: {},
    // Runtime-only script data (excluded from localStorage)
    scriptDataById: {},
    // Config version for migration
    configVersion: 2,
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
    worldMap: {
        x: null,
        y: null
    },
    functionWords: [],
    pronounMatrixData: null,
    pronounMatrixSettings: null,
    floatingBackground: {
        enabled: true,
        global: false,
        type: 'greetings'
    },
    // Prosody rules — evaluated at display time to auto-compute stress & tone
    // Array of { id, type, value, fallback? }
    stressRules: [],
    // Array of { id, condition, value }
    toneRules: [],
    // Array of { id, title, phrases: [{ id, conlang, english }] }
    customCourse: [],
    customLabels: {}, // Customizable terminology (e.g. app title, navbar labels)
    ipaMappingRules: '', // Rules for autogenerating IPA from orthography (e.g., "oo=oʊ, uu=uː")
    typographySettings: {
        customTypographyModes: [],
        activeDisplayMode: 'Base',
        letterSpacing: 0
    },
    // REST API backup system — per-project configuration (see https://github.com/niruhsa/ConlangEngine-Obsidian-Backup/blob/master/README.md)
    backupSettings: {
        enabled: false,
        // Base URL incl. transport + host + port, e.g. http://localhost:3000
        endpoint: 'http://localhost:3000',
        // Periodic autosave
        autosaveEnabled: true,
        autosaveIntervalMinutes: 5,
        // Back up on every committed change (debounced)
        onChangeEnabled: false,
        // Debounce window for change detection (ms) — waits for typing to settle
        debounceMs: 2500,
        // Reuse a single backup version for a window instead of spamming new ones
        reuseEnabled: true,
        reuseWindowMinutes: 10,
    },

    // Morphological typology system
    morphologyMode: 'agglutinative', // 'isolating' | 'agglutinative' | 'fusional' | 'polysynthetic'
    morphSlots: [],        // Array of { id, name, type, position, required, maxOccurrences, ruleTag, appliesToPOS? }
    fusionRules: [],       // Array of { id, name, conditions, fusedAffix, priority }
    boundaryRules: [],     // Array of { id, name, trigger, action, epenthetic?, replacementMap? }

    // Particle system (for isolating/particle-based languages)
    particleDatabase: [],       // Array of particle definitions
    compositeParticles: [],     // Array of composite particle definitions
    allowRecursiveComposites: false, // When false, composites can only use primitives

    // Feature flags
    usesParticles: false, // Enable the particle system for isolating/particle-based languages
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
            } catch { resolve(false); }
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
            } catch { resolve(null); }
        };
        req.onerror = () => resolve(null);
    });
};

// Script-scoped IndexedDB helpers
const scriptKey = (projectId, scriptId) => `${projectId}::script::${scriptId}`;

const saveScriptDataToDB = (projectId, scriptId, data) => {
    return saveLargeDataToDB(projectId, { [scriptId]: data });
};

const loadScriptDataFromDB = (projectId, scriptId) => {
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
                const getReq = tx.objectStore(STORE_NAME).get(scriptKey(projectId, scriptId));
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            } catch { resolve(null); }
        };
        req.onerror = () => resolve(null);
    });
};

// Config migration for multi-script support
function migrateConfig(persistedState) {
    if (!persistedState) return null;
    const updates = {};

    // Ensure scriptSystems exists
    if (!persistedState.scriptSystems || !Array.isArray(persistedState.scriptSystems) || persistedState.scriptSystems.length === 0) {
        updates.scriptSystems = [{
            id: 'default',
            name: normalizeScriptName(persistedState.scriptName || 'Main Script', 'Main Script'),
            type: normalizeScriptType(persistedState.phonologyTypes || 'alphabetic'),
            isDefault: true,
            alphabeticScript: persistedState.alphabeticScript || 'latin',
            writingDirection: persistedState.writingDirection || 'ltr',
            syllabificationAlgorithm: persistedState.syllabificationAlgorithm || 'ltr',
            blockSettings: persistedState.blockSettings || INITIAL_CONFIG.blockSettings,
            blockTemplates: persistedState.blockTemplates || INITIAL_CONFIG.blockTemplates,
            alphabetNames: persistedState.alphabetNames || {},
        }];
    }

    // Ensure activeScriptSystemId
    if (!persistedState.activeScriptSystemId) {
        updates.activeScriptSystemId = 'default';
    }

    // Ensure scriptRules
    if (!persistedState.scriptRules || typeof persistedState.scriptRules !== 'object') {
        updates.scriptRules = {
            defaultScriptId: 'default',
            wordClasses: {},
            tags: {},
            personCategories: {},
            roles: {},
        };
    }

    // Repair scriptSystems invariants
    if (updates.scriptSystems || persistedState.scriptSystems) {
        const repaired = repairScriptSystems({
            ...persistedState,
            ...updates,
        });
        updates.scriptSystems = repaired.scriptSystems;
        updates.scriptRules = { ...(updates.scriptRules || persistedState.scriptRules), ...repaired.scriptRules };
    }

    if (Object.keys(updates).length > 0) {
        return updates;
    }
    return null;
}

export const useConfigStore = create(
    persist(
        (set) => ({
            ...INITIAL_CONFIG,

            rehydrateBloat: async () => {
                const state = useConfigStore.getState();
                const { projectId } = state;
                if (!projectId) return;
                set({ isRehydrating: true });
                try {
                    // Migrate config if needed
                    const migrated = migrateConfig(state);
                    if (migrated) set(migrated);

                    const bloat = await loadLargeDataFromDB(projectId);
                    if (!bloat) return;

                    const defaultScriptId = state.scriptRules?.defaultScriptId || 'default';
                    let defaultScriptData = bloat[defaultScriptId];

                    // Lazy migration for default script if not in bloat yet
                    if (!defaultScriptData) {
                        const migratedData = {
                            customGlyphs: bloat.customGlyphs || {},
                            syllabaryMap: bloat.syllabaryMap || {},
                            featuralComponents: bloat.featuralComponents || {},
                            alphabetGlyphs: bloat.alphabetGlyphs || {},
                            customFontBase64: bloat.customFontBase64 || null,
                            customFont: bloat.customFont || null,
                            puaCounter: bloat.puaCounter || 57344,
                        };
                        await saveLargeDataToDB(projectId, { [defaultScriptId]: migratedData });
                        defaultScriptData = migratedData;
                    }

                    // Extract ALL script data from bloat
                    const scriptSystems = state.scriptSystems || [];
                    const scriptDataById = {};
                    scriptSystems.forEach(s => {
                        if (bloat[s.id]) {
                            scriptDataById[s.id] = bloat[s.id];
                        }
                    });
                    // Ensure defaultScriptData is present
                    scriptDataById[defaultScriptId] = defaultScriptData;

                    if (defaultScriptData) {
                        const font = defaultScriptData.customFontBase64 || defaultScriptData.customFont || null;
                        set((prev) => ({
                            customFont: font,
                            customFontBase64: font,
                            syllabaryMap: defaultScriptData.syllabaryMap || {},
                            customGlyphs: defaultScriptData.customGlyphs || {},
                            featuralComponents: defaultScriptData.featuralComponents || prev.featuralComponents,
                            alphabetGlyphs: defaultScriptData.alphabetGlyphs || prev.alphabetGlyphs,
                            puaCounter: defaultScriptData.puaCounter || prev.puaCounter,
                            scriptDataById: {
                                ...prev.scriptDataById,
                                ...scriptDataById,
                            },
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
                    if (newConfig.alphabetGlyphs) bloat.alphabetGlyphs = newConfig.alphabetGlyphs;
                    if (newConfig.featuralComponents) bloat.featuralComponents = newConfig.featuralComponents;
                    if (newConfig.scriptDataById) {
                        Object.keys(newConfig.scriptDataById).forEach(id => {
                            bloat[id] = newConfig.scriptDataById[id];
                        });
                    }
                    if (Object.keys(bloat).length > 0) saveLargeDataToDB(projectId, bloat);
                }
                // Repair script systems if present
                if (newConfig.scriptSystems) {
                    const repaired = repairScriptSystems({ ...INITIAL_CONFIG, ...newConfig });
                    newConfig.scriptSystems = repaired.scriptSystems;
                    newConfig.scriptRules = { ...(newConfig.scriptRules || {}), ...repaired.scriptRules };
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
                if (existing && typeof existing === 'object') {
                    return { wikiPages: { ...state.wikiPages, [pageId]: { ...existing, content } } };
                }
                return { wikiPages: { ...state.wikiPages, [pageId]: content } };
            }),

            addWikiPage: (pageId, title, type = 'wiki', parentId = null) => set((state) => {
                const siblings = Object.keys(state.wikiPages).filter(k => {
                    const p = state.wikiPages[k];
                    const pId = typeof p === 'object' ? p.parentId : null;
                    return pId === parentId;
                });
                const maxOrder = siblings.reduce((max, k) => {
                    const p = state.wikiPages[k];
                    const o = typeof p === 'object' && p.order !== undefined ? p.order : 0;
                    return Math.max(max, o);
                }, -1);
                const nextOrder = maxOrder + 1;

                const newPage = type === 'notebook' 
                    ? { type: 'notebook', title: title, expanded: true, order: nextOrder, parentId }
                    : type === 'corpus'
                        ? { type: 'corpus', title: title, content: '', parentId, order: nextOrder }
                        : { type: 'wiki', title: title, content: `<h1>${title}</h1><p>Start typing...</p>`, parentId, order: nextOrder };

                return {
                    wikiPages: {
                        ...state.wikiPages,
                        [pageId]: newPage
                    },
                    activity: [{ text: `Created document: ${title}`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
                };
            }),

            deleteWikiPage: (pageId) => set((state) => {
                const newPages = { ...state.wikiPages };
                delete newPages[pageId];
                
                // Delete children if this is a notebook
                for (const k in newPages) {
                    if (newPages[k] && typeof newPages[k] === 'object' && newPages[k].parentId === pageId) {
                        delete newPages[k];
                    }
                }
                
                return {
                    wikiPages: newPages,
                    activity: [{ text: `Deleted document`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
                };
            }),

            updateWikiPageMetadata: (pageId, newTitle, newIcon) => set((state) => {
                const existing = state.wikiPages[pageId];
                if (!existing) return {};
                const pageObj = typeof existing === 'string' 
                    ? { type: 'wiki', title: newTitle, icon: newIcon, content: existing }
                    : { ...existing, title: newTitle, icon: newIcon };
                return {
                    wikiPages: { ...state.wikiPages, [pageId]: pageObj }
                };
            }),

            moveWikiPage: (pageId, newParentId) => set((state) => {
                const existing = state.wikiPages[pageId];
                if (!existing) return {};
                
                const pageObj = typeof existing === 'string' 
                    ? { type: 'wiki', title: pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), content: existing }
                    : { ...existing };
                
                if (newParentId === 'root') delete pageObj.parentId;
                else pageObj.parentId = newParentId;

                return {
                    wikiPages: { ...state.wikiPages, [pageId]: pageObj }
                };
            }),

            reorderWikiPage: (pageId, direction) => set((state) => {
                const pages = state.wikiPages || {};
                const targetPage = pages[pageId];
                if (!targetPage) return {};
                
                const parentId = typeof targetPage === 'object' ? targetPage.parentId : null;
                
                const siblings = Object.keys(pages)
                    .filter(k => {
                        const p = pages[k];
                        const pId = typeof p === 'object' ? p.parentId : null;
                        return pId === parentId;
                    })
                    .sort((a, b) => {
                        const orderA = typeof pages[a] === 'object' && pages[a].order !== undefined ? pages[a].order : 0;
                        const orderB = typeof pages[b] === 'object' && pages[b].order !== undefined ? pages[b].order : 0;
                        return orderA - orderB;
                    });
                
                const idx = siblings.indexOf(pageId);
                if (idx < 0) return {};

                const newIdx = direction === 'up' ? idx - 1 : idx + 1;
                if (newIdx < 0 || newIdx >= siblings.length) return {};

                [siblings[idx], siblings[newIdx]] = [siblings[newIdx], siblings[idx]];

                const newPages = { ...pages };
                siblings.forEach((k, i) => {
                    const p = newPages[k];
                    if (typeof p === 'string') {
                        newPages[k] = { type: 'wiki', title: k, content: p, order: i };
                    } else {
                        newPages[k] = { ...p, order: i };
                    }
                });

                return { wikiPages: newPages };
            }),

            logActivity: (text) => set((state) => ({
                activity: [{ text, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
            })),

            unlockBadge: (badgeId) => set((state) => {
                const badges = state.unlockedBadges || [];
                if (!badges.includes(badgeId)) {
                    return { unlockedBadges: [...badges, badgeId] };
                }
                return {};
            }),

            // ── Script System Actions ───────────────────────────────────────

            addScriptSystem: (partialScript) => set((state) => {
                const id = partialScript.id || `script-${Date.now()}`;
                const name = normalizeScriptName(partialScript.name, `Script ${(state.scriptSystems || []).length + 1}`);
                const type = normalizeScriptType(partialScript.type || 'alphabetic');
                const isFirst = !state.scriptSystems || state.scriptSystems.length === 0;

                const newScript = {
                    id,
                    name,
                    type,
                    isDefault: isFirst,
                    alphabeticScript: partialScript.alphabeticScript || 'latin',
                    writingDirection: partialScript.writingDirection || 'ltr',
                    syllabificationAlgorithm: partialScript.syllabificationAlgorithm || 'ltr',
                    blockSettings: partialScript.blockSettings || INITIAL_CONFIG.blockSettings,
                    blockTemplates: partialScript.blockTemplates || [],
                    alphabetNames: partialScript.alphabetNames || {},
                    ...partialScript,
                    id,
                    name,
                    type,
                };

                const scriptSystems = [...(state.scriptSystems || []), newScript];
                const scriptRules = { ...(state.scriptRules || {}) };
                if (isFirst) {
                    scriptRules.defaultScriptId = id;
                }

                return {
                    scriptSystems,
                    scriptRules,
                    activeScriptSystemId: id,
                    activity: [{ text: `Created script: ${name}`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15),
                };
            }),

            removeScriptSystem: (scriptId) => set((state) => {
                const systems = state.scriptSystems || [];
                if (systems.length <= 1) return {}; // Cannot remove last script

                const remaining = systems.filter(s => s.id !== scriptId);
                if (remaining.length === 0) return {};

                const removedScript = systems.find(s => s.id === scriptId);
                const wasDefault = removedScript?.isDefault;

                // If removed was default, set first remaining as default
                if (wasDefault) {
                    remaining[0].isDefault = true;
                }

                const scriptRules = { ...(state.scriptRules || {}) };
                if (wasDefault) {
                    scriptRules.defaultScriptId = remaining[0].id;
                }
                // Clear rules pointing to removed script
                if (scriptRules.wordClasses) {
                    Object.keys(scriptRules.wordClasses).forEach(k => {
                        if (scriptRules.wordClasses[k] === scriptId) delete scriptRules.wordClasses[k];
                    });
                }
                if (scriptRules.tags) {
                    Object.keys(scriptRules.tags).forEach(k => {
                        if (scriptRules.tags[k] === scriptId) delete scriptRules.tags[k];
                    });
                }
                if (scriptRules.personCategories) {
                    Object.keys(scriptRules.personCategories).forEach(k => {
                        if (scriptRules.personCategories[k] === scriptId) delete scriptRules.personCategories[k];
                    });
                }
                if (scriptRules.roles) {
                    Object.keys(scriptRules.roles).forEach(k => {
                        if (scriptRules.roles[k] === scriptId) delete scriptRules.roles[k];
                    });
                }

                // Remove script data from runtime
                const scriptDataById = { ...(state.scriptDataById || {}) };
                delete scriptDataById[scriptId];

                const activeScriptSystemId = state.activeScriptSystemId === scriptId
                    ? (scriptRules.defaultScriptId || remaining[0].id)
                    : state.activeScriptSystemId;

                return {
                    scriptSystems: remaining,
                    scriptRules,
                    scriptDataById,
                    activeScriptSystemId,
                    activity: [{ text: `Removed script: ${removedScript?.name || scriptId}`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15),
                };
            }),

            updateScriptSystem: (scriptId, patch) => set((state) => {
                const systems = (state.scriptSystems || []).map(s => {
                    if (s.id !== scriptId) return s;
                    const updated = { ...s, ...patch };
                    if (patch.name !== undefined) {
                        updated.name = normalizeScriptName(patch.name, s.name);
                    }
                    if (patch.type !== undefined) {
                        updated.type = normalizeScriptType(patch.type);
                    }
                    return updated;
                });
                return { scriptSystems: systems };
            }),

            setDefaultScriptSystem: (scriptId) => set((state) => {
                const systems = (state.scriptSystems || []).map(s => ({
                    ...s,
                    isDefault: s.id === scriptId,
                }));
                const scriptRules = {
                    ...(state.scriptRules || {}),
                    defaultScriptId: scriptId,
                };
                return { scriptSystems: systems, scriptRules };
            }),

            setActiveScriptSystem: (scriptId) => set({ activeScriptSystemId: scriptId }),

            setScriptRule: (ruleGroup, key, scriptId) => set((state) => {
                const normalized = normalizeRuleKey(key);
                const scriptRules = { ...(state.scriptRules || {}) };
                if (!scriptRules[ruleGroup]) scriptRules[ruleGroup] = {};
                scriptRules[ruleGroup][normalized] = scriptId;
                return { scriptRules };
            }),

            clearScriptRule: (ruleGroup, key) => set((state) => {
                const normalized = normalizeRuleKey(key);
                const scriptRules = { ...(state.scriptRules || {}) };
                if (scriptRules[ruleGroup]) {
                    delete scriptRules[ruleGroup][normalized];
                }
                return { scriptRules };
            }),

            updateScriptData: (scriptId, patch) => set((state) => {
                const scriptDataById = { ...(state.scriptDataById || {}) };
                scriptDataById[scriptId] = { ...(scriptDataById[scriptId] || {}), ...patch };

                // Mirror to legacy fields if active/default script
                const defaultId = state.scriptRules?.defaultScriptId || 'default';
                const legacyMirror = {};
                if (scriptId === defaultId) {
                    if (patch.customGlyphs) legacyMirror.customGlyphs = patch.customGlyphs;
                    if (patch.syllabaryMap) legacyMirror.syllabaryMap = patch.syllabaryMap;
                    if (patch.customFontBase64) legacyMirror.customFontBase64 = patch.customFontBase64;
                    if (patch.customFont) legacyMirror.customFont = patch.customFont;
                    if (patch.featuralComponents) legacyMirror.featuralComponents = patch.featuralComponents;
                    if (patch.alphabetGlyphs) legacyMirror.alphabetGlyphs = patch.alphabetGlyphs;
                    if (patch.puaCounter) legacyMirror.puaCounter = patch.puaCounter;
                }

                // Save to IndexedDB
                if (state.projectId) {
                    saveLargeDataToDB(state.projectId, { [scriptId]: scriptDataById[scriptId] });
                }

                return { scriptDataById, ...legacyMirror };
            }),

            rehydrateScriptData: async (scriptId) => {
                const state = useConfigStore.getState();
                if (!state.projectId) return;
                const data = await loadScriptDataFromDB(state.projectId, scriptId);
                if (data) {
                    set((prev) => ({
                        scriptDataById: {
                            ...prev.scriptDataById,
                            [scriptId]: data,
                        },
                    }));
                }
            },

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
                    const scriptDataPatch = {};
                    const defaultScriptId = state.scriptRules?.defaultScriptId || 'default';

                    if (newConfig.customFontBase64) {
                        bloat.customFontBase64 = newConfig.customFontBase64;
                        bloat.customFont = newConfig.customFontBase64;
                        scriptDataPatch.customFontBase64 = newConfig.customFontBase64;
                        scriptDataPatch.customFont = newConfig.customFontBase64;
                    } else if (newConfig.customFont) {
                        bloat.customFont = newConfig.customFont;
                        bloat.customFontBase64 = newConfig.customFont;
                        scriptDataPatch.customFont = newConfig.customFont;
                        scriptDataPatch.customFontBase64 = newConfig.customFont;
                    }
                    if (newConfig.syllabaryMap) { bloat.syllabaryMap = newConfig.syllabaryMap; scriptDataPatch.syllabaryMap = newConfig.syllabaryMap; }
                    if (newConfig.customGlyphs) { bloat.customGlyphs = newConfig.customGlyphs; scriptDataPatch.customGlyphs = newConfig.customGlyphs; }
                    if (newConfig.alphabetGlyphs) { bloat.alphabetGlyphs = newConfig.alphabetGlyphs; scriptDataPatch.alphabetGlyphs = newConfig.alphabetGlyphs; }
                    if (newConfig.featuralComponents) { bloat.featuralComponents = newConfig.featuralComponents; scriptDataPatch.featuralComponents = newConfig.featuralComponents; }
                    if (newConfig.puaCounter) { bloat.puaCounter = newConfig.puaCounter; scriptDataPatch.puaCounter = newConfig.puaCounter; }

                    if (Object.keys(bloat).length > 0) {
                        const currentScriptData = state.scriptDataById?.[defaultScriptId] || {};
                        const mergedScriptData = { ...currentScriptData, ...scriptDataPatch };
                        saveLargeDataToDB(state.projectId, { ...bloat, [defaultScriptId]: mergedScriptData });
                        
                        const newScriptDataById = { ...(state.scriptDataById || {}) };
                        newScriptDataById[defaultScriptId] = mergedScriptData;
                        newConfig.scriptDataById = newScriptDataById;
                    }
                }

                return { ...newConfig, activity: newActivity };
            }),
        }),
        {
            name: 'conlang-config',
            version: 2,
            migrate: (persistedState, version) => {
                if (version < 2) {
                    const migrated = migrateConfig(persistedState);
                    if (migrated) return { ...persistedState, ...migrated, configVersion: 2 };
                    return { ...persistedState, configVersion: 2 };
                }
                return persistedState;
            },
            partialize: (state) => {
                // Exclude large fields from localStorage (quota limit)
                const { customFontBase64: _customFontBase64, customFont: _customFont, syllabaryMap: _syllabaryMap, customGlyphs: _customGlyphs, scriptDataById: _scriptDataById, featuralComponents: _fe, alphabetGlyphs: _ag, isRehydrating: _ir, ...rest } = state;
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
        const { customFontBase64: _customFontBase64, customFont: _customFont, syllabaryMap: _syllabaryMap, customGlyphs: _customGlyphs, isRehydrating: _isRehydrating, scriptDataById: _scriptDataById, featuralComponents: _fe, alphabetGlyphs: _ag, ...rest } = state;
        channel.postMessage(JSON.stringify(rest));
    });

    channel.onmessage = (evt) => {
        externalUpdate = true;
        useConfigStore.setState(JSON.parse(evt.data));
    };
}
