/**
 * Pure-JS 2D polygon union utility using planar segment splitting and
 * non-zero winding classification. Produces disjoint simple rings:
 *   - Outer boundaries in Counter-Clockwise (CCW, positive area) order
 *   - Interior holes in Clockwise (CW, negative area) order
 *
 * Designed for OpenType CFF glyph outlines so neither Windows GDI (even-odd)
 * nor DirectWrite/FreeType (non-zero) produces overlap dropouts at small sizes.
 */

const EPS = 1e-4;
const EPS_T = 1e-6;

export function signedArea(pts) {
    if (!pts || pts.length < 3) return 0;
    let sum = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        sum += a.x * b.y - b.x * a.y;
    }
    return sum * 0.5;
}

export function ensureCCW(pts) {
    const cleaned = removeConsecutiveDuplicates(pts, EPS);
    if (cleaned.length < 3) return null;
    const area = signedArea(cleaned);
    if (Math.abs(area) < 1e-2) return null;
    return area < 0 ? cleaned.slice().reverse() : cleaned;
}

function removeConsecutiveDuplicates(pts, tol = EPS) {
    if (!pts || pts.length === 0) return [];
    const tolSq = tol * tol;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const prev = out[out.length - 1];
        const dx = pts[i].x - prev.x;
        const dy = pts[i].y - prev.y;
        if (dx * dx + dy * dy > tolSq) {
            out.push(pts[i]);
        }
    }
    while (out.length > 1) {
        const first = out[0];
        const last = out[out.length - 1];
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        if (dx * dx + dy * dy <= tolSq) {
            out.pop();
        } else {
            break;
        }
    }
    return out;
}

function simplifyCollinear(pts, areaTol = 0.05) {
    if (pts.length <= 3) return pts;
    const out = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const cross = Math.abs((curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x));
        const base = Math.hypot(next.x - prev.x, next.y - prev.y);
        if (base < EPS || cross / base > areaTol) {
            out.push(curr);
        }
    }
    return out.length >= 3 ? out : pts;
}

function pointInPolygonsNonZero(px, py, polys, aabbs) {
    let wn = 0;
    for (let p = 0; p < polys.length; p++) {
        const box = aabbs[p];
        if (px < box.minX || px > box.maxX || py < box.minY || py > box.maxY) continue;
        const poly = polys[p];
        const n = poly.length;
        for (let i = 0; i < n; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % n];
            if (a.y <= py) {
                if (b.y > py && ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y)) > 0) {
                    wn++;
                }
            } else {
                if (b.y <= py && ((b.x - a.x) * (py - a.y) - (px - a.x) * (b.y - a.y)) < 0) {
                    wn--;
                }
            }
        }
    }
    return wn > 0;
}

function pointToSegDistSqAndT(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-12) {
        const ex = px - ax;
        const ey = py - ay;
        return { distSq: ex * ex + ey * ey, t: 0 };
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const ex = px - projX;
    const ey = py - projY;
    return { distSq: ex * ex + ey * ey, t };
}

/**
 * Spatial vertex welder to map floating intersection coordinates into
 * canonical vertex objects with integer IDs.
 */
function createVertexWelder(snapTol = 2e-3) {
    const cellSize = snapTol * 4;
    const grid = new Map();
    const vertices = [];
    const tolSq = snapTol * snapTol;

    function getOrCreate(x, y) {
        const cx = Math.round(x / cellSize);
        const cy = Math.round(y / cellSize);
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                const key = `${cx + ox},${cy + oy}`;
                const bucket = grid.get(key);
                if (!bucket) continue;
                for (let k = 0; k < bucket.length; k++) {
                    const v = vertices[bucket[k]];
                    const dx = v.x - x;
                    const dy = v.y - y;
                    if (dx * dx + dy * dy <= tolSq) {
                        return v;
                    }
                }
            }
        }
        const v = { id: vertices.length, x, y };
        vertices.push(v);
        const key = `${cx},${cy}`;
        let bucket = grid.get(key);
        if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
        }
        bucket.push(v.id);
        return v;
    }

    return { getOrCreate, vertices };
}

