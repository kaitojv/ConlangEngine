import { useEffect, useRef } from 'react';
import { compileFont } from '../utils/fontCompiler.jsx';
import { getScriptTypographySettings } from '../utils/scriptResolver.js';
import { sanitizeCssFontUrl, sanitizeCssValue } from '../utils/sanitizeHtml.js';

const safePublicFamily = (instanceId, scriptId) =>
    `PublicScript_${instanceId}_${String(scriptId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

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
            const safeVal = sanitizeCssValue(val);
            if (!safeVal) return;
            originalStyles[varName] = root.style.getPropertyValue(varName);
            root.style.setProperty(varName, safeVal);
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
        let isCancelled = false;

        const loadAndInject = async () => {
            // Build a map of scriptId → font base64 string(s)
            const scriptFontMap = {};
            const defaultScriptId = config.scriptRules?.defaultScriptId || 'default';
            const defaultTypo = getScriptTypographySettings(config, defaultScriptId);

            // Collect from scriptDataById (multi-script)
            if (config.scriptDataById) {
                for (const [scriptId, scriptData] of Object.entries(config.scriptDataById)) {
                    let font = scriptData?.customFontBase64 || scriptData?.customFont;
                    if (!font && scriptData?.customGlyphs && Object.keys(scriptData.customGlyphs).length > 0) {
                        const sTypo = getScriptTypographySettings(config, scriptId);
                        try {
                            font = await compileFont(
                                scriptData.customGlyphs,
                                sTypo.traceWidth ?? 30,
                                sTypo.customFontScale ?? 1.0,
                                {
                                    consistentCharacterSize: sTypo.consistentCharacterSize ?? true,
                                    fixedAdvanceWidth: sTypo.fixedAdvanceWidth ?? 1000
                                }
                            );
                        } catch (e) {
                            console.warn("Could not compile customGlyphs for script", scriptId, e);
                        }
                    }
                    if (font) {
                        scriptFontMap[scriptId] = Array.isArray(font) ? font.filter(Boolean) : [font];
                    }
                }
            }

            // Legacy/merged fallback: root-level customFontBase64 or customGlyphs
            if (!scriptFontMap[defaultScriptId]) {
                let font = config.customFontBase64 || config.customFont;
                if (!font && config.customGlyphs && Object.keys(config.customGlyphs).length > 0) {
                    try {
                        font = await compileFont(
                            config.customGlyphs,
                            defaultTypo.traceWidth ?? 30,
                            defaultTypo.customFontScale ?? 1.0,
                            {
                                consistentCharacterSize: defaultTypo.consistentCharacterSize ?? true,
                                fixedAdvanceWidth: defaultTypo.fixedAdvanceWidth ?? 1000
                            }
                        );
                    } catch (e) {
                        console.warn("Could not compile root customGlyphs", e);
                    }
                }
                if (font) {
                    const fonts = Array.isArray(font) ? font.filter(Boolean) : [font];
                    if (fonts.length > 0) {
                        scriptFontMap[defaultScriptId] = fonts;
                    }
                }
            }

            if (isCancelled) return;
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
                const fontFamily = safePublicFamily(instanceId, scriptId);
                const fontStrings = scriptFontMap[scriptId];

                const scriptPromises = fontStrings.map(fontStr => {
                    const safeFontUrl = sanitizeCssFontUrl(fontStr);
                    if (!safeFontUrl) return Promise.reject(new Error('Invalid font URL'));
                    const face = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                    return face.load();
                });

                loadPromises.push(
                    Promise.all(scriptPromises).then(loaded => {
                        loadedByScript[scriptId] = loaded;
                    })
                );
            }

            try {
                await Promise.all(loadPromises);
                if (isCancelled) return;

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
                const defaultFontFamily = safePublicFamily(instanceId, defaultScriptId);

                const formatSpacing = (val) => {
                    const num = Number(val);
                    return val !== undefined && val !== null && Number.isFinite(num) && num !== 0 ? `${num}em` : 'normal';
                };
                const defaultSpacing = formatSpacing(defaultTypo.letterSpacing);

                // Build per-script CSS classes
                let perScriptCSS = '';
                for (const scriptId of Object.keys(loadedByScript)) {
                    const family = safePublicFamily(instanceId, scriptId);
                    const sTypo = getScriptTypographySettings(config, scriptId);
                    const sSpacing = formatSpacing(sTypo.letterSpacing);
                    perScriptCSS += `
                    .conlang-script-${CSS.escape(scriptId)},
                    .conlang-script-${CSS.escape(scriptId)} * {
                        font-family: '${family}', 'Inter', sans-serif !important;
                        letter-spacing: ${sSpacing} !important;
                    }
                    `;
                }

                styleNode.textContent = `
                    .custom-font-text, .conlang-word, .dict-ipa {
                        font-family: '${defaultFontFamily}', 'Inter', sans-serif !important;
                        letter-spacing: ${defaultSpacing} !important;
                    }

                    .custom-font-text::placeholder,
                    .conlang-word::placeholder {
                        font-family: 'Inter', sans-serif !important;
                        letter-spacing: normal !important;
                    }

                    ${perScriptCSS}
                `;
            } catch (err) {
                console.error('PublicViewer: failed to load custom font', err);
            }
        };

        loadAndInject();

        return () => {
            isCancelled = true;
            const styleId = 'public-custom-font';
            const node = document.getElementById(styleId);
            if (node) node.remove();
        };
    }, [config]);
}

