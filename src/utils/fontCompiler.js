// src/utils/fontCompiler.js
import opentype from 'opentype.js';
import { unionPolygons, ensureCCW, signedArea } from './polygonUnion.js';

/**
 * Normalizes a stroke array entry (extracting leading metadata and actual drawable strokes).
 */
export function extractStrokeMetaAndPoints(strokeArray) {
    let meta = {
        scale: 1,
        leftMargin: 100,
        rightMargin: 100,
        yOffset: 0,
        xOffset: 0,
        consistentSize: undefined,
        isCalligraphy: false,
        isBrushPen: false,
        isChisel: false,
        isPaintBrush: false,
        isSerifPen: false,
        chiselAngle: 45,
    };
    let actualStrokes = Array.isArray(strokeArray) ? strokeArray : [];

    if (actualStrokes.length > 0) {
        const firstStroke = actualStrokes[0];
        if (!Array.isArray(firstStroke) && firstStroke && firstStroke.isMeta) {
            meta = { ...meta, ...firstStroke };
            actualStrokes = actualStrokes.slice(1);
        } else if (Array.isArray(firstStroke) && firstStroke.length === 1) {
            const markerX = firstStroke[0]?.x;
            if (markerX === -999) {
                meta.isCalligraphy = true;
                actualStrokes = actualStrokes.slice(1);
            } else if (markerX === -998) {
                meta.isBrushPen = true;
                actualStrokes = actualStrokes.slice(1);
            } else if (markerX === -997) {
                meta.isPaintBrush = true;
                actualStrokes = actualStrokes.slice(1);
            } else if (markerX === -996) {
                meta.isSerifPen = true;
                actualStrokes = actualStrokes.slice(1);
            }
        }
    }

    return { meta, actualStrokes };
}

const LEGACY_META_MARKER_X = new Set([-999, -998, -997, -996]);

/**
 * Strips leading metadata objects and legacy pen-mode marker strokes (-999..-996)
 * so consumers receive only actual drawable strokes.
 */
export function cleanStrokes(strokes) {
    if (!strokes || !Array.isArray(strokes)) return [];
    let actual = strokes;
    if (actual.length > 0 && !Array.isArray(actual[0]) && actual[0]?.isMeta) {
        actual = actual.slice(1);
    }
    return actual.filter(s => Array.isArray(s) && !(s.length === 1 && LEGACY_META_MARKER_X.has(s[0]?.x)));
}

/**
 * Ramer-Douglas-Peucker polyline simplification to cut redundant collinear points
 * on large hand-drawn glyph inventories without altering visible stroke shape.
 */
function simplifyStrokeRDP(points, epsilon = 2.0) {
    if (!Array.isArray(points) || points.length <= 2) return points;

    const sqEps = epsilon * epsilon;
    const keep = new Uint8Array(points.length);
    keep[0] = 1;
    keep[points.length - 1] = 1;

    const stack = [[0, points.length - 1]];
    while (stack.length > 0) {
        const [start, end] = stack.pop();
        if (end - start <= 1) continue;

        const a = points[start];
        const b = points[end];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;

        let maxDistSq = 0;
        let maxIdx = -1;

        for (let i = start + 1; i < end; i++) {
            const p = points[i];
            let distSq;
            if (lenSq === 0) {
                const ex = p.x - a.x;
                const ey = p.y - a.y;
                distSq = ex * ex + ey * ey;
            } else {
                const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
                const projX = a.x + t * dx;
                const projY = a.y + t * dy;
                const ex = p.x - projX;
                const ey = p.y - projY;
                distSq = ex * ex + ey * ey;
            }
            if (distSq > maxDistSq) {
                maxDistSq = distSq;
                maxIdx = i;
            }
        }

        if (maxDistSq > sqEps && maxIdx !== -1) {
            keep[maxIdx] = 1;
            stack.push([start, maxIdx], [maxIdx, end]);
        }
    }

    const result = [];
    for (let i = 0; i < points.length; i++) {
        if (keep[i]) result.push(points[i]);
    }
    return result;
}

/**
 * Builds a rotated CCW regular polygon approximating a circular cap or join disc.
 * Rotation avoids vertices aligning tangentially with axis-aligned segment edges.
 */
function buildCapDisc(cx, cy, r, sides = 10, minHalfWidth = 1.5) {
    const pts = [];
    const safeR = Math.max(minHalfWidth, r);
    for (let a = 0; a < sides; a++) {
        const angle = ((a + 0.37) / sides) * Math.PI * 2;
        pts.push({
            x: cx + Math.cos(angle) * safeR,
            y: cy + Math.sin(angle) * safeR,
        });
    }
    return pts;
}

/**
 * Computes the stroke half-width at point index `i` for tapered/textured nibs.
 */
function computePointHalfWidth(points, i, baseR, minHalfWidth, flags) {
    const n = points.length;
    if (flags.isCalligraphy) {
        const taper = Math.sin((i / (n - 1 || 1)) * Math.PI);
        return Math.max(minHalfWidth, baseR * (0.3 + 0.7 * taper));
    }
    if (flags.isBrushPen) {
        const progress = i / (n - 1 || 1);
        const widthMult = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) * 5);
        const startMult = progress < 0.1 ? (0.5 + progress * 5) : 1.0;
        return Math.max(minHalfWidth, baseR * Math.max(0.1, widthMult * startMult));
    }
    if (flags.isPaintBrush) {
        const pt = points[i];
        const hash = Math.abs(pt.x * 13 + pt.y * 17) % 10;
        return Math.max(minHalfWidth, baseR * (0.7 + (hash / 10) * 0.4));
    }
    return Math.max(minHalfWidth, baseR);
}

