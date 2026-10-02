// Measures the real reduction on an actual workspace file.
import { readFileSync } from 'node:fs';
import { previewSimplification, simplifyGlyph, countGlyphPoints } from '../src/utils/glyphSimplify.js';

const path = process.argv[2];
const data = JSON.parse(readFileSync(path, 'utf8'));
const glyphs = data.config?.scriptDataById?.default?.customGlyphs || {};

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
console.log(`glyphs: ${Object.keys(glyphs).length}`);
console.log(`glyph JSON before: ${mb(JSON.stringify(glyphs).length)}\n`);

// Worst-case geometric deviation: for every original point, distance to the
// nearest point on the simplified polyline's segments. This is what "looks the
// same" actually means for a renderer.
function maxDeviation(before, after) {
    let worst = 0;
    // before/after are arrays of strokes; flatten to a flat list of points.
    const beforePts = before.flat();
    const afterSegs = after.filter((s) => s.length >= 2);
    for (const b of beforePts) {
        let nearest = Infinity;
        for (const s of afterSegs) {
            for (let i = 0; i < s.length - 1; i++) {
                const a = s[i];
                const c = s[i + 1];
                const dx = c.x - a.x;
                const dy = c.y - a.y;
                let t = ((b.x - a.x) * dx + (b.y - a.y) * dy) / (dx * dx + dy * dy);
                t = Math.max(0, Math.min(1, t));
                const d = Math.hypot(b.x - (a.x + t * dx), b.y - (a.y + t * dy));
                if (d < nearest) nearest = d;
            }
            // A closed ring is drawn by joining the last point back to the
            // first, so that implicit segment must be measured too.
            const f = s[0];
            const l = s[s.length - 1];
            if (Math.abs(f.x - l.x) <= 1 && Math.abs(f.y - l.y) <= 1) {
                const dx = f.x - l.x;
                const dy = f.y - l.y;
                let t = ((b.x - l.x) * dx + (b.y - l.y) * dy) / (dx * dx + dy * dy);
                t = Math.max(0, Math.min(1, t));
                const d = Math.hypot(b.x - (l.x + t * dx), b.y - (l.y + t * dy));
                if (d < nearest) nearest = d;
            }
        }
        if (Number.isFinite(nearest) && nearest > worst) worst = nearest;
    }
    return worst;
}

const rows = [];
for (const tol of [0.25, 0.5, 1, 2]) {
    const started = Date.now();
    const p = previewSimplification(glyphs, { tolerance: tol, precision: 2 });
    const ms = Date.now() - started;
    rows.push({
        tol,
        points: `${p.beforePoints.toLocaleString('en-US')} -> ${p.afterPoints.toLocaleString('en-US')}`,
        pointCut: `${(p.pointReduction * 100).toFixed(1)}%`,
        size: `${mb(p.beforeBytes)} -> ${mb(p.afterBytes)}`,
        byteCut: `${(p.byteReduction * 100).toFixed(1)}%`,
        ms,
    });
}
console.table(rows);

// Geometric accuracy check on the glyphs that were heaviest.
const heaviest = Object.entries(glyphs)
    .sort((a, b) => countGlyphPoints(b[1]) - countGlyphPoints(a[1]))
    .slice(0, 5);

console.log('\nmax deviation per glyph, comparing each stroke to its own simplified form:');
console.log('(single-point strokes are isolated dots/marks and are preserved exactly,');
console.log(' so they are excluded -- measuring a dot against other strokes is not a');
console.log(' fidelity signal)');
for (const tol of [0.5, 1]) {
    const devs = [];
    for (const [code, glyph] of heaviest) {
        const before = glyph.filter(Array.isArray).filter((s) => s.length >= 2);
        const after = simplifyGlyph(glyph, { tolerance: tol, precision: 2 })
            .filter(Array.isArray)
            .filter((s) => s.length >= 2);
        devs.push({ code: `U+${(+code).toString(16).toUpperCase()}`, px: maxDeviation(before, after).toFixed(3) });
    }
    console.log(`  tolerance ${tol}: ${devs.map((d) => `${d.code}=${d.px}`).join('  ')}`);
}

console.log('\n=== investigating U+E03C ===');
const target = glyphs[0xe03c];
if (target) {
    const strokes = target.filter(Array.isArray);
    console.log(`strokes: ${strokes.length}`);
    strokes.forEach((s, i) => {
        const f = s[0];
        const l = s[s.length - 1];
        const closed = Math.abs(f.x - l.x) <= 1 && Math.abs(f.y - l.y) <= 1;
        console.log(`  stroke ${i}: ${s.length} pts, closed=${closed}`);
    });

    for (const tol of [0.5, 1]) {
        const after = simplifyGlyph(target, { tolerance: tol, precision: 2 }).filter(Array.isArray);
        console.log(`\n  tol=${tol}: ${strokes.length} -> ${after.length} strokes`);
        after.forEach((s, i) => {
            const before = strokes[i];
            if (!before) return;
            const d = maxDeviation([before], [s]);
            console.log(`    stroke ${i}: ${before.length} -> ${s.length} pts, maxDev=${d.toFixed(3)}`);
        });
    }

    // Which stroke index is the offender?
    for (const tol of [0.5]) {
        const after = simplifyGlyph(target, { tolerance: tol, precision: 2 }).filter(Array.isArray);
        let worst = { i: -1, d: 0 };
        strokes.forEach((s, i) => {
            const d = maxDeviation([s], [after[i]]);
            if (d > worst.d) worst = { i, d };
        });
        console.log(`\n  worst stroke at tol=${tol}: index ${worst.i}, dev ${worst.d.toFixed(3)}`);
        const ws = strokes[worst.i];
        console.log(`    before: ${ws.length} pts, closed=${Math.abs(ws[0].x - ws[ws.length-1].x) <= 1 && Math.abs(ws[0].y - ws[ws.length-1].y) <= 1}`);
        console.log(`    after : ${after[worst.i]?.length} pts, closed=${after[worst.i] ? Math.abs(after[worst.i][0].x - after[worst.i][after[worst.i].length-1].x) <= 1 && Math.abs(after[worst.i][0].y - after[worst.i][after[worst.i].length-1].y) <= 1 : 'n/a'}`);
    }
}

// Resulting full-file size estimate.
const p1 = previewSimplification(glyphs, { tolerance: 1, precision: 2 });
const glyphBytesBefore = JSON.stringify(glyphs).length;
const glyphBytesAfter = p1.afterBytes;
const saved = glyphBytesBefore - glyphBytesAfter;
console.log(`\ntolerance 1 saves ${mb(saved)} of glyph data (${(saved / glyphBytesBefore * 100).toFixed(1)}%)`);
