import { useEffect, useRef } from 'react';
import { compileFont } from '../utils/fontCompiler.jsx';
import {
    getDefaultScriptId,
    getScriptData,
    getScriptSystem,
    getScriptTypographySettings,
    mergeScriptGlyphs,
    repairScriptSystems,
} from '../utils/scriptResolver.js';
import { buildFontCompileSignature } from '../utils/useFontInjector.jsx';
import { sanitizeCssFontUrl, sanitizeCssValue } from '../utils/sanitizeHtml.js';

const _publicCompiledFontCache = new Map();

function normalizeFontUrl(fontStr) {
    if (!fontStr || typeof fontStr !== 'string') return '';
    const trimmed = fontStr.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('data:') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `data:font/truetype;base64,${trimmed}`;
}

const VALID_WRITING_DIRECTIONS = ['ltr', 'rtl', 'vertical-rl', 'vertical-lr'];

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
export function usePublicFontInjector(config, activeScriptId = null) {
    const loadedFontsRef = useRef([]);

    useEffect(() => {
        if (!config) return;
        let isCancelled = false;

        const loadAndInject = async () => {
            const { scriptSystems, scriptRules } = repairScriptSystems(config);
            const normConfig = { ...config, scriptSystems, scriptRules };
            const defaultScriptId = getDefaultScriptId(normConfig);
            const primaryScriptId = (activeScriptId && activeScriptId !== 'auto' && activeScriptId !== 'latin')
                ? activeScriptId
                : defaultScriptId;
            const primaryTypo = getScriptTypographySettings(normConfig, primaryScriptId);

            // Build a map of scriptId → font base64 string(s)
            const scriptFontMap = {};
            const allCandidateIds = new Set([
                ...scriptSystems.map(s => s.id),
                ...Object.keys(config.scriptDataById || {}),
                defaultScriptId,
            ]);

            for (const scriptId of allCandidateIds) {
                const scriptData = getScriptData(normConfig, scriptId);
                let font = scriptData?.customFontBase64 || scriptData?.customFont;
                const mergedGlyphs = mergeScriptGlyphs(normConfig, scriptId);
                const hasGlyphs = Object.keys(mergedGlyphs).length > 0;
                const sTypo = getScriptTypographySettings(normConfig, scriptId);
                const compileSig = hasGlyphs ? buildFontCompileSignature(mergedGlyphs, sTypo) : '';
                const isStale = Boolean(
                    font &&
                    hasGlyphs &&
                    (
                        (scriptData?.compiledSignature && scriptData.compiledSignature !== compileSig) ||
                        (!scriptData?.compiledSignature && Object.keys(mergedGlyphs).length > Object.keys(scriptData?.customGlyphs || {}).length)
                    )
                );

                if ((!font || isStale) && hasGlyphs) {
                    const cacheKey = `${scriptId}:${compileSig}`;
                    if (_publicCompiledFontCache.has(cacheKey)) {
                        font = _publicCompiledFontCache.get(cacheKey);
                    } else {
                        try {
                            font = await compileFont(
                                mergedGlyphs,
                                sTypo.traceWidth ?? 30,
                                sTypo.customFontScale ?? 1.0,
                                {
                                    consistentCharacterSize: sTypo.consistentCharacterSize ?? true,
                                    fixedAdvanceWidth: sTypo.fixedAdvanceWidth ?? 1000
                                }
                            );
                            if (font) {
                                _publicCompiledFontCache.set(cacheKey, font);
                            }
                        } catch (e) {
                            console.warn("Could not compile customGlyphs for script", scriptId, e);
                        }
                    }
                }
                if (font) {
                    const fonts = Array.isArray(font) ? font.filter(Boolean) : [font];
                    if (fonts.length > 0) {
                        scriptFontMap[scriptId] = fonts;
                    }
                }
            }

            if (isCancelled) return;
            const scriptIdsWithFont = Object.keys(scriptFontMap);

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

            for (const scriptId of scriptIdsWithFont) {
                const fontFamily = safePublicFamily(instanceId, scriptId);
                const fontStrings = scriptFontMap[scriptId];

                const scriptPromises = fontStrings.map(fontStr => {
                    const normalizedUrl = normalizeFontUrl(fontStr);
                    const safeFontUrl = sanitizeCssFontUrl(normalizedUrl);
                    if (!safeFontUrl) return Promise.reject(new Error('Invalid font URL'));
                    const face = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                    return face.load();
                });

                loadPromises.push(
                    Promise.all(scriptPromises).then(loaded => {
                        loadedByScript[scriptId] = loaded;
                    }).catch(err => {
                        console.warn(`PublicViewer: failed to load font for script ${scriptId}`, err);
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

                const formatSpacing = (val) => {
                    const num = Number(val);
                    return val !== undefined && val !== null && Number.isFinite(num) && num !== 0 ? `${num}em` : 'normal';
                };

                const primaryHasCustomFont = activeScriptId !== 'latin' && Boolean(loadedByScript[primaryScriptId]);
                const primaryFontStack = primaryHasCustomFont
                    ? `'${safePublicFamily(instanceId, primaryScriptId)}', 'Inter', sans-serif`
                    : `'Inter', sans-serif`;

                const primaryScriptMeta = getScriptSystem(normConfig, primaryScriptId);
                const primaryRawDir = primaryScriptMeta?.writingDirection || normConfig.writingDirection || 'ltr';
                const primaryDir = VALID_WRITING_DIRECTIONS.includes(primaryRawDir) ? primaryRawDir : 'ltr';
                const isPrimaryVertical = activeScriptId !== 'latin' && primaryDir.startsWith('vertical');
                const primarySpacing = formatSpacing(
                    isPrimaryVertical ? primaryTypo.verticalLetterSpacing : primaryTypo.letterSpacing
                );

                // Build per-script CSS classes for all scripts (both custom-font and standard-font scripts)
                let perScriptCSS = '';
                const allScriptIds = new Set([
                    ...scriptSystems.map(s => s.id),
                    ...Object.keys(loadedByScript),
                ]);

                for (const scriptId of allScriptIds) {
                    const escapedId = typeof CSS !== 'undefined' && CSS.escape
                        ? CSS.escape(scriptId)
                        : String(scriptId).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
                    const hasFont = Boolean(loadedByScript[scriptId]);
                    const familyStack = hasFont
                        ? `'${safePublicFamily(instanceId, scriptId)}', 'Inter', sans-serif`
                        : `'Inter', sans-serif`;
                    const sTypo = getScriptTypographySettings(normConfig, scriptId);
                    const sLetterSpacing = formatSpacing(sTypo.letterSpacing);
                    const sVerticalSpacing = formatSpacing(sTypo.verticalLetterSpacing);
                    const scriptMeta = getScriptSystem(normConfig, scriptId);
                    const rawDir = scriptMeta?.writingDirection || 'ltr';
                    const scriptDir = VALID_WRITING_DIRECTIONS.includes(rawDir) ? rawDir : 'ltr';
                    const isVertical = scriptDir.startsWith('vertical');
                    const scriptWritingMode = isVertical ? scriptDir : 'horizontal-tb';
                    const scriptTextDir = scriptDir === 'rtl' ? 'rtl' : 'ltr';

                    perScriptCSS += `
                    .conlang-script-${escapedId},
                    .conlang-script-${escapedId} *,
                    .custom-font-text.conlang-script-${escapedId} {
                        font-family: ${familyStack} !important;
                        letter-spacing: ${isVertical ? sVerticalSpacing : sLetterSpacing} !important;
                    }
                    .custom-font-text.conlang-script-${escapedId} {
                        writing-mode: ${scriptWritingMode};
                        direction: ${scriptTextDir};
                        ${isVertical ? 'text-orientation: upright;' : ''}
                    }
                    `;
                }

                styleNode.textContent = `
                    .custom-font-text, .conlang-word, .dict-ipa {
                        font-family: ${primaryFontStack} !important;
                        letter-spacing: ${primarySpacing} !important;
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
        };
    }, [config, activeScriptId]);

    useEffect(() => {
        return () => {
            const node = document.getElementById('public-custom-font');
            if (node) node.remove();
        };
    }, []);
}

