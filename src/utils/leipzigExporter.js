// src/utils/leipzigExporter.js
// Standard Leipzig Glossing Rules (LGR) exporter supporting multiple formats:
// 1. Monospaced / Plain Text (aligned columns for Reddit, Discord, forums)
// 2. Markdown Table (for GitHub, Obsidian, Notion)
// 3. LaTeX (gb4e / leipzig syntax \gll ... \glt)
// 4. TSV (for spreadsheets and databases)

/**
 * Extracts normalized Leipzig tokens from GlosserTab's processedWords array.
 */
export function extractLeipzigTokens(processedWords) {
    if (!Array.isArray(processedWords)) return [];

    const tokens = [];

    processedWords.forEach((tokenData) => {
        if (!tokenData) return;

        // Skip purely blank whitespace tokens
        if (tokenData.isPunctuation && !tokenData.text?.trim()) return;

        if (tokenData.isPunctuation) {
            tokens.push({
                isPunctuation: true,
                original: tokenData.text,
                morphemes: tokenData.text,
                gloss: tokenData.text
            });
            return;
        }

        const original = tokenData.text || '';

        if (tokenData.parsings && tokenData.parsings.length > 0) {
            const p = tokenData.parsings[0];
            const baseWord = (p.root?.word || original).replace(/\*/g, '');
            const lexicalGloss = (p.root?.translation?.split(',')[0] || '')
                .toLowerCase()
                .trim()
                .replace(/\s*\/\s*/g, '/')
                .replace(/\s+/g, '.');

            let segmentedWord = baseWord;
            let glossParts = [lexicalGloss || '???'];

            const rules = Array.isArray(p.rules) ? p.rules.slice().reverse() : [];
            rules.forEach((r) => {
                if (!r) return;
                const cleanAffix = (r.affix || '').replace(/^-|-$/g, '');
                const tag = (r.name || 'AFF').toUpperCase();

                if (r.affix && r.affix.endsWith('-') && !r.affix.startsWith('-')) {
                    // Prefix
                    segmentedWord = `${cleanAffix}-${segmentedWord}`;
                    glossParts.unshift(tag);
                } else if (cleanAffix) {
                    // Suffix
                    segmentedWord = `${segmentedWord}-${cleanAffix}`;
                    glossParts.push(tag);
                }
            });

            tokens.push({
                isPunctuation: false,
                original,
                morphemes: segmentedWord,
                gloss: glossParts.join('-')
            });
        } else {
            // Unparsed / unknown word
            tokens.push({
                isPunctuation: false,
                original,
                morphemes: original,
                gloss: '???'
            });
        }
    });

    return tokens;
}

/**
 * Formats Leipzig tokens into an aligned monospace block.
 */
export function formatLeipzigMonospace(tokens, freeTranslation = '', includeOriginal = false) {
    if (!tokens || tokens.length === 0) return '';

    // Calculate column widths for perfect monospace alignment
    const cols = tokens.map((t) => {
        const orig = t.original || '';
        const morph = t.morphemes || '';
        const gl = t.gloss || '';
        const width = Math.max(orig.length, morph.length, gl.length, 1);
        return {
            orig: orig.padEnd(width, ' '),
            morph: morph.padEnd(width, ' '),
            gl: gl.padEnd(width, ' ')
        };
    });

    const lines = [];
    if (includeOriginal) {
        lines.push(cols.map((c) => c.orig).join('  '));
    }
    lines.push(cols.map((c) => c.morph).join('  '));
    lines.push(cols.map((c) => c.gl).join('  '));

    if (freeTranslation?.trim()) {
        lines.push(`'${freeTranslation.trim()}'`);
    }

    return lines.join('\n');
}

/**
 * Formats Leipzig tokens as a Markdown table.
 */
export function formatLeipzigMarkdown(tokens, freeTranslation = '') {
    if (!tokens || tokens.length === 0) return '';

    const headers = ['Line', ...tokens.map((_, i) => String(i + 1))];
    const dividers = headers.map(() => '---');
    const morphRow = ['**Morphemes**', ...tokens.map((t) => t.morphemes)];
    const glossRow = ['**Gloss**', ...tokens.map((t) => t.gloss)];

    const table = [
        `| ${headers.join(' | ')} |`,
        `| ${dividers.join(' | ')} |`,
        `| ${morphRow.join(' | ')} |`,
        `| ${glossRow.join(' | ')} |`
    ].join('\n');

    if (freeTranslation?.trim()) {
        return `${table}\n\n*‘${freeTranslation.trim()}’*`;
    }
    return table;
}

/**
 * Formats Leipzig tokens in LaTeX (compatible with gb4e, leipzig, or covington).
 */
export function formatLeipzigLatex(tokens, freeTranslation = '') {
    if (!tokens || tokens.length === 0) return '';

    // Escape LaTeX special characters
    const escapeLatex = (str) =>
        String(str || '')
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[{}]/g, '\\$&')
            .replace(/[_$%&#^]/g, '\\$&');

    const morphs = tokens.map((t) => escapeLatex(t.morphemes)).join(' ');
    const glosses = tokens.map((t) => escapeLatex(t.gloss)).join(' ');
    const trans = freeTranslation?.trim() ? escapeLatex(freeTranslation.trim()) : '';

    return [
        '\\begin{exe}',
        '  \\ex',
        `  \\gll ${morphs} \\\\`,
        `       ${glosses} \\\\`,
        `  \\glt \`${trans}'`,
        '\\end{exe}'
    ].join('\n');
}

/**
 * Formats Leipzig tokens into TSV (Tab-Separated Values).
 */
export function formatLeipzigTsv(tokens, freeTranslation = '') {
    if (!tokens || tokens.length === 0) return '';

    const line1 = tokens.map((t) => t.morphemes).join('\t');
    const line2 = tokens.map((t) => t.gloss).join('\t');

    const lines = [line1, line2];
    if (freeTranslation?.trim()) {
        lines.push(`'${freeTranslation.trim()}'`);
    }
    return lines.join('\n');
}

/**
 * Master exporter dispatcher.
 */
export function exportLeipzig(processedWords, freeTranslation = '', format = 'monospace', options = {}) {
    const tokens = extractLeipzigTokens(processedWords);
    if (tokens.length === 0) return '';

    switch (format) {
        case 'markdown':
            return formatLeipzigMarkdown(tokens, freeTranslation);
        case 'latex':
            return formatLeipzigLatex(tokens, freeTranslation);
        case 'tsv':
            return formatLeipzigTsv(tokens, freeTranslation);
        case 'monospace':
        default:
            return formatLeipzigMonospace(tokens, freeTranslation, options.includeOriginal ?? true);
    }
}
