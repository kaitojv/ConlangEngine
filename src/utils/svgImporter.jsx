import { fitStrokesToBand } from './fontStudioTools.js';
import { parseSvgPathD } from './svgPathParser.js';

export { parseSvgPathD };

function getFillFlag(el) {
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    if (fill === 'none') return false;
    if (fill && fill !== 'none') return true;
    return !stroke || stroke === 'none';
}

function applyElementTransform(points, el) {
    const transforms = [];
    let curr = el;
    while (curr && curr.getAttribute) {
        const tf = curr.getAttribute('transform');
        if (tf) transforms.unshift(tf);
        curr = curr.parentNode;
    }
    if (transforms.length === 0) return points;

    let out = points.map((p) => ({ x: p.x, y: p.y }));
    transforms.forEach((tfStr) => {
        const ops = tfStr.match(/[a-zA-Z]+\([^)]*\)/g) || [];
        ops.forEach((op) => {
            const name = op.slice(0, op.indexOf('(')).trim().toLowerCase();
            const args = op.slice(op.indexOf('(') + 1, -1).trim().split(/[\s,]+/).map(parseFloat).filter(Number.isFinite);
            if (name === 'translate' && args.length >= 1) {
                const tx = args[0];
                const ty = args[1] ?? 0;
                out = out.map((p) => ({ x: p.x + tx, y: p.y + ty }));
            } else if (name === 'scale' && args.length >= 1) {
                const sx = args[0];
                const sy = args[1] ?? sx;
                out = out.map((p) => ({ x: p.x * sx, y: p.y * sy }));
            } else if (name === 'rotate' && args.length >= 1) {
                const rad = (args[0] * Math.PI) / 180;
                const cx = args[1] ?? 0;
                const cy = args[2] ?? 0;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                out = out.map((p) => {
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
                });
            }
        });
    });
    return out;
}

export const parseSVGToStrokes = (svgString, options = {}) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const allStrokes = [];

    const pushShape = (pts, el, defaultFilled = false) => {
        if (!pts || pts.length === 0) return;
        const transformed = applyElementTransform(pts, el);
        transformed.isFilled = defaultFilled || getFillFlag(el);
        transformed.lineCap = el.getAttribute('stroke-linecap') || 'round';
        allStrokes.push(transformed);
    };

    doc.querySelectorAll('path').forEach((path) => {
        const d = path.getAttribute('d');
        if (!d) return;
        const parsed = parseSvgPathD(d, {
            isFilled: getFillFlag(path),
            lineCap: path.getAttribute('stroke-linecap') || 'round',
        });
        parsed.forEach((s) => {
            const pts = applyElementTransform(s, path);
            pts.isFilled = s.isFilled;
            pts.lineCap = s.lineCap;
            allStrokes.push(pts);
        });
    });

    doc.querySelectorAll('rect').forEach((rect) => {
        const x = parseFloat(rect.getAttribute('x') || 0);
        const y = parseFloat(rect.getAttribute('y') || 0);
        const w = parseFloat(rect.getAttribute('width') || 0);
        const h = parseFloat(rect.getAttribute('height') || 0);
        if (w > 0 && h > 0) {
            pushShape([
                { x, y },
                { x: x + w, y },
                { x: x + w, y: y + h },
                { x, y: y + h },
                { x, y },
            ], rect);
        }
    });

    doc.querySelectorAll('circle').forEach((circle) => {
        const cx = parseFloat(circle.getAttribute('cx') || 0);
        const cy = parseFloat(circle.getAttribute('cy') || 0);
        const r = parseFloat(circle.getAttribute('r') || 0);
        if (r > 0) {
            const pts = Array.from({ length: 33 }, (_, i) => {
                const a = (i / 32) * Math.PI * 2;
                return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
            });
            pushShape(pts, circle);
        }
    });

    doc.querySelectorAll('ellipse').forEach((ellipse) => {
        const cx = parseFloat(ellipse.getAttribute('cx') || 0);
        const cy = parseFloat(ellipse.getAttribute('cy') || 0);
        const rx = parseFloat(ellipse.getAttribute('rx') || 0);
        const ry = parseFloat(ellipse.getAttribute('ry') || 0);
        if (rx > 0 && ry > 0) {
            const pts = Array.from({ length: 33 }, (_, i) => {
                const a = (i / 32) * Math.PI * 2;
                return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
            });
            pushShape(pts, ellipse);
        }
    });

    doc.querySelectorAll('line').forEach((line) => {
        const x1 = parseFloat(line.getAttribute('x1') || 0);
        const y1 = parseFloat(line.getAttribute('y1') || 0);
        const x2 = parseFloat(line.getAttribute('x2') || 0);
        const y2 = parseFloat(line.getAttribute('y2') || 0);
        pushShape([{ x: x1, y: y1 }, { x: x2, y: y2 }], line);
    });

    doc.querySelectorAll('polyline, polygon').forEach((poly) => {
        const raw = (poly.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat).filter(Number.isFinite);
        const pts = [];
        for (let i = 0; i + 1 < raw.length; i += 2) {
            pts.push({ x: raw[i], y: raw[i + 1] });
        }
        if (poly.tagName.toLowerCase() === 'polygon' && pts.length >= 2) {
            pts.push({ ...pts[0] });
            pushShape(pts, poly, true);
        } else if (pts.length >= 2) {
            pushShape(pts, poly);
        }
    });

    if (allStrokes.length === 0) return [];

    if (options.fitBand) {
        return fitStrokesToBand(allStrokes, options.fitBand);
    }

    const svgTag = doc.querySelector('svg');
    let useViewBoxMapping = false;
    let scaleX = 1;
    let scaleY = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (svgTag && !options.autoCenter) {
        const viewBox = svgTag.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox.split(/[\s,]+/).map(parseFloat);
            if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                const [vx, vy, vw, vh] = parts;
                const uniform = Math.min(300 / vw, 300 / vh);
                scaleX = uniform;
                scaleY = uniform;
                offsetX = (300 - vw * uniform) / 2 - vx * uniform;
                offsetY = (300 - vh * uniform) / 2 - vy * uniform;
                useViewBoxMapping = true;
            }
        } else {
            const w = parseFloat(svgTag.getAttribute('width'));
            const h = parseFloat(svgTag.getAttribute('height'));
            if (w > 0 && h > 0) {
                const uniform = Math.min(300 / w, 300 / h);
                scaleX = uniform;
                scaleY = uniform;
                offsetX = (300 - w * uniform) / 2;
                offsetY = (300 - h * uniform) / 2;
                useViewBoxMapping = true;
            }
        }
    }

    if (useViewBoxMapping) {
        allStrokes.forEach((stroke) => {
            stroke.forEach((pt) => {
                pt.x = pt.x * scaleX + offsetX;
                pt.y = pt.y * scaleY + offsetY;
            });
        });
        return allStrokes;
    }

    return fitStrokesToBand(allStrokes, 'cap_to_base');
};
