import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import { Type, Brush, Trash2, Plus, Monitor } from 'lucide-react';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import SyllabaryManager from '../../UI/SyllabaryManager/SyllabaryManager.jsx';
import BlockManager from '../../UI/BlockManager/BlockManager.jsx';
import KeyboardManager from '../../UI/KeyboardManager/KeyboardManager.jsx';
import { Keyboard, RefreshCw, Wand2 } from 'lucide-react';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import { SCRIPT_MAPS } from '../../../utils/transliteration.js';
import toast from 'react-hot-toast';
import './graphismTab.css';

const TYPE_LABELS = {
    alphabetic: 'Alphabetic',
    syllabic: 'Syllabic',
    logographic: 'Logographic',
    featural_block: 'Featural/Block',
};

export default function TypographyStudio() {
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

    // Track which script is being edited. Default to the project's default script.
    const [editingScriptId, setEditingScriptId] = useState(defaultScriptId);

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

    const handleRecompileFont = async () => {
        const tId = toast.loading("Recompiling custom font...");
        try {
            const currentSettings = useConfigStore.getState().typographySettings || {};
            const currentCustomGlyphs = useConfigStore.getState().customGlyphs || {};
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
            toast.success("Font recompiled successfully!", { id: tId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to recompile font.", { id: tId });
        }
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
            toast.success(`Auto-mapped ${count} missing characters!`);
        } else {
            toast('No missing characters to map.', { icon: 'ℹ️' });
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
                    title={`Draw Custom Symbol`}
                    className="modal-wide"
                >
                    <FontStudioModal
                        targetLabel={`Letter: ${drawingChar}`}
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
                title="Custom Keyboard Exporter"
            >
                <KeyboardManager allChars={allChars} alphabetGlyphs={alphabetGlyphs} />
            </Modal>

            <Infobox title="Graphism & Typography Studio">
                Create multiple typography variations for your characters, such as <b>Cursive</b>, <b>Formal</b>, or <b>Calligraphy</b>. 
                Select a mode to edit, then click <b>Draw</b> to assign custom glyphs specifically for that typography mode!
            </Infobox>

            {hasMultipleScripts && (
                <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', margin: 0 }}>
                            Editing Script
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', margin: 0 }}>
                            Two writing systems can share the same script type. Pick which one this Graphism page edits.
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
                                {s.name} — {TYPE_LABELS[s.type] || s.type}
                                {s.id === defaultScriptId ? ' (default)' : ''}
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
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Writing Direction</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>Define how the language is written on the page.</p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={writingDirection}
                            onChange={handleWritingDirection}
                        >
                            <option value="ltr">Horizontal (Left to Right)</option>
                            <option value="rtl">Horizontal (Right to Left)</option>
                            <option value="vertical-rl">Vertical (Top to Bottom, R-L)</option>
                            <option value="vertical-lr">Vertical (Top to Bottom, L-R)</option>
                        </select>
                    </div>
                </div>

                <div style={{ width: '100%', height: '1px', background: 'var(--bd)', marginBottom: '1.5rem' }}></div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Typography Modes</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>Define custom styles or contextual forms.</p>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input 
                                type="text" 
                                className="sg-input" 
                                placeholder="e.g. Cursive, Handwritten..."
                                value={newMode}
                                onChange={e => setNewMode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddMode()}
                                style={{ flex: 1 }}
                            />
                            <Button variant="primary" onClick={handleAddMode}><Plus size={16}/> Add</Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ background: 'var(--s3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', color: 'var(--tx)', border: '1px solid var(--bd)' }}>
                                Base (Default)
                            </div>
                            <div style={{ background: 'var(--s3)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', color: 'var(--tx)', border: '1px solid var(--bd)' }}>
                                Uppercase
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
                            <Monitor size={16} className="text-accent" /> Active Display Mode
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                            Select which mode should be applied automatically to the Lexicon and other pages. Words will render in this mode if a drawn character exists.
                        </p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.5rem' }}
                            value={typographySettings.activeDisplayMode || 'Base'}
                            onChange={handleUpdateDisplayMode}
                        >
                            <option value="Base">Base (Default)</option>
                            <option value="Uppercase">Uppercase</option>
                            {customModes.map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                            ))}
                        </select>
                        
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Letter Spacing</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                Adjust the gap between custom characters across the application.
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
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Custom Font Scale</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                Scale up or down the size of the compiled font across the entire application. Requires a re-compile after changing.
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
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Trace Width</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                Adjust the stroke thickness of compiled block characters. Requires a re-compile after changing.
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
                                <RefreshCw size={16} /> Apply Settings & Recompile Font
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {allChars.length > 0 && (
                <div className="alphabet-table-container">
                    <div style={{ padding: '1rem', background: 'var(--s2)', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Currently Editing:</h3>
                        <select 
                            className="sg-select" 
                            style={{ width: '200px' }}
                            value={editingMode}
                            onChange={e => setEditingMode(e.target.value)}
                        >
                            {allModes.map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                            ))}
                        </select>
                        <Button 
                            variant="primary" 
                            className="btn-sm" 
                            style={{ marginLeft: 'auto' }}
                            onClick={handleAutoMap}
                            title={`Auto-fill missing characters using ${alphabeticScript} mapping`}
                        >
                            <Wand2 size={14} style={{ marginRight: '6px' }}/> Auto-Map
                        </Button>
                    </div>

                    {allChars.length > 0 ? (
                        <div className="responsive-table-wrapper">
                            <table className="alphabet-table">
                                <thead>
                                    <tr>
                                        <th>Letter</th>
                                        <th>Name</th>
                                        <th>{editingMode} Glyph</th>
                                        <th>Actions</th>
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
                                                
                                                <td className="name-cell" onClick={() => editingCharName !== char && setEditingCharName(char)} style={{ cursor: 'pointer' }}>
                                                    {editingCharName === char ? (
                                                        <div className="char-edit-wrapper" onClick={e => e.stopPropagation()}>
                                                            <input 
                                                                autoFocus
                                                                className="sg-input"
                                                                value={alphabetNames[char] || ''}
                                                                placeholder="Name..."
                                                                onChange={(e) => updateName(char, e.target.value)}
                                                                onBlur={() => setEditingCharName(null)}
                                                                onKeyDown={(e) => e.key === 'Enter' && setEditingCharName(null)}
                                                                style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem' }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="name-display" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <span>{alphabetNames[char] || <span style={{ color: 'var(--tx3)', fontStyle: 'italic' }}>unnamed</span>}</span>
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
                                                        placeholder="Not drawn"
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
                                                            <Brush size={14} /> {customGlyph ? 'Redraw' : 'Draw'}
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
                            <p>No characters found in your Phonology settings.</p>
                            <button className="btn-link" onClick={() => window.location.hash = '#/settings'}>
                                Go to Phonology Settings
                            </button>
                        </div>
                    )}
                </div>
            )}

            {allChars.length > 0 && (
                <Card style={{ padding: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Keyboard size={18} /> OS Keyboard Layout Exporter
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', textAlign: 'center', maxWidth: '500px', margin: 0 }}>
                        Map your custom drawn characters to physical keys and download a Windows <code>.klc</code> file to type natively on your computer!
                    </p>
                    <Button variant="imp" onClick={() => setShowKeyboardManager(true)}>
                        <Keyboard size={16} /> Open Keyboard Manager
                    </Button>
                </Card>
            )}
        </div>
    );
}
