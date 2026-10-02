// End-to-end projection: what each finding would save on a real workspace file.
import { readFileSync, writeFileSync } from 'node:fs';
import { previewSimplification, simplifyGlyph, countGlyphPoints } from '../src/utils/glyphSimplify.js';

const path = process.argv[2];
const raw = readFileSync(path, 'utf8');
const data = JSON.parse(raw);
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

const script = data.config?.scriptDataById?.default || {};
const glyphs = script.customGlyphs || {};

const p = previewSimplification(glyphs, { tolerance: 1, precision: 2 });
const savedBySimplify = p.beforeBytes - p.afterBytes;
const dupIdentical = !!script.customFont && script.customFont === script.customFontBase64;
const savedByDedup = dupIdentical ? script.customFont.length : 0;

const dataBytes = JSON.stringify(data).length;
const projected = dataBytes - savedBySimplify - savedByDedup;

console.log(`file on disk          ${mb(raw.length).padStart(9)}`);
console.log(`  actual JSON data    ${mb(dataBytes).padStart(9)}`);
console.log(`  whitespace          ${mb(raw.length - dataBytes).padStart(9)}  (${((raw.length / dataBytes - 1) * 100).toFixed(0)}% inflation from pretty-printing)`);
console.log('');
console.log(`1. glyph simplification at 1px tolerance`);
console.log(`   glyphs             ${String(p.glyphCount).padStart(9)}`);
console.log(`   points             ${p.beforePoints.toLocaleString('en-US')} -> ${p.afterPoints.toLocaleString('en-US')}  (${(p.pointReduction * 100).toFixed(1)}% fewer)`);
console.log(`   glyph JSON         ${mb(p.beforeBytes)} -> ${mb(p.afterBytes)}`);
console.log('');
console.log(`2. duplicated font string`);
console.log(`   customFont === customFontBase64: ${dupIdentical}`);
console.log(`   one copy redundant ${mb(savedByDedup).padStart(9)}`);
console.log('');
console.log('3. minified export instead of pretty-printed');
console.log(`   projected size     ${mb(projected).padStart(9)}  (was ${mb(raw.length)})`);
console.log(`   total reduction    ${((1 - projected / raw.length) * 100).toFixed(0)}%`);
console.log('');

// Fidelity: worst deviation of any original point, per stroke.
function maxDev(pts, simplified) {
    let worst = 0;
    for (const b of pts) {
        let nearest = Infinity;
        for (let i = 0; i < simplified.length - 1; i++) {
            const a = simplified[i];
            const c = simplified[i + 1];
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            let t = ((b.x - a.x) * dx + (b.y - a.y) * dy) / (dx * dx + dy * dy);
            t = Math.max(0, Math.min(1, t));
            nearest = Math.min(nearest, Math.hypot(b.x - (a.x + t * dx), b.y - (a.y + t * dy)));
        }
        if (Number.isFinite(nearest) && nearest > worst) worst = nearest;
    }
    return worst;
}

let worstOverall = { code: null, dev: 0 };
for (const [code, glyph] of Object.entries(glyphs)) {
    const before = glyph.filter(Array.isArray).filter((s) => s.length >= 2);
    const after = simplifyGlyph(glyph, { tolerance: 1, precision: 2 })
        .filter(Array.isArray)
        .filter((s) => s.length >= 2);
    if (!after.length) continue;
    const flat = before.flat();
    const d = maxDev(flat, after.flat().concat([after.flat()[0]]));
    if (d > worstOverall.dev) worstOverall = { code, dev: d };
}
console.log(`worst deviation across all glyphs at 1px: ${worstOverall.dev.toFixed(2)}px (U+${(+worstOverall.code).toString(16).toUpperCase()})`);

if (process.argv[3]) {
    const out = JSON.parse(raw);
    out.config.scriptDataById.default.customGlyphs = Object.fromEntries(p.perGlyph.map((g) => [g.code, g.glyph]));
    delete out.config.scriptDataById.default.customFont;
    writeFileSync(process.argv[3], JSON.stringify(out));
    console.log(`\nwrote projected file (${mb(JSON.stringify(out).length)}) to ${process.argv[3]}`);
}
