import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);

    useEffect(() => {
        let styleNode = document.getElementById('custom-font');
        if (!customFont){
            if (styleNode) styleNode.remove();
            if (document.fonts) {
                try {
                    document.fonts.clear(); // Force the browser to dump the JS-loaded font from memory!
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

        const uniqueFontName = 'ConlangCustomFont_' + Date.now();
        
        // Use the modern FontFace API to load the massive base64 string. 
        // This prevents the browser from crashing when parsing huge inline <style> tags.
        const newFont = new FontFace(uniqueFontName, `url('${safeFontUrl}')`);
        newFont.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
        }).catch(err => console.error("Browser failed to decode custom font:", err));

        styleNode.innerHTML = `
        .notranslate, 
            .custom-font-text,
            .conlang-word,
            .word-text,
            .word,
            .dictionary-word,
            .lexicon-word,
            .matrix-base-word,
            #syllabary-render-area span, 
            #syllabary-render-area input,
            #f-ideogram, 
            #edit-ideogram,
            #alphabet-render-area div {
                font-family: '${uniqueFontName}', sans-serif !important;
                font-weight: normal !important;
                font-style: normal !important;
            }
        `;
    }, [customFont]);    
}