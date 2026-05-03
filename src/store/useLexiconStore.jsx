import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLexiconStore = create(
    persist(
        (set, get) => ({

            lexicon: [],

            setLexicon: (newLexicon) => set({ lexicon: newLexicon }),

            addWord: (newWordData) => set((state) => {
                const newEntry = {
                    id: Date.now() + Math.random(),
                    word: newWordData.word,
                    ipa: newWordData.ipa || '',
                    wordClass: newWordData.wordClass,
                    translation: newWordData.translation,
                    tags: newWordData.tags || [],
                    ideogram: newWordData.ideogram || '',
                    personCategory: newWordData.personCategory || '',
                    inflectionOverrides: {},
                    createdAt: Date.now()
                };
                return { lexicon: [...(state.lexicon || []), newEntry] };
            }),

            updateWord: (id, updatedFields) => set((state) => ({
                lexicon: (state.lexicon || []).map(word =>
                    word.id === id ? { ...word, ...updatedFields } : word
                )
            })),

            deleteWord: (id) => set((state) => ({
                lexicon: (state.lexicon || []).filter(word => word.id !== id)
            })),

            checkDuplicate: (word, translation) => {
                const state = get();
                const currentLexicon = state?.lexicon || [];
                const cleanInputWord = word.replace(/\*/g, '').toLowerCase();
                const cleanInputTrans = translation.toLowerCase();

                let isDuplicateWord = false;
                let isDuplicateTranslation = false;

                currentLexicon.forEach(entry => {
                    const cleanDbWord = entry.word.replace(/\*/g, '').toLowerCase();
                    const cleanDbTrans = entry.translation.toLowerCase();
                    if (word && cleanDbWord === cleanInputWord) isDuplicateWord = true;
                    if (translation && cleanDbTrans === cleanInputTrans) isDuplicateTranslation = true;
                });

                return { isDuplicateWord, isDuplicateTranslation };
            }
        }),
        { name: 'conlang-lexicon' }
    )
);