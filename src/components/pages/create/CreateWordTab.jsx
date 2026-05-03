import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Sparkles, AlertTriangle, Save, Brush, X, Plus } from 'lucide-react';
import { applyRuleToWord } from '../../../utils/morphologyEngine.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import './createWordTab.css';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import toast from 'react-hot-toast';

// Standard POS options that always show in the dropdown
const STANDARD_WORD_CLASSES = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'particle', 'conjunction', 'preposition'
];

export default function CreateWordTab() {
    const location = useLocation();
    const navigate = useNavigate();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Track which input field the IPA chart should paste into
    const [activeField, setActiveField] = useState('ipa'); // default to IPA field
    const [activeToastId, setActiveToastId] = useState(null);
    const [tagInput, setTagInput] = useState('');

    // Global stores
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { phonologyTypes, grammarRules, vowels, consonants, otherPhonemes, syllablePattern, verbMarker,
            customWordClasses, customTags, addCustomWordClass, addCustomTag,
            updateConfig } = useConfigStore(useShallow(state => ({
        phonologyTypes: state.phonologyTypes,
        grammarRules: state.grammarRules,
        vowels: state.vowels,
        consonants: state.consonants,
        otherPhonemes: state.otherPhonemes,
        syllablePattern: state.syllablePattern,
        verbMarker: state.verbMarker,
        customWordClasses: state.customWordClasses || [],
        customTags: state.customTags || [],
        addCustomWordClass: state.addCustomWordClass,
        addCustomTag: state.addCustomTag,
        autoReturnToLexicon: state.autoReturnToLexicon,
        updateConfig: state.updateConfig
    })));
    
    // Let's track all our input fields in one neat object
    const [formData, setFormData] = useState({
        word: '',
        ipa: '',
        wordClass: 'noun',
        translation: '',
        tags: [],
        ideogram: ''
    });
    
    const { word, ipa, wordClass, translation, tags, ideogram } = formData;
    const [isFontStudioOpen, setIsFontStudioOpen] = useState(false);
    const [selectedDerivs, setSelectedDerivs] = useState({});
    const [customTranslations, setCustomTranslations] = useState({});

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Build the merged POS list: standard + custom (deduplicated)
    const allWordClasses = useMemo(() => {
        const merged = new Set([...STANDARD_WORD_CLASSES]);
        customWordClasses.forEach(cls => merged.add(cls));
        // Also add any unique classes found in the existing lexicon
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

    // Build the merged tags list for autocomplete
    const allTags = useMemo(() => {
        const merged = new Set(customTags);
        lexicon.forEach(w => {
            if (w.tags) w.tags.forEach(tag => merged.add(tag.toLowerCase()));
        });
        return [...merged].sort();
    }, [customTags, lexicon]);

    // If the user generated a word in the Generator Tab and clicked "Add to Lexicon", we catch it here
    useEffect(() => {
        if (location.state?.prefillWord) {
            setFormData(prev => ({
                ...prev,
                word: location.state.prefillWord,
                ipa: location.state.prefillIpa || prev.ipa,
                wordClass: location.state.prefillClass || prev.wordClass
            }));
        }

        // Cleanup toasts on unmount
        return () => toast.dismiss();
    }, [location.state]);

    const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(word, translation);
    const isDuplicate = (isDuplicateWord || isDuplicateTranslation) && (word !== '' || translation !== '');

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        updateField(activeField, formData[activeField] + char);
    };

    // Quick-fix action: add invalid characters to consonants or vowels
    const handleAddCharsToInventory = (chars, type) => {
        const currentList = type === 'consonants' ? consonants : vowels;
        const arr = currentList.trim() ? currentList.trim().split(',').map(s => s.trim()) : [];
        chars.forEach(ch => {
            if (!arr.includes(ch)) arr.push(ch);
        });
        updateConfig({ [type]: arr.join(', ') });
        toast.success(`Added "${chars.join(', ')}" to ${type}.`);
    };

    // Quick-fix action: add detected pattern to syllable patterns
    const handleAddPattern = (pattern, safeWord, cleanTrans, processedTags) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);
        
        // After adding the pattern, we should save the word too!
        saveConfirmedWord(safeWord, cleanTrans, processedTags);
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

    const saveConfirmedWord = (safeWord, cleanTrans, processedTags) => {
        addWord({
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass,
            translation: cleanTrans,
            tags: processedTags,
            ideogram: ideogram.trim()
        });

        // Persist any new custom POS/tags
        if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.toLowerCase())) {
            addCustomWordClass(wordClass);
        }
        processedTags.forEach(tag => addCustomTag(tag));

        // Reset the form for the next word
        setFormData({ word: '', ipa: '', wordClass: 'noun', translation: '', tags: [], ideogram: '' });
        setSelectedDerivs({});
        setCustomTranslations({});
        toast.success("Root and selected derivations saved successfully!");

        if (autoReturnToLexicon) {
            navigate('/lexicon');
        }
    };

    const showValidationToast = (content) => {
        if (activeToastId) toast.dismiss(activeToastId);
        const newId = toast.custom(content, { duration: Infinity });
        setActiveToastId(newId);
    };

    // Validate and save the new root to our lexicon
    const handleSave = () => {
        const cleanWord = word.trim();
        const cleanTrans = translation.trim();

        if (!cleanWord || !cleanTrans) {
            return toast.error("Please fill in both the word and the translation.");
        }
        


        // Clean up the word to ensure custom alien letters map correctly to the base orthography
        const safeWord = normalizeToBase(cleanWord);
        const validation = validateNewWord(safeWord, useConfigStore.getState());
        const processedTags = [...formData.tags].sort();

        // 1. DUPLICATE CHECK (Warnings, not blocks)
        if (isDuplicate) {
            let warningMsg = "";
            if (isDuplicateWord && isDuplicateTranslation) {
                warningMsg = "This exact word and translation already exist in your lexicon.";
            } else if (isDuplicateWord) {
                warningMsg = "This word already exists (Homonym). Save it as a new entry with this different meaning?";
            } else {
                warningMsg = "This translation already exists (Synonym). Save it as a new entry with this different spelling?";
            }

            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Duplicate Detected</strong>
                    <span>{warningMsg}</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            // Bypass duplicate check and continue to validation
                            proceedToValidation(safeWord, cleanTrans, processedTags);
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToValidation(safeWord, cleanTrans, processedTags);
    };

    const proceedToValidation = (safeWord, cleanTrans, processedTags) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState());

        // 2. PHONOTACTIC VALIDATION
        if (!validation.valid) {
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p style={{fontSize: '0.9rem', color: 'var(--tx2)'}}>Do you want to save it as an irregular exception anyway?</p>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            proceedToGrammarValidation(safeWord, cleanTrans, processedTags);
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
                                handleAddPattern(validation.detectedPattern, safeWord, cleanTrans, processedTags);
                            }} className="btn-v btn-acc-v">Add to patterns & Save</button>
                        )}

                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToGrammarValidation(safeWord, cleanTrans, processedTags);
    };

    const proceedToGrammarValidation = (safeWord, cleanTrans, processedTags) => {
        // 3. POS CONFIRMATION (If new)
        const normalizedPOS = wordClass.toLowerCase().trim();
        if (normalizedPOS && !allWordClasses.includes(normalizedPOS)) {
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>📝 New Part of Speech</strong>
                    <span>"{normalizedPOS}" does not exist in your grammar settings. Add it globally?</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            finalizeSave(safeWord, cleanTrans, processedTags);
                        }} className="btn-v btn-acc-v">Add & Save</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        finalizeSave(safeWord, cleanTrans, processedTags);
    };

    const finalizeSave = (safeWord, cleanTrans, processedTags) => {
        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        if (currentClasses.includes('verb') && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
            const match = markers.find(m => safeWord.endsWith(m));
            if (!match) {
                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong>⚠️ Verb Marker Missing</strong>
                        <span>This word is marked as a verb, but it doesn't end with any of your defined verb markers ({verbMarker}).</span>
                        <div className="toast-actions-v">
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                saveConfirmedWord(safeWord, cleanTrans, processedTags);
                            }} className="btn-v btn-err-v">Save Anyway</button>
                            <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                        </div>
                    </div>
                ));
                return;
            }
        }

        saveConfirmedWord(safeWord, cleanTrans, processedTags);

        // Also save any selected derivations
        derivedWords.forEach((item, idx) => {
            if (selectedDerivs[idx]) {
                // Determine the best class for the derivation
                const rule = grammarRules.find(r => r.name === item.ruleName);
                let targetClass = wordClass; // Fallback
                if (rule) {
                    const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
                    if (!ruleClasses.includes('all')) {
                        targetClass = ruleClasses[0]; // Use the specific class the rule applies to
                    } else if (wordClass.includes(',')) {
                        targetClass = wordClass.split(',')[0].trim(); // Use the first class of the root
                    }
                }

                addWord({
                    word: item.derivedWord,
                    ipa: '', // Derivations don't auto-generate IPA yet
                    wordClass: targetClass,
                    translation: customTranslations[idx] !== undefined ? customTranslations[idx].trim() : item.translationText,
                    tags: processedTags,
                    ideogram: ''
                });
            }
        });
    };

    // Spin up a live preview of how this word will interact with the language's grammar rules
    // BUG-4: Memoize to avoid running the morphology engine on every render
    const derivedWords = useMemo(() => {
        if (!word || !translation) return [];

        const results = [];
        const safeBaseWord = normalizeToBase(word.trim());
        const processedTags = [...formData.tags].sort();

        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];

        grammarRules.forEach(rule => {
            const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            
            if (ruleClasses.includes('all') || currentClasses.some(cc => ruleClasses.includes(cc))) {
                let base = safeBaseWord;
                
                // Verb markers are no longer stripped, they only act as a validation warning during creation

                const result = applyRuleToWord(base, rule, grammarRules, vowels, consonants, otherPhonemes);

                if (result) {
                    results.push({
                        derivedWord: result, 
                        ruleName: rule.name,
                        translationText: `${translation} (${rule.name.toLowerCase()})`
                    });
                }
            }
        });

        return results;
    }, [word, translation, wordClass, grammarRules, verbMarker, vowels, normalizeToBase]);

    return (
        <div className="create-word-container">
            <Card>
                <h2 className="create-word-title">
                    <Sparkles className="title-icon" /> Create New Root
                </h2>

                <div className="input-grid">
                    <div>
                        <Input 
                            label="WORD (CONLANG)" 
                            value={word}
                            onChange={(e) => updateField('word', e.target.value)}
                            onFocus={() => setActiveField('word')}
                            placeholder="e.g., makin"
                            className="custom-font-text notranslate"
                        />
                    </div>
                    <div>
                        <Input 
                            label="IPA (OPTIONAL)" 
                            value={ipa}
                            onChange={(e) => updateField('ipa', e.target.value)}
                            onFocus={() => setActiveField('ipa')}
                            placeholder="/ma'kin/"
                        />
                    </div>
                    <div>
                        <Input 
                            label="PART OF SPEECH"
                            value={wordClass}
                            onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                            placeholder="Ex: noun, verb, classifier..."
                            list="word-classes"
                        >
                            <button 
                                className="clear-input-btn" 
                                onClick={() => updateField('wordClass', '')}
                                title="Clear Part of Speech"
                            >
                                <X size={14} />
                            </button>
                        </Input>
                        
                        {/* Merged datalist: standard + user-defined classes */}
                        <datalist id="word-classes">
                            {allWordClasses.map(cls => (
                                <option key={cls} value={cls} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* IPA chart spans the full card width so it doesn't overflow the column grid */}
                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginBottom: '6px' }}>
                        IPA Chart pastes into: <strong style={{ color: 'var(--acc)' }}>{activeField === 'word' ? 'Word' : 'IPA'}</strong> field. Click a field above to change target.
                    </p>
                    <IpaChart onSelect={handleIpaSelect} />
                </div>

                {phonologyTypes === 'logographic' && (
                    <div className="ideogram-section">
                        <div className="ideogram-input-wrapper">
                            <Input 
                                label="IDEOGRAM / SYMBOL" 
                                value={ideogram}
                                onChange={(e) => updateField('ideogram', e.target.value)}
                                placeholder="e.g., 水"
                                className="ideogram-input notranslate custom-font-text"
                            />
                        </div>
                        <div className="ideogram-action">
                            <Button variant="edit" onClick={() => setIsFontStudioOpen(true)}>
                                <Brush size={16} /> Draw Symbol
                            </Button>
                        </div>
                    </div>
                )}

                <Input 
                    label="Translation / Definition" 
                    value={translation}
                    onChange={(e) => updateField('translation', e.target.value)}
                    placeholder="Meaning in English..."
                />

                {isDuplicate && (
                    <div className="warning-box">
                        <AlertTriangle size={18} />
                        Warning: {isDuplicateWord && isDuplicateTranslation ? "This word and translation already exist in your lexicon." : isDuplicateWord ? "This word already exists (Homonym)." : "This translation already exists (Synonym)."}
                    </div>
                )}

                <div className="tags-section">
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
                                placeholder={formData.tags.length === 0 ? "Add tags (nature, emotion...)" : ""}
                                list="semantic-tags"
                            />
                            <Plus size={16} className="tag-add-icon" onClick={() => handleAddTag(tagInput)} />
                        </div>
                    </div>
                    {/* Autocomplete from previously used tags */}
                    <datalist id="semantic-tags">
                        {allTags.map(tag => (
                            <option key={tag} value={tag} />
                        ))}
                    </datalist>
                </div>

                {word && translation && grammarRules.length > 0 && (
                    <div className="preview-box">
                        <span className="preview-title">
                            Auto-Derivations Preview
                        </span>
                        
                        {derivedWords.length > 0 ? (
                            <div className="preview-grid">
                                {derivedWords.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`preview-item ${selectedDerivs[idx] ? 'selected' : ''}`}
                                        onClick={() => setSelectedDerivs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                        title="Click to save alongside root"
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '10px' }}>
                                            <span className="preview-word notranslate custom-font-text">
                                                {transliterate(item.derivedWord)}
                                            </span>
                                            <input 
                                                type="text"
                                                className="preview-translation-input"
                                                value={customTranslations[idx] !== undefined ? customTranslations[idx] : item.translationText}
                                                onChange={(e) => setCustomTranslations(prev => ({ ...prev, [idx]: e.target.value }))}
                                                onClick={(e) => e.stopPropagation()} // Prevent toggling the checkbox when editing translation
                                                placeholder={item.translationText}
                                            />
                                        </div>
                                        <div className="preview-checkbox">
                                            {selectedDerivs[idx] && <span style={{ color: 'var(--bg)' }}>✓</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <i className="preview-empty">No matching grammar rules found for this class.</i>
                        )}
                    </div>
                )}

                <div className="create-word-actions" style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <Button 
                        variant="save" 
                        style={{ flex: 2 }}
                        onClick={handleSave}
                    >
                        <Save size={20} /> Save Root to Lexicon
                    </Button>
                    <Button 
                        variant="edit" 
                        style={{ flex: 1 }}
                        onClick={() => navigate('/lexicon')}
                    >
                        View Lexicon
                    </Button>
                </div>
            </Card>

            <Modal 
                isOpen={isFontStudioOpen} 
                onClose={() => setIsFontStudioOpen(false)} 
                title="Draw Custom Ideogram"
            >
                <FontStudioModal 
                    targetLabel={word || 'New Root'} 
                    onSave={(newChar) => {
                        updateField('ideogram', ideogram + newChar);
                        setIsFontStudioOpen(false);
                    }} 
                    onCancel={() => setIsFontStudioOpen(false)} 
                />
            </Modal>
        </div>
    );
}
