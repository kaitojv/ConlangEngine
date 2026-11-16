// Client-side raster image & binary mask vectorizer (Centerline Zhang-Suen skeleton + Marching Squares outline).

import { fitStrokesToBand } from './fontStudioTools.js';

export function computeOtsuThreshold(imageData) {
    const data = imageData?.data;
    if (!data || data.length === 0) return 140;

    const hist = new Uint32Array(256);
    let total = 0;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 64) continue;
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        hist[lum]++;
        total++;
    }

    if (total === 0) return 140;

    let sum = 0;
    for (let t = 0; t < 256; t++) sum += t * hist[t];

    let sumB = 0;
    let wB = 0;
    let maxVar = -1;
    let bestStart = 140;
    let bestEnd = 140;

    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVar + 1e-6) {
            maxVar = variance;
            bestStart = t;
            bestEnd = t;
        } else if (Math.abs(variance - maxVar) <= 1e-6) {
            bestEnd = t;
        }
    }

    return Math.round((bestStart + bestEnd) / 2);
}

export function imageDataToBinaryMask(imageData, { threshold = 140, invert = false } = {}) {
    const { width, height, data } = imageData;
    const mask = new Uint8Array(width * height);
    for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
        if (data[p + 3] < 64) {
            mask[i] = 0;
            continue;
        }
        const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        mask[i] = (invert ? lum >= threshold : lum < threshold) ? 1 : 0;
    }
    return mask;
}

export function despeckleMask(mask, width, height, minArea = 5) {
    const out = new Uint8Array(mask);
    if (minArea <= 1) return out;

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    const comp = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const start = y * width + x;
            if (!out[start] || visited[start]) continue;

            let head = 0;
            let tail = 0;
            queue[tail++] = start;
            visited[start] = 1;
            comp.length = 0;

            while (head < tail) {
                const idx = queue[head++];
                comp.push(idx);
                const cx = idx % width;
                const cy = (idx - cx) / width;

                for (let dy = -1; dy <= 1; dy++) {
                    const ny = cy + dy;
                    if (ny < 0 || ny >= height) continue;
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = cx + dx;
                        if (nx < 0 || nx >= width) continue;
                        const nIdx = ny * width + nx;
                        if (out[nIdx] && !visited[nIdx]) {
                            visited[nIdx] = 1;
                            queue[tail++] = nIdx;
                        }
                    }
                }
            }

            if (comp.length < minArea) {
                for (let k = 0; k < comp.length; k++) {
                    out[comp[k]] = 0;
                }
            }
        }
    }
    return out;
}

