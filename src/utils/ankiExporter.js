// src/utils/ankiExporter.js
// Exports lexicon and flashcard decks to Anki-compatible TSV (.tsv) format.
// Adheres to Anki's official tab-separated and HTML card import specifications.

import { renderWordInScript } from './scriptRendering.js';
import { transliterateText } from './transliteration.js';

/**
 * Escapes text for Anki TSV:
 * - Replaces tab characters with spaces.
 * - Converts newlines to HTML <br> tags.
 * - Strips or encodes illegal characters.
 */
export function sanitizeAnkiField(text) {
    if (text == null) return '';
    return String(text)
        .replace(/\t/g, '    ')
        .replace(/\r?\n/g, '<br>')
        .trim();
}

/**
 * Normalizes tags for Anki:
 * - Anki tags cannot contain spaces (spaces separate multiple tags).
 * - Replaces whitespace within individual tags with underscores.
 */
export function formatAnkiTags(tags = [], extraTags = []) {
    const all = [...(tags || []), ...(extraTags || [])]
        .map(t => String(t || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, ''))
        .filter(Boolean);
    
    // Deduplicate
    return [...new Set(all)].join(' ');
}

/**
 * Generates an Anki-importable TSV string from an array of lexicon entries.
 *
 * @param {Array<Object>} entries - Lexicon entries to export.
 * @param {Object} options - Export configuration.
 * @param {Object} options.config - Config store state (for scripts/conlang details).
 * @param {string} [options.direction='toEnglish'] - 'toEnglish' | 'toConlang' | 'bidirectional'.
 * @param {boolean} [options.includeIPA=true] - Include pronunciation column.
 * @param {boolean} [options.includeScript=true] - Include native script / transliteration column.
 * @param {boolean} [options.includePOS=true] - Include Part of Speech column.
 * @param {boolean} [options.includeNotes=true] - Include definitions/etymology in Notes column.
 * @param {boolean} [options.includeTags=true] - Include Anki tags column.
 * @param {string} [options.deckName='Conlang Deck'] - Deck name tag.
 * @returns {string} Complete TSV content with Anki directives.
 */
export function generateAnkiTSV(entries = [], options = {}) {
    const {
        config = {},
        direction = 'toEnglish', // 'toEnglish' | 'toConlang' | 'bidirectional'
        includeIPA = true,
        includeScript = true,
        includePOS = true,
        includeNotes = true,
        includeTags = true,
        deckName = ''
    } = options;

    if (!Array.isArray(entries) || entries.length === 0) {
        return '';
    }

    const conlangTag = deckName ? deckName.replace(/\s+/g, '_') : (config.conlangName ? config.conlangName.replace(/\s+/g, '_') : 'conlang');

    // Header directives for automatic Anki field recognition
    const lines = [
        '#separator:tab',
        '#html:true',
        '#tags column:6'
    ];

    const emitCard = (front, back, ipa, pos, scriptText, tags, notes) => {
        const fields = [
            sanitizeAnkiField(front),
            sanitizeAnkiField(back),
            includeIPA ? sanitizeAnkiField(ipa ? `/${ipa.replace(/^\/|\/$/g, '')}/` : '') : '',
            includePOS ? sanitizeAnkiField(pos) : '',
            includeScript ? sanitizeAnkiField(scriptText) : '',
            includeTags ? sanitizeAnkiField(tags) : '',
            includeNotes ? sanitizeAnkiField(notes) : ''
        ];
        return fields.join('\t');
    };

    entries.forEach(entry => {
        if (!entry || (!entry.word && !entry.conlangWord)) return;

        const rawWord = entry.word || entry.conlangWord || '';
        const safeWord = rawWord.replace(/\*/g, '');
        const translation = entry.translation || entry.englishWord || '';
        const ipa = entry.ipa || '';
        const pos = entry.wordClass || '';
        
        // Native script text
        let scriptText = '';
        if (includeScript) {
            try {
                if (entry.ideogram) {
                    scriptText = entry.ideogram;
                } else if (config) {
                    const rendered = renderWordInScript(entry, config, entries);
                    scriptText = rendered.text || transliterateText(safeWord, config, entries);
                } else {
                    scriptText = safeWord;
                }
            } catch {
                scriptText = entry.ideogram || safeWord;
            }
        }

        // Tags
        const tagsList = formatAnkiTags(entry.tags, [conlangTag, pos ? pos.toLowerCase() : '']);

        // Notes (etymology, definition, example sentence)
        const notesParts = [];
        if (entry.definition && entry.definition !== translation) {
            notesParts.push(`<b>Definition:</b> ${entry.definition}`);
        }
        if (entry.etymology) {
            notesParts.push(`<b>Etymology:</b> ${entry.etymology}`);
        }
        if (entry.exampleSentence) {
            notesParts.push(`<b>Example:</b> ${entry.exampleSentence}`);
        }
        const notes = notesParts.join('<br>');

        if (direction === 'toEnglish' || direction === 'bidirectional') {
            // Front: Conlang Word (and script) | Back: Translation
            let frontHTML = `<div class="conlang-word" style="font-weight:600;font-size:1.25em;">${safeWord}</div>`;
            if (scriptText && scriptText !== safeWord) {
                frontHTML += `<div class="conlang-script" style="font-size:1.5em;margin-top:4px;">${scriptText}</div>`;
            }

            const backHTML = `<div class="translation" style="font-size:1.15em;">${translation}</div>`;

            lines.push(emitCard(frontHTML, backHTML, ipa, pos, scriptText, tagsList, notes));
        }

        if (direction === 'toConlang' || direction === 'bidirectional') {
            // Front: Translation | Back: Conlang Word
            const frontHTML = `<div class="translation" style="font-weight:600;font-size:1.2em;">${translation}</div>`;
            
            let backHTML = `<div class="conlang-word" style="font-weight:600;font-size:1.25em;">${safeWord}</div>`;
            if (scriptText && scriptText !== safeWord) {
                backHTML += `<div class="conlang-script" style="font-size:1.5em;margin-top:4px;">${scriptText}</div>`;
            }

            lines.push(emitCard(frontHTML, backHTML, ipa, pos, scriptText, tagsList, notes));
        }
    });

    return lines.join('\n');
}

/**
 * Triggers a browser download of the generated Anki TSV.
 *
 * @param {string} tsvContent - TSV string.
 * @param {string} filename - Target filename (default: 'conlang_anki_deck.tsv').
 */
export function downloadAnkiTSV(tsvContent, filename = 'conlang_anki_deck.tsv') {
    if (!tsvContent) return false;
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.tsv') ? filename : `${filename}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
}
