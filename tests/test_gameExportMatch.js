// test_gameExportMatch.js — run with: node tests/test_gameExportMatch.js
// Guards the two behaviours that made the Minecraft/Terraria exports produce
// valid-looking but wrong packages: the pack.mcmeta format, and the Terraria
// key namespace. Also pins the lexicon matcher, whose old substring fallback
// matched "iron" inside "Iron Sword" and silently dropped "sword".
import {
    autoMatchAll,
    autoMatchLexicon,
    findLexiconMatches,
    glossCandidates,
    searchLexicon,
} from '../src/utils/gameExportMatch.js';
import {
    MINECRAFT_KEYS,
    MINECRAFT_VERSIONS,
    buildPackMcmeta,
    getMinecraftVersion,
    minecraftLangPath,
} from '../src/utils/minecraftExportData.js';
import {
    TERRARIA_KEYS,
    buildBuildTxt,
    buildTerrariaHjson,
    setNestedValue,
    terrariaKeyPath,
} from '../src/utils/terrariaExportData.js';

let pass = 0, fail = 0;
function assert(label, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✓ ${label}`); }
    else { fail++; console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`); }
}
const assertTrue = (label, cond) => assert(label, !!cond, true);

// A lexicon shaped like real Conlang Engine data: glosses carry alternatives,
// parenthetical notes and reconstruction marks.
const LEX = [
    { word: 'Tin',   translation: 'tin' },
    { word: 'Sorn',  translation: 'iron' },
    { word: 'Keth',  translation: 'sword' },
    { word: 'Vel',   translation: 'see, observe' },
    { word: 'Norn',  translation: 'and, related (4 4 14)' },
    { word: 'Gril',  translation: 'big*' },
    { word: 'Duq',   translation: 'diamond' },
];

console.log('— glosses split into their alternatives —');
assert('a plain gloss is one candidate', glossCandidates('iron'), ['iron']);
assert('comma alternatives all count', glossCandidates('see, observe'), ['see', 'observe']);
assert('a parenthetical note is dropped', glossCandidates('and, related (4 4 14)'), ['and', 'related']);
assert('reconstruction marks are stripped', glossCandidates('big*'), ['big']);
assert('an empty gloss yields nothing', glossCandidates(''), []);
assert('a missing gloss is safe', glossCandidates(undefined), []);

console.log('— matching is exact, never a substring —');
assert('an exact gloss matches', autoMatchLexicon('iron', LEX), 'Sorn');
// The bug: "iron" is contained in "Iron Sword", so the old fallback returned
// the word for *iron* and dropped "sword" entirely.
assert('a substring of the term does NOT match', autoMatchLexicon('Iron Sword', LEX), '');
assert('"sword" alone still matches', autoMatchLexicon('sword', LEX), 'Keth');
assert('case and padding are forgiven', autoMatchLexicon('  IRON  ', LEX), 'Sorn');

console.log('— messy glosses still resolve —');
assert('a comma gloss resolves by its second half', autoMatchLexicon('observe', LEX), 'Vel');
assert('a gloss with a note resolves', autoMatchLexicon('related', LEX), 'Norn');
assert('a marked gloss resolves', autoMatchLexicon('big', LEX), 'Gril');

console.log('— conflicts and edge cases —');
assert('a term with no gloss is missing', autoMatchLexicon('Ender Pearl', LEX), '');
assert('an empty lexicon is safe', autoMatchLexicon('iron', []), '');
assert('a non-array lexicon is safe', autoMatchLexicon('iron', null), '');
assert('entries without a word are skipped', autoMatchLexicon('iron', [{ translation: 'iron' }]), '');
assert('every conflicting match is reported', findLexiconMatches('iron', [
    { word: 'A', translation: 'iron' },
    { word: 'B', translation: 'iron' },
]).length, 2);
assert('a real conflict resolves to nothing', autoMatchLexicon('iron', [
    { word: 'A', translation: 'iron' },
    { word: 'B', translation: 'iron' },
]), '');
assert('duplicate words are still confident', autoMatchLexicon('iron', [
    { word: 'A', translation: 'iron' },
    { word: 'A', translation: 'iron' },
]), 'A');

console.log('— the manual picker can still fill a gap —');
assert('no confident answer is offered for a gap', searchLexicon('Iron Sword', LEX).length, 0);
assert('searching "sword" offers its word', searchLexicon('sword', LEX).map((f) => f.word), ['Keth']);
assert('exact hits sort before partials', searchLexicon('iron', LEX)[0].label, 'iron');
assert('a partial needs every word present', searchLexicon('iron sword', LEX).length, 0);
assert('searching an empty lexicon is safe', searchLexicon('iron', []), []);

console.log('— the indexed bulk path agrees with the linear one —');
// autoMatchAll exists purely for speed. If it disagrees with
// autoMatchLexicon, pre-filled translations would silently change meaning.
const TERMS = [
    { key: 'k1', english: 'Iron Sword' },
    { key: 'k2', english: 'Stone' },
    { key: 'k3', english: 'Diamond' },
    { key: 'k4', english: 'Ender Pearl' },
    { key: 'k5', english: 'Diamond' },   // duplicate term, distinct key
];
const bulk = autoMatchAll(TERMS, LEX);
const linear = Object.fromEntries(TERMS.map((t) => [t.key, autoMatchLexicon(t.english, LEX)]));
assert('the indexed result matches the linear result', bulk, linear);
assert('an alternative gloss resolves via the index', autoMatchAll([{ key: 'a', english: 'observe' }], LEX).a, 'Vel');
assert('a missing term is empty via the index', autoMatchAll([{ key: 'a', english: 'Netherite Ingot' }], LEX).a, '');
assert('an ambiguous gloss is still refused via the index',
    autoMatchAll([{ key: 'a', english: 'iron' }],
        [{ word: 'A', translation: 'iron' }, { word: 'B', translation: 'iron' }]).a, '');
