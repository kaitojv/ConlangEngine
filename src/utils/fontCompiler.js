// src/utils/fontCompiler.js
import opentype from 'opentype.js';

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
        isBrushPen: false
    };
    let actualStrokes = Array.isArray(strokeArray) ? strokeArray : [];

    if (actualStrokes.length > 0) {
        const firstStroke = actualStrokes[0];
        if (!Array.isArray(firstStroke) && firstStroke && firstStroke.isMeta) {
            meta = { ...meta, ...firstStroke };
            actualStrokes = actualStrokes.slice(1);
        } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0]?.x === -999) {
            meta.isCalligraphy = true;
            actualStrokes = actualStrokes.slice(1);
        } else if (Array.isArray(firstStroke) && firstStroke.length === 1 && firstStroke[0]?.x === -998) {
            meta.isBrushPen = true;
            actualStrokes = actualStrokes.slice(1);
        }
    }

    return { meta, actualStrokes };
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

    const hasCalligraphy = meta.isCalligraphy;
    const hasBrushPen = meta.isBrushPen;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let hasPoints = false;

    actualStrokes.forEach(strokeData => {
        const points = Array.isArray(strokeData) ? strokeData : (strokeData?.points || []);
        points.forEach(pt => {
            if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
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

    actualStrokes.forEach(strokeData => {
        const points = Array.isArray(strokeData) ? strokeData : (strokeData?.points || []);
        const isFilled = strokeData?.isFilled || false;
        const lineCap = strokeData?.lineCap || 'round';

        if (points.length === 0) return;

        // Simplify the stroke by dropping points that are too close, then RDP-pruning collinear points
        const distFiltered = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = distFiltered[distFiltered.length - 1];
            const curr = points[i];
            const dx = curr.x - last.x;
            const dy = curr.y - last.y;
            if ((dx * dx + dy * dy) > 16 || i === points.length - 1) {
                distFiltered.push(curr);
            }
        }
        const simplified = simplifyStrokeRDP(distFiltered, isFilled ? 1.0 : 1.8);

        if (isFilled && simplified.length >= 3) {
            path.moveTo(toX(simplified[0].x), toY(simplified[0].y));
            for (let i = 1; i < simplified.length; i++) {
                path.lineTo(toX(simplified[i].x), toY(simplified[i].y));
            }
            path.close();
        } else {
            for (let i = 0; i < simplified.length; i++) {
                const pt1 = simplified[i];
                const cx1 = toX(pt1.x);
                const cy1 = toY(pt1.y);

                let r = r_base * meta.scale;
                if (hasCalligraphy) {
                    const taper = Math.sin((i / (simplified.length - 1 || 1)) * Math.PI);
                    r = (r_base * meta.scale) * (0.3 + 0.7 * taper);
                } else if (hasBrushPen) {
                    const progress = i / (simplified.length - 1 || 1);
                    const widthMult = progress < 0.8 ? 1.0 : (1.0 - (progress - 0.8) * 5);
                    const startMult = progress < 0.1 ? (0.5 + progress * 5) : 1.0;
                    r = (r_base * meta.scale) * Math.max(0.1, widthMult * startMult);
                }

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
                    const pt2 = simplified[i + 1];
                    const cx2 = toX(pt2.x);
                    const cy2 = toY(pt2.y);

                    let next_r = r_base * meta.scale;
                    if (hasCalligraphy) {
                        const next_taper = Math.sin(((i + 1) / (simplified.length - 1 || 1)) * Math.PI);
                        next_r = (r_base * meta.scale) * (0.3 + 0.7 * next_taper);
                    } else if (hasBrushPen) {
                        const next_progress = (i + 1) / (simplified.length - 1 || 1);
                        const next_widthMult = next_progress < 0.8 ? 1.0 : (1.0 - (next_progress - 0.8) * 5);
                        const next_startMult = next_progress < 0.1 ? (0.5 + next_progress * 5) : 1.0;
                        next_r = (r_base * meta.scale) * Math.max(0.1, next_widthMult * next_startMult);
                    }

                    const dx = cx2 - cx1;
                    const dy = cy2 - cy1;
                    const len = Math.sqrt(dx * dx + dy * dy);

                    if (len > 0) {
                        const nx1 = (dy / len) * r;
                        const ny1 = -(dx / len) * r;
                        const nx2 = (dy / len) * next_r;
                        const ny2 = -(dx / len) * next_r;

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

/**
 * Sanitizes a font name string for OpenType name table compatibility.
 */
/**
 * Sanitizes a font name string for OpenType `name` and `CFF ` table compatibility
 * (printable ASCII only, since opentype.js encodes CFF String INDEX as single bytes).
 */
function sanitizeNameString(val, fallback) {
    const clean = String(val || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || fallback;
}

/**
 * Sanitizes a PostScript glyph name for OpenType `post` and `CFF ` table compatibility
 * (ASCII printable, no spaces, max 63 characters).
 */
function sanitizeGlyphName(val, fallback) {
    const clean = String(val || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
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

    const familyName = sanitizeNameString(options?.familyName, 'ConlangFont');
    const styleName = sanitizeNameString(options?.styleName, 'Regular');
    const fontOptions = {
        familyName,
        styleName,
        postScriptName: sanitizeGlyphName(`${familyName}-${styleName}`, 'ConlangFont-Regular'),
        unitsPerEm: upe,
        ascender: asc,
        descender: desc,
        glyphs
    };

    if (options?.version) fontOptions.version = sanitizeNameString(options.version, 'Version 1.0');
    if (options?.copyright) fontOptions.copyright = sanitizeNameString(options.copyright, '');
    if (options?.designer) fontOptions.designer = sanitizeNameString(options.designer, '');
    if (options?.description) fontOptions.description = sanitizeNameString(options.description, '');
    if (options?.license) fontOptions.license = sanitizeNameString(options.license, '');

    const font = new opentype.Font(fontOptions);

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

