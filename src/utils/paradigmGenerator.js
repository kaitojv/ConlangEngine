// src/utils/paradigmGenerator.js
// Inflection Paradigm & Conjugation Table Generator from grammar rules.
// Produces 2D matrices (e.g., Case x Number, Tense x Person) and 1D paradigm tables.
// Supports export to Markdown, TSV, LaTeX, and Plaintext.

import { applyRuleToWord, getPersonRules, expandWildcardDependencies } from './morphologyEngine.js';

/**
 * Standard grammatical dimension keywords for automatic categorization.
 */
const DIMENSION_PATTERNS = {
    case: /\b(nominative|accusative|genitive|dative|locative|instrumental|ablative|ergative|absolutive|vocative|allative|inessive|elative|adessive|case)\b/i,
    person: /\b(1st|2nd|3rd|first|second|third|1sg|2sg|3sg|1pl|2pl|3pl|person)\b/i,
    number: /\b(singular|plural|dual|trial|paucal|collective|num)\b/i,
    tense: /\b(present|past|future|preterite|imperfect|pluperfect|tense)\b/i,
    aspect: /\b(perfective|imperfective|progressive|habitual|iterative|aspect)\b/i,
    mood: /\b(indicative|subjunctive|optative|imperative|conditional|potential|mood)\b/i,
    voice: /\b(active|passive|middle|reflexive|causative|reciprocal|voice)\b/i,
    degree: /\b(positive|comparative|superlative|degree)\b/i,
};


/**
 * Infers a linguistic dimension for a grammar rule if none is explicitly set.
 */
export function inferRuleDimension(rule) {
    if (!rule) return 'General';
    if (rule.dimension) return rule.dimension;
    if (rule.category && rule.category !== 'General') return rule.category;

    const textToMatch = `${rule.name || ''} ${rule.gloss || ''} ${rule.description || ''}`.toLowerCase();
    
    for (const [dimension, regex] of Object.entries(DIMENSION_PATTERNS)) {
        if (regex.test(textToMatch)) {
            return dimension.charAt(0).toUpperCase() + dimension.slice(1);
        }
    }

    return 'General';
}

/**
 * Generates an inflection paradigm for a base word.
 *
 * @param {string} baseWord - The lemma or root word.
 * @param {Object} config - Conlang configuration state.
 * @param {Object} [options={}] - Options for paradigm generation.
 * @param {string} [options.wordClass='all'] - Target part of speech (noun, verb, etc.).
 * @param {string} [options.conjugationMode='affix'] - 'affix' | 'free'.
 * @returns {Object} Structured paradigm data with rows and dimensions.
 */
