import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Input from '../../UI/Input/Input.jsx';
import './systemtab.css';
import { Palette, CaseLower, Database, ToggleLeft, Globe, Type, Code, Copy, Check } from 'lucide-react';
import { useConfigStore, INITIAL_CONFIG } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { CONLANG_ICONS, getConlangIcon } from '../../../utils/iconMap.jsx';
import opentype from 'opentype.js';
import { DARK_THEMES, LIGHT_THEMES, PRIDE_THEMES_DARK, PRIDE_THEMES_LIGHT } from '../../../utils/themePresets.js';
import { UI_FONTS } from '../../../utils/uiFonts.js';
import Modal from '../../UI/Modal/Modal.jsx';
import { Info, User } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient.js';
import { sanitizeConfig } from '../../../utils/schemaValidator.jsx';
import toast from 'react-hot-toast';

export default function SystemTab() {

    const navigate = useNavigate();

    const colors = useConfigStore((state) => state.colors) || {};
    const conlangName = useConfigStore((state) => state.conlangName) || 'MyConlang';
    const authorName = useConfigStore((state) => state.authorName) || '';
    const description = useConfigStore((state) => state.description) || '';
    const customFontBase64 = useConfigStore((state) => state.customFontBase64);
    const customFont = useConfigStore((state) => state.customFont);
    const customGlyphs = useConfigStore((state) => state.customGlyphs) || {};
    const autoReturnToLexicon = useConfigStore((state) => state.autoReturnToLexicon);
    const suppressDuplicateWarnings = useConfigStore((state) => state.suppressDuplicateWarnings);
    const isPublic = useConfigStore((state) => state.isPublic) || false;
    const conlangIcon = useConfigStore((state) => state.conlangIcon) || 'Globe';
    const floatingBackground = useConfigStore((state) => state.floatingBackground) || { enabled: true, global: false, type: 'greetings' };
    const setFullConfig = useConfigStore((state) => state.setFullConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const customLabels = useConfigStore((state) => state.customLabels) || {};
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    const fileInputRef = useRef(null);
    const legacyInputRef = useRef(null);
    const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);

    const [copiedSnippet, setCopiedSnippet] = React.useState('');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const currentProjectId = useConfigStore((state) => state.projectId);

    const handleCopySnippet = (code, id) => {
        navigator.clipboard.writeText(code);
        setCopiedSnippet(id);
        setTimeout(() => setCopiedSnippet(''), 2000);
    };


    const applyThemePreset = (preset) => {
        // Fully replace colors with preset to avoid stale keys from previous themes
        updateConfig({ colors: preset });
    };

    const handleManualUpdatePublic = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error("You're not logged in");
            return;
        }

        const toastId = toast.loading("Updating public conlang...");
        const currentStore = useConfigStore.getState();
        const currentProjectId = currentStore.projectId;
        if (!currentProjectId) {
            toast.error("Project ID missing", { id: toastId });
            return;
        }

        const configData = sanitizeConfig(currentStore, true);
        const payload = {
            dictionary: useLexiconStore.getState().lexicon || [],
            config: configData,
            wiki: configData.wikiPages || {}
        };

        try {
            // SEC: Before upserting, verify that this project_id doesn't belong to another user
            if (session?.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .single();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== session.user.id) {
                    toast.error("You cannot update a public project owned by another account.", { id: toastId });
                    return;
                }
            }

            await supabase.from('conlang_snapshots').upsert({
                user_id: session.user.id,
                project_id: currentProjectId,
                project_data: payload
            }, { onConflict: 'project_id' });
            
            await supabase.from('conlangs').upsert({
                user_id: session.user.id,
                project_id: currentProjectId,
                project_data: payload
            }, { onConflict: 'project_id' });

            toast.success("Public conlang updated!", { id: toastId });
        } catch (err) {
            console.error("Update failed", err);
            toast.error("Failed to update public conlang", { id: toastId });
        }
    };

    const handleVisibilityToggle = async (e) => {
        const checked = e.target.checked;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error("You're not logged in");
            return;
        }

        const toastId = toast.loading(checked ? "Publishing conlang..." : "Making conlang private...");
        
        // Update local state
        updateConfig({ isPublic: checked });

        const currentStore = useConfigStore.getState();
        const currentProjectId = currentStore.projectId;
        
        if (!currentProjectId) {
            toast.error("Project ID missing", { id: toastId });
            updateConfig({ isPublic: !checked }); // revert
            return;
        }

        const configData = sanitizeConfig({ ...currentStore, isPublic: checked }, true);
        const payload = {
            dictionary: useLexiconStore.getState().lexicon || [],
            config: configData,
            wiki: configData.wikiPages || {},
            last_updated: new Date().toISOString()
        };

        try {
            if (session?.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .single();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== session.user.id) {
                    toast.error("You cannot update a public project owned by another account.", { id: toastId });
                    updateConfig({ isPublic: !checked }); // revert
                    return;
                }
            }

            if (checked) {
                const { error: err1 } = await supabase.from('conlang_snapshots').upsert({
                    user_id: session.user.id,
                    project_id: currentProjectId,
                    project_data: payload
                }, { onConflict: 'project_id' });
                if (err1) throw err1;
            } else {
                const { data: dDel, error: errDel } = await supabase.from('conlang_snapshots').delete().eq('project_id', currentProjectId).select();
                if (errDel) throw errDel;
                // If deletion fails due to missing DELETE RLS policy, fallback to an update setting isPublic to false
                if (!dDel || dDel.length === 0) {
                    await supabase.from('conlang_snapshots').update({
                        project_data: {
                            ...payload,
                            config: {
                                ...payload.config,
                                isPublic: false
                            }
                        }
                    }).eq('project_id', currentProjectId);
                }
            }

            const { error: err2 } = await supabase.from('conlangs').upsert({
                user_id: session.user.id,
                project_id: currentProjectId,
                project_data: payload
            }, { onConflict: 'project_id' });

            if (err2) throw err2;

            // Also update the local archive so this persists across reloads/switches
            const projectStore = (await import('../../../store/useProjectStore.jsx')).useProjectStore.getState();
            projectStore.saveProjectToArchive(payload.config, payload.dictionary);

            toast.success(checked ? "Conlang published!" : "Conlang is now private", { id: toastId });
        } catch (err) {
            console.error("Update failed", err);
            toast.error("Failed to update visibility", { id: toastId });
            updateConfig({ isPublic: !checked }); // revert
        }
    };

    const handleIconChange = async (iconName) => {
        updateConfig({ conlangIcon: iconName });
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
                    alert(`Project imported successfully!\n${wordCount} lexicon entries loaded.\n${projectCount} project(s) restored to your workspace archive.`);
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

                alert("Legacy project imported successfully! Your grammar and lexicon are now updated.");

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
                <h2 className='flex sg-title'><Globe /> Visibility & Sharing</h2>
                <p>
                    Make your conlang public so others can see it in the Explore tab. 
                    Anyone with the link can view your dictionary and grammar rules.
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={isPublic} 
                            onChange={handleVisibilityToggle} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>Publicly Visible</span>
                    </label>
                </div>
                
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Conlang Icon</label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginBottom: '0.5rem' }}>Pick an icon to represent your conlang in your workspaces.</p>
                    
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', 
                        gap: '0.5rem',
                        maxWidth: '100%'
                    }}>
                        {Object.keys(CONLANG_ICONS).map(iconName => (
                            <button
                                key={iconName}
                                onClick={() => handleIconChange(iconName)}
                                title={iconName}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0.5rem',
                                    background: conlangIcon === iconName ? 'var(--acc)' : 'var(--s1)',
                                    color: conlangIcon === iconName ? '#fff' : 'var(--tx)',
                                    border: `1px solid ${conlangIcon === iconName ? 'var(--acc)' : 'var(--bd)'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {getConlangIcon(iconName, 18)}
                            </button>
                        ))}
                    </div>
                </div>

                {isPublic && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ marginTop: '0.5rem' }}>
                            <Button variant="primary" onClick={handleManualUpdatePublic} style={{ width: '100%' }}>
                                <Globe size={16} /> Update Public Conlang
                            </Button>
                            <p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '0.5rem', textAlign: 'center' }}>
                                Click this button whenever you add new words or change settings to update your public page.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <h2 className='flex sg-title'><Code /> API Integrations</h2>
                <p>
                    Access your lexicon in real-time from Obsidian, Notion, desktop apps, or custom scripts using our read-only API. 
                    Your language must be marked as <b>Publicly Visible</b> and <b>Updated</b> for the API to fetch the latest data.
                </p>
                
                {(!isPublic || !currentProjectId) ? (
                    <div style={{ marginTop: '1rem', padding: '15px', background: 'var(--s1)', borderRadius: 'var(--rad-sm)', border: '1px dashed var(--bd)' }}>
                        <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', textAlign: 'center' }}>
                            ⚠️ You must make your conlang public (in the Visibility card above) to enable API access.
                        </p>
                    </div>
                ) : (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        
                        <div style={{ background: 'var(--s1)', padding: '15px', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Direct API Endpoint (GET)</span>
                                <button className="btn-link" onClick={() => handleCopySnippet(`${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data`, 'url')} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {copiedSnippet === 'url' ? <Check size={14} /> : <Copy size={14} />} {copiedSnippet === 'url' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <code style={{ fontSize: '0.8rem', color: 'var(--acc)', wordBreak: 'break-all' }}>
                                {`${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data`}
                            </code>
                            <p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '8px' }}>
                                Requires the apikey header below.
                            </p>
                        </div>

                        <div style={{ background: 'var(--s1)', padding: '15px', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>cURL Example</span>
                                <button className="btn-link" onClick={() => handleCopySnippet(`curl -X GET '${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data' \\\n-H 'apikey: ${supabaseAnonKey}'`, 'curl')} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {copiedSnippet === 'curl' ? <Check size={14} /> : <Copy size={14} />} {copiedSnippet === 'curl' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <pre style={{ fontSize: '0.8rem', color: 'var(--tx2)', whiteSpace: 'pre-wrap', background: 'var(--s2)', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
{`curl -X GET '${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data' \\
-H 'apikey: ${supabaseAnonKey}'`}
                            </pre>
                        </div>

                        <div style={{ background: 'var(--s1)', padding: '15px', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>JavaScript (Fetch)</span>
                                <button className="btn-link" onClick={() => handleCopySnippet(`const fetchDictionary = async () => {\n  const res = await fetch('${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data', {\n    headers: { 'apikey': '${supabaseAnonKey}' }\n  });\n  const data = await res.json();\n  console.log(data[0].project_data.dictionary);\n};`, 'js')} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {copiedSnippet === 'js' ? <Check size={14} /> : <Copy size={14} />} {copiedSnippet === 'js' ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <pre style={{ fontSize: '0.8rem', color: 'var(--tx2)', whiteSpace: 'pre-wrap', background: 'var(--s2)', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
{`const fetchDictionary = async () => {
  const res = await fetch('${supabaseUrl}/rest/v1/conlang_snapshots?project_id=eq.${currentProjectId}&select=project_data', {
    headers: { 'apikey': '${supabaseAnonKey}' }
  });
  const data = await res.json();
  const lexicon = data[0].project_data.dictionary;
  console.log(lexicon);
};`}
                            </pre>
                        </div>

                    </div>
                )}
            </Card>

            <Card>
                <h2 className='flex sg-title'><Type /> App Typography</h2>
                <p>
                    Choose the font family used for the application's interface. 
                    This does not affect how your conlang dictionary words are rendered.
                </p>
                <div style={{ marginTop: '1rem' }}>
                    <select 
                        value={useConfigStore(state => state.appUiFont) || "'Outfit', sans-serif"}
                        onChange={(e) => updateConfig({ appUiFont: e.target.value })}
                        style={{ 
                            padding: '0.75rem', 
                            borderRadius: 'var(--rad-sm)', 
                            border: '1px solid var(--bd)', 
                            background: 'var(--s1)', 
                            color: 'var(--tx)',
                            width: '100%',
                            maxWidth: '300px',
                            fontFamily: useConfigStore(state => state.appUiFont) || "'Outfit', sans-serif"
                        }}
                    >
                        {UI_FONTS.map((font) => (
                            <option key={font.name} value={`'${font.name}', ${font.category}`}>
                                {font.name}
                            </option>
                        ))}
                    </select>
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
                <p>Customize the look and feel of the app.</p>
                <Button variant="primary" onClick={() => setIsThemeModalOpen(true)} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    Open Theme Gallery
                </Button>
                
                <Modal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} title="Theme Gallery">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Dark Themes</p>
                            <div className='theme-btn-box'>
                                {DARK_THEMES.map((theme, i) => (
                                    <button
                                        key={`dark-${i}`}
                                        title={theme.name}
                                        onClick={() => { applyThemePreset(theme.colors); setIsThemeModalOpen(false); }}
                                        className="theme-btn"
                                        style={{ background: theme.preview }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Light Themes</p>
                            <div className='theme-btn-box'>
                                {LIGHT_THEMES.map((theme, i) => (
                                    <button
                                        key={`light-${i}`}
                                        title={theme.name}
                                        onClick={() => { applyThemePreset(theme.colors); setIsThemeModalOpen(false); }}
                                        className="theme-btn"
                                        style={{ background: theme.preview }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Dark Pride Flags</p>
                            <div className='theme-btn-box'>
                                {PRIDE_THEMES_DARK.map((theme, i) => (
                                    <button
                                        key={`pride-dark-${i}`}
                                        title={theme.name}
                                        onClick={() => { applyThemePreset(theme.colors); setIsThemeModalOpen(false); }}
                                        className="theme-btn"
                                        style={{ background: theme.preview }}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Light Pride Flags</p>
                            <div className='theme-btn-box'>
                                {PRIDE_THEMES_LIGHT.map((theme, i) => (
                                    <button
                                        key={`pride-light-${i}`}
                                        title={theme.name}
                                        onClick={() => { applyThemePreset(theme.colors); setIsThemeModalOpen(false); }}
                                        className="theme-btn"
                                        style={{ background: theme.preview }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </Modal>
                <br />
                <h2>Custom Theme</h2>
                <div className='pick-colors' style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {[
                        { key: 'bg', label: 'Background', fallback: '#0b0f19' },
                        { key: 'header', label: 'Navbar / Header', fallback: '#080812' },
                        { key: 's1', label: 'Surface 1 (Cards)', fallback: '#151a28' },
                        { key: 's2', label: 'Surface 2 (Sidebar)', fallback: '#1a2033' },
                        { key: 's3', label: 'Surface 3 (Hover)', fallback: '#1f283d' },
                        { key: 's4', label: 'Surface 4 (Input)', fallback: '#12121c' },
                        { key: 'font', label: 'Text Primary', fallback: '#f8fafc' },
                        { key: 'font2', label: 'Text Secondary', fallback: '#94a3b8' },
                        { key: 'accent', label: 'Accent Primary', fallback: '#7c3aed' },
                        { key: 'accent2', label: 'Accent Hover', fallback: '#8b5cf6' },
                        { key: 'accent3', label: 'Accent Dark', fallback: '#4c1d95' },
                        { key: 'border', label: 'Border', fallback: '#334155' },
                        { key: 'glow', label: 'Accent Glow', fallback: '#1a1638' },
                    ].map(({ key, label, fallback }) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label className='selector-name'>{label}</label>
                            <input 
                                type='color' 
                                className='color-selector' 
                                style={{ width: '100%' }}
                                value={getSafeColor(colors[key], fallback)} 
                                onChange={(e) => updateConfig({ colors: { ...colors, [key]: e.target.value } })} 
                            />
                        </div>
                    ))}
                </div>

                <br />
                <hr style={{ borderColor: 'var(--bd)', margin: '1rem 0' }} />
                <h2>Dynamic Background</h2>
                <p>Customize the animated floating background.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={floatingBackground.enabled} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, enabled: e.target.checked } })} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>Enable Background Animation</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={floatingBackground.global} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, global: e.target.checked } })} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>Show on All Tabs (Not just Home)</span>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 600 }}>Background Style</label>
                        <select 
                            value={floatingBackground.type} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, type: e.target.value } })}
                            style={{ padding: '0.5rem', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}
                        >
                            <option value="greetings">Greetings (Olá, Hello, Hola...)</option>
                            <option value="clouds">Clouds ☁️</option>
                            <option value="hearts">Hearts ❤️</option>
                            <option value="stars">Stars ⭐</option>
                            <option value="geometry">Geometry ▲■●</option>
                            <option value="nature">Nature 🌿</option>
                            <option value="magic">Magic ✨</option>
                            <option value="music">Music 🎵</option>
                            <option value="lexicon_words">Your Custom Lexicon Words ✨</option>
                        </select>
                    </div>
                </div>

            </Card>

            <Card>
                <h2 className='flex sg-title'><Type /> Terminology & Labels</h2>
                <p>Customize the terminology used throughout the app to match your worldbuilding project. Leave a field blank to use the default name.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    
                    <Input 
                        label="App Title"
                        placeholder="ConlangEngine" 
                        value={customLabels.appTitle || ''}
                        onChange={(e) => updateConfig({ customLabels: { ...(useConfigStore.getState().customLabels || {}), appTitle: e.target.value } })}
                    />

                    {[
                        "Workspace", "Lexicon", "Linguistics", "Resources", "Help",
                        "Home", "Conlangs", "Settings", "Create Word", "Semantic Explorer",
                        "Generator", "Orthography & Numbers", "Analyzer", "Root Map", 
                        "Sentence Mapper", "Reader", "Library & Writing", "Study & Flashcards", "Help & Info"
                    ].map(label => (
                        <Input 
                            key={label}
                            label={label}
                            placeholder={label} 
                            value={customLabels[label] || ''}
                            onChange={(e) => updateConfig({ customLabels: { ...(useConfigStore.getState().customLabels || {}), [label]: e.target.value } })}
                        />
                    ))}
                </div>
            </Card>

            <Card>
                <h2 className='flex sg-title'><ToggleLeft /> Workflow Preferences</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        <input 
                            type="checkbox" 
                            style={{ width: '18px', height: '18px', accentColor: 'var(--acc)', cursor: 'pointer' }}
                            checked={!!autoReturnToLexicon}
                            onChange={(e) => updateConfig({ autoReturnToLexicon: e.target.checked })}
                        />
                        Auto-return to Lexicon after word creation
                    </label>
                    <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginLeft: '26px' }}>
                        If enabled, the app will automatically navigate back to the dictionary view after you successfully save a new root in the Create Word tab.
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        <input 
                            type="checkbox" 
                            style={{ width: '18px', height: '18px', accentColor: 'var(--acc)', cursor: 'pointer' }}
                            checked={!!suppressDuplicateWarnings}
                            onChange={(e) => updateConfig({ suppressDuplicateWarnings: e.target.checked })}
                        />
                        Suppress duplicate word/translation warnings during creation
                    </label>
                    <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginLeft: '26px' }}>
                        If enabled, the app will skip the blocking toast warning when creating duplicate words or translations (homophones/synonyms).
                    </p>
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
