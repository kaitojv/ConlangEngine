import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { Globe, Wand2, Type, LayoutTemplate, BoxSelect, Flame, Check, RefreshCw } from 'lucide-react';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { getConlangIcon, availableIcons } from '@/utils/iconMap.jsx';
import './onboardingWizard.css';

const PHONOLOGY_PRESETS = {
    standard: {
        name: "Standard",
        desc: "Balanced, similar to English or Spanish.",
        consonants: "p, t, k, m, n, s, l, r, f, v, h, j, w",
        vowels: "a, e, i, o, u",
        pattern: "CVC, CV, VC"
    },
    hawaiian: {
        name: "Island Minimal",
        desc: "Small inventory, open syllables like Hawaiian.",
        consonants: "p, k, m, n, l, h, w",
        vowels: "a, e, i, o, u",
        pattern: "CV, V"
    },
    germanic: {
        name: "Harsh Germanic",
        desc: "Lots of consonants and complex clusters.",
        consonants: "p, b, t, d, k, g, f, v, s, z, x, h, m, n, l, r",
        vowels: "a, e, i, o, u, y, ae",
        pattern: "CCVCC, CCVC, CVCC, CVC, CV"
    }
};

const STARTER_MEANINGS = [
    { translation: "I / Me", class: "pronoun" },
    { translation: "You", class: "pronoun" },
    { translation: "Water", class: "noun" },
    { translation: "Fire", class: "noun" },
    { translation: "Sun", class: "noun" },
    { translation: "To Be", class: "verb" },
    { translation: "To See", class: "verb" },
    { translation: "To Eat", class: "verb" },
    { translation: "Good", class: "adjective" },
    { translation: "Big", class: "adjective" }
];