/**
 * Converts Font Studio strokes into disjoint unioned polygon rings in an arbitrary
 * target 2D coordinate space (`toX`, `toY`), applying nib modes consistently.
 */
export function buildStrokeUnionRings({
    actualStrokes,
    meta,
    toX,
    toY,
    baseHalfWidth,
    minHalfWidth = 1.5,
    distFilterSq = 16,
    rdpFillEps = 1.0,
    rdpStrokeEps = 1.8,
    flagOverrides = {},
    skipUnion = false,
}) {
    const hasCalligraphy = flagOverrides.isCalligraphy ?? Boolean(meta.isCalligraphy);
    const hasBrushPen = flagOverrides.isBrushPen ?? Boolean(meta.isBrushPen);
    const hasChisel = flagOverrides.isChisel ?? Boolean(meta.isChisel);
    const hasPaintBrush = flagOverrides.isPaintBrush ?? Boolean(meta.isPaintBrush);
    const glyphWeight = Number.isFinite(flagOverrides.strokeWeight) && flagOverrides.strokeWeight > 0
        ? flagOverrides.strokeWeight
        : (Number.isFinite(meta.strokeWeight) && meta.strokeWeight > 0 ? meta.strokeWeight : 1.0);
    const defaultChiselAngle = Number.isFinite(flagOverrides.chiselAngle)
        ? flagOverrides.chiselAngle
        : (Number.isFinite(meta.chiselAngle) ? meta.chiselAngle : 45);

    const rawPolygons = [];

    (actualStrokes || []).forEach(strokeData => {
        const rawPoints = Array.isArray(strokeData) ? strokeData : (strokeData?.points || []);
        const points = rawPoints.filter(pt => pt && Number.isFinite(pt.x) && Number.isFinite(pt.y));
        const isFilled = Boolean(strokeData?.isFilled);
        const lineCap = strokeData?.lineCap || 'round';

        if (points.length === 0) return;

        const strokeWeight = Number.isFinite(strokeData?.strokeWeight) && strokeData.strokeWeight > 0
            ? strokeData.strokeWeight
            : glyphWeight;
        const strokeBaseHalfWidth = Math.max(minHalfWidth, baseHalfWidth * (strokeWeight / glyphWeight));

        const strokeFlags = {
            isCalligraphy: strokeData?.isCalligraphy ?? hasCalligraphy,
            isBrushPen: strokeData?.isBrushPen ?? hasBrushPen,
            isChisel: strokeData?.isChisel ?? hasChisel,
            isPaintBrush: strokeData?.isPaintBrush ?? hasPaintBrush,
            chiselAngle: Number.isFinite(strokeData?.chiselAngle) ? strokeData.chiselAngle : defaultChiselAngle,
        };

        const distFiltered = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = distFiltered[distFiltered.length - 1];
            const curr = points[i];
            const dx = curr.x - last.x;
            const dy = curr.y - last.y;
            const dSq = dx * dx + dy * dy;
            if (dSq > distFilterSq) {
                distFiltered.push(curr);
            } else if (i === points.length - 1 && distFiltered.length > 1) {
                if (dSq > 0.25) {
                    distFiltered.push(curr);
                } else {
                    // Replace trailing near-duplicate point cleanly instead of emitting a sub-pixel stub segment
                    distFiltered[distFiltered.length - 1] = curr;
                }
            }
        }
        const simplified = simplifyStrokeRDP(distFiltered, isFilled ? rdpFillEps : rdpStrokeEps);

        if (isFilled && simplified.length >= 3) {
            const ccw = ensureCCW(simplified.map(pt => ({ x: toX(pt.x), y: toY(pt.y) })));
            if (ccw) rawPolygons.push(ccw);
            return;
        }

        if (simplified.length === 1) {
            const pt = simplified[0];
            rawPolygons.push(buildCapDisc(toX(pt.x), toY(pt.y), strokeBaseHalfWidth, 12, minHalfWidth));
            return;
        }

        const radChisel = (strokeFlags.chiselAngle * Math.PI) / 180;
        const mapped = simplified.map((pt, i) => ({
            cx: toX(pt.x),
            cy: toY(pt.y),
            origX: pt.x,
            origY: pt.y,
            r: computePointHalfWidth(simplified, i, strokeBaseHalfWidth, minHalfWidth, strokeFlags),
        }));

        for (let i = 0; i < mapped.length; i++) {
            const p1 = mapped[i];

            if (i < mapped.length - 1) {
                const p2 = mapped[i + 1];
                const dx = p2.cx - p1.cx;
                const dy = p2.cy - p1.cy;
                const len = Math.hypot(dx, dy);

                if (len > 0.05) {
                    let r1 = p1.r;
                    let r2 = p2.r;
                    if (strokeFlags.isChisel) {
                        const strokeAngle = Math.atan2(p2.origY - p1.origY, p2.origX - p1.origX);
                        const diff = Math.abs(Math.sin(strokeAngle - radChisel));
                        const w = Math.max(minHalfWidth, strokeBaseHalfWidth * (0.2 + 0.8 * diff));
                        r1 = w;
                        r2 = w;
                    }

                    const px = dy / len;
                    const py = -dx / len;
                    rawPolygons.push([
                        { x: p1.cx + px * r1, y: p1.cy + py * r1 },
                        { x: p2.cx + px * r2, y: p2.cy + py * r2 },
                        { x: p2.cx - px * r2, y: p2.cy - py * r2 },
                        { x: p1.cx - px * r1, y: p1.cy - py * r1 },
                    ]);

                    if (strokeFlags.isChisel && (lineCap === 'round' || i > 0)) {
                        rawPolygons.push(buildCapDisc(p1.cx, p1.cy, r1, 14, minHalfWidth));
                    }
                    if (strokeFlags.isChisel && (lineCap === 'round' || i + 1 < mapped.length - 1)) {
                        rawPolygons.push(buildCapDisc(p2.cx, p2.cy, r2, 14, minHalfWidth));
                    }
                }
            }

            if (!strokeFlags.isChisel) {
                const isEndpoint = i === 0 || i === mapped.length - 1;
                if (isEndpoint) {
                    if (lineCap === 'round') {
                        rawPolygons.push(buildCapDisc(p1.cx, p1.cy, p1.r, 14, minHalfWidth));
                    }
                } else {
                    rawPolygons.push(buildCapDisc(p1.cx, p1.cy, p1.r, 14, minHalfWidth));
                }
            }
        }
    });

    if (rawPolygons.length === 0) return [];
    if (skipUnion) return rawPolygons;
    const unioned = unionPolygons(rawPolygons);
    return unioned.length > 0 ? unioned : rawPolygons;
}

