import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import './systemtab.css';
import { Palette, CaseLower, Database } from 'lucide-react';
import { useConfigStore, INITIAL_CONFIG } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import opentype from 'opentype.js';
import { DARK_THEMES, LIGHT_THEMES } from '../../../utils/themePresets.js';
import { Info, User, Type } from 'lucide-react';

export default function SystemTab() {

    const navigate = useNavigate();

    const colors = useConfigStore((state) => state.colors) || {};
    const conlangName = useConfigStore((state) => state.conlangName) || 'MyConlang';
    const authorName = useConfigStore((state) => state.authorName) || '';
    const description = useConfigStore((state) => state.description) || '';
    const customFontBase64 = useConfigStore((state) => state.customFontBase64);
    const customFont = useConfigStore((state) => state.customFont);
    const customGlyphs = useConfigStore((state) => state.customGlyphs) || {};
    const setFullConfig = useConfigStore((state) => state.setFullConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    const fileInputRef = useRef(null);
    const legacyInputRef = useRef(null);


    const applyThemePreset = (preset) => {
        // Fully replace colors with preset to avoid stale keys from previous themes
        updateConfig({ colors: preset });
    };

    const getSafeColor = (colorString, fallback) => {
        if (typeof colorString !== 'string') return fallback;

        // If it's already a hex, return it
        if (colorString.startsWith('#')) return colorString;

        // If it's a gradient or rgba, try to find the first hex color within it for the color picker to show something valid
        const hexMatch = colorString.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/);
        if (hexMatch) return hexMatch[0];

        // If no hex found but it's a valid CSS color string (like rgba), we still can't use it in <input type="color">
        // but we return it anyway for other uses, or fallback if it's for a picker.
        // For simplicity in this app, we'll return the fallback if it's not a hex.
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
        reader.onload = function (e) {
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
        if (!window.confirm("Are you sure you want to remove the custom font? The app will revert to default system fonts.")) return;

        updateConfig({ customFont: null, customFontBase64: null });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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

    const handleLegacyImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const oldData = JSON.parse(e.target.result);

                // ── Detect format: current export vs. true legacy ──
                const isCurrentFormat = oldData.project && Array.isArray(oldData.project.localProjects);

                if (!isCurrentFormat && !oldData.config && !oldData.dictionary) {
                    alert("This doesn't look like a valid save file.");
                    return;
                }

                if (!window.confirm("⚠️ This will overwrite your CURRENT workspace with the imported data. Make sure you have backed up your current work. Proceed?")) {
                    event.target.value = '';
                    return;
                }

                // ── Current-format import ──
                if (isCurrentFormat) {
                    // Pick the first project in the archive as the active workspace
                    const firstProject = oldData.project.localProjects[0];
                    const projectData = firstProject?.project_data;

                    if (!projectData || !projectData.config) {
                        alert("The file contains no valid project data.");
                        return;
                    }

                    // Restore the active config (prefer the nested project config over the top-level one)
                    const importedConfig = { ...INITIAL_CONFIG, ...projectData.config };
                    // Also merge any top-level config fields that may be more recent
                    if (oldData.config) {
                        Object.keys(oldData.config).forEach(key => {
                            if (key in INITIAL_CONFIG && oldData.config[key] !== undefined) {
                                importedConfig[key] = oldData.config[key];
                            }
                        });
                    }

                    // Dictionary is already in the current schema — use directly
                    const importedLexicon = projectData.dictionary || [];

                    setFullConfig(importedConfig);
                    setLexicon(importedLexicon);

                    // Restore ALL archived projects so multi-project exports are fully preserved
                    const projectStore = useProjectStore.getState();
                    oldData.project.localProjects.forEach(proj => {
                        if (proj.id && proj.project_data) {
                            projectStore.saveProjectToArchive(
                                proj.project_data.config,
                                proj.project_data.dictionary || []
                            );
                        }
                    });

                    const wordCount = importedLexicon.length;
                    const projectCount = oldData.project.localProjects.length;
                    alert(`Project imported successfully!\n${wordCount} dictionary entries loaded.\n${projectCount} project(s) restored to your workspace archive.`);
                    return;
                }

                // ── Legacy-format import (old Conlang Engine) ──
                const currentConfig = useConfigStore.getState();
                const newConfig = { ...INITIAL_CONFIG, projectId: currentConfig.projectId };

                if (oldData.config) {
                    if (oldData.config.nomeIdioma) newConfig.conlangName = oldData.config.nomeIdioma;
                    if (oldData.config.inventory) {
                        const allPhonemes = oldData.config.inventory.split(',').map(p => p.trim());
                        // Automatically split vowels and consonants using common IPA vowels
                        const vowels = allPhonemes.filter(p => /[aeiouáéíóúâêîôûäëïöüæœøɛɔʌəaɒeɘɜiɪɨoɵœuʉʊyʏλ]/i.test(p));
                        const consonants = allPhonemes.filter(p => !vowels.includes(p));
                        newConfig.vowels = vowels.join(', ');
                        newConfig.consonants = consonants.join(', ');
                    }
                    if (oldData.config.syllable) newConfig.syllablePattern = oldData.config.syllable;
                    if (oldData.config.syntax) newConfig.syntaxOrder = oldData.config.syntax;
                    if (oldData.config.bgColor) newConfig.colors = { ...INITIAL_CONFIG.colors, bg: oldData.config.bgColor };
                }

                if (oldData.wikiPagesData) {
                    newConfig.wikiPages = oldData.wikiPagesData;
                }

                const newLexicon = (oldData.dictionary || []).map((word, index) => ({
                    id: Date.now() + index,
                    word: word.word || '',
                    ipa: word.ipa || '',
                    wordClass: word.type || '',
                    translation: word.trans || '',
                    tags: word.tags || [],
                    ideogram: '',
                    inflectionOverrides: {},
                    createdAt: Date.now()
                }));

                setFullConfig(newConfig);
                setLexicon(newLexicon);

                // Explicitly save to the project archive so it appears in the Workspaces tab instantly
                useProjectStore.getState().saveProjectToArchive(newConfig, newLexicon);

                alert("Legacy project imported successfully! Your grammar and dictionary are now updated.");

            } catch (err) {
                console.error("Import failed:", err);
                alert("Failed to parse save file. Ensure it is valid JSON.");
            } finally {
                if (legacyInputRef.current) legacyInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };




    return (
        <>

            <Card>
                <h2 className='flex sg-title'><CaseLower /> Typography & Custom Font</h2>
                <p>
                    Upload your custom <b>.ttf</b> or <b>.otf</b> font to render your unique characters. The font file is converted and stored locally in your browser memory. <br />
                    <span>Note: Maximum file size is 2.5MB to respect local storage limits.</span>
                </p>
                <div className='font-btns'>

                    <label className='fontUp-btn'>
                        <input className='file-input-hidden' type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} ref={fileInputRef} />
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

            </Card>
            <Card>
                <h2 className='flex sg-title'><Database /> Legacy Importer</h2>
                <p>Import a JSON save file from the old version of Conlang Engine. This will convert your old data and overwrite your current active workspace.</p>
                <div className='font-btns'>
                    <label className='fontUp-btn'>
                        <input className='file-input-hidden' type="file" accept=".json" onClick={(e) => { e.target.value = null }} onChange={handleLegacyImport} ref={legacyInputRef} />
                        <h4>Import Legacy JSON</h4>
                    </label>
                </div>
            </Card>
            <Card>
                <h2 className='flex sg-title'><Palette /> Aesthetics and Theme</h2>
                <p>Dark Themes</p>
                <div className='theme-btn-box'>
                    {DARK_THEMES.map((theme, i) => (
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
                    {LIGHT_THEMES.map((theme, i) => (
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
                    <label className='selector-name'>Background</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.bg, '#0b0f19')} onChange={(e) => updateConfig({ colors: { ...colors, bg: e.target.value } })} />

                    <label className='selector-name'>Surface 1 (Cards)</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.s1, '#151a28')} onChange={(e) => updateConfig({ colors: { ...colors, s1: e.target.value } })} />

                    <label className='selector-name'>Surface 4 (Input)</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.s4, '#12121c')} onChange={(e) => updateConfig({ colors: { ...colors, s4: e.target.value } })} />

                    <label className='selector-name'>Text Primary</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.font, '#ffffff')} onChange={(e) => updateConfig({ colors: { ...colors, font: e.target.value } })} />

                    <label className='selector-name'>Accent Glow</label>
                    <input type='color' className='color-selector' value={getSafeColor(colors.glow, '#1a1638')} onChange={(e) => updateConfig({ colors: { ...colors, glow: e.target.value } })} />
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
