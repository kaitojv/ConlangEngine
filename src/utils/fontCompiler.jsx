import opentype from 'opentype.js';

export async function compileFont(customGlyphs, syllabaryMap = {}) {
    try {
        const notdefGlyph = new opentype.Glyph({
            name: '.notdef', unicode: 0, advanceWidth: 600, path: new opentype.Path()
        });

        const spaceGlyph = new opentype.Glyph({
            name: 'space', unicode: 32, advanceWidth: 600, path: new opentype.Path()
        });

        let glyphs = [notdefGlyph, spaceGlyph];
        let processedCount = 0;

        // Build a lookup for 1-to-1 Latin mapping
        const puaToLatin = {};
        if (syllabaryMap) {
            Object.entries(syllabaryMap).forEach(([roman, puaChar]) => {
                if (roman.length === 1 && typeof puaChar === 'string') {
                    const puaCode = puaChar.charCodeAt(0);
                    puaToLatin[puaCode] = roman.charCodeAt(0);
                }
            });
        }

        for (const [unicodeStr, strokeArray] of Object.entries(customGlyphs)) {
            if (++processedCount % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const unicode = parseInt(unicodeStr);
            let path = new opentype.Path();

            strokeArray.forEach(stroke => {
                if (stroke.length === 0) return;
                const pt1 = stroke[0];
                path.moveTo(100 + (pt1.x * 2.85), 800 - (pt1.y * 2.85));
                for (let i = 1; i < stroke.length; i++) {
                    const pt = stroke[i];
                    path.lineTo(100 + (pt.x * 2.85), 800 - (pt.y * 2.85));
                }
            });

            const glyph = new opentype.Glyph({
                name: `uni${unicode.toString(16)}`, unicode: unicode, advanceWidth: 1000, path: path
            });
            glyphs.push(glyph);

            // Add Latin fallback if mapped
            const latinCode = puaToLatin[unicode];
            if (latinCode) {
                glyphs.push(new opentype.Glyph({
                    name: `lat_${latinCode}`, unicode: latinCode, advanceWidth: 1000, path: path
                }));
            }
        }

        const font = new opentype.Font({
            familyName: 'ConlangFont',
            styleName: 'Regular',
            unitsPerEm: 1000,
            ascender: 800,
            descender: -200,
            glyphs: glyphs
        });

        const arrayBuffer = font.toArrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return `data:font/truetype;base64,${btoa(binary)}`;
    } catch (e) {
        console.error("Fatal error compiling font:", e);
        return null;
    }
}