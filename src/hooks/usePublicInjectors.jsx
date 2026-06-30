import { useEffect, useRef } from 'react';

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

// Incrementing counter ensures each mount gets a unique font name,
// preventing stale cached fonts from a previously viewed conlang.
let fontInstanceCounter = 0;

/**
 * Safely injects the custom font for the Public Viewer.
 * Mirrors the main useFontInjector approach: handles array fonts and uses FontFace API.
 * Uses a unique font name per mount and properly cleans up FontFace objects from document.fonts.
 */
export function usePublicFontInjector(config) {
    const loadedFontsRef = useRef([]);

    useEffect(() => {
        if (!config || !config.customFontBase64) return;

        fontInstanceCounter++;
        const fontName = `PublicCustomFont_${fontInstanceCounter}`;
        const styleId = 'public-custom-font';

        // Ensure the style tag for font-family assignment exists
        let styleNode = document.getElementById(styleId);
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = styleId;
            document.head.appendChild(styleNode);
        }

        const fontStrings = Array.isArray(config.customFontBase64)
            ? config.customFontBase64
            : [config.customFontBase64];

        // Use the FontFace API (same as main useFontInjector) so large base64 fonts decode correctly
        Promise.all(fontStrings.map(fontStr => {
            const safeFontUrl = fontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
            const face = new FontFace(fontName, `url('${safeFontUrl}')`);
            return face.load();
        })).then(loadedFonts => {
            loadedFonts.forEach(f => document.fonts.add(f));
            loadedFontsRef.current = loadedFonts;
            styleNode.innerHTML = `
                .custom-font-text, .conlang-word, .dict-ipa {
                    font-family: '${fontName}', 'Inter', sans-serif !important;
                }

                .custom-font-text::placeholder,
                .conlang-word::placeholder {
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: normal !important;
                }
            `;
        }).catch(err => {
            console.error('PublicViewer: failed to load custom font', err);
        });

        return () => {
            // Remove the style tag
            const node = document.getElementById(styleId);
            if (node) node.remove();
            // Remove all FontFace objects we added so they don't leak into the next conlang
            loadedFontsRef.current.forEach(f => {
                try { document.fonts.delete(f); } catch (_) { /* ignore */ }
            });
            loadedFontsRef.current = [];
        };
    }, [config]);
}

