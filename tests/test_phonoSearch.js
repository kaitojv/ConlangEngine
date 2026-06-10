// test_phonoSearch.js — run with: node test_phonoSearch.js
import { tokenizeIPA, buildInventories, createPhonoMatcher } from './src/utils/phonoSearch.js';
import { reverseDictScore } from './src/utils/reverseDictionary.js';

let pass = 0;
let fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}

const inv = buildInventories({ consonants: 'p, t, k, s, n, ch', vowels: 'a, e, i', otherPhonemes: '' });
const noInv = buildInventories({});

console.log('— tokenizeIPA —');
assert('plain word', tokenizeIPA('stan', noInv).map(t => t.base), ['s', 't', 'a', 'n']);
assert('affricate tie bar stays whole', tokenizeIPA('t͡ʃat', noInv).map(t => t.base), ['t͡ʃ', 'a', 't']);
assert('diacritics attach to full', tokenizeIPA('kʰaːn', noInv).map(t => t.full), ['kʰ', 'aː', 'n']);
assert('diacritics stripped from base', tokenizeIPA('kʰaːn', noInv).map(t => t.base), ['k', 'a', 'n']);
assert('separators + stress marks stripped', tokenizeIPA('/ˈta.na/', noInv).map(t => t.base), ['t', 'a', 'n', 'a']);
assert('user multigraph wins', tokenizeIPA('chat', inv).map(t => t.base), ['ch', 'a', 't']);

console.log('— anchors & wildcards —');
const m = (q, cfg) => createPhonoMatcher(q, cfg ?? { consonants: 'p, t, k, s, n, v, f, ch', vowels: 'a, e, i' });
assert('#st matches start', m('#st').match({ ipa: 'stan' }), true);
assert('#st rejects mid-word', m('#st').match({ ipa: 'astan' }), false);
assert('unanchored matches anywhere', m('ta').match({ ipa: 'astan' }), true);
assert('n# matches end', m('n#').match({ ipa: 'stan' }), true);
assert('n# rejects non-final', m('n#').match({ ipa: 'sant' }), false);
assert('#CVC# full shape', m('#CVC#').match({ ipa: 'tan' }), true);
assert('#CVC# rejects CVCV', m('#CVC#').match({ ipa: 'tana' }), false);
assert('star spans phonemes', m('#s*n#').match({ ipa: 'stan' }), true);

console.log('— classes & features —');
assert('VnV', m('VnV').match({ ipa: 'ana' }), true);
assert('VnV rejects an', m('VnV').match({ ipa: 'an' }), false);
assert('[nasal]V# hits', m('[nasal]V#').match({ ipa: 'tana' }), true);
assert('[nasal]V# misses', m('[nasal]V#').match({ ipa: 'tan' }), false);
assert('[+voiced,fricative] hits /v/', m('[+voiced,fricative]').match({ ipa: 'ava' }), true);
assert('[+voiced,fricative] rejects /f/', m('[+voiced,fricative]').match({ ipa: 'afa' }), false);
assert('[velar] place', m('[velar]').match({ ipa: 'aka' }), true);
assert('[-voiced] negation', m('[-voiced]').match({ ipa: 'ada' }), false);
assert('[stop] alias for plosive', m('[stop]').match({ ipa: 'ata' }), true);
assert('[close,front] vowel features', m('[close,front]').match({ ipa: 'ti' }), true);

console.log('— diacritic semantics —');
assert('plain t matches aspirated token', m('t').match({ ipa: 'tʰa' }), true);
assert('tʰ requires aspiration', m('tʰ').match({ ipa: 'tʰa' }), true);
assert('tʰ rejects plain t', m('tʰ').match({ ipa: 'ta' }), false);

console.log('— word fallback & errors —');
assert('falls back to word when no ipa', m('#CVC#').match({ word: 'chat' }), true);
assert('user multigraph = one C', m('#CV*').match({ word: 'chat' }), true);
assert('unclosed bracket → error', !!m('[nasal').error, true);
assert('unknown feature → error', !!m('[fizzbuzz]').error, true);
assert('empty entry no crash', m('t').match({}), false);

console.log('— reverseDictScore —');
assert('exact gloss = 100', reverseDictScore('run', { translation: 'run' }), 100);
assert('multi-gloss exact', reverseDictScore('sprint', { translation: 'run, sprint' }), 100);
assert('core word "to run" = 90', reverseDictScore('to run', { translation: 'running' }) >= 90, true);
assert('substring in definition = 60', reverseDictScore('water', { translation: 'lake', definition: 'large body of water' }), 60);
assert('shared theme via tags = 40', reverseDictScore('wolf', { translation: 'hound-beast', tags: ['Animals'] }), 40);
assert('shared theme via gloss = 40', reverseDictScore('wolf', { translation: 'fox' }), 40);
assert('no semantic link = 0', reverseDictScore('wolf', { translation: 'cloud' }), 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
