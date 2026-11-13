// src/utils/blockLayout.js
// Pure featural/block layout matrices and stroke composition helpers.

export const blockLayoutMatrices = {
    '1center': [
        { scale: 0.9, tx: 15, ty: 15 }
    ],
    '2top1bottom': [
        { scale: 0.45, tx: 10, ty: 10 },
        { scale: 0.45, tx: 155, ty: 10 },
        { scale: 0.45, tx: 82.5, ty: 155 }
    ],
    '1top2bottom': [
        { scale: 0.45, tx: 82.5, ty: 10 },
        { scale: 0.45, tx: 10, ty: 155 },
        { scale: 0.45, tx: 155, ty: 155 }
    ],
    '1left2right': [
        { scale: 0.45, tx: 10, ty: 82.5 },
        { scale: 0.45, tx: 155, ty: 10 },
        { scale: 0.45, tx: 155, ty: 155 }
    ],
    '2left1right': [
        { scale: 0.45, tx: 10, ty: 10 },
        { scale: 0.45, tx: 10, ty: 155 },
        { scale: 0.45, tx: 155, ty: 82.5 }
    ],
    '3horizontal': [
        { scale: 0.3, tx: 5, ty: 105 },
        { scale: 0.3, tx: 105, ty: 105 },
        { scale: 0.3, tx: 205, ty: 105 }
    ],
    '3vertical': [
        { scale: 0.3, tx: 105, ty: 5 },
        { scale: 0.3, tx: 105, ty: 105 },
        { scale: 0.3, tx: 105, ty: 205 }
    ],
    '2horizontal': [
        { scale: 0.45, tx: 10, ty: 75 },
        { scale: 0.45, tx: 155, ty: 75 }
    ],
    '2vertical': [
        { scale: 0.45, tx: 75, ty: 10 },
        { scale: 0.45, tx: 75, ty: 155 }
    ],
    '1outside1inside': [
        { scale: 0.99, tx: 1.25, ty: 1.25 },
        { scale: 0.45, tx: 68.75, ty: 68.75 }
    ],
    '1inside1outside': [
        { scale: 0.45, tx: 68.75, ty: 68.75 },
        { scale: 0.99, tx: 1.25, ty: 1.25 }
    ],
    '2x2grid': [
        { scale: 0.45, tx: 10, ty: 10 },
        { scale: 0.45, tx: 155, ty: 10 },
        { scale: 0.45, tx: 10, ty: 155 },
        { scale: 0.45, tx: 155, ty: 155 }
    ]
};

export const parseList = (str) => (str || '').split(',')
    .map(s => {
        let clean = s.trim().toLowerCase();
        if (clean.includes('=')) clean = clean.split('=')[0].trim();
        return clean;
    })
    .filter(Boolean);

// Helper to compile a single block string using the right template matrix
export const compileBlockStrokes = (blockStr, activeTemplates, featuralComponents, consList, vowList, otherList, overrideLayout = null) => {
    let template = null;
    let layoutKey = overrideLayout;

    // Re-extract phonemes to support multigraphs (e.g. "ea")
    const allPhonemes = [...consList, ...vowList, ...otherList].sort((a, b) => b.length - a.length);
    const blockTokens = [];
    let _i = 0;
    while (_i < blockStr.length) {
        let match = null;
        for (const p of allPhonemes) {
            if (blockStr.startsWith(p, _i)) {
                match = p;
                break;
            }
        }
        if (match) {
            blockTokens.push(match);
            _i += match.length;
        } else {
            blockTokens.push(blockStr[_i]);
            _i++;
        }
    }

    // Only search for a template if we don't have an explicit override
    if (!layoutKey) {
        // First: try to find a template that exactly matches the block length AND slot mapping
        template = activeTemplates.find(t => {
            if (t.maxChars !== blockTokens.length) return false;

            for (let i = 0; i < blockTokens.length; i++) {
                const char = blockTokens[i];
                const slot = (t.slotMapping || [])[i];
                let source;
                if (typeof slot === 'string') {
                    source = i === 1 ? 'vowels' : 'consonants';
                } else if (slot && slot.source) {
                    source = slot.source;
                } else {
                    source = i === 1 ? 'vowels' : 'consonants';
                }

                if (source === 'vowels' && !vowList.includes(char)) return false;
                if (source === 'consonants' && !consList.includes(char)) return false;
                if (source === 'otherPhonemes' && !otherList.includes(char)) return false;
            }
            return true;
        });

        // Fallback: if no strict slot match, find the first template with the same length
        if (!template) {
            template = activeTemplates.find(t => t.maxChars === blockTokens.length);
        }

        if (template) {
            layoutKey = template.layoutTemplate || '2top1bottom';
        }
    }

    let matrix = layoutKey ? blockLayoutMatrices[layoutKey] : null;

    if (!matrix || matrix.length !== blockTokens.length) {
        layoutKey = Object.keys(blockLayoutMatrices).find(k => blockLayoutMatrices[k].length === blockTokens.length);
        matrix = layoutKey ? blockLayoutMatrices[layoutKey] : null;
    }

    if (!matrix) return null;

    const combinedStrokes = [];
    for (let i = 0; i < blockTokens.length; i++) {
        const char = blockTokens[i];
        const strokes = featuralComponents[char];
        if (!strokes || strokes.length === 0) return null;

        const cleanStrokes = strokes.filter(s => Array.isArray(s) && !(s.length === 1 && [-999, -998, -997, -996].includes(s[0]?.x)));

        let minX = Infinity;
        let minY = Infinity;
        cleanStrokes.forEach(stroke => {
            stroke.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.y < minY) minY = pt.y;
            });
        });
        if (minX === Infinity) minX = 0;
        if (minY === Infinity) minY = 0;

        const transform = matrix[i];
        combinedStrokes.push(...cleanStrokes.map(stroke =>
            stroke.map(point => ({
                x: Number((((point.x - minX) * transform.scale) + transform.tx).toFixed(1)),
                y: Number((((point.y - minY) * transform.scale) + transform.ty).toFixed(1))
            }))
        ));
    }
    return combinedStrokes.length > 0 ? combinedStrokes : null;
};

