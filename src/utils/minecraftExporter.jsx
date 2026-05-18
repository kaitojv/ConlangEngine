import JSZip from 'jszip';

// A carefully curated collection of 55 highly prominent and iconic Minecraft keys.
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

/**
 * Automatically match translation glosses from the active lexicon.
 * Performs exact match, then falls back to matching key substrings to longer lexicon words.
 */
export const autoMatchLexicon = (english, lexicon) => {
    if (!lexicon || !Array.isArray(lexicon)) return '';
    const cleanEng = english.toLowerCase().trim();
    
    // First pass: Exact match
    const exact = lexicon.find(w => w.translation?.toLowerCase().trim() === cleanEng);
    if (exact) return exact.word.replace(/\*/g, '');

    // Second pass: Search if a lexicon translation is contained within the English term
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
 * Generate a beautiful custom pack.png icon using an HTML5 Canvas.
 * Creates an elegant obsidian-like blocks texture with a glowing neon conlang monogram.
 */
const generatePackIcon = (conlangName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background Gradient (Conlang Engine signature deep dark purple space style)
    const grad = ctx.createLinearGradient(0, 0, 128, 128);
    grad.addColorStop(0, '#100e23');
    grad.addColorStop(0.5, '#1b1437');
    grad.addColorStop(1, '#07050f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    // Pixelated grid overlay to give it a Minecraft feel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let x = 0; x < 128; x += 8) {
        for (let y = (x % 16 === 0 ? 0 : 4); y < 128; y += 8) {
            ctx.fillRect(x, y, 4, 4);
        }
    }

    // Draw an elegant isometric glowing cube outline
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)'; // Primary Accent (purple)
    ctx.lineWidth = 2;
    
    // Top point: (64, 20), Right: (108, 42), Bottom: (64, 64), Left: (20, 42)
    ctx.beginPath();
    ctx.moveTo(64, 20);
    ctx.lineTo(108, 42);
    ctx.lineTo(64, 64);
    ctx.lineTo(20, 42);
    ctx.closePath();
    ctx.stroke();

    // Verticals
    ctx.beginPath();
    ctx.moveTo(20, 42);
    ctx.lineTo(20, 92);
    ctx.lineTo(64, 114);
    ctx.lineTo(108, 92);
    ctx.lineTo(108, 42);
    ctx.stroke();

    // Center vertical line
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64, 114);
    ctx.stroke();

    // Side panels subtle fill
    ctx.fillStyle = 'rgba(139, 92, 246, 0.06)'; // Neon Accent2
    ctx.beginPath();
    ctx.moveTo(20, 42);
    ctx.lineTo(64, 64);
    ctx.lineTo(64, 114);
    ctx.lineTo(20, 92);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(76, 29, 149, 0.15)'; // Dark purple
    ctx.beginPath();
    ctx.moveTo(108, 42);
    ctx.lineTo(64, 64);
    ctx.lineTo(64, 114);
    ctx.lineTo(108, 92);
    ctx.closePath();
    ctx.fill();

    // Glowing Monogram
    const monogram = conlangName ? conlangName.trim().charAt(0).toUpperCase() : 'C';
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(monogram, 64, 52); // offset upwards to align with top isometric face center

    // Accent letter highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
    ctx.fillText(monogram, 65, 53);

    // Subtle banner on the bottom with conlang title
    ctx.fillStyle = 'rgba(8, 8, 18, 0.85)';
    ctx.fillRect(0, 104, 128, 24);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 9px "Inter", monospace';
    ctx.fillText(conlangName ? conlangName.toUpperCase().slice(0, 15) : 'CONLANG', 64, 116);

    return canvas.toDataURL('image/png');
};

/**
 * Compile and trigger download of the Minecraft Resource Pack ZIP file.
 */
export const exportMinecraftResourcePack = async (config, customTranslations, options = {}) => {
    const {
        langName = config.conlangName || 'Custom Conlang',
        langCode = 'art_custom',
        regionName = 'Conlangia',
        bidirectional = false,
        packFormat = 15
    } = options;

    const zip = new JSZip();

    // 1. Create pack.mcmeta
    const packMcmeta = {
        pack: {
            pack_format: parseInt(packFormat, 10) || 15,
            description: `${langName} Language Pack - Conlang Engine`
        },
        language: {
            [langCode]: {
                name: langName,
                region: regionName,
                bidirectional: !!bidirectional
            }
        }
    };
    zip.file('pack.mcmeta', JSON.stringify(packMcmeta, null, 2));

    // 2. Create custom language JSON mapping
    // Minecraft uses key-value strings for language files
    const langJson = {};
    MINECRAFT_KEYS.forEach(item => {
        const val = customTranslations[item.key] || '';
        if (val && val.trim() !== '') {
            langJson[item.key] = val.trim();
        } else {
            // Keep default English translation if user didn't override it
            langJson[item.key] = item.english;
        }
    });
    
    // Add assets directory structure
    const langFolder = zip.folder('assets').folder('minecraft').folder('lang');
    langFolder.file(`${langCode}.json`, JSON.stringify(langJson, null, 2));

    // 3. Create stylized pack.png icon
    const dataUrl = generatePackIcon(langName);
    if (dataUrl) {
        // Strip dataURL header to get raw base64 string
        const base64Data = dataUrl.split(',')[1];
        zip.file('pack.png', base64Data, { base64: true });
    }

    // 4. Generate and download zip blob
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    
    const safeName = langName.replace(/\s+/g, '_').toLowerCase();
    const a = document.createElement('a');
    a.href = url;
    a.download = `Minecraft_Language_${safeName}_Pack.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
