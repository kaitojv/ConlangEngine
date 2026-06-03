import React, { useState } from 'react';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Mascot from './Mascot.jsx';
import { X } from 'lucide-react';
import './exercisePlayer.css';

const EXERCISE_COUNT = 5;

export default function ExercisePlayer({ levelNode, onComplete, onExit, customLexicon, customConfig }) {
    const storeLexicon = useLexiconStore((state) => state.lexicon);
    const storeConfig = useConfigStore();
    
    const lexicon = customLexicon || storeLexicon;
    const config = customConfig || storeConfig;

    const { transliterate } = useTransliterator(customConfig);

    const [currentIndex, setCurrentIndex] = useState(() => {
        return (levelNode && levelNode.lessonNotes && levelNode.lessonNotes.trim().length > 0) ? -1 : 0;
    });
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [wordBankSelected, setWordBankSelected] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null); // For multiple choice
    
    // For matching pairs
    const [matchingSelected, setMatchingSelected] = useState({ conlang: null, english: null });
    const [matchedPairs, setMatchedPairs] = useState([]);

    const [feedback, setFeedback] = useState(null);
    const [isFinished, setIsFinished] = useState(false);

    // Initialize exercises once on mount
    const [exercises, setExercises] = useState(() => {
        if (!levelNode || !levelNode.phrases) return [];
        
        return levelNode.phrases.map(phrase => {
            let type = phrase.type || 'translate_to_english';
            
            const ex = {
                type,
                conlangSentence: phrase.conlang,
                englishSentence: phrase.english
            };

            if (type === 'word_bank') {
                const correctWords = phrase.conlang.split(' ').map(w => w.replace(/[.,!?]/g, '').trim()).filter(Boolean);
                let distractors = [];
                if (phrase.distractors) {
                    distractors = phrase.distractors.split(',').map(w => w.trim()).filter(Boolean);
                }
                ex.bank = [...correctWords, ...distractors].sort(() => 0.5 - Math.random());
            } else if (type === 'multiple_choice') {
                const wrongOptions = (phrase.options || []).filter(Boolean);
                ex.options = [...wrongOptions, phrase.english].sort(() => 0.5 - Math.random());
            } else if (type === 'matching_pairs') {
                const pairs = (phrase.pairs || []).filter(p => p.conlang && p.english);
                if (pairs.length > 0) {
                    ex.pairs = pairs;
                    ex.conlangList = [...pairs].sort(() => 0.5 - Math.random());
                    ex.englishList = [...pairs].sort(() => 0.5 - Math.random());
                } else {
                    ex.type = 'translate_to_english';
                }
            }
            return ex;
        });
    });

    if (exercises.length === 0) {
        return (
            <Card className="exercise-player">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h2>No phrases found!</h2>
                    <p>You need to add phrases to this level using the Course Builder.</p>
                    <Button variant="default" onClick={onExit}>Return to Map</Button>
                </div>
            </Card>
        );
    }

    if (isFinished) {
        return (
            <Card className="exercise-player finished-screen">
                <Mascot state="correct" isSpeaking={false} />
                <h2>Course Complete!</h2>
                <p>You've successfully completed the {levelNode?.title} lesson.</p>
                <Button variant="imp" onClick={onComplete}>Continue</Button>
            </Card>
        );
    }

    const currentEx = exercises[currentIndex];
    const progressPercent = (currentIndex / exercises.length) * 100;

    const advanceToNext = () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx >= exercises.length) {
            setIsFinished(true);
        } else {
            setCurrentIndex(nextIdx);
            setFeedback(null);
            setCurrentAnswer('');
            setWordBankSelected([]);
            setSelectedOption(null);
            setMatchingSelected({ conlang: null, english: null });
            setMatchedPairs([]);
        }
    };

    const checkAnswer = (e) => {
        if (e) e.preventDefault();
        if (feedback) {
            advanceToNext();
            return;
        }

        let isCorrect = false;
        
        if (currentEx.type === 'translate_to_english') {
            const expected = currentEx.englishSentence.toLowerCase().replace(/[.,!?]/g, '');
            const actual = currentAnswer.toLowerCase().replace(/[.,!?]/g, '').trim();
            isCorrect = (expected === actual);
        } else if (currentEx.type === 'translate_to_conlang') {
            const expected = currentEx.conlangSentence.toLowerCase().replace(/[.,!?]/g, '');
            const actual = currentAnswer.toLowerCase().replace(/[.,!?]/g, '').trim();
            isCorrect = (expected === actual);
        } else if (currentEx.type === 'word_bank') {
            const expected = currentEx.conlangSentence.toLowerCase();
            const actual = wordBankSelected.join(' ').toLowerCase();
            isCorrect = (expected === actual);
        } else if (currentEx.type === 'multiple_choice') {
            isCorrect = (selectedOption === currentEx.englishSentence);
        } else if (currentEx.type === 'matching_pairs') {
            // For matching pairs, 'Check' is only clicked when all are matched, so if button is active, it's correct
            isCorrect = (matchedPairs.length === currentEx.pairs.length);
        }

        if (isCorrect) {
            setFeedback({ status: 'correct', message: 'Excellent! Spot on.' });
        } else {
            const expectedDisplay = currentEx.type === 'translate_to_english' ? currentEx.englishSentence : currentEx.conlangSentence;
            setFeedback({ status: 'incorrect', message: `Oops! Correct answer: ${expectedDisplay}` });
            
            // Add current exercise to end of array to force review
            setExercises(prev => [...prev, currentEx]);
        }
    };

    const toggleWordBank = (word) => {
        if (wordBankSelected.includes(word)) {
            setWordBankSelected(prev => prev.filter(w => w !== word));
        } else {
            setWordBankSelected(prev => [...prev, word]);
        }
    };

    const handleMatchSelect = (type, value) => {
        const newSelected = { ...matchingSelected, [type]: value };
        setMatchingSelected(newSelected);

        if (newSelected.conlang && newSelected.english) {
            // Check if they match
            const isPair = currentEx.pairs.find(p => p.conlang === newSelected.conlang && p.english === newSelected.english);
            if (isPair) {
                setMatchedPairs(prev => [...prev, newSelected.conlang]);
            }
            // Reset selection after a short delay or immediately
            setTimeout(() => setMatchingSelected({ conlang: null, english: null }), 300);
        }
    };

    if (currentIndex === -1) {
        return (
            <Card className="exercise-player">
                <div className="ep-header">
                    <Button variant="default" onClick={onExit} style={{ padding: '8px' }}><X size={18} /></Button>
                    <h3 className="sg-title" style={{ margin: 0, paddingRight: '40px', flex: 1, textAlign: 'center' }}>Lesson Guide</h3>
                </div>
                <div className="ep-content" style={{ padding: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    <div style={{ background: 'var(--s1)', padding: '20px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                        {levelNode.lessonNotes}
                    </div>
                </div>
                <div className="ep-footer">
                    <Button variant="imp" onClick={() => setCurrentIndex(0)} style={{ width: '100%' }}>Start Exercises</Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className="exercise-player">
            <div className="ep-header">
                <Button variant="default" onClick={onExit} style={{ padding: '8px' }}><X size={18} /></Button>
                <div className="ep-progress-bar">
                    <div className="ep-progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            <div className="ep-content">
                {currentEx.type === 'teach' && (
                    <h3 className="ep-instruction" style={{ color: 'var(--acc)' }}>
                        Lesson Information
                    </h3>
                )}
                {currentEx.type !== 'teach' && (
                    <h3 className="ep-instruction">
                        {currentEx.type === 'translate_to_english' ? 'Translate this sentence into English:' 
                        : currentEx.type === 'translate_to_conlang' ? `Translate into ${config.conlangName || 'your conlang'}:`
                        : currentEx.type === 'word_bank' ? `Translate into ${config.conlangName || 'your conlang'}:`
                        : currentEx.type === 'multiple_choice' ? 'Select the correct translation:'
                        : 'Match the pairs:'}
                    </h3>
                )}

                {currentEx.type !== 'matching_pairs' && currentEx.type !== 'teach' && (
                    <div className="ep-prompt custom-font-text notranslate" style={{ fontSize: currentEx.type === 'translate_to_conlang' ? '1.5rem' : '2rem' }}>
                        {currentEx.type === 'translate_to_english' ? transliterate(currentEx.conlangSentence)
                        : currentEx.type === 'multiple_choice' ? transliterate(currentEx.conlangSentence)
                        : currentEx.englishSentence}
                    </div>
                )}

                {currentEx.type === 'translate_to_english' || currentEx.type === 'translate_to_conlang' ? (
                    <form onSubmit={checkAnswer} className="ep-input-area">
                        <Input 
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            placeholder={currentEx.type === 'translate_to_english' ? "Type your English translation..." : "Type your Conlang translation..."}
                            autoFocus
                            disabled={!!feedback}
                            className={currentEx.type === 'translate_to_conlang' ? "custom-font-text notranslate" : ""}
                        />
                    </form>
                ) : currentEx.type === 'multiple_choice' ? (
                    <div className="ep-multiple-choice">
                        {currentEx.options.map((opt, i) => (
                            <Button 
                                key={i} 
                                variant={selectedOption === opt ? 'imp' : 'default'}
                                onClick={() => setSelectedOption(opt)}
                                disabled={!!feedback}
                                style={{ width: '100%', marginBottom: '10px', justifyContent: 'flex-start', padding: '15px' }}
                            >
                                {opt}
                            </Button>
                        ))}
                    </div>
                ) : currentEx.type === 'matching_pairs' ? (
                    <div className="ep-matching-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="ep-match-col" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {currentEx.conlangList.map((item, i) => {
                                const isMatched = matchedPairs.includes(item.conlang);
                                const isSelected = matchingSelected.conlang === item.conlang;
                                return (
                                    <Button 
                                        key={`c-${i}`} 
                                        variant={isMatched ? 'save' : isSelected ? 'imp' : 'default'}
                                        onClick={() => !isMatched && handleMatchSelect('conlang', item.conlang)}
                                        disabled={isMatched || !!feedback}
                                        className="custom-font-text notranslate"
                                        style={{ opacity: isMatched ? 0.5 : 1 }}
                                    >
                                        {transliterate(item.conlang)}
                                    </Button>
                                );
                            })}
                        </div>
                        <div className="ep-match-col" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {currentEx.englishList.map((item, i) => {
                                const isMatched = matchedPairs.includes(item.conlang); // item.conlang is the key in matchedPairs
                                const isSelected = matchingSelected.english === item.english;
                                return (
                                    <Button 
                                        key={`e-${i}`} 
                                        variant={isMatched ? 'save' : isSelected ? 'imp' : 'default'}
                                        onClick={() => !isMatched && handleMatchSelect('english', item.english)}
                                        disabled={isMatched || !!feedback}
                                        style={{ opacity: isMatched ? 0.5 : 1 }}
                                    >
                                        {item.english}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : currentEx.type === 'word_bank' ? (
                    <div className="ep-word-bank-area">
                        <div className="ep-sentence-builder custom-font-text notranslate">
                            {wordBankSelected.length > 0 ? transliterate(wordBankSelected.join(' ')) : <span className="ep-placeholder">Construct your sentence...</span>}
                        </div>
                        <div className="ep-word-bank">
                            {currentEx.bank.map((word, i) => (
                                <button 
                                    key={i} 
                                    className={`ep-word-block custom-font-text notranslate ${wordBankSelected.includes(word) ? 'selected' : ''}`}
                                    onClick={() => toggleWordBank(word)}
                                    disabled={!!feedback}
                                >
                                    {transliterate(word)}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : currentEx.type === 'teach' ? (
                    <div className="ep-teach" style={{ padding: '20px', background: 'var(--s1)', borderRadius: '8px', border: '1px solid var(--bd)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.1rem', marginTop: '10px' }}>
                        {currentEx.englishSentence}
                    </div>
                ) : null}
            </div>

            <div className={`ep-footer ${feedback ? feedback.status : ''}`}>
                {currentEx.type === 'teach' ? (
                    <Button 
                        variant="imp" 
                        onClick={advanceToNext} 
                        style={{ width: '100%', padding: '15px' }}
                        className="ep-check-btn"
                    >
                        Got it! Continue
                    </Button>
                ) : (
                    <>
                        {feedback && (
                            <div className="ep-feedback-msg">
                                <Mascot state={feedback.status} isSpeaking={false} size="small" />
                                <p>{feedback.message}</p>
                            </div>
                        )}
                        <Button 
                            variant={feedback ? (feedback.status === 'correct' ? 'save' : 'error') : 'imp'} 
                            onClick={checkAnswer}
                            disabled={!feedback && currentEx.type === 'matching_pairs' && matchedPairs.length !== currentEx.pairs.length}
                            className="ep-check-btn"
                        >
                            {feedback ? 'Continue' : 'Check'}
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}
