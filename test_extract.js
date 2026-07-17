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
    
    // Re-extract phonemes to support multigraphs (e.g. "ea")
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
    
    // Only search for a template if we don't have an explicit override
    if (!layoutKey) {
        // First: try to find a template that exactly matches the block length AND slot mapping
        template = activeTemplates.find(t => {
            if (t.maxChars !== blockTokens.length) return false;
            
            // Check slot mapping to distinguish between multiple templates of the same length
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
    }
    
    return template;
};

try {
    const consList = parseList('m, w');
    const vowList = parseList('a, i, u, ea');
    const otherList = parseList('1, 2, 3');
    const activeTemplates = [{ maxChars: 3, slotMapping: ['Initial', {source: 'otherPhonemes'}, {source: 'vowels'}] }];
    
    const r = compileBlockStrokes('m1ea', activeTemplates, {}, consList, vowList, otherList, null);
    console.log("Result:", r);
} catch (e) {
    console.error("ERROR:", e);
}
