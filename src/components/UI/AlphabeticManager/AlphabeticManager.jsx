import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import { Type, Edit2, Check, Brush, Trash2 } from 'lucide-react';
import './alphabeticManager.css';

export default function AlphabeticManager() {
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const alphabetNames = useConfigStore(state => state.alphabetNames) || {};
    const alphabetGlyphs = useConfigStore(state => state.alphabetGlyphs) || {};
    const updateConfig = useConfigStore(state => state.updateConfig);
    
    const [editingChar, setEditingChar] = useState(null);
    const [drawingChar, setDrawingChar] = useState(null);

    const parseChars = (str) => {
        if (!str) return [];
        return str.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => {
                // RIGHT side of IPA=Text is the grapheme/letter identity
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

    const updateGlyph = (char, newCharUnicode) => {
        updateConfig({
            alphabetGlyphs: {
                ...alphabetGlyphs,
                [char]: newCharUnicode
            }
        });
        setDrawingChar(null);
    };

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

            <Infobox title="Naming & Drawing your Alphabet">
                This section allows you to define how each character in your writing system is named (e.g., 'A' is called 'Ah'). 
                You can also <b>Draw</b> your custom alphabetic characters using the Font Studio! These custom characters will automatically replace the default letters across your entire lexicon, regardless of your chosen base script.
            </Infobox>

            <div className="alphabet-table-container">
                {allChars.length > 0 ? (
                <div className="responsive-table-wrapper">
                    <table className="alphabet-table">
                        <thead>
                            <tr>
                                <th>IPA</th>
                                <th>Character Name</th>
                                <th>Custom Glyph</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allChars.map((char) => {
                                const isEditing = editingChar === char;
                                const charName = alphabetNames[char] || '';
                                const customGlyph = alphabetGlyphs[char];
                                
                                return (
                                    <tr key={char}>
                                        <td className="ipa-cell">
                                            <span className="ipa-badge custom-font-text">{char}</span>
                                        </td>
                                        
                                        <td className="name-cell" onClick={() => !isEditing && setEditingChar(char)}>
                                            {isEditing ? (
                                                <div className="char-edit-wrapper" onClick={e => e.stopPropagation()}>
                                                    <input 
                                                        autoFocus
                                                        className="char-name-input-active"
                                                        value={charName}
                                                        placeholder="Name..."
                                                        onChange={(e) => updateName(char, e.target.value)}
                                                        onBlur={() => setEditingChar(null)}
                                                        onKeyDown={(e) => e.key === 'Enter' && setEditingChar(null)}
                                                    />
                                                    <button className="char-save-btn" onClick={() => setEditingChar(null)}>
                                                        <Check size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="name-display">
                                                    <span>{charName || <span style={{ color: 'var(--tx3)', fontStyle: 'italic' }}>unnamed</span>}</span>
                                                    <Edit2 size={12} className="edit-icon" />
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td className="glyph-cell">
                                            {customGlyph ? (
                                                <span className="custom-font-text drawn-glyph">{customGlyph}</span>
                                            ) : (
                                                <span style={{ color: 'var(--tx3)', fontStyle: 'italic' }}>None</span>
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
                                                            const newGlyphs = { ...alphabetGlyphs };
                                                            delete newGlyphs[char];
                                                            updateConfig({ alphabetGlyphs: newGlyphs });
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
        </div>
    );
}
