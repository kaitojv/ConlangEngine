import fs from 'fs';

const parseList = (str) => (str || '').split(',')
    .map(s => {
        let clean = s.trim().toLowerCase();
        if (clean.includes('=')) clean = clean.split('=')[0].trim();
        return clean;
    })
    .filter(Boolean);

const compileBlockStrokes = (blockStr, activeTemplates, featuralComponents, consList, vowList, otherList, overrideLayout = null) => {
    let template = null;
    let layoutKey = overrideLayout;
    
    const allPhonemes = [...consList, ...vowList, ...otherList].sort((a, b) => b.length - a.length);
    let blockTokens = [];
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
    
    if (!layoutKey) {
        template = activeTemplates.find(t => {
            if (t.maxChars !== blockTokens.length) return false;
            for (let i = 0; i < blockTokens.length; i++) {
                const char = blockTokens[i];
                let slot = (t.slotMapping || [])[i];
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

        if (!template) {
            template = activeTemplates.find(t => t.maxChars === blockTokens.length);
        }
        
        if (template) {
            layoutKey = template.layoutTemplate || '2top1bottom';
        }
    }
    
    const blockLayoutMatrices = {
        '2top1bottom': [
            { scale: 0.5, tx: 0, ty: 0 },
            { scale: 0.5, tx: 50, ty: 0 },
            { scale: 0.5, tx: 25, ty: 50 }
        ]
    };
    
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
        
        const cleanStrokes = strokes.filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)));

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

try {
    const consList = parseList('m, w');
    const vowList = parseList('a, i, u, ea');
    const otherList = parseList('1, 2, 3, ˧');
    const activeTemplates = [{ maxChars: 3, slotMapping: ['Initial', {source: 'otherPhonemes'}, {source: 'vowels'}], layoutTemplate: '2top1bottom' }];
    
    const strokesData = {
        'm': [[{x:0, y:0}, {x:10, y:10}]],
        '1': [[{x:0, y:0}, {x:10, y:10}]],
        'ea': [[{x:0, y:0}, {x:10, y:10}]],
        'w': [[{x:0, y:0}, {x:10, y:10}]],
        '˧': [[{x:0, y:0}, {x:10, y:10}]],
        'u': [[{x:0, y:0}, {x:10, y:10}]]
    };
    
    const r1 = compileBlockStrokes('m1ea', activeTemplates, strokesData, consList, vowList, otherList, null);
    const r2 = compileBlockStrokes('w˧u', activeTemplates, strokesData, consList, vowList, otherList, null);
    
    console.log("Result 1:", JSON.stringify(r1));
    console.log("Result 2:", JSON.stringify(r2));
} catch (e) {
    console.error("ERROR:", e);
}
