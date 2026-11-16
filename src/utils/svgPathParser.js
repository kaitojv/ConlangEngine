function tokenizePathD(d) {
    const tokens = [];
    const re = /([a-zA-Z])|([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/g;
    let m;
    while ((m = re.exec(d)) !== null) {
        if (m[1]) tokens.push({ type: 'cmd', val: m[1] });
        else tokens.push({ type: 'num', val: parseFloat(m[2]) });
    }
    return tokens;
}

function sampleCubicBezier(p0, c1, c2, p1, steps = 14) {
    const pts = [];
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        pts.push({
            x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p1.x,
            y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p1.y,
        });
    }
    return pts;
}

function sampleQuadBezier(p0, c, p1, steps = 12) {
    const pts = [];
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const u = 1 - t;
        pts.push({
            x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
            y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
        });
    }
    return pts;
}

function sampleEllipticalArc(p0, rxIn, ryIn, xAxisRotationDeg, largeArc, sweep, p1, steps = 16) {
    if (p0.x === p1.x && p0.y === p1.y) return [];
    let rx = Math.abs(rxIn);
    let ry = Math.abs(ryIn);
    if (rx < 1e-6 || ry < 1e-6) return [{ x: p1.x, y: p1.y }];

    const phi = (xAxisRotationDeg * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const dx2 = (p0.x - p1.x) / 2;
    const dy2 = (p0.y - p1.y) / 2;
    const x1p = cosPhi * dx2 + sinPhi * dy2;
    const y1p = -sinPhi * dx2 + cosPhi * dy2;

    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lambda > 1) {
        const s = Math.sqrt(lambda);
        rx *= s;
        ry *= s;
    }

    const rxSq = rx * rx;
    const rySq = ry * ry;
    const x1pSq = x1p * x1p;
    const y1pSq = y1p * y1p;
    const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
    const den = rxSq * y1pSq + rySq * x1pSq;
    const factor = den > 0 ? Math.sqrt(num / den) * (largeArc === sweep ? -1 : 1) : 0;

    const cxp = factor * ((rx * y1p) / ry);
    const cyp = factor * (-(ry * x1p) / rx);
    const cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2;

    const vecAngle = (ux, uy, vx, vy) => {
        const dot = ux * vx + uy * vy;
        const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
        const c = Math.max(-1, Math.min(1, dot / (len || 1)));
        const sign = ux * vy - uy * vx < 0 ? -1 : 1;
        return sign * Math.acos(c);
    };

    const vx = (x1p - cxp) / rx;
    const vy = (y1p - cyp) / ry;
    const theta1 = vecAngle(1, 0, vx, vy);
    let dTheta = vecAngle(vx, vy, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!sweep && dTheta > 0) dTheta -= Math.PI * 2;
    if (sweep && dTheta < 0) dTheta += Math.PI * 2;

    const pts = [];
    for (let i = 1; i <= steps; i++) {
        const ang = theta1 + (dTheta * i) / steps;
        const ex = rx * Math.cos(ang);
        const ey = ry * Math.sin(ang);
        pts.push({
            x: cosPhi * ex - sinPhi * ey + cx,
            y: sinPhi * ex + cosPhi * ey + cy,
        });
    }
    return pts;
}

/**
 * Parses an SVG `<path d="...">` string into separate polylines (splitting multi-subpath contours cleanly)
 * with full support for M/m, L/l, H/h, V/v, C/c, S/s, Q/q, T/t, A/a, Z/z.
 */
