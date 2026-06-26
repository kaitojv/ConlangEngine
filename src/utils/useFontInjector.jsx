import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";

// Pre-defined list of premium Google Fonts available for the user
export const CONLANG_FONTS = [
    { name: 'Outfit', category: 'sans-serif' },
    { name: 'Inter', category: 'sans-serif' },
    { name: 'Roboto', category: 'sans-serif' },
    { name: 'Noto Sans', category: 'sans-serif' },
    { name: 'Lora', category: 'serif' },
    { name: 'Merriweather', category: 'serif' },
    { name: 'Noto Serif', category: 'serif' },
    { name: 'Playfair Display', category: 'serif' },
    { name: 'Fira Code', category: 'monospace' },
    { name: 'JetBrains Mono', category: 'monospace' },
    { name: 'Caveat', category: 'handwriting' },
    { name: 'Pacifico', category: 'handwriting' },
    { name: 'Dancing Script', category: 'handwriting' },
    { name: 'Cinzel', category: 'serif' },
    { name: 'Cormorant Garamond', category: 'serif' },
    { name: 'Space Mono', category: 'monospace' },
    { name: 'Arial', category: 'sans-serif', isSystem: true },
    { name: 'Times New Roman', category: 'serif', isSystem: true },
    { name: 'Courier New', category: 'monospace', isSystem: true }
];

export function useFontInjector(){

    const conlangFontFamily = useConfigStore((state) => state.conlangFontFamily) || "'Outfit', sans-serif";
    const typographySettings = useConfigStore((state) => state.typographySettings);

    useEffect(() => {
        // 1. Inject the Google Font stylesheet if it's a web font
        const fontName = conlangFontFamily.replace(/['"]/g, '').split(',')[0].trim();
        const fontConfig = CONLANG_FONTS.find(f => f.name === fontName);
        
        if (fontConfig && !fontConfig.isSystem) {
            const fontUrlId = `google-font-${fontName.replace(/\s+/g, '-')}`;
            if (!document.getElementById(fontUrlId)) {
                const link = document.createElement('link');
                link.id = fontUrlId;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:ital,wght@0,400;0,700;1,400&display=swap`;
                document.head.appendChild(link);
            }
        }

        // 2. Update the dynamic CSS classes
        let styleNode = document.getElementById('custom-font');
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = 'custom-font';
            document.head.appendChild(styleNode);
        }

        // Apply styles to all relevant conlang text classes
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
                font-family: ${conlangFontFamily} !important;
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
    }, [conlangFontFamily, typographySettings]);    
}