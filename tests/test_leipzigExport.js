// tests/test_leipzigExport.js
import { extractLeipzigTokens, formatLeipzigMonospace, formatLeipzigMarkdown, formatLeipzigLatex, formatLeipzigTsv, exportLeipzig } from '../src/utils/leipzigExporter.js';

let pass = 0;
let fail = 0;

function assert(label, actual, expected) {
    const ok = actual === expected;
    if (ok) {
        pass++;
        console.log(`  ✓ ${label}`);
    } else {
        fail++;
        console.log(`  ✗ ${label}\n      expected:\n${JSON.stringify(expected)}\n      actual:\n${JSON.stringify(actual)}`);
    }
}

const mockProcessedWords = [
    {
        isPunctuation: false,
        text: 'tamari',
        parsings: [
            {
                root: { word: 'tamar', translation: 'child' },
                rules: [{ name: 'pl', affix: '-i' }]
            }
        ]
    },
    {
        isPunctuation: false,
        text: 'kono',
        parsings: [
            {
                root: { word: 'ko', translation: 'eat' },
                rules: [{ name: 'pst', affix: '-no' }]
            }
        ]
    },
    {
        isPunctuation: true,
        text: '.'
    }
];

console.log('--- test_leipzigExport.js ---');

const tokens = extractLeipzigTokens(mockProcessedWords);
assert('extracted 3 tokens', tokens.length, 3);
assert('first token morphemes', tokens[0].morphemes, 'tamar-i');
assert('first token gloss', tokens[0].gloss, 'child-PL');
assert('second token morphemes', tokens[1].morphemes, 'ko-no');
assert('second token gloss', tokens[1].gloss, 'eat-PST');

const mono = formatLeipzigMonospace(tokens, 'The children ate.', false);
assert('monospace contains morphemes line', mono.includes('tamar-i   ko-no    .'), true);
assert('monospace contains gloss line', mono.includes('child-PL  eat-PST  .'), true);
assert('monospace contains translation', mono.includes("'The children ate.'"), true);

const md = formatLeipzigMarkdown(tokens, 'The children ate.');
assert('markdown contains table headers', md.includes('| Line | 1 | 2 | 3 |'), true);
assert('markdown contains morpheme row', md.includes('| **Morphemes** | tamar-i | ko-no | . |'), true);
assert('markdown contains free translation italic', md.includes('*‘The children ate.’*'), true);

const latex = formatLeipzigLatex(tokens, 'The children ate.');
assert('latex has exe environment', latex.includes('\\begin{exe}'), true);
assert('latex has gll line', latex.includes('\\gll tamar-i ko-no . \\\\'), true);
assert('latex has gloss line', latex.includes('child-PL eat-PST . \\\\'), true);

const tsv = formatLeipzigTsv(tokens, 'The children ate.');
assert('tsv has tab separation', tsv.includes('tamar-i\tko-no\t.'), true);

const exportedMono = exportLeipzig(mockProcessedWords, 'The children ate.', 'monospace', { includeOriginal: false });
assert('exportLeipzig dispatch works', exportedMono, mono);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
