import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore.jsx";
import { getDefaultScriptId } from "./scriptResolver.js";
import { compileFont } from "./fontCompiler.jsx";


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
        let isCancelled = false;
        let styleNode = document.getElementById('custom-font');

        const config = { scriptRules, scriptSystems };
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

            const traceWidth = typographySettings?.traceWidth ?? 30;
            const fontScale = typographySettings?.customFontScale ?? 1.0;

            for (const sId of allTargetScriptIds) {
                const sData = scriptDataById?.[sId] || {};
                const sGlyphs = sData.customGlyphs || {};
                
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
                        const compiled = await compileFont(mergedGlyphs, traceWidth, fontScale);
                        if (compiled && !isCancelled) {
                            scriptFontMap[sId] = [compiled];
                        }
                    } catch (err) {
                        console.warn(`Could not compile font for script ${sId}:`, err);
                    }
                }
            }

            // If default script still has no font but root customGlyphs exists: compile default font!
            if (!scriptFontMap[defaultScriptId] && customGlyphs && Object.keys(customGlyphs).length > 0) {
                try {
                    const compiled = await compileFont(customGlyphs, traceWidth, fontScale);
                    if (compiled && !isCancelled) {
                        scriptFontMap[defaultScriptId] = [compiled];
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
                    try { document.fonts.clear(); } catch (e) { /* ignore */ }
                }
                return;
            }

            // Load each script's font under a unique font family name
            const loadedByScript = {};
            const newFontFaces = new Set();

            for (const scriptId of scriptIds) {
                const fontFamily = `ConlangScript_${scriptId}`;
                const fontStrings = scriptFontMap[scriptId];

                try {
                    const scriptFaces = await Promise.all(fontStrings.map(fontStr => {
                        const safeFontStr = typeof fontStr === 'string' ? fontStr : String(fontStr);
                        const safeFontUrl = safeFontStr.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,');
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

            const letterSpacingCSS = typographySettings?.letterSpacing
                ? typographySettings.letterSpacing + 'em'
                : 'normal';

            const verticalLetterSpacingCSS = typographySettings?.verticalLetterSpacing !== undefined
                ? typographySettings.verticalLetterSpacing + 'em'
                : 'normal';

            const defaultFontFamily = `ConlangScript_${defaultScriptId}`;

            // Build per-script CSS classes: .conlang-script-{scriptId}
            // Always fall back to defaultFontFamily so glyphs defined in the primary script/root render cleanly
            let perScriptCSS = '';
            for (const scriptId of allTargetScriptIds) {
                const family = loadedByScript[scriptId] ? `ConlangScript_${scriptId}` : defaultFontFamily;
                perScriptCSS += `
                .conlang-script-${CSS.escape(scriptId)} {
                    font-family: '${family}', '${defaultFontFamily}', 'Inter', sans-serif !important;
                    font-weight: normal;
                    font-style: normal;
                    letter-spacing: ${letterSpacingCSS} !important;
                }
                .conlang-script-${CSS.escape(scriptId)}[data-writing-direction="vertical"] {
                    letter-spacing: ${verticalLetterSpacingCSS} !important;
                }
                `;
            }

            if (!styleNode) {
                styleNode = document.createElement('style');
                styleNode.id = 'custom-font';
                document.head.appendChild(styleNode);
            }

            styleNode.innerHTML = `
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

        buildAndInjectFonts();

        return () => {
            isCancelled = true;
        };
    }, [customFont, customGlyphs, scriptDataById, isRehydrating, projectId, typographySettings, scriptRules, scriptSystems]);    
}