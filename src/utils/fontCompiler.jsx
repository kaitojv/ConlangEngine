// src/utils/fontCompiler.js
import opentype from 'opentype.js';

export async function compileFont(customGlyphs) {
    try {
        const notdefGlyph = new opentype.Glyph({
            name: '.notdef', unicode: 0, advanceWidth: 600, path: new opentype.Path()
        });

        const spaceGlyph = new opentype.Glyph({
            name: 'space', unicode: 32, advanceWidth: 500, path: new opentype.Path()
        });

        let glyphs = [notdefGlyph, spaceGlyph];

        for (const [unicodeStr, strokeArray] of Object.entries(customGlyphs)) {
            const unicode = parseInt(unicodeStr);
            let path = new opentype.Path();
            const r = 30;

            strokeArray.forEach(originalStroke => {
                if (originalStroke.length === 0) return;

                for (let i = 0; i < originalStroke.length; i++) {
                    let pt1 = originalStroke[i];
                    let cx1 = 100 + (pt1.x * 2.66);
                    let cy1 = 800 - (pt1.y * 2.66);

                    const kappa = r * 0.55228;
                    path.moveTo(cx1, cy1 - r);
                    path.curveTo(cx1 + kappa, cy1 - r, cx1 + r, cy1 - kappa, cx1 + r, cy1);
                    path.curveTo(cx1 + r, cy1 + kappa, cx1 + kappa, cy1 + r, cx1, cy1 + r);
                    path.curveTo(cx1 - kappa, cy1 + r, cx1 - r, cy1 + kappa, cx1 - r, cy1);
                    path.curveTo(cx1 - r, cy1 - kappa, cx1 - kappa, cy1 - r, cx1, cy1 - r);
                    path.close();

                    if (i < originalStroke.length - 1) {
                        let pt2 = originalStroke[i+1];
                        let cx2 = 100 + (pt2.x * 2.66);
                        let cy2 = 800 - (pt2.y * 2.66);

                        let dx = cx2 - cx1;
                        let dy = cy2 - cy1;
                        let len = Math.sqrt(dx*dx + dy*dy);
                        
                        if (len > 0) {
                            let nx = (dy / len) * r;
                            let ny = -(dx / len) * r;
                            
                            path.moveTo(cx1 + nx, cy1 + ny);
                            path.lineTo(cx2 + nx, cy2 + ny);
                            path.lineTo(cx2 - nx, cy2 - ny);
                            path.lineTo(cx1 - nx, cy1 - ny);
                            path.close();
                        }
                    }
                }
            });

            glyphs.push(new opentype.Glyph({
                name: `syl_${unicode}`, unicode: unicode, advanceWidth: 1000, path: path
            }));
        }

        const font = new opentype.Font({
            familyName: 'ConlangFont', styleName: 'Regular', unitsPerEm: 1000, ascender: 800, descender: -200, glyphs: glyphs
        });

        const arrayBuffer = font.toArrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        
        return `data:font/truetype;charset=utf-8;base64,${btoa(binary)}`;
    } catch (e) {
        console.error("Fatal error compiling font:", e);
        return null;
    }
}