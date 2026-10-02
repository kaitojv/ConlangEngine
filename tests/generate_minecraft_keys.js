/**
 * Rebuilds src/utils/minecraftExportData.js from the checked-in template plus a
 * real vanilla en_us.json.
 *
 *   node tests/generate_minecraft_keys.js en_us.json src/utils/minecraftExportData.js
 *
 * Only the MINECRAFT_KEYS array literal is replaced. The version table, the
 * pack.mcmeta builder and the lang path helpers live in the same file and are
 * maintained by hand, so the rewrite is done by splicing between the array's
 * own `export const MINECRAFT_KEYS = [` and its matching `];` rather than by
 * emitting a whole new file — overwriting the file wholesale destroys them.
 *
 * Filtering rationale: the full file has 8,123 keys, but a large share are
 * near-duplicate colour/shape variants of a handful of items. The 688
 * block.minecraft.banner.* keys alone would be a third of the list, and every
 * one is the same word with a different colour in front. Those are excluded so a
 * conlanger spends effort on real vocabulary.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const langFile = process.argv[2];
const targetFile = process.argv[3];

const raw = JSON.parse(readFileSync(langFile, 'utf8'));

/** Families of near-duplicate variants to skip, with a note for the reader. */
const NOISE_PREFIXES = [
    ['block.minecraft.banner.', 'banner pattern variants (colour handled below)'],
    ['item.minecraft.banner', 'banner colour variants'],
    ['subtitles.', 'subtitles'],
    ['music.', 'music discs'],
    ['soundCategory.', 'sound categories'],
    ['mco.', 'Minecraft Realms / mco UI'],
    ['argument.', 'command argument names'],
    ['command.', 'command descriptions'],
    ['gamerule.', 'gamerule names'],
    ['stat.', 'statistics labels'],
    ['attribute.', 'attribute names'],
    ['painting.', 'painting titles'],
    ['advancements.', 'advancement titles'],
    ['options.', 'settings screen labels'],
    ['key.', 'keybind names'],
    ['debug.', 'debug screen'],
    ['telemetry.', 'telemetry / diagnostics'],
    ['test.', 'internal test strings'],
    ['narration.', 'narrator verbose output'],
    ['structure_block.', 'structure block UI'],
    ['advMode.', 'command-block UI'],
    ['dataPack.', 'data pack UI'],
    ['pack.', 'resource/feature pack UI'],
    ['jukebox_song.', 'jukebox song descriptions'],
    ['realms.', 'Realms UI'],
    ['selectWorld.', 'world selection UI'],
    ['addServer.', 'server list editor UI'],
    ['book.', 'written book UI'],
    ['container.', 'container GUI labels'],
    ['createWorld.', 'world creation UI'],
    ['inventory.', 'inventory GUI'],
    ['sign.', 'sign editor'],
    ['blockEntity.', 'block entity GUI'],
    ['selectAdvancements.', 'advancement UI'],
    ['resourcePack.', 'resource pack prompts'],
    ['snbt.', 'internal SNBT syntax'],
    ['demo.', 'demo/help output'],
    ['upgradeWorld.', 'world upgrade wizard'],
    ['optimizeWorld.', 'world optimization wizard'],
    ['itemGroup.', 'creative tab names'],
    ['color.', 'colour picker labels'],
    ['trim_pattern.', 'armor trim pattern names'],
    ['filled_map.', 'map item UI'],
    ['selectFilter.', 'filter UI'],
    ['disconnect.', 'disconnect reasons'],
    ['menu.savedWorld', 'saved world entries'],
    ['recover_world.', 'world recovery UI'],
    ['jigsaw_block.', 'jigsaw block UI'],
    ['test_block.', 'test block'],
    ['test_instance.', 'test instance'],
    ['generator.', 'structure generator settings'],
    ['tutorial.', 'tutorial toast text'],
    ['title.', 'title/subtitle sequences'],
    ['connect.', 'Realms connection'],
    ['prefix.', 'technical name prefixes'],
    ['createWorld.', 'world creation wizard'],
];

/** Keys whose only meaning is a colour word repeated across every variant. */
const NOISE_EXACT_PREFIXES = ['selectWorld.', 'addServer.', 'book.', 'options.', 'key.'];

/**
 * Colour-variant families, e.g. block.minecraft.white_wool. Note these are
 * matched as *tokens anywhere in the name*, not as a prefix: the colour comes
 * before the noun (white_wool) for wool/bed/concrete, and after it for
 * banners and candles. A prefix test only catches the second form, which is
 * why an earlier version of this filter silently kept all 16 wools.
 */
const COLOUR_TOKENS = new Set([
    'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
    'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red',
    'black', 'silver',
]);

/**
 * Suffix nouns whose colour variants are pure filler. The colour is
 * interchangeable, so a conlanger translating "White Wool" 16 times learns
 * nothing after the first one.
 */
const COLOUR_VARIANT_NOUNS = new Set([
    'wool', 'carpet', 'concrete', 'concrete_powder', 'stained_glass',
    'stained_glass_pane', 'glazed_terracotta', 'shulker_box', 'bed',
    'candle', 'candle_cake', 'terracotta', 'dye', 'banner',
    'coral', 'tube_coral', 'brain_coral', 'bubble_coral', 'fire_coral',
    'horn_coral', 'coral_block', 'coral_fan', 'wall_banner', 'sign',
]);