assert('an empty lexicon is safe in bulk', autoMatchAll(TERMS, []).k2, '');
assert('a non-array lexicon is safe in bulk', autoMatchAll(TERMS, null).k2, '');
assertTrue('every requested key gets an entry', TERMS.every((t) => t.key in bulk));

console.log('— the generated vocabularies are well-formed —');
assert('no duplicate Minecraft keys', new Set(MINECRAFT_KEYS.map((k) => k.key)).size, MINECRAFT_KEYS.length);
assert('no duplicate Terraria keys', new Set(TERRARIA_KEYS.map((k) => k.key)).size, TERRARIA_KEYS.length);
assertTrue('every Minecraft key has a category', MINECRAFT_KEYS.every((k) => typeof k.category === 'string' && k.category.length > 0));
assertTrue('every Minecraft key has English text', MINECRAFT_KEYS.every((k) => typeof k.english === 'string' && k.english.trim().length > 0));

console.log('— pack.mcmeta follows the version era —');
// Verified against Mojang's version data (misode/mcmeta): 1.21.9 is format 69
// and is where pack_format gave way to min_format/max_format.
assert('26.3 is the default target', getMinecraftVersion(undefined).id, '26.3');
assert('26.3 is format 97.1', [getMinecraftVersion('26.3').format, getMinecraftVersion('26.3').minor], [97, 1]);
assert('1.21.9 is format 69', getMinecraftVersion('1.21.9').format, 69);
assert('1.20.2 is format 18', getMinecraftVersion('1.20.2').format, 18);
assert('an unknown version falls back', getMinecraftVersion('nope').id, '26.3');
assert('every version id is unique', new Set(MINECRAFT_VERSIONS.map((v) => v.id)).size, MINECRAFT_VERSIONS.length);
assertTrue('the table is ordered newest first',
    MINECRAFT_VERSIONS.every((v, i) => i === 0 || MINECRAFT_VERSIONS[i - 1].format >= v.format));

const base = { langName: 'Elvish', langCode: 'art_elve', regionName: 'Valinor', bidirectional: false };
const newEra = buildPackMcmeta({ ...base, versionId: '26.3' });
// The array shape is load-bearing: bare numbers here make the pack fail.
assert('26.3 writes min_format as an array', newEra.pack.min_format, [97, 1]);
assert('26.3 writes max_format as an array', newEra.pack.max_format, [97, 1]);
assert('26.3 no longer writes pack_format', 'pack_format' in newEra.pack, false);
assert('1.21.9 also uses the array era', buildPackMcmeta({ ...base, versionId: '1.21.9' }).pack.min_format, [69, 0]);
assert('1.21.8 falls back to pack_format', buildPackMcmeta({ ...base, versionId: '1.21.7' }).pack.pack_format, 64);
assert('1.20.2 writes pack_format 18', buildPackMcmeta({ ...base, versionId: '1.20.2' }).pack.pack_format, 18);
assert('a legacy pack writes no min_format', 'min_format' in buildPackMcmeta({ ...base, versionId: '1.20.2' }).pack, false);
assert('the language block is carried through', newEra.language.art_elve, { name: 'Elvish', region: 'Valinor', bidirectional: false });
assert('RTL is recorded as a boolean', buildPackMcmeta({ ...base, bidirectional: true }).language.art_elve.bidirectional, true);
assert('the language file sits under assets/minecraft/lang', minecraftLangPath('art_elve'), 'assets/minecraft/lang/art_elve.json');

console.log('— Terraria keys are NOT namespaced under the mod —');
assert('a vanilla key goes at the root', terrariaKeyPath('Items.IronSword.DisplayName'), 'Terraria.Items.IronSword.DisplayName');
const hjson = buildTerrariaHjson(
    { 'Items.IronSword.DisplayName': 'Keth', 'NPCs.Guide.DisplayName': 'Vor' },
    { modName: 'ElvishMod', gameVersion: '1.4.5' }
);
assertTrue('nothing is nested under Mods', !hjson.includes('Mods:'));
assertTrue('no mod-scoped key is emitted', !hjson.includes('Mods.ElvishMod'));
assertTrue('the Terraria prefix is present', hjson.includes('Terraria:'));
assertTrue('the item override is written', hjson.includes('IronSword'));
assertTrue('the chosen game version is recorded', hjson.includes('1.4.5'));
assertTrue('an untranslated key is omitted entirely', !hjson.includes('GoldenSword'));
assertTrue('a blank value is omitted, not blanked', !buildTerrariaHjson(
    { 'Items.IronSword.DisplayName': '   ' }, { modName: 'M', gameVersion: '1.4.4' }
).includes('IronSword'));
assertTrue('every curated key is a vanilla-style path', TERRARIA_KEYS.every((k) => !k.key.startsWith('Mods')));

console.log('— the exported mod is actually buildable —');
const buildTxt = buildBuildTxt({ displayName: 'Elvish', author: 'A', modVersion: '1.0.0', homepage: 'https://tmodloader.net/' });
assertTrue('build.txt names the mod', buildTxt.includes('displayName = Elvish'));
assertTrue('build.txt has the semantic version', buildTxt.includes('version = 1.0.0'));
assert('the placeholder github homepage is gone', buildTxt.includes('https://github.com/'), false);
const nested = {};
setNestedValue(nested, 'Terraria.Items.Iron.DisplayName', 'X');
assert('a nested path builds nested objects', nested, { Terraria: { Items: { Iron: { DisplayName: 'X' } } } });

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);

