import {create} from 'zustand';
import { persist } from 'zustand/middleware';

export const INITIAL_CONFIG = {
    projectId: null,
    conlangName: 'My New Conlang',
    authorName: 'Author Name',
    description: 'A brief description of your conlang.',
    phonologyTypes: 'alphabetic',
    syntaxOrder:'SVO',
    writingDirection: 'ltr',
    consonants:'p, t, k, m, n, s, l, r',
    vowels:'a, e, i, o, u',
    syllablePattern: 'CVC, VC, CV...',
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
        card: '#1e1e1e',
        header: '#2d2d2d',
        font: '#ffffff'
    },
    customGlyphs: {},
    puaCounter: 57344,      
    customFontBase64: null, 
};

export const useConfigStore = create(
    persist(
        (set) => ({
            ...INITIAL_CONFIG,

            setFullConfig: (newConfig) => set(() => ({ ...INITIAL_CONFIG, ...newConfig })),
            
            addCustomGlyph: (charCode, strokesArray, base64Font) => set((state) => ({
                customGlyphs: { ...state.customGlyphs, [charCode]: strokesArray },
                customFontBase64: base64Font,
                activity: [{ text: `Created custom glyph (${charCode})`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
            })),

            incrementPuaCounter: () => set((state) => ({ puaCounter: state.puaCounter + 1 })),
            
            saveWikiPage: (pageId, content) => set((state) => ({
                wikiPages: { ...state.wikiPages, [pageId]: content }
                // We don't log saveWikiPage to prevent the 3-second auto-save from flooding the timeline!
            })),
            addWikiPage: (pageId, title) => set((state) => ({
                wikiPages: { ...state.wikiPages, [pageId]: `<h1>${title}</h1><p>Start typing...</p>` },
                activity: [{ text: `Created wiki page: ${title}`, time: new Date().toISOString() }, ...(state.activity || [])].slice(0, 15)
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
                        return { ...newConfig, activity: newActivity };
                    }
                }

                newActivity = [{ text, time: now }, ...newActivity].slice(0, 15);
                return { ...newConfig, activity: newActivity };
            }),
        }),
        {name: 'conlang-config'}
    )
);