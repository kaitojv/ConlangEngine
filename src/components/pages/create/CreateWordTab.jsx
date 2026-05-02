import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Sparkles, AlertTriangle, Save, Brush } from 'lucide-react';
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
    const { normalizeToBase, transliterate } = useTransliterator();

    // Track which input field the IPA chart should paste into
    const activeFieldRef = useRef('ipa'); // default to IPA field

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
        updateConfig: state.updateConfig
    })));
    
    // Let's track all our input fields in one neat object
    const [formData, setFormData] = useState({
        word: '',
        ipa: '',
        wordClass: 'noun',
        translation: '',
        tags: '',
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

    // If the user generated a word in the Generator Tab and clicked "Add to Dictionary", we catch it here
    useEffect(() => {
        if (location.state?.prefillWord) {
            setFormData(prev => ({
                ...prev,
                word: location.state.prefillWord,
                ipa: location.state.prefillIpa || prev.ipa,
                wordClass: location.state.prefillClass || prev.wordClass
            }));
        }
    }, [location.state]);

    const isDuplicate = checkDuplicate(word, translation) && (word !== '' || translation !== '');

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        const field = activeFieldRef.current;
        updateField(field, formData[field] + char);
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
    const handleAddPattern = (pattern) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);
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
        setFormData({ word: '', ipa: '', wordClass: 'noun', translation: '', tags: '', ideogram: '' });
        setSelectedDerivs({});
        setCustomTranslations({});
        toast.success("Root and selected derivations saved successfully!");
    };

    // Validate and save the new root to our dictionary
    const handleSave = () => {
        const cleanWord = word.trim();
        const cleanTrans = translation.trim();

        if (!cleanWord || !cleanTrans) {
            return toast.error("Please fill in both the word and the translation.");
        }
        
        if (isDuplicate) {
            return toast.error("This word or translation already exists in your dictionary!");
        }

        // Clean up the word to ensure custom alien letters map correctly to the base orthography
        const safeWord = normalizeToBase(cleanWord);
        const validation = validateNewWord(safeWord, useConfigStore.getState());
        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        
        // Warn the user if they break their own phonotactic rules, but let them bypass it
        if (!validation.valid) {
            toast.custom((t) => (
                <div style={{ background: 'var(--s4)', color: 'var(--tx)', padding: '15px', borderRadius: '8px', border: '1px solid var(--err)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p style={{fontSize: '0.9rem', color: 'var(--tx2)'}}>Do you want to save it as an irregular exception anyway?</p>
                    <div style={{display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap'}}>
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            saveConfirmedWord(safeWord, cleanTrans, processedTags);
                        }} style={{padding: '5px 10px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save Anyway</button>
                        
                        {/* Quick Fix: Add invalid characters to inventory */}
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

                        {/* Quick Fix: Add detected pattern to syllable patterns */}
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

        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        if (currentClasses.includes('verb') && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
            const match = markers.find(m => safeWord.endsWith(m));
            if (!match) {
                toast.custom((t) => (
                    <div style={{ background: 'var(--s4)', color: 'var(--tx)', padding: '15px', borderRadius: '8px', border: '1px solid var(--err)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <strong>⚠️ Verb Marker Missing</strong>
                        <span>This word is marked as a verb, but it doesn't end with any of your defined verb markers ({verbMarker}).</span>
                        <p style={{fontSize: '0.9rem', color: 'var(--tx2)'}}>Do you want to save it anyway?</p>
                        <div style={{display: 'flex', gap: '8px', marginTop: '5px', flexWrap: 'wrap'}}>
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                saveConfirmedWord(safeWord, cleanTrans, processedTags);
                            }} style={{padding: '5px 10px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Save Anyway</button>
                            <button onClick={() => toast.dismiss(t.id)} style={{padding: '5px 10px', background: 'var(--s2)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
                        </div>
                    </div>
                ), { duration: Infinity });
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
                            onFocus={() => { activeFieldRef.current = 'word'; }}
                            placeholder="e.g., makin"
                            className="custom-font-text notranslate"
                        />
                    </div>
                    <div>
                        <Input 
                            label="IPA (OPTIONAL)" 
                            value={ipa}
                            onChange={(e) => updateField('ipa', e.target.value)}
                            onFocus={() => { activeFieldRef.current = 'ipa'; }}
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
                        />
                        
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
                        IPA Chart pastes into: <strong style={{ color: 'var(--acc)' }}>{activeFieldRef.current === 'word' ? 'Word' : 'IPA'}</strong> field. Click a field above to change target.
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
                        Warning: This root or translation already exists in your dictionary!
                    </div>
                )}

                <div className="tags-section">
                    <Input 
                        label="Semantic Tags" 
                        value={tags}
                        onChange={(e) => updateField('tags', e.target.value)}
                        placeholder="Ex: nature, abstract, emotion (comma separated)"
                        list="semantic-tags"
                    />
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

                <Button 
                    variant="save" 
                    className="create-word-save-btn"
                    onClick={handleSave}
                >
                    <Save size={20} /> Save Root to Dictionary
                </Button>
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
