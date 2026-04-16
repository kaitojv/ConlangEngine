import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import './systemtab.css';
import { Palette, CaseLower } from 'lucide-react';
import { useConfigStore, INITIAL_CONFIG } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import opentype from 'opentype.js';

export default function SystemTab() {

    const navigate = useNavigate();
    
    const colors = useConfigStore((state) => state.colors) || {};
    const conlangName = useConfigStore((state) => state.conlangName) || 'MyConlang';
    const customFontBase64 = useConfigStore((state) => state.customFontBase64);
    const customFont = useConfigStore((state) => state.customFont);
    const customGlyphs = useConfigStore((state) => state.customGlyphs) || {};
    const setFullConfig = useConfigStore((state) => state.setFullConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const fileInputRef = useRef(null);


    const applyThemePreset = (preset) => {
        updateConfig({ colors: { ...colors, ...preset } });
    };

    const getSafeColor = (colorString, fallback) => {
        if (typeof colorString === 'string' && colorString.startsWith('#')) {
            const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
        }
        return fallback; 
    };

    const handleFontUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const MAX_SIZE = 2.5 * 1024 * 1024; 
        
        if (file.size > MAX_SIZE) {
            alert("⚠️ File is too large. Please use a font smaller than 2.5MB to avoid breaking local storage limits.");
            event.target.value = ''; 
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const base64Font = e.target.result;

                updateConfig({ customFont: base64Font });
                alert("Custom font applied successfully!");
            } catch (err) {
                console.error("Storage Quota Exceeded:", err);
                alert("❌ Failed to save font. Your browser's local storage is full. Try a smaller font file.");
            }
        };
        
        reader.readAsDataURL(file);
    };

    const handleClearFont = () => {
        if(!window.confirm("Are you sure you want to remove the custom font? The app will revert to default system fonts.")) return;
        
        updateConfig({ customFont: null, customFontBase64: null });
        
        if(fileInputRef.current) {
            fileInputRef.current.value = ''; 
        }
    };

    const handleDownloadFont = () => {
        const hasCustomGlyphs = Object.keys(customGlyphs).length > 0;

        if (!customFont && !hasCustomGlyphs) {
            alert("No custom font to download. Upload a font or draw characters in the Syllabary first.");
            return;
        }
        
        if (customFont) {
            // Download the uploaded font
            const a = document.createElement('a');
            a.href = customFont;
            a.download = `${conlangName || 'MyConlang'}_CustomFont.ttf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            return;
        }

        // Generate and download a font from drawn custom glyphs
        try {
            const notdefGlyph = new opentype.Glyph({
                name: '.notdef',
                unicode: 0,
                advanceWidth: 650,
                path: new opentype.Path()
            });

            const glyphs = [notdefGlyph];

            const fontAscender = 800; // Corresponds to the font's ascender property.

            Object.entries(customGlyphs).forEach(([char, data]) => {
                let path;

                // Create a path object from the stored data.
                if (typeof data === 'string' && data.trim() !== '') {
                    // Use opentype's robust SVG path parser. It converts all commands to absolute.
                    path = opentype.Path.fromSVG(data);
                } else if (Array.isArray(data) && data.length > 0) {
                    path = new opentype.Path();
                    path.commands = data;
                } else if (data && data.commands && data.commands.length > 0) {
                    path = new opentype.Path();
                    path.commands = data.commands;
                } else {
                    // Skip if data is empty or in an unknown format
                    return;
                }

                // The drawing canvas (likely SVG) has Y-axis pointing down, but font glyphs have Y-axis pointing up.
                // We need to flip the Y coordinates of all points in the path.
                // We flip it around the font's baseline. The ascender value is a good reference for the top.
                // New Y = ascender - Old Y.
                // This assumes the drawing canvas has a height that maps 1:1 to the font's em-size.
                path.commands.forEach(cmd => {
                    if (cmd.y !== undefined) cmd.y = fontAscender - cmd.y;
                    if (cmd.y1 !== undefined) cmd.y1 = fontAscender - cmd.y1;
                    if (cmd.y2 !== undefined) cmd.y2 = fontAscender - cmd.y2;
                });

                const glyph = new opentype.Glyph({
                    name: char,
                    unicode: parseInt(char, 10),
                    advanceWidth: 650,
                    path: path
                });
                glyphs.push(glyph);
            });

            const font = new opentype.Font({
                familyName: conlangName || 'MyConlang',
                styleName: 'Regular',
                unitsPerEm: 1000,
                ascender: 800,
                descender: -200,
                glyphs: glyphs
            });

            font.download(`${conlangName || 'MyConlang'}_Syllabary.otf`);
        } catch (err) {
            console.error("Font generation error:", err);
            alert("Failed to generate custom font from Syllabary.");
        }
    };

    const handleWipeWorkspace = () => {
        const isConfirmed = window.confirm("Are you ABSOLUTELY sure you want to delete your current local project? This will permanently delete all your lexicon, grammar rules, and settings.");
        
        if (isConfirmed) {
            // Clear all local storage to wipe the project data
            localStorage.clear();
            
            // Redirect to home and reload the page to re-initialize the app state
            navigate('/');
            window.location.reload();
        }
    };

    // Dark Themes
    const darkThemes = [
        {
            name: "Midnight (Default)",
            preview: "#0b0f19",
            colors: { 
                bg: "#0b0f19", 
                card: "#12121c", 
                header: "#080812", 
                font: "#f8fafc", 
                font2: "#94a3b8", 
                accent: "#7c3aed", 
                accent2: "#8b5cf6",
                accent3: "#4c1d95",
                border: "rgba(255, 255, 255, 0.08)", 
                blur: "0px", 
                glow: "#1a1638" }
        },
        {
            name: "Obsidian Void",
            preview: "linear-gradient(135deg, #000000, #0a0a0a)",
            colors: { 
                bg: "#000000", 
                card: "#09090b", 
                header: "#000000", 
                font: "#ffffff", 
                font2: "#a1a1aa", 
                accent: "#ffffff", 
                accent2: "#d4d4d8",
                accent3: "#52525b",
                border: "#1f1f22", 
                blur: "0px",
                glow: "rgba(255, 255, 255, 0.05)" }
        },
        {
            name: "Hacker Matrix",
            preview: "linear-gradient(135deg, #050b06, #001f05)",
            colors: { 
                bg: "#050b06", 
                card: "#0a140b", 
                header: "#030804", 
<<<<<<< HEAD
                font: "#e8efe7", 
                font2: "#1f8a11", 
                accent: "#00ff41", 
                accent2: "#20863a",
=======
                font: "#4af626", 
                font2: "#1f8a11", 
                accent: "#00ff41", 
                accent2: "#00ff41",
>>>>>>> 2ab0d7936fd3406865be14858a1d047ddccc4804
                accent3: "#0891b2",
                border: "#124211", 
                blur: "0px",
                glow: "rgba(0, 255, 65, 0.15)" }
        },
        {
            name: "Deep Purple",
            preview: "linear-gradient(135deg, #13071e, #2b1145)",
            colors: { 
                bg: "#0f0518", 
                card: "#1d0b30", 
                header: "#0a0312", 
                font: "#f3e8ff", 
                font2: "#c084fc", 
                accent: "#d946ef", 
                accent2: "#c084fc",
                accent3: "#db2777",
                border: "rgba(192, 132, 252, 0.2)", 
                blur: "0px",
                glow: "rgba(217, 70, 239, 0.2)" }
        },
        {
            name: "Apple Glass",
            preview: "linear-gradient(135deg, #1d1b2e, #471d47, #0f223a)",
            colors: {
                bg: "linear-gradient(120deg, #11101a 0%, #3b1745 45%, #0d2138 100%)",
                card: "linear-gradient(135deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.01) 100%)",
                header: "rgba(10, 10, 10, 0.25)",
                font: "#ffffff",
                font2: "rgba(235, 235, 245, 0.6)",
                accent: "#0A84FF",
                accent2: "#0A84FF",
                accent3: "#5E5CE6",
                border: "rgba(255, 255, 255, 0.18)",
                blur: "40px",
                glow: "rgba(10, 132, 255, 0.25)"
            }
        }
    ];

    // Light Themes
    const lightThemes = [
        {
            name: "Clean Paper",
            preview: "#ffffff",
            colors: { bg: "#f4f4f5", card: "#ffffff", header: "#fafafa", font: "#09090b", font2: "#71717a", accent: "#3b82f6", accent2: "#3b82f6", accent3: "#8b5cf6", border: "#e4e4e7", blur: "0px", glow: "rgba(0, 0, 0, 0.08)" }
        },
        {
            name: "Vintage Sepia",
            preview: "#fdf6e3",
            colors: { bg: "#fdf6e3", card: "#fefbf4", header: "#fdf6e3", font: "#4a3c31", font2: "#9a8c83", accent: "#d97706", accent2: "#d97706", accent3: "#9a3412", border: "#e8dfcc", blur: "0px", glow: "rgba(217, 119, 6, 0.15)" }
        },
        {
            name: "Nord Snow",
            preview: "#eceff4",
            colors: { bg: "#eceff4", card: "#ffffff", header: "#e5e9f0", font: "#2e3440", font2: "#4c566a", accent: "#5e81ac", accent2: "#81a1c1", accent3: "#88c0d0", border: "#d8dee9", blur: "0px", glow: "rgba(94, 129, 172, 0.15)" }
        },
        {
            name: "Rose Quartz",
            preview: "#fff1f2",
            colors: { bg: "#fff1f2", card: "#fffbfa", header: "#ffe4e6", font: "#881337", font2: "#f43f5e", accent: "#e11d48", accent2: "#f43f5e", accent3: "#be123c", border: "#fecdd3", blur: "0px", glow: "rgba(225, 29, 72, 0.15)" }
        },
        {
            name: "Light Glass",
            preview: "linear-gradient(135deg, #e0c3fc, #8ec5fc)",
            colors: {
                bg: "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)",
                card: "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%)",
                header: "rgba(255, 255, 255, 0.5)",
                font: "#1c1c1e",
                font2: "rgba(28, 28, 30, 0.6)",
                accent: "#007AFF",
                accent2: "#007AFF",
                accent3: "#AF52DE",
                border: "rgba(255, 255, 255, 0.8)",
                blur: "40px",
                glow: "rgba(175, 82, 222, 0.2)"
            }
        }
    ];

    return (
        <>
            <Card>
                <h2 className='flex sg-title'><CaseLower /> Typography & Custom Font</h2>
                <p>
                    Upload your custom <b>.ttf</b> or <b>.otf</b> font to render your unique characters. The font file is converted and stored locally in your browser memory. <br />
                    <span>Note: Maximum file size is 2.5MB to respect local storage limits.</span>
                </p>
                <div className='font-btns'>

                    <label className='fontUp-btn btn-imp'>
                        <input className='file-input' type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} ref={fileInputRef} />
                        <h4>Upload Font</h4>
                    </label>
                    <Button variant='error' onClick={handleClearFont}>Remove Font</Button>
                </div>
                <div className='font-status'>
                    <p>{customFont 
                        ? "✅ Custom font is currently active!" 
                        : Object.keys(customGlyphs).length > 0 
                            ? `✅ You have ${Object.keys(customGlyphs).length} custom glyphs ready to export!` 
                            : "❌ No custom font uploaded."}</p>
                </div>
                <div className='export-font-box'>
                    <p>Export your custom symbols as a real font file to use on your OS, Word, Photoshop, etc.</p>
                    <Button variant='cancel' onClick={handleDownloadFont}>
                        <span> Download Custom Font (.ttf)
                        </span>
                    </Button>
                </div>
            </Card>
            <Card>
                <h2 className='flex sg-title'><Palette /> Aesthetics and Theme</h2>
                <p>Dark Themes</p>
                <div className='theme-btn-box'>
                    {darkThemes.map((theme, i) => (
                        <button
                            key={i}
                            title={theme.name}
                            onClick={() => applyThemePreset(theme.colors)}
                            className="theme-btn"
                            style={{ background: theme.preview }}
                        />
                    ))}
                </div>
                <p>Light Themes</p>
                <div className='theme-btn-box'>
                    {lightThemes.map((theme, i) => (
                        <button
                            key={i}
                            title={theme.name}
                            onClick={() => applyThemePreset(theme.colors)}
                            className="theme-btn"
                            style={{ background: theme.preview }}
                        />
                    ))}
                </div>
                <br />
                <h2>Custom Theme</h2>
                <div className='pick-colors'>
                    <label className='selector-name'>Background Color</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.bg, '#0b0f19')} onChange={(e) => updateConfig({ colors: { ...colors, bg: e.target.value }})} />
                    <label className='selector-name'>Card/Box Color</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.card, '#0b0f19')} onChange={(e) => updateConfig({ colors: { ...colors, card: e.target.value }})}/>
                    <label className='selector-name'>Header Color</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.header, '#0b0f19')} onChange={(e) => updateConfig({ colors: { ...colors, header: e.target.value }})}/>
                    <label className='selector-name'>Font Color</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.font, '#ffffff')} onChange={(e) => updateConfig({ colors: { ...colors, font: e.target.value }})}/>
                    <label className='selector-name'>Glow Color</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.glow, '#1a1638')} onChange={(e) => updateConfig({ colors: { ...colors, glow: e.target.value }})}/>

                </div>
            </Card>
            <Card>
                <h2>Danger Zone</h2>
                <p>This action will permanently delete your current local project. Your entire lexicon, grammar rules, and settings will be wiped out.</p>
                <Button variant='error' onClick={handleWipeWorkspace}>Delete Local Project</Button>
            </Card>

        </>
    )
}
