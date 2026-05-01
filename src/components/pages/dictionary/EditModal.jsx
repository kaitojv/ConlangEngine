import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import './editModal.css';

// Standard POS options
const STANDARD_WORD_CLASSES = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'particle', 'conjunction', 'preposition'
];

export default function EditWordModal({ wordObj, onClose }) {
    // Grab our global dictionary tools
    const updateWord = useLexiconStore((state) => state.updateWord);
    const lexicon = useLexiconStore((state) => state.lexicon);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const customTags = useConfigStore((state) => state.customTags) || [];
    const addCustomWordClass = useConfigStore((state) => state.addCustomWordClass);
    const addCustomTag = useConfigStore((state) => state.addCustomTag);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const consonants = useConfigStore((state) => state.consonants);
    const vowels = useConfigStore((state) => state.vowels);
    const syllablePattern = useConfigStore((state) => state.syllablePattern);
    const { normalizeToBase } = useTransliterator();

    // Track which field the IPA chart should paste into
    const activeFieldRef = useRef('ipa');

    // Bundle all the form fields into one neat state object
    const [formData, setFormData] = useState({
        word: '', ipa: '', wordClass: '', translation: '', tags: '', ideogram: '', personCategory: ''
    });
    const { word, ipa, wordClass, translation, tags, ideogram, personCategory } = formData;

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    // Build merged POS list
    const allWordClasses = useMemo(() => {
        const merged = new Set([...STANDARD_WORD_CLASSES]);
        customWordClasses.forEach(cls => merged.add(cls));
        lexicon.forEach(w => {
            if (w.wordClass) {
                w.wordClass.split(',').forEach(cls => {
                    const clean = cls.trim().toLowerCase();
                    if (clean) merged.add(clean);
                });
            }
        });
        return [...merged].sort();
    }, [customWordClasses, lexicon]);

    // Build merged tags list
    const allTags = useMemo(() => {
        const merged = new Set(customTags);
        lexicon.forEach(w => {
            if (w.tags) w.tags.forEach(tag => merged.add(tag.toLowerCase()));
        });
        return [...merged].sort();
    }, [customTags, lexicon]);

    // Whenever the user clicks edit on a word, immediately populate the form with its current data
    useEffect(() => {
        if (wordObj) {
            setFormData({
                word: wordObj.word || '',
                ipa: wordObj.ipa || '',
                wordClass: wordObj.wordClass || '',
                translation: wordObj.translation || '',
                tags: Array.isArray(wordObj.tags) ? wordObj.tags.join(', ') : (typeof wordObj.tags === 'string' ? wordObj.tags : ''),
                ideogram: wordObj.ideogram || '',
                personCategory: wordObj.personCategory || ''
            });
        }
    }, [wordObj]);

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        const field = activeFieldRef.current;
        updateField(field, formData[field] + char);
    };

    // Quick-fix: add invalid characters to consonants or vowels
    const handleAddCharsToInventory = (chars, type) => {
        const currentList = type === 'consonants' ? consonants : vowels;
        const arr = currentList.trim() ? currentList.trim().split(',').map(s => s.trim()) : [];
        chars.forEach(ch => {
            if (!arr.includes(ch)) arr.push(ch);
        });
        updateConfig({ [type]: arr.join(', ') });
        toast.success(`Added "${chars.join(', ')}" to ${type}.`);
    };

    // Quick-fix: add detected pattern to syllable patterns
    const handleAddPattern = (pattern) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);
    };

    // Validate everything before saving changes to the dictionary
    const handleSave = () => {
        const cleanInputWord = word.trim();
        const cleanInputTrans = translation.trim();

        if (!cleanInputWord || !cleanInputTrans) return toast.error("Please fill in both the word and the translation.");

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
            return toast.error("This word or translation already exists in another dictionary entry!");
        }

        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        // Run phono-syntax validation (previously missing from edit flow!)
        const validation = validateNewWord(safeWord, useConfigStore.getState());
        
        const doSave = () => {
            updateWord(wordObj.id, {
                word: safeWord,
                ipa: ipa.trim(),
                wordClass: wordClass.trim(),
                translation: cleanInputTrans,
                tags: processedTags,
                ideogram: ideogram.trim(),
                personCategory: personCategory.trim()
            });

            // Persist any new custom POS/tags
            if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.trim().toLowerCase())) {
                addCustomWordClass(wordClass);
            }
            processedTags.forEach(tag => addCustomTag(tag));

            toast.success("Word updated successfully!");
            onClose();
        };

        if (!validation.valid) {
            toast.custom((t) => (
                <div style={{ background: 'var(--s4)', color: 'var(--tx)', padding: '15px', borderRadius: '8px', border: '1px solid var(--err)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p style={{fontSize: '0.9rem', color: 'var(--tx2)'}}>Do you want to save it as an irregular exception anyway?</p>
                    <div style={{display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap'}}>
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            doSave();
                        }} style={{padding: '5px 10px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save Anyway</button>

                        {validation.type === 'invalid_chars' && validation.invalidChars && (
                            <>
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    handleAddCharsToInventory(validation.invalidChars, 'consonants');
                                }} style={{padding: '5px 10px', background: 'var(--acc)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Add to Consonants</button>
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    handleAddCharsToInventory(validation.invalidChars, 'vowels');
                                }} style={{padding: '5px 10px', background: 'var(--acc2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Add to Vowels</button>
                            </>
                        )}

                        {validation.type === 'invalid_pattern' && validation.detectedPattern && (
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddPattern(validation.detectedPattern);
                            }} style={{padding: '5px 10px', background: 'var(--acc)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Add to Syllable Patterns</button>
                        )}

                        <button onClick={() => toast.dismiss(t.id)} style={{padding: '5px 10px', background: 'var(--s2)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                    </div>
                </div>
            ), { duration: Infinity });
            return;
        }

        doSave();
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
                        onFocus={() => { activeFieldRef.current = 'word'; }}
                        className="custom-font-text notranslate"
                    />
                </div>
                
                <div>
                    <Input 
                        label="IPA (Optional)" 
                        value={ipa}
                        onChange={(e) => updateField('ipa', e.target.value)}
                        onFocus={() => { activeFieldRef.current = 'ipa'; }}
                    />
                    <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--tx2)', marginBottom: '4px' }}>
                            IPA Chart pastes into: <strong style={{ color: 'var(--acc)' }}>{activeFieldRef.current === 'word' ? 'Word' : 'IPA'}</strong>
                        </p>
                        <IpaChart onSelect={handleIpaSelect} />
                    </div>
                </div>

                <div>
                    <Input 
                        label="Part of Speech"
                        value={wordClass}
                        onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                        list="edit-word-classes"
                    />
                    <datalist id="edit-word-classes">
                        {allWordClasses.map(cls => (
                            <option key={cls} value={cls} />
                        ))}
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
                    label="Person Category (for pronouns)"
                    value={personCategory}
                    onChange={(e) => updateField('personCategory', e.target.value)}
                    list="person-cat-options"
                    placeholder="e.g. 1st, 2nd, 3rd"
                />
                <datalist id="person-cat-options">
                    <option value="1st" />
                    <option value="2nd" />
                    <option value="3rd" />
                    <option value="4th" />
                </datalist>
            </div>

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
                    list="edit-semantic-tags"
                />
                <datalist id="edit-semantic-tags">
                    {allTags.map(tag => (
                        <option key={tag} value={tag} />
                    ))}
                </datalist>
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