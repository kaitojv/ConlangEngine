// src/hooks/useThemeInjector.jsx
import { useEffect } from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';

export function useThemeInjector() {
    const colors = useConfigStore((state) => state.colors);
    const appUiFont = useConfigStore((state) => state.appUiFont) || "'Outfit', sans-serif";

    useEffect(() => {
        // Handle App UI Font Injection
        if (appUiFont) {
            // Extract font name from the string, which might be e.g. "'Noto Sans', sans-serif" or "Inter"
            let fontName = appUiFont.split(',')[0].replace(/['"]/g, '').trim();
            
            const isSystem = ['Arial', 'Times New Roman', 'Courier New'].includes(fontName);
            const fontId = 'google-font-' + fontName.replace(/\s+/g, '-').toLowerCase();

            if (!isSystem && !document.getElementById(fontId)) {
                const link = document.createElement('link');
                link.id = fontId;
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
                document.head.appendChild(link);
            }

            document.documentElement.style.setProperty('--font-stack', appUiFont);
        }
    }, [appUiFont]);

    useEffect(() => {
        if (!colors) return;
        
        const root = document.documentElement;
        
        // Main colors & Surfaces
        if (colors.bg) root.style.setProperty('--bg', colors.bg);
        if (colors.header) root.style.setProperty('--h-bg', colors.header);
        
        if (colors.s1) root.style.setProperty('--s1', colors.s1);
        if (colors.s2) root.style.setProperty('--s2', colors.s2);
        if (colors.s3) root.style.setProperty('--s3', colors.s3);
        if (colors.s4) root.style.setProperty('--s4', colors.s4);
        
        // Backward compatibility: old presets used 'card' key, map it to --s4
        if (colors.card) root.style.setProperty('--s4', colors.card);
        
        // Texts and Accents
        if (colors.font) root.style.setProperty('--tx', colors.font);
        if (colors.font2) root.style.setProperty('--tx2', colors.font2);
        if (colors.accent) root.style.setProperty('--acc', colors.accent);
        if (colors.accent2) root.style.setProperty('--acc2', colors.accent2);
        if (colors.accent3) root.style.setProperty('--acc3', colors.accent3);
        
        // Borders and Visual Effects
        if (colors.border) root.style.setProperty('--bd', colors.border);
        if (colors.blur !== undefined) root.style.setProperty('--blur', colors.blur);
        if (colors.glow !== undefined) root.style.setProperty('--glow', colors.glow);
        
        // Dynamic Gradients
        if (colors.logoGradient) {
            root.style.setProperty('--logo-gradient', colors.logoGradient);
        } else {
            root.style.removeProperty('--logo-gradient');
        }
        
        if (colors.glowGradient) {
            root.style.setProperty('--glow-gradient', colors.glowGradient);
        } else {
            root.style.removeProperty('--glow-gradient');
        }
        
    }, [colors]); 
}