function collectSegmentIntersections(edges) {
    const splits = edges.map(() => [0, 1]);
    const order = edges.map((_, i) => i).sort((a, b) => edges[a].minX - edges[b].minX);
    const pad = 1e-3;
    const hitTolSq = 1e-6;

    for (let oi = 0; oi < order.length; oi++) {
        const i = order[oi];
        const e1 = edges[i];
        const x1 = e1.x1, y1 = e1.y1, x2 = e1.x2, y2 = e1.y2;
        const dx1 = x2 - x1, dy1 = y2 - y1;
        const len1 = Math.hypot(dx1, dy1);
        if (len1 < EPS) continue;

        for (let oj = oi + 1; oj < order.length; oj++) {
            const j = order[oj];
            const e2 = edges[j];
            if (e2.minX > e1.maxX + pad) break;
            if (e2.maxY + pad < e1.minY || e2.minY - pad > e1.maxY) continue;

            const x3 = e2.x1, y3 = e2.y1, x4 = e2.x2, y4 = e2.y2;
            const dx2 = x4 - x3, dy2 = y4 - y3;
            const len2 = Math.hypot(dx2, dy2);
            if (len2 < EPS) continue;

            const denom = dx1 * dy2 - dy1 * dx2;
            const parallelScale = Math.abs(denom) / (len1 * len2);

            if (parallelScale > 1e-6) {
                const t = ((x3 - x1) * dy2 - (y3 - y1) * dx2) / denom;
                const u = ((x3 - x1) * dy1 - (y3 - y1) * dx1) / denom;
                if (t >= -1e-4 && t <= 1 + 1e-4 && u >= -1e-4 && u <= 1 + 1e-4) {
                    if (t > EPS_T && t < 1 - EPS_T) splits[i].push(t);
                    if (u > EPS_T && u < 1 - EPS_T) splits[j].push(u);
                }
            } else {
                // Parallel / collinear overlap check: project endpoints onto partner segment
                const d3 = pointToSegDistSqAndT(x3, y3, x1, y1, x2, y2);
                if (d3.distSq < hitTolSq && d3.t > EPS_T && d3.t < 1 - EPS_T) splits[i].push(d3.t);
                const d4 = pointToSegDistSqAndT(x4, y4, x1, y1, x2, y2);
                if (d4.distSq < hitTolSq && d4.t > EPS_T && d4.t < 1 - EPS_T) splits[i].push(d4.t);

                const d1 = pointToSegDistSqAndT(x1, y1, x3, y3, x4, y4);
                if (d1.distSq < hitTolSq && d1.t > EPS_T && d1.t < 1 - EPS_T) splits[j].push(d1.t);
                const d2 = pointToSegDistSqAndT(x2, y2, x3, y3, x4, y4);
                if (d2.distSq < hitTolSq && d2.t > EPS_T && d2.t < 1 - EPS_T) splits[j].push(d2.t);
            }
        }
    }

    return splits;
}

function buildAtomicSegments(edges, splits, welder) {
    const uniqueSegments = [];
    const seen = new Set();

    for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const ts = splits[i].slice().sort((a, b) => a - b);
        const mergedTs = [ts[0]];
        for (let k = 1; k < ts.length; k++) {
            if (ts[k] - mergedTs[mergedTs.length - 1] > EPS_T) {
                mergedTs.push(ts[k]);
            }
        }

        const dx = e.x2 - e.x1;
        const dy = e.y2 - e.y1;
        for (let k = 0; k < mergedTs.length - 1; k++) {
            const tA = mergedTs[k];
            const tB = mergedTs[k + 1];
            const vA = welder.getOrCreate(e.x1 + dx * tA, e.y1 + dy * tA);
            const vB = welder.getOrCreate(e.x1 + dx * tB, e.y1 + dy * tB);
            if (vA.id === vB.id) continue;

            const lo = vA.id < vB.id ? vA.id : vB.id;
            const hi = vA.id < vB.id ? vB.id : vA.id;
            const key = `${lo}:${hi}`;
            if (seen.has(key)) continue;
            seen.add(key);

            uniqueSegments.push({
                a: vA,
                b: vB,
                minX: Math.min(vA.x, vB.x),
                maxX: Math.max(vA.x, vB.x),
                minY: Math.min(vA.y, vB.y),
                maxY: Math.max(vA.y, vB.y),
            });
        }
    }

    return uniqueSegments;
}

function classifyBoundaryHalfEdges(segments, polys, aabbs) {
    const halfEdges = [];
    const sortedIndices = segments.map((_, idx) => idx).sort((a, b) => segments[a].minX - segments[b].minX);
    const searchPad = 0.05;
    const searchPadSq = searchPad * searchPad;

    for (let si = 0; si < sortedIndices.length; si++) {
        const i = sortedIndices[si];
        const seg = segments[i];
        const ax = seg.a.x, ay = seg.a.y;
        const bx = seg.b.x, by = seg.b.y;
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < EPS) continue;

        const mx = (ax + bx) * 0.5;
        const my = (ay + by) * 0.5;
        const nx = -dy / len;
        const ny = dx / len;

        // Shrink probe distance if another segment passes close to midpoint M
        let minNeighborDistSq = searchPadSq;
        const minReachX = mx - searchPad;
        const maxReachX = mx + searchPad;
        const minReachY = my - searchPad;
        const maxReachY = my + searchPad;

        for (let sj = 0; sj < sortedIndices.length; sj++) {
            const j = sortedIndices[sj];
            const other = segments[j];
            if (other.minX > maxReachX) break;
            if (j === i || other.maxX < minReachX || other.maxY < minReachY || other.minY > maxReachY) {
                continue;
            }
            const res = pointToSegDistSqAndT(mx, my, other.a.x, other.a.y, other.b.x, other.b.y);
            if (res.distSq > 1e-10 && res.distSq < minNeighborDistSq) {
                minNeighborDistSq = res.distSq;
            }
        }

        const probeDist = Math.max(1e-5, Math.min(0.02, len * 0.1, Math.sqrt(minNeighborDistSq) * 0.3));
        const inLeft = pointInPolygonsNonZero(mx + nx * probeDist, my + ny * probeDist, polys, aabbs);
        const inRight = pointInPolygonsNonZero(mx - nx * probeDist, my - ny * probeDist, polys, aabbs);

        if (inLeft && !inRight) {
            halfEdges.push({ from: seg.a, to: seg.b, used: false });
        } else if (!inLeft && inRight) {
            halfEdges.push({ from: seg.b, to: seg.a, used: false });
        }
    }

    return halfEdges;
}

