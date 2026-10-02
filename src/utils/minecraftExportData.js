// minecraftExportData.js — the pure data and format logic behind the Minecraft
// exporter. Kept out of the .jsx so node can import it directly in tests,
// which is the convention the other tests/ suites rely on.
export const MINECRAFT_KEYS = [
    // UI / Menus
    { key: 'menu.play', english: 'Play', category: 'Interface' },
    { key: 'menu.options', english: 'Options', category: 'Interface' },
    { key: 'menu.quit', english: 'Quit Game', category: 'Interface' },
    { key: 'menu.singleplayer', english: 'Singleplayer', category: 'Interface' },
    { key: 'menu.multiplayer', english: 'Multiplayer', category: 'Interface' },
    { key: 'gui.back', english: 'Back', category: 'Interface' },
    { key: 'gui.done', english: 'Done', category: 'Interface' },
    { key: 'gui.cancel', english: 'Cancel', category: 'Interface' },
    { key: 'gui.yes', english: 'Yes', category: 'Interface' },
    { key: 'gui.no', english: 'No', category: 'Interface' },

    // Blocks
    { key: 'block.minecraft.stone', english: 'Stone', category: 'Blocks' },
    { key: 'block.minecraft.dirt', english: 'Dirt', category: 'Blocks' },
    { key: 'block.minecraft.grass_block', english: 'Grass Block', category: 'Blocks' },
    { key: 'block.minecraft.cobblestone', english: 'Cobblestone', category: 'Blocks' },
    { key: 'block.minecraft.sand', english: 'Sand', category: 'Blocks' },
    { key: 'block.minecraft.gravel', english: 'Gravel', category: 'Blocks' },
    { key: 'block.minecraft.gold_ore', english: 'Gold Ore', category: 'Blocks' },
    { key: 'block.minecraft.iron_ore', english: 'Iron Ore', category: 'Blocks' },
    { key: 'block.minecraft.coal_ore', english: 'Coal Ore', category: 'Blocks' },
    { key: 'block.minecraft.netherrack', english: 'Netherrack', category: 'Blocks' },
    { key: 'block.minecraft.obsidian', english: 'Obsidian', category: 'Blocks' },
    { key: 'block.minecraft.oak_planks', english: 'Oak Planks', category: 'Blocks' },
    { key: 'block.minecraft.glass', english: 'Glass', category: 'Blocks' },
    { key: 'block.minecraft.crafting_table', english: 'Crafting Table', category: 'Blocks' },
    { key: 'block.minecraft.furnace', english: 'Furnace', category: 'Blocks' },
    { key: 'block.minecraft.chest', english: 'Chest', category: 'Blocks' },

    // Items & Tools
    { key: 'item.minecraft.diamond', english: 'Diamond', category: 'Items & Tools' },
    { key: 'item.minecraft.iron_ingot', english: 'Iron Ingot', category: 'Items & Tools' },
    { key: 'item.minecraft.gold_ingot', english: 'Gold Ingot', category: 'Items & Tools' },
    { key: 'item.minecraft.coal', english: 'Coal', category: 'Items & Tools' },
    { key: 'item.minecraft.stick', english: 'Stick', category: 'Items & Tools' },
    { key: 'item.minecraft.bucket', english: 'Bucket', category: 'Items & Tools' },
    { key: 'item.minecraft.apple', english: 'Apple', category: 'Items & Tools' },
    { key: 'item.minecraft.bread', english: 'Bread', category: 'Items & Tools' },
    { key: 'item.minecraft.wheat', english: 'Wheat', category: 'Items & Tools' },
    { key: 'item.minecraft.wooden_sword', english: 'Wooden Sword', category: 'Items & Tools' },
    { key: 'item.minecraft.wooden_pickaxe', english: 'Wooden Pickaxe', category: 'Items & Tools' },
    { key: 'item.minecraft.stone_sword', english: 'Stone Sword', category: 'Items & Tools' },
    { key: 'item.minecraft.stone_pickaxe', english: 'Stone Pickaxe', category: 'Items & Tools' },
    { key: 'item.minecraft.iron_sword', english: 'Iron Sword', category: 'Items & Tools' },
    { key: 'item.minecraft.iron_pickaxe', english: 'Iron Pickaxe', category: 'Items & Tools' },
    { key: 'item.minecraft.diamond_sword', english: 'Diamond Sword', category: 'Items & Tools' },
    { key: 'item.minecraft.diamond_pickaxe', english: 'Diamond Pickaxe', category: 'Items & Tools' },
    { key: 'item.minecraft.bow', english: 'Bow', category: 'Items & Tools' },
    { key: 'item.minecraft.arrow', english: 'Arrow', category: 'Items & Tools' },

    // Gameplay
    { key: 'gameMode.survival', english: 'Survival Mode', category: 'Gameplay' },
    { key: 'gameMode.creative', english: 'Creative Mode', category: 'Gameplay' },
    { key: 'gameMode.adventure', english: 'Adventure Mode', category: 'Gameplay' },
    { key: 'gameMode.spectator', english: 'Spectator Mode', category: 'Gameplay' },
    { key: 'multiplayer.player.joined', english: '%s joined the game', category: 'Gameplay' },
    { key: 'multiplayer.player.left', english: '%s left the game', category: 'Gameplay' },
];


