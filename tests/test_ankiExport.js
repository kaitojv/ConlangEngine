// tests/test_ankiExport.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeAnkiField, formatAnkiTags, generateAnkiTSV } from '../src/utils/ankiExporter.js';

describe('Anki Exporter', () => {
    it('sanitizes tab characters and newlines', () => {
        const input = 'hello\tworld\nsecond line\r\nthird line';
        const output = sanitizeAnkiField(input);
        assert.ok(!output.includes('\t'), 'tabs should be replaced');
        assert.ok(!output.includes('\n'), 'newlines should be converted to <br>');
        assert.ok(output.includes('<br>'), 'contains <br>');
    });

    it('formats tags removing spaces and illegal characters', () => {
        const tags = ['noun phrase', 'core vocab!', 'verb'];
        const extra = ['My Conlang'];
        const formatted = formatAnkiTags(tags, extra);
        assert.strictEqual(formatted, 'noun_phrase core_vocab verb My_Conlang');
    });

    it('generates Anki TSV with directives and header', () => {
        const entries = [
            {
                word: 'kalam',
                translation: 'pen',
                ipa: 'ka.lam',
                wordClass: 'Noun',
                tags: ['tools', 'writing']
            }
        ];

        const tsv = generateAnkiTSV(entries, { conlangName: 'TestLang' });
        const lines = tsv.split('\n');

        assert.strictEqual(lines[0], '#separator:tab');
        assert.strictEqual(lines[1], '#html:true');
        assert.strictEqual(lines[2], '#tags column:6');
        
        // Data row
        const dataRow = lines[3];
        assert.ok(dataRow, 'Has data row');
        const cols = dataRow.split('\t');
        assert.strictEqual(cols.length, 7, 'Should have 7 columns');
        assert.ok(cols[0].includes('kalam'), 'Front has word');
        assert.ok(cols[1].includes('pen'), 'Back has translation');
        assert.strictEqual(cols[2], '/ka.lam/', 'IPA formatted with slashes');
        assert.strictEqual(cols[3], 'Noun', 'POS is Noun');
        assert.ok(cols[5].includes('tools'), 'Tags include tools');
    });

    it('handles bidirectional export generating 2 cards per entry', () => {
        const entries = [
            { word: 'sol', translation: 'sun', ipa: 'sol', wordClass: 'Noun' },
            { word: 'luna', translation: 'moon', ipa: 'lu.na', wordClass: 'Noun' }
        ];

        const tsv = generateAnkiTSV(entries, { direction: 'bidirectional' });
        const lines = tsv.split('\n');
        // 3 directive lines + 4 cards (2 per entry)
        assert.strictEqual(lines.length, 7);
    });

    it('handles empty or malformed inputs without crashing', () => {
        assert.strictEqual(generateAnkiTSV([]), '');
        assert.strictEqual(generateAnkiTSV(null), '');
        assert.strictEqual(generateAnkiTSV([{}]), '#separator:tab\n#html:true\n#tags column:6');
    });
});