function simplifyPolylineRDP(points, epsilon = 1.5, closed = false) {
    if (!points || points.length <= 2) return points || [];
    const sqEps = epsilon * epsilon;

    if (closed && points.length >= 4) {
        const ring = points[0].x === points[points.length - 1].x && points[0].y === points[points.length - 1].y
            ? points.slice(0, -1)
            : points;
        if (ring.length <= 3) return [...ring, { ...ring[0] }];

        // Split closed loop at farthest point from index 0
        let farIdx = 1;
        let farDist = -1;
        for (let i = 1; i < ring.length; i++) {
            const d = (ring[i].x - ring[0].x) ** 2 + (ring[i].y - ring[0].y) ** 2;
            if (d > farDist) {
                farDist = d;
                farIdx = i;
            }
        }
        const part1 = simplifyPolylineRDP(ring.slice(0, farIdx + 1), epsilon, false);
        const part2 = simplifyPolylineRDP([...ring.slice(farIdx), ring[0]], epsilon, false);
        return [...part1, ...part2.slice(1)];
    }

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
                distSq = (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
            } else {
                const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
                const projX = a.x + t * dx;
                const projY = a.y + t * dy;
                distSq = (p.x - projX) ** 2 + (p.y - projY) ** 2;
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

function smoothPolylineChaikin(points, iterations = 1, closed = false) {
    if (!points || points.length < 3 || iterations <= 0) return points;
    let pts = points;

    for (let iter = 0; iter < iterations; iter++) {
        if (closed) {
            const base = pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y
                ? pts.slice(0, -1)
                : pts;
            if (base.length < 3) break;
            const next = [];
            for (let i = 0; i < base.length; i++) {
                const a = base[i];
                const b = base[(i + 1) % base.length];
                next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
                next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
            }
            next.push({ ...next[0] });
            pts = next;
        } else {
            const next = [{ ...pts[0] }];
            for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i];
                const b = pts[i + 1];
                if (i > 0) {
                    next.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
                }
                if (i < pts.length - 2) {
                    next.push({ x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
                }
            }
            next.push({ ...pts[pts.length - 1] });
            pts = next;
        }
    }

    return pts;
}

/**
 * Zhang-Suen 8-neighbor binary thinning to produce a clean 1px skeleton.
 */
function thinMaskZhangSuen(mask, width, height) {
    const img = new Uint8Array(mask);
    const toZero = [];
    let changed = true;
    let iter = 0;

    while (changed && iter < 120) {
        changed = false;
        iter++;

        for (let step = 0; step < 2; step++) {
            toZero.length = 0;
            for (let y = 1; y < height - 1; y++) {
                const row = y * width;
                for (let x = 1; x < width - 1; x++) {
                    const idx = row + x;
                    if (!img[idx]) continue;

                    const p2 = img[idx - width];
                    const p3 = img[idx - width + 1];
                    const p4 = img[idx + 1];
                    const p5 = img[idx + width + 1];
                    const p6 = img[idx + width];
                    const p7 = img[idx + width - 1];
                    const p8 = img[idx - 1];
                    const p9 = img[idx - width - 1];

                    const bp = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    if (bp < 2 || bp > 6) continue;

                    const ap =
                        (p2 === 0 && p3 === 1 ? 1 : 0) +
                        (p3 === 0 && p4 === 1 ? 1 : 0) +
                        (p4 === 0 && p5 === 1 ? 1 : 0) +
                        (p5 === 0 && p6 === 1 ? 1 : 0) +
                        (p6 === 0 && p7 === 1 ? 1 : 0) +
                        (p7 === 0 && p8 === 1 ? 1 : 0) +
                        (p8 === 0 && p9 === 1 ? 1 : 0) +
                        (p9 === 0 && p2 === 1 ? 1 : 0);
                    if (ap !== 1) continue;

                    if (step === 0) {
                        if (p2 * p4 * p6 !== 0) continue;
                        if (p4 * p6 * p8 !== 0) continue;
                    } else {
                        if (p2 * p4 * p8 !== 0) continue;
                        if (p2 * p6 * p8 !== 0) continue;
                    }
                    toZero.push(idx);
                }
            }
            if (toZero.length > 0) {
                changed = true;
                for (let k = 0; k < toZero.length; k++) {
                    img[toZero[k]] = 0;
                }
            }
        }
    }
    return img;
}

const NEIGHBOR_OFFSETS = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
];

function traceSkeletonToPolylines(skeleton, width, height) {
    const neighborsMap = new Map();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (!skeleton[idx]) continue;
            const list = [];
            for (let d = 0; d < NEIGHBOR_OFFSETS.length; d++) {
                const nx = x + NEIGHBOR_OFFSETS[d][0];
                const ny = y + NEIGHBOR_OFFSETS[d][1];
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (skeleton[nIdx]) list.push(nIdx);
                }
            }
            neighborsMap.set(idx, list);
        }
    }

    const usedEdges = new Set();
    const edgeKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const polylines = [];

    const walkFrom = (startNode, firstNext) => {
        const path = [startNode];
        usedEdges.add(edgeKey(startNode, firstNext));
        let prev = startNode;
        let curr = firstNext;

        while (true) {
            path.push(curr);
            const nbrs = neighborsMap.get(curr) || [];
            if (nbrs.length !== 2) break;
            if (curr === startNode) break;
            const candidate = nbrs[0] === prev ? nbrs[1] : nbrs[0];
            const k = edgeKey(curr, candidate);
            if (usedEdges.has(k)) break;
            usedEdges.add(k);
            prev = curr;
            curr = candidate;
        }

        return path.map((idx) => ({
            x: idx % width,
            y: Math.floor(idx / width),
        }));
    };

    // 1. Walk paths starting from endpoints (deg === 1) or branch junctions (deg >= 3)
    for (const [node, nbrs] of neighborsMap.entries()) {
        if (nbrs.length === 1 || nbrs.length >= 3) {
            for (const nxt of nbrs) {
                const k = edgeKey(node, nxt);
                if (!usedEdges.has(k)) {
                    polylines.push(walkFrom(node, nxt));
                }
            }
        }
    }

    // 2. Walk remaining closed degree-2 cycles (e.g. 'O')
    for (const [node, nbrs] of neighborsMap.entries()) {
        for (const nxt of nbrs) {
            const k = edgeKey(node, nxt);
            if (!usedEdges.has(k)) {
                polylines.push(walkFrom(node, nxt));
            }
        }
    }

    return polylines;
}

