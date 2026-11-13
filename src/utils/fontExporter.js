// src/utils/fontExporter.js
// Pure custom font export pipeline for Conlang Engine.
// Supports Alphabetic, Abjad, Abugida, Syllabic, Featural/Block, and Logographic scripts,
// including Latin/ASCII key aliasing, OpenType GSUB ligatures, multi-part TTF chunking
// for huge logographic inventories (>65k glyphs), CSS @font-face, JSON glyph maps,
// and an interactive HTML specimen/character map.

import JSZip from 'jszip';
import { buildOpenTypeFont, fixOpenTypeChecksums } from './fontCompiler.js';
import { compileBlockStrokes, parseList } from './blockLayout.js';
import {
    getDefaultScriptId,
    getScriptSystem,
    getScriptData,
    getScriptTypographySettings,
    normalizeScriptType,
    resolveWordScriptId,
} from './scriptResolver.js';

/** Safely below OpenType's 65,535 uint16 maxp.numGlyphs hard limit. */
export const MAX_GLYPHS_PER_FONT = 65000;

export function sanitizeFontFileName(name, fallback = 'ConlangFont') {
    const clean = String(name || '')
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return clean || fallback;
}

export function sanitizeFontFamilyName(name, fallback = 'ConlangFont') {
    const clean = String(name || '')
        .replace(/[\r\n\t"'\\]+/g, ' ')
        .trim();
    return clean || fallback;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeCssUrl(str) {
    return String(str ?? '').replace(/['"\\()\r\n]/g, '');
}

/**
 * Normalizes a glyph map key into numeric codepoint string -> stroke array,
 * skipping empty or non-drawable entries.
 */
function mergeDrawableGlyphs(target, source) {
    if (!source || typeof source !== 'object') return;
    for (const [key, strokes] of Object.entries(source)) {
        if (!Array.isArray(strokes) || strokes.length === 0) continue;
        const cp = Number.parseInt(key, 10);
        if (!Number.isInteger(cp) || cp <= 0 || cp > 0x10FFFF) continue;
        target[cp] = strokes;
    }
}

/**
 * Reconstructs featural/block glyphs from featuralComponents + blockTemplates + syllabaryMap
 * so featural_block scripts can be exported directly as standalone TTFs with PUA codepoints
 * and GSUB ligatures.
 */
function reconstructFeaturalBlockGlyphs(config, script, scriptData) {
    const reconstructed = {};
    const featuralComponents = scriptData?.featuralComponents || config?.featuralComponents || {};
    if (!featuralComponents || Object.keys(featuralComponents).length === 0) {
        return reconstructed;
    }

    const blockSettings = script?.blockSettings || config?.blockSettings || {};
    const blockTemplates = (script?.blockTemplates && script.blockTemplates.length > 0)
        ? script.blockTemplates
        : (config?.blockTemplates || []);

    const activeTemplates = blockTemplates.length > 0 ? blockTemplates : [
        {
            id: 'legacy',
            maxChars: blockSettings.maxChars || 3,
            layoutTemplate: blockSettings.layoutTemplate || '2top1bottom',
            slotMapping: blockSettings.slotMapping || []
        }
    ];

    const consList = parseList(config?.consonants || '');
    const vowList = parseList(config?.vowels || '');
    const otherList = parseList(config?.otherPhonemes || '');
    const syllabaryMap = scriptData?.syllabaryMap || config?.syllabaryMap || {};

    // 1. Reconstruct every syllable block already mapped in syllabaryMap
    for (const [blockKey, mappedChar] of Object.entries(syllabaryMap)) {
        if (!mappedChar || typeof mappedChar !== 'string') continue;
        const chars = Array.from(mappedChar);
        if (chars.length !== 1) continue;
        const cp = chars[0].codePointAt(0);
        if (!cp || cp <= 32) continue;

        let cleanBlock = blockKey;
        let overrideLayout = null;
        if (blockKey.includes(':')) {
            const parts = blockKey.split(':');
            cleanBlock = parts[0];
            overrideLayout = parts[1];
        }

        // If it's a single featural radical mapped directly, render solo
        if (featuralComponents[cleanBlock]) {
            const rawStrokes = featuralComponents[cleanBlock].filter(
                s => Array.isArray(s) && !(s.length === 1 && (s[0]?.x === -999 || s[0]?.x === -998))
            );
            let minX = Infinity;
            let minY = Infinity;
            rawStrokes.forEach(s => s.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.y < minY) minY = pt.y;
            }));
            if (minX === Infinity) minX = 0;
            if (minY === Infinity) minY = 0;

            const soloStrokes = rawStrokes.map(s => s.map(pt => ({
                x: Number((((pt.x - minX) * 0.9) + 15).toFixed(1)),
                y: Number((((pt.y - minY) * 0.9) + 15).toFixed(1)),
            })));
            if (soloStrokes.length > 0) {
                reconstructed[cp] = soloStrokes;
                continue;
            }
        }

        const blockStrokes = compileBlockStrokes(
            cleanBlock,
            activeTemplates,
            featuralComponents,
            consList,
            vowList,
            otherList,
            overrideLayout
        );
        if (blockStrokes && blockStrokes.length > 0) {
            reconstructed[cp] = blockStrokes;
        }
    }

    return reconstructed;
}

/**
 * Strips mode suffixes like `_uppercase` or `_initial` from an alphabetGlyphs / syllabaryMap key.
 */
function parseMappingKey(rawKey) {
    const idx = rawKey.indexOf('_');
    if (idx === -1) {
        return { base: rawKey, mode: 'base' };
    }
    return {
        base: rawKey.slice(0, idx),
        mode: rawKey.slice(idx + 1).toLowerCase()
    };
}

/**
 * Collects all drawable glyphs, direct key aliases, OpenType GSUB ligatures,
 * and human-readable inventory entries for a script.
 */
export function collectScriptExportData(config = {}, lexicon = [], scriptId = null, options = {}) {
    const defaultScriptId = getDefaultScriptId(config);
    const resolvedId = scriptId || defaultScriptId;
    const script = getScriptSystem(config, resolvedId);
    const scriptData = getScriptData(config, script.id);
    const scriptType = normalizeScriptType(script?.type || config?.phonologyTypes || 'alphabetic');
    const isDefaultScript = script.id === defaultScriptId;

    const includeLatinAliases = options.includeLatinAliases !== false;
    const includeUppercaseAliases = options.includeUppercaseAliases !== false;
    const includeLigatures = options.includeLigatures !== false;
    const logoTriggerMode = options.logoTriggerMode || 'colon'; // 'colon' | 'word' | 'none'
    const includeGlossLigatures = Boolean(options.includeGlossLigatures);

    // 1. Gather all drawable glyphs (script-scoped + referenced root glyphs + featural blocks)
    const glyphs = {};

    if (isDefaultScript) {
        mergeDrawableGlyphs(glyphs, config?.customGlyphs);
    }
    mergeDrawableGlyphs(glyphs, scriptData?.customGlyphs);

    // Also pull in any glyphs referenced from root customGlyphs (common in multi-script projects)
    const rootGlyphs = config?.customGlyphs || {};
    const pullReferencedFromString = (str) => {
        if (!str || typeof str !== 'string') return;
        for (const ch of str) {
            const cp = ch.codePointAt(0);
            if (cp && rootGlyphs[cp] && !glyphs[cp]) {
                glyphs[cp] = rootGlyphs[cp];
            }
        }
    };

    const alphabetGlyphs = scriptData?.alphabetGlyphs || (isDefaultScript ? config?.alphabetGlyphs : {}) || {};
    const alphabetNames = script?.alphabetNames || (isDefaultScript ? config?.alphabetNames : {}) || {};
    const syllabaryMap = scriptData?.syllabaryMap || (isDefaultScript ? config?.syllabaryMap : {}) || {};
    const numberDigitGlyphs = config?.numberSystem?.digitGlyphs || {};

    Object.values(alphabetGlyphs).forEach(pullReferencedFromString);
    Object.values(syllabaryMap).forEach(pullReferencedFromString);
    Object.values(numberDigitGlyphs).forEach(pullReferencedFromString);

    if (scriptType === 'featural_block') {
        const blockGlyphs = reconstructFeaturalBlockGlyphs(config, script, scriptData);
        mergeDrawableGlyphs(glyphs, blockGlyphs);
    }

    // Pull glyphs referenced by lexicon entries for this script
    const safeLexicon = Array.isArray(lexicon) ? lexicon : [];
    const scriptLexiconEntries = [];
    for (const entry of safeLexicon) {
        if (!entry || typeof entry !== 'object') continue;
        const entryScriptId = resolveWordScriptId(entry, config);
        const scopedForm = entry.scriptForms?.[script.id];
        const belongsToScript = entryScriptId === script.id || Boolean(scopedForm) || (isDefaultScript && Boolean(entry.ideogram));
        if (!belongsToScript) continue;

        const targetChar = scopedForm || entry.ideogram || '';
        if (targetChar) {
            pullReferencedFromString(targetChar);
            scriptLexiconEntries.push({ entry, targetChar });
        }
    }

    // 2. Build direct aliases, GSUB ligatures, and metadata records per glyph
    const aliases = [];
    const seenAliasCodes = new Set();
    const ligatures = [];
    const seenLigSequences = new Set();
    const glyphMetaByCode = new Map();

    const recordMeta = (cp, info) => {
        const existing = glyphMetaByCode.get(cp);
        if (!existing) {
            glyphMetaByCode.set(cp, { ...info });
        } else {
            if (!existing.label && info.label) existing.label = info.label;
            if (!existing.romanization && info.romanization) existing.romanization = info.romanization;
            if (!existing.ligature && info.ligature) existing.ligature = info.ligature;
            if (!existing.aliasChar && info.aliasChar) existing.aliasChar = info.aliasChar;
        }
    };

    const registerAlias = (charStr, targetCode, nameHint) => {
        if (!includeLatinAliases || !charStr) return;
        const chars = Array.from(charStr);
        if (chars.length !== 1) return;
        const aliasCode = chars[0].codePointAt(0);
        if (!aliasCode || aliasCode <= 32 || aliasCode > 0x10FFFF) return;
        if (glyphs[aliasCode] || seenAliasCodes.has(aliasCode)) return;
        if (!glyphs[targetCode]) return;

        seenAliasCodes.add(aliasCode);
        aliases.push({ unicode: aliasCode, targetCode, name: nameHint });
        recordMeta(targetCode, { aliasChar: chars[0] });
    };

    const registerLigature = (seq, targetCode) => {
        if (!includeLigatures || !seq || typeof seq !== 'string') return;
        const chars = Array.from(seq);
        if (chars.length < 2) return;
        if (!glyphs[targetCode]) return;
        if (seenLigSequences.has(seq)) return;

        seenLigSequences.add(seq);
        ligatures.push({ sequence: seq, targetCode, feature: 'liga' });
        recordMeta(targetCode, { ligature: seq });
    };

    // 2a. Process alphabetGlyphs (Alphabetic / Abjad / Abugida / general letter mappings)
    for (const [rawKey, mappedVal] of Object.entries(alphabetGlyphs)) {
        if (!mappedVal || typeof mappedVal !== 'string') continue;
        const mappedChars = Array.from(mappedVal);
        if (mappedChars.length !== 1) continue;
        const targetCode = mappedChars[0].codePointAt(0);
        if (!glyphs[targetCode]) continue;

        const { base, mode } = parseMappingKey(rawKey);
        if (!base) continue;

        const humanName = alphabetNames[base] || alphabetNames[rawKey] || rawKey;
        recordMeta(targetCode, {
            key: rawKey,
            romanization: base,
            label: mode === 'base' ? humanName : `${humanName} (${mode})`,
            category: 'alphabet'
        });

        if (mode === 'base') {
            if (Array.from(base).length === 1) {
                registerAlias(base, targetCode, `let_${base}`);
            } else {
                registerLigature(base, targetCode);
            }
        } else if (mode === 'uppercase' && includeUppercaseAliases) {
            const upper = base.toUpperCase();
            if (Array.from(upper).length === 1) {
                registerAlias(upper, targetCode, `let_${upper}_upper`);
            } else {
                registerLigature(upper, targetCode);
            }
        }
    }

    // 2b. Process syllabaryMap (Syllabic / Abugida / Featural Block)
    for (const [rawKey, mappedVal] of Object.entries(syllabaryMap)) {
        if (!mappedVal || typeof mappedVal !== 'string') continue;
        const mappedChars = Array.from(mappedVal);
        if (mappedChars.length !== 1) continue;
        const targetCode = mappedChars[0].codePointAt(0);
        if (!glyphs[targetCode]) continue;

        const { base, mode } = parseMappingKey(rawKey);
        const cleanSyl = base.includes(':') ? base.split(':')[0] : base;
        if (!cleanSyl) continue;

        recordMeta(targetCode, {
            key: rawKey,
            romanization: cleanSyl,
            label: mode === 'base' ? cleanSyl : `${cleanSyl} (${mode})`,
            category: scriptType === 'featural_block' ? 'featural_block' : 'syllabary'
        });

        if (mode === 'base') {
            if (Array.from(cleanSyl).length === 1) {
                registerAlias(cleanSyl, targetCode, `syl_${cleanSyl}`);
            } else {
                registerLigature(cleanSyl, targetCode);
            }
        } else if (mode === 'uppercase' && includeUppercaseAliases) {
            const upper = cleanSyl.toUpperCase();
            if (Array.from(upper).length === 1) {
                registerAlias(upper, targetCode, `syl_${upper}_upper`);
            } else {
                registerLigature(upper, targetCode);
            }
        }
    }

    // 2c. Process Numeral digitGlyphs (0-9)
    if (isDefaultScript) {
        for (const [digit, mappedVal] of Object.entries(numberDigitGlyphs)) {
            if (!mappedVal || typeof mappedVal !== 'string') continue;
            const mappedChars = Array.from(mappedVal);
            if (mappedChars.length !== 1) continue;
            const targetCode = mappedChars[0].codePointAt(0);
            if (!glyphs[targetCode]) continue;

            recordMeta(targetCode, {
                key: digit,
                romanization: digit,
                label: `Digit ${digit}`,
                category: 'numeral'
            });
            registerAlias(digit, targetCode, `digit_${digit}`);
        }
    }

    // 2d. Process Logographic / Lexicon entries
    for (const { entry, targetChar } of scriptLexiconEntries) {
        const chars = Array.from(targetChar);
        if (chars.length !== 1) continue;
        const targetCode = chars[0].codePointAt(0);
        if (!glyphs[targetCode]) continue;

        const cleanWord = String(entry.word || '').replace(/\*/g, '').trim();
        const gloss = String(entry.translation || '').trim();
        const label = cleanWord && gloss ? `${cleanWord} — ${gloss}` : (cleanWord || gloss || targetChar);

        recordMeta(targetCode, {
            key: cleanWord || targetChar,
            romanization: cleanWord,
            label,
            category: 'logogram'
        });

        if (includeLigatures && cleanWord) {
            if (logoTriggerMode === 'colon') {
                registerLigature(`:${cleanWord}:`, targetCode);
            } else if (logoTriggerMode === 'word') {
                if (Array.from(cleanWord).length === 1) {
                    registerAlias(cleanWord, targetCode, `logo_${cleanWord}`);
                } else {
                    registerLigature(cleanWord, targetCode);
                }
            }
        }

        if (includeLigatures && includeGlossLigatures && gloss) {
            const firstGloss = gloss.split(/[,;|/]/)[0].trim().toLowerCase().replace(/\s+/g, '_');
            if (firstGloss) {
                registerLigature(`:${firstGloss}:`, targetCode);
            }
        }
    }

    // 3. Build unified inventory list sorted by codePoint
    const glyphNames = {};
    const entries = Object.keys(glyphs)
        .map(k => Number(k))
        .sort((a, b) => a - b)
        .map(cp => {
            const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
            const meta = glyphMetaByCode.get(cp) || {};
            const sanitizedLabel = meta.romanization || meta.key || `u${cp.toString(16).toUpperCase()}`;
            glyphNames[cp] = `g_${sanitizedLabel.replace(/[^a-zA-Z0-9_.-]/g, '_')}_${cp.toString(16).toUpperCase()}`;

            return {
                codePoint: cp,
                char: String.fromCodePoint(cp),
                hex,
                key: meta.key || '',
                romanization: meta.romanization || '',
                label: meta.label || hex,
                category: meta.category || 'custom',
                aliasChar: meta.aliasChar || null,
                ligature: meta.ligature || null,
            };
        });

    const maxGlyphsPerFont = Math.max(10, Number(options.maxGlyphsPerFont) || MAX_GLYPHS_PER_FONT);
    const estimatedChunks = Math.max(1, Math.ceil(entries.length / maxGlyphsPerFont));

    return {
        script,
        scriptType,
        glyphs,
        glyphNames,
        aliases,
        ligatures,
        entries,
        stats: {
            drawnCount: entries.length,
            aliasCount: aliases.length,
            ligatureCount: ligatures.length,
            estimatedChunks,
        }
    };
}

/**
 * Splits a collected glyph inventory into OpenType-safe chunks (<65k glyphs per TTF)
 * so massive logographic scripts export without overflowing uint16 glyph indices.
 */
export function chunkGlyphExportData(exportData, maxGlyphsPerFont = MAX_GLYPHS_PER_FONT) {
    const safeLimit = Math.max(10, Number(maxGlyphsPerFont) || MAX_GLYPHS_PER_FONT);
    const allCodes = Object.keys(exportData.glyphs).map(Number).sort((a, b) => a - b);

    if (allCodes.length === 0) {
        return [];
    }

    // Reserve headroom for .notdef, space, aliases, and fallback ligature characters
    const effectiveChunkLimit = Math.max(1, safeLimit);
    const chunks = [];

    for (let i = 0; i < allCodes.length; i += effectiveChunkLimit) {
        const chunkCodes = allCodes.slice(i, i + effectiveChunkLimit);
        const codeSet = new Set(chunkCodes);

        const chunkGlyphs = {};
        const chunkNames = {};
        for (const cp of chunkCodes) {
            chunkGlyphs[cp] = exportData.glyphs[cp];
            if (exportData.glyphNames[cp]) {
                chunkNames[cp] = exportData.glyphNames[cp];
            }
        }

        const chunkAliases = exportData.aliases.filter(a => codeSet.has(a.targetCode));
        const chunkLigatures = exportData.ligatures.filter(l => codeSet.has(l.targetCode));

        const minCp = chunkCodes[0];
        const maxCp = chunkCodes[chunkCodes.length - 1];
        const unicodeRange = `U+${minCp.toString(16).toUpperCase()}-${maxCp.toString(16).toUpperCase()}`;

        chunks.push({
            partIndex: chunks.length + 1,
            glyphs: chunkGlyphs,
            glyphNames: chunkNames,
            aliases: chunkAliases,
            ligatures: chunkLigatures,
            unicodeRange,
            drawnCount: chunkCodes.length,
        });
    }

    return chunks;
}

/**
 * Generates ready-to-use CSS @font-face rules for single or multi-part exported fonts.
 */
export function buildFontFaceCss(familyName, ttfFiles = []) {
    const safeFamily = sanitizeFontFamilyName(familyName, 'ConlangFont');
    return ttfFiles.map(file => {
        const rangeLine = file.unicodeRange && ttfFiles.length > 1
            ? `\n  unicode-range: ${file.unicodeRange};`
            : '';
        return `@font-face {
  font-family: '${safeFamily}';
  src: url('./${escapeCssUrl(file.filename)}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;${rangeLine}
}`;
    }).join('\n\n');
}

/**
 * Generates a self-contained HTML specimen sheet & interactive character map
 * so users can test ligatures and copy PUA glyphs outside Conlang Engine.
 */
export function buildSpecimenHtml({ familyName, conlangName, scriptName, scriptType, ttfFiles, entries, stats }) {
    const safeFamily = escapeHtml(sanitizeFontFamilyName(familyName, 'ConlangFont'));
    const safeTitle = escapeHtml(`${conlangName || 'Conlang'} — ${scriptName || 'Custom Script'}`);
    const cssText = buildFontFaceCss(familyName, ttfFiles);

    const sampleTokens = entries
        .slice(0, 24)
        .map(e => e.ligature || e.aliasChar || e.char)
        .join(' ');

    const rowsHtml = entries.map(item => {
        const typingHint = item.ligature
            ? `<code class="copyable" data-copy="${escapeHtml(item.ligature)}" title="Click to copy ligature">${escapeHtml(item.ligature)}</code>`
            : (item.aliasChar
                ? `<code class="copyable" data-copy="${escapeHtml(item.aliasChar)}" title="Click to copy key">${escapeHtml(item.aliasChar)}</code>`
                : '<span class="muted">—</span>');
        return `<tr>
  <td class="glyph-cell custom-font copyable" data-copy="${escapeHtml(item.char)}" title="Click to copy character">${escapeHtml(item.char)}</td>
  <td><code>${escapeHtml(item.hex)}</code></td>
  <td>${escapeHtml(item.label)}</td>
  <td>${typingHint}</td>
  <td><span class="tag">${escapeHtml(item.category)}</span></td>
</tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle} — Font Specimen</title>
<style>
${cssText}

:root { color-scheme: dark light; }
body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1.25rem;
  background: #0f172a;
  color: #e2e8f0;
  line-height: 1.5;
}
.custom-font {
  font-family: '${safeFamily}', sans-serif;
  font-feature-settings: "liga" 1, "rlig" 1;
}
h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
.meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
.card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 110px;
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid #475569;
  border-radius: 8px;
  padding: 1rem;
  font-size: 2rem;
  resize: vertical;
}
.search {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.85rem;
  background: #0f172a;
  color: #f8fafc;
  border: 1px solid #475569;
  border-radius: 8px;
  margin-bottom: 1rem;
}
table { width: 100%; border-collapse: collapse; }
th, td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #334155; text-align: left; }
th { color: #94a3b8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; }
.glyph-cell { font-size: 2rem; line-height: 1.2; text-align: center; width: 72px; }
.copyable { cursor: pointer; border-radius: 4px; padding: 2px 6px; }
.copyable:hover { background: rgba(139, 92, 246, 0.2); }
.tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #334155;
  font-size: 0.75rem;
}
.muted { color: #64748b; }
code { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <div class="meta">
    Font Family: <code>${safeFamily}</code> &bull;
    Script Type: <strong>${escapeHtml(scriptType)}</strong> &bull;
    ${stats.drawnCount} glyphs &bull;
    ${stats.aliasCount} key aliases &bull;
    ${stats.ligatureCount} OpenType ligatures
  </div>

  <div class="card">
    <h2 style="margin-top:0;font-size:1.05rem;">Interactive Ligature &amp; Script Tester</h2>
    <p class="meta" style="margin-bottom:0.75rem;">Type letters, syllables, or ligature triggers below (keep the <code>.ttf</code> file(s) in the same folder as this HTML file):</p>
    <textarea class="custom-font">${escapeHtml(sampleTokens)}</textarea>
  </div>

  <div class="card">
    <h2 style="margin-top:0;font-size:1.05rem;">Character Map (Click any glyph or trigger to copy)</h2>
    <input class="search" type="search" id="filter" placeholder="Filter by label, hex code, or ligature..." />
    <table>
      <thead>
        <tr><th>Glyph</th><th>Unicode</th><th>Label / Meaning</th><th>Type Trigger</th><th>Source</th></tr>
      </thead>
      <tbody id="rows">
${rowsHtml}
      </tbody>
    </table>
  </div>

<script>
document.getElementById('filter').addEventListener('input', function(e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#rows tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
document.addEventListener('click', function(e) {
  const el = e.target.closest('.copyable');
  if (!el) return;
  const val = el.getAttribute('data-copy');
  if (val && navigator.clipboard) {
    navigator.clipboard.writeText(val);
    el.style.outline = '2px solid #8b5cf6';
    setTimeout(() => { el.style.outline = ''; }, 400);
  }
});
</script>
</body>
</html>`;
}

/**
 * Generates machine-readable JSON metadata for game engines, web apps, and pipelines.
 */
export function buildGlyphMapJson({ familyName, conlangName, scriptName, scriptType, entries, aliases, ligatures }) {
    return JSON.stringify({
        familyName,
        conlangName: conlangName || 'Conlang',
        scriptName: scriptName || 'Main Script',
        scriptType,
        generatedAt: new Date().toISOString(),
        glyphs: entries.map(e => ({
            codePoint: e.codePoint,
            hex: e.hex,
            char: e.char,
            label: e.label,
            romanization: e.romanization,
            category: e.category,
            aliasChar: e.aliasChar,
            ligature: e.ligature,
        })),
        aliases: aliases.map(a => ({
            key: String.fromCodePoint(a.unicode),
            keyCodePoint: a.unicode,
            targetCodePoint: a.targetCode,
        })),
        ligatures: ligatures.map(l => ({
            sequence: l.sequence,
            targetCodePoint: l.targetCode,
            feature: l.feature,
        })),
    }, null, 2);
}

/**
 * Compiles one or more TTF ArrayBuffers and companion documentation artifacts
 * for the selected script.
 */
export async function exportFontArtifacts(config = {}, lexicon = [], scriptId = null, options = {}) {
    const exportData = collectScriptExportData(config, lexicon, scriptId, options);
    if (exportData.entries.length === 0) {
        throw new Error('No drawn glyphs found for this script.');
    }

    const baseName = sanitizeFontFileName(
        options.fileName || options.familyName || `${config?.conlangName || 'Conlang'}_${exportData.script?.name || 'Script'}`
    );
    const familyName = sanitizeFontFamilyName(
        options.familyName || `${config?.conlangName || 'Conlang'} ${exportData.script?.name || 'Script'}`
    );

    const scriptTypo = getScriptTypographySettings(config, exportData.script.id);
    const traceWidth = options.traceWidth ?? scriptTypo.traceWidth ?? 30;
    const fontScale = options.fontScale ?? scriptTypo.customFontScale ?? 1.0;

    const consistentCharacterSize = options.consistentCharacterSize !== undefined
        ? Boolean(options.consistentCharacterSize)
        : Boolean(scriptTypo.consistentCharacterSize ?? true);
    const fixedAdvanceWidth = options.fixedAdvanceWidth !== undefined
        ? Number(options.fixedAdvanceWidth)
        : Number(scriptTypo.fixedAdvanceWidth ?? 1000);

    const chunks = chunkGlyphExportData(exportData, options.maxGlyphsPerFont);
    const ttfFiles = [];

    for (const chunk of chunks) {
        const filename = chunks.length === 1
            ? `${baseName}.ttf`
            : `${baseName}_Part${chunk.partIndex}.ttf`;

        const { font, stats } = await buildOpenTypeFont(chunk.glyphs, traceWidth, fontScale, {
            familyName,
            styleName: options.styleName || 'Regular',
            version: options.version || 'Version 1.0',
            designer: options.designer || '',
            copyright: options.copyright || `Generated by Conlang Engine`,
            description: options.description || `${exportData.scriptType} script font`,
            license: options.license || '',
            consistentCharacterSize,
            fixedAdvanceWidth,
            glyphNames: chunk.glyphNames,
            extraAliases: chunk.aliases,
            ligatures: chunk.ligatures,
            yieldEvery: options.yieldEvery ?? 5,
        });

        ttfFiles.push({
            filename,
            partIndex: chunk.partIndex,
            buffer: fixOpenTypeChecksums(font.toArrayBuffer()),
            unicodeRange: chunk.unicodeRange,
            glyphCount: stats.glyphCount,
            drawnCount: stats.drawnCount,
            aliasesApplied: stats.aliasesApplied,
            ligaturesApplied: stats.ligaturesApplied,
        });
    }

    const cssText = buildFontFaceCss(familyName, ttfFiles);
    const specimenHtml = buildSpecimenHtml({
        familyName,
        conlangName: config?.conlangName,
        scriptName: exportData.script?.name,
        scriptType: exportData.scriptType,
        ttfFiles,
        entries: exportData.entries,
        stats: exportData.stats,
    });
    const mappingJson = buildGlyphMapJson({
        familyName,
        conlangName: config?.conlangName,
        scriptName: exportData.script?.name,
        scriptType: exportData.scriptType,
        entries: exportData.entries,
        aliases: exportData.aliases,
        ligatures: exportData.ligatures,
    });

    return {
        baseName,
        familyName,
        exportData,
        ttfFiles,
        cssText,
        specimenHtml,
        mappingJson,
    };
}

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports and downloads the script font as a .ttf file (or .zip if >65k glyphs require splitting).
 */
export async function downloadFontTTF(config, lexicon, scriptId = null, options = {}) {
    const artifacts = await exportFontArtifacts(config, lexicon, scriptId, options);
    if (artifacts.ttfFiles.length === 1) {
        const file = artifacts.ttfFiles[0];
        const blob = new Blob([file.buffer], { type: 'font/ttf' });
        triggerBlobDownload(blob, file.filename);
        return { ...artifacts, downloadedFilename: file.filename, isMultiPartZip: false };
    }

    // Multiple TTF parts (>65,000 glyphs): package into a zip automatically
    return downloadFontPackZip(config, lexicon, scriptId, options, artifacts);
}

/**
 * Exports and downloads a full Font Pack (.zip) containing TTF file(s),
 * @font-face CSS, interactive HTML specimen/character map, and JSON glyph map.
 */
export async function downloadFontPackZip(config, lexicon, scriptId = null, options = {}, prebuiltArtifacts = null) {
    const artifacts = prebuiltArtifacts || await exportFontArtifacts(config, lexicon, scriptId, options);
    const zip = new JSZip();

    for (const file of artifacts.ttfFiles) {
        zip.file(file.filename, file.buffer);
    }
    zip.file('font-face.css', artifacts.cssText);
    zip.file('specimen.html', artifacts.specimenHtml);
    zip.file('glyph-map.json', artifacts.mappingJson);

    const zipFilename = `${artifacts.baseName}_FontPack.zip`;
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    triggerBlobDownload(zipBlob, zipFilename);

    return {
        ...artifacts,
        downloadedFilename: zipFilename,
        isMultiPartZip: artifacts.ttfFiles.length > 1,
    };
}
