import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { commonWords } from '@/components/pages/wordgenerator/commonWords.jsx';
import { Wand2, Send, Dna, BookCopy, SkipForward, Check } from 'lucide-react';
import './generatorTab.css';


export default function GeneratorTab() {
    const { generatedWord, generatedIpa, generatedClass, generateWord } = useWordGenerator();
    const [numSyllables, setNumSyllables] = useState(2);
    const [targetClass, setTargetClass] = useState('random');
    const navigate = useNavigate();

    // Pull global state required for the Derivations Preview
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const [isFillMode, setIsFillMode] = useState(false);

    const handleGenerate = () => {
        generateWord(numSyllables, targetClass);
    };

    const handleSendToCreateWord = () => {
        // Redirects to the Create Word tab and passes the generated word via React Router state
        navigate('/create', { 
            state: { 
                prefillWord: generatedWord, 
                prefillIpa: generatedIpa,
                prefillClass: generatedClass 
            } 
        });
    };

    // Generate the live preview of declensions/conjugations
    const derivations = useMemo(() => {
        if (!generatedWord) return [];
        
        let base = generatedWord;
        
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }
        if (generatedClass === 'verb' && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        const applicableRules = grammarRules.filter(rule => {
            const classes = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes(generatedClass.toLowerCase());
        });

        return applicableRules.map(rule => {
            const result = applyRuleToWord(base, rule, grammarRules, vowels);
            return { name: rule.name, result };
        });
    }, [generatedWord, generatedClass, grammarRules, vowels, verbMarker, cliticsRules]);

    if (isFillMode) {
        return <FillMode onExit={() => setIsFillMode(false)} />;
    }

    return (
        <div className="generator-container">
            <Card>
                <h2 className='flex sg-title generator-header-title'>
                    <Dna /> Word Generator
                </h2>
                <p className="generator-description">Configure the parameters below to generate a new phonotactically valid word based on your conlang's rules.</p>
                
                <div className="generator-input-row">
                    <div className="generator-input-group">
                        <label className="generator-label">Syllable Count</label>
                        <input 
                            type="number" min="1" max="10"
                            className="generator-input"
                            value={numSyllables} onChange={(e) => setNumSyllables(Number(e.target.value))} 
                        />
                    </div>
                    <div className="generator-input-group">
                        <label className="generator-label">Word Class</label>
                        <select 
                            className="generator-input"
                            value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
                        >
                            <option value="random">Random</option>
                            <option value="noun">Noun</option>
                            <option value="verb">Verb</option>
                            <option value="adjective">Adjective</option>
                            <option value="adverb">Adverb</option>
                            <option value="pronoun">Pronoun</option>
                        </select>
                    </div>
                </div>
                <Button onClick={handleGenerate}><div className="generator-btn-content"><Wand2 size={18} /> Generate Word</div></Button>

                <div className="fill-mode-prompt">
                    <p>Or, enter "Fill Mode" to translate a list of common words.</p>
                    <Button variant="edit" onClick={() => setIsFillMode(true)}>
                        <BookCopy size={18} /> Enter Fill Mode
                    </Button>
                </div>
            </Card>

            {generatedWord && (
                <Card>
                    <h2 className='flex sg-title' style={{ marginBottom: 0 }}>Laboratory Result</h2>
                    <div className="generator-result-section">
                        <h1 className="custom-font-text notranslate generator-result-word">{generatedWord}</h1>
                        <p className="generator-result-meta"><span className="notranslate generator-ipa">/{generatedIpa}/</span> <span className="generator-separator">|</span> <span className="generator-class-badge">{generatedClass}</span></p>
                    </div>
                    {derivations.length > 0 && (
                        <div className="derivation-preview-section">
                            <h3 className="derivation-preview-title">Derivation Preview</h3>
                            <div className="derivation-grid">
                                {derivations.map((d, i) => (<div key={i} className="derivation-item"><span className="derivation-rule-name">{d.name}</span><span className="custom-font-text notranslate derivation-result-word">{d.result || '---'}</span></div>))}
                            </div>
                        </div>
                    )}
                    <div className="generator-actions"><Button variant="imp" onClick={handleSendToCreateWord}><div className="generator-btn-content"><Send size={18} /> Send to Create Word</div></Button></div>
                </Card>
            )}
        </div>
    );
}

function FillMode({ onExit }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [conlangWord, setConlangWord] = useState('');
    
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const configData = useConfigStore();
    const { normalizeToBase } = useTransliterator();

    const currentChallenge = commonWords[currentIndex];

    const handleSkip = () => {
        setCurrentIndex(prev => (prev + 1) % commonWords.length);
        setConlangWord('');
    };

    const handleSaveAndNext = () => {
        const translation = currentChallenge.word;
        const wordClass = currentChallenge.class;

        if (!conlangWord.trim()) {
            alert("Please enter a translation.");
            return;
        }
        if (checkDuplicate(conlangWord, translation)) {
            alert("This word or translation already exists in your dictionary!");
            return;
        }

        const safeWord = normalizeToBase(conlangWord.trim());
        const validation = validateNewWord(safeWord, configData);
        
        if (!validation.valid) {
            const proceed = window.confirm(
                `⚠️ Phono-Syntax Warning:\n${validation.reason}\n\nDo you want to save it as an irregular exception anyway?`
            );
            if (!proceed) return;
        }

        addWord({
            word: safeWord,
            wordClass: wordClass,
            translation: translation,
        });

        handleSkip();
    };

    return (
        <div className="fill-mode-container">
            <Card>
                <div className="fill-mode-header">
                    <h2 className='flex sg-title'><BookCopy /> Fill Mode</h2>
                    <Button variant="cancel" onClick={onExit}>Exit Fill Mode</Button>
                </div>
                <p>Translate the common English word into your conlang. The word will be validated and added to your dictionary.</p>
                
                <div className="fill-challenge">
                    <div className="challenge-word-container">
                        <p className="challenge-label">Translate:</p>
                        <h1 className="challenge-word">{currentChallenge.word}</h1>
                        <p className="challenge-class">({currentChallenge.class})</p>
                    </div>
                    <Input
                        label="Your Conlang's Word"
                        value={conlangWord}
                        onChange={(e) => setConlangWord(e.target.value)}
                        placeholder="e.g., makin"
                        className="custom-font-text notranslate"
                        autoFocus
                    />
                </div>

                <div className="fill-actions">
                    <Button variant="default" onClick={handleSkip}><SkipForward size={18} /> Skip</Button>
                    <Button variant="save" onClick={handleSaveAndNext}><Check size={18} /> Save and Next</Button>
                </div>
            </Card>
        </div>
    );
}