/**
 * Generates an SVG compound path `d` string matching Font Studio trace modes
 * (normal, calligraphy, brush pen, chisel, paint brush, serif / filled shapes).
 */
export function buildSvgPathDFromStrokes(strokeArray, options = {}) {
    const { meta, actualStrokes } = extractStrokeMetaAndPoints(strokeArray);
    if (actualStrokes.length === 0) return '';

    const xOffset = Number.isFinite(options.xOffset) ? options.xOffset : 0;
    const strokeWidth = Number(options.strokeWidth) > 0 ? Number(options.strokeWidth) : 10;
    const glyphWeight = Number.isFinite(options.strokeWeight) && options.strokeWeight > 0
        ? options.strokeWeight
        : (Number.isFinite(meta.strokeWeight) && meta.strokeWeight > 0 ? meta.strokeWeight : 1.0);
    const baseHalfWidth = Math.max(0.5, (strokeWidth / 2) * glyphWeight);
    const minHalfWidth = Math.min(1.5, baseHalfWidth * 0.15);

    const rings = buildStrokeUnionRings({
        actualStrokes,
        meta,
        toX: (x) => x + xOffset,
        toY: (y) => y,
        baseHalfWidth,
        minHalfWidth,
        distFilterSq: 0.25,
        rdpFillEps: 0.2,
        rdpStrokeEps: 0.35,
        flagOverrides: options,
        skipUnion: Boolean(options.skipUnion),
    });

    const round2 = (n) => Number(n.toFixed(2));
    const parts = [];

    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
        const ring = rings[rIdx];
        if (!ring || ring.length < 3 || Math.abs(signedArea(ring)) < 0.05) continue;
        let sub = `M ${round2(ring[0].x)} ${round2(ring[0].y)}`;
        for (let i = 1; i < ring.length; i++) {
            sub += ` L ${round2(ring[i].x)} ${round2(ring[i].y)}`;
        }
        parts.push(`${sub} Z`);
    }

    return parts.join(' ');
}

function stripCollinearAndFoldbacks(ringPts) {
    let pts = [];
    for (let i = 0; i < ringPts.length; i++) {
        const prev = pts[pts.length - 1];
        if (!prev || prev.x !== ringPts[i].x || prev.y !== ringPts[i].y) {
            pts.push({ x: ringPts[i].x, y: ringPts[i].y });
        }
    }
    while (pts.length > 1) {
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (first.x === last.x && first.y === last.y) {
            pts.pop();
        } else {
            break;
        }
    }
    let changed = true;
    while (changed && pts.length >= 3) {
        changed = false;
        const nextPts = [];
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const prev = pts[(i - 1 + n) % n];
            const curr = pts[i];
            const next = pts[(i + 1) % n];
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;
            if (dx1 * dy2 - dy1 * dx2 === 0) {
                changed = true;
                continue;
            }
            nextPts.push(curr);
        }
        pts = nextPts;
    }
    return pts;
}

