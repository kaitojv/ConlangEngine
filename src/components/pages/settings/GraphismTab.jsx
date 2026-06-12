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
import { Keyboard } from 'lucide-react';
import './graphismTab.css';

export default function TypographyStudio() {
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const alphabetGlyphs = useConfigStore(state => state.alphabetGlyphs) || {};
    const alphabetNames = useConfigStore(state => state.alphabetNames) || {};
    const typographySettings = useConfigStore(state => state.typographySettings) || { customTypographyModes: [], activeDisplayMode: 'Base' };
    const writingDirection = useConfigStore((state) => state.writingDirection) || 'ltr';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const updateConfig = useConfigStore(state => state.updateConfig);
    
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

    const updateName = (char, name) => {
        updateConfig({
            alphabetNames: {
                ...alphabetNames,
                [char]: name
            }
        });
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

    const updateGlyph = (char, newCharUnicode) => {
        const key = editingMode === 'Base' ? char : `${char}_${editingMode.toLowerCase()}`;
        updateConfig({
            alphabetGlyphs: {
                ...alphabetGlyphs,
                [key]: newCharUnicode
            }
        });
        setDrawingChar(null);
    };

    const deleteGlyph = (key) => {
        const newGlyphs = { ...alphabetGlyphs };
        delete newGlyphs[key];
        updateConfig({ alphabetGlyphs: newGlyphs });
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
                >
                    <FontStudioModal
                        targetLabel={`Letter: ${drawingChar}`}
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

            {phonologyTypes === 'syllabic' && (
                <div className="animate-in fade-in duration-300">
                    <SyllabaryManager />
                </div>
            )}

            {phonologyTypes === 'featural_block' && (
                <div className="animate-in fade-in duration-300">
                    <BlockManager />
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
                            onChange={(e) => updateConfig({ writingDirection: e.target.value })}
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
                    </div>
                </div>
            </Card>

            {phonologyTypes === 'alphabetic' && (
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
                                                <td className="ipa-cell">
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
                                                    {customGlyph ? (
                                                        <span className="custom-font-text drawn-glyph" style={{ color: editingMode === 'Base' ? 'var(--tx)' : 'var(--acc)' }}>
                                                            {customGlyph}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--tx3)', fontStyle: 'italic' }}>Not drawn</span>
                                                    )}
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

            {phonologyTypes === 'alphabetic' && (
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
