import { compileFont } from './fontCompiler.jsx';

export const blockLayoutMatrices = {
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
    '3horizontal': [
        { scale: 0.3, tx: 10, ty: 105 },
        { scale: 0.3, tx: 105, ty: 105 },
        { scale: 0.3, tx: 200, ty: 105 }
    ],
    '2horizontal': [
        { scale: 0.45, tx: 10, ty: 82.5 },
        { scale: 0.45, tx: 155, ty: 82.5 }
    ],
    '2vertical': [
        { scale: 0.45, tx: 82.5, ty: 10 },
        { scale: 0.45, tx: 82.5, ty: 155 }
    ],
    '2x2grid': [
        { scale: 0.45, tx: 10, ty: 10 },
        { scale: 0.45, tx: 155, ty: 10 },
        { scale: 0.45, tx: 10, ty: 155 },
        { scale: 0.45, tx: 155, ty: 155 }
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
    const { consonants, vowels, blockSettings, featuralComponents, customGlyphs, puaCounter } = config;
    
    if (!featuralComponents || Object.keys(featuralComponents).length === 0) {
        throw new Error("You must draw at least some base characters first!");
    }

    const consList = ["", ...parseList(consonants)];
    const vowList = parseList(vowels);

    const slotMapping = blockSettings.slotMapping || [];
    const maxChars = blockSettings.maxChars || 3;
    const layoutKey = blockSettings.layoutTemplate || '2top1bottom';
    const matrix = blockLayoutMatrices[layoutKey];

    if (!matrix || matrix.length < maxChars) {
        throw new Error("Invalid layout configuration.");
    }

    // Determine the lists to combine
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
        listsToCombine.push(source === 'vowels' ? vowList : consList);
    }

    const allCombinations = generateCombinations(listsToCombine);

    let compilerGlyphs = { ...customGlyphs };
    let newSyllabaryMap = {};
    let currentPua = puaCounter;

    for (const combo of allCombinations) {
        const syllableStr = combo.join('');
        if (!syllableStr) continue; // Skip totally empty blocks

        const combinedStrokes = [];

        // For each component in the block
        for (let i = 0; i < combo.length; i++) {
            const char = combo[i];
            if (!char) continue; // Empty consonant slot, skip drawing

            const strokes = featuralComponents[char];
            if (!strokes) continue; // User hasn't drawn this character yet

            const transform = matrix[i];

            // Apply scaling and translation to each point in the strokes
            const transformedStrokes = strokes.map(stroke => 
                stroke.map(point => ({
                    x: Number(((point.x * transform.scale) + transform.tx).toFixed(1)),
                    y: Number(((point.y * transform.scale) + transform.ty).toFixed(1))
                }))
            );

            combinedStrokes.push(...transformedStrokes);
        }

        if (combinedStrokes.length > 0) {
            compilerGlyphs[currentPua] = combinedStrokes;
            newSyllabaryMap[syllableStr] = String.fromCharCode(currentPua);
            currentPua++;
        }
    }

    // Compile the actual font
    const base64Font = await compileFont(compilerGlyphs);

    return {
        syllabaryMap: newSyllabaryMap,
        customFontBase64: base64Font,
        puaCounter: currentPua
    };
};
