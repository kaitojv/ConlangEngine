import JSZip from 'jszip';
import {
    MINECRAFT_KEYS,
    DEFAULT_MINECRAFT_VERSION,
    buildPackMcmeta,
    minecraftLangPath,
} from './minecraftExportData.js';
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
        versionId = DEFAULT_MINECRAFT_VERSION
    } = options;

    const zip = new JSZip();

    // 1. pack.mcmeta — the version decides pack_format vs min_format/max_format.
    const packMcmeta = buildPackMcmeta({ langName, langCode, regionName, bidirectional, versionId });
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
    
    // Language JSON must sit at assets/minecraft/lang/<code>.json — the
    // namespace has to be `minecraft`, not the pack's own.
    zip.file(minecraftLangPath(langCode), JSON.stringify(langJson, null, 2));

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
