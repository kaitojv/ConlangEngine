// Verifies that the no-useless-escape cleanups did not change regex behaviour.
// Compares the old (escaped) and new (unescaped) character classes.
const pairs = [
    [/[\/\[\]]/g, /[/[\]]/g, ['/x/ [y] z', '[[]]', 'a/b[c]d']],
    [/[\s\-\*']/g, /[\s-*']/g, ['a b-c*d', "e'f", ' - * ']],
    [/[,\/;|]+/, /[,/;|]+/, ['a,b;c|d', '///', 'x']],
];

let failures = 0;
for (const [oldRe, newRe, samples] of pairs) {
    for (const s of samples) {
        const before = s.replace(oldRe, '');
        const after = s.replace(newRe, '');
        if (before !== after) {
            console.log(`MISMATCH ${oldRe} vs ${newRe} on ${JSON.stringify(s)}: ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
            failures++;
        }
    }
}
if (failures === 0) {
    console.log('regex equivalence verified: all pairs matched');
} else {
    console.log(`${failures} mismatches`);
    process.exit(1);
}