function intSegsProperlyIntersect(a, b, c, d) {
    const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x);
    const d1 = ccw(c, d, a);
    const d2 = ccw(c, d, b);
    const d3 = ccw(a, b, c);
    const d4 = ccw(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * Splits rounding-induced pinched duplicate vertices and removes local integer-grid
 * twist crossings so CFF/TrueType contours remain strictly simple (no vector dots).
 */
function cleanIntegerRing(rawPts) {
    let pts = stripCollinearAndFoldbacks(rawPts);
    if (pts.length < 3) return [];

    // 1. Excise rounding-induced pinched duplicate-vertex micro-loops
    let hadDup = true;
    let dupGuard = 0;
    while (hadDup && pts.length >= 3 && dupGuard++ < 32) {
        hadDup = false;
        const firstIdx = new Map();
        for (let i = 0; i < pts.length; i++) {
            const k = `${pts[i].x},${pts[i].y}`;
            if (firstIdx.has(k)) {
                const start = firstIdx.get(k);
                const loopA = pts.slice(start, i);
                const loopB = pts.slice(0, start).concat(pts.slice(i));
                const keepA = Math.abs(signedArea(loopA)) > Math.abs(signedArea(loopB));
                pts = stripCollinearAndFoldbacks(keepA ? loopA : loopB);
                hadDup = true;
                break;
            }
            firstIdx.set(k, i);
        }
    }

    // 2. Untwist local edge crossings introduced by Math.round on close vertices
    let hadCross = true;
    let crossGuard = 0;
    while (hadCross && pts.length >= 4 && crossGuard++ < 32) {
        hadCross = false;
        const n = pts.length;
        for (let i = 0; i < n && !hadCross; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];
            for (let j = i + 2; j < n; j++) {
                if (i === 0 && j === n - 1) continue;
                const c = pts[j];
                const d = pts[(j + 1) % n];
                if (intSegsProperlyIntersect(a, b, c, d)) {
                    // Drop the shorter pinched arc between the two crossing segments
                    const spanFwd = j - i;
                    const spanBwd = n - spanFwd;
                    let candidate;
                    if (spanFwd <= spanBwd) {
                        candidate = pts.slice(0, i + 1).concat(pts.slice(j + 1));
                    } else {
                        candidate = pts.slice(i + 1, j + 1);
                    }
                    pts = stripCollinearAndFoldbacks(candidate);
                    hadCross = true;
                    break;
                }
            }
        }
    }

    return pts;
}

/**
 * Appends integer-rounded, non-degenerate contour rings onto an opentype.Path.
 * Strips collinear vertices, rounding-induced zero-width spike foldbacks,
 * pinch twists, and micro-sliver pinhole CW rings so rasterizers never suffer
 * small-size vector dot dropouts.
 */
function emitRingsToPath(path, rings) {
    const MIN_HOLE_AREA = 64;

    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
        const ring = rings[rIdx];
        if (!ring || ring.length < 3) continue;

        const rounded = ring.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        const pts = cleanIntegerRing(rounded);
        if (pts.length < 3) continue;

        const area = signedArea(pts);
        const absArea = Math.abs(area);
        if (absArea < 4) continue;
        // Tiny interior CW holes inside strokes are triangulation/chord slivers ("vector dots")
        if (area < 0 && absArea < MIN_HOLE_AREA) continue;

        path.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            path.lineTo(pts[i].x, pts[i].y);
        }
        path.close();
    }
}

/**
 * Converts a Font Studio stroke array into an opentype.Path and advanceWidth.
 */
export function buildGlyphPathAndMetrics(strokeArray, traceWidth = 30, fontScale = 1.0, options = {}) {
    const upe = Math.max(10, Math.round(1000 / fontScale));
    const isConsistentGlobal = options?.consistentCharacterSize !== undefined
        ? Boolean(options.consistentCharacterSize)
        : true;
    const targetAdvanceBase = Number(options?.fixedAdvanceWidth) || 1000;
    const targetAdvance = Math.round(targetAdvanceBase * (upe / 1000));

    const path = new opentype.Path();
    const r_base = traceWidth;
    const { meta, actualStrokes } = extractStrokeMetaAndPoints(strokeArray);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let hasPoints = false;

    actualStrokes.forEach(strokeData => {
        const points = Array.isArray(strokeData) ? strokeData : (strokeData?.points || []);
        points.forEach(pt => {
            if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
                hasPoints = true;
            }
        });
    });

    if (!hasPoints) {
        minX = 0; maxX = 0;
        minY = 0; maxY = 0;
    }

    const isConsistent = meta.consistentSize !== undefined ? Boolean(meta.consistentSize) : isConsistentGlobal;
    const scaledWidth = (maxX - minX) * 2.85 * meta.scale;
    let glyphAdvanceWidth;
    let glyphOriginX;

    if (isConsistent) {
        glyphAdvanceWidth = targetAdvance;
        const hOffset = Number.isFinite(meta.xOffset) ? meta.xOffset : 0;
        const leftBearing = hasPoints
            ? Math.round((targetAdvance - scaledWidth) / 2) + hOffset
            : Math.round(targetAdvance / 2);
        glyphOriginX = leftBearing;
    } else {
        glyphAdvanceWidth = hasPoints
            ? meta.leftMargin + scaledWidth + meta.rightMargin + (r_base * meta.scale)
            : 500;
        glyphOriginX = meta.leftMargin;
    }

    const centerY = hasPoints ? (minY + maxY) / 2 : 150;
    const toX = (x) => glyphOriginX + ((x - minX) * 2.85 * meta.scale);
    const toY = (y) => {
        if (isConsistent && hasPoints) {
            return 300 + ((centerY - y) * 2.85 * meta.scale) + meta.yOffset;
        }
        return 400 + ((800 - y * 2.85 - 400) * meta.scale) + meta.yOffset;
    };

    const totalGlyphPoints = actualStrokes.reduce((sum, s) => {
        const pts = Array.isArray(s) ? s : (s?.points || []);
        return sum + pts.length;
    }, 0);
    const isDenseGlyph = totalGlyphPoints > 550;

    const glyphStrokeWeight = Number.isFinite(meta.strokeWeight) && meta.strokeWeight > 0 ? meta.strokeWeight : 1.0;

    const rings = buildStrokeUnionRings({
        actualStrokes,
        meta,
        toX,
        toY,
        baseHalfWidth: Math.max(1.5, r_base * meta.scale * glyphStrokeWeight),
        minHalfWidth: 1.5,
        distFilterSq: isDenseGlyph ? 4 : 1.5,
        rdpFillEps: isDenseGlyph ? 0.6 : 0.35,
        rdpStrokeEps: isDenseGlyph ? 0.85 : 0.45,
    });
    if (rings.length > 0) {
        emitRingsToPath(path, rings);
    }

    return {
        path,
        advanceWidth: Math.round(glyphAdvanceWidth),
    };
}

