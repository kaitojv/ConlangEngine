// src/components/pages/dictionary/EditWordModal.jsx
import React, { useState, useEffect } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';

export default function EditWordModal({ wordObj, onClose }) {
    const updateWord = useLexiconStore((state) => state.updateWord);
    const lexicon = useLexiconStore((state) => state.lexicon);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const { normalizeToBase } = useTransliterator();

    // Local state for the form
    const [word, setWord] = useState('');
    const [ipa, setIpa] = useState('');
    const [wordClass, setWordClass] = useState('');
    const [translation, setTranslation] = useState('');
    const [tags, setTags] = useState('');
    const [ideogram, setIdeogram] = useState('');

    // Populate the form when the modal opens with a word
    useEffect(() => {
        if (wordObj) {
            setWord(wordObj.word || '');
            setIpa(wordObj.ipa || '');
            setWordClass(wordObj.wordClass || '');
            setTranslation(wordObj.translation || '');
            setTags(wordObj.tags ? wordObj.tags.join(', ') : '');
            setIdeogram(wordObj.ideogram || '');
        }
    }, [wordObj]);

    const handleSave = () => {
        if (!word.trim() || !translation.trim()) {
            alert("Please fill in both the word and the translation.");
            return;
        }

        const safeWord = normalizeToBase(word.trim());
        const cleanInputWord = safeWord.toLowerCase();
        const cleanInputTrans = translation.trim().toLowerCase();

        // Check for duplicates, but IGNORE the current word being edited
        const isDuplicate = lexicon.some(entry => {
            if (entry.id === wordObj.id) return false; // Skip itself
            
            const dbWord = entry.word.replace(/\*/g, '').toLowerCase();
            const dbTrans = entry.translation.toLowerCase();
            return dbWord === cleanInputWord || dbTrans === cleanInputTrans;
        });

        if (isDuplicate) {
            alert("This word or translation already exists in another dictionary entry!");
            return;
        }

        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        // Update the word in the Zustand store
        updateWord(wordObj.id, {
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass.trim().toLowerCase(),
            translation: translation.trim(),
            tags: processedTags,
            ideogram: ideogram.trim()
        });

        alert("Word updated successfully!");
        onClose(); // Close the modal
    };

    if (!wordObj) return null;

    // Common input style object to avoid Tailwind
    const inputStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: 'var(--s1)',
        color: 'var(--tx)',
        border: '1px solid var(--bd)',
        borderRadius: '8px',
        outline: 'none',
        marginBottom: '16px',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: 'var(--tx2)',
        textTransform: 'uppercase',
        marginBottom: '8px',
        display: 'block'
    };

    return (
        <div style={{ width: '100%' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div>
                    <label style={labelStyle}>Word (Conlang)</label>
                    <input 
                        style={inputStyle}
                        type="text" 
                        value={word}
                        onChange={(e) => setWord(e.target.value)}
                    />
                </div>
                
                <div>
                    <label style={labelStyle}>IPA (Optional)</label>
                    <input 
                        style={inputStyle}
                        type="text" 
                        value={ipa}
                        onChange={(e) => setIpa(e.target.value)}
                    />
                </div>

                <div>
                    <label style={labelStyle}>Part of Speech</label>
                    <input 
                        style={inputStyle}
                        type="text"
                        list="edit-word-classes"
                        value={wordClass}
                        onChange={(e) => setWordClass(e.target.value.toLowerCase())}
                    />
                    <datalist id="edit-word-classes">
                        <option value="noun" />
                        <option value="verb" />
                        <option value="adjective" />
                        <option value="adverb" />
                        <option value="pronoun" />
                        <option value="particle" />
                    </datalist>
                </div>
            </div>

            {phonologyTypes === 'logographic' && (
                <div>
                    <label style={labelStyle}>Ideogram / Symbol</label>
                    <input 
                        style={{ ...inputStyle, fontSize: '1.5rem', textAlign: 'center' }}
                        type="text" 
                        className="notranslate"
                        value={ideogram}
                        onChange={(e) => setIdeogram(e.target.value)}
                    />
                </div>
            )}

            <div>
                <label style={labelStyle}>Translation / Definition</label>
                <input 
                    style={inputStyle}
                    type="text" 
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                />
            </div>

            <div>
                <label style={labelStyle}>Semantic Tags (Comma separated)</label>
                <input 
                    style={inputStyle}
                    type="text" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                />
            </div>

            <button 
                className="btn btn-save" 
                style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: '10px' }}
                onClick={handleSave}
            >
                💾 Save Changes
            </button>
        </div>
    );
}