import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";
import { getDefaultScriptId } from "./scriptResolver.js";


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);
    const scriptDataById = useConfigStore((state) => state.scriptDataById);
    const isRehydrating = useConfigStore((state) => state.isRehydrating);
    const projectId = useConfigStore((state) => state.projectId);
    const typographySettings = useConfigStore((state) => state.typographySettings);
    const scriptRules = useConfigStore((state) => state.scriptRules);
    const scriptSystems = useConfigStore((state) => state.scriptSystems);

    useEffect(() => {
        let styleNode = document.getElementById('custom-font');

        // Build a map of scriptId → font base64 string(s)
        const scriptFontMap = {};

        // Resolve default script ID using the same logic as the rest of the app
        const config = { scriptRules, scriptSystems };
        const defaultScriptId = getDefaultScriptId(config);

        // Collect fonts from scriptDataById (the primary source)
        if (scriptDataById) {
            Object.entries(scriptDataById).forEach(([scriptId, scriptData]) => {
                const font = scriptData?.customFontBase64 || scriptData?.customFont;
                if (font) {
                    scriptFontMap[scriptId] = Array.isArray(font) ? font.filter(Boolean) : [font];
                }
            });
        }

        // Legacy fallback: root-level customFont for projects that predate multi-script
        if (customFont && !scriptFontMap[defaultScriptId]) {
            const rootFonts = Array.isArray(customFont) ? customFont.filter(Boolean) : [customFont];
            if (rootFonts.length > 0) {
                scriptFontMap[defaultScriptId] = rootFonts;
            }
        }

        const scriptIds = Object.keys(scriptFontMap);

        if (scriptIds.length === 0) {
            // If we are currently rehydrating a project, don't clear the font yet!
            // This prevents a "flash" of empty characters during page refresh.
            if (isRehydrating || projectId) return;

            if (styleNode) styleNode.remove();
            if (document.fonts) {
                try {
                    document.fonts.clear(); 
                } catch (e) { console.error("Could not clear memory fonts:", e); }
            }
            return;
        }

        // Load each script's font under a unique font family name
        const loadPromises = [];
        const loadedByScript = {};
        const newFontFaces = new Set();

        for (const scriptId of scriptIds) {
            const fontFamily = `ConlangScript_${scriptId}`;
            const fontStrings = scriptFontMap[scriptId];

            const scriptPromises = fontStrings.map(fontStr => {
                const safeFontStr = typeof fontStr === 'string' ? fontStr : String(fontStr);
                // Remove 'charset=utf-8' as it corrupts binary font decoding!
                const safeFontUrl = safeFontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
                const newFont = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                return newFont.load();
            });

            loadPromises.push(
                Promise.all(scriptPromises).then(loaded => {
                    loadedByScript[scriptId] = loaded;
                    loaded.forEach(f => newFontFaces.add(f));
                })
            );
        }

        Promise.all(loadPromises).then(() => {
            // Add all newly loaded font faces to the document FIRST
            for (const scriptId of Object.keys(loadedByScript)) {
                loadedByScript[scriptId].forEach(face => document.fonts.add(face));
            }

            // THEN clear old fonts to prevent flashing. Collect them in an array first to avoid mutating during iteration.
            if (document.fonts) {
                const fontsToDelete = [];
                document.fonts.forEach(f => {
                    if (typeof f.family === 'string' && (
                        f.family.startsWith('ConlangScript_') ||
                        f.family.startsWith("'ConlangScript_") ||
                        f.family === 'ConlangCustomFont' ||
                        f.family === "'ConlangCustomFont'"
                    )) {
                        // Don't delete the ones we just added!
                        if (!newFontFaces.has(f)) {
                            fontsToDelete.push(f);
                        }
                    }
                });
                fontsToDelete.forEach(f => {
                    try { document.fonts.delete(f); } catch (e) { /* ignore */ }
                });
            }

            const letterSpacingCSS = typographySettings?.letterSpacing
                ? typographySettings.letterSpacing + 'em'
                : 'normal';

            const verticalLetterSpacingCSS = typographySettings?.verticalLetterSpacing !== undefined
                ? typographySettings.verticalLetterSpacing + 'em'
                : 'normal';

            // The default script's font family — used by the broad .custom-font-text selector
            // so all existing class-based rendering continues to work for the main script
            const defaultFontFamily = `ConlangScript_${defaultScriptId}`;

            // Build per-script CSS classes: .conlang-script-{scriptId}
            let perScriptCSS = '';
            for (const scriptId of Object.keys(loadedByScript)) {
                const family = `ConlangScript_${scriptId}`;
                perScriptCSS += `
                .conlang-script-${CSS.escape(scriptId)} {
                    font-family: '${family}', sans-serif !important;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${letterSpacingCSS} !important;
                }
                .conlang-script-${CSS.escape(scriptId)}[data-writing-direction="vertical"] {
                    letter-spacing: ${verticalLetterSpacingCSS} !important;
                }
                `;
            }

            // Apply styles only after fonts are successfully added to the browser's font cache
            if (!styleNode) {
                styleNode = document.createElement('style');
                styleNode.id = 'custom-font';
                document.head.appendChild(styleNode);
            }

            styleNode.innerHTML = `
                .custom-font-text,
                .conlang-word,
                .word-text,
                .word,
                .lexicon-word,
                .matrix-base-word,
                .entry-main-word,
                #syllabary-render-area span, 
                #syllabary-render-area input,
                #f-ideogram, 
                #edit-ideogram,
                #alphabet-render-area div {
                    font-family: '${defaultFontFamily}', 'Inter', sans-serif;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${letterSpacingCSS} !important;
                }

                [data-writing-direction="vertical"].custom-font-text,
                [data-writing-direction="vertical"].conlang-word,
                [data-writing-direction="vertical"].word-text,
                [data-writing-direction="vertical"].word,
                [data-writing-direction="vertical"].lexicon-word,
                [data-writing-direction="vertical"].matrix-base-word,
                [data-writing-direction="vertical"].entry-main-word {
                    letter-spacing: ${verticalLetterSpacingCSS} !important;
                }

                .custom-font-text::placeholder,
                .conlang-word::placeholder,
                .word-text::placeholder,
                .word::placeholder,
                .lexicon-word::placeholder,
                .matrix-base-word::placeholder,
                .entry-main-word::placeholder,
                #syllabary-render-area input::placeholder {
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: normal !important;
                }

                ${perScriptCSS}
            `;
        }).catch(err => {
            console.error("Browser failed to decode custom font arrays:", err);
        });
    }, [customFont, scriptDataById, isRehydrating, projectId, typographySettings, scriptRules, scriptSystems]);    
}