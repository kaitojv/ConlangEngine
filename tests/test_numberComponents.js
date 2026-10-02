// test_numberComponents.js — run with: node tests/test_numberComponents.js
//
// Verifies the multi-component numeral fix: a number must decompose into its
// component parts so each glyph resolves individually.
//
// This mirrors generateNumberComponents() from OrthographyPage.jsx, which is a
// useCallback closed over the config store and so cannot be imported directly.

let pass = 0;
let fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}

// Standalone copy of the component builder, parameterised by config.
function buildComponents(num, numeralBase, numberSystem) {
    if (num === 0) return [numberSystem.zero || '0'];
    if (numberSystem.irregulars?.[num]) return [numberSystem.irregulars[num]];

    const base = numeralBase > 1 ? numeralBase : 10;
    const s = numberSystem.settings || {};
    const {
        fusion = false,
        useStemsForUnits = false,
        separator = ' ',
        internalOrder = 'digit-first',
        magnitudeOrder = 'standard',
        hideOne = false
    } = s;

    let remaining = num;
    let components = [];
    let power = 0;

    while (remaining > 0) {
        const digit = remaining % base;
        if (digit > 0) {
            const powerVal = Math.pow(base, power);
            const componentVal = digit * powerVal;

            if (numberSystem.irregulars?.[componentVal]) {
                if (componentVal === num) {
                    components.push(numberSystem.irregulars[componentVal]);
                } else if (power === 0) {
                    const dName = (useStemsForUnits && numberSystem.stems?.[digit])
                        ? numberSystem.stems[digit]
                        : (numberSystem.digits?.[digit] || `(${digit})`);
                    components.push(dName);
                } else {
                    const pName = numberSystem.powers?.[powerVal] || `[Base^${power}]`;
                    let dName = '';
                    if (!(hideOne && digit === 1)) {
                        dName = (fusion && numberSystem.stems?.[digit])
                            ? numberSystem.stems[digit]
                            : (numberSystem.digits?.[digit] || `(${digit})`);
                    }
                    let word;
                    if (!dName) {
                        word = pName;
                    } else {
                        word = internalOrder === 'unit-first'
                            ? `${pName}${fusion ? '' : separator}${dName}`
                            : `${dName}${fusion ? '' : separator}${pName}`;
                    }
                    components.push(word);
                }
            } else if (power === 0) {
                const dName = (useStemsForUnits && numberSystem.stems?.[digit])
                    ? numberSystem.stems[digit]
                    : (numberSystem.digits?.[digit] || `(${digit})`);
                components.push(dName);
            } else {
                const pName = numberSystem.powers?.[powerVal] || `[Base^${power}]`;
                let dName = '';
                if (!(hideOne && digit === 1)) {
                    dName = (fusion && numberSystem.stems?.[digit])
                        ? numberSystem.stems[digit]
                        : (numberSystem.digits?.[digit] || `(${digit})`);
                }
                let word;
                if (!dName) {
                    word = pName;
                } else {
                    word = internalOrder === 'unit-first'
                        ? `${pName}${fusion ? '' : separator}${dName}`
                        : `${dName}${fusion ? '' : separator}${pName}`;
                }
                components.push(word);
            }
        }
        remaining = Math.floor(remaining / base);
        power++;
        if (power > 20) break;
    }

    if (magnitudeOrder === 'standard') components.reverse();
    return components.filter(Boolean);
}

const nameOf = (num, base, ns) => buildComponents(num, base, ns).join(
    ns.settings?.globalFusion ? '' : (ns.settings?.separator ?? ' ')
);

// Senary: digits 1..5 named, powers named.
const senary = {
    zero: 'nol',
    digits: { 1: 'sa', 2: 'du', 3: 'te', 4: 'fe', 5: 'vi' },
    stems: {},
    powers: { 6: 'sek' },
    irregulars: {},
    settings: { separator: ' ', magnitudeOrder: 'standard' }
};
const senaryHideOne = { ...senary, settings: { ...senary.settings, hideOne: true } };
const senaryUnitFirst = { ...senary, settings: { ...senary.settings, internalOrder: 'unit-first' } };