export const MINECRAFT_VERSIONS = [
    { id: '26.3',    label: '26.3 (latest)',    format: 97, minor: 1, era: 'New (min/max)' },
    { id: '26.2',    label: '26.2',             format: 88, minor: 0, era: 'New (min/max)' },
    { id: '26.1',    label: '26.1 – 26.1.2',     format: 84, minor: 0, era: 'New (min/max)' },
    { id: '1.21.11', label: '1.21.11',           format: 75, minor: 0, era: 'New (min/max)' },
    { id: '1.21.9',  label: '1.21.9 – 1.21.10', format: 69, minor: 0, era: 'New (min/max)' },
    { id: '1.21.7',  label: '1.21.7 – 1.21.8',  format: 64, minor: 0, era: 'Legacy' },
    { id: '1.21.6',  label: '1.21.6',           format: 63, minor: 0, era: 'Legacy' },
    { id: '1.21.5',  label: '1.21.5',           format: 55, minor: 0, era: 'Legacy' },
    { id: '1.21.4',  label: '1.21.4',           format: 46, minor: 0, era: 'Legacy' },
    { id: '1.21.2',  label: '1.21.2 – 1.21.3',  format: 42, minor: 0, era: 'Legacy' },
    { id: '1.21',    label: '1.21 – 1.21.1',    format: 34, minor: 0, era: 'Legacy' },
    { id: '1.20.5',  label: '1.20.5 – 1.20.6',  format: 32, minor: 0, era: 'Legacy' },
    { id: '1.20.3',  label: '1.20.3 – 1.20.4',  format: 22, minor: 0, era: 'Legacy' },
    { id: '1.20.2',  label: '1.20.2',           format: 18, minor: 0, era: 'Legacy' },
    { id: '1.20',    label: '1.20 – 1.20.1',    format: 15, minor: 0, era: 'Legacy' },
    { id: '1.19.4',  label: '1.19.4',           format: 13, minor: 0, era: 'Legacy' },
    { id: '1.19.3',  label: '1.19.3',           format: 12, minor: 0, era: 'Legacy' },
    { id: '1.19',    label: '1.19 – 1.19.2',    format:  9, minor: 0, era: 'Legacy' },
    { id: '1.18',    label: '1.18 – 1.18.2',    format:  8, minor: 0, era: 'Legacy' },
    { id: '1.17',    label: '1.17 – 1.17.1',    format:  7, minor: 0, era: 'Legacy' },
    { id: '1.16.2',  label: '1.16.2 – 1.16.5',  format:  6, minor: 0, era: 'Legacy' },
    { id: '1.15',    label: '1.15 – 1.16.1',    format:  5, minor: 0, era: 'Legacy' },
    { id: '1.13',    label: '1.13 – 1.14.4',    format:  4, minor: 0, era: 'Legacy' },
    { id: '1.11',    label: '1.11 – 1.12.2',    format:  3, minor: 0, era: 'Legacy' },
    { id: '1.9',     label: '1.9 – 1.10.2',     format:  2, minor: 0, era: 'Legacy' },
    { id: '1.6.1',   label: '1.6.1 – 1.8.9',    format:  1, minor: 0, era: 'Legacy' },
];

export const DEFAULT_MINECRAFT_VERSION = '26.3';

/** Look up a version id, falling back to the newest release. */
export const getMinecraftVersion = (id) =>
    MINECRAFT_VERSIONS.find((v) => v.id === id) || MINECRAFT_VERSIONS[0];

/**
 * Build the pack.mcmeta for a version. 1.21.9+ gets min_format/max_format
 * arrays; everything older gets the single pack_format integer.
 */
export const buildPackMcmeta = ({ langName, langCode, regionName, bidirectional, versionId }) => {
    const v = getMinecraftVersion(versionId);
    const description = `${langName} Language Pack - Conlang Engine`;

    const pack =
        v.era === 'New (min/max)'
            ? {
                  description,
                  min_format: [v.format, v.minor],
                  max_format: [v.format, v.minor],
              }
            : { pack_format: v.format, description };

    return {
        pack,
        language: {
            [langCode]: {
                name: langName,
                region: regionName,
                bidirectional: !!bidirectional,
            },
        },
    };
};


/** Where the language file has to sit inside the zip. */
export const minecraftLangPath = (langCode) => `assets/minecraft/lang/${langCode}.json`;