/**
 * Clones an opentype.Path so aliased glyphs have independent path instances.
 */
function cloneOpenTypePath(srcPath) {
    const cloned = new opentype.Path();
    if (srcPath && Array.isArray(srcPath.commands)) {
        cloned.commands = srcPath.commands.map(cmd => ({ ...cmd }));
    }
    return cloned;
}

const UNICODE_TO_ASCII_MAP = {
    'ɑ': 'a', 'ɐ': 'a', 'ɒ': 'a', 'æ': 'ae', 'ʌ': 'a', 'Æ': 'AE',
    'ə': 'e', 'ɛ': 'e', 'ɜ': 'e', 'ɝ': 'e', 'ɘ': 'e', 'Ǝ': 'E', 'Ə': 'E',
    'ɪ': 'i', 'ɨ': 'i', 'ı': 'i', 'İ': 'I',
    'ɔ': 'o', 'ø': 'o', 'œ': 'oe', 'ɵ': 'o', 'Ø': 'O', 'Œ': 'OE',
    'ʊ': 'u', 'ʉ': 'u', 'ɯ': 'u',
    'ð': 'dh', 'Ð': 'Dh', 'þ': 'th', 'Þ': 'Th', 'θ': 'th',
    'ʃ': 'sh', 'Ʃ': 'Sh', 'ʒ': 'zh', 'Ʒ': 'Zh',
    'ŋ': 'ng', 'Ŋ': 'Ng', 'ɲ': 'ny', 'ɳ': 'n', 'ɴ': 'n',
    'ɾ': 'r', 'ɹ': 'r', 'ʀ': 'r', 'ʁ': 'r',
    'ʋ': 'v', 'ɣ': 'gh', 'χ': 'kh', 'ħ': 'h', 'ɦ': 'h',
    'ʔ': '', 'ʕ': '',
    'ɓ': 'b', 'ɗ': 'd', 'ɠ': 'g',
    'ł': 'l', 'Ł': 'L', 'đ': 'd', 'Đ': 'D',
    'ß': 'ss', 'ẞ': 'SS',
    'ﬀ': 'ff', 'ﬁ': 'fi', 'ﬂ': 'fl', 'ﬃ': 'ffi', 'ﬄ': 'ffl',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ы': 'y', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ы': 'Y', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'e',
    'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x',
    'ο': 'o', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y',
    'φ': 'ph', 'ψ': 'ps', 'ω': 'o',
    'Α': 'A', 'Β': 'B', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'E',
    'Θ': 'Th', 'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X',
    'Ο': 'O', 'Π': 'P', 'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'Ph',
    'Χ': 'Ch', 'Ψ': 'Ps', 'Ω': 'O',
};

