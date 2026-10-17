// src/hooks/useThemeInjector.jsx
import { useEffect } from 'react';
import { useConfigStore } from '../store/useConfigStore.jsx';

export function useThemeInjector() {
    const colors = useConfigStore((state) => state.colors);
    const appUiFont = useConfigStore((state) => state.appUiFont) || "'Outfit', sans-serif";
    const uiDensity = useConfigStore((state) => state.uiDensity) || 'default';
    const uiRadius = useConfigStore((state) => state.uiRadius) || 'modern';
    const uiPattern = useConfigStore((state) => state.uiPattern) || 'none';

    useEffect(() => {
        const root = document.documentElement;

        // 1. UI Density
        root.setAttribute('data-density', uiDensity);
        if (uiDensity === 'compact') {
            root.style.setProperty('--density-pad-table', '4px 8px');
            root.style.setProperty('--density-pad-card', '12px 14px');
            root.style.setProperty('--density-gap', '6px');
        } else if (uiDensity === 'spacious') {
            root.style.setProperty('--density-pad-table', '14px 18px');
            root.style.setProperty('--density-pad-card', '24px 28px');
            root.style.setProperty('--density-gap', '18px');
        } else {
            root.style.setProperty('--density-pad-table', '8px 12px');
            root.style.setProperty('--density-pad-card', '16px 20px');
            root.style.setProperty('--density-gap', '12px');
        }

        // 2. Corner Geometry
        if (uiRadius === 'sharp') {
            root.style.setProperty('--rad', '2px');
            root.style.setProperty('--rad-sm', '2px');
            root.style.setProperty('--radius', '2px');
        } else if (uiRadius === 'pill') {
            root.style.setProperty('--rad', '24px');
            root.style.setProperty('--rad-sm', '12px');
            root.style.setProperty('--radius', '20px');
        } else {
            // 'modern' default
            root.style.setProperty('--rad', '14px');
            root.style.setProperty('--rad-sm', '8px');
            root.style.setProperty('--radius', '0.625rem');
        }

        // 3. Subtle Background Patterns
        if (uiPattern === 'dots') {
            root.style.setProperty('--pattern-overlay', 'radial-gradient(circle, color-mix(in srgb, var(--tx) 8%, transparent) 1px, transparent 1px)');
            root.style.setProperty('--pattern-size', '20px 20px');
        } else if (uiPattern === 'grid') {
            root.style.setProperty('--pattern-overlay', 'linear-gradient(to right, color-mix(in srgb, var(--tx) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--tx) 6%, transparent) 1px, transparent 1px)');
            root.style.setProperty('--pattern-size', '24px 24px');
        } else if (uiPattern === 'cross') {
            root.style.setProperty('--pattern-overlay', "url(\"data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 9v6M9 12h6' stroke='%23888888' stroke-width='1' stroke-opacity='0.16'/%3E%3C/svg%3E\")");
            root.style.setProperty('--pattern-size', '24px 24px');
        } else {
            root.style.setProperty('--pattern-overlay', 'none');
            root.style.setProperty('--pattern-size', 'auto');
        }
    }, [uiDensity, uiRadius, uiPattern]);

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