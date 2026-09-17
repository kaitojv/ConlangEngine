import { compileBlockStrokes, parseList } from './blockFontGenerator.jsx';

/**
 * Filter out metadata and invalid dummy markers from a stroke array.
 */
export const cleanStrokes = (strokes) => {
    if (!strokes || !Array.isArray(strokes)) return [];
    let actual = strokes;
    if (actual.length > 0 && !Array.isArray(actual[0]) && actual[0]?.isMeta) {
        actual = actual.slice(1);
    }
    return actual.filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));
};

/**
 * Computes arrow path and number coordinate for a stroke.
 * Red arrow shows the direction from stroke start to stroke end.
 * Red number (1-based index) is placed near the beginning of the stroke.
 */
export const calculateStrokeArrowAndNumber = (stroke, strokeIndex) => {
    if (!stroke || stroke.length === 0) return null;

    const num = strokeIndex + 1;

    // Single point / dot
    if (stroke.length === 1) {
        return {
            isDot: true,
            numX: stroke[0].x,
            numY: Math.max(16, stroke[0].y - 18),
            number: num,
            dot: stroke[0]
        };
    }

    const p0 = stroke[0];
    const p1 = stroke[stroke.length - 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.hypot(dx, dy);

    // Calculate total path length along the stroke
    let pathLength = 0;
    for (let i = 1; i < stroke.length; i++) {
        pathLength += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
    }

    // Truly tiny mark or single-point click
    if (pathLength < 12 || stroke.length <= 2) {
        return {
            isDot: true,
            numX: p0.x,
            numY: Math.max(16, p0.y - 18),
            number: num,
            dot: p0,
            startMarker: p0
        };
    }

    // Detect closed shape (start point and end point meet: circle, square, loop, polygon)
    const isClosed = dist < 25 || (pathLength > 50 && dist / pathLength < 0.22);

    if (isClosed) {
        // Collect points along the first portion (~35% of total path length, at least 30px)
        let accLen = 0;
        const initPoints = [stroke[0]];
        const targetLen = Math.min(Math.max(pathLength * 0.35, 30), 90);

        for (let i = 1; i < stroke.length; i++) {
            const segDist = Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
            accLen += segDist;
            initPoints.push(stroke[i]);
            if (accLen >= targetLen) break;
        }

        const sStart = initPoints[0];
        const sEnd = initPoints[initPoints.length - 1];
        const sDx = sEnd.x - sStart.x;
        const sDy = sEnd.y - sStart.y;
        const sDist = Math.hypot(sDx, sDy) || 1;
        const sUx = sDx / sDist;
        const sUy = sDy / sDist;

        // Compute centroid of the closed shape
        let cx = 0, cy = 0;
        for (const pt of stroke) {
            cx += pt.x;
            cy += pt.y;
        }
        cx /= stroke.length;
        cy /= stroke.length;

        // Normal perpendicular to initial tangent (-sUy, sUx)
        let sNx = -sUy;
        let sNy = sUx;

        // Midpoint of initial segment
        const midX = (sStart.x + sEnd.x) / 2;
        const midY = (sStart.y + sEnd.y) / 2;

        // Orient normal outward from the centroid
        if (sNx * (midX - cx) + sNy * (midY - cy) < 0) {
            sNx = -sNx;
            sNy = -sNy;
        }

        const OFFSET = 20;
        const sampled = [];
        const startSampleIdx = Math.max(0, Math.floor(initPoints.length * 0.08));
        for (let i = startSampleIdx; i < initPoints.length; i++) {
            sampled.push({
                x: Number((initPoints[i].x + sNx * OFFSET).toFixed(1)),
                y: Number((initPoints[i].y + sNy * OFFSET).toFixed(1))
            });
        }

        let arrowPathD = '';
        let arrowStart = { x: 0, y: 0 };
        let arrowEnd = { x: 0, y: 0 };

        if (sampled.length >= 2) {
            arrowStart = sampled[0];
            arrowEnd = sampled[sampled.length - 1];
            arrowPathD = `M ${sampled[0].x} ${sampled[0].y}`;
            for (let i = 1; i < sampled.length; i++) {
                arrowPathD += ` L ${sampled[i].x} ${sampled[i].y}`;
            }
        } else {
            arrowStart = { x: Number((sStart.x + sNx * OFFSET).toFixed(1)), y: Number((sStart.y + sNy * OFFSET).toFixed(1)) };
            arrowEnd = { x: Number((sEnd.x + sNx * OFFSET).toFixed(1)), y: Number((sEnd.y + sNy * OFFSET).toFixed(1)) };
            arrowPathD = `M ${arrowStart.x} ${arrowStart.y} L ${arrowEnd.x} ${arrowEnd.y}`;
        }

        // Place number near p0 and offset outward
        const numX = Number(Math.min(Math.max(16, arrowStart.x - sUx * 14 + sNx * 6), 284).toFixed(1));
        const numY = Number(Math.min(Math.max(16, arrowStart.y - sUy * 14 + sNy * 6), 284).toFixed(1));

        return {
            isDot: false,
            isClosed: true,
            arrowPathD,
            arrowStart,
            arrowEnd,
            numX,
            numY,
            number: num,
            startMarker: p0
        };
    }

    // Unit tangent
    const ux = dx / dist;
    const uy = dy / dist;

    // Unit normal (perpendicular)
    let nx = -uy;
    let ny = ux;

    // Preference:
    // If horizontal stroke (|dx| >= |dy|), offset upward (ny <= 0)
    // If vertical stroke (|dy| > |dx|), offset rightward (nx >= 0)
    if (Math.abs(dx) >= Math.abs(dy)) {
        if (ny > 0) {
            nx = -nx;
            ny = -ny;
        }
    } else {
        if (nx < 0) {
            nx = -nx;
            ny = -ny;
        }
    }

    const OFFSET = 20;

    // Check if stroke has significant curvature
    let isCurved = false;
    let midActual = stroke[Math.floor(stroke.length / 2)];
    let midStraight = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const sagitta = Math.hypot(midActual.x - midStraight.x, midActual.y - midStraight.y);
    if (sagitta > 10 && stroke.length >= 4) {
        isCurved = true;
    }

    let arrowPathD = '';
    let arrowStart = { x: 0, y: 0 };
    let arrowEnd = { x: 0, y: 0 };

    if (!isCurved) {
        // Straight arrow offset parallel to the stroke
        arrowStart = {
            x: Number((p0.x + nx * OFFSET + ux * 6).toFixed(1)),
            y: Number((p0.y + ny * OFFSET + uy * 6).toFixed(1))
        };
        arrowEnd = {
            x: Number((p1.x + nx * OFFSET - ux * 6).toFixed(1)),
            y: Number((p1.y + ny * OFFSET - uy * 6).toFixed(1))
        };
        arrowPathD = `M ${arrowStart.x} ${arrowStart.y} L ${arrowEnd.x} ${arrowEnd.y}`;
    } else {
        // Curved arrow following stroke curvature
        // Subsample points from ~12% to ~88% of length
        const startIndex = Math.max(0, Math.floor(stroke.length * 0.12));
        const endIndex = Math.min(stroke.length - 1, Math.ceil(stroke.length * 0.88));
        const sampled = [];

        for (let i = startIndex; i <= endIndex; i++) {
            const pt = stroke[i];
            sampled.push({
                x: Number((pt.x + nx * OFFSET).toFixed(1)),
                y: Number((pt.y + ny * OFFSET).toFixed(1))
            });
        }

        if (sampled.length >= 2) {
            arrowStart = sampled[0];
            arrowEnd = sampled[sampled.length - 1];
            arrowPathD = `M ${sampled[0].x} ${sampled[0].y}`;
            for (let i = 1; i < sampled.length; i++) {
                arrowPathD += ` L ${sampled[i].x} ${sampled[i].y}`;
            }
        } else {
            arrowStart = { x: p0.x + nx * OFFSET, y: p0.y + ny * OFFSET };
            arrowEnd = { x: p1.x + nx * OFFSET, y: p1.y + ny * OFFSET };
            arrowPathD = `M ${arrowStart.x} ${arrowStart.y} L ${arrowEnd.x} ${arrowEnd.y}`;
        }
    }

    // Position red number slightly before the arrow start
    const numX = Number(Math.min(Math.max(16, arrowStart.x - ux * 16 - nx * 2), 284).toFixed(1));
    const numY = Number(Math.min(Math.max(16, arrowStart.y - uy * 16 - ny * 2), 284).toFixed(1));

    return {
        isDot: false,
        isClosed: false,
        arrowPathD,
        arrowStart,
        arrowEnd,
        numX,
        numY,
        number: num,
        startMarker: p0
    };
};

/**
 * Resolves stroke data for a given word or character based on writing system.
 * Returns an array of character stroke representations.
 */
export const resolveWordStrokes = (wordOrChar, config = {}, lexicon = []) => {
    if (!wordOrChar && wordOrChar !== 0) return { characters: [], hasStrokes: false };

    const strInput = String(wordOrChar).trim();
    if (!strInput) return { characters: [], hasStrokes: false };

    const scriptType = config.phonologyTypes || 'alphabetic';
    const customGlyphs = config.customGlyphs || {};
    const syllabaryMap = config.syllabaryMap || {};
    const featuralComponents = config.featuralComponents || {};
    const blockTemplates = config.blockTemplates || [];
    const blockSettings = config.blockSettings || {};

    const cleanWord = strInput.replace(/\*/g, '');
    const cleanWordLower = cleanWord.toLowerCase();

    const characters = [];

    // Helper to extract strokes from customGlyphs by charCode or symbol
    const getStrokesForChar = (char) => {
        if (!char) return [];
        const codePoint = char.codePointAt(0);
        if (customGlyphs[codePoint]) return cleanStrokes(customGlyphs[codePoint]);
        if (customGlyphs[String(codePoint)]) return cleanStrokes(customGlyphs[String(codePoint)]);
        if (customGlyphs[char]) return cleanStrokes(customGlyphs[char]);
        return [];
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LOGOGRAPHIC
    // ─────────────────────────────────────────────────────────────────────────
    if (scriptType === 'logographic') {
        const dictEntry = lexicon.find(e => 
            (e.word && e.word.replace(/\*/g, '').toLowerCase() === cleanWordLower) || 
            (e.ideogram && e.ideogram === strInput)
        );

        const ideogramStr = dictEntry?.ideogram || strInput;
        const chars = Array.from(ideogramStr);

        chars.forEach((ch, idx) => {
            let strokes = getStrokesForChar(ch);

            // Fallback: check featuralComponents if drawn there
            if (strokes.length === 0 && featuralComponents[ch]) {
                strokes = cleanStrokes(featuralComponents[ch]);
            }

            const arrows = strokes.map((s, sIdx) => calculateStrokeArrowAndNumber(s, sIdx));

            characters.push({
                char: ch,
                charCode: ch.codePointAt(0),
                label: dictEntry?.translation || dictEntry?.word || (chars.length > 1 ? `Char ${idx + 1}` : cleanWord),
                strokes,
                arrows,
                hasStrokes: strokes.length > 0
            });
        });
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 2. SYLLABIC
    // ─────────────────────────────────────────────────────────────────────────
    else if (scriptType === 'syllabic') {
        const dictEntry = lexicon.find(e => 
            e.word && e.word.replace(/\*/g, '').toLowerCase() === cleanWordLower
        );

        // Check if input is already transliterated PUA characters
        const isTransliterated = Array.from(strInput).some(c => c.codePointAt(0) >= 0xE000);

        if (isTransliterated) {
            // Reverse lookup syllable names
            const reverseMap = Object.fromEntries(Object.entries(syllabaryMap).map(([k, v]) => [v, k]));
            Array.from(strInput).forEach((ch) => {
                const strokes = getStrokesForChar(ch);
                const syllableName = reverseMap[ch] || ch;
                const arrows = strokes.map((s, sIdx) => calculateStrokeArrowAndNumber(s, sIdx));
                characters.push({
                    char: ch,
                    charCode: ch.codePointAt(0),
                    label: syllableName,
                    strokes,
                    arrows,
                    hasStrokes: strokes.length > 0
                });
            });
        } else {
            // Decompose clean word into syllables using syllabaryMap
            const syllables = Object.keys(syllabaryMap).sort((a, b) => b.length - a.length);
            let remaining = dictEntry?.ideogram || cleanWordLower;
            let matchedTokens = [];

            while (remaining.length > 0) {
                let match = syllables.find(syl => remaining.startsWith(syl));
                if (match) {
                    matchedTokens.push(match);
                    remaining = remaining.substring(match.length);
                } else {
                    matchedTokens.push(remaining[0]);
                    remaining = remaining.substring(1);
                }
            }

            matchedTokens.forEach((syl) => {
                const mappedSymbol = syllabaryMap[syl];
                const strokes = mappedSymbol ? getStrokesForChar(mappedSymbol) : getStrokesForChar(syl);
                const arrows = strokes.map((s, sIdx) => calculateStrokeArrowAndNumber(s, sIdx));
                characters.push({
                    char: mappedSymbol || syl,
                    charCode: mappedSymbol ? mappedSymbol.codePointAt(0) : syl.codePointAt(0),
                    label: syl,
                    strokes,
                    arrows,
                    hasStrokes: strokes.length > 0
                });
            });
        }
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 3. FEATURAL BLOCK
    // ─────────────────────────────────────────────────────────────────────────
    else if (scriptType === 'featural_block') {
        const consList = parseList(config.consonants || '');
        const vowList = parseList(config.vowels || '');
        const otherList = parseList(config.otherPhonemes || '');
        const activeTemplates = blockTemplates.length > 0 ? blockTemplates : [
            {
                id: 'default',
                maxChars: blockSettings.maxChars || 3,
                layoutTemplate: blockSettings.layoutTemplate || '2top1bottom',
                slotMapping: blockSettings.slotMapping || ['Initial', 'Vowel', 'Final']
            }
        ];

        // Featural block words can be separated by '.'
        const blocks = cleanWordLower.split('.');

        blocks.forEach((blk) => {
            let strokes = [];

            // 1. Check if compiled block already exists in syllabaryMap & customGlyphs
            const mappedSymbol = syllabaryMap[blk];
            if (mappedSymbol) {
                strokes = getStrokesForChar(mappedSymbol);
            }

            // 2. If not compiled or missing strokes, compile dynamically on the fly!
            if (strokes.length === 0) {
                const dynamicStrokes = compileBlockStrokes(
                    blk,
                    activeTemplates,
                    featuralComponents,
                    consList,
                    vowList,
                    otherList
                );
                if (dynamicStrokes) {
                    strokes = cleanStrokes(dynamicStrokes);
                }
            }

            // 3. If single component character directly passed (e.g. from BlockShowcase base chars)
            if (strokes.length === 0 && featuralComponents[blk]) {
                strokes = cleanStrokes(featuralComponents[blk]);
            }

            const arrows = strokes.map((s, sIdx) => calculateStrokeArrowAndNumber(s, sIdx));

            characters.push({
                char: mappedSymbol || blk,
                charCode: mappedSymbol ? mappedSymbol.codePointAt(0) : null,
                label: blk,
                strokes,
                arrows,
                hasStrokes: strokes.length > 0
            });
        });
    }
    // ─────────────────────────────────────────────────────────────────────────
    // 4. FALLBACK (Alphabetic / Other)
    // ─────────────────────────────────────────────────────────────────────────
    else {
        // Try resolving custom strokes for whatever characters were passed
        Array.from(cleanWord).forEach(ch => {
            let strokes = getStrokesForChar(ch);
            if (strokes.length === 0 && featuralComponents[ch]) {
                strokes = cleanStrokes(featuralComponents[ch]);
            }
            const arrows = strokes.map((s, sIdx) => calculateStrokeArrowAndNumber(s, sIdx));
            characters.push({
                char: ch,
                charCode: ch.codePointAt(0),
                label: ch,
                strokes,
                arrows,
                hasStrokes: strokes.length > 0
            });
        });
    }

    const hasStrokes = characters.some(c => c.hasStrokes);
    return { characters, hasStrokes };
};
