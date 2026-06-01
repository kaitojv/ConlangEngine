import { useEffect } from 'react';

/**
 * Safely injects the theme colors into the document body for the Public Viewer,
 * ensuring it cleans up when unmounted so it doesn't affect the user's local workspace.
 */
export function usePublicThemeInjector(config) {
    useEffect(() => {
        if (!config || !config.colors) return;
        const colors = config.colors;
        const root = document.documentElement;
        
        // Save original styles to restore them later if needed (mostly important if they navigate back to local workspace)
        const originalStyles = {};
        const applyStyle = (varName, val) => {
            originalStyles[varName] = root.style.getPropertyValue(varName);
            root.style.setProperty(varName, val);
        };

        if (colors.bg) applyStyle('--bg', colors.bg);
        if (colors.s1) applyStyle('--s1', colors.s1);
        if (colors.s2) applyStyle('--s2', colors.s2);
        if (colors.s3) applyStyle('--s3', colors.s3);
        if (colors.s4) applyStyle('--s4', colors.s4);
        if (colors.font) applyStyle('--tx', colors.font);
        if (colors.font2) applyStyle('--tx2', colors.font2);
        if (colors.accent) applyStyle('--acc', colors.accent);
        if (colors.accent2) applyStyle('--acc2', colors.accent2);
        if (colors.accent3) applyStyle('--acc3', colors.accent3);
        if (colors.border) applyStyle('--bd', colors.border);
        if (colors.blur) applyStyle('--blur', colors.blur);
        if (colors.glow) applyStyle('--glow', colors.glow);

        return () => {
            // Restore original styles
            Object.entries(originalStyles).forEach(([varName, val]) => {
                root.style.setProperty(varName, val);
            });
        };
    }, [config]);
}

/**
 * Safely injects the custom font for the Public Viewer.
 */
export function usePublicFontInjector(config) {
    useEffect(() => {
        if (!config || !config.customFontBase64) return;
        
        const styleId = 'public-custom-font';
        let styleNode = document.getElementById(styleId);
        
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = styleId;
            document.head.appendChild(styleNode);
        }
        
        styleNode.innerHTML = `
            @font-face {
                font-family: 'PublicCustomFont';
                src: url(${config.customFontBase64});
            }
            .custom-font-text, .conlang-word, .dict-ipa {
                font-family: 'PublicCustomFont', 'Inter', sans-serif !important;
            }
        `;
        
        return () => {
            const node = document.getElementById(styleId);
            if (node) node.remove();
        };
    }, [config]);
}
