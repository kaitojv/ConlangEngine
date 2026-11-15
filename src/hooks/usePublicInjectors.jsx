import { useEffect, useRef } from 'react';
import { compileFontBufferInWorker } from '../utils/fontCompiler.jsx';
import {
    buildScriptConfig,
    getDefaultScriptId,
    getScriptData,
    getScriptSystem,
    getScriptTypographySettings,
    mergeScriptGlyphs,
    repairScriptSystems,
} from '../utils/scriptResolver.js';
import { transliterateText } from '../utils/transliteration.js';
import { buildFontCompileSignature } from '../utils/useFontInjector.jsx';
import { sanitizeCssFontUrl, sanitizeCssValue } from '../utils/sanitizeHtml.js';
import { getCachedPublicFont, setCachedPublicFont } from '../utils/publicFontCache.js';

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

const PUBLIC_THEME_KEYS = [
    '--bg',
    '--h-bg',
    '--s1',
    '--s2',
    '--s3',
    '--s4',
    '--tx',
    '--tx2',
    '--acc',
    '--acc2',
    '--acc3',
    '--bd',
    '--blur',
    '--glow',
    '--logo-gradient',
    '--glow-gradient',
];

/**
 * Extracts sanitized CSS custom properties for a public conlang config.
 * Shared by both root injection and DOM-scoped wrapper styling in PublicViewer.
 */
export function buildPublicThemeVars(config) {
    const colors = config?.colors;
    if (!colors || typeof colors !== 'object') return {};

    const rawMap = {
        '--bg': colors.bg,
        '--h-bg': colors.header,
        '--s1': colors.s1,
        '--s2': colors.s2,
        '--s3': colors.s3,
        '--s4': colors.s4 || colors.card,
        '--tx': colors.font,
        '--tx2': colors.font2,
        '--acc': colors.accent,
        '--acc2': colors.accent2,
        '--acc3': colors.accent3,
        '--bd': colors.border,
        '--blur': colors.blur,
        '--glow': colors.glow,
        '--logo-gradient': colors.logoGradient,
        '--glow-gradient': colors.glowGradient,
    };

    const result = {};
    for (const [varName, rawVal] of Object.entries(rawMap)) {
        const safeVal = sanitizeCssValue(rawVal);
        if (safeVal) {
            result[varName] = safeVal;
        }
    }
    return result;
}

/**
 * Collects a subset of mergedGlyphs containing only the codepoints needed
 * to render the supplied array of strings (plus space U+0020).
 */
export function collectSubsetGlyphs(mergedGlyphs, renderedTexts) {
    if (!mergedGlyphs || !Array.isArray(renderedTexts)) return {};
    const neededCodes = new Set(['32']);
    for (const str of renderedTexts) {
        if (!str || typeof str !== 'string') continue;
        for (const ch of str) {
            const cp = ch.codePointAt(0);
            if (cp !== undefined) {
                neededCodes.add(String(cp));
            }
        }
    }

    const subset = {};
    for (const code of neededCodes) {
        if (Object.prototype.hasOwnProperty.call(mergedGlyphs, code)) {
            subset[code] = mergedGlyphs[code];
        }
    }
    return subset;
}

function collectVisibleScriptTexts(normConfig, scriptId, dictionary) {
    const sConfig = buildScriptConfig(normConfig, scriptId);
    const dict = Array.isArray(dictionary) ? dictionary : [];
    const texts = [];

    const addTranslit = (raw) => {
        if (!raw || typeof raw !== 'string') return;
        raw.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) return;
            texts.push(transliterateText(part, sConfig, dict));
        });
    };

    if (normConfig.conlangName) {
        addTranslit(normConfig.conlangName);
    }

    const featured = Array.isArray(normConfig.featuredWords) ? normConfig.featuredWords : [];
    for (const fw of featured.slice(0, 20)) {
        if (fw?.word) addTranslit(fw.word);
    }

    if (normConfig.grammarNumbers && typeof normConfig.grammarNumbers === 'object') {
        Object.values(normConfig.grammarNumbers).forEach((val) => {
            if (typeof val === 'string') addTranslit(val);
        });
    }

    const isLogo = sConfig.phonologyTypes === 'logographic';
    const maxEntries = Math.min(dict.length, 60);
    for (let i = 0; i < maxEntries; i++) {
        const entry = dict[i];
        if (!entry) continue;
        const direct = entry.scriptForms?.[scriptId] || (isLogo ? entry.ideogram : '');
        if (direct) {
            texts.push(direct);
        } else if (entry.word) {
            texts.push(transliterateText(entry.word, sConfig, dict));
        }
    }

    return texts;
}

/**
 * Safely injects the theme colors into the document root for the Public Viewer,
 * snapshotting workspace styles once on mount and restoring only on unmount
 * so script switches and background project updates never leak workspace colors.
 */
