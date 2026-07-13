import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);
    const scriptDataById = useConfigStore((state) => state.scriptDataById);
    const isRehydrating = useConfigStore((state) => state.isRehydrating);
    const projectId = useConfigStore((state) => state.projectId);
    const typographySettings = useConfigStore((state) => state.typographySettings);

    useEffect(() => {
        let styleNode = document.getElementById('custom-font');
        // Collect fonts from root AND all scripts
        const allFonts = new Set();
        
        if (customFont) {
            const rootFonts = Array.isArray(customFont) ? customFont : [customFont];
            rootFonts.forEach(f => f && allFonts.add(f));
        }
        
        if (scriptDataById) {
            Object.values(scriptDataById).forEach(scriptData => {
                const font = scriptData?.customFontBase64 || scriptData?.customFont;
                if (font) {
                    const fonts = Array.isArray(font) ? font : [font];
                    fonts.forEach(f => f && allFonts.add(f));
                }
            });
        }

        const fontStrings = Array.from(allFonts);

        if (fontStrings.length === 0){
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

        if(!styleNode){
            styleNode = document.createElement('style');
            styleNode.id = 'custom-font';
            document.head.appendChild(styleNode);
        
        }

        const fontName = 'ConlangCustomFont';
        
        // Use the modern FontFace API to load massive base64 strings in parallel
        Promise.all(fontStrings.filter(Boolean).map(fontStr => {
            // Remove 'charset=utf-8' as it corrupts binary font decoding!
            const safeFontStr = typeof fontStr === 'string' ? fontStr : String(fontStr);
            let safeFontUrl = safeFontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
            const newFont = new FontFace(fontName, `url('${safeFontUrl}')`);
            return newFont.load();
        })).then((loadedFonts) => {
            if (document.fonts) {
                // Clear existing font faces with the same name to force a repaint when the font updates
                document.fonts.forEach(f => {
                    if (f.family === fontName || f.family === `'${fontName}'`) {
                        document.fonts.delete(f);
                    }
                });
            }
            loadedFonts.forEach(loadedFont => document.fonts.add(loadedFont));
            
            // Apply styles only after fonts are successfully added to the browser's font cache
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
                    font-family: '${fontName}', sans-serif;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${typographySettings?.letterSpacing ? typographySettings.letterSpacing + 'em' : 'normal'} !important;
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
            `;
        }).catch(err => {
            console.error("Browser failed to decode custom font arrays:", err);
        });
    }, [customFont, scriptDataById, isRehydrating, projectId, typographySettings]);    
}