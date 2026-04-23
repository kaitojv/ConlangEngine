// src/hooks/useThemeInjector.jsx
import { useEffect } from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';

export function useThemeInjector() {
    const colors = useConfigStore((state) => state.colors);

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
        
    }, [colors]); 
}