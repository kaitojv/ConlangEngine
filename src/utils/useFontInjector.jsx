import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);
    const isRehydrating = useConfigStore((state) => state.isRehydrating);
    const projectId = useConfigStore((state) => state.projectId);

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

        // Remove 'charset=utf-8' as it corrupts binary font decoding!
        // Base64 fonts are binary, and forcing utf-8 causes the browser to reject them.
        let safeFontUrl = customFont.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');

        const fontName = 'ConlangCustomFont';
        
        // Use the modern FontFace API to load the massive base64 string. 
        const newFont = new FontFace(fontName, `url('${safeFontUrl}')`);
        newFont.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            
            // Apply styles only after font is successfully added to the browser's font cache
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
                }
            `;
        }).catch(err => {
            console.error("Browser failed to decode custom font:", err);
        });
    }, [customFont, isRehydrating, projectId]);    
}