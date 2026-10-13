import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { share } from 'shared-zustand';
import { calculateSM2 } from '../utils/sm2.js';
import { getDeviceId } from '../utils/deviceIdentity.js';

// Sync metadata stamped on every *content* edit. Used by the 3-way merge
// engine (src/utils/syncMerge.js) to resolve "edited on both devices" cases.
// SRS/study progress deliberately does NOT stamp this.
const editStamp = () => ({ updatedAt: Date.now(), updatedBy: getDeviceId() });

export const useLexiconStore = create(
    subscribeWithSelector(
        persist(
            (set, get) => ({

                lexicon: [],
                phrases: [],

                setLexicon: (newLexicon) => set({ lexicon: newLexicon }),
                setPhrases: (newPhrases) => set({ phrases: newPhrases }),

                addWord: (newWordData) => set((state) => {
                    const newEntry = {
                        id: newWordData.id || (Date.now() + Math.random()),
                        word: newWordData.word,
                        ipa: newWordData.ipa || '',
                        wordClass: newWordData.wordClass,
                        translation: newWordData.translation,
                        definition: newWordData.definition || '',
                        tags: newWordData.tags || [],
                        tagSource: newWordData.tagSource || 'manual',
                        ideogram: newWordData.ideogram || '',
                        personCategory: newWordData.personCategory || '',
                        tone: newWordData.tone || '',
                        stress: newWordData.stress || '',
                        parentRootId: newWordData.parentRootId || null,
                        derivationRuleId: newWordData.derivationRuleId || null,
                        relatedWords: newWordData.relatedWords || [],
                        inflectionOverrides: {},
                        createdAt: Date.now(),
                        // Multi-script fields
                        scriptOverride: newWordData.scriptOverride || null,
                        scriptForms: (newWordData.scriptForms && typeof newWordData.scriptForms === 'object') ? newWordData.scriptForms : {},
                        scriptRole: typeof newWordData.scriptRole === 'string' ? newWordData.scriptRole : '',
                        etymology: newWordData.etymology || null,
                        isProtoRoot: newWordData.isProtoRoot || false,
                        isPrimary: Boolean(newWordData.isPrimary),
                        ...editStamp(),
                    };
                    return { lexicon: [...(state.lexicon || []), newEntry] };
                }),

                updateWord: (id, updatedFields) => set((state) => {
                    const stamp = editStamp();
                    return {
                        lexicon: (state.lexicon || []).map(word =>
                            word.id === id ? { ...word, ...updatedFields, ...stamp } : word
                        )
                    };
                }),

                updateWordSRS: (id, grade) => set((state) => ({
                    lexicon: (state.lexicon || []).map(word => {
                        if (word.id !== id) return word;
                        const currentSrs = word.srs || {};
                        const newSrs = calculateSM2(grade, currentSrs);
                        return { ...word, srs: newSrs };
                    })
                })),

                deleteWord: (id) => set((state) => ({
                    lexicon: (state.lexicon || []).filter(word => word.id !== id)
                })),

                // ── Phrases Actions ─────────────────────────────────────────

                addPhrase: (newPhraseData) => set((state) => {
                    const newPhrase = {
                        id: newPhraseData.id || (Date.now() + Math.random()),
                        phrase: newPhraseData.phrase,
                        literalTranslation: newPhraseData.literalTranslation || '',
                        idiomaticTranslation: newPhraseData.idiomaticTranslation,
                        register: newPhraseData.register || 'casual',
                        category: newPhraseData.category || 'general',
                        tags: newPhraseData.tags || [],
                        componentWords: newPhraseData.componentWords || [], // Array of word IDs
                        createdAt: Date.now(),
                        ...editStamp(),
                    };
                    return { phrases: [...(state.phrases || []), newPhrase] };
                }),

                updatePhrase: (id, updatedFields) => set((state) => {
                    const stamp = editStamp();
                    return {
                        phrases: (state.phrases || []).map(p =>
                            p.id === id ? { ...p, ...updatedFields, ...stamp } : p
                        )
                    };
                }),

                deletePhrase: (id) => set((state) => ({
                    phrases: (state.phrases || []).filter(p => p.id !== id)
                })),

                // ── Script Actions ─────────────────────────────────────────

                setWordScriptOverride: (id, scriptIdOrNull) => set((state) => {
                    const stamp = editStamp();
                    return {
                        lexicon: (state.lexicon || []).map(word =>
                            word.id === id ? { ...word, scriptOverride: scriptIdOrNull, ...stamp } : word
                        )
                    };
                }),

                setWordScriptForm: (id, scriptId, form) => set((state) => {
                    const stamp = editStamp();
                    return {
                        lexicon: (state.lexicon || []).map(word =>
                            word.id === id ? { ...word, scriptForms: { ...(word.scriptForms || {}), [scriptId]: form }, ...stamp } : word
                        )
                    };
                }),

                clearWordScriptForm: (id, scriptId) => set((state) => {
                    const stamp = editStamp();
                    return {
                        lexicon: (state.lexicon || []).map(word => {
                            if (word.id !== id) return word;
                            const forms = { ...(word.scriptForms || {}) };
                            delete forms[scriptId];
                            return { ...word, scriptForms: forms, ...stamp };
                        })
                    };
                }),

                setWordScriptRole: (id, role) => set((state) => {
                    const stamp = editStamp();
                    return {
                        lexicon: (state.lexicon || []).map(word =>
                            word.id === id ? { ...word, scriptRole: role, ...stamp } : word
                        )
                    };
                }),

                checkDuplicate: (word, translation) => {
                    const state = get();
                    const currentLexicon = state?.lexicon || [];
                    const cleanInputWord = (word || '').replace(/\*/g, '').toLowerCase();
                    const cleanInputTrans = (translation || '').toLowerCase();

                    let isDuplicateWord = false;
                    let isDuplicateTranslation = false;

                    currentLexicon.forEach(entry => {
                        const cleanDbWord = (entry.word || '').replace(/\*/g, '').toLowerCase();
                        const cleanDbTrans = (entry.translation || '').toLowerCase();
                        if (word && cleanDbWord === cleanInputWord) isDuplicateWord = true;
                        if (translation && cleanDbTrans === cleanInputTrans) isDuplicateTranslation = true;
                    });

                    return { isDuplicateWord, isDuplicateTranslation };
                }
            }),
            { name: 'conlang-lexicon' }
        )
    )
);

// Cross-tab sync via BroadcastChannel
// Shares lexicon changes between browser tabs on same device
if (typeof BroadcastChannel !== 'undefined') {
    share('lexicon', useLexiconStore, { ref: 'lexicon' });
}