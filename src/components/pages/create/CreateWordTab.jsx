import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
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

export default function CreateWordTab() {
    const location = useLocation();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Global stores
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const configData = useConfigStore(); 
    const { phonologyTypes, grammarRules, vowels, verbMarker } = configData;
    
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

    // Validate and save the new root to our dictionary
    const handleSave = () => {
        const cleanWord = word.trim();
        const cleanTrans = translation.trim();

        if (!cleanWord || !cleanTrans) return alert("Please fill in both the word and the translation.");
        
        if (isDuplicate) {
            return alert("This word or translation already exists in your dictionary!");
        }

        // Clean up the word to ensure custom alien letters map correctly to the base orthography
        const safeWord = normalizeToBase(cleanWord);
        const validation = validateNewWord(safeWord, configData);
        
        // Warn the user if they break their own phonotactic rules, but let them bypass it
        if (!validation.valid) {
            const proceed = window.confirm(`⚠️ Phono-Syntax Warning:\n${validation.reason}\n\nDo you want to save it as an irregular exception anyway?`);
            if (!proceed) return; // User canceled to fix the word
        }

        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

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
        alert("Root saved successfully!");
    };

    // Spin up a live preview of how this word will interact with the language's grammar rules
    const derivedWords = useMemo(() => {
        if (!word || !translation) return [];

        const results = [];
        const safeBaseWord = normalizeToBase(word.trim());

        grammarRules.forEach(rule => {
            const ruleClasses = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            
            if (ruleClasses.includes('all') || ruleClasses.includes(wordClass.toLowerCase())) {
                let base = safeBaseWord;
                
                // If it's a verb, we strip the infinitive marker before applying affixes
                if (wordClass === 'verb' && verbMarker) {
                    const markers = verbMarker.split(',').map(m => m.trim());
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
    }, [word, translation, wordClass, grammarRules, vowels, verbMarker, normalizeToBase]);

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
                                    <div key={idx} className="preview-item">
                                        <span className="preview-word notranslate custom-font-text">
                                            {transliterate(item.derivedWord)}
                                        </span>
                                        <span className="preview-translation">
                                            {item.translationText}
                                        </span>
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