function transliterateToAscii(val) {
    let out = '';
    for (const ch of String(val || '')) {
        out += Object.prototype.hasOwnProperty.call(UNICODE_TO_ASCII_MAP, ch)
            ? UNICODE_TO_ASCII_MAP[ch]
            : ch;
    }
    return out
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalizes a Unicode font name string for OpenType UTF-16 `name` table records.
 */
function normalizeUnicodeNameString(val, fallback) {
    const clean = String(val || '')
        .replace(/\p{Cc}+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || fallback;
}

/**
 * Sanitizes a font name string for OpenType `CFF ` table compatibility
 * (printable ASCII only, since opentype.js encodes CFF String INDEX as single bytes).
 */
function sanitizeNameString(val, fallback) {
    const clean = transliterateToAscii(val)
        .replace(/[^\x20-\x7E]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || fallback;
}

/**
 * Sanitizes a PostScript glyph name for OpenType `post` and `CFF ` table compatibility
 * (ASCII printable, no spaces, max 63 characters).
 */
function sanitizeGlyphName(val, fallback) {
    const clean = transliterateToAscii(val)
        .replace(/[^A-Za-z0-9._-]/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 63);
    return clean || fallback;
}

/**
 * Ensures every glyph in the font has a unique PostScript name (required by CFF Charset).
 */
function claimUniqueGlyphName(usedNames, rawName, fallback) {
    const base = sanitizeGlyphName(rawName, fallback);
    if (!usedNames.has(base)) {
        usedNames.add(base);
        return base;
    }
    let counter = 2;
    while (counter < 100000) {
        const suffix = `_${counter}`;
        const candidate = `${base.slice(0, 63 - suffix.length)}${suffix}`;
        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
        counter++;
    }
    const fb = `${fallback}_${usedNames.size}`.slice(0, 63);
    usedNames.add(fb);
    return fb;
}

/**
 * Builds a complete opentype.Font instance from customGlyphs plus optional
 * direct Unicode/Latin aliases and OpenType GSUB ligature substitutions.
 */
export async function buildOpenTypeFont(customGlyphs, traceWidth = 30, fontScale = 1.0, options = {}) {
    const safeScale = Math.max(0.1, Number(fontScale) || 1.0);
    const upe = Math.max(10, Math.round(1000 / safeScale));
    const asc = Math.round(800 / safeScale);
    const desc = Math.round(-200 / safeScale);

    const isConsistentGlobal = options?.consistentCharacterSize !== undefined
        ? Boolean(options.consistentCharacterSize)
        : true;
    const targetAdvanceBase = Number(options?.fixedAdvanceWidth) || 1000;
    const targetAdvance = Math.round(targetAdvanceBase * (upe / 1000));

    const notdefGlyph = new opentype.Glyph({
        name: '.notdef',
        unicode: 0,
        advanceWidth: isConsistentGlobal ? targetAdvance : 600,
        path: new opentype.Path()
    });

    const spaceAdvance = isConsistentGlobal ? targetAdvance : 500;
    let spaceGlyph = new opentype.Glyph({
        name: 'space',
        unicode: 32,
        advanceWidth: spaceAdvance,
        path: new opentype.Path()
    });

    const glyphs = [notdefGlyph, spaceGlyph];
    const usedGlyphNames = new Set(['.notdef', 'space']);
    const glyphIndexByUnicode = new Map();
    glyphIndexByUnicode.set(0, 0);
    glyphIndexByUnicode.set(32, 1);

    const compiledDataByUnicode = new Map();
    const yieldEvery = options?.yieldEvery ?? 5;
    let processedCount = 0;

    for (const [unicodeStr, strokeArray] of Object.entries(customGlyphs || {})) {
        if (yieldEvery > 0 && ++processedCount % yieldEvery === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const unicode = Number.parseInt(unicodeStr, 10);
        if (!Number.isInteger(unicode) || unicode <= 0 || unicode > 0x10FFFF) {
            continue;
        }

        const { path, advanceWidth } = buildGlyphPathAndMetrics(strokeArray, traceWidth, safeScale, options);

        if (unicode === 32) {
            spaceGlyph = new opentype.Glyph({
                name: 'space',
                unicode: 32,
                advanceWidth,
                path
            });
            glyphs[1] = spaceGlyph;
            compiledDataByUnicode.set(32, { path, advanceWidth });
            continue;
        }

        if (glyphIndexByUnicode.has(unicode)) {
            continue;
        }

        const idx = glyphs.length;
        const customName = options?.glyphNames?.[unicode];
        const glyphName = claimUniqueGlyphName(usedGlyphNames, customName, `syl_${unicode}`);

        glyphs.push(new opentype.Glyph({
            name: glyphName,
            unicode,
            advanceWidth,
            path
        }));
        glyphIndexByUnicode.set(unicode, idx);
        compiledDataByUnicode.set(unicode, { path, advanceWidth });
    }

    // 2. Add direct Unicode / Latin aliases (e.g., 'a' -> glyph of U+E000)
    const aliases = Array.isArray(options?.extraAliases) ? options.extraAliases : [];
    let aliasesApplied = 0;
    for (const alias of aliases) {
        const aliasCode = Number(alias?.unicode);
        const targetCode = Number(alias?.targetCode);
        if (!Number.isInteger(aliasCode) || aliasCode <= 0 || aliasCode > 0x10FFFF) continue;
        if (glyphIndexByUnicode.has(aliasCode)) continue;

        const targetData = compiledDataByUnicode.get(targetCode);
        if (!targetData) continue;

        const idx = glyphs.length;
        const glyphName = claimUniqueGlyphName(usedGlyphNames, alias.name, `alias_${aliasCode}`);

        glyphs.push(new opentype.Glyph({
            name: glyphName,
            unicode: aliasCode,
            advanceWidth: targetData.advanceWidth,
            path: cloneOpenTypePath(targetData.path)
        }));
        glyphIndexByUnicode.set(aliasCode, idx);
        aliasesApplied++;
    }

    // 3. Prepare GSUB ligatures (syllables, digraphs, blocks, logograms)
    const rawLigatures = Array.isArray(options?.ligatures) ? options.ligatures : [];
    const preparedLigatures = [];
    const seenSequences = new Set();

    for (const lig of rawLigatures) {
        const seq = typeof lig?.sequence === 'string' ? lig.sequence : '';
        const targetCode = Number(lig?.targetCode);
        if (!seq || !Number.isInteger(targetCode)) continue;

        const chars = Array.from(seq);
        if (chars.length < 2) continue;

        const targetIndex = glyphIndexByUnicode.get(targetCode);
        if (targetIndex === undefined) continue;

        if (seenSequences.has(seq)) continue;
        seenSequences.add(seq);

        preparedLigatures.push({
            sequence: seq,
            chars,
            targetIndex,
            feature: lig.feature || 'liga'
        });
    }

    // Sort longest sequence first so OpenType GSUB matches 'shi' before 'sh'
    preparedLigatures.sort((a, b) => b.chars.length - a.chars.length);

    // Ensure every input character in a ligature exists in the font's glyph table
    for (const lig of preparedLigatures) {
        for (const ch of lig.chars) {
            const cp = ch.codePointAt(0);
            if (!glyphIndexByUnicode.has(cp)) {
                const idx = glyphs.length;
                glyphs.push(new opentype.Glyph({
                    name: claimUniqueGlyphName(
                        usedGlyphNames,
                        `uni${cp.toString(16).toUpperCase().padStart(4, '0')}`,
                        `uni${cp}`
                    ),
                    unicode: cp,
                    advanceWidth: Math.round(targetAdvance * 0.5),
                    path: new opentype.Path()
                }));
                glyphIndexByUnicode.set(cp, idx);
            }
        }
    }

    const asciiFamilyName = sanitizeNameString(options?.familyName, 'ConlangFont');
    const asciiStyleName = sanitizeNameString(options?.styleName, 'Regular');
    const unicodeFamilyName = normalizeUnicodeNameString(options?.familyName, asciiFamilyName);
    const unicodeStyleName = normalizeUnicodeNameString(options?.styleName, asciiStyleName);

    const asciiMeta = {
        version: options?.version ? sanitizeNameString(options.version, 'Version 1.0') : undefined,
        copyright: options?.copyright ? sanitizeNameString(options.copyright, '') : undefined,
        designer: options?.designer ? sanitizeNameString(options.designer, '') : undefined,
        description: options?.description ? sanitizeNameString(options.description, '') : undefined,
        license: options?.license ? sanitizeNameString(options.license, '') : undefined,
    };
    const unicodeMeta = {
        copyright: options?.copyright ? normalizeUnicodeNameString(options.copyright, '') : undefined,
        designer: options?.designer ? normalizeUnicodeNameString(options.designer, '') : undefined,
        description: options?.description ? normalizeUnicodeNameString(options.description, '') : undefined,
        license: options?.license ? normalizeUnicodeNameString(options.license, '') : undefined,
    };

    const fontOptions = {
        familyName: asciiFamilyName,
        styleName: asciiStyleName,
        postScriptName: sanitizeGlyphName(`${asciiFamilyName}-${asciiStyleName}`, 'ConlangFont-Regular'),
        unitsPerEm: upe,
        ascender: asc,
        descender: desc,
        glyphs
    };

    if (asciiMeta.version) fontOptions.version = asciiMeta.version;
    if (asciiMeta.copyright) fontOptions.copyright = asciiMeta.copyright;
    if (asciiMeta.designer) fontOptions.designer = asciiMeta.designer;
    if (asciiMeta.description) fontOptions.description = asciiMeta.description;
    if (asciiMeta.license) fontOptions.license = asciiMeta.license;

    const font = new opentype.Font(fontOptions);

    const hasUnicodeNameDiff =
        unicodeFamilyName !== asciiFamilyName ||
        unicodeStyleName !== asciiStyleName ||
        (unicodeMeta.designer && unicodeMeta.designer !== asciiMeta.designer) ||
        (unicodeMeta.description && unicodeMeta.description !== asciiMeta.description) ||
        (unicodeMeta.copyright && unicodeMeta.copyright !== asciiMeta.copyright) ||
        (unicodeMeta.license && unicodeMeta.license !== asciiMeta.license);

    if (hasUnicodeNameDiff) {
        font.names.fontFamily = { en: unicodeFamilyName };
        font.names.fontSubfamily = { en: unicodeStyleName };
        font.names.fullName = { en: `${unicodeFamilyName} ${unicodeStyleName}` };
        if (unicodeMeta.copyright) font.names.copyright = { en: unicodeMeta.copyright };
        if (unicodeMeta.designer) font.names.designer = { en: unicodeMeta.designer };
        if (unicodeMeta.description) font.names.description = { en: unicodeMeta.description };
        if (unicodeMeta.license) font.names.license = { en: unicodeMeta.license };

        // sfnt.fontToTable reads font.names for the UTF-16 `name` table, and
        // font.getEnglishName() for the single-byte ASCII `CFF ` table.
        const cffAsciiNames = {
            fontFamily: asciiFamilyName,
            fontSubfamily: asciiStyleName,
            fullName: `${asciiFamilyName} ${asciiStyleName}`,
            postScriptName: fontOptions.postScriptName,
            version: asciiMeta.version || 'Version 0.1',
            manufacturer: ' ',
        };
        const origGetEnglishName = font.getEnglishName.bind(font);
        const origToTables = font.toTables.bind(font);
        font.toTables = () => {
            font.getEnglishName = (nameKey) => cffAsciiNames[nameKey] ?? origGetEnglishName(nameKey);
            try {
                return origToTables();
            } finally {
                font.getEnglishName = origGetEnglishName;
            }
        };
    }

    // Register GSUB ligatures
    let ligaturesApplied = 0;
    for (const lig of preparedLigatures) {
        const subIndices = lig.chars.map(ch => glyphIndexByUnicode.get(ch.codePointAt(0)));
        if (subIndices.some(i => i === undefined)) continue;

        font.substitution.addLigature(lig.feature, {
            sub: subIndices,
            by: lig.targetIndex
        });
        ligaturesApplied++;
    }

    return {
        font,
        glyphIndexByUnicode,
        stats: {
            glyphCount: glyphs.length,
            drawnCount: compiledDataByUnicode.size,
            aliasesApplied,
            ligaturesApplied
        }
    };
}

/**
 * Recomputes SFNT table checksums and `head.checkSumAdjustment` on a compiled
 * OpenType ArrayBuffer so strict parsers (Windows GDI / fontview.exe) accept it.
 */
export function fixOpenTypeChecksums(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 12) return arrayBuffer;
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const numTables = view.getUint16(4, false);

    const calcChecksum = (start, length) => {
        let sum = 0;
        for (let i = 0; i < length; i += 4) {
            const b0 = bytes[start + i] || 0;
            const b1 = i + 1 < length ? bytes[start + i + 1] : 0;
            const b2 = i + 2 < length ? bytes[start + i + 2] : 0;
            const b3 = i + 3 < length ? bytes[start + i + 3] : 0;
            sum = (sum + (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0)) >>> 0;
        }
        return sum;
    };

    let headOffset = 0;
    for (let i = 0; i < numTables; i++) {
        const recordOffset = 12 + i * 16;
        if (recordOffset + 16 > bytes.byteLength) break;
        const tag = String.fromCharCode(
            bytes[recordOffset],
            bytes[recordOffset + 1],
            bytes[recordOffset + 2],
            bytes[recordOffset + 3]
        );
        const tableOffset = view.getUint32(recordOffset + 8, false);
        const tableLength = view.getUint32(recordOffset + 12, false);
        if (tableOffset + tableLength > bytes.byteLength) continue;

        if (tag === 'head' && tableOffset + 12 <= bytes.byteLength) {
            headOffset = tableOffset;
            view.setUint32(headOffset + 8, 0, false);
        }

        const cs = calcChecksum(tableOffset, tableLength);
        view.setUint32(recordOffset + 4, cs, false);
    }

    if (headOffset > 0 && headOffset + 12 <= bytes.byteLength) {
        const wholeChecksum = calcChecksum(0, bytes.byteLength);
        const checkSumAdjustment = (0xB1B0AFBA - wholeChecksum) >>> 0;
        view.setUint32(headOffset + 8, checkSumAdjustment, false);
    }

    return arrayBuffer;
}

let _fontWorker = null;
let _fontWorkerJobId = 0;
const _fontWorkerPending = new Map();

function getFontWorker() {
    if (typeof Worker === 'undefined') return null;
    if (_fontWorker) return _fontWorker;
    try {
        _fontWorker = new Worker(
            new URL('../workers/fontCompiler.worker.js', import.meta.url),
            { type: 'module' }
        );
        _fontWorker.onmessage = (event) => {
            const { id, buffer, error } = event.data || {};
            const pending = _fontWorkerPending.get(id);
            if (!pending) return;
            _fontWorkerPending.delete(id);
            if (error) {
                pending.reject(new Error(error));
            } else {
                pending.resolve(buffer);
            }
        };
        _fontWorker.onerror = (err) => {
            for (const pending of _fontWorkerPending.values()) {
                pending.reject(err);
            }
            _fontWorkerPending.clear();
            _fontWorker = null;
        };
        return _fontWorker;
    } catch {
        return null;
    }
}

/**
 * Compiles customGlyphs into an OpenType ArrayBuffer inside a background Web Worker
 * (falling back to the main thread in non-Worker environments).
 */
export async function compileFontBufferInWorker(customGlyphs, traceWidth = 30, fontScale = 1.0, options = {}) {
    const worker = getFontWorker();
    if (worker) {
        try {
            const id = ++_fontWorkerJobId;
            return await new Promise((resolve, reject) => {
                _fontWorkerPending.set(id, { resolve, reject });
                worker.postMessage({ id, customGlyphs, traceWidth, fontScale, options });
            });
        } catch {
            // Fall back to main thread if worker fails
        }
    }
    const { font } = await buildOpenTypeFont(customGlyphs, traceWidth, fontScale, options);
    return fixOpenTypeChecksums(font.toArrayBuffer());
}

export async function compileFont(customGlyphs, traceWidth = 30, fontScale = 1.0, options = {}) {
    try {
        const arrayBuffer = await compileFontBufferInWorker(customGlyphs, traceWidth, fontScale, options);

        // SEC/PERF: Use native browser FileReader to convert ArrayBuffer to base64 asynchronously
        // This completely eliminates the synchronous 50,000,000+ iteration string concatenation loop that causes "Page Unresponsive" browser freezes.
        return await new Promise((resolve, reject) => {
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const reader = new FileReader();
            reader.onload = () => {
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