function chainDirectedEdges(halfEdges) {
    const outByVertex = new Map();
    for (let i = 0; i < halfEdges.length; i++) {
        const edge = halfEdges[i];
        edge.angle = Math.atan2(edge.to.y - edge.from.y, edge.to.x - edge.from.x);
        let list = outByVertex.get(edge.from.id);
        if (!list) {
            list = [];
            outByVertex.set(edge.from.id, list);
        }
        list.push(edge);
    }

    const TWO_PI = Math.PI * 2;
    const rings = [];

    for (let i = 0; i < halfEdges.length; i++) {
        const startEdge = halfEdges[i];
        if (startEdge.used) continue;

        const pts = [];
        let curr = startEdge;
        const maxSteps = halfEdges.length + 2;
        let closed = false;

        for (let step = 0; step < maxSteps; step++) {
            curr.used = true;
            pts.push({ x: curr.from.x, y: curr.from.y });

            if (curr.to.id === startEdge.from.id) {
                closed = true;
                break;
            }

            const candidates = outByVertex.get(curr.to.id);
            if (!candidates || candidates.length === 0) break;

            // Back vector angle from curr.to toward curr.from
            const backAngle = Math.atan2(curr.from.y - curr.to.y, curr.from.x - curr.to.x);
            let bestEdge = null;
            let bestDelta = Infinity;

            for (let k = 0; k < candidates.length; k++) {
                const cand = candidates[k];
                if (cand.used) continue;
                // Hug filled region on the LEFT: smallest positive CW turn from backAngle
                let delta = backAngle - cand.angle;
                while (delta <= 1e-9) delta += TWO_PI;
                while (delta > TWO_PI + 1e-9) delta -= TWO_PI;
                if (delta < bestDelta) {
                    bestDelta = delta;
                    bestEdge = cand;
                }
            }

            if (!bestEdge) break;
            curr = bestEdge;
        }

        if (closed && pts.length >= 3) {
            const simplified = simplifyCollinear(removeConsecutiveDuplicates(pts, EPS));
            if (simplified.length >= 3 && Math.abs(signedArea(simplified)) >= 0.5) {
                rings.push(simplified);
            }
        }
    }

    return rings;
}

/**
 * Unions an array of closed polygons under the non-zero winding rule into
 * disjoint simple contours (outer rings CCW, interior hole rings CW).
 */
export function unionPolygons(rawPolygons) {
    const polys = [];
    const aabbs = [];

    for (let i = 0; i < (rawPolygons?.length || 0); i++) {
        const ccw = ensureCCW(rawPolygons[i]);
        if (!ccw) continue;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let k = 0; k < ccw.length; k++) {
            const pt = ccw[k];
            if (pt.x < minX) minX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
        }
        polys.push(ccw);
        aabbs.push({ minX: minX - EPS, minY: minY - EPS, maxX: maxX + EPS, maxY: maxY + EPS });
    }

    if (polys.length === 0) return [];

    const edges = [];
    for (let p = 0; p < polys.length; p++) {
        const poly = polys[p];
        const n = poly.length;
        for (let i = 0; i < n; i++) {
            const a = poly[i];
            const b = poly[(i + 1) % n];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            if (dx * dx + dy * dy <= EPS * EPS) continue;
            edges.push({
                x1: a.x, y1: a.y, x2: b.x, y2: b.y,
                minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x),
                minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y),
            });
        }
    }

    if (edges.length < 3) return [];

    // Check if any edge pair intersects (or endpoints coincide / overlap across polygons)
    const splits = collectSegmentIntersections(edges);
    const hasSplit = splits.some(s => s.length > 2);

    // If multiple polygons exist, check pairwise AABB overlap even when edges don't cross (e.g., containment)
    let hasBoxOverlap = false;
    for (let i = 0; i < aabbs.length && !hasBoxOverlap; i++) {
        for (let j = i + 1; j < aabbs.length; j++) {
            const a = aabbs[i], b = aabbs[j];
            if (a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY) {
                hasBoxOverlap = true;
                break;
            }
        }
    }

    if (polys.length === 1 && !hasSplit) {
        return polys;
    }

    if (!hasBoxOverlap && !hasSplit) {
        return polys;
    }

    const welder = createVertexWelder(2e-3);
    const atomicSegments = buildAtomicSegments(edges, splits, welder);
    const halfEdges = classifyBoundaryHalfEdges(atomicSegments, polys, aabbs);
    const rings = chainDirectedEdges(halfEdges);

    return rings;
}
