import JSZip from 'jszip';

// A curated list of prominent Terraria content categories for a conlang mod.
// Keys follow the tModLoader hjson path: Mods.<ModName>.<Category>.<Name>.<Field>
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

/**
 * Automatically match translation glosses from the active lexicon.
 * Performs exact match then falls back to substring matching.
 */
export const autoMatchLexiconTerraria = (english, lexicon) => {
    if (!lexicon || !Array.isArray(lexicon)) return '';
    const cleanEng = english.toLowerCase().trim();

    const exact = lexicon.find(w => w.translation?.toLowerCase().trim() === cleanEng);
    if (exact) return exact.word.replace(/\*/g, '');

    const sorted = [...lexicon]
        .filter(w => w.translation && w.translation.trim().length > 2)
        .sort((a, b) => b.translation.length - a.translation.length);

    for (const entry of sorted) {
        const cleanTrans = entry.translation.toLowerCase().trim();
        if (cleanEng.includes(cleanTrans)) {
            return entry.word.replace(/\*/g, '');
        }
    }

    return '';
};

/**
 * Build a nested object from a flat dot-notated key path.
 * e.g. "Items.IronSword.DisplayName" -> { Items: { IronSword: { DisplayName: value } } }
 */
const setNestedValue = (obj, pathStr, value) => {
    const parts = pathStr.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
};

/**
 * Serialize a nested JS object into HJSON-formatted text.
 * Uses the tModLoader standard: unquoted string values, brace-based nesting.
 */
const serializeHjson = (obj, indent = 0) => {
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
 * Compile and trigger download of the Terraria tModLoader localization pack ZIP.
 */
export const exportTerrariaLocalizationPack = async (config, customTranslations, options = {}) => {
    const {
        modName = 'MyConlangMod',
        langCode = 'en-US',
        modVersion = '1.0.0',
        modAuthor = config.conlangName || 'Conlang Author',
    } = options;

    const zip = new JSZip();

    // 1. Build nested translation object for the .hjson file
    const modRoot = {};
    TERRARIA_KEYS.forEach(item => {
        const val = customTranslations[item.key];
        const output = val && val.trim() !== '' ? val.trim() : item.english;
        setNestedValue(modRoot, item.key, output);
    });

    const rootObj = { Mods: { [modName]: modRoot } };
    const hjsonContent = `# ${modName} Localization — Generated by Conlang Engine\n# Language: ${langCode}\n\n` + serializeHjson(rootObj);

    const locFolder = zip.folder('Localization');
    locFolder.file(`${langCode}.hjson`, hjsonContent);

    // 2. Generate build.txt (tModLoader mod manifest)
    const buildTxt = [
        `displayName = ${config.conlangName || 'My Conlang Mod'}`,
        `author = ${modAuthor}`,
        `version = ${modVersion}`,
        `homepage = https://github.com/`,
    ].join('\n');
    zip.file('build.txt', buildTxt);

    // 3. Generate description.txt
    const descTxt = `${config.conlangName || 'My Conlang'} Language Localization\n\nThis mod translates Terraria content into ${config.conlangName || 'a custom conlang'}.\nGenerated by Conlang Engine.`;
    zip.file('description.txt', descTxt);

    // 4. Download
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const safeName = (config.conlangName || 'conlang').replace(/\s+/g, '_').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `Terraria_Localization_${safeName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
