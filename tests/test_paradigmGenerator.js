// tests/test_paradigmGenerator.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    inferRuleDimension,
    generateFullParadigm,
    paradigmToMarkdown,
    paradigmToTSV,
    paradigmToLaTeX
} from '../src/utils/paradigmGenerator.js';

describe('Paradigm Generator', () => {
    it('infers linguistic dimensions from rule names and glosses', () => {
        assert.strictEqual(inferRuleDimension({ name: 'Accusative Case', gloss: 'ACC' }), 'Case');
        assert.strictEqual(inferRuleDimension({ name: 'Past Tense', gloss: 'PST' }), 'Tense');
        assert.strictEqual(inferRuleDimension({ name: 'Plural Number', gloss: 'PL' }), 'Number');
        assert.strictEqual(inferRuleDimension({ name: 'First Person Singular', gloss: '1SG' }), 'Person');
        assert.strictEqual(inferRuleDimension({ name: 'Unknown Rule', gloss: 'UNK' }), 'General');
        assert.strictEqual(inferRuleDimension({ dimension: 'Mood', name: 'Conditional' }), 'Mood');
    });

    it('generates a full inflection paradigm with 2D matrix', () => {
        const config = {
            grammarRules: [
                { id: 'r1', name: 'Plural', affix: '-i', gloss: 'PL', appliesTo: 'noun' },
                { id: 'r2', name: 'Accusative', affix: '-m', gloss: 'ACC', appliesTo: 'noun' }
            ],
            personRules: [],
            vowels: 'a,e,i,o,u',
            consonants: 'k,l,m,p,t,s'
        };

        const result = generateFullParadigm('kalam', config, { wordClass: 'noun' });
        assert.strictEqual(result.baseWord, 'kalam');
        assert.strictEqual(result.rows.length, 2);
        assert.strictEqual(result.rows[0].inflectedForm, 'kalami');
        assert.strictEqual(result.rows[1].inflectedForm, 'kalamm');

        // Matrix check
        assert.ok(result.matrix);
        assert.strictEqual(result.matrix.columns.length, 2);
        assert.strictEqual(result.matrix.rows.length, 1);
        assert.strictEqual(result.matrix.rows[0].cells['r1'], 'kalami');
        assert.strictEqual(result.matrix.rows[0].cells['r2'], 'kalamm');
    });

    it('exports paradigm to Markdown table', () => {
        const config = {
            grammarRules: [
                { id: 'r1', name: 'Past', affix: '-ta', gloss: 'PST', appliesTo: 'verb' }
            ]
        };
        const paradigm = generateFullParadigm('ama', config, { wordClass: 'verb' });
        const md = paradigmToMarkdown(paradigm);

        assert.ok(md.includes('| Person / Form | Past (PST) |'));
        assert.ok(md.includes('| --- | --- |'));
        assert.ok(md.includes('amata'));
    });

    it('exports paradigm to TSV', () => {
        const config = {
            grammarRules: [
                { id: 'r1', name: 'Dual', affix: '-ni', gloss: 'DU', appliesTo: 'all' }
            ]
        };
        const paradigm = generateFullParadigm('manu', config);
        const tsv = paradigmToTSV(paradigm);

        const lines = tsv.split('\n');
        assert.strictEqual(lines[0], 'Form\tDual');
        assert.strictEqual(lines[1], 'BASE\tmanuni');
    });

    it('exports paradigm to LaTeX tabular', () => {
        const config = {
            grammarRules: [
                { id: 'r1', name: 'Future', affix: 'sa-', gloss: 'FUT', appliesTo: 'verb' }
            ]
        };
        const paradigm = generateFullParadigm('kar', config, { wordClass: 'verb' });
        const latex = paradigmToLaTeX(paradigm);

        assert.ok(latex.includes('\\begin{tabular}{l c}'));
        assert.ok(latex.includes('\\textbf{Future}'));
        assert.ok(latex.includes('sakar'));
        assert.ok(latex.includes('\\end{tabular}'));
    });

    it('handles degenerate or empty inputs gracefully', () => {
        assert.strictEqual(paradigmToMarkdown(null), '');
        assert.strictEqual(paradigmToTSV(null), '');
        assert.strictEqual(paradigmToLaTeX(null), '');
        const empty = generateFullParadigm('', {});
        assert.strictEqual(empty.rows.length, 0);
    });
});
