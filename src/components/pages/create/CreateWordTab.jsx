// src/components/pages/dictionary/CreateWordTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
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
import FontStudioModal from '../../UI/Fontstudio/fontStudio.jsx';


export default function CreateWordTab() {
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    
    const configData = useConfigStore(); 
    const { phonologyTypes, grammarRules, vowels, verbMarker } = configData;
    

    // 2. CALLING THE NORMALIZER FUNCTION
    const { normalizeToBase, transliterate } = useTransliterator();
    const location = useLocation();

    const [word, setWord] = useState('');
    const [ipa, setIpa] = useState('');
    const [wordClass, setWordClass] = useState('noun');
    const [translation, setTranslation] = useState('');
    const [tags, setTags] = useState('');
    const [ideogram, setIdeogram] = useState('');
    const [isFontStudioOpen, setIsFontStudioOpen] = useState(false);

    // Catch the generated word from the Generator Tab and pre-fill the inputs
    useEffect(() => {
        if (location.state?.prefillWord) {
            setWord(location.state.prefillWord);
            if (location.state.prefillIpa) setIpa(location.state.prefillIpa);
            if (location.state.prefillClass) setWordClass(location.state.prefillClass);
        }
    }, [location.state]);

    const isDuplicate = checkDuplicate(word, translation) && (word !== '' || translation !== '');

    const handleSave = () => {
        if (!word.trim() || !translation.trim()) {
            alert("Please fill in both the word and the translation.");
            return;
        }
        if (isDuplicate) {
            alert("This word or translation already exists in your dictionary!");
            return;
        }



        // 3. CLEANING THE WORD BEFORE SAVING (e.g., if input is "maრ", it becomes "mar")
        const safeWord = normalizeToBase(word.trim());

        const validation = validateNewWord(safeWord, configData);
        
        if (!validation.valid) {
            const proceed = window.confirm(
                `⚠️ Phono-Syntax Warning:\n${validation.reason}\n\nDo you want to save it as an irregular exception anyway?`
            );
            if (!proceed) return; // User canceled to fix the word
        }

        const processedTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

        addWord({
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass,
            translation: translation.trim(),
            tags: processedTags,
            ideogram: ideogram.trim()
        });

        setWord('');
        setIpa('');
        setWordClass('noun');
        setTranslation('');
        setTags('');
        setIdeogram('');
        alert("Root saved successfully!");
    };

    // 4. CLEANING THE WORD IN THE REAL-TIME PREVIEW
    const derivedWords = useMemo(() => {
        if (!word || !translation) return [];

        let results = [];
        // Clean the word so the Preview doesn't break with custom alien letters
        const safeBaseWord = normalizeToBase(word.trim());

        grammarRules.forEach(rule => {
            let ruleClasses = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            if (ruleClasses.includes('all') || ruleClasses.includes(wordClass.toLowerCase())) {
                
                let base = safeBaseWord; // Use the safe base
                
                if (wordClass === 'verb' && verbMarker) {
                    const markers = verbMarker.split(',').map(m => m.trim());
                    const match = markers.find(m => base.endsWith(m));
                    if (match) base = base.slice(0, -match.length);
                }

                let result = applyRuleToWord(base, rule, grammarRules, vowels);

                if (result !== null) {
                    results.push({
                        // Note: When rendering the list later, we will pass this through transliterate()
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
                            onChange={(e) => setWord(e.target.value)}
                            placeholder="e.g., makin"
                            className="custom-font-text notranslate"
                        />
                    </div>
                    <div>
                        <Input 
                            label="IPA (OPTIONAL)" 
                            value={ipa}
                            onChange={(e) => setIpa(e.target.value)}
                            placeholder="/ma'kin/"
                        />
                    </div>
                    <div>
                        <Input 
                            label="PART OF SPEECH"
                            value={wordClass}
                            onChange={(e) => setWordClass(e.target.value.toLowerCase())}
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
                                onChange={(e) => setIdeogram(e.target.value)}
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
                    onChange={(e) => setTranslation(e.target.value)}
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
                        onChange={(e) => setTags(e.target.value)}
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
                    targetLabel={word || 'New Ideogram'} 
                    onSave={(newChar) => {
                        setIdeogram(prev => prev + newChar);
                        setIsFontStudioOpen(false);
                    }} 
                    onCancel={() => setIsFontStudioOpen(false)} 
                />
            </Modal>
        </div>
    );
}