export function generateFullParadigm(baseWord, config = {}, options = {}) {
    const {
        grammarRules = [],
        vowels = '',
        consonants = '',
        otherPhonemes = '',
        syntaxOrder = 'SVO',
        personRules: rawPersonRules = []
    } = config;

    const {
        wordClass = 'all',
        conjugationMode = 'affix'
    } = options;

    const cleanBase = String(baseWord || '').trim().replace(/\*/g, '');
    if (!cleanBase) {
        return { baseWord: '', rows: [], dimensions: [], matrix: null };
    }

    // Filter rules applicable to word class
    const targetClasses = (wordClass || 'all').split(',').map(c => c.trim().toLowerCase());
    let applicableRules = grammarRules.filter(rule => {
        const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
        return ruleClasses.includes('all') || targetClasses.some(tc => ruleClasses.includes(tc));
    });

    applicableRules = expandWildcardDependencies(applicableRules, grammarRules);

    // Group rules by inferred or explicit dimension
    const dimensionMap = new Map();
    applicableRules.forEach(rule => {
        const dim = inferRuleDimension(rule);
        if (!dimensionMap.has(dim)) {
            dimensionMap.set(dim, []);
        }
        dimensionMap.get(dim).push(rule);
    });

    // Person rules
    const parsedPersonRules = getPersonRules(rawPersonRules);
    const applicablePersons = parsedPersonRules.filter(p => {
        const applies = (p.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
        return applies.includes('all') || targetClasses.some(tc => applies.includes(tc));
    });

    const hasPersons = applicablePersons.length > 0;
    const personList = hasPersons 
        ? [{ name: 'BASE', affix: '', freeForm: '' }, ...applicablePersons] 
        : [{ name: 'BASE', affix: '', freeForm: '' }];

    // Flat rows
    const rows = [];

    applicableRules.forEach(rule => {
        personList.forEach(person => {
            if (rule.standalone && person.name !== 'BASE') return;

            let inflected = applyRuleToWord(cleanBase, rule, grammarRules, vowels, consonants, otherPhonemes);
            
            // Apply person inflection if not base
            if (inflected && !rule.standalone && person.name !== 'BASE') {
                const useFree = (conjugationMode === 'free' && person.freeForm) || (!person.affix && person.freeForm);
                const useAffix = (conjugationMode === 'affix' && person.affix) || (!person.freeForm && person.affix);

                if (useFree) {
                    const sIndex = syntaxOrder.toUpperCase().indexOf('S');
                    const vIndex = syntaxOrder.toUpperCase().indexOf('V');
                    if (vIndex !== -1 && sIndex !== -1 && vIndex < sIndex) {
                        inflected = `${inflected} ${person.freeForm}`;
                    } else {
                        inflected = `${person.freeForm} ${inflected}`;
                    }
                } else if (useAffix) {
                    inflected = applyRuleToWord(inflected, person, grammarRules, vowels, consonants, otherPhonemes);
                }
            }

            rows.push({
                ruleId: rule.id,
                ruleName: rule.name || 'Unnamed Rule',
                dimension: inferRuleDimension(rule),
                gloss: [rule.gloss, person.name !== 'BASE' ? person.name : ''].filter(Boolean).join('.'),
                affix: rule.affix || '',
                person: person.name,
                baseWord: cleanBase,
                inflectedForm: inflected || cleanBase,
                isModified: Boolean(inflected && inflected !== cleanBase),
                isStandalone: Boolean(rule.standalone)
            });
        });
    });

    // 2D Matrix (Columns: Rules, Rows: Persons or Dimension values)
    const columns = applicableRules.map(r => ({
        id: r.id,
        name: r.name || 'Rule',
        gloss: r.gloss || '',
        dimension: inferRuleDimension(r)
    }));

    const matrixRows = personList.map(person => {
        const cells = {};
        applicableRules.forEach(rule => {
            const rowMatch = rows.find(r => r.ruleId === rule.id && r.person === person.name);
            cells[rule.id] = rowMatch ? rowMatch.inflectedForm : (rule.standalone && person.name !== 'BASE' ? '—' : cleanBase);
        });
        return {
            rowLabel: person.name,
            cells
        };
    });

    return {
        baseWord: cleanBase,
        wordClass,
        dimensions: Array.from(dimensionMap.keys()),
        rows,
        matrix: {
            columns,
            rows: matrixRows
        }
    };
}

/**
 * Formats a paradigm 2D matrix or flat table as a GitHub-flavored Markdown table.
 */
export function paradigmToMarkdown(paradigmData) {
    if (!paradigmData || !paradigmData.matrix || paradigmData.matrix.columns.length === 0) {
        return '';
    }

    const { baseWord, wordClass, matrix } = paradigmData;
    const { columns, rows } = matrix;

    const lines = [];
    lines.push(`### Inflection Paradigm for *${baseWord}* (${wordClass || 'all'})`);
    lines.push('');

    // Header row
    const headers = ['Person / Form', ...columns.map(c => c.name + (c.gloss ? ` (${c.gloss})` : ''))];
    lines.push(`| ${headers.join(' | ')} |`);

    // Divider row
    const dividers = headers.map(() => '---');
    lines.push(`| ${dividers.join(' | ')} |`);

    // Data rows
    rows.forEach(r => {
        const rowCells = [
            `**${r.rowLabel}**`,
            ...columns.map(col => r.cells[col.id] || '—')
        ];
        lines.push(`| ${rowCells.join(' | ')} |`);
    });

    return lines.join('\n');
}

/**
 * Formats a paradigm 2D matrix as Tab-Separated Values (TSV).
 */
export function paradigmToTSV(paradigmData) {
    if (!paradigmData || !paradigmData.matrix || paradigmData.matrix.columns.length === 0) {
        return '';
    }

    const { matrix } = paradigmData;
    const { columns, rows } = matrix;

    const lines = [];
    const headers = ['Form', ...columns.map(c => c.name)];
    lines.push(headers.join('\t'));

    rows.forEach(r => {
        const rowCells = [
            r.rowLabel,
            ...columns.map(col => r.cells[col.id] || '—')
        ];
        lines.push(rowCells.join('\t'));
    });

    return lines.join('\n');
}

/**
 * Formats a paradigm table as LaTeX booktabs tabular environment.
 */
export function paradigmToLaTeX(paradigmData) {
    if (!paradigmData || !paradigmData.matrix || paradigmData.matrix.columns.length === 0) {
        return '';
    }

    const { baseWord, matrix } = paradigmData;
    const { columns, rows } = matrix;

    const colAlignment = `l ${'c '.repeat(columns.length)}`.trim();
    const lines = [
        `% Paradigm for ${baseWord}`,
        `\\begin{table}[h]`,
        `\\centering`,
        `\\begin{tabular}{${colAlignment}}`,
        `\\toprule`,
        `Form & ${columns.map(c => `\\textbf{${c.name}}`).join(' & ')} \\\\`,
        `\\midrule`
    ];

    rows.forEach(r => {
        const cells = [
            `\\textbf{${r.rowLabel}}`,
            ...columns.map(col => r.cells[col.id] || '---')
        ];
        lines.push(`${cells.join(' & ')} \\\\`);
    });

    lines.push(`\\bottomrule`);
    lines.push(`\\end{tabular}`);
    lines.push(`\\caption{Inflection paradigm for ${baseWord}}`);
    lines.push(`\\end{table}`);

    return lines.join('\n');
}