export function parseSvgPathD(d, strokeProps = {}) {
    if (!d) return [];
    const tokens = tokenizePathD(d);
    const strokes = [];
    let current = [];
    let curX = 0;
    let curY = 0;
    let startX = 0;
    let startY = 0;
    let prevCtrlX = null;
    let prevCtrlY = null;
    let prevCmd = '';
    let idx = 0;

    const nextNum = () => (idx < tokens.length && tokens[idx].type === 'num' ? tokens[idx++].val : null);
    const hasNum = () => idx < tokens.length && tokens[idx].type === 'num';

    const flushCurrent = (closedByZ = false) => {
        if (current.length >= 2 || (current.length === 1 && !closedByZ)) {
            const copy = current.map((pt) => ({ x: pt.x, y: pt.y }));
            copy.isFilled = Boolean(strokeProps.isFilled || closedByZ);
            copy.lineCap = strokeProps.lineCap || 'round';
            strokes.push(copy);
        }
        current = [];
    };

    while (idx < tokens.length) {
        const tok = tokens[idx];
        let cmd;
        if (tok.type === 'cmd') {
            cmd = tok.val;
            idx++;
        } else {
            cmd = prevCmd === 'M' ? 'L' : prevCmd === 'm' ? 'l' : prevCmd;
            if (!cmd) {
                idx++;
                continue;
            }
        }

        const isRel = cmd === cmd.toLowerCase();
        const upper = cmd.toUpperCase();

        if (upper === 'Z') {
            if (current.length > 0) {
                const last = current[current.length - 1];
                if (Math.hypot(last.x - startX, last.y - startY) > 0.05) {
                    current.push({ x: startX, y: startY });
                }
            }
            curX = startX;
            curY = startY;
            prevCtrlX = null;
            prevCtrlY = null;
            flushCurrent(true);
            prevCmd = cmd;
            continue;
        }

        if (upper === 'M') {
            const x = nextNum();
            const y = nextNum();
            if (x === null || y === null) break;
            if (current.length > 0) flushCurrent(false);
            curX = isRel ? curX + x : x;
            curY = isRel ? curY + y : y;
            startX = curX;
            startY = curY;
            current = [{ x: curX, y: curY }];
            prevCtrlX = null;
            prevCtrlY = null;
            prevCmd = cmd;
            while (hasNum()) {
                const lx = nextNum();
                const ly = nextNum();
                if (lx === null || ly === null) break;
                curX = isRel ? curX + lx : lx;
                curY = isRel ? curY + ly : ly;
                current.push({ x: curX, y: curY });
            }
            continue;
        }

        if (!hasNum()) {
            prevCmd = cmd;
            continue;
        }

        while (hasNum()) {
            if (upper === 'L') {
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                curX = isRel ? curX + x : x;
                curY = isRel ? curY + y : y;
                current.push({ x: curX, y: curY });
                prevCtrlX = null;
                prevCtrlY = null;
            } else if (upper === 'H') {
                const x = nextNum();
                if (x === null) break;
                curX = isRel ? curX + x : x;
                current.push({ x: curX, y: curY });
                prevCtrlX = null;
                prevCtrlY = null;
            } else if (upper === 'V') {
                const y = nextNum();
                if (y === null) break;
                curY = isRel ? curY + y : y;
                current.push({ x: curX, y: curY });
                prevCtrlX = null;
                prevCtrlY = null;
            } else if (upper === 'C') {
                const x1 = nextNum();
                const y1 = nextNum();
                const x2 = nextNum();
                const y2 = nextNum();
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                const c1 = { x: isRel ? curX + x1 : x1, y: isRel ? curY + y1 : y1 };
                const c2 = { x: isRel ? curX + x2 : x2, y: isRel ? curY + y2 : y2 };
                const end = { x: isRel ? curX + x : x, y: isRel ? curY + y : y };
                current.push(...sampleCubicBezier({ x: curX, y: curY }, c1, c2, end));
                prevCtrlX = c2.x;
                prevCtrlY = c2.y;
                curX = end.x;
                curY = end.y;
            } else if (upper === 'S') {
                const x2 = nextNum();
                const y2 = nextNum();
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                const c1 = ['C', 'S'].includes(prevCmd.toUpperCase()) && prevCtrlX !== null
                    ? { x: 2 * curX - prevCtrlX, y: 2 * curY - prevCtrlY }
                    : { x: curX, y: curY };
                const c2 = { x: isRel ? curX + x2 : x2, y: isRel ? curY + y2 : y2 };
                const end = { x: isRel ? curX + x : x, y: isRel ? curY + y : y };
                current.push(...sampleCubicBezier({ x: curX, y: curY }, c1, c2, end));
                prevCtrlX = c2.x;
                prevCtrlY = c2.y;
                curX = end.x;
                curY = end.y;
            } else if (upper === 'Q') {
                const x1 = nextNum();
                const y1 = nextNum();
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                const c = { x: isRel ? curX + x1 : x1, y: isRel ? curY + y1 : y1 };
                const end = { x: isRel ? curX + x : x, y: isRel ? curY + y : y };
                current.push(...sampleQuadBezier({ x: curX, y: curY }, c, end));
                prevCtrlX = c.x;
                prevCtrlY = c.y;
                curX = end.x;
                curY = end.y;
            } else if (upper === 'T') {
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                const c = ['Q', 'T'].includes(prevCmd.toUpperCase()) && prevCtrlX !== null
                    ? { x: 2 * curX - prevCtrlX, y: 2 * curY - prevCtrlY }
                    : { x: curX, y: curY };
                const end = { x: isRel ? curX + x : x, y: isRel ? curY + y : y };
                current.push(...sampleQuadBezier({ x: curX, y: curY }, c, end));
                prevCtrlX = c.x;
                prevCtrlY = c.y;
                curX = end.x;
                curY = end.y;
            } else if (upper === 'A') {
                const rx = nextNum();
                const ry = nextNum();
                const rot = nextNum();
                const large = nextNum();
                const sweep = nextNum();
                const x = nextNum();
                const y = nextNum();
                if (x === null || y === null) break;
                const end = { x: isRel ? curX + x : x, y: isRel ? curY + y : y };
                current.push(...sampleEllipticalArc({ x: curX, y: curY }, rx, ry, rot, Boolean(large), Boolean(sweep), end));
                prevCtrlX = null;
                prevCtrlY = null;
                curX = end.x;
                curY = end.y;
            } else {
                break;
            }
            prevCmd = cmd;
        }
    }

    flushCurrent(false);
    return strokes;
}
