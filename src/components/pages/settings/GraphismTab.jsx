import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import { Type, Brush, Trash2, Plus, Monitor } from 'lucide-react';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import SyllabaryManager from '../../UI/SyllabaryManager/SyllabaryManager.jsx';
import BlockManager from '../../UI/BlockManager/BlockManager.jsx';
import KeyboardManager from '../../UI/KeyboardManager/KeyboardManager.jsx';
import { Keyboard, RefreshCw, Wand2, Spline } from 'lucide-react';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import { previewSimplification, simplifyGlyphMap } from '../../../utils/glyphSimplify.js';
import { buildWorkspaceSnapshot, downloadWorkspaceBackup } from '../../../utils/workspaceExport.js';
import GlyphLightenBackupModal from '../../UI/GlyphLightenBackupModal/GlyphLightenBackupModal.jsx';
import { SCRIPT_MAPS } from '../../../utils/transliteration.js';
import { pushProjectToCloud } from '../../../hooks/useSharing.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import './graphismTab.css';

const TYPE_LABELS = {
    alphabetic: 'Alphabetic',
    syllabic: 'Syllabic',
    logographic: 'Logographic',
    featural_block: 'Featural/Block',
};

export default function TypographyStudio() {
    const { t } = useTranslation();
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const typographySettings = useConfigStore(state => state.typographySettings) || { customTypographyModes: [], activeDisplayMode: 'Base' };
    const updateConfig = useConfigStore(state => state.updateConfig);

    // Multi-script wiring. Select the raw value (no `|| []` fallback in the
    // selector — that returns a fresh array each render and trips the
    // exhaustive-deps lint rule for the useMemo below).
    const scriptSystemsRaw = useConfigStore(state => state.scriptSystems);
    const scriptSystems = scriptSystemsRaw || [];
    const scriptDataById = useConfigStore(state => state.scriptDataById) || {};
    const defaultScriptId = useConfigStore(state => state.scriptRules?.defaultScriptId) || 'default';
    const legacyAlphabetGlyphs = useConfigStore(state => state.alphabetGlyphs) || {};
    const legacyAlphabetNames = useConfigStore(state => state.alphabetNames) || {};
    const legacyWritingDirection = useConfigStore(state => state.writingDirection) || 'ltr';
    const legacyPhonologyTypes = useConfigStore(state => state.phonologyTypes);
    const legacyAlphabeticScript = useConfigStore(state => state.alphabeticScript) || 'latin';
    const updateScriptData = useConfigStore(state => state.updateScriptData);
    const updateScriptSystem = useConfigStore(state => state.updateScriptSystem);
    const simplifyAllGlyphs = useConfigStore(state => state.simplifyAllGlyphs);
    const customGlyphs = useConfigStore(state => state.customGlyphs) || {};
    const syllabaryMap = useConfigStore(state => state.syllabaryMap) || {};

    // Track which script is being edited. Default to the project's default script.
    const [editingScriptId, setEditingScriptId] = useState(defaultScriptId);

    // Shared by the per-glyph Lighten button in Font Studio and the bulk
    // "Lighten all glyphs" action below, so both use the same fidelity knob.
    const [glyphLightenTolerance, setGlyphLightenTolerance] = useState(0.5);

    // Repair stale selection if scripts change underneath us.
    const selectedScript = useMemo(() => {
        const list = scriptSystemsRaw || [];
        return list.find(s => s.id === editingScriptId)
            || list.find(s => s.id === defaultScriptId)
            || list[0]
            || null;
    }, [scriptSystemsRaw, editingScriptId, defaultScriptId]);

    const selectedScriptId = selectedScript?.id || defaultScriptId;
    const isDefaultSelected = selectedScriptId === defaultScriptId;
    const hasMultipleScripts = scriptSystems.length > 1;

    // Read script-scoped data. For the default script, fall back to legacy top-level
    // fields so existing single-script projects keep working unchanged.
    const scriptData = scriptDataById[selectedScriptId];
    const alphabetGlyphs = scriptData?.alphabetGlyphs
        || (isDefaultSelected ? legacyAlphabetGlyphs : {})
        || {};
    const alphabetNames = (selectedScript?.alphabetNames && Object.keys(selectedScript.alphabetNames).length > 0)
        ? selectedScript.alphabetNames
        : (isDefaultSelected ? legacyAlphabetNames : {}) || {};
    const writingDirection = selectedScript?.writingDirection
        || (isDefaultSelected ? legacyWritingDirection : 'ltr');
    const scriptType = selectedScript?.type
        || (isDefaultSelected ? legacyPhonologyTypes : 'alphabetic');
    const alphabeticScript = selectedScript?.alphabeticScript
        || (isDefaultSelected ? legacyAlphabeticScript : 'latin');

    const [drawingChar, setDrawingChar] = useState(null);
    const [newMode, setNewMode] = useState('');
    const [editingMode, setEditingMode] = useState('Base');
    const [editingCharName, setEditingCharName] = useState(null);
    const [showKeyboardManager, setShowKeyboardManager] = useState(false);

    const parseChars = (str) => {
        if (!str) return [];
        return str.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => {
                if (s.includes('=')) return s.split('=')[1].trim();
                return s;
            });
    };

    const allChars = useMemo(() => {
        return [
            ...new Set([
                ...parseChars(consonants),
                ...parseChars(vowels),
                ...parseChars(otherPhonemes)
            ])
        ];
    }, [consonants, vowels, otherPhonemes]);

    // Write `alphabetGlyphs` to the selected script's bucket. For the default
    // script we also mirror to the legacy top-level field via updateConfig so
    // existing readers (PublicViewer, transliteration) keep seeing the data.
    const writeAlphabetGlyphs = (nextGlyphs) => {
        updateScriptData(selectedScriptId, { alphabetGlyphs: nextGlyphs });
        if (isDefaultSelected) {
            updateConfig({ alphabetGlyphs: nextGlyphs });
        }
    };

    const updateName = (char, name) => {
        const nextNames = { ...alphabetNames, [char]: name };
        updateScriptSystem(selectedScriptId, { alphabetNames: nextNames });
        if (isDefaultSelected) {
            updateConfig({ alphabetNames: nextNames });
        }
    };

    const handleAddMode = () => {
        const mode = newMode.trim();
        if (!mode) return;
        const currentModes = typographySettings.customTypographyModes || [];
        if (!currentModes.includes(mode) && mode.toLowerCase() !== 'base' && mode.toLowerCase() !== 'uppercase') {
            updateConfig({
                typographySettings: {
                    ...typographySettings,
                    customTypographyModes: [...currentModes, mode]
                }
            });
        }
        setNewMode('');
        setEditingMode(mode);
    };

    const handleRemoveMode = (mode) => {
        const currentModes = typographySettings.customTypographyModes || [];
        updateConfig({
            typographySettings: {
                ...typographySettings,
                customTypographyModes: currentModes.filter(m => m !== mode),
                activeDisplayMode: typographySettings.activeDisplayMode === mode ? 'Base' : typographySettings.activeDisplayMode
            }
        });
        if (editingMode === mode) setEditingMode('Base');
    };

    const handleUpdateDisplayMode = (e) => {
        updateConfig({
            typographySettings: {
                ...typographySettings,
                activeDisplayMode: e.target.value
            }
        });
    };

    const handleWritingDirection = (e) => {
        const next = e.target.value;
        updateScriptSystem(selectedScriptId, { writingDirection: next });
        if (isDefaultSelected) {
            updateConfig({ writingDirection: next });
        }
    };

    const updateGlyph = (char, newCharUnicode) => {
        const key = editingMode === 'Base' ? char : `${char}_${editingMode.toLowerCase()}`;
        writeAlphabetGlyphs({ ...alphabetGlyphs, [key]: newCharUnicode });
        
        // Ensure script-level custom font base64 is refreshed immediately from Zustand
        const latestFont = useConfigStore.getState().customFontBase64;
        if (latestFont) {
            updateScriptData(selectedScriptId, { customFontBase64: latestFont });
        }
        setDrawingChar(null);
    };

    const deleteGlyph = (key) => {
        const newGlyphs = { ...alphabetGlyphs };
        delete newGlyphs[key];
        writeAlphabetGlyphs(newGlyphs);
    };

    /**
     * Rewrites every glyph in the project in a lighter form.
     *
     * This is the migration path for workspaces that already hold hundreds or
     * thousands of glyphs: Font Studio's dense sampling is what makes them
     * large, and it is not obvious to a user that the fix is available. Both
     * the legacy top-level glyphs and every script's own copy are rewritten so
     * the result does not depend on which script happens to be selected.
     *
     * Two stages, because the rewrite is irreversible:
     *   1. analyse, then open the backup modal with the real numbers
     *   2. only once the user has downloaded a backup and confirmed it, apply
     * The apply step is deliberately unreachable from anywhere else.
     */
    const [lightenModal, setLightenModal] = useState(null);
    const [backupInfo, setBackupInfo] = useState(null);
    const [downloadError, setDownloadError] = useState(null);

    const handleLightenAllGlyphs = () => {
        const storeState = useConfigStore.getState();
        const topLevel = storeState.customGlyphs || {};
        const byScript = {};

        // Collect every script that actually owns glyphs.
        for (const [scriptId, data] of Object.entries(storeState.scriptDataById || {})) {
            if (data && data.customGlyphs && Object.keys(data.customGlyphs).length > 0) {
                byScript[scriptId] = data.customGlyphs;
            }
        }

        const all = { ...topLevel, ...Object.assign({}, ...Object.values(byScript)) };
        if (Object.keys(all).length === 0) {
            toast.error(t('settings.graphism.noGlyphsToLighten'));
            return;
        }

        const preview = previewSimplification(all, { tolerance: glyphLightenTolerance, precision: 2 });
        if (preview.beforePoints <= preview.afterPoints || preview.byteReduction <= 0) {
            toast(t('settings.graphism.glyphsCannotBeReducedFurther'));
            return;
        }

        setBackupInfo(null);
        setDownloadError(null);
        setLightenModal({ preview, topLevel, byScript });
    };

    // Builds a full workspace snapshot on demand rather than holding it in
    // state: at this size keeping a second copy of the config in memory for the
    // lifetime of the dialog is not worth it, and the store still holds the
    // original data until the rewrite happens.
    const handleDownloadBackup = () => {
        try {
            const snapshot = buildWorkspaceSnapshot({ exportAll: true });
            const info = downloadWorkspaceBackup(
                snapshot,
                `${snapshot.config?.conlangName || 'MyConlang'}_Backup_BeforeLighten.json`
            );
            setBackupInfo(info);
            setDownloadError(null);
        } catch (err) {
            console.error('Backup download failed:', err);
            setDownloadError(
                t('settings.graphism.backupCreateError')
            );
        }
    };

    const handleCloseLightenModal = () => {
        setLightenModal(null);
        setBackupInfo(null);
        setDownloadError(null);
    };

    const handleConfirmLighten = async () => {
        const tId = toast.loading(t('settings.graphism.toastLighteningGlyphs'));
        try {
            const { topLevel, byScript } = lightenModal;
            const storeState = useConfigStore.getState();

            const simplifiedTopLevel = simplifyGlyphMap(topLevel, { tolerance: glyphLightenTolerance, precision: 2 });
            const simplifiedByScript = {};
            for (const [scriptId, glyphs] of Object.entries(byScript)) {
                simplifiedByScript[scriptId] = simplifyGlyphMap(glyphs, { tolerance: glyphLightenTolerance, precision: 2 });
            }

            // Recompile from the simplified default-script glyphs so the
            // rendered font matches the new stroke data.
            const fontSource = simplifiedByScript[selectedScriptId] || simplifiedTopLevel;
            const settings = storeState.typographySettings || {};
            const base64Font = await compileFont(fontSource, settings.traceWidth ?? 30, settings.customFontScale ?? 1.0);

            // 1. Update active Zustand store and IndexedDB
            simplifyAllGlyphs(simplifiedTopLevel, simplifiedByScript, base64Font);

            // 2. Update local project archive so local storage space is freed
            useProjectStore.getState().saveProjectToArchive(
                useConfigStore.getState(),
                useLexiconStore.getState().lexicon
            );

            // 3. Immediately persist reduced size to cloud database (Supabase: conlangs, conlang_snapshots, conlang_versions)
            const cloudSynced = await pushProjectToCloud(
                null,
                false,
                `Glyphs Lightened (${glyphLightenTolerance}px tolerance)`
            );

            handleCloseLightenModal();
            if (cloudSynced) {
                toast.success(t('settings.graphism.toastGlyphsLightenedSuccess'), { id: tId });
            } else {
                toast.success(t('settings.graphism.toastGlyphsLightenedLocal'), { id: tId });
            }
        } catch (err) {
            console.error('Lighten all glyphs failed:', err);
            toast.error(t('settings.graphism.toastGlyphsLightenedError'), { id: tId });
            handleCloseLightenModal();
        }
    };

    const handleRecompileFont = async () => {
        const tId = toast.loading(t('settings.graphism.toastRecompilingFont'));
        try {
            const storeState = useConfigStore.getState();
            const currentSettings = storeState.typographySettings || {};
            const currentCustomGlyphs = (storeState.scriptDataById?.[selectedScriptId]?.customGlyphs) || storeState.customGlyphs || {};
            const base64Font = await compileFont(
                currentCustomGlyphs, 
                currentSettings.traceWidth ?? 30, 
                currentSettings.customFontScale ?? 1.0
            );
            
            updateScriptData(selectedScriptId, {
                customFontBase64: base64Font
            });
            
            if (isDefaultSelected) {
                updateConfig({
                    customFontBase64: base64Font,
                    customFont: base64Font
                });
            }
            toast.success(t('settings.graphism.toastFontRecompiledSuccess'), { id: tId });
        } catch (err) {
            console.error(err);
            toast.error(t('settings.graphism.toastFontRecompiledError'), { id: tId });
        }
    };

    const unusedGlyphKeys = useMemo(() => {
        const storeState = useConfigStore.getState();
        const activeGlyphs = { ...(storeState.customGlyphs || {}), ...(storeState.scriptDataById?.[editingScriptId]?.customGlyphs || {}) };
        const usedCodes = new Set();

        const checkMap = (mapObj) => {
            if (!mapObj) return;
            Object.values(mapObj).forEach(val => {
                if (typeof val === 'string' && val.length > 0) {
                    const cp = val.codePointAt(0);
                    if (cp) {
                        usedCodes.add(String(cp));
                        usedCodes.add(Number(cp));
                    }
                }
            });
        };

        checkMap(storeState.alphabetGlyphs);
        checkMap(storeState.syllabaryMap);
        Object.values(storeState.scriptDataById || {}).forEach(sData => {
            checkMap(sData?.alphabetGlyphs);
            checkMap(sData?.syllabaryMap);
        });

        const lexicon = useLexiconStore.getState().lexicon || [];
        lexicon.forEach(entry => {
            if (entry.word) {
                usedCodes.add(entry.word.toLowerCase());
            }
            if (entry.ideogram) {
                usedCodes.add(entry.ideogram);
            }
            if (entry.scriptForms) {
                Object.values(entry.scriptForms).forEach(formStr => {
                    if (formStr) usedCodes.add(formStr);
                });
            }
        });

        const unused = [];
        Object.keys(activeGlyphs).forEach(key => {
            const num = Number(key);
            if (!isNaN(num)) {
                if (!usedCodes.has(key) && !usedCodes.has(num)) {
                    unused.push(key);
                }
            } else if (!usedCodes.has(key)) {
                unused.push(key);
            }
        });

        return unused;
    }, [customGlyphs, scriptDataById, editingScriptId, alphabetGlyphs, syllabaryMap]);

    const handleCleanUnusedGlyphs = async (keysToRemove) => {
        if (!keysToRemove || keysToRemove.length === 0) return;
        const removeAction = useConfigStore.getState().removeCustomGlyphs;
        if (removeAction) {
            removeAction(keysToRemove);
        }
        await handleRecompileFont();
    };

    const handleAutoMap = () => {
        const mappingObj = alphabeticScript !== 'custom' && SCRIPT_MAPS[alphabeticScript] ? SCRIPT_MAPS[alphabeticScript] : null;
        
        const newGlyphs = { ...alphabetGlyphs };
        let count = 0;

        allChars.forEach(char => {
            const key = editingMode === 'Base' ? char : `${char}_${editingMode.toLowerCase()}`;
            if (!newGlyphs[key]) {
                const mappedChar = mappingObj ? mappingObj[char] : char;
                if (mappedChar) {
                    newGlyphs[key] = mappedChar;
                    count++;
                }
            }
        });

        if (count > 0) {
            writeAlphabetGlyphs(newGlyphs);
            toast.success(t('settings.graphism.toastAutoMappedSuccess', { count }));
        } else {
            toast(t('settings.graphism.toastNoMissingToMap'), { icon: 'ℹ️' });
        }
    };

    const customModes = (typographySettings.customTypographyModes || []).filter(m => m.toLowerCase() !== 'uppercase' && m.toLowerCase() !== 'base');
    const allModes = ['Base', 'Uppercase', ...customModes];

    return (
        <div className="tab-pane-container">
            {drawingChar && (
                <Modal 
                    isOpen={!!drawingChar} 
                    onClose={() => setDrawingChar(null)}
                    title={t('settings.graphism.drawCustomSymbol')}
                    className="modal-wide"
                >
                    <FontStudioModal
                        targetLabel={t('settings.graphism.letterLabel', { char: drawingChar })}
                        existingCharCode={(() => {
                            const key = editingMode === 'Base' ? drawingChar : `${drawingChar}_${editingMode.toLowerCase()}`;
                            const existingUnicode = alphabetGlyphs[key];
                            return existingUnicode ? existingUnicode.codePointAt(0) : null;
                        })()}
                        onSave={(newCharUnicode) => updateGlyph(drawingChar, newCharUnicode)}
                        onCancel={() => setDrawingChar(null)}
                    />
                </Modal>
            )}

            <Modal 
                isOpen={showKeyboardManager} 
                onClose={() => setShowKeyboardManager(false)}
                title={t('settings.graphism.customKeyboardExporter')}
            >
                <KeyboardManager allChars={allChars} alphabetGlyphs={alphabetGlyphs} />
            </Modal>

            <Infobox title={t('settings.graphism.title')}>
                <span dangerouslySetInnerHTML={{ __html: t('settings.graphism.guideDesc') }} />
            </Infobox>

            {hasMultipleScripts && (
                <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', margin: 0 }}>
                            {t('settings.graphism.editingScript')}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', margin: 0 }}>
                            {t('settings.graphism.editingScriptDesc')}
                        </p>
                    </div>
                    <select
                        className="sg-select"
                        style={{ minWidth: '260px', padding: '0.5rem', marginLeft: 'auto' }}
                        value={selectedScriptId}
                        onChange={(e) => setEditingScriptId(e.target.value)}
                    >
                        {scriptSystems.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name} — {t(`orthography.scriptManager.types.${s.type}`, { defaultValue: TYPE_LABELS[s.type] || s.type })}
                                {s.id === defaultScriptId ? ` (${t('orthography.scriptManager.isDefault').toLowerCase()})` : ''}
                            </option>
                        ))}
                    </select>
                </Card>
            )}

            {scriptType === 'syllabic' && (
                <div className="animate-in fade-in duration-300">
                    <SyllabaryManager scriptId={selectedScriptId} />
                </div>
            )}

            {scriptType === 'featural_block' && (
                <div className="animate-in fade-in duration-300">
                    <BlockManager scriptId={selectedScriptId} />
                </div>
            )}

            <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.writingDirection')}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>{t('settings.graphism.writingDirectionDesc')}</p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={writingDirection}
                            onChange={handleWritingDirection}
                        >
                            <option value="ltr">{t('settings.graphism.dirLtr')}</option>
                            <option value="rtl">{t('settings.graphism.dirRtl')}</option>
                            <option value="vertical-rl">{t('settings.graphism.dirVrl')}</option>
                            <option value="vertical-lr">{t('settings.graphism.dirVlr')}</option>
                        </select>
                    </div>
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--bd)', marginBottom: '1.5rem' }}></div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.typographyModes')}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>{t('settings.graphism.typographyModesDesc')}</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input 
                                type="text" 
                                className="sg-input" 
                                placeholder={t('settings.graphism.newModePlaceholder')}
                                value={newMode}
                                onChange={e => setNewMode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddMode()}
                                style={{ flex: 1 }}
                            />
                            <Button variant="primary" onClick={handleAddMode}><Plus size={16}/> {t('settings.graphism.addModeBtn')}</Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ background: 'var(--s3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', color: 'var(--tx)', border: '1px solid var(--bd)' }}>
                                {t('settings.graphism.modeBase')}
                            </div>
                            <div style={{ background: 'var(--s3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', color: 'var(--tx)', border: '1px solid var(--bd)' }}>
                                {t('settings.graphism.modeUppercase')}
                            </div>
                            {customModes.map(mode => (
                                <div key={mode} style={{ background: 'var(--acc)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {mode}
                                    <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => handleRemoveMode(mode)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ flex: '1 1 300px', background: 'var(--s2)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--bd)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Monitor size={16} className="text-accent" /> {t('settings.graphism.activeDisplayMode')}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                            {t('settings.graphism.activeDisplayModeDesc')}
                        </p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={typographySettings.activeDisplayMode || 'Base'}
                            onChange={handleUpdateDisplayMode}
                        >
                            <option value="Base">{t('settings.graphism.modeBase')}</option>
                            <option value="Uppercase">{t('settings.graphism.modeUppercase')}</option>
                            {customModes.map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                            ))}
                        </select>
                        
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.letterSpacingTitle')}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                {t('settings.graphism.letterSpacingDesc')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" 
                                    min="-1.5" 
                                    max="1.5" 
                                    step="0.1" 
                                    value={typographySettings.letterSpacing || 0}
                                    onChange={(e) => updateConfig({ typographySettings: { ...typographySettings, letterSpacing: parseFloat(e.target.value) } })}
                                    style={{ flex: 1, accentColor: 'var(--acc)' }}
                                />
                                <span style={{ color: 'var(--tx)', fontWeight: 'bold', minWidth: '40px' }}>
                                    {(typographySettings.letterSpacing || 0).toFixed(1)}em
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.verticalGapTitle')}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                {t('settings.graphism.verticalGapDesc')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" 
                                    min="-1.5" 
                                    max="1.5" 
                                    step="0.1" 
                                    value={typographySettings.verticalLetterSpacing || 0}
                                    onChange={(e) => updateConfig({ typographySettings: { ...typographySettings, verticalLetterSpacing: parseFloat(e.target.value) } })}
                                    style={{ flex: 1, accentColor: 'var(--acc)' }}
                                />
                                <span style={{ color: 'var(--tx)', fontWeight: 'bold', minWidth: '40px' }}>
                                    {(typographySettings.verticalLetterSpacing || 0).toFixed(1)}em
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.customFontScaleTitle')}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                {t('settings.graphism.customFontScaleDesc')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="3.0" 
                                    step="0.1" 
                                    value={typographySettings.customFontScale || 1.0}
                                    onChange={(e) => updateConfig({ typographySettings: { ...typographySettings, customFontScale: parseFloat(e.target.value) } })}
                                    style={{ flex: 1, accentColor: 'var(--acc)' }}
                                />
                                <span style={{ color: 'var(--tx)', fontWeight: 'bold', minWidth: '40px' }}>
                                    {(typographySettings.customFontScale || 1.0).toFixed(1)}x
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>{t('settings.graphism.traceWidthTitle')}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                {t('settings.graphism.traceWidthDesc')}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="60" 
                                    step="1" 
                                    value={typographySettings.traceWidth ?? 30}
                                    onChange={(e) => updateConfig({ typographySettings: { ...typographySettings, traceWidth: parseInt(e.target.value) } })}
                                    style={{ flex: 1, accentColor: 'var(--acc)' }}
                                />
                                <span style={{ color: 'var(--tx)', fontWeight: 'bold', minWidth: '40px' }}>
                                    {typographySettings.traceWidth ?? 30}px
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <Button variant="imp" onClick={handleRecompileFont} style={{ width: '100%' }}>
                                <RefreshCw size={16} /> {t('settings.graphism.applySettingsRecompile')}
                            </Button>
                        </div>

                        {/* Bulk glyph slimming. Projects with many glyphs can
                            otherwise grow until saves fail or storage fills up. */}
                        <div className="gt-lighten-block">
                            <div className="gt-lighten-header">
                                <h4 className="gt-lighten-title">{t('settings.graphism.lightenTitle')}</h4>
                                <p className="gt-lighten-desc">
                                    {t('settings.graphism.lightenDesc')}
                                </p>
                            </div>
                            <div className="gt-lighten-tolerance">
                                <div className="gt-lighten-tolerance-header">
                                    <span style={{ fontWeight: 600, color: 'var(--tx)' }}>
                                        {t('settings.graphism.fidelityTolerance')}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="number"
                                            min="0.05"
                                            max="2.0"
                                            step="0.05"
                                            value={glyphLightenTolerance}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val) && val > 0) {
                                                    setGlyphLightenTolerance(Math.min(Math.max(val, 0.05), 2.0));
                                                }
                                            }}
                                            className="gt-lighten-tolerance-input"
                                            title={t('settings.graphism.toleranceTooltip')}
                                        />
                                        <span style={{ fontSize: '0.82rem', color: 'var(--tx2)' }}>px</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    className="range range-xs range-primary"
                                    min="0.05"
                                    max="2.0"
                                    step="0.05"
                                    value={Math.min(Math.max(glyphLightenTolerance, 0.05), 2.0)}
                                    onChange={(e) => setGlyphLightenTolerance(parseFloat(e.target.value))}
                                />
                                <div className="gt-lighten-tolerance-ticks">
                                    <span>{t('settings.graphism.tickUltraCrisp')}</span>
                                    <span>0.3px</span>
                                    <span style={{ color: 'var(--ok, #10b981)', fontWeight: 600 }}>{t('settings.graphism.tickRecommended')}</span>
                                    <span>1.0px</span>
                                    <span>{t('settings.graphism.tickMaxSafe')}</span>
                                </div>
                            </div>
                            <Button variant="edit" onClick={handleLightenAllGlyphs} style={{ width: '100%' }}>
                                <Spline size={16} /> {t('settings.graphism.lightenTitle')}
                            </Button>
                            </div>
                        </div>
                    </div>
                </Card>

            {/* Backstop for the irreversible glyph rewrite. Rendered last so it
                sits above the rest of the page. */}
            {lightenModal && (
                <GlyphLightenBackupModal
                    isOpen={!!lightenModal}
                    preview={lightenModal.preview}
                    tolerance={glyphLightenTolerance}
                    backupInfo={backupInfo}
                    downloadError={downloadError}
                    onDownloadBackup={handleDownloadBackup}
                    onCancel={handleCloseLightenModal}
                    onConfirm={handleConfirmLighten}
                />
            )}

            {allChars.length > 0 && (
                <div className="alphabet-table-container">
                    <div style={{ padding: '1rem', background: 'var(--s2)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{t('settings.graphism.currentlyEditing')}</h3>
                        <select 
                            className="sg-select" 
                            style={{ width: '200px' }}
                            value={editingMode}
                            onChange={e => setEditingMode(e.target.value)}
                        >
                            {allModes.map(mode => (
                                <option key={mode} value={mode}>
                                    {mode === 'Base' ? t('settings.graphism.modeBase') : (mode === 'Uppercase' ? t('settings.graphism.modeUppercase') : mode)}
                                </option>
                            ))}
                        </select>
                        <Button 
                            variant="primary" 
                            className="btn-sm" 
                            style={{ marginLeft: 'auto' }}
                            onClick={handleAutoMap}
                            title={t('settings.graphism.autoMapTitle', { script: alphabeticScript })}
                        >
                            <Wand2 size={14} style={{ marginRight: '6px' }}/> {t('settings.graphism.autoMapBtn')}
                        </Button>
                    </div>

                    {allChars.length > 0 ? (
                        <div className="responsive-table-wrapper">
                            <table className="alphabet-table">
                                <thead>
                                    <tr>
                                        <th>{t('settings.graphism.thLetter')}</th>
                                        <th>{t('settings.graphism.thName')}</th>
                                        <th>{t('settings.graphism.thGlyph', { mode: editingMode === 'Base' ? t('settings.graphism.modeBase') : (editingMode === 'Uppercase' ? t('settings.graphism.modeUppercase') : editingMode) })}</th>
                                        <th>{t('settings.graphism.thActions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allChars.map((char) => {
                                        const key = editingMode === 'Base' ? char : `${char}_${editingMode.toLowerCase()}`;
                                        const customGlyph = alphabetGlyphs[key];
                                        
                                        return (
                                            <tr key={char}>
                                                <td className="letter-cell">
                                                    <span className="ipa-badge custom-font-text">
                                                        {editingMode === 'Uppercase' ? char.toUpperCase() : char}
                                                    </span>
                                                </td>
                                                
                                                <td
                                                    className="name-cell"
                                                    role="button"
                                                    tabIndex={0}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => editingCharName !== char && setEditingCharName(char)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editingCharName !== char && setEditingCharName(char); } }}
                                                >
                                                    {editingCharName === char ? (
                                                        <div className="char-edit-wrapper" onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                autoFocus
                                                                className="sg-input"
                                                                value={alphabetNames[char] || ''}
                                                                placeholder={t('settings.graphism.namePlaceholder')}
                                                                onChange={(e) => updateName(char, e.target.value)}
                                                                onBlur={() => setEditingCharName(null)}
                                                                onKeyDown={(e) => e.key === 'Enter' && setEditingCharName(null)}
                                                                style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="name-display" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <span>{alphabetNames[char] || <span style={{ color: 'var(--tx3)', fontStyle: 'italic' }}>{t('settings.graphism.unnamed')}</span>}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                <td className="glyph-cell">
                                                    <input 
                                                        type="text" 
                                                        className="sg-input custom-font-text" 
                                                        style={{ 
                                                            width: '100px', 
                                                            padding: '4px 8px', 
                                                            fontSize: '1.1rem', 
                                                            textAlign: 'center',
                                                            color: editingMode === 'Base' ? 'var(--tx)' : 'var(--acc)',
                                                            fontWeight: 'bold'
                                                        }}
                                                        placeholder={t('settings.graphism.notDrawnPlaceholder')}
                                                        value={customGlyph || ''}
                                                        onChange={(e) => updateGlyph(char, e.target.value)}
                                                    />
                                                </td>
                                                
                                                <td className="actions-cell">
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button 
                                                            className="btn-v btn-sec-v" 
                                                            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDrawingChar(char);
                                                            }}
                                                        >
                                                            <Brush size={14} /> {customGlyph ? t('settings.graphism.redrawBtn') : t('settings.graphism.drawBtn')}
                                                        </button>
                                                        {customGlyph && (
                                                            <button 
                                                                className="btn-v" 
                                                                style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'transparent', border: '1px solid var(--err)', color: 'var(--err)' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteGlyph(key);
                                                                }}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state glass">
                            <Type size={48} className="text-tx2 opacity-20" />
                            <p>{t('orthography.noCharsFound')}</p>
                            <button className="btn-link" onClick={() => window.location.hash = '#/settings'}>
                                {t('settings.graphism.goToPhonology')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {allChars.length > 0 && (
                <Card style={{ padding: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Keyboard size={18} /> {t('settings.graphism.keyboardExporterTitle')}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', textAlign: 'center', maxWidth: '500px', margin: 0 }}>
                        <span dangerouslySetInnerHTML={{ __html: t('settings.graphism.keyboardExporterDesc') }} />
                    </p>
                    <Button variant="imp" onClick={() => setShowKeyboardManager(true)}>
                        <Keyboard size={16} /> {t('settings.graphism.openKeyboardManager')}
                    </Button>
                </Card>
            )}

            {unusedGlyphKeys && unusedGlyphKeys.length > 0 && (
                <Card style={{ padding: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid var(--err, #ef4444)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--err, #ef4444)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Trash2 size={18} /> {t('settings.graphism.unassignedTitle', { count: unusedGlyphKeys.length })}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', textAlign: 'center', maxWidth: '580px', margin: 0 }}>
                        <span dangerouslySetInnerHTML={{ __html: t('settings.graphism.unassignedDesc', { count: unusedGlyphKeys.length }) }} />
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxHeight: '130px', overflowY: 'auto', width: '100%', padding: '10px', background: 'var(--s1)', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                        {unusedGlyphKeys.map(key => (
                            <span key={key} style={{ fontSize: '0.75rem', background: 'var(--s2)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--bd)', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Glyph #{key}
                                <button
                                    onClick={() => handleCleanUnusedGlyphs([key])}
                                    title={t('settings.graphism.deleteUnusedTooltip')}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--err, #ef4444)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', fontSize: '1rem', lineHeight: 1 }}
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>
                    <Button variant="error" onClick={() => handleCleanUnusedGlyphs(unusedGlyphKeys)}>
                        <Trash2 size={16} /> {t('settings.graphism.deleteAllUnusedBtn', { count: unusedGlyphKeys.length })}
                    </Button>
                </Card>
            )}
        </div>
    );
}
