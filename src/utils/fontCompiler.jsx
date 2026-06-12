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
            // Yield to the main thread every 5 glyphs to prevent the UI from freezing
            if (++processedCount % 5 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const unicode = parseInt(unicodeStr);
            let path = new opentype.Path();
            let r_base = 30;

            // Detect calligraphy or brush pen flag
            const hasCalligraphy = strokeArray.length > 0 && 
                                  strokeArray[0].length === 1 && 
                                  strokeArray[0][0].x === -999;
            const hasBrushPen = strokeArray.length > 0 && 
                                  strokeArray[0].length === 1 && 
                                  strokeArray[0][0].x === -998;
            
            const isSpecialBrush = hasCalligraphy || hasBrushPen;
            const actualStrokes = isSpecialBrush ? strokeArray.slice(1) : strokeArray;

            actualStrokes.forEach(strokeData => {
                const points = Array.isArray(strokeData) ? strokeData : (strokeData.points || []);
                const isFilled = strokeData.isFilled || false;
                const lineCap = strokeData.lineCap || 'round';

                if (points.length === 0) return;

                // 1. Simplify the stroke by dropping points that are too close
                // Reduced threshold from 15 to 4 to preserve curvature without exploding point count
                const simplified = [points[0]];
                for (let i = 1; i < points.length; i++) {
                    let last = simplified[simplified.length - 1];
                    let curr = points[i];
                    let dx = curr.x - last.x;
                    let dy = curr.y - last.y;
                    if (Math.sqrt(dx*dx + dy*dy) > 4 || i === points.length - 1) {
                        simplified.push(curr);
                    }
                }

                if (isFilled && simplified.length >= 3) {
                    // Draw a solid filled path
                    path.moveTo(100 + simplified[0].x * 2.85, 800 - simplified[0].y * 2.85);
                    for (let i = 1; i < simplified.length; i++) {
                        path.lineTo(100 + simplified[i].x * 2.85, 800 - simplified[i].y * 2.85);
                    }
                    path.close();
                } else {
                    // Standard thickened stroke logic
                    for (let i = 0; i < simplified.length; i++) {
                        let pt1 = simplified[i];
                        let cx1 = 100 + (pt1.x * 2.85);
                        let cy1 = 800 - (pt1.y * 2.85);

                        let r = r_base;
                        if (hasCalligraphy) {
                            const taper = Math.sin((i / (simplified.length - 1 || 1)) * Math.PI);
                            r = r_base * (0.3 + 0.7 * taper);
                        } else if (hasBrushPen) {
                            const progress = i / (simplified.length - 1 || 1);
                            const widthMult = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) * 5); // 1.0 down to 0.0
                            const startMult = progress < 0.1 ? (0.5 + progress * 5) : 1.0; 
                            r = r_base * Math.max(0.1, widthMult * startMult);
                        }

                        // Draw an 8-point octagon joint at EVERY point. 
                        // This fixes the jagged "scattered pixels" issue by making joints look circular,
                        // while avoiding the extreme V8 memory overhead of true Bezier curves.
                        if (lineCap === 'round') {
                            const r707 = r * 0.707;
                            path.moveTo(cx1 + r, cy1);
                            path.lineTo(cx1 + r707, cy1 + r707);
                            path.lineTo(cx1, cy1 + r);
                            path.lineTo(cx1 - r707, cy1 + r707);
                            path.lineTo(cx1 - r, cy1);
                            path.lineTo(cx1 - r707, cy1 - r707);
                            path.lineTo(cx1, cy1 - r);
                            path.lineTo(cx1 + r707, cy1 - r707);
                            path.close();
                        }

                        if (i < simplified.length - 1) {
                            let pt2 = simplified[i+1];
                            let cx2 = 100 + (pt2.x * 2.85);
                            let cy2 = 800 - (pt2.y * 2.85);

                            let next_r = r_base;
                            if (hasCalligraphy) {
                                const next_taper = Math.sin(((i + 1) / (simplified.length - 1 || 1)) * Math.PI);
                                next_r = r_base * (0.3 + 0.7 * next_taper);
                            } else if (hasBrushPen) {
                                const next_progress = (i + 1) / (simplified.length - 1 || 1);
                                const next_widthMult = next_progress < 0.8 ? 1.0 : (1.0 - (next_progress - 0.8) * 5); 
                                const next_startMult = next_progress < 0.1 ? (0.5 + next_progress * 5) : 1.0; 
                                next_r = r_base * Math.max(0.1, next_widthMult * next_startMult);
                            }

                            let dx = cx2 - cx1;
                            let dy = cy2 - cy1;
                            let len = Math.sqrt(dx*dx + dy*dy);
                            
                            if (len > 0) {
                                let nx1 = (dy / len) * r;
                                let ny1 = -(dx / len) * r;
                                let nx2 = (dy / len) * next_r;
                                let ny2 = -(dx / len) * next_r;
                                
                                path.moveTo(cx1 + nx1, cy1 + ny1);
                                path.lineTo(cx2 + nx2, cy2 + ny2);
                                path.lineTo(cx2 - nx2, cy2 - ny2);
                                path.lineTo(cx1 - nx1, cy1 - ny1);
                                path.close();
                            }
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
        
        // SEC/PERF: Use native browser FileReader to convert ArrayBuffer to base64 asynchronously
        // This completely eliminates the synchronous 50,000,000+ iteration string concatenation loop that causes "Page Unresponsive" browser freezes.
        return await new Promise((resolve, reject) => {
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const reader = new FileReader();
            reader.onload = () => {
                // reader.result is a data URL like "data:application/octet-stream;base64,..."
                // We need to format it specifically as a TrueType font data URL
                const base64 = reader.result.split(',')[1];
                resolve(`data:font/truetype;charset=utf-8;base64,${base64}`);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    } catch (e) {
        console.error("Fatal error compiling font:", e);
        return null;
    }
}