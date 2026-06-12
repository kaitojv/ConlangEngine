import { compileFont } from './fontCompiler.jsx';

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

const parseList = (str) => (str || '').split(',')
    .map(s => {
        let clean = s.trim().toLowerCase();
        if (clean.includes('=')) clean = clean.split('=')[0].trim();
        return clean;
    })
    .filter(Boolean);

// Helper to compile a single block string using the right template matrix
const compileBlockStrokes = (blockStr, activeTemplates, featuralComponents, consList, vowList, otherList) => {
    // First: try to find a template that exactly matches the block length AND slot mapping
    let template = activeTemplates.find(t => {
        if (t.maxChars !== blockStr.length) return false;
        
        // Check slot mapping to distinguish between multiple templates of the same length
        for (let i = 0; i < blockStr.length; i++) {
            const char = blockStr[i];
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

    // Fallback: if no strict slot match, find the first template with the same length
    if (!template) {
        template = activeTemplates.find(t => t.maxChars === blockStr.length);
    }
    
    // Fallback: if no exact match, find ANY layout in the registry that fits this block length.
    // This handles cases like writing "ki" (2 chars) when no 2-char template is configured.
    let matrix = null;
    let layoutKey = null;
    
    if (template) {
        layoutKey = template.layoutTemplate || '2top1bottom';
        matrix = blockLayoutMatrices[layoutKey];
        if (!matrix || matrix.length !== blockStr.length) {
            layoutKey = Object.keys(blockLayoutMatrices).find(k => blockLayoutMatrices[k].length === blockStr.length);
            matrix = layoutKey ? blockLayoutMatrices[layoutKey] : null;
        }
    }
    
    // No template configured for this length — look globally across all registered layouts
    if (!matrix) {
        layoutKey = Object.keys(blockLayoutMatrices).find(k => blockLayoutMatrices[k].length === blockStr.length);
        matrix = layoutKey ? blockLayoutMatrices[layoutKey] : null;
    }
    
    if (!matrix) return null;

    const combinedStrokes = [];
    for (let i = 0; i < blockStr.length; i++) {
        const char = blockStr[i];
        const strokes = featuralComponents[char];
        if (!strokes) return null; // Missing drawing for this char, skip block

        const transform = matrix[i];
        combinedStrokes.push(...strokes.map(stroke =>
            stroke.map(point => ({
                x: Number(((point.x * transform.scale) + transform.tx).toFixed(1)),
                y: Number(((point.y * transform.scale) + transform.ty).toFixed(1))
            }))
        ));
    }
    return combinedStrokes.length > 0 ? combinedStrokes : null;
};

export const generateBlockFontData = async (config) => {
    const { blockSettings, blockTemplates, featuralComponents, customGlyphs, puaCounter, consonants, vowels, otherPhonemes } = config;
    const traceWidth = config.typographySettings?.traceWidth ?? 30;

    if (!featuralComponents || Object.keys(featuralComponents).length === 0) {
        throw new Error("You must draw at least some base characters first!");
    }

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

    const consList = parseList(consonants);
    const vowList = parseList(vowels);
    const otherList = parseList(otherPhonemes);

    // Always start fresh — seeding from old customGlyphs would preserve stale stroke widths
    // and ignore the user's traceWidth setting change.
    let compilerGlyphs = {};
    let newSyllabaryMap = {};
    let currentPua = 983040; // Always restart from Plane 15 PUA base (0xF0000)

    // ── Step 1: Compile blocks from Lexicon ──────────────────────────────────
    // This is the primary source of blocks. We only compile what you actually use.
    if (config.lexicon && Array.isArray(config.lexicon)) {
        let count = 0;
        for (const entry of config.lexicon) {
            // Yield every 20 entries to prevent worker timeouts
            if (++count % 20 === 0) await new Promise(r => setTimeout(r, 0));

            const sourceStr = entry.ideogram || entry.word?.replace(/\*/g, '').toLowerCase() || '';
            const blocks = sourceStr.split('.').filter(Boolean);

            for (const block of blocks) {
                if (newSyllabaryMap[block]) continue; // Already compiled this block

                const strokes = compileBlockStrokes(block, activeTemplates, featuralComponents, consList, vowList, otherList);
                if (!strokes) continue;

                compilerGlyphs[currentPua] = strokes;
                newSyllabaryMap[block] = String.fromCodePoint(currentPua);
                currentPua++;
                if (currentPua >= 1114111) break;
            }
            if (currentPua >= 1114111) break;
        }
    }

    // ── Step 2: Compile Standalone Radicals ──────────────────────────────────
    // Every drawn base character gets compiled at full scale so individual
    // letters render as their drawn glyph even outside a block context.
    const SOLO_SCALE = 0.9;
    const SOLO_OFFSET = 15;
    const compileStandalone = config.blockSettings?.compileStandaloneBases !== false;

    if (compileStandalone) {
        for (const [char, strokes] of Object.entries(featuralComponents)) {
            if (!strokes || strokes.length === 0) continue;
            if (newSyllabaryMap[char]) continue; // Already mapped (e.g. as a 1-char block from lexicon)

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

    // ── Step 3: Compile font in 60k-glyph chunks ─────────────────────────────
    const base64Fonts = [];
    const entries = Object.entries(compilerGlyphs);
    const CHUNK_SIZE = 60000;

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunkGlyphs = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE));
        const base64Font = await compileFont(chunkGlyphs, traceWidth);
        if (base64Font) base64Fonts.push(base64Font);
    }

    return {
        syllabaryMap: newSyllabaryMap,
        customFontBase64: base64Fonts.length === 1 ? base64Fonts[0] : base64Fonts,
        puaCounter: currentPua
    };
};