export function usePublicThemeInjector(config) {
    const originalStylesRef = useRef(null);

    useEffect(() => {
        const root = document.documentElement;
        if (!originalStylesRef.current) {
            const snap = {};
            for (const varName of PUBLIC_THEME_KEYS) {
                snap[varName] = root.style.getPropertyValue(varName);
            }
            originalStylesRef.current = snap;
        }

        return () => {
            const snap = originalStylesRef.current;
            if (!snap) return;
            Object.entries(snap).forEach(([varName, val]) => {
                if (val) {
                    root.style.setProperty(varName, val);
                } else {
                    root.style.removeProperty(varName);
                }
            });
            originalStylesRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!config || !config.colors) return;
        const root = document.documentElement;
        const themeVars = buildPublicThemeVars(config);

        for (const varName of PUBLIC_THEME_KEYS) {
            if (themeVars[varName]) {
                root.style.setProperty(varName, themeVars[varName]);
            } else {
                root.style.removeProperty(varName);
            }
        }
    }, [config]);
}

// Incrementing counter ensures each font load gets a unique family name,
// preventing stale cached glyphs across conlangs or phase-1 -> phase-2 upgrades.
let fontInstanceCounter = 0;

/**
 * Safely injects the custom font for the Public Viewer.
 * Compiles & injects the active script first (using fast visible-glyph-subset loading
 * for large 200+ glyph scripts, followed seamlessly by the full font cached in IndexedDB).
 */
