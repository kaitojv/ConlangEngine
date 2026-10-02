// terrariaExportData.js — the pure data and format logic behind the Terraria
// exporter. Kept out of the .jsx so node can import it directly in tests.
export const TERRARIA_KEYS = [
    // --- Items ---
    { key: 'Items.IronSword.DisplayName',       english: 'Iron Sword',          category: 'Items' },
    { key: 'Items.GoldenSword.DisplayName',     english: 'Golden Sword',        category: 'Items' },
    { key: 'Items.WoodenBow.DisplayName',       english: 'Wooden Bow',          category: 'Items' },
    { key: 'Items.MagicWand.DisplayName',       english: 'Magic Wand',          category: 'Items' },
    { key: 'Items.HealthPotion.DisplayName',    english: 'Health Potion',       category: 'Items' },
    { key: 'Items.ManaPotion.DisplayName',      english: 'Mana Potion',         category: 'Items' },
    { key: 'Items.Torch.DisplayName',           english: 'Torch',               category: 'Items' },
    { key: 'Items.Rope.DisplayName',            english: 'Rope',                category: 'Items' },
    { key: 'Items.Pickaxe.DisplayName',         english: 'Pickaxe',             category: 'Items' },
    { key: 'Items.Axe.DisplayName',             english: 'Axe',                 category: 'Items' },
    { key: 'Items.Hammer.DisplayName',          english: 'Hammer',              category: 'Items' },
    { key: 'Items.Grapple.DisplayName',         english: 'Grappling Hook',      category: 'Items' },
    { key: 'Items.Shield.DisplayName',          english: 'Shield',              category: 'Items' },
    { key: 'Items.Helmet.DisplayName',          english: 'Helmet',              category: 'Items' },
    { key: 'Items.Chestplate.DisplayName',      english: 'Chestplate',          category: 'Items' },
    { key: 'Items.Greaves.DisplayName',         english: 'Greaves',             category: 'Items' },
    { key: 'Items.WoodenArrow.DisplayName',     english: 'Wooden Arrow',        category: 'Items' },
    { key: 'Items.Bomb.DisplayName',            english: 'Bomb',                category: 'Items' },
    { key: 'Items.Coin.DisplayName',            english: 'Coin',                category: 'Items' },
    { key: 'Items.GemRuby.DisplayName',         english: 'Ruby',                category: 'Items' },
    { key: 'Items.GemSapphire.DisplayName',     english: 'Sapphire',            category: 'Items' },
    { key: 'Items.GemEmerald.DisplayName',      english: 'Emerald',             category: 'Items' },
    { key: 'Items.GemDiamond.DisplayName',      english: 'Diamond',             category: 'Items' },
    { key: 'Items.Mushroom.DisplayName',        english: 'Mushroom',            category: 'Items' },
    { key: 'Items.AcornSeed.DisplayName',       english: 'Acorn',               category: 'Items' },

    // --- NPCs ---
    { key: 'NPCs.Guide.DisplayName',            english: 'Guide',               category: 'NPCs' },
    { key: 'NPCs.Merchant.DisplayName',         english: 'Merchant',            category: 'NPCs' },
    { key: 'NPCs.Nurse.DisplayName',            english: 'Nurse',               category: 'NPCs' },
    { key: 'NPCs.Demolitionist.DisplayName',    english: 'Demolitionist',       category: 'NPCs' },
    { key: 'NPCs.ArmsDealer.DisplayName',       english: 'Arms Dealer',         category: 'NPCs' },
    { key: 'NPCs.Dryad.DisplayName',            english: 'Dryad',               category: 'NPCs' },
    { key: 'NPCs.Painter.DisplayName',          english: 'Painter',             category: 'NPCs' },
    { key: 'NPCs.Wizard.DisplayName',           english: 'Wizard',              category: 'NPCs' },
    { key: 'NPCs.Mechanic.DisplayName',         english: 'Mechanic',            category: 'NPCs' },
    { key: 'NPCs.GoblinTinkerer.DisplayName',   english: 'Goblin Tinkerer',     category: 'NPCs' },
    { key: 'NPCs.Zoologist.DisplayName',        english: 'Zoologist',           category: 'NPCs' },
    { key: 'NPCs.Zombie.DisplayName',           english: 'Zombie',              category: 'NPCs' },
    { key: 'NPCs.EyeOfCthulhu.DisplayName',     english: 'Eye of Cthulhu',      category: 'NPCs' },
    { key: 'NPCs.Slime.DisplayName',            english: 'Slime',               category: 'NPCs' },
    { key: 'NPCs.Goblin.DisplayName',           english: 'Goblin',              category: 'NPCs' },

    // --- Buffs ---
    { key: 'Buffs.Regeneration.DisplayName',    english: 'Regeneration',        category: 'Buffs' },
    { key: 'Buffs.Regeneration.Description',    english: 'Slowly regenerating life', category: 'Buffs' },
    { key: 'Buffs.Swiftness.DisplayName',       english: 'Swiftness',           category: 'Buffs' },
    { key: 'Buffs.Swiftness.Description',       english: '25% increased movement speed', category: 'Buffs' },
    { key: 'Buffs.Ironskin.DisplayName',        english: 'Ironskin',            category: 'Buffs' },
    { key: 'Buffs.Ironskin.Description',        english: 'Increased defense',   category: 'Buffs' },
    { key: 'Buffs.Poisoned.DisplayName',        english: 'Poisoned',            category: 'Buffs' },
    { key: 'Buffs.Poisoned.Description',        english: 'Slowly losing life',  category: 'Buffs' },
    { key: 'Buffs.OnFire.DisplayName',          english: 'On Fire!',            category: 'Buffs' },
    { key: 'Buffs.OnFire.Description',          english: 'Losing life',         category: 'Buffs' },
    { key: 'Buffs.Darkness.DisplayName',        english: 'Darkness',            category: 'Buffs' },
    { key: 'Buffs.Darkness.Description',        english: 'Reduced vision',      category: 'Buffs' },
    { key: 'Buffs.Mana.DisplayName',            english: 'Mana Regeneration',   category: 'Buffs' },
    { key: 'Buffs.Mana.Description',            english: 'Increased mana regeneration', category: 'Buffs' },

    // --- UI ---
    { key: 'UI.Inventory',                      english: 'Inventory',           category: 'UI' },
    { key: 'UI.Crafting',                       english: 'Crafting',            category: 'UI' },
    { key: 'UI.Equipment',                      english: 'Equipment',           category: 'UI' },
    { key: 'UI.Settings',                       english: 'Settings',            category: 'UI' },
    { key: 'UI.Save',                           english: 'Save',                category: 'UI' },
    { key: 'UI.Exit',                           english: 'Exit',                category: 'UI' },
    { key: 'UI.Respawn',                        english: 'Respawn',             category: 'UI' },
    { key: 'UI.BossDefeated',                   english: 'has been defeated!',  category: 'UI' },
    { key: 'UI.NewPlayer',                      english: 'New Player',          category: 'UI' },
    { key: 'UI.NewWorld',                       english: 'New World',           category: 'UI' },
    { key: 'UI.DeleteWorld',                    english: 'Delete World',        category: 'UI' },
];


