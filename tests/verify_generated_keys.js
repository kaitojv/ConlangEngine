/**
 * Verifies a generated vocabulary module against the real vanilla language file.
 *
 *   node tests/verify_generated_keys.js src/utils/minecraftExportData.js en_us.json
 *
 * This is the gate that catches the three ways a generated list silently
 * corrupts an exported pack:
 *   1. a key that does not exist in the game (the pack ships dead entries),
 *   2. English text that drifted from vanilla (the conlanger is shown a lie),
 *   3. a lost %s / %1$s format argument (the game throws, or prints raw text).
 *
 * It imports the real module rather than re-parsing it, so the checked-in file
 * is what gets validated.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [, , moduleFile, langFile] = process.argv;

const lang = JSON.parse(readFileSync(langFile, 'utf8'));
const mod = await import(pathToFileURL(moduleFile).href);
const keys = mod.MINECRAFT_KEYS;

const PLACEHOLDER = /%[0-9$]*[sd]/g;
const placeholders = (s) => (String(s).match(PLACEHOLDER) || []).sort().join(',');

const seen = new Set();
const report = [];
const add = (kind, entry, detail) => report.push({ kind, key: entry.key, detail });

for (const entry of keys) {
    if (seen.has(entry.key)) add('DUPLICATE', entry);
    seen.add(entry.key);

    const vanilla = lang[entry.key];
    if (vanilla === undefined) {
        add('NOT_IN_VANILLA', entry);
        continue;
    }
    if (vanilla !== entry.english) add('TEXT_DIFF', entry, { ours: entry.english, vanilla });
    if (placeholders(vanilla) !== placeholders(entry.english)) {
        add('PLACEHOLDER_LOSS', entry, { ours: entry.english, vanilla });
    }
}

const byKind = {};
for (const r of report) byKind[r.kind] = (byKind[r.kind] || 0) + 1;

console.log(`checked ${keys.length} keys from ${moduleFile}`);
for (const [kind, n] of Object.entries(byKind)) {
    console.log(`\n${kind}: ${n}`);
    for (const r of report.filter((x) => x.kind === kind).slice(0, 8)) {
        console.log(`  ${r.key}`);
        if (r.detail) {
            console.log(`    ours:    ${JSON.stringify(r.detail.ours)}`);
            console.log(`    vanilla: ${JSON.stringify(r.detail.vanilla)}`);
        }
    }
    if (n > 8) console.log(`  ... and ${n - 8} more`);
}

if (report.length === 0) {
    console.log('\nOK: every key exists in vanilla with identical text and placeholders.');
}
process.exit(report.length === 0 ? 0 : 1);