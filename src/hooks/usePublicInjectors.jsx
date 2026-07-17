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
 * Handles multi-script configs: registers each script's font under a unique
 * family name and generates per-script CSS classes (.conlang-script-{scriptId}).
 * The default script's font is applied to the broad .custom-font-text selector.
 * Uses a unique font name per mount and properly cleans up FontFace objects from document.fonts.
 */
export function usePublicFontInjector(config) {
    const loadedFontsRef = useRef([]);

    useEffect(() => {
        if (!config) return;

        // Build a map of scriptId → font base64 string(s)
        // The public viewer's config has scriptDataById from the raw snapshot
        const scriptFontMap = {};
        const defaultScriptId = config.scriptRules?.defaultScriptId || 'default';

        // Collect from scriptDataById (multi-script)
        if (config.scriptDataById) {
            Object.entries(config.scriptDataById).forEach(([scriptId, scriptData]) => {
                const font = scriptData?.customFontBase64 || scriptData?.customFont;
                if (font) {
                    scriptFontMap[scriptId] = Array.isArray(font) ? font.filter(Boolean) : [font];
                }
            });
        }

        // Legacy/merged fallback: root-level customFontBase64
        if (config.customFontBase64 && !scriptFontMap[defaultScriptId]) {
            const fonts = Array.isArray(config.customFontBase64)
                ? config.customFontBase64.filter(Boolean)
                : [config.customFontBase64];
            if (fonts.length > 0) {
                scriptFontMap[defaultScriptId] = fonts;
            }
        }

        const scriptIds = Object.keys(scriptFontMap);
        if (scriptIds.length === 0) return;

        fontInstanceCounter++;
        const instanceId = fontInstanceCounter;
        const styleId = 'public-custom-font';

        // Ensure the style tag for font-family assignment exists
        let styleNode = document.getElementById(styleId);
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = styleId;
            document.head.appendChild(styleNode);
        }

        const loadPromises = [];
        const loadedByScript = {};

        for (const scriptId of scriptIds) {
            const fontFamily = `PublicScript_${instanceId}_${scriptId}`;
            const fontStrings = scriptFontMap[scriptId];

            const scriptPromises = fontStrings.map(fontStr => {
                const safeFontUrl = fontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
                const face = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                return face.load();
            });

            loadPromises.push(
                Promise.all(scriptPromises).then(loaded => {
                    loadedByScript[scriptId] = loaded;
                })
            );
        }

        Promise.all(loadPromises).then(() => {
            // Remove OLD fonts before registering new ones, but after loading is complete, to avoid flashing
            loadedFontsRef.current.forEach(f => {
                try { document.fonts.delete(f); } catch { /* ignore */ }
            });

            const allFaces = [];
            for (const scriptId of Object.keys(loadedByScript)) {
                loadedByScript[scriptId].forEach(f => {
                    document.fonts.add(f);
                    allFaces.push(f);
                });
            }
            loadedFontsRef.current = allFaces;

            // The default script's font family
            const defaultFontFamily = `PublicScript_${instanceId}_${defaultScriptId}`;

            // Build per-script CSS classes
            let perScriptCSS = '';
            for (const scriptId of Object.keys(loadedByScript)) {
                const family = `PublicScript_${instanceId}_${scriptId}`;
                perScriptCSS += `
                .conlang-script-${CSS.escape(scriptId)} {
                    font-family: '${family}', 'Inter', sans-serif !important;
                }
                `;
            }

            styleNode.innerHTML = `
                .custom-font-text, .conlang-word, .dict-ipa {
                    font-family: '${defaultFontFamily}', 'Inter', sans-serif !important;
                }

                .custom-font-text::placeholder,
                .conlang-word::placeholder {
                    font-family: 'Inter', sans-serif !important;
                    letter-spacing: normal !important;
                }

                ${perScriptCSS}
            `;
        }).catch(err => {
            console.error('PublicViewer: failed to load custom font', err);
        });

        return () => {
            // Remove the style tag, but DO NOT synchronously delete fonts here on config change.
            // The next effect run will clean them up after loading.
            // When the component truly unmounts, this might leave fonts in document.fonts,
            // but they won't be used since the style tag is removed.
            const node = document.getElementById(styleId);
            if (node) node.remove();
        };
    }, [config]);
}