export const TERRARIA_VERSIONS = [
    { id: '1.4.5',  label: '1.4.5 (tModLoader 2025+)' },
    { id: '1.4.4',  label: '1.4.4 (stable)' },
    { id: '1.4.3',  label: '1.4.3 (legacy)' },
];

export const DEFAULT_TERRARIA_VERSION = '1.4.5';

/**
 * Languages tModLoader ships, and the .hjson filename each one needs.
 * Japanese/Korean/Traditional Chinese require 1.4.5.
 */
export const TERRARIA_LANGUAGES = [
    { code: 'en-US',   label: 'English' },
    { code: 'de-DE',   label: 'German' },
    { code: 'it-IT',   label: 'Italian' },
    { code: 'fr-FR',   label: 'French' },
    { code: 'es-ES',   label: 'Spanish' },
    { code: 'ru-RU',   label: 'Russian' },
    { code: 'pt-BR',   label: 'Brazilian Portuguese' },
    { code: 'pl-PL',   label: 'Polish' },
    { code: 'zh-Hans', label: 'Simplified Chinese' },
    { code: 'ja-JP',   label: 'Japanese (1.4.5+)' },
    { code: 'ko-KR',   label: 'Korean (1.4.5+)' },
    { code: 'zh-Hant', label: 'Traditional Chinese (1.4.5+)' },
];