function isColourVariant(key) {
    const parts = key.split('.');
    const name = parts[parts.length - 1];
    const tokens = name.split('_');
    if (!tokens.some((t) => COLOUR_TOKENS.has(t))) return false;
    // Nouns are stored as underscore phrases (stained_glass_pane), so test them
    // as substrings of the name rather than as individual tokens.
    return [...COLOUR_VARIANT_NOUNS].some((noun) => name.includes(noun));
}

function isNoise(key) {
    return NOISE_PREFIXES.some(([p]) => key.startsWith(p));
}

// Keys that are pure %s/%d format plumbing, or obviously machine-facing. A
// conlanger gets no value translating "%s has made the advancement".
const PLACEHOLDER = /%[0-9$]*[sd]/;
const TOO_LONG = 220;

/**
 * Assigns a UI category from the key's own structure. Minecraft namespaces are
 * regular, so the prefix is a reliable category signal.
 */
function categorise(key) {
    if (key.startsWith('block.')) return 'Blocks';
    if (key.startsWith('item.')) return 'Items & Tools';
    if (key.startsWith('entity.')) return 'Entities';
    if (key.startsWith('gui.') || key.startsWith('menu.') || key.startsWith('narrator.')) return 'Interface';
    if (key.startsWith('death.attack.')) return 'Combat';
    if (key.startsWith('advancements.') || key.startsWith('stat.')) return 'Progression';
    if (key.startsWith('biome.') || key.startsWith('effect.') || key.startsWith('enchantment.')) return 'World';
    if (key.startsWith('multiplayer.')) return 'Multiplayer';
    if (key.startsWith('chat.') || key.startsWith('team.')) return 'Chat';
    if (key.startsWith('commands.')) return 'Commands';
    return 'Gameplay';
}

/**
 * Command strings are the biggest single family (523). Almost all of them are
 * syntax documentation ("commands.give.f usage: /give <targets> <item>"), which
 * is reference material rather than something a player reads mid-game and a
 * conlanger has no use for. Keep only the short ones a player actually sees
 * when a command succeeds or fails.
 */
function isUsefulCommandEntry(key, value) {
    if (!key.startsWith('commands.')) return true;
    // Third level is a subcommand: commands.give.failure.itemNotFound
    const parts = key.split('.');
    if (parts.length > 3) return false;
    if (/\busage\b/i.test(value)) return false;
    if (value.length > 90) return false;
    // Success/failure messages read as sentences, not docs.
    return /(?:!|failed|cannot|unknown|incorrect|permission|wrong|success)/i.test(value);
}

const out = [];
const seen = new Set();

for (const key of Object.keys(raw)) {
    if (seen.has(key)) continue;

    const value = raw[key];
    if (typeof value !== 'string' || !value.trim()) continue;

    if (isNoise(key)) continue;
    if (isColourVariant(key)) continue;
    if (!isUsefulCommandEntry(key, value)) continue;
    // A value that is mostly a placeholder is plumbing, not vocabulary.
    if (PLACEHOLDER.test(value) && value.replace(PLACEHOLDER, '').trim().length < 3) continue;
    if (value.length > TOO_LONG) continue;
    // Skip colour-only duplicates that survive the family filters.
    if (/^(White|Orange|Magenta|Light Blue|Yellow|Lime|Pink|Gray|Light Gray|Cyan|Purple|Blue|Brown|Green|Red|Black) /.test(value)
        && key.includes('.') && !/^block\.minecraft\.[a-z_]+$/.test(key)) continue;

    seen.add(key);
    out.push({ key, english: value, category: categorise(key) });
}

out.sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key));

const counts = {};
for (const e of out) counts[e.category] = (counts[e.category] || 0) + 1;

process.stderr.write(`generated ${out.length} keys\n`);
for (const [c, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    process.stderr.write(`  ${c.padEnd(16)} ${String(n).padStart(5)}\n`);
}

const ARRAY_HEAD = 'export const MINECRAFT_KEYS = [';

/** Renders the generated array literal, grouped by category. */
function renderArray() {
    const esc = (s) => s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');

    const lines = [ARRAY_HEAD];
    let lastCat = null;
    for (const e of out) {
        if (e.category !== lastCat) {
            if (lastCat !== null) lines.push('');
            lines.push(`    // ${e.category}`);
            lastCat = e.category;
        }
        lines.push(`    { key: '${esc(e.key)}', english: '${esc(e.english)}', category: '${e.category}' },`);
    }
    lines.push('];');
    return lines.join('\n');
}

if (!targetFile) {
    console.error('usage: node tests/generate_minecraft_keys.js <en_us.json> <target.js>');
    process.exit(2);
}

const existing = readFileSync(targetFile, 'utf8');
const start = existing.indexOf(ARRAY_HEAD);
if (start === -1) {
    console.error(`could not find "${ARRAY_HEAD}" in ${targetFile}`);
    process.exit(1);
}
const endMarker = existing.indexOf('\n];', start);
if (endMarker === -1) {
    console.error(`could not find the end of MINECRAFT_KEYS in ${targetFile}`);
    process.exit(1);
}

// Everything before the array and everything after its closing bracket is
// hand-maintained and must survive untouched.
const before = existing.slice(0, start);
const after = existing.slice(endMarker + '\n];'.length);

writeFileSync(targetFile, `${before}${renderArray()}${after}`, 'utf8');
process.stderr.write(`spliced ${out.length} keys into ${targetFile}\n`);