/**
 * Traces centerline strokes via skeletonization — ideal for keeping editable typography strokes.
 */
export function vectorizeCenterline(mask, width, height, options = {}) {
    const clean = despeckleMask(mask, width, height, options.minArea ?? 5);
    const skeleton = thinMaskZhangSuen(clean, width, height);
    const rawPolylines = traceSkeletonToPolylines(skeleton, width, height);

    const minDim = Math.max(width, height);
    const scaleFactor = 200 / Math.max(1, minDim);
    const rdpEps = Math.max(0.4, (options.simplify ?? 1.8) / scaleFactor);
    const smoothIters = Math.max(0, Math.min(3, Math.round(options.smoothness ?? 1)));

    const strokes = [];
    for (const raw of rawPolylines) {
        if (raw.length < 2) continue;
        const isClosed = raw.length >= 4 && Math.hypot(raw[0].x - raw[raw.length - 1].x, raw[0].y - raw[raw.length - 1].y) <= 2;
        if (raw.length < 3 && isClosed) continue;

        let pts = simplifyPolylineRDP(raw, rdpEps, isClosed);
        if (smoothIters > 0 && pts.length >= 3) {
            pts = smoothPolylineChaikin(pts, smoothIters, isClosed);
            pts = simplifyPolylineRDP(pts, rdpEps * 0.65, isClosed);
        }
        if (pts.length >= 2) {
            const s = pts.map((p) => ({ x: p.x, y: p.y }));
            s.lineCap = options.lineCap || 'round';
            s.isFilled = false;
            strokes.push(s);
        }
    }

    if (strokes.length === 0) return [];
    const band = options.fitBand || 'cap_to_base';
    return band === 'none' ? strokes : fitStrokesToBand(strokes, band);
}

function ringSignedArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        area += a.x * b.y - b.x * a.y;
    }
    return area / 2;
}

function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i].x;
        const yi = ring[i].y;
        const xj = ring[j].x;
        const yj = ring[j].y;
        const intersect = ((yi > pt.y) !== (yj > pt.y))
            && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Extracts closed boundary contours via Marching Squares on a padded binary mask.
 */
