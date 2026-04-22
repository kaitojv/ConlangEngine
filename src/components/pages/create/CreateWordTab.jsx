import React, { useState, useEffect, useMemo } from 'react';
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

export default function CreateWordTab() {
    const location = useLocation();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Global stores
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const { phonologyTypes, grammarRules, vowels, verbMarker } = useConfigStore(useShallow(state => ({
        phonologyTypes: state.phonologyTypes,
        grammarRules: state.grammarRules,
        vowels: state.vowels,
        verbMarker: state.verbMarker
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

    const saveConfirmedWord = (safeWord, cleanTrans, processedTags) => {
        addWord({
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass,
            translation: cleanTrans,
            tags: processedTags,
            ideogram: ideogram.trim()
        });

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
                    <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
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

        saveConfirmedWord(safeWord, cleanTrans, processedTags);

        // Also save any selected derivations
        derivedWords.forEach((item, idx) => {
            if (selectedDerivs[idx]) {
                // Determine the best class for the derivation
                const rule = grammarRules.find(r => r.name === item.ruleName);
                let targetClass = wordClass; // Fallback
                if (rule) {
                    const ruleClasses = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
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
    const derivedWords = (() => {
        if (!word || !translation) return [];

        const results = [];
        const safeBaseWord = normalizeToBase(word.trim());

        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];

        grammarRules.forEach(rule => {
            const ruleClasses = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            
            if (ruleClasses.includes('all') || currentClasses.some(cc => ruleClasses.includes(cc))) {
                let base = safeBaseWord;
                
                // If it's a verb, we strip the infinitive marker before applying affixes
                if (currentClasses.includes('verb') && verbMarker) {
                    const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
                    const match = markers.find(m => base.endsWith(m));
                    if (match) base = base.slice(0, -match.length);
                }

                const result = applyRuleToWord(base, rule, grammarRules, vowels);

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
    })();

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
                            placeholder="e.g., makin"
                            className="custom-font-text notranslate"
                        />
                    </div>
                    <div>
                        <Input 
                            label="IPA (OPTIONAL)" 
                            value={ipa}
                            onChange={(e) => updateField('ipa', e.target.value)}
                            placeholder="/ma'kin/"
                        />
                        <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
                            <IpaChart onSelect={(char) => updateField('ipa', ipa + char)} />
                        </div>
                    </div>
                    <div>
                        <Input 
                            label="PART OF SPEECH"
                            value={wordClass}
                            onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                            placeholder="Ex: noun, verb, classifier..."
                            list="word-classes"
                        />
                        
                        {/* The datalist provides native browser autocomplete suggestions */}
                        <datalist id="word-classes">
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
                    />
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