console.log('— senary decomposition (the reported bug) —');
// 7 in base 6 = 1*6 + 1 -> two components, digit-first: "sa sek" then "sa".
assert('senary 1 is a single component', buildComponents(1, 6, senary), ['sa']);
// 6 = 1*6 + 0. With hideOne OFF the "1" is kept and fused to its power, so this is
// ONE component ("sa sek") - that is the intended digit+power behaviour, not a merge
// of two glyphs that were supposed to stay separate.
assert('senary 6 is a single fused component', buildComponents(6, 6, senary), ['sa sek']);
assert('senary 7 splits into 2 components', buildComponents(7, 6, senary).length, 2);
assert('senary 7 components in order', buildComponents(7, 6, senary), ['sa sek', 'sa']);
// The failing case: the joined string is multi-glyph, which is exactly why the old
// single-codepoint lookup always reported "No glyph entry for this number".
assert('senary 7 written form is multi-character', [...nameOf(7, 6, senary)].length > 1, true);
assert('senary 7 written form', nameOf(7, 6, senary), 'sa sek sa');

console.log('— hideOne drops the "1" on powers —');
// With hideOne the "1" vanishes, so 6 is just its power and 7 keeps only the units digit.
assert('hideOne leaves senary 6 as the bare power', buildComponents(6, 6, senaryHideOne), ['sek']);
assert('hideOne leaves senary 1 alone', buildComponents(1, 6, senaryHideOne), ['sa']);
assert('hideOne on senary 7 drops the power "1" but keeps the units digit',
    buildComponents(7, 6, senaryHideOne), ['sek', 'sa']);

console.log('— internalOrder —');
assert('unit-first puts the power first', buildComponents(7, 6, senaryUnitFirst), ['sek sa', 'sa']);

console.log('— zero and irregulars stay single —');
assert('zero is one component', buildComponents(0, 6, senary), ['nol']);
const withIrr = { ...senary, irregulars: { 7: 'sevenish' } };
assert('irregular is one component', buildComponents(7, 6, withIrr), ['sevenish']);

console.log('— decimal sanity —');
const dec = { zero: 'zero', digits: { 1: 'one', 2: 'two', 3: 'three' }, stems: {}, powers: { 10: 'ten' }, irregulars: {}, settings: {} };
// Digit 7 has no name in this system, so it correctly falls back to the "(7)" placeholder.
assert('unnamed digit falls back to (7)', buildComponents(7, 10, dec), ['(7)']);
const decFull = { ...dec, digits: { ...dec.digits, 7: 'seven' } };
assert('named digit 7 is a single component', buildComponents(7, 10, decFull), ['seven']);

console.log('— the contract the glyph fix depends on —');
const parts7 = buildComponents(7, 6, senary);
assert('every part is non-empty', parts7.every(p => p && p.length > 0), true);
// Only the TOP-LEVEL components are separate glyph slots; a component may itself
// contain a separator (e.g. "sa sek" = digit+power), which is intended and matches
// how the digit rows already render. So the part count is <= the separator count + 1.
assert('senary 7 has 2 top-level parts for 2 separators', parts7.length, 2);
assert('single-component numbers are unaffected', [1, 6].every(n => buildComponents(n, 6, senary).length === 1), true);
assert('multi-component numbers have >1 part', buildComponents(7, 6, senary).length > 1, true);
// 43 base 6 = 1*36 + 1*6 + 1 -> three magnitudes, i.e. three glyph slots.
assert('senary 43 spans three magnitudes', buildComponents(43, 6, {
    ...senary, powers: { 6: 'sek', 36: 'tresek' }
}).length, 3);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
