import { compileFont } from './fontCompiler.jsx';
import { blockLayoutMatrices, parseList, compileBlockStrokes } from './blockLayout.js';

export { blockLayoutMatrices, parseList, compileBlockStrokes };

export const generateBlockFontData = async (config) => {
    const { blockSettings, blockTemplates, featuralComponents, consonants, vowels, otherPhonemes } = config;
    const traceWidth = config.typographySettings?.traceWidth ?? 30;
    const fontScale = config.typographySettings?.customFontScale ?? config.customFontScale ?? 1.0;

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
        const allPhonemes = [...consList, ...vowList, ...otherList].sort((a, b) => b.length - a.length);
        
        const extractPhonemes = (str) => {
            let phonemes = [];
            let i = 0;
            while (i < str.length) {
                let match = null;
                for (const p of allPhonemes) {
                    if (str.startsWith(p, i)) {
                        match = p;
                        break;
                    }
                }
                if (match) {
                    phonemes.push(match);
                    i += match.length;
                } else {
                    phonemes.push(str[i]);
                    i++;
                }
            }
            return phonemes;
        };

        const toneMap = blockSettings?.toneMap || [];

        let count = 0;
        for (const entry of config.lexicon) {
            // Yield every 20 entries to prevent worker timeouts
            if (++count % 20 === 0) await new Promise(r => setTimeout(r, 0));

            let sourceStr = entry.ideogram || entry.word?.replace(/\*/g, '').toLowerCase() || '';
            
            // Preprocess toned vowels into base + tone if mappings exist
            for (const mapping of toneMap) {
                const replacement = mapping.output !== undefined ? mapping.output : ((mapping.base || '') + (mapping.tone || ''));
                if (mapping.toned && replacement) {
                    sourceStr = sourceStr.split(mapping.toned.toLowerCase()).join(replacement.toLowerCase());
                }
            }
            
            let blocks = [];
            if (sourceStr.includes('.')) {
                blocks = sourceStr.split('.').filter(Boolean);
            } else {
                // Auto-chunking based on templates
                const phonemes = extractPhonemes(sourceStr);
                let i = 0;
                const sortedTemplates = [...activeTemplates].sort((a, b) => (b.maxChars || 3) - (a.maxChars || 3));
                
                while (i < phonemes.length) {
                    let bestMatchLen = 0;
                    
                    for (const template of sortedTemplates) {
                        const len = template.maxChars || 3;
                        if (i + len <= phonemes.length) {
                            let isValid = true;
                            for (let j = 0; j < len; j++) {
                                const char = phonemes[i + j];
                                let slot = (template.slotMapping || [])[j];
                                let source;
                                if (typeof slot === 'string') {
                                    source = j === 1 ? 'vowels' : 'consonants';
                                } else if (slot && slot.source) {
                                    source = slot.source;
                                } else {
                                    source = j === 1 ? 'vowels' : 'consonants';
                                }
                                
                                if (source === 'vowels' && !vowList.includes(char)) isValid = false;
                                if (source === 'consonants' && !consList.includes(char)) isValid = false;
                                if (source === 'otherPhonemes' && !otherList.includes(char)) isValid = false;
                            }
                            if (isValid) {
                                bestMatchLen = len;
                                break;
                            }
                        }
                    }
                    if (bestMatchLen > 0) {
                        blocks.push(phonemes.slice(i, i + bestMatchLen).join(''));
                        i += bestMatchLen;
                    } else {
                        blocks.push(phonemes[i]);
                        i++;
                    }
                }
            }

            for (const block of blocks) {
                if (newSyllabaryMap[block]) continue; // Already compiled this block

                let cleanBlock = block;
                let overrideLayout = null;
                if (block.includes(':')) {
                    const parts = block.split(':');
                    cleanBlock = parts[0];
                    overrideLayout = parts[1];
                }

                const strokes = compileBlockStrokes(cleanBlock, activeTemplates, featuralComponents, consList, vowList, otherList, overrideLayout);
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

            const cleanStrokes = strokes.filter(s => Array.isArray(s) && !(s.length === 1 && [-999, -998, -997, -996].includes(s[0]?.x)));

            // Find the bounding box origin to auto-align standalone bases too
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

            const soloStrokes = cleanStrokes.map(stroke =>
                stroke.map(point => ({
                    x: Number((((point.x - minX) * SOLO_SCALE) + SOLO_OFFSET).toFixed(1)),
                    y: Number((((point.y - minY) * SOLO_SCALE) + SOLO_OFFSET).toFixed(1))
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
        const isConsistent = config.typographySettings?.consistentCharacterSize ?? true;
        const fixedAdvance = config.typographySettings?.fixedAdvanceWidth ?? 1000;
        const base64Font = await compileFont(chunkGlyphs, traceWidth, fontScale, {
            consistentCharacterSize: isConsistent,
            fixedAdvanceWidth: fixedAdvance
        });
        if (base64Font) base64Fonts.push(base64Font);
    }

    return {
        syllabaryMap: newSyllabaryMap,
        customFontBase64: base64Fonts.length === 1 ? base64Fonts[0] : base64Fonts,
        puaCounter: currentPua
    };
};

