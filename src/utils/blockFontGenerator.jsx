import { compileFont } from './fontCompiler.jsx';

export const blockLayoutMatrices = {
    '2top1bottom': [
        { scale: 0.48, tx: 5, ty: 5 },
        { scale: 0.48, tx: 125, ty: 5 },
        { scale: 0.48, tx: 65, ty: 125 }
    ],
    '1top2bottom': [
        { scale: 0.48, tx: 65, ty: 5 },
        { scale: 0.48, tx: 5, ty: 125 },
        { scale: 0.48, tx: 125, ty: 125 }
    ],
    '1left2right': [
        { scale: 0.48, tx: 5, ty: 65 },
        { scale: 0.48, tx: 125, ty: 5 },
        { scale: 0.48, tx: 125, ty: 125 }
    ],
    '3horizontal': [
        { scale: 0.32, tx: 5, ty: 85 },
        { scale: 0.32, tx: 85, ty: 85 },
        { scale: 0.32, tx: 165, ty: 85 }
    ],
    '2horizontal': [
        { scale: 0.48, tx: 5, ty: 65 },
        { scale: 0.48, tx: 125, ty: 65 }
    ],
    '2vertical': [
        { scale: 0.48, tx: 65, ty: 5 },
        { scale: 0.48, tx: 65, ty: 125 }
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
        { scale: 0.48, tx: 5, ty: 5 },
        { scale: 0.48, tx: 125, ty: 5 },
        { scale: 0.48, tx: 5, ty: 125 },
        { scale: 0.48, tx: 125, ty: 125 }
    ]
};

const parseList = (str) => str.split(',')
    .map(s => {
        let clean = s.trim().toLowerCase();
        if (clean.includes('=')) clean = clean.split('=')[0].trim();
        return clean;
    })
    .filter(Boolean);

// Recursive function to generate all Cartesian combinations
const generateCombinations = (lists, prefix = []) => {
    if (lists.length === 0) return [prefix];
    const currentList = lists[0];
    const remainingLists = lists.slice(1);
    const combinations = [];
    
    for (const item of currentList) {
        combinations.push(...generateCombinations(remainingLists, [...prefix, item]));
    }
    
    return combinations;
};

export const generateBlockFontData = async (config) => {
    const { consonants, vowels, otherPhonemes, blockSettings, blockTemplates, featuralComponents, customGlyphs, puaCounter } = config;
    
    if (!featuralComponents || Object.keys(featuralComponents).length === 0) {
        throw new Error("You must draw at least some base characters first!");
    }

    const consList = ["", ...parseList(consonants)];
    const vowList = parseList(vowels);
    const otherList = parseList(otherPhonemes || '');

    const activeTemplates = blockTemplates || (blockSettings ? [
        {
            id: 'legacy',
            maxChars: blockSettings.maxChars || 3,
            layoutTemplate: blockSettings.layoutTemplate || '2top1bottom',
            slotMapping: blockSettings.slotMapping || []
        }
    ] : []);

    if (activeTemplates.length === 0) {
        throw new Error("No block templates found.");
    }

    let compilerGlyphs = { ...customGlyphs };
    let newSyllabaryMap = {};
    
    // Move block font generation to Plane 15 PUA (0xF0000) to avoid BMP collisions and overflow.
    // BMP PUA only has 6,400 slots, whereas Plane 15 has 65k+.
    let currentPua = Math.max(puaCounter, 983040); 

    for (const template of activeTemplates) {
        const slotMapping = template.slotMapping || [];
        const maxChars = template.maxChars || 3;
        const layoutKey = template.layoutTemplate || '2top1bottom';
        const matrix = blockLayoutMatrices[layoutKey];

        if (!matrix || matrix.length < maxChars) {
            console.warn(`Invalid layout configuration for template ${template.id}.`);
            continue;
        }

        // Determine the lists to combine for this template
        const listsToCombine = [];
        for (let i = 0; i < maxChars; i++) {
            let slot = slotMapping[i];
            let source;
            if (typeof slot === 'string') {
                source = i === 1 ? 'vowels' : 'consonants';
            } else if (slot && slot.source) {
                source = slot.source;
            } else {
                source = i === 1 ? 'vowels' : 'consonants';
            }
            
            let targetList = consList;
            if (source === 'vowels') targetList = vowList;
            if (source === 'otherPhonemes') targetList = otherList;
            
            listsToCombine.push(targetList);
        }

        const allCombinations = generateCombinations(listsToCombine);

        for (const combo of allCombinations) {
            const syllableStr = combo.join('');
            if (!syllableStr) continue; // Skip totally empty blocks
            
            // If another template already generated this syllable (e.g. CV vs CVC clash), the LAST template wins.
            // Or we could let the first template win? Let's let the last one overwrite if there's a clash.
            
            const combinedStrokes = [];

            for (let i = 0; i < combo.length; i++) {
                const char = combo[i];
                if (!char) continue;

                const strokes = featuralComponents[char];
                if (!strokes) continue;

                const transform = matrix[i];

                const transformedStrokes = strokes.map(stroke => 
                    stroke.map(point => ({
                        x: Number(((point.x * transform.scale) + transform.tx).toFixed(1)),
                        y: Number(((point.y * transform.scale) + transform.ty).toFixed(1))
                    }))
                );

                combinedStrokes.push(...transformedStrokes);
            }

            if (combinedStrokes.length > 0) {
                // If this syllable was already generated by an earlier template, we could reuse the PUA
                // But it's safer to just overwrite the map and use a new PUA (orphaning the old one in customGlyphs)
                // Actually, if it exists, let's just overwrite the strokes at the existing PUA.
                const existingChar = newSyllabaryMap[syllableStr];
                if (existingChar) {
                    const existingPua = existingChar.codePointAt(0);
                    compilerGlyphs[existingPua] = combinedStrokes;
                } else {
                    compilerGlyphs[currentPua] = combinedStrokes;
                    newSyllabaryMap[syllableStr] = String.fromCodePoint(currentPua);
                    currentPua++;
                }
            }
        }
    }

    const base64Font = await compileFont(compilerGlyphs);

    return {
        syllabaryMap: newSyllabaryMap,
        customFontBase64: base64Font,
        puaCounter: currentPua
    };
};
