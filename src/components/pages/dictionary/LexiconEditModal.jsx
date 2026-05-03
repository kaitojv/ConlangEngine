import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import { Save, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import './lexiconEditModal.css';

// Standard POS options
const STANDARD_WORD_CLASSES = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'particle', 'conjunction', 'preposition'
];

export default function LexiconEditModal({ wordObj, onClose }) {
    // Grab our global lexicon tools
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
    const [activeField, setActiveField] = useState('ipa');

    // Bundle all the form fields into one neat state object
    const [formData, setFormData] = useState({
        word: '', ipa: '', wordClass: '', translation: '', tags: [], ideogram: '', personCategory: ''
    });
    const [tagInput, setTagInput] = useState('');
    const [activeToastId, setActiveToastId] = useState(null);
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
                tags: Array.isArray(wordObj.tags) ? wordObj.tags : (typeof wordObj.tags === 'string' ? wordObj.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                ideogram: wordObj.ideogram || '',
                personCategory: wordObj.personCategory || ''
            });
        }
        return () => toast.dismiss();
    }, [wordObj]);

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        updateField(activeField, formData[activeField] + char);
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
    const handleAddPattern = (pattern, safeWord, cleanInputTrans, processedTags) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);
        doSave(safeWord, cleanInputTrans, processedTags);
    };

    const handleAddTag = (tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (cleanTag && !formData.tags.includes(cleanTag)) {
            updateField('tags', [...formData.tags, cleanTag]);
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        updateField('tags', formData.tags.filter(t => t !== tagToRemove));
    };

    const showValidationToast = (content) => {
        if (activeToastId) toast.dismiss(activeToastId);
        const newId = toast.custom(content, { duration: Infinity });
        setActiveToastId(newId);
    };

    // Validate everything before saving changes to the lexicon
    const handleSave = () => {
        const cleanInputWord = word.trim();
        const cleanInputTrans = translation.trim();

        if (!cleanInputWord || !cleanInputTrans) return toast.error("Please fill in both the word and the translation.");

        const safeWord = normalizeToBase(cleanInputWord);
        const safeLowerWord = safeWord.toLowerCase();
        const safeLowerTrans = cleanInputTrans.toLowerCase();

        const { isDuplicateWord, isDuplicateTranslation } = lexicon.reduce((acc, entry) => {
            if (entry.id === wordObj.id) return acc;
            const dbWord = entry.word.replace(/\*/g, '').toLowerCase();
            const dbTrans = entry.translation.toLowerCase();
            if (dbWord === safeLowerWord) acc.isDuplicateWord = true;
            if (dbTrans === safeLowerTrans) acc.isDuplicateTranslation = true;
            return acc;
        }, { isDuplicateWord: false, isDuplicateTranslation: false });

        const processedTags = [...formData.tags].sort();
        const validation = validateNewWord(safeWord, useConfigStore.getState());
        
        const doSave = (sWord = safeWord, cTrans = cleanInputTrans, pTags = processedTags) => {
            updateWord(wordObj.id, {
                word: sWord,
                ipa: ipa.trim(),
                wordClass: wordClass.trim(),
                translation: cTrans,
                tags: pTags,
                ideogram: ideogram.trim(),
                personCategory: personCategory.trim()
            });

            if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.trim().toLowerCase())) {
                addCustomWordClass(wordClass);
            }
            pTags.forEach(tag => addCustomTag(tag));

            toast.success("Word updated successfully!");
            onClose();
        };

        if (isDuplicateWord || isDuplicateTranslation) {
            let warningMsg = "";
            if (isDuplicateWord && isDuplicateTranslation) {
                warningMsg = "This exact word and translation already exist in another lexicon entry.";
            } else if (isDuplicateWord) {
                warningMsg = "This word already exists in another entry (Homonym). Save anyway?";
            } else {
                warningMsg = "This translation already exists in another entry (Synonym). Save anyway?";
            }

            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Duplicate Detected</strong>
                    <span>{warningMsg}</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave);
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave);
    };

    const proceedToValidation = (safeWord, cleanInputTrans, processedTags, doSave) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState());

        if (!validation.valid) {
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p style={{fontSize: '0.9rem', color: 'var(--tx2)'}}>Do you want to save it as an irregular exception anyway?</p>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            doSave();
                        }} className="btn-v btn-err-v">Save Anyway</button>

                        {validation.type === 'invalid_chars' && validation.invalidChars && (
                            <>
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    handleAddCharsToInventory(validation.invalidChars, 'consonants');
                                }} className="btn-v btn-acc-v">Add to Consonants</button>
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    handleAddCharsToInventory(validation.invalidChars, 'vowels');
                                }} className="btn-v btn-acc2-v">Add to Vowels</button>
                                <button onClick={() => {
                                    toast.dismiss(t.id);
                                    handleAddCharsToInventory(validation.invalidChars, 'otherPhonemes');
                                }} className="btn-v btn-acc3-v">Add to Others</button>
                            </>
                        )}

                        {validation.type === 'invalid_pattern' && validation.detectedPattern && (
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddPattern(validation.detectedPattern, safeWord, cleanInputTrans, processedTags);
                            }} className="btn-v btn-acc-v">Add to patterns & Save</button>
                        )}

                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
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
                        onFocus={() => setActiveField('word')}
                        className="custom-font-text notranslate"
                    />
                </div>
                
                <div>
                    <Input 
                        label="IPA (Optional)" 
                        value={ipa}
                        onChange={(e) => updateField('ipa', e.target.value)}
                        onFocus={() => setActiveField('ipa')}
                    />
                    <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--tx2)', marginBottom: '4px' }}>
                            IPA Chart pastes into: <strong style={{ color: 'var(--acc)' }}>{activeField === 'word' ? 'Word' : 'IPA'}</strong>
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
                    >
                        <button 
                            className="clear-input-btn" 
                            onClick={() => updateField('wordClass', '')}
                            title="Clear Part of Speech"
                        >
                            <X size={14} />
                        </button>
                    </Input>
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
                <label className="input-label">Semantic Tags</label>
                <div className="tags-chip-container">
                    {formData.tags.map(tag => (
                        <span key={tag} className="tag-chip">
                            {tag}
                            <X size={12} onClick={() => removeTag(tag)} className="tag-remove-icon" />
                        </span>
                    ))}
                    <div className="tag-input-wrapper">
                        <input 
                            type="text"
                            className="tag-inner-input"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    handleAddTag(tagInput);
                                }
                            }}
                            onBlur={() => handleAddTag(tagInput)}
                            placeholder={formData.tags.length === 0 ? "Add tags..." : ""}
                            list="edit-semantic-tags"
                        />
                        <Plus size={16} className="tag-add-icon" onClick={() => handleAddTag(tagInput)} />
                    </div>
                </div>
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