export function usePublicFontInjector(config, activeScriptId = null, dictionary = []) {
    const facesByScriptRef = useRef({});
    const familyByScriptRef = useRef({});
    const dictionaryRef = useRef(dictionary);
    dictionaryRef.current = dictionary;

    useEffect(() => {
        if (!config) return;
        let isCancelled = false;

        const { scriptSystems, scriptRules } = repairScriptSystems(config);
        const normConfig = { ...config, scriptSystems, scriptRules };
        const defaultScriptId = getDefaultScriptId(normConfig);
        const primaryScriptId = (activeScriptId && activeScriptId !== 'auto' && activeScriptId !== 'latin')
            ? activeScriptId
            : defaultScriptId;
        const primaryTypo = getScriptTypographySettings(normConfig, primaryScriptId);

        const styleId = 'public-custom-font';
        let styleNode = document.getElementById(styleId);
        if (!styleNode) {
            styleNode = document.createElement('style');
            styleNode.id = styleId;
            document.head.appendChild(styleNode);
        }

        const formatSpacing = (val) => {
            const num = Number(val);
            return val !== undefined && val !== null && Number.isFinite(num) && num !== 0 ? `${num}em` : 'normal';
        };

        const syncStyleTag = () => {
            if (isCancelled || !styleNode) return;
            const loadedFamilyMap = familyByScriptRef.current;

            const primaryFamily = activeScriptId !== 'latin' ? loadedFamilyMap[primaryScriptId] : null;
            const primaryFontStack = primaryFamily
                ? `'${primaryFamily}', 'Inter', sans-serif`
                : `'Inter', sans-serif`;

            const primaryScriptMeta = getScriptSystem(normConfig, primaryScriptId);
            const primaryRawDir = primaryScriptMeta?.writingDirection || normConfig.writingDirection || 'ltr';
            const primaryDir = VALID_WRITING_DIRECTIONS.includes(primaryRawDir) ? primaryRawDir : 'ltr';
            const isPrimaryVertical = activeScriptId !== 'latin' && primaryDir.startsWith('vertical');
            const primarySpacing = formatSpacing(
                isPrimaryVertical ? primaryTypo.verticalLetterSpacing : primaryTypo.letterSpacing
            );

            let perScriptCSS = '';
            const allScriptIds = new Set([
                ...scriptSystems.map(s => s.id),
                ...Object.keys(loadedFamilyMap),
            ]);

            for (const scriptId of allScriptIds) {
                const escapedId = typeof CSS !== 'undefined' && CSS.escape
                    ? CSS.escape(scriptId)
                    : String(scriptId).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
                const familyName = loadedFamilyMap[scriptId];
                const familyStack = familyName
                    ? `'${familyName}', 'Inter', sans-serif`
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
        };

        const registerScriptSources = async (scriptId, sources) => {
            const list = Array.isArray(sources) ? sources.filter(Boolean) : (sources ? [sources] : []);
            if (list.length === 0) return false;

            const instanceId = ++fontInstanceCounter;
            const fontFamily = safePublicFamily(instanceId, scriptId);

            const loadedFaces = await Promise.all(
                list.map((src) => {
                    if (src instanceof ArrayBuffer) {
                        const face = new FontFace(fontFamily, src);
                        return face.load();
                    }
                    const normalizedUrl = normalizeFontUrl(src);
                    const safeFontUrl = sanitizeCssFontUrl(normalizedUrl);
                    if (!safeFontUrl) return Promise.reject(new Error('Invalid font URL'));
                    const face = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                    return face.load();
                })
            );

            if (isCancelled) return false;

            const prevFaces = facesByScriptRef.current[scriptId] || [];
            loadedFaces.forEach((f) => document.fonts.add(f));
            facesByScriptRef.current[scriptId] = loadedFaces;
            familyByScriptRef.current[scriptId] = fontFamily;

            syncStyleTag();

            // Delete previous faces for this script only after the new CSS family is active
            prevFaces.forEach((f) => {
                try { document.fonts.delete(f); } catch { /* ignore */ }
            });
            return true;
        };

        const processScript = async (scriptId, isPrimary) => {
            const scriptData = getScriptData(normConfig, scriptId);
            const existingFont = scriptData?.customFontBase64 || scriptData?.customFont;
            const mergedGlyphs = mergeScriptGlyphs(normConfig, scriptId);
            const glyphKeys = Object.keys(mergedGlyphs);
            const hasGlyphs = glyphKeys.length > 0;
            const sTypo = getScriptTypographySettings(normConfig, scriptId);
            const compileSig = hasGlyphs ? buildFontCompileSignature(mergedGlyphs, sTypo) : '';

            const isStale = Boolean(
                existingFont &&
                hasGlyphs &&
                (
                    (scriptData?.compiledSignature && scriptData.compiledSignature !== compileSig) ||
                    (!scriptData?.compiledSignature && glyphKeys.length > Object.keys(scriptData?.customGlyphs || {}).length)
                )
            );

            if (existingFont && !isStale) {
                try {
                    await registerScriptSources(scriptId, existingFont);
                    return;
                } catch (err) {
                    console.warn(`PublicViewer: failed to load font for script ${scriptId}`, err);
                }
            }

            if (!hasGlyphs) return;

            const cacheKey = `${scriptId}:${compileSig}`;
            const cachedBuffer = await getCachedPublicFont(cacheKey);
            if (isCancelled) return;
            if (cachedBuffer) {
                try {
                    await registerScriptSources(scriptId, cachedBuffer);
                    return;
                } catch (err) {
                    console.warn(`PublicViewer: failed to load cached font for script ${scriptId}`, err);
                }
            }

            const compileOpts = {
                consistentCharacterSize: sTypo.consistentCharacterSize ?? true,
                fixedAdvanceWidth: sTypo.fixedAdvanceWidth ?? 1000,
            };
            const traceWidth = sTypo.traceWidth ?? 30;
            const fontScale = sTypo.customFontScale ?? 1.0;

            // Phase 1: For large scripts on the active view, compile visible glyphs first (~50-150ms)
            if (isPrimary && glyphKeys.length > 200) {
                try {
                    const visibleTexts = collectVisibleScriptTexts(normConfig, scriptId, dictionaryRef.current);
                    const subsetGlyphs = collectSubsetGlyphs(mergedGlyphs, visibleTexts);
                    const subsetCount = Object.keys(subsetGlyphs).length;
                    if (subsetCount > 1 && subsetCount < glyphKeys.length) {
                        const subsetBuf = await compileFontBufferInWorker(subsetGlyphs, traceWidth, fontScale, compileOpts);
                        if (!isCancelled && subsetBuf) {
                            await registerScriptSources(scriptId, subsetBuf);
                        }
                    }
                } catch (err) {
                    console.warn(`PublicViewer: subset preview compile skipped for ${scriptId}`, err);
                }
            }

            if (isCancelled) return;

            // Phase 2: Compile full font in background worker and persist to IndexedDB cache
            try {
                const fullBuffer = await compileFontBufferInWorker(mergedGlyphs, traceWidth, fontScale, compileOpts);
                if (fullBuffer) {
                    // Always persist full buffer even if user switched scripts mid-compile
                    setCachedPublicFont(cacheKey, fullBuffer);
                    if (!isCancelled) {
                        await registerScriptSources(scriptId, fullBuffer);
                    }
                }
            } catch (e) {
                console.warn('Could not compile customGlyphs for script', scriptId, e);
            }
        };

        const loadAndInject = async () => {
            // Apply current CSS immediately so typography direction & spacing update right away on script switch
            syncStyleTag();

            const orderedIds = Array.from(new Set([
                primaryScriptId,
                ...scriptSystems.map(s => s.id),
                ...Object.keys(config.scriptDataById || {}),
                defaultScriptId,
            ]));

            // Compile & inject active script first without waiting for secondary scripts
            await processScript(orderedIds[0], true);

            for (let i = 1; i < orderedIds.length; i++) {
                if (isCancelled) return;
                await processScript(orderedIds[i], false);
            }
        };

        loadAndInject();

        return () => {
            isCancelled = true;
        };
    }, [config, activeScriptId]);

    useEffect(() => {
        const facesRef = facesByScriptRef;
        const familiesRef = familyByScriptRef;
        return () => {
            const node = document.getElementById('public-custom-font');
            if (node) node.remove();
            Object.values(facesRef.current).forEach((faces) => {
                faces.forEach((f) => {
                    try { document.fonts.delete(f); } catch { /* ignore */ }
                });
            });
            facesRef.current = {};
            familiesRef.current = {};
        };
    }, []);
}
