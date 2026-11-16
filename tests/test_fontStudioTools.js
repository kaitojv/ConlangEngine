import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TYPOGRAPHY_METRICS,
    NIB_STYLE_OPTIONS,
    FONT_STYLE_PRESETS,
    cloneStrokeWithMeta,
    generateSerifEndcap,
    applySerifsToStrokes,
    stripSerifParts,
    applyStylePresetToGlyphEntry,
    fitStrokesToBand,
    alignStrokesToBaseline,
    centerStrokesHorizontally,
    flipStrokes,
    reverseStrokesDirection,
    getStrokesBounds,
    GLYPH_STAMPS,
    instantiateStampStrokes,
} from '../src/utils/fontStudioTools.js';

import {
    computeOtsuThreshold,
    vectorizeImageData,
} from '../src/utils/imageVectorizer.js';

import { parseSvgPathD } from '../src/utils/svgPathParser.js';
import { buildGlyphPathAndMetrics } from '../src/utils/fontCompiler.js';

test('applySerifsToStrokes adds non-duplicating parametric serifs and respects target modes', () => {
    const stem = [{ x: 150, y: 80 }, { x: 150, y: 240 }];
    const cross = [{ x: 90, y: 160 }, { x: 210, y: 160 }];
    stem.lineCap = 'butt';
    cross.lineCap = 'butt';

    const classicOnce = applySerifsToStrokes([stem, cross], {
        serifStyle: 'classic',
        size: 6,
        targetMode: 'terminals',
    });
    const serifCountOnce = classicOnce.filter((s) => s.isSerifPart).length;
    assert.equal(serifCountOnce, 4, '2 open strokes should receive 4 endpoint serifs');

    // Re-applying serif should replace existing isSerifPart strokes without multiplying them
    const slabTwice = applySerifsToStrokes(classicOnce, {
        serifStyle: 'slab',
        size: 6,
        targetMode: 'terminals',
    });
    const serifCountTwice = slabTwice.filter((s) => s.isSerifPart).length;
    assert.equal(serifCountTwice, 4, 'Repeated applySerifsToStrokes must not duplicate serifs');
    assert.ok(slabTwice.some((s) => s.isSerifPart && s.serifStyle === 'slab'));

    // Vertical-only target ignores horizontal crossbar endpoints
    const verticalOnly = applySerifsToStrokes([stem, cross], {
        serifStyle: 'wedge',
        size: 6,
        targetMode: 'verticals',
    });
    assert.equal(verticalOnly.filter((s) => s.isSerifPart).length, 2);

    // Stripping serifs restores clean base strokes
    const stripped = stripSerifParts(slabTwice);
    assert.equal(stripped.length, 2);
});

test('applyStylePresetToGlyphEntry updates metadata and preserves base geometry', () => {
    const baseEntry = [
        { isMeta: true, scale: 1.0, leftMargin: 80, rightMargin: 80, yOffset: 0, xOffset: 0 },
        [{ x: 120, y: 80 }, { x: 120, y: 240 }],
    ];
    const slabPreset = FONT_STYLE_PRESETS.find((p) => p.id === 'slab');
    const restyled = applyStylePresetToGlyphEntry(baseEntry, slabPreset, { strokeWeight: 1.4 });

    assert.equal(restyled[0].isMeta, true);
    assert.equal(restyled[0].isSerifPen, true);
    assert.equal(restyled[0].serifStyle, 'slab');
    assert.equal(restyled[0].strokeWeight, 1.4);
    assert.ok(restyled.slice(1).some((s) => s.isSerifPart && s.serifStyle === 'slab'));

    const sansPreset = FONT_STYLE_PRESETS.find((p) => p.id === 'sans');
    const backToSans = applyStylePresetToGlyphEntry(restyled, sansPreset);
    assert.equal(backToSans[0].isSerifPen, false);
    assert.equal(backToSans.slice(1).filter((s) => s.isSerifPart).length, 0);

    // Combining Calligraphy nib + Classic Serif keeps both active simultaneously
    const calligraphyNib = NIB_STYLE_OPTIONS.find((n) => n.id === 'calligraphy');
    const combined = applyStylePresetToGlyphEntry(baseEntry, calligraphyNib, {
        isSerifPen: true,
        serifStyle: 'classic',
    });
    assert.equal(combined[0].isCalligraphy, true);
    assert.equal(combined[0].isSerifPen, true);
    assert.equal(combined[0].serifStyle, 'classic');
    assert.ok(combined.slice(1).some((s) => s.isSerifPart && s.serifStyle === 'classic'));
});

test('generateSerifEndcap fully encloses round stroke endcaps without protruding tip', () => {
    const size = 10;
    const tip = { x: 150, y: 80 };
    const neighbor = { x: 150, y: 140 };
    const roundCapTop = tip.y - size * 0.5; // 75.0

    ['classic', 'slab', 'wedge'].forEach((serifStyle) => {
        const cap = generateSerifEndcap(tip, neighbor, { serifStyle, size, lineCap: 'round' });
        const minY = Math.min(...cap.map((p) => p.y));
        assert.ok(minY < roundCapTop, `${serifStyle} serif outer face (${minY}) must extend past round cap (${roundCapTop})`);
    });
});

