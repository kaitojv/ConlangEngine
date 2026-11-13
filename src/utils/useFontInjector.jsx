import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";
import { getDefaultScriptId, getScriptTypographySettings } from "./scriptResolver.js";
import { compileFontBufferInWorker } from "./fontCompiler.jsx";
import { sanitizeCssFontUrl } from "./sanitizeHtml.js";

const safeScriptFamily = (scriptId) => `ConlangScript_${String(scriptId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const formatLetterSpacingCSS = (val) => {
    const parsed = Number(val);
    return val !== undefined && val !== null && Number.isFinite(parsed) && parsed !== 0
        ? `${parsed}em`
        : 'normal';
};


export function useFontInjector(){

    const customFont = useConfigStore((state) => state.customFont);
    const customGlyphs = useConfigStore((state) => state.customGlyphs);
    const scriptDataById = useConfigStore((state) => state.scriptDataById);
    const isRehydrating = useConfigStore((state) => state.isRehydrating);
    const projectId = useConfigStore((state) => state.projectId);
    const typographySettings = useConfigStore((state) => state.typographySettings);
    const scriptRules = useConfigStore((state) => state.scriptRules);
    const scriptSystems = useConfigStore((state) => state.scriptSystems);

    useEffect(() => {
        if (isRehydrating) return;
        let isCancelled = false;
        let styleNode = document.getElementById('custom-font');

        const config = { scriptRules, scriptSystems, scriptDataById, typographySettings };
        const defaultScriptId = getDefaultScriptId(config);

        const buildAndInjectFonts = async () => {
            // Build a map of scriptId → font base64 string(s)
            const scriptFontMap = {};

            // 1. Collect pre-compiled fonts from scriptDataById (the primary source)
            if (scriptDataById) {
                Object.entries(scriptDataById).forEach(([scriptId, scriptData]) => {
                    const font = scriptData?.customFontBase64 || scriptData?.customFont;
                    if (font) {
                        scriptFontMap[scriptId] = Array.isArray(font) ? font.filter(Boolean) : [font];
                    }
                });
            }

            // Legacy fallback: root-level customFont for projects that predate multi-script
            if (customFont && !scriptFontMap[defaultScriptId]) {
                const rootFonts = Array.isArray(customFont) ? customFont.filter(Boolean) : [customFont];
                if (rootFonts.length > 0) {
                    scriptFontMap[defaultScriptId] = rootFonts;
                }
            }

            // 2. On-the-fly compilation for scripts that have custom glyphs but no compiled font
            const allTargetScriptIds = new Set([
                defaultScriptId,
                ...(scriptSystems || []).map(s => s.id),
                ...Object.keys(scriptDataById || {})
            ]);

            const defaultTypo = getScriptTypographySettings(config, defaultScriptId);
            const defaultTraceWidth = defaultTypo.traceWidth ?? 30;
            const defaultFontScale = defaultTypo.customFontScale ?? 1.0;

            for (const sId of allTargetScriptIds) {
                const sData = scriptDataById?.[sId] || {};
                const sGlyphs = sData.customGlyphs || {};
                const sTypo = getScriptTypographySettings(config, sId);
                
                // Pull in any referenced glyphs from root customGlyphs if mapped in this script's syllabary or alphabet
                const referencedCodes = new Set();
                if (sData.syllabaryMap) {
                    Object.values(sData.syllabaryMap).forEach(sym => {
                        if (typeof sym === 'string') {
                            for (const ch of sym) referencedCodes.add(ch.codePointAt(0));
                        }
                    });
                }
                if (sData.alphabetGlyphs) {
                    Object.values(sData.alphabetGlyphs).forEach(sym => {
                        if (typeof sym === 'string') {
                            for (const ch of sym) referencedCodes.add(ch.codePointAt(0));
                        }
                    });
                }

                const mergedGlyphs = { ...sGlyphs };
                if (customGlyphs) {
                    referencedCodes.forEach(code => {
                        if (customGlyphs[code] && !mergedGlyphs[code]) {
                            mergedGlyphs[code] = customGlyphs[code];
                        }
                    });
                    if (sId === defaultScriptId) {
                        Object.assign(mergedGlyphs, customGlyphs);
                    }
                }

                // If no font exists yet for this script, but glyphs exist: compile!
                if (!scriptFontMap[sId] && Object.keys(mergedGlyphs).length > 0) {
                    try {
                        const compiledBuffer = await compileFontBufferInWorker(
                            mergedGlyphs,
                            sTypo.traceWidth ?? 30,
                            sTypo.customFontScale ?? 1.0,
                            {
                                consistentCharacterSize: sTypo.consistentCharacterSize ?? false,
                                fixedAdvanceWidth: sTypo.fixedAdvanceWidth ?? 1000
                            }
                        );
                        if (compiledBuffer && !isCancelled) {
                            scriptFontMap[sId] = [compiledBuffer];
                        }
                    } catch (err) {
                        console.warn(`Could not compile font for script ${sId}:`, err);
                    }
                }
            }

            // If default script still has no font but root customGlyphs exists: compile default font!
            if (!scriptFontMap[defaultScriptId] && customGlyphs && Object.keys(customGlyphs).length > 0) {
                try {
                    const isConsistent = defaultTypo.consistentCharacterSize ?? false;
                    const fixedAdvance = defaultTypo.fixedAdvanceWidth ?? 1000;
                    const compiledBuffer = await compileFontBufferInWorker(customGlyphs, defaultTraceWidth, defaultFontScale, {
                        consistentCharacterSize: isConsistent,
                        fixedAdvanceWidth: fixedAdvance
                    });
                    if (compiledBuffer && !isCancelled) {
                        scriptFontMap[defaultScriptId] = [compiledBuffer];
                    }
                } catch (err) {
                    console.warn("Could not compile default custom font:", err);
                }
            }

            if (isCancelled) return;

            const scriptIds = Object.keys(scriptFontMap);

            if (scriptIds.length === 0) {
                if (isRehydrating || projectId) return;
                if (styleNode) styleNode.remove();
                if (document.fonts) {
                    try { document.fonts.clear(); } catch { /* ignore */ }
                }
                return;
            }

            // Load each script's font under a unique font family name
            const loadedByScript = {};
            const newFontFaces = new Set();

            for (const scriptId of scriptIds) {
                const fontFamily = safeScriptFamily(scriptId);
                const fontStrings = scriptFontMap[scriptId];

                try {
                    const scriptFaces = await Promise.all(fontStrings.map(fontSource => {
                        if (fontSource instanceof ArrayBuffer) {
                            const newFont = new FontFace(fontFamily, fontSource);
                            return newFont.load();
                        }
                        const safeFontStr = typeof fontSource === 'string' ? fontSource : String(fontSource);
                        const safeFontUrl = sanitizeCssFontUrl(safeFontStr);
                        if (!safeFontUrl) return Promise.reject(new Error('Invalid font URL'));
                        const newFont = new FontFace(fontFamily, `url('${safeFontUrl}')`);
                        return newFont.load();
                    }));
                    loadedByScript[scriptId] = scriptFaces;
                    scriptFaces.forEach(f => newFontFaces.add(f));
                } catch (e) {
                    console.warn(`Failed loading font for ${scriptId}:`, e);
                }
            }

            if (isCancelled) return;

            // Add all newly loaded font faces to the document FIRST
            for (const scriptId of Object.keys(loadedByScript)) {
                loadedByScript[scriptId].forEach(face => document.fonts.add(face));
            }

            // Cleanup old font faces to prevent memory leaks and ghost fonts
            if (document.fonts) {
                const fontsToDelete = [];
                document.fonts.forEach(f => {
                    if (typeof f.family === 'string' && (
                        f.family.startsWith('ConlangScript_') ||
                        f.family.startsWith("'ConlangScript_") ||
                        f.family === 'ConlangCustomFont' ||
                        f.family === "'ConlangCustomFont'"
                    )) {
                        if (!newFontFaces.has(f)) {
                            fontsToDelete.push(f);
                        }
                    }
                });
                fontsToDelete.forEach(f => {
                    try { document.fonts.delete(f); } catch { /* ignore */ }
                });
            }

            const letterSpacingCSS = formatLetterSpacingCSS(defaultTypo.letterSpacing);
            const verticalLetterSpacingCSS = formatLetterSpacingCSS(defaultTypo.verticalLetterSpacing);

            const defaultFontFamily = safeScriptFamily(defaultScriptId);

            // Build per-script CSS classes: .conlang-script-{scriptId}
            // High-specificity selectors ensure .conlang-script-* always beats generic
            // .custom-font-text, .alpha-btn *, or .letter-filter-chip * rules,
            // and isolates each script's own horizontal & vertical letter spacing.
            let perScriptCSS = '';
            for (const scriptId of allTargetScriptIds) {
                const escapedId = CSS.escape(scriptId);
                const family = loadedByScript[scriptId] ? safeScriptFamily(scriptId) : defaultFontFamily;
                const sTypo = getScriptTypographySettings(config, scriptId);
                const sLetterSpacingCSS = formatLetterSpacingCSS(sTypo.letterSpacing);
                const sVerticalSpacingCSS = formatLetterSpacingCSS(sTypo.verticalLetterSpacing);
                perScriptCSS += `
                .conlang-script-${escapedId},
                .conlang-script-${escapedId} *,
                .custom-font-text.conlang-script-${escapedId},
                .entry-main-word.conlang-script-${escapedId},
                .alpha-btn.conlang-script-${escapedId},
                .alpha-btn.conlang-script-${escapedId} *,
                .letter-filter-val.conlang-script-${escapedId},
                .letter-filter-val.conlang-script-${escapedId} * {
                    font-family: '${family}', '${defaultFontFamily}', 'Inter', sans-serif !important;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${sLetterSpacingCSS} !important;
                }
                .conlang-script-${escapedId}[data-writing-direction="vertical"],
                [data-writing-direction="vertical"].conlang-script-${escapedId},
                .conlang-script-${escapedId} [data-writing-direction="vertical"] {
                    letter-spacing: ${sVerticalSpacingCSS} !important;
                }
                `;
            }

            if (!styleNode) {
                styleNode = document.createElement('style');
                styleNode.id = 'custom-font';
                document.head.appendChild(styleNode);
            }

            styleNode.textContent = `
                .custom-font-text,
                .conlang-word,
                .word-text,
                .word,
                .lexicon-word,
                .matrix-base-word,
                .entry-main-word,
                .alpha-btn,
                .alpha-btn *,
                .letter-filter-chip,
                .letter-filter-chip *,
                #syllabary-render-area span, 
                #syllabary-render-area input,
                #f-ideogram, 
                #edit-ideogram,
                #alphabet-render-area div {
                    font-family: '${defaultFontFamily}', 'Inter', sans-serif !important;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${letterSpacingCSS} !important;
                }

                input.custom-font-text,
                textarea.custom-font-text,
                .fi.custom-font-text,
                .ideogram-edit-input,
                .ideogram-input {
                    font-family: '${defaultFontFamily}', 'Inter', sans-serif !important;
                }

                [data-writing-direction="vertical"].custom-font-text,
                [data-writing-direction="vertical"].conlang-word,
                [data-writing-direction="vertical"].word-text,
                [data-writing-direction="vertical"].word,
                [data-writing-direction="vertical"].lexicon-word,
                [data-writing-direction="vertical"].matrix-base-word,
                [data-writing-direction="vertical"].entry-main-word {
                    letter-spacing: ${verticalLetterSpacingCSS} !important;
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

                ${perScriptCSS}
            `;
        };

        const timer = setTimeout(() => {
            if (!isCancelled) {
                buildAndInjectFonts();
            }
        }, 250);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [customFont, customGlyphs, scriptDataById, isRehydrating, projectId, typographySettings, scriptRules, scriptSystems]);    
}