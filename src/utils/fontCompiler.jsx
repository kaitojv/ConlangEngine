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
        let processedCount = 0;

        for (const [unicodeStr, strokeArray] of Object.entries(customGlyphs)) {
            // Yield to the main thread every 20 glyphs to prevent the UI from freezing
            if (++processedCount % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const unicode = parseInt(unicodeStr);
            let path = new opentype.Path();
            const r = 30;

            strokeArray.forEach(originalStroke => {
                if (originalStroke.length === 0) return;

                // 1. Simplify the stroke by dropping points that are too close (distance < 15)
                const simplified = [originalStroke[0]];
                for (let i = 1; i < originalStroke.length; i++) {
                    let last = simplified[simplified.length - 1];
                    let curr = originalStroke[i];
                    let dx = curr.x - last.x;
                    let dy = curr.y - last.y;
                    if (Math.sqrt(dx*dx + dy*dy) > 15 || i === originalStroke.length - 1) {
                        simplified.push(curr);
                    }
                }

                for (let i = 0; i < simplified.length; i++) {
                    let pt1 = simplified[i];
                    let cx1 = 100 + (pt1.x * 2.85); // Increased scale to make characters slightly larger
                    let cy1 = 800 - (pt1.y * 2.85);

                    // Only draw full joint circles for the very start, end, or sharp corners to save thousands of SVG commands
                    if (i === 0 || i === simplified.length - 1) {
                        const kappa = r * 0.55228;
                        path.moveTo(cx1, cy1 - r);
                        path.curveTo(cx1 + kappa, cy1 - r, cx1 + r, cy1 - kappa, cx1 + r, cy1);
                        path.curveTo(cx1 + r, cy1 + kappa, cx1 + kappa, cy1 + r, cx1, cy1 + r);
                        path.curveTo(cx1 - kappa, cy1 + r, cx1 - r, cy1 + kappa, cx1 - r, cy1);
                        path.curveTo(cx1 - r, cy1 - kappa, cx1 - kappa, cy1 - r, cx1, cy1 - r);
                        path.close();
                    }

                    if (i < simplified.length - 1) {
                        let pt2 = simplified[i+1];
                        let cx2 = 100 + (pt2.x * 2.85);
                        let cy2 = 800 - (pt2.y * 2.85);

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