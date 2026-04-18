import React, { useState, useEffect } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Save } from 'lucide-react';
import './editModal.css';

export default function EditWordModal({ wordObj, onClose }) {
    // Grab our global dictionary tools
    const updateWord = useLexiconStore((state) => state.updateWord);
    const lexicon = useLexiconStore((state) => state.lexicon);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const { normalizeToBase } = useTransliterator();

    // Bundle all the form fields into one neat state object
    const [formData, setFormData] = useState({
        word: '', ipa: '', wordClass: '', translation: '', tags: '', ideogram: ''
    });
    const { word, ipa, wordClass, translation, tags, ideogram } = formData;

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    // Whenever the user clicks edit on a word, immediately populate the form with its current data
    useEffect(() => {
        if (wordObj) {
            setFormData({
                word: wordObj.word || '',
                ipa: wordObj.ipa || '',
                wordClass: wordObj.wordClass || '',
                translation: wordObj.translation || '',
                tags: wordObj.tags ? wordObj.tags.join(', ') : '',
                ideogram: wordObj.ideogram || ''
            });
        }
    }, [wordObj]);

    // Validate everything before saving changes to the dictionary
    const handleSave = () => {
        const cleanInputWord = word.trim();
        const cleanInputTrans = translation.trim();

        if (!cleanInputWord || !cleanInputTrans) return alert("Please fill in both the word and the translation.");

        const safeWord = normalizeToBase(cleanInputWord);
        const safeLowerWord = safeWord.toLowerCase();
        const safeLowerTrans = cleanInputTrans.toLowerCase();

        // Make sure they didn't accidentally change the word to match something that already exists!
        const isDuplicate = lexicon.some(entry => {
            if (entry.id === wordObj.id) return false; // Skip itself
            
            const dbWord = entry.word.replace(/\*/g, '').toLowerCase();
            const dbTrans = entry.translation.toLowerCase();
            return dbWord === safeLowerWord || dbTrans === safeLowerTrans;
        });

        if (isDuplicate) {
            return alert("This word or translation already exists in another dictionary entry!");
        }

        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        updateWord(wordObj.id, {
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass.trim(), // Kept exact case for flexibility
            translation: cleanInputTrans,
            tags: processedTags,
            ideogram: ideogram.trim()
        });

        alert("Word updated successfully!");
        onClose(); 
    };

    if (!wordObj) return null;

    return (
        <div className="edit-modal-container">
            
            <div className="edit-modal-grid">
                <div>
                    <Input 
                        label="Word (Conlang)" 
                        value={word}
                        onChange={(e) => updateField('word', e.target.value)}
                        className="custom-font-text notranslate"
                    />
                </div>
                
                <div>
                    <Input 
                        label="IPA (Optional)" 
                        value={ipa}
                        onChange={(e) => updateField('ipa', e.target.value)}
                    />
                </div>

                <div>
                    <Input 
                        label="Part of Speech"
                        value={wordClass}
                        onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                        list="edit-word-classes"
                    />
                    <datalist id="edit-word-classes">
                        <option value="noun" />
                        <option value="verb" />
                        <option value="adjective" />
                        <option value="adverb" />
                        <option value="pronoun" />
                        <option value="particle" />
                        <option value="conjunction" />
                        <option value="preposition" />
                    </datalist>
                </div>
            </div>

            {phonologyTypes === 'logographic' && (
                <div>
                    <Input 
                        label="Ideogram / Symbol"
                        value={ideogram}
                        onChange={(e) => updateField('ideogram', e.target.value)}
                        className="ideogram-edit-input notranslate custom-font-text"
                    />
                </div>
            )}

            <div>
                <Input 
                    label="Translation / Definition" 
                    value={translation}
                    onChange={(e) => updateField('translation', e.target.value)}
                />
            </div>

            <div>
                <Input 
                    label="Semantic Tags (Comma separated)" 
                    value={tags}
                    onChange={(e) => updateField('tags', e.target.value)}
                />
            </div>

            <Button 
                variant="save" 
                className="edit-modal-save-btn"
                onClick={handleSave}
            >
                <Save size={18} /> Save Changes
            </Button>
        </div>
    );
}