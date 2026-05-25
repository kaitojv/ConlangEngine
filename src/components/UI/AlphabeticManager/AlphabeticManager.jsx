import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import { Type, Edit2, Check, Brush } from 'lucide-react';
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
                You can also <b>Draw</b> your custom alphabetic characters using the Font Studio! These custom characters will automatically render when you select "Custom Script (Font Studio)" in your Basic Settings.
            </Infobox>

            <div className="alphabet-grid">
                {allChars.length > 0 ? (
                    allChars.map((char) => {
                        const isEditing = editingChar === char;
                        const charName = alphabetNames[char] || '';
                        const customGlyph = alphabetGlyphs[char];
                        
                        return (
                            <div 
                                key={char} 
                                className={`char-card glass ${isEditing ? 'is-editing' : ''}`}
                                onClick={() => !isEditing && setEditingChar(char)}
                            >
                                <div className="char-display custom-font-text" style={{ fontSize: customGlyph ? '2.5rem' : '1.5rem', marginBottom: customGlyph ? '0' : '0.5rem' }}>
                                    {customGlyph || char}
                                </div>
                                {customGlyph && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '8px' }}>
                                        ({char})
                                    </div>
                                )}
                                
                                <div className="char-info">
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
                                        <div className="char-name-display" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="name-label">{charName || 'unnamed'}</span>
                                                <Edit2 size={12} className="edit-icon" />
                                            </div>
                                            <button 
                                                className="btn-add" 
                                                style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0.3rem 0.8rem', fontSize: '0.8rem', height: 'auto', background: 'var(--s3)', color: 'var(--tx)', width: '100%', justifyContent: 'center' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDrawingChar(char);
                                                }}
                                            >
                                                <Brush size={14} /> Draw
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
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
