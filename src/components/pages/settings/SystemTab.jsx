import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Input from '../../UI/Input/Input.jsx';
import './systemtab.css';
import { Palette, CaseLower, Database, ToggleLeft, Globe, Type, Code, Copy, Check, Languages, Search, X, Sliders, Share2, Download, Upload, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { useConfigStore, INITIAL_CONFIG } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { CONLANG_ICONS, CONLANG_ICON_CATEGORIES, getConlangIcon } from '../../../utils/iconMap.jsx';
import { 
    DARK_THEMES, 
    LIGHT_THEMES, 
    PRIDE_THEMES_DARK, 
    PRIDE_THEMES_LIGHT, 
    encodeThemeCode, 
    decodeThemeCode, 
    exportThemeJSON, 
    parseThemeJSON 
} from '../../../utils/themePresets.js';
import { UI_FONTS } from '../../../utils/uiFonts.js';
import Modal from '../../UI/Modal/Modal.jsx';
import { Info, User } from 'lucide-react';
import { supabase } from '../../../utils/supabaseClient.js';
import toast from 'react-hot-toast';
import { useSharing } from '../../../hooks/useSharing.jsx';
import { containsCustomGlyph } from '../../../utils/scriptResolver.js';

export default function SystemTab() {

    const navigate = useNavigate();
    const { t, currentLang, setLanguage, languages } = useTranslation();

    const colors = useConfigStore((state) => state.colors) || {};
    const autoReturnToLexicon = useConfigStore((state) => state.autoReturnToLexicon);
    const suppressDuplicateWarnings = useConfigStore((state) => state.suppressDuplicateWarnings);
    const isPublic = useConfigStore((state) => state.isPublic) || false;
    const conlangIcon = useConfigStore((state) => state.conlangIcon) || 'Globe';
    const floatingBackground = useConfigStore((state) => state.floatingBackground) || { enabled: true, global: false, type: 'greetings' };
    const setFullConfig = useConfigStore((state) => state.setFullConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const customLabels = useConfigStore((state) => state.customLabels) || {};
    const customGlyphs = useConfigStore((state) => state.customGlyphs) || {};
    const scriptDataById = useConfigStore((state) => state.scriptDataById) || {};
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    const fileInputRef = useRef(null);
    const legacyInputRef = useRef(null);
    const uiDensity = useConfigStore((state) => state.uiDensity) || 'default';
    const uiRadius = useConfigStore((state) => state.uiRadius) || 'modern';
    const uiPattern = useConfigStore((state) => state.uiPattern) || 'none';
    const linkThemeToConlang = useConfigStore((state) => state.linkThemeToConlang) || false;
    const appUiFont = useConfigStore((state) => state.appUiFont) || "'Outfit', sans-serif";
    const conlangName = useConfigStore((state) => state.conlangName) || 'My Conlang';

    const [isThemeModalOpen, setIsThemeModalOpen] = React.useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [themeSearchQuery, setThemeSearchQuery] = React.useState('');
    const [themeFilterCategory, setThemeFilterCategory] = React.useState('all');
    const [themeCodeInput, setThemeCodeInput] = React.useState('');
    const [importPreview, setImportPreview] = React.useState(null);
    const [importError, setImportError] = React.useState('');
    const [hasCopiedTheme, setHasCopiedTheme] = React.useState(false);
    const themeFileInputRef = useRef(null);
    const [session, setSession] = React.useState(null);

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
    }, []);

    const { handlePushToCloud } = useSharing(session);

    const [copiedSnippet, setCopiedSnippet] = React.useState('');
    const [iconSearch, setIconSearch] = React.useState('');
    const [selectedIconCategory, setSelectedIconCategory] = React.useState('all');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const currentProjectId = useConfigStore((state) => state.projectId);

    const allThemesList = React.useMemo(() => {
        const list = [];
        DARK_THEMES.forEach(t => list.push({ ...t, category: 'dark' }));
        LIGHT_THEMES.forEach(t => list.push({ ...t, category: 'light' }));
        PRIDE_THEMES_DARK.forEach(t => list.push({ ...t, category: 'pride', sub: 'Dark Pride' }));
        PRIDE_THEMES_LIGHT.forEach(t => list.push({ ...t, category: 'pride', sub: 'Light Pride' }));
        return list;
    }, []);

    const themeCategoryCounts = React.useMemo(() => ({
        all: allThemesList.length,
        dark: allThemesList.filter(t => t.category === 'dark').length,
        light: allThemesList.filter(t => t.category === 'light').length,
        pride: allThemesList.filter(t => t.category === 'pride').length,
    }), [allThemesList]);

    const filteredThemes = React.useMemo(() => {
        return allThemesList.filter(t => {
            if (themeFilterCategory !== 'all' && t.category !== themeFilterCategory) {
                return false;
            }
            if (themeSearchQuery.trim()) {
                const q = themeSearchQuery.trim().toLowerCase();
                return t.name.toLowerCase().includes(q);
            }
            return true;
        });
    }, [allThemesList, themeFilterCategory, themeSearchQuery]);

    const isThemeCurrent = (themeColors) => {
        if (!colors || !themeColors) return false;
        return colors.bg === themeColors.bg && colors.accent === themeColors.accent;
    };

    const handleCopyThemeCode = () => {
        try {
            const code = encodeThemeCode({
                name: `${conlangName} Theme`,
                colors,
                appUiFont,
                uiDensity,
                uiRadius,
                uiPattern
            });
            navigator.clipboard.writeText(code);
            setHasCopiedTheme(true);
            setTimeout(() => setHasCopiedTheme(false), 2000);
            toast.success(t('settings.system.themeCodeCopied', 'Theme code copied to clipboard!'));
        } catch (e) {
            console.error('Failed to encode theme:', e);
            toast.error('Failed to copy theme code');
        }
    };

    const handleExportThemeFile = () => {
        try {
            exportThemeJSON({
                name: `${conlangName} Theme`,
                colors,
                appUiFont,
                uiDensity,
                uiRadius,
                uiPattern
            });
            toast.success(t('settings.system.themeFileDownloaded', 'Theme JSON downloaded!'));
        } catch (e) {
            console.error('Failed to export theme:', e);
            toast.error('Failed to export theme file');
        }
    };

    const handleThemeCodeInputChange = (e) => {
        const val = e.target.value;
        setThemeCodeInput(val);
        setImportError('');
        if (!val.trim()) {
            setImportPreview(null);
            return;
        }
        try {
            const decoded = decodeThemeCode(val.trim());
            setImportPreview(decoded);
        } catch (err) {
            setImportPreview(null);
            setImportError(err.message);
        }
    };

    const handleThemeFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = parseThemeJSON(evt.target.result);
                setImportPreview(parsed);
                setImportError('');
                toast.success('Theme file parsed successfully');
            } catch (err) {
                setImportError(err.message || 'Invalid theme file format');
                setImportPreview(null);
            } finally {
                if (themeFileInputRef.current) themeFileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleApplyImportedTheme = () => {
        if (!importPreview || !importPreview.colors) return;
        const patch = { colors: importPreview.colors };
        if (importPreview.appUiFont) patch.appUiFont = importPreview.appUiFont;
        if (importPreview.uiDensity) patch.uiDensity = importPreview.uiDensity;
        if (importPreview.uiRadius) patch.uiRadius = importPreview.uiRadius;
        if (importPreview.uiPattern) patch.uiPattern = importPreview.uiPattern;
        updateConfig(patch);
        setIsImportModalOpen(false);
        setThemeCodeInput('');
        setImportPreview(null);
        toast.success(t('settings.system.themeImportSuccess', 'Theme applied successfully!'));
    };

    const filteredConlangIcons = React.useMemo(() => {
        let baseList = Object.keys(CONLANG_ICONS);
        if (selectedIconCategory !== 'all') {
            const cat = CONLANG_ICON_CATEGORIES.find(c => c.id === selectedIconCategory);
            if (cat?.icons) {
                baseList = cat.icons;
            }
        }
        if (iconSearch.trim()) {
            const q = iconSearch.trim().toLowerCase();
            return baseList.filter(name => name.toLowerCase().includes(q));
        }
        return baseList;
    }, [iconSearch, selectedIconCategory]);

    const hasMatchesInOtherCategories = React.useMemo(() => {
        if (!iconSearch.trim() || selectedIconCategory === 'all') return false;
        if (filteredConlangIcons.length > 0) return false;
        const q = iconSearch.trim().toLowerCase();
        return Object.keys(CONLANG_ICONS).some(name => name.toLowerCase().includes(q));
    }, [iconSearch, selectedIconCategory, filteredConlangIcons]);

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
        if (!session) {
            toast.error("You're not logged in");
            return;
        }
        await handlePushToCloud(true);
    };

    const handleVisibilityToggle = async (e) => {
        const checked = e.target.checked;
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

        try {
            if (checked) {
                // Publish using the central compressed push logic
                const success = await handlePushToCloud(false);
                if (!success) {
                    throw new Error("Failed to sync project to cloud.");
                }
            } else {
                // Delete from explore
                const { data: dDel, error: errDel } = await supabase.from('conlang_snapshots').delete().eq('project_id', currentProjectId).select();
                if (errDel) throw errDel;
                
                // If deletion fails due to missing DELETE RLS policy, fallback to an update setting isPublic to false
                if (!dDel || dDel.length === 0) {
                    // Update main conlangs table to make it private
                    const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).maybeSingle();
                    if (existingConlang && existingConlang.project_data) {
                        const updatedPayload = {
                            ...existingConlang.project_data,
                            config: {
                                ...existingConlang.project_data.config,
                                isPublic: false
                            }
                        };
                        await supabase.from('conlangs').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                        await supabase.from('conlang_snapshots').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                    }
                } else {
                     // Update main conlangs table to make it private
                     const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).maybeSingle();
                     if (existingConlang && existingConlang.project_data) {
                         const updatedPayload = {
                             ...existingConlang.project_data,
                             config: {
                                 ...existingConlang.project_data.config,
                                 isPublic: false
                             }
                         };
                         await supabase.from('conlangs').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                     }
                }
            }

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

    const _handleFontUpload = (event) => {
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

    const _handleClearFont = () => {
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
                    const importedPhrases = projectData.phrases || oldData.phrases || (oldData.lexicon && oldData.lexicon.phrases) || [];
                    useLexiconStore.getState().setPhrases(importedPhrases);

                    // Restore ALL archived projects so multi-project exports are fully preserved
                    const projectStore = useProjectStore.getState();
                    oldData.project.localProjects.forEach(proj => {
                        if (proj.id && proj.project_data) {
                            projectStore.saveProjectToArchive(
                                proj.project_data.config,
                                proj.project_data.dictionary || [],
                                proj.project_data.phrases || []
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
                <h2 className='flex sg-title'><Globe /> {t('settings.system.visibilityTitle')}</h2>
                <p>
                    {t('settings.system.visibilityDesc')}
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={isPublic} 
                            onChange={handleVisibilityToggle} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>{t('settings.system.publiclyVisible')}</span>
                    </label>
                </div>
                
                <div className="conlang-icon-picker-section">
                    <div className="conlang-icon-header">
                        <div>
                            <div className="conlang-icon-label">{t('settings.system.conlangIcon')}</div>
                            <p className="conlang-icon-desc">{t('settings.system.conlangIconDesc')}</p>
                        </div>
                        <div className="conlang-icon-selected-badge" title={`Current icon: ${conlangIcon}`}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('settings.system.selectedIcon') || 'Selected'}:
                            </span>
                            {getConlangIcon(conlangIcon, 16)}
                            <span style={{ fontWeight: 600 }}>{conlangIcon}</span>
                        </div>
                    </div>

                    <div className="conlang-icon-controls">
                        <div className="conlang-icon-search-box">
                            <Search size={14} className="conlang-icon-search-icon" />
                            <input
                                type="text"
                                className="conlang-icon-search-input"
                                placeholder={t('settings.system.searchIcons') || 'Search 120+ icons...'}
                                value={iconSearch}
                                onChange={(e) => setIconSearch(e.target.value)}
                            />
                            {iconSearch && (
                                <button
                                    type="button"
                                    className="conlang-icon-clear-btn"
                                    onClick={() => setIconSearch('')}
                                    title="Clear search"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        <div className="conlang-icon-categories" role="tablist">
                            {CONLANG_ICON_CATEGORIES.map(cat => {
                                const isActive = selectedIconCategory === cat.id;
                                const label = t(cat.labelKey) || cat.fallbackLabel;
                                const count = cat.id === 'all' 
                                    ? Object.keys(CONLANG_ICONS).length 
                                    : (cat.icons?.length || 0);

                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={`conlang-icon-category-chip ${isActive ? 'active' : ''}`}
                                        onClick={() => setSelectedIconCategory(cat.id)}
                                    >
                                        {label} <span className="conlang-icon-chip-count">({count})</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="conlang-icon-grid" role="region" aria-label="Icon selection grid">
                        {filteredConlangIcons.length > 0 ? (
                            filteredConlangIcons.map(iconName => (
                                <button
                                    key={iconName}
                                    type="button"
                                    onClick={() => handleIconChange(iconName)}
                                    title={iconName}
                                    aria-label={iconName}
                                    className={`conlang-icon-btn ${conlangIcon === iconName ? 'active' : ''}`}
                                >
                                    {getConlangIcon(iconName, 18)}
                                </button>
                            ))
                        ) : (
                            <div className="conlang-icon-empty">
                                <p>
                                    {t('settings.system.noIconsFound', { query: iconSearch }) || `No icons found matching "${iconSearch}".`}
                                </p>
                                {hasMatchesInOtherCategories && (
                                    <button
                                        type="button"
                                        className="conlang-icon-empty-btn"
                                        onClick={() => setSelectedIconCategory('all')}
                                    >
                                        Search in all categories
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {isPublic && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ marginTop: '0.5rem' }}>
                            <Button variant="primary" onClick={handleManualUpdatePublic} style={{ width: '100%' }}>
                                <Globe size={16} /> {t('settings.system.updatePublicBtn')}
                            </Button>
                            <p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '0.5rem', textAlign: 'center' }}>
                                {t('settings.system.updatePublicDesc')}
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <h2 className='flex sg-title'><Code /> {t('settings.system.apiTitle')}</h2>
                <p>
                    {t('settings.system.apiDesc')}
                </p>
                
                {(!isPublic || !currentProjectId) ? (
                    <div style={{ marginTop: '1rem', padding: '15px', background: 'var(--s1)', borderRadius: 'var(--rad-sm)', border: '1px dashed var(--bd)' }}>
                        <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', textAlign: 'center' }}>
                            {t('settings.system.apiPublicWarning')}
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
                <h2 className='flex sg-title'><Type /> {t('settings.system.typographyTitle')}</h2>
                <p>
                    {t('settings.system.typographyDesc')}
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
                <h2 className='flex sg-title'><Database /> {t('settings.system.legacyTitle')}</h2>
                <p>{t('settings.system.legacyDesc')}</p>
                <div className='font-btns'>
                    <label className='fontUp-btn'>
                        <input className='file-input-hidden' type="file" accept=".json,application/json,text/plain" onClick={(e) => { e.target.value = null }} onChange={handleLegacyImport} ref={legacyInputRef} />
                        <h4>{t('settings.system.legacyBtn')}</h4>
                    </label>
                </div>
            </Card>

            <Card>
                <h2 className='flex sg-title'><Languages /> {t('settings.languageTitle')}</h2>
                <p>{t('settings.languageDesc')}</p>
                <div className="lang-selector-grid">
                    {languages.map((lang) => {
                        const isSelected = currentLang === lang.code;
                        return (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => setLanguage(lang.code)}
                                className={`lang-selector-btn ${isSelected ? 'active' : ''}`}
                            >
                                <div className="lang-selector-meta">
                                    <span className="lang-selector-flag">{lang.flag}</span>
                                    <div>
                                        <div className="lang-selector-name">{lang.nativeName}</div>
                                        <div className="lang-selector-sub">{lang.name}</div>
                                    </div>
                                </div>
                                {isSelected && <Check size={16} color="var(--acc)" />}
                            </button>
                        );
                    })}
                </div>
            </Card>

            <Card>
                <h2 className='flex sg-title'><Palette /> {t('settings.themeTitle')}</h2>
                <p>{t('settings.themeDesc')}</p>

                <div className="theme-actions-bar">
                    <Button variant="primary" onClick={() => setIsThemeModalOpen(true)}>
                        <Palette size={16} /> {t('settings.openThemeGallery')} ({allThemesList.length})
                    </Button>
                    <Button variant="secondary" onClick={handleCopyThemeCode}>
                        {hasCopiedTheme ? <Check size={16} /> : <Share2 size={16} />} {hasCopiedTheme ? t('settings.copied', 'Copied!') : t('settings.system.copyThemeCode', 'Copy Theme Code')}
                    </Button>
                    <Button variant="secondary" onClick={handleExportThemeFile}>
                        <Download size={16} /> {t('settings.system.exportTheme', 'Export JSON')}
                    </Button>
                    <Button variant="secondary" onClick={() => { setIsImportModalOpen(true); setImportPreview(null); setThemeCodeInput(''); setImportError(''); }}>
                        <Upload size={16} /> {t('settings.system.importTheme', 'Import Theme')}
                    </Button>
                </div>
                
                {/* Visual Theme Gallery Modal */}
                <Modal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} title={t('settings.system.themeGalleryModalTitle')}>
                    <div className="theme-gallery-controls">
                        <div className="theme-gallery-search-bar">
                            <Search size={16} className="theme-gallery-search-icon" />
                            <input
                                type="text"
                                className="theme-gallery-search-input"
                                placeholder={t('settings.system.searchThemesPlaceholder', 'Search themes by name...')}
                                value={themeSearchQuery}
                                onChange={(e) => setThemeSearchQuery(e.target.value)}
                            />
                            {themeSearchQuery && (
                                <button
                                    type="button"
                                    className="theme-gallery-clear-btn"
                                    onClick={() => setThemeSearchQuery('')}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="theme-gallery-filter-pills">
                            {[
                                { id: 'all', label: t('settings.system.allThemes', 'All'), count: themeCategoryCounts.all },
                                { id: 'dark', label: t('settings.system.darkThemes', 'Dark'), count: themeCategoryCounts.dark },
                                { id: 'light', label: t('settings.system.lightThemes', 'Light'), count: themeCategoryCounts.light },
                                { id: 'pride', label: t('settings.system.prideThemes', 'Pride'), count: themeCategoryCounts.pride }
                            ].map(pill => (
                                <button
                                    key={pill.id}
                                    type="button"
                                    className={`theme-filter-pill ${themeFilterCategory === pill.id ? 'active' : ''}`}
                                    onClick={() => setThemeFilterCategory(pill.id)}
                                >
                                    <span>{pill.label}</span>
                                    <span className="theme-filter-pill-count">({pill.count})</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="theme-cards-grid">
                        {filteredThemes.map((theme, i) => {
                            const isCurrent = isThemeCurrent(theme.colors);
                            return (
                                <div
                                    key={`${theme.category}-${theme.name}-${i}`}
                                    className={`theme-card ${isCurrent ? 'active' : ''}`}
                                    onClick={() => {
                                        applyThemePreset(theme.colors);
                                        updateConfig({ theme: theme.category === 'light' ? 'light' : 'dark' });
                                        setIsThemeModalOpen(false);
                                    }}
                                >
                                    <div className="theme-card-preview" style={{ background: theme.colors.bg || theme.preview }}>
                                        <div className="theme-card-mini-nav" style={{ background: theme.colors.header || theme.colors.s1 }}>
                                            <div className="theme-card-mini-dots">
                                                <div className="theme-card-mini-dot" style={{ background: theme.colors.accent }} />
                                                <div className="theme-card-mini-dot" style={{ background: theme.colors.accent2 || theme.colors.font2 }} />
                                            </div>
                                            <div className="theme-card-mini-search" style={{ background: theme.colors.s4 || theme.colors.s2 }} />
                                        </div>
                                        <div className="theme-card-mini-body">
                                            <div className="theme-card-mini-card" style={{ background: theme.colors.s1, borderColor: theme.colors.border }}>
                                                <div className="theme-card-mini-title" style={{ background: theme.colors.font }} />
                                                <div className="theme-card-mini-line" style={{ background: theme.colors.font2 }} />
                                                <div className="theme-card-mini-btn" style={{ background: theme.colors.accent }} />
                                            </div>
                                        </div>
                                        <div className="theme-card-swatches">
                                            <span className="theme-card-swatch" style={{ background: theme.colors.bg }} />
                                            <span className="theme-card-swatch" style={{ background: theme.colors.s1 }} />
                                            <span className="theme-card-swatch" style={{ background: theme.colors.accent }} />
                                            <span className="theme-card-swatch" style={{ background: theme.colors.font }} />
                                        </div>
                                    </div>
                                    <div className="theme-card-footer">
                                        <div className="theme-card-info">
                                            <span className="theme-card-name">{theme.name}</span>
                                            <span className="theme-card-badge">{theme.sub || theme.category}</span>
                                        </div>
                                        {isCurrent ? (
                                            <span className="theme-card-applied">
                                                <Check size={14} /> {t('settings.system.applied', 'Applied')}
                                            </span>
                                        ) : (
                                            <button type="button" className="theme-card-apply-btn">
                                                {t('settings.system.applyBtn', 'Apply')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Modal>

                {/* Import Theme Modal */}
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title={t('settings.system.importThemeTitle', 'Import Custom Theme')}>
                    <div className="theme-import-box">
                        <p>{t('settings.system.importThemeDesc', 'Paste a shareable theme code (starts with ce-theme:...) or upload a theme JSON file.')}</p>

                        <textarea
                            className="theme-code-textarea"
                            placeholder="ce-theme:eyJ2IjoxLCJuYW1lIjoi..."
                            value={themeCodeInput}
                            onChange={handleThemeCodeInputChange}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Button variant="secondary" onClick={() => themeFileInputRef.current?.click()}>
                                <Upload size={14} /> {t('settings.system.uploadThemeFile', 'Upload JSON File')}
                            </Button>
                            <input
                                type="file"
                                ref={themeFileInputRef}
                                accept=".json,application/json"
                                style={{ display: 'none' }}
                                onChange={handleThemeFileUpload}
                            />
                        </div>

                        {importError && (
                            <div className="theme-import-error">
                                {importError}
                            </div>
                        )}

                        {importPreview && (
                            <div className="theme-import-preview-box">
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {importPreview.name || 'Imported Theme'}
                                </span>
                                <div style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>
                                    {importPreview.appUiFont && <div>Font: {importPreview.appUiFont}</div>}
                                    {importPreview.uiDensity && <div>Density: {importPreview.uiDensity}</div>}
                                    {importPreview.uiRadius && <div>Curvature: {importPreview.uiRadius}</div>}
                                    {importPreview.uiPattern && <div>Pattern: {importPreview.uiPattern}</div>}
                                </div>
                                <div className="theme-import-preview-swatches">
                                    {['bg', 's1', 'accent', 'font'].map(k => (
                                        importPreview.colors[k] && (
                                            <span
                                                key={k}
                                                className="theme-import-preview-swatch"
                                                style={{ background: importPreview.colors[k] }}
                                                title={`${k}: ${importPreview.colors[k]}`}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                disabled={!importPreview}
                                onClick={handleApplyImportedTheme}
                            >
                                <Sparkles size={14} /> {t('settings.system.applyImportedTheme', 'Apply Theme')}
                            </Button>
                        </div>
                    </div>
                </Modal>
                <br />
                <h2>{t('settings.system.customThemeTitle')}</h2>
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
                <h2>{t('settings.system.dynamicBgTitle')}</h2>
                <p>{t('settings.system.dynamicBgDesc')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={floatingBackground.enabled} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, enabled: e.target.checked } })} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>{t('settings.system.enableBgAnim')}</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={floatingBackground.global} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, global: e.target.checked } })} 
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 600 }}>{t('settings.system.showAllTabs')}</span>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 600 }}>{t('settings.system.bgStyle')}</label>
                        <select 
                            value={floatingBackground.type} 
                            onChange={(e) => updateConfig({ floatingBackground: { ...floatingBackground, type: e.target.value } })}
                            style={{ padding: '0.5rem', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)', background: 'var(--s1)', color: 'var(--tx)' }}
                        >
                            <option value="greetings">Greetings (Olá, Hello, Hola...)</option>
                            <option value="clouds">Clouds</option>
                            <option value="hearts">Hearts</option>
                            <option value="stars">Stars</option>
                            <option value="geometry">Geometry</option>
                            <option value="nature">Nature</option>
                            <option value="magic">Magic</option>
                            <option value="music">Music</option>
                            <option value="lexicon_words">Your Custom Lexicon Words</option>
                        </select>
                    </div>
                </div>

            </Card>

            <Card>
                <h2 className='flex sg-title'><Sliders /> {t('settings.system.densityTitle', 'UI Density & Corner Geometry')}</h2>
                <p>{t('settings.system.densityDesc', 'Customize information density, border radii, and subtle texture patterns for your preferred workspace aesthetic.')}</p>

                <div className="ui-customization-grid">
                    {/* UI Density */}
                    <div className="ui-metric-group">
                        <label className="ui-metric-label">{t('settings.system.densityLabel', 'Display Density')}</label>
                        <div className="ui-segment-group">
                            {[
                                { id: 'compact', label: t('settings.system.densityCompact', 'Compact'), desc: t('settings.system.densityCompactDesc', 'Tighter table padding, see 2x more lexicon rows') },
                                { id: 'default', label: t('settings.system.densityDefault', 'Default'), desc: t('settings.system.densityDefaultDesc', 'Balanced comfort and spacing') },
                                { id: 'spacious', label: t('settings.system.densitySpacious', 'Spacious'), desc: t('settings.system.densitySpaciousDesc', 'Generous margins and large clickable touch targets') }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className={`ui-segment-btn ${uiDensity === opt.id ? 'active' : ''}`}
                                    onClick={() => updateConfig({ uiDensity: opt.id })}
                                >
                                    <span className="ui-segment-title">{opt.label}</span>
                                    <span className="ui-segment-desc">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Corner Geometry */}
                    <div className="ui-metric-group">
                        <label className="ui-metric-label">{t('settings.system.radiusLabel', 'Corner Curvature')}</label>
                        <div className="ui-segment-group">
                            {[
                                { id: 'sharp', label: t('settings.system.radiusSharp', 'Sharp (2px)'), radius: '2px', desc: t('settings.system.radiusSharpDesc', 'Precision industrial look') },
                                { id: 'modern', label: t('settings.system.radiusModern', 'Modern (14px)'), radius: '10px', desc: t('settings.system.radiusModernDesc', 'Refined standard corners') },
                                { id: 'pill', label: t('settings.system.radiusPill', 'Pill (24px)'), radius: '18px', desc: t('settings.system.radiusPillDesc', 'Smooth, friendly curves') }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className={`ui-segment-btn ${uiRadius === opt.id ? 'active' : ''}`}
                                    onClick={() => updateConfig({ uiRadius: opt.id })}
                                >
                                    <div className="ui-radius-preview" style={{ borderRadius: opt.radius }} />
                                    <span className="ui-segment-title">{opt.label}</span>
                                    <span className="ui-segment-desc">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Background Texture Pattern */}
                    <div className="ui-metric-group">
                        <label className="ui-metric-label">{t('settings.system.patternLabel', 'Background Texture Pattern')}</label>
                        <div className="ui-segment-group">
                            {[
                                { id: 'none', label: t('settings.system.patternNone', 'Clean Solid'), desc: t('settings.system.patternNoneDesc', 'Minimal background without texture') },
                                { id: 'dots', label: t('settings.system.patternDots', 'Subtle Dots'), desc: t('settings.system.patternDotsDesc', 'Discreet architectural dot grid') },
                                { id: 'grid', label: t('settings.system.patternGrid', 'Technical Grid'), desc: t('settings.system.patternGridDesc', 'Subtle engineering grid overlay') },
                                { id: 'cross', label: t('settings.system.patternCross', 'Fine Crosses'), desc: t('settings.system.patternCrossDesc', 'Refined alignment crossmarks') }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className={`ui-segment-btn ${uiPattern === opt.id ? 'active' : ''}`}
                                    onClick={() => updateConfig({ uiPattern: opt.id })}
                                >
                                    <span className="ui-segment-title">{opt.label}</span>
                                    <span className="ui-segment-desc">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conlang Binding Toggle */}
                    <div className="ui-metric-group">
                        <div className="ui-toggle-row">
                            <div>
                                <label className="ui-metric-label" style={{ marginBottom: 2 }}>
                                    {t('settings.system.linkThemeTitle', 'Remember Theme per Conlang')}
                                </label>
                                <p className="ui-toggle-sub">
                                    {t('settings.system.linkThemeDesc', 'Automatically restore this theme, font, density, and curvature when switching to this conlang.')}
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                className="toggle toggle-primary"
                                checked={linkThemeToConlang}
                                onChange={(e) => updateConfig({ linkThemeToConlang: e.target.checked })}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className='flex sg-title'><Type /> {t('settings.terminologyTitle')}</h2>
                <p>{t('settings.terminologyDesc')}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    
                    <Input 
                        label={t('settings.appTitle')}
                        className={containsCustomGlyph(customLabels.appTitle, customGlyphs, scriptDataById) ? "custom-font-text notranslate" : ""}
                        placeholder="ConlangEngine" 
                        value={customLabels.appTitle || ''}
                        onChange={(e) => updateConfig({ customLabels: { ...(useConfigStore.getState().customLabels || {}), appTitle: e.target.value } })}
                    />

                    {[
                        "Workspace", "Lexicon", "Linguistics", "Resources", "Help",
                        "Home", "Conlangs", "Settings", "Create Word", "Semantic Explorer",
                        "Generator", "Orthography & Numbers", "Analyzer", "Root Map", 
                        "Sentence Mapper", "Reader", "Library & Writing", "Study & Flashcards", "Help & Info"
                    ].map(label => {
                        const val = customLabels[label] || '';
                        const hasCustom = containsCustomGlyph(val, customGlyphs, scriptDataById);
                        return (
                            <Input 
                                key={label}
                                label={label}
                                className={hasCustom ? "custom-font-text notranslate" : ""}
                                placeholder={label} 
                                value={val}
                                onChange={(e) => updateConfig({ customLabels: { ...(useConfigStore.getState().customLabels || {}), [label]: e.target.value } })}
                            />
                        );
                    })}
                </div>
            </Card>

            <Card>
                <h2 className='flex sg-title'><ToggleLeft /> {t('settings.workflowPreferences')}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        <input 
                            type="checkbox" 
                            style={{ width: '18px', height: '18px', accentColor: 'var(--acc)', cursor: 'pointer' }}
                            checked={!!autoReturnToLexicon}
                            onChange={(e) => updateConfig({ autoReturnToLexicon: e.target.checked })}
                        />
                        {t('settings.autoReturnToLexicon')}
                    </label>
                    <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginLeft: '26px' }}>
                        {t('settings.system.autoReturnToLexiconDesc')}
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
                        {t('settings.suppressDuplicateWarnings')}
                    </label>
                    <p style={{ color: 'var(--tx2)', fontSize: '0.9rem', marginLeft: '26px' }}>
                        {t('settings.system.suppressDuplicateWarningsDesc')}
                    </p>
                </div>
            </Card>

            <Card>
                <h2>{t('settings.system.dangerTitle')}</h2>
                <p>{t('settings.system.dangerDesc')}</p>
                <Button variant='error' onClick={handleWipeWorkspace}>{t('settings.system.deleteProjectBtn')}</Button>
            </Card>

        </>
    )
}
