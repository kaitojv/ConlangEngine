import { useConfigStore } from '../store/useConfigStore.jsx';
import { blockLayoutMatrices } from './blockFontGenerator.jsx';

/**
 * Utility to export conlang text as a high-quality SVG file.
 * Handles standard glyphs (Logographic/Syllabic) and Featural Blocks.
 */
/**
 * Base logic to convert strokes to SVG path elements
 */
const strokesToPaths = (strokes, xOffset = 0) => {
    return strokes.map(stroke => {
        if (stroke.length < 2) return '';
        let pathD = `M ${stroke[0].x + xOffset} ${stroke[0].y}`;
        for (let i = 1; i < stroke.length; i++) {
            pathD += ` L ${stroke[i].x + xOffset} ${stroke[i].y}`;
        }
        return `  <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />\n`;
    }).join('');
};

export const exportTextAsSVG = (transliteratedText, fileName = 'conlang_script.svg') => {
    const state = useConfigStore.getState();
    const customGlyphs = state.customGlyphs || {};
    const featuralComponents = state.featuralComponents || {};
    const syllabaryMap = state.syllabaryMap || {};
    const reverseSyllabaryMap = Object.fromEntries(Object.entries(syllabaryMap).map(([k, v]) => [v, k]));
    
    const blockTemplates = state.blockTemplates || [];
    const GLYPH_SIZE = 300;
    const GAP = 20;
    
    const chars = Array.from(transliteratedText);
    const validGlyphs = chars.map(char => {
        const code = char.codePointAt(0);
        
        // 1. Try standard custom glyphs (Logograms / Syllabics)
        if (customGlyphs[code]) return customGlyphs[code];
        
        // 2. Try reconstructing Featural Blocks
        const syllableStr = reverseSyllabaryMap[char];
        if (syllableStr) {
            // Find which template generated this
            const template = blockTemplates[0] || { layoutTemplate: '2top1bottom', maxChars: 3 };
            const matrix = blockLayoutMatrices[template.layoutTemplate] || blockLayoutMatrices['2top1bottom'];
            
            const components = Object.keys(featuralComponents).sort((a, b) => b.length - a.length);
            let remaining = syllableStr;
            const combo = [];
            while (remaining.length > 0) {
                let match = components.find(c => remaining.startsWith(c));
                if (match) {
                    combo.push(match);
                    remaining = remaining.substring(match.length);
                } else {
                    combo.push(remaining[0]);
                    remaining = remaining.substring(1);
                }
            }

            const combinedStrokes = [];
            for (let i = 0; i < combo.length; i++) {
                const radical = combo[i];
                const strokes = featuralComponents[radical];
                const transform = matrix[i];
                if (strokes && transform) {
                    const transformed = strokes.map(stroke => 
                        stroke.map(point => ({
                            x: Number(((point.x * transform.scale) + transform.tx).toFixed(1)),
                            y: Number(((point.y * transform.scale) + transform.ty).toFixed(1))
                        }))
                    );
                    combinedStrokes.push(...transformed);
                }
            }
            if (combinedStrokes.length > 0) return combinedStrokes;
        }

        console.warn(`SVG Exporter: No glyph data for char "${char}" (code ${code})`);
        return null;
    }).filter(Boolean);

    console.log(`SVG Exporter: Processing ${chars.length} chars, found ${validGlyphs.length} valid glyphs.`);

    if (validGlyphs.length === 0) return;

    const totalWidth = validGlyphs.length * GLYPH_SIZE + (validGlyphs.length - 1) * GAP;
    const totalHeight = GLYPH_SIZE;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">\n`;
    validGlyphs.forEach((strokes, charIdx) => {
        svgContent += strokesToPaths(strokes, charIdx * (GLYPH_SIZE + GAP));
    });
    svgContent += `</svg>`;

    downloadSVG(svgContent, fileName);
};

export const exportStrokesAsSVG = (strokes, fileName = 'glyph.svg') => {
    const GLYPH_SIZE = 300;
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${GLYPH_SIZE}" height="${GLYPH_SIZE}" viewBox="0 0 ${GLYPH_SIZE} ${GLYPH_SIZE}">\n`;
    svgContent += strokesToPaths(strokes);
    svgContent += `</svg>`;
    downloadSVG(svgContent, fileName);
};

const downloadSVG = (content, fileName) => {
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