function extractMarchingSquareContours(mask, width, height) {
    const pw = width + 2;
    const ph = height + 2;
    const getCell = (x, y) => {
        const mx = x - 1;
        const my = y - 1;
        if (mx < 0 || mx >= width || my < 0 || my >= height) return 0;
        return mask[my * width + mx] ? 1 : 0;
    };

    // Directed segments keyed by quantized start midpoint "sx,sy" (half-pixel coords * 2)
    const segments = [];
    const byStart = new Map();

    const addSeg = (x1, y1, x2, y2) => {
        const key = `${Math.round(x1 * 2)},${Math.round(y1 * 2)}`;
        const seg = { x1, y1, x2, y2, used: false };
        segments.push(seg);
        if (!byStart.has(key)) byStart.set(key, []);
        byStart.get(key).push(seg);
    };

    for (let y = 0; y < ph - 1; y++) {
        for (let x = 0; x < pw - 1; x++) {
            const tl = getCell(x, y);
            const tr = getCell(x + 1, y);
            const br = getCell(x + 1, y + 1);
            const bl = getCell(x, y + 1);
            const state = (tl << 3) | (tr << 2) | (br << 1) | bl;
            if (state === 0 || state === 15) continue;

            const top = [x + 0.5, y];
            const right = [x + 1, y + 0.5];
            const bottom = [x + 0.5, y + 1];
            const left = [x, y + 0.5];

            // Orient segments with foreground on the right (standard clockwise-in-Y-down for outer contours)
            switch (state) {
                case 1: addSeg(left[0], left[1], bottom[0], bottom[1]); break;
                case 2: addSeg(bottom[0], bottom[1], right[0], right[1]); break;
                case 3: addSeg(left[0], left[1], right[0], right[1]); break;
                case 4: addSeg(right[0], right[1], top[0], top[1]); break;
                case 5:
                    addSeg(left[0], left[1], top[0], top[1]);
                    addSeg(right[0], right[1], bottom[0], bottom[1]);
                    break;
                case 6: addSeg(bottom[0], bottom[1], top[0], top[1]); break;
                case 7: addSeg(left[0], left[1], top[0], top[1]); break;
                case 8: addSeg(top[0], top[1], left[0], left[1]); break;
                case 9: addSeg(top[0], top[1], bottom[0], bottom[1]); break;
                case 10:
                    addSeg(top[0], top[1], right[0], right[1]);
                    addSeg(bottom[0], bottom[1], left[0], left[1]);
                    break;
                case 11: addSeg(top[0], top[1], right[0], right[1]); break;
                case 12: addSeg(right[0], right[1], left[0], left[1]); break;
                case 13: addSeg(right[0], right[1], bottom[0], bottom[1]); break;
                case 14: addSeg(bottom[0], bottom[1], left[0], left[1]); break;
                default: break;
            }
        }
    }

    const contours = [];
    for (const startSeg of segments) {
        if (startSeg.used) continue;
        const loop = [];
        let curr = startSeg;
        while (curr && !curr.used) {
            curr.used = true;
            loop.push({ x: curr.x1 - 0.5, y: curr.y1 - 0.5 });
            const nextKey = `${Math.round(curr.x2 * 2)},${Math.round(curr.y2 * 2)}`;
            const candidates = byStart.get(nextKey);
            curr = candidates ? candidates.find((s) => !s.used) : null;
        }
        if (loop.length >= 3) {
            contours.push(loop);
        }
    }

    return contours;
}

/**
 * Stitches interior holes into enclosing outer polygon rings via nearest-vertex bridges
 * so filled Canvas `<path>`, SVG, and TTF output render cutouts identically.
 */
function bridgeHolesIntoOuters(rings) {
    if (rings.length <= 1) return rings;

    const meta = rings.map((pts, index) => ({
        index,
        pts,
        area: Math.abs(ringSignedArea(pts)),
        depth: 0,
        parentIdx: -1,
    }));

    for (let i = 0; i < meta.length; i++) {
        const probe = meta[i].pts[0];
        let bestParentArea = Infinity;
        for (let j = 0; j < meta.length; j++) {
            if (i === j || meta[j].area <= meta[i].area) continue;
            if (pointInRing(probe, meta[j].pts)) {
                meta[i].depth++;
                if (meta[j].area < bestParentArea) {
                    bestParentArea = meta[j].area;
                    meta[i].parentIdx = j;
                }
            }
        }
    }

    // Group holes under their immediate even-depth outer ring
    const outers = meta.filter((m) => m.depth % 2 === 0);
    const result = [];

    outers.forEach((outer) => {
        // Ensure outer is CCW (signedArea > 0 in XY; normalize consistent orientation)
        let poly = outer.pts.map((p) => ({ x: p.x, y: p.y }));
        if (ringSignedArea(poly) < 0) poly.reverse();

        const childHoles = meta
            .filter((m) => m.depth % 2 === 1 && m.parentIdx === outer.index)
            // Bridge rightmost holes first to avoid bridge crossings
            .sort((a, b) => Math.max(...b.pts.map((p) => p.x)) - Math.max(...a.pts.map((p) => p.x)));

        childHoles.forEach((holeObj) => {
            const hole = holeObj.pts.map((p) => ({ x: p.x, y: p.y }));
            // Ensure hole winds opposite (CW) to outer (CCW)
            if (ringSignedArea(hole) > 0) hole.reverse();

            let bestO = 0;
            let bestH = 0;
            let bestDist = Infinity;
            for (let i = 0; i < poly.length; i++) {
                for (let j = 0; j < hole.length; j++) {
                    const d = (poly[i].x - hole[j].x) ** 2 + (poly[i].y - hole[j].y) ** 2;
                    if (d < bestDist) {
                        bestDist = d;
                        bestO = i;
                        bestH = j;
                    }
                }
            }

            const rotatedHole = [...hole.slice(bestH), ...hole.slice(0, bestH), { ...hole[bestH] }];
            poly = [
                ...poly.slice(0, bestO + 1),
                ...rotatedHole,
                { ...poly[bestO] },
                ...poly.slice(bestO + 1),
            ];
        });

        poly.push({ ...poly[0] });
        result.push(poly);
    });

    return result;
}

