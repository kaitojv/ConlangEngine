import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);
    const isRehydrating = useConfigStore((state) => state.isRehydrating);
    const projectId = useConfigStore((state) => state.projectId);
    const typographySettings = useConfigStore((state) => state.typographySettings);

    useEffect(() => {
        let styleNode = document.getElementById('custom-font');
        if (!customFont){
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
        const fontStrings = Array.isArray(customFont) ? customFont : [customFont];
        
        // Use the modern FontFace API to load massive base64 strings in parallel
        Promise.all(fontStrings.map(fontStr => {
            // Remove 'charset=utf-8' as it corrupts binary font decoding!
            let safeFontUrl = fontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
            const newFont = new FontFace(fontName, `url('${safeFontUrl}')`);
            return newFont.load();
        })).then((loadedFonts) => {
            loadedFonts.forEach(loadedFont => document.fonts.add(loadedFont));
            
            // Apply styles only after fonts are successfully added to the browser's font cache
            styleNode.innerHTML = `
            .notranslate, 
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
                    font-family: '${fontName}', sans-serif !important;
                    font-weight: normal !important;
                    font-style: normal !important;
                    letter-spacing: ${typographySettings?.letterSpacing || 0}em !important;
                }
            `;
        }).catch(err => {
            console.error("Browser failed to decode custom font arrays:", err);
        });
    }, [customFont, isRehydrating, projectId, typographySettings]);    
}