test('metric fit, alignment, flip, and stamp helpers position strokes accurately', () => {
    const raw = [[{ x: 10, y: 10 }, { x: 50, y: 50 }]];
    const fittedCap = fitStrokesToBand(raw, 'cap_to_base');
    const bounds = getStrokesBounds(fittedCap);
    assert.ok(Math.abs(bounds.minY - TYPOGRAPHY_METRICS.capHeight) < 0.5);
    assert.ok(Math.abs(bounds.maxY - TYPOGRAPHY_METRICS.baseline) < 0.5);
    assert.ok(Math.abs(bounds.cx - 150) < 0.5);

    const offCenter = [[{ x: 40, y: 100 }, { x: 80, y: 200 }]];
    const centered = centerStrokesHorizontally(offCenter, 150);
    assert.ok(Math.abs(getStrokesBounds(centered).cx - 150) < 0.1);

    const onBase = alignStrokesToBaseline(offCenter, TYPOGRAPHY_METRICS.baseline);
    assert.ok(Math.abs(getStrokesBounds(onBase).maxY - TYPOGRAPHY_METRICS.baseline) < 0.1);

    const flipped = flipStrokes([[{ x: 100, y: 100 }, { x: 140, y: 120 }]], 'horizontal');
    assert.equal(flipped[0][0].x, 140);
    assert.equal(flipped[0][1].x, 100);

    const reversed = reverseStrokesDirection(offCenter);
    assert.equal(reversed[0][0].x, 80);

    const stamped = instantiateStampStrokes(GLYPH_STAMPS[0], { lineCap: 'butt' });
    assert.equal(stamped.length, 1);
    assert.equal(stamped[0].lineCap, 'butt');
});

test('cloneStrokeWithMeta preserves all nib and serif flags', () => {
    const s = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
    s.isFilled = true;
    s.isSerifPart = true;
    s.serifStyle = 'wedge';
    s.strokeWeight = 1.6;
    const copy = cloneStrokeWithMeta(s);
    assert.equal(copy.isFilled, true);
    assert.equal(copy.isSerifPart, true);
    assert.equal(copy.serifStyle, 'wedge');
    assert.equal(copy.strokeWeight, 1.6);
});

function createTestImageData(width, height, drawFn) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isInk = drawFn(x, y);
            const v = isInk ? 20 : 245;
            const i = (y * width + x) * 4;
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
            data[i + 3] = 255;
        }
    }
    return { width, height, data };
}

test('imageVectorizer computes Otsu threshold and traces centerline & outline with holes', () => {
    // Vertical bar 6x40 on a 64x64 image
    const barImg = createTestImageData(64, 64, (x, y) => x >= 29 && x <= 34 && y >= 10 && y <= 54);
    const thresh = computeOtsuThreshold(barImg);
    assert.ok(thresh > 40 && thresh < 220, `Expected bimodal threshold, got ${thresh}`);

    const centerStrokes = vectorizeImageData(barImg, { mode: 'centerline', threshold: thresh, fitBand: 'cap_to_base' });
    assert.ok(centerStrokes.length >= 1);
    assert.equal(centerStrokes[0].isFilled, false);
    const b = getStrokesBounds(centerStrokes);
    assert.ok(Math.abs(b.minY - TYPOGRAPHY_METRICS.capHeight) < 2);
    assert.ok(Math.abs(b.maxY - TYPOGRAPHY_METRICS.baseline) < 2);

    // Ring ("O") with an interior hole on 64x64 image
    const ringImg = createTestImageData(64, 64, (x, y) => {
        const r = Math.hypot(x - 32, y - 32);
        return r <= 22 && r >= 12;
    });

    const ringOutline = vectorizeImageData(ringImg, { mode: 'outline', threshold: 130, fitBand: 'cap_to_base' });
    assert.equal(ringOutline.length, 1, 'Outer ring + interior hole should bridge into 1 compound polygon');
    assert.equal(ringOutline[0].isFilled, true);
    assert.ok(ringOutline[0].length >= 8);
});

test('parseSvgPathD handles curves, relative commands, and multiple subpaths', () => {
    const strokes = parseSvgPathD('M 10 10 C 10 40, 50 40, 50 10 Z m 60 0 h 20 v 20 Z');
    assert.equal(strokes.length, 2, 'Two closed M...Z subpaths must produce two distinct strokes');
    assert.equal(strokes[0].isFilled, true);
    assert.ok(strokes[0].length > 5, 'Cubic Bezier should sample curve points');
    assert.equal(strokes[1][0].x, 70);
});

test('buildGlyphPathAndMetrics honors optional strokeWeight safely', () => {
    const normal = [{ isMeta: true, scale: 1.0, strokeWeight: 1.0 }, [{ x: 100, y: 100 }, { x: 200, y: 200 }]];
    const bold = [{ isMeta: true, scale: 1.0, strokeWeight: 2.0 }, [{ x: 100, y: 100 }, { x: 200, y: 200 }]];

    const resNormal = buildGlyphPathAndMetrics(normal, 30, 1.0);
    const resBold = buildGlyphPathAndMetrics(bold, 30, 1.0);

    const bbNormal = resNormal.path.getBoundingBox();
    const bbBold = resBold.path.getBoundingBox();
    assert.ok((bbBold.x2 - bbBold.x1) > (bbNormal.x2 - bbNormal.x1));
});