/**
 * Traces filled silhouette outline contours via Marching Squares — ideal for bold calligraphy/ink shapes.
 */
export function vectorizeOutline(mask, width, height, options = {}) {
    const clean = despeckleMask(mask, width, height, options.minArea ?? 8);
    const contours = extractMarchingSquareContours(clean, width, height);

    const minDim = Math.max(width, height);
    const scaleFactor = 200 / Math.max(1, minDim);
    const rdpEps = Math.max(0.4, (options.simplify ?? 1.4) / scaleFactor);
    const smoothIters = Math.max(0, Math.min(3, Math.round(options.smoothness ?? 1)));

    const cleanedRings = [];
    for (const c of contours) {
        if (Math.abs(ringSignedArea(c)) < Math.max(4, (options.minArea ?? 8) * 0.5)) continue;
        let pts = simplifyPolylineRDP(c, rdpEps, true);
        if (smoothIters > 0 && pts.length >= 4) {
            pts = smoothPolylineChaikin(pts, smoothIters, true);
            pts = simplifyPolylineRDP(pts, rdpEps * 0.65, true);
        }
        const openPts = pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y
            ? pts.slice(0, -1)
            : pts;
        if (openPts.length >= 3) {
            cleanedRings.push(openPts);
        }
    }

    if (cleanedRings.length === 0) return [];
    const bridged = bridgeHolesIntoOuters(cleanedRings);
    const strokes = bridged.map((ring) => {
        const s = ring.map((p) => ({ x: p.x, y: p.y }));
        s.isFilled = true;
        s.lineCap = 'butt';
        return s;
    });

    const band = options.fitBand || 'cap_to_base';
    return band === 'none' ? strokes : fitStrokesToBand(strokes, band);
}

export function vectorizeImageData(imageData, options = {}) {
    if (!imageData || !imageData.width || !imageData.height) return [];
    const mask = imageDataToBinaryMask(imageData, {
        threshold: options.threshold ?? 140,
        invert: Boolean(options.invert),
    });
    if (options.mode === 'outline') {
        return vectorizeOutline(mask, imageData.width, imageData.height, options);
    }
    return vectorizeCenterline(mask, imageData.width, imageData.height, options);
}

/**
 * Decodes an image File/Blob/DataURL in the browser onto an offscreen canvas scaled to `maxDim`
 * so raster tracing stays crisp and instantaneous.
 */
export function loadRasterImageData(fileOrBlob, maxDim = 160) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = typeof fileOrBlob === 'string' ? fileOrBlob : URL.createObjectURL(fileOrBlob);
        img.onload = () => {
            try {
                const scale = Math.min(maxDim / (img.naturalWidth || 1), maxDim / (img.naturalHeight || 1), 1);
                const w = Math.max(8, Math.round((img.naturalWidth || 64) * scale));
                const h = Math.max(8, Math.round((img.naturalHeight || 64) * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(objectUrl);
                resolve({ imageData, previewUrl: canvas.toDataURL('image/png') });
            } catch (err) {
                if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(objectUrl);
                reject(err);
            }
        };
        img.onerror = (err) => {
            if (typeof fileOrBlob !== 'string') URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });
}
