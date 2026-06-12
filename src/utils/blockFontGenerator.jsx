import { compileFont } from './fontCompiler.jsx';

export const blockLayoutMatrices = {
    '1center': [
        { scale: 0.9, tx: 15, ty: 15 }
    ],
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

// Recursive function to generate all Cartesian combinations with a hard limit to prevent browser crashes
// OpenType/Unicode max valid code point is 0x10FFFF.
// CRITICAL: We cap this at 10,000 to prevent Chrome's V8 Engine from hitting its hard-coded memory limit (OOM).
// Generating 121k perfect bezier curve glyphs requires ~5-6 GB of heap memory, which Chrome blocks regardless of system RAM.
const generateCombinations = (lists, prefix = [], maxCombinations = 10000, context = { count: 0 }) => {
    if (context.count >= maxCombinations) return [];
    
    if (lists.length === 0) {
        context.count++;
        return [prefix];
    }
    
    const currentList = lists[0];
    const remainingLists = lists.slice(1);
    const combinations = [];
    
    for (const item of currentList) {
        if (context.count >= maxCombinations) break;
        combinations.push(...generateCombinations(remainingLists, [...prefix, item], maxCombinations, context));
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
        let layoutKey = template.layoutTemplate || '2top1bottom';
        let matrix = blockLayoutMatrices[layoutKey];

        // Gracefully recover if the saved layoutTemplate is incompatible with maxChars
        if (!matrix || matrix.length !== maxChars) {
            layoutKey = Object.keys(blockLayoutMatrices).find(k => blockLayoutMatrices[k].length === maxChars) || '2top1bottom';
            matrix = blockLayoutMatrices[layoutKey];
        }

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

        let loopCount = 0;
        for (const combo of allCombinations) {
            // Yield to main thread every 500 combinations to prevent browser freezing
            if (++loopCount % 500 === 0) {
                await new Promise(r => setTimeout(r, 0));
            }

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
                    
                    if (currentPua >= 1114111) {
                        console.warn("Hit absolute OpenType Unicode limit (1.11 million glyphs). Stopping generation early.");
                        break;
                    }
                }
            }
            if (currentPua >= 1114111) break;
        }
    }

    // ── Lexicon Override ────────────────────────────────────────────────────
    // If the cartesian limit (4000) skipped a block the user actually typed in their dictionary,
    // we MUST force-compile it so it renders properly in their text!
    if (config.lexicon && Array.isArray(config.lexicon)) {
        for (const entry of config.lexicon) {
            const sourceStr = entry.ideogram || entry.word?.replace(/\*/g, '').toLowerCase() || '';
            const blocks = sourceStr.split('.');
            
            for (const block of blocks) {
                if (!block || newSyllabaryMap[block]) continue; // Already compiled
                
                // Find a template that matches the block's length
                const template = activeTemplates.find(t => t.maxChars === block.length);
                if (!template) continue; // No template supports this block length
                
                let layoutKey = template.layoutTemplate || '2top1bottom';
                let matrix = blockLayoutMatrices[layoutKey];
                if (!matrix || matrix.length !== block.length) {
                    layoutKey = Object.keys(blockLayoutMatrices).find(k => blockLayoutMatrices[k].length === block.length) || '2top1bottom';
                    matrix = blockLayoutMatrices[layoutKey];
                }
                
                if (!matrix || matrix.length < block.length) continue;
                
                const combinedStrokes = [];
                let valid = true;
                
                for (let i = 0; i < block.length; i++) {
                    const char = block[i];
                    const strokes = featuralComponents[char];
                    if (!strokes) { valid = false; break; }
                    
                    const transform = matrix[i];
                    const transformedStrokes = strokes.map(stroke => 
                        stroke.map(point => ({
                            x: Number(((point.x * transform.scale) + transform.tx).toFixed(1)),
                            y: Number(((point.y * transform.scale) + transform.ty).toFixed(1))
                        }))
                    );
                    combinedStrokes.push(...transformedStrokes);
                }
                
                if (valid && combinedStrokes.length > 0) {
                    compilerGlyphs[currentPua] = combinedStrokes;
                    newSyllabaryMap[block] = String.fromCodePoint(currentPua);
                    currentPua++;
                }
            }
        }
    }

    // ── Standalone Radicals ─────────────────────────────────────────────────
    // Any drawn base character that has NO syllabaryMap entry yet (i.e. it never
    // appeared as part of a full-block combination) gets compiled at full scale so
    // that isolated radicals render as their drawn glyph instead of plain text.
    const SOLO_SCALE  = 0.9;
    const SOLO_OFFSET = 15; // px — centres the glyph with a small margin

    const compileStandalone = config.blockSettings?.compileStandaloneBases !== false; // true by default

    if (compileStandalone) {
        for (const [char, strokes] of Object.entries(featuralComponents)) {
            if (!strokes || strokes.length === 0) continue;

            const soloStrokes = strokes.map(stroke =>
                stroke.map(point => ({
                    x: Number(((point.x * SOLO_SCALE) + SOLO_OFFSET).toFixed(1)),
                    y: Number(((point.y * SOLO_SCALE) + SOLO_OFFSET).toFixed(1))
                }))
            );

            compilerGlyphs[currentPua] = soloStrokes;
            newSyllabaryMap[char] = String.fromCodePoint(currentPua);
            currentPua++;
            
            if (currentPua >= 1114111) break;
        }
    }

    const base64Fonts = [];
    const entries = Object.entries(compilerGlyphs);
    const CHUNK_SIZE = 60000; // Safe limit under OpenType's 65,535 maximum
    
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunkEntries = entries.slice(i, i + CHUNK_SIZE);
        const chunkGlyphs = Object.fromEntries(chunkEntries);
        const base64Font = await compileFont(chunkGlyphs);
        base64Fonts.push(base64Font);
    }

    return {
        syllabaryMap: newSyllabaryMap,
        // If there's only one chunk, keep it as a single string for backward compatibility, otherwise return array
        customFontBase64: base64Fonts.length === 1 ? base64Fonts[0] : base64Fonts,
        puaCounter: currentPua
    };
};