/**
 * Where a key has to live in the .hjson.
 *
 * Terraria's own keys are NOT namespaced under `Mods.<ModName>` — the
 * tModLoader wiki is explicit: "the localization keys for Terraria keys are
 * not prefixed by Mods.ModNameHere". Putting a vanilla key inside
 * `Mods.MyMod.Items.IronSword` registers a brand new, unreferenced key and
 * translates nothing, which is exactly what the old exporter did.
 *
 * So vanilla overrides go at the ROOT of the file, and only genuinely new
 * mod-owned keys live under the `Mods` prefix.
 */
export const terrariaKeyPath = (key) => `Terraria.${key}`;

export const terrariaModKeyPath = (key, modName) =>
    `Mods.${modName}.${key}`;


export const setNestedValue = (obj, pathStr, value) => {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
};


export const serializeHjson = (obj, indent = 0) => {
    const pad = '  '.repeat(indent);
    const lines = [];

    for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'object' && val !== null) {
            lines.push(`${pad}${key}: {`);
            lines.push(serializeHjson(val, indent + 1));
            lines.push(`${pad}}`);
        } else {
            // Escape quotes and wrap in double quotes for safety
            const safeVal = String(val).replace(/"/g, '\\"');
            lines.push(`${pad}${key}: "${safeVal}"`);
        }
    }

    return lines.join('\n');
};

/**
 * Build the .hjson for a localization pack.
 *
 * Vanilla Terraria keys are written at the ROOT of the object, because
 * Terraria's own keys are not namespaced under `Mods.<ModName>`. Nesting them
 * under the mod prefix — as this exporter used to — creates dead keys that the
 * game never reads, so the pack builds cleanly and translates nothing.
 */
export const buildTerrariaHjson = (customTranslations, { modName, gameVersion }) => {
    const root = {};

    TERRARIA_KEYS.forEach((item) => {
        const val = customTranslations?.[item.key];
        // Untranslated entries are omitted: an empty value would blank the
        // string in-game, which is worse than leaving the English default.
        if (!val || String(val).trim() === '') return;
        setNestedValue(root, terrariaKeyPath(item.key), String(val).trim());
    });

    const header = [
        `# ${modName} — Terraria ${gameVersion} localization`,
        `# Generated by Conlang Engine`,
        `# Vanilla Terraria keys sit at the root here: Terraria's keys are not`,
        `# namespaced under Mods.<ModName>, so nesting them there would do nothing.`,
    ].join('\n');

    const body = serializeHjson(root);
    return body ? `${header}\n\n${body}\n` : `${header}\n`;
};

/** The tModLoader mod manifest. */
export const buildBuildTxt = ({ displayName, author, modVersion, homepage }) =>
    [
        `displayName = ${displayName}`,
        `author = ${author}`,
        `version = ${modVersion}`,
        `homepage = ${homepage}`,
        `buildIgnore = *.csproj, *.user, obj\\*, bin\\*, .vs\\*`,
    ].join('\n');

/**
 * The mod source, so the exported zip is a mod tModLoader can actually build
 * rather than a loose folder of .hjson files.
 */
export const buildModSource = (modName) => `using Terraria.ModLoader;

namespace ${modName}
{
\tpublic class ${modName} : Mod
\t{
\t}
}
`;

/** The .csproj that tModLoader's targets file hooks into. */
export const buildCsproj = (modName) => `<Project Sdk="Microsoft.NET.Sdk">
  <Import Project="..\\tModLoader.targets" />
  <PropertyGroup>
    <AssemblyName>${modName}</AssemblyName>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>
`;