export default function OnboardingWizard() {
    const navigate = useNavigate();
    const config = useConfigStore();
    const setLexicon = useLexiconStore(state => state.setLexicon);
    const { generateWord } = useWordGenerator();

    const [step, setStep] = useState(1);
    
    // Step 1 State
    const [name, setName] = useState(config.conlangName === 'My New Conlang' ? '' : config.conlangName);
    const [author, setAuthor] = useState(config.authorName === 'Author Name' ? '' : config.authorName);
    const [icon, setIcon] = useState(config.conlangIcon || 'Globe');
    const [scriptType, setScriptType] = useState(config.phonologyTypes || 'alphabetic');

    // Step 2 State
    const [consonants, setConsonants] = useState(config.consonants || PHONOLOGY_PRESETS.standard.consonants);
    const [vowels, setVowels] = useState(config.vowels || PHONOLOGY_PRESETS.standard.vowels);
    const [pattern, setPattern] = useState(config.syllablePattern || PHONOLOGY_PRESETS.standard.pattern);
    const [activePreset, setActivePreset] = useState('standard');

    // Step 3 State
    const [pluralMarker, setPluralMarker] = useState('-s');
    const [pastMarker, setPastMarker] = useState('-ed');

    // Step 4 State
    const [starterWords, setStarterWords] = useState([]);
    const [generating, setGenerating] = useState(false);

    // Make sure we have the generator hooked up properly by committing config before step 4
    const commitConfig = () => {
        const rules = [];
        if (pluralMarker.trim()) {
            rules.push({
                id: `rule_${Date.now()}_1`,
                ruleName: 'Plural',
                appliesTo: 'noun',
                pattern: `^(.*)$ => $1${pluralMarker.replace('-', '')}`
            });
        }
        if (pastMarker.trim()) {
            rules.push({
                id: `rule_${Date.now()}_2`,
                ruleName: 'Past Tense',
                appliesTo: 'verb',
                pattern: `^(.*)$ => $1${pastMarker.replace('-', '')}`
            });
        }

        config.updateConfig({
            conlangName: name || 'Untitled Conlang',
            authorName: author || 'Unknown',
            conlangIcon: icon,
            phonologyTypes: scriptType,
            consonants,
            vowels,
            syllablePattern: pattern,
            grammarRules: rules
        });
    };

    const handleNext = () => {
        if (step === 3) {
            commitConfig();
            handleGenerateStarters();
        }
        setStep(s => Math.min(4, s + 1));
    };

    const handleBack = () => {
        setStep(s => Math.max(1, s - 1));
    };

    const handleGenerateStarters = () => {
        setGenerating(true);
        // Little timeout to let UI update and config persist
        setTimeout(() => {
            const newWords = STARTER_MEANINGS.map(meaning => {
                const result = generateWord(meaning.class === 'pronoun' ? 1 : Math.random() > 0.5 ? 1 : 2, meaning.class);
                return {
                    id: `word_${Math.random().toString(36).substr(2, 9)}`,
                    word: result ? result.word : '?',
                    translation: meaning.translation,
                    wordClass: meaning.class,
                    ipa: result ? result.ipa : '?',
                    definition: `A basic ${meaning.class}.`,
                    etymology: null,
                    tags: ['starter']
                };
            });
            setStarterWords(newWords);
            setGenerating(false);
        }, 100);
    };

    const handleFinish = () => {
        commitConfig();
        // Append starter words to lexicon
        const existingLexicon = useLexiconStore.getState().lexicon || [];
        setLexicon([...existingLexicon, ...starterWords]);
        
        config.updateConfig({ hasCompletedOnboarding: true });
        navigate('/lexicon');
    };

    const handleSkip = () => {
        config.updateConfig({ hasCompletedOnboarding: true });
        navigate('/lexicon');
    };

    const renderStep1 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="step-title">Welcome! Let's name your creation.</h2>
            <p className="step-subtitle">You can change all of these settings later.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="generator-label">Conlang Name</label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. High Valyrian" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="generator-label">Author Name</label>
                        <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your Name" />
                    </div>
                </div>
                
                <div>
                    <label className="generator-label">Writing System Type</label>
                    <div className="script-grid">
                        <div className={`script-card ${scriptType === 'alphabetic' ? 'active' : ''}`} onClick={() => setScriptType('alphabetic')}>
                            <Type className="script-icon" />
                            <h4>Alphabetic</h4>
                            <p>Letters represent sounds (like English)</p>
                        </div>
                        <div className={`script-card ${scriptType === 'syllabary' ? 'active' : ''}`} onClick={() => setScriptType('syllabary')}>
                            <LayoutTemplate className="script-icon" />
                            <h4>Syllabary</h4>
                            <p>Symbols represent full syllables (like Japanese)</p>
                        </div>
                        <div className={`script-card ${scriptType === 'featural_block' ? 'active' : ''}`} onClick={() => setScriptType('featural_block')}>
                            <BoxSelect className="script-icon" />
                            <h4>Featural Block</h4>
                            <p>Symbols built from phonetic features (like Korean)</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderStep2 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="step-title">Phonology (The Sounds)</h2>
            <p className="step-subtitle">Pick a preset to fill out the sounds, or write your own!</p>
            
            <div className="preset-grid">
                {Object.entries(PHONOLOGY_PRESETS).map(([key, preset]) => (
                    <div 
                        key={key} 
                        className={`preset-card ${activePreset === key ? 'active' : ''}`}
                        onClick={() => {
                            setActivePreset(key);
                            setConsonants(preset.consonants);
                            setVowels(preset.vowels);
                            setPattern(preset.pattern);
                        }}
                    >
                        <h4>{preset.name}</h4>
                        <p>{preset.desc}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label className="generator-label">Consonants (Comma Separated)</label>
                    <Input value={consonants} onChange={e => {setConsonants(e.target.value); setActivePreset('custom');}} />
                </div>
                <div>
                    <label className="generator-label">Vowels (Comma Separated)</label>
                    <Input value={vowels} onChange={e => {setVowels(e.target.value); setActivePreset('custom');}} />
                </div>
                <div>
                    <label className="generator-label">Syllable Structure (e.g. CVC, CV)</label>
                    <Input value={pattern} onChange={e => {setPattern(e.target.value); setActivePreset('custom');}} />
                </div>
            </div>
        </motion.div>
    );

    const renderStep3 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="step-title">Basic Grammar</h2>
            <p className="step-subtitle">Let's define a couple of extremely basic rules. (You can add hundreds more later!)</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ background: 'var(--s2)', padding: '20px', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
                    <h4>How do you make a Noun plural?</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx3)', marginBottom: '10px' }}>In English, we add an "-s" to the end of the word.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--tx2)' }}>Word +</span>
                        <Input value={pluralMarker} onChange={e => setPluralMarker(e.target.value)} placeholder="-s" style={{ width: '150px' }} />
                    </div>
                </div>

                <div style={{ background: 'var(--s2)', padding: '20px', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
                    <h4>How do you make a Verb past-tense?</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx3)', marginBottom: '10px' }}>In English, we add "-ed" to the end of the word.</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--tx2)' }}>Word +</span>
                        <Input value={pastMarker} onChange={e => setPastMarker(e.target.value)} placeholder="-ed" style={{ width: '150px' }} />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const renderStep4 = () => (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="step-title">Starter Kit</h2>
            <p className="step-subtitle">We've used your sounds to generate 10 basic words. If you don't like them, reroll!</p>
            
            <Button variant="default" onClick={handleGenerateStarters} disabled={generating} style={{ marginBottom: '10px' }}>
                <div className="btn-content-flex"><RefreshCw size={16} className={generating ? 'spin' : ''}/> Reroll Words</div>
            </Button>

            {generating ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tx3)' }}>Forging words...</div>
            ) : (
                <div className="starter-words-grid">
                    {starterWords.map((word, i) => (
                        <div key={i} className="starter-word-card">
                            <div className="word notranslate custom-font-text">{word.word}</div>
                            <div className="meaning">{word.translation}</div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="onboarding-container">
            <div className="onboarding-card">
                <div className="onboarding-header">
                    <h1><Wand2 className="glow-icon" /> Conlang Setup Wizard</h1>
                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${(step / 4) * 100}%` }}></div>
                    </div>
                </div>

                <div className="onboarding-content">
                    <AnimatePresence mode="wait">
                        {step === 1 && <React.Fragment key="1">{renderStep1()}</React.Fragment>}
                        {step === 2 && <React.Fragment key="2">{renderStep2()}</React.Fragment>}
                        {step === 3 && <React.Fragment key="3">{renderStep3()}</React.Fragment>}
                        {step === 4 && <React.Fragment key="4">{renderStep4()}</React.Fragment>}
                    </AnimatePresence>
                </div>

                <div className="onboarding-footer">
                    <Button variant="default" onClick={handleSkip} style={{ opacity: 0.5 }}>Skip to Workspace</Button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {step > 1 && <Button variant="default" onClick={handleBack}>Back</Button>}
                        {step < 4 ? (
                            <Button variant="imp" onClick={handleNext}>Next Step</Button>
                        ) : (
                            <Button variant="imp" onClick={handleFinish}>
                                <div className="btn-content-flex"><Check size={16} /> Enter Workspace</div>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
