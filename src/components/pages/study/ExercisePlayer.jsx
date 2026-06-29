import React, { useState } from 'react';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Mascot from './Mascot.jsx';
import { X, Share2, Star } from 'lucide-react';
import { calculateStars, calculateXP } from '@/utils/xpSystem.js';
import * as LucideIcons from 'lucide-react';
import './exercisePlayer.css';

const renderRichText = (text) => {
    if (!text) return null;
    
    // Split by **bold**, *italic*, __underline__, and [icon:Name]
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|\[icon:[a-zA-Z0-9]+\])/g);
    
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('__') && part.endsWith('__')) {
            return <u key={i}>{part.slice(2, -2)}</u>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('[icon:') && part.endsWith(']')) {
            const iconName = part.slice(6, -1);
            const IconComponent = LucideIcons[iconName];
            return IconComponent ? <IconComponent key={i} size={18} style={{ verticalAlign: 'middle', margin: '0 4px', display: 'inline-block' }} /> : part;
        }
        return <span key={i}>{part}</span>;
    });
};

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
    const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

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

            if (type === 'word_bank' || type === 'sentence_reorder') {
                const correctWords = phrase.conlang.split(' ').map(w => w.replace(/[.,!?]/g, '').trim()).filter(Boolean);
                let distractors = [];
                if (type === 'word_bank' && phrase.distractors) {
                    distractors = phrase.distractors.split(',').map(w => w.trim()).filter(Boolean);
                }
                ex.bank = [...correctWords, ...distractors].sort(() => 0.5 - Math.random());
            } else if (type === 'multiple_choice') {
                const wrongOptions = (phrase.options || []).filter(Boolean);
                ex.options = [...wrongOptions, phrase.english].sort(() => 0.5 - Math.random());
            } else if (type === 'true_false') {
                ex.isTrue = Math.random() > 0.5;
                if (ex.isTrue) {
                    ex.displayEnglish = phrase.english;
                } else {
                    const fallbackWords = lexicon.filter(w => w.translation !== phrase.english);
                    const wrong = fallbackWords.length > 0 ? fallbackWords[Math.floor(Math.random() * fallbackWords.length)].translation.split(/[,(]/)[0].trim() : "wrong answer";
                    ex.displayEnglish = wrong;
                }
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

    React.useEffect(() => {
        if (exercises.length > 0 && sessionStats.total === 0 && !levelNode?.isTimed) {
            setSessionStats(prev => ({ ...prev, total: exercises.filter(e => e.type !== 'teach').length }));
        }
    }, [exercises.length]);

    const [timeLeft, setTimeLeft] = useState(levelNode?.isTimed ? 60 : null);

    React.useEffect(() => {
        if (timeLeft === null || isFinished) return;
        
        if (timeLeft <= 0) {
            setIsFinished(true);
            return;
        }

        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isFinished]);

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

    const handleShareScore = () => {
        const stars = calculateStars(sessionStats.correct, sessionStats.total);
        const xp = calculateXP(sessionStats.correct, sessionStats.total, { isTimed: levelNode?.isTimed });
        const isPerfect = sessionStats.correct === sessionStats.total && sessionStats.total > 0;
        
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        
        // Title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 36px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Conlang Learning Progress', canvas.width / 2, 60);
        
        // Subtitle
        ctx.fillStyle = '#a78bfa';
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillText(`Lesson: ${levelNode?.title || 'Practice'}`, canvas.width / 2, 110);
        
        // Stats
        ctx.fillStyle = '#f8fafc';
        ctx.font = '30px "Inter", sans-serif';
        ctx.fillText(`Score: ${sessionStats.correct} / ${sessionStats.total}`, canvas.width / 2, 170);
        ctx.fillText(`XP Earned: +${xp}`, canvas.width / 2, 220);
        
        // Stars
        let starText = '';
        for (let i = 0; i < 3; i++) {
            starText += (i < stars) ? '⭐ ' : '☆ ';
        }
        ctx.font = '40px "Inter", sans-serif';
        ctx.fillText(starText, canvas.width / 2, 280);
        
        // Footer message
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 28px "Inter", sans-serif';
        if (isPerfect) ctx.fillText('Perfect Score!', canvas.width / 2, 340);
        else ctx.fillText('Great Job!', canvas.width / 2, 340);
        
        // Convert and download
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `conlang-score-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    if (isFinished) {
        const stars = calculateStars(sessionStats.correct, sessionStats.total);
        const xp = calculateXP(sessionStats.correct, sessionStats.total, { isTimed: levelNode?.isTimed });
        const timeTaken = levelNode?.isTimed ? (60 - timeLeft) : null;
        const failedExercises = exercises.filter(e => e.failed);

        return (
            <Card className="exercise-player finished-screen" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <Mascot state="correct" isSpeaking={false} />
                <h2 style={{ fontSize: '2.5rem', margin: '20px 0 10px 0', color: 'var(--acc)' }}>Lesson Complete!</h2>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '15px 0' }}>
                    {[1, 2, 3].map(s => (
                        <Star key={s} size={48} color={s <= stars ? '#f59e0b' : 'var(--bd)'} fill={s <= stars ? '#f59e0b' : 'none'} style={{ filter: s <= stars ? 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' : 'none' }} />
                    ))}
                </div>

                <div className="ep-summary-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', background: 'var(--s1)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                    <div className="stat-box">
                        <div style={{ color: 'var(--tx2)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{sessionStats.correct} / {sessionStats.total}</div>
                        <div style={{ color: 'var(--tx2)' }}>{Math.round((sessionStats.correct / sessionStats.total) * 100) || 0}% Accuracy</div>
                    </div>
                    <div className="stat-box">
                        <div style={{ color: 'var(--tx2)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>XP Earned</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--ok)' }}>+{xp} XP</div>
                        {timeTaken && <div style={{ color: 'var(--tx2)' }}>Time: {timeTaken}s</div>}
                    </div>
                </div>

                {failedExercises.length > 0 && (
                    <div className="ep-missed-words" style={{ textAlign: 'left', background: 'var(--s1)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--bd2)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--tx)' }}>Needs more practice:</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--tx2)' }}>
                            {failedExercises.slice(0, 5).map((e, i) => (
                                <li key={i}>{e.englishSentence || e.type}</li>
                            ))}
                            {failedExercises.length > 5 && <li>...and {failedExercises.length - 5} more</li>}
                        </ul>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    <Button variant="imp" onClick={() => {
                        onComplete(levelNode?.id, { ...sessionStats, stars });
                    }} style={{ padding: '15px', fontSize: '1.2rem', fontWeight: 'bold' }}>Continue to Path</Button>
                    <Button variant="default" onClick={handleShareScore} style={{ padding: '12px' }}>
                        <Share2 size={18} style={{ marginRight: '8px' }} /> Share Score
                    </Button>
                </div>
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
        
        if (currentEx.type === 'translate_to_english' || currentEx.type === 'picture_match' || currentEx.type === 'fill_blank' || currentEx.type === 'conjugation_drill') {
            const expectedOptions = currentEx.englishSentence.toLowerCase().split(',').map(s => s.replace(/[.,!?]/g, '').trim());
            const actual = currentAnswer.toLowerCase().replace(/[.,!?]/g, '').trim();
            isCorrect = expectedOptions.includes(actual);
        } else if (currentEx.type === 'translate_to_conlang' || currentEx.type === 'listening') {
            const expectedOptions = currentEx.conlangSentence.toLowerCase().split(',').map(s => s.replace(/[.,!?]/g, '').trim());
            const actual = currentAnswer.toLowerCase().replace(/[.,!?]/g, '').trim();
            isCorrect = expectedOptions.includes(actual);
        } else if (currentEx.type === 'word_bank' || currentEx.type === 'sentence_reorder') {
            const expected = currentEx.conlangSentence.toLowerCase();
            const actual = wordBankSelected.join(' ').toLowerCase();
            isCorrect = (expected === actual);
        } else if (currentEx.type === 'multiple_choice') {
            isCorrect = (selectedOption === currentEx.englishSentence);
        } else if (currentEx.type === 'true_false') {
            isCorrect = (selectedOption === (currentEx.isTrue ? 'True' : 'False'));
        } else if (currentEx.type === 'matching_pairs') {
            // For matching pairs, 'Check' is only clicked when all are matched, so if button is active, it's correct
            isCorrect = (matchedPairs.length === currentEx.pairs.length);
        }

        if (isCorrect) {
            setFeedback({ status: 'correct', message: 'Excellent! Spot on.' });
            if (!currentEx.failed && currentEx.type !== 'teach') {
                setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
            }
        } else {
            const expectedDisplay = (currentEx.type === 'translate_to_conlang' || currentEx.type === 'listening' || currentEx.type === 'word_bank' || currentEx.type === 'sentence_reorder') 
                ? currentEx.conlangSentence 
                : currentEx.type === 'true_false' ? (currentEx.isTrue ? 'True' : 'False') 
                : currentEx.englishSentence;
            setFeedback({ status: 'incorrect', message: `Oops! Correct answer: ${expectedDisplay}` });
            
            // Add current exercise to end of array to force review
            currentEx.failed = true;
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

    React.useEffect(() => {
        if (isFinished || currentIndex === -1) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onExit();
                return;
            }
            if (e.key === 'Enter') {
                // If it's a text input field, the form onSubmit already handles Enter.
                // For multiple choice, matching pairs, etc., we can trigger it manually.
                const isInputActive = document.activeElement.tagName === 'INPUT';
                if (!isInputActive) {
                    if (currentEx?.type === 'teach') advanceToNext();
                    else checkAnswer();
                }
                return;
            }
            if (['1', '2', '3', '4'].includes(e.key) && !feedback) {
                if (currentEx?.type === 'multiple_choice' && currentEx.options.length >= parseInt(e.key)) {
                    setSelectedOption(currentEx.options[parseInt(e.key) - 1]);
                } else if (currentEx?.type === 'true_false') {
                    if (e.key === '1') setSelectedOption('True');
                    if (e.key === '2') setSelectedOption('False');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFinished, currentIndex, currentEx, feedback, checkAnswer, advanceToNext, onExit]);

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
                {levelNode?.isTimed ? (
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: timeLeft <= 10 ? '#ef4444' : 'var(--tx)' }}>
                        ⏱️ {timeLeft}s
                    </div>
                ) : (
                    <div className="ep-progress-bar">
                        <div className="ep-progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                )}
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
                        : currentEx.type === 'word_bank' || currentEx.type === 'sentence_reorder' ? `Translate into ${config.conlangName || 'your conlang'}:`
                        : currentEx.type === 'multiple_choice' ? 'Select the correct translation:'
                        : currentEx.type === 'listening' ? 'Listen and type what you hear:'
                        : currentEx.type === 'fill_blank' ? 'Fill in the missing word:'
                        : currentEx.type === 'picture_match' ? 'What does this image represent?'
                        : currentEx.type === 'true_false' ? 'Is this translation correct?'
                        : currentEx.type === 'conjugation_drill' ? 'Follow the instruction:'
                        : 'Match the pairs:'}
                    </h3>
                )}

                {currentEx.type !== 'matching_pairs' && currentEx.type !== 'teach' && currentEx.type !== 'listening' && (
                    <div className={`ep-prompt ${currentEx.type === 'picture_match' || currentEx.type === 'conjugation_drill' || currentEx.type === 'true_false' ? '' : 'custom-font-text notranslate'}`} style={{ fontSize: currentEx.type === 'picture_match' ? '5rem' : currentEx.type === 'translate_to_conlang' ? '1.5rem' : '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        {currentEx.type === 'translate_to_english' ? transliterate(currentEx.conlangSentence)
                        : currentEx.type === 'multiple_choice' ? transliterate(currentEx.conlangSentence)
                        : currentEx.type === 'picture_match' ? currentEx.conlangSentence
                        : currentEx.type === 'fill_blank' ? transliterate(currentEx.conlangSentence)
                        : currentEx.type === 'conjugation_drill' ? currentEx.conlangSentence
                        : currentEx.type === 'true_false' ? (
                            <>
                                <span className="custom-font-text notranslate">{transliterate(currentEx.conlangSentence)}</span>
                                <span style={{ fontSize: '1.2rem', color: 'var(--tx2)' }}>"{currentEx.displayEnglish}"</span>
                            </>
                        )
                        : currentEx.englishSentence}
                    </div>
                )}

                {currentEx.type === 'listening' && (
                    <div className="ep-prompt" style={{ display: 'flex', justifyContent: 'center' }}>
                         <Button variant="imp" style={{ width: '80px', height: '80px', borderRadius: '50%' }} onClick={(e) => {
                             const text = currentEx.conlangSentence.replace(/[.\-*]/g, '');
                             if (config.azureTtsVoice) {
                                 import('../../../utils/azureTTS.js').then(({playAzureTTS}) => {
                                     playAzureTTS({text, voice: config.azureTtsVoice, useIpa: config.azureTtsUseIpa})
                                 });
                             } else if ('speechSynthesis' in window) {
                                 window.speechSynthesis.cancel();
                                 window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
                             }
                         }}>
                             <LucideIcons.Volume2 size={40} />
                         </Button>
                    </div>
                )}

                {currentEx.type === 'translate_to_english' || currentEx.type === 'translate_to_conlang' || currentEx.type === 'listening' || currentEx.type === 'fill_blank' || currentEx.type === 'picture_match' || currentEx.type === 'conjugation_drill' ? (
                    <form onSubmit={checkAnswer} className="ep-input-area">
                        <Input 
                            value={currentAnswer}
                            onChange={(e) => setCurrentAnswer(e.target.value)}
                            placeholder={currentEx.type === 'translate_to_english' || currentEx.type === 'picture_match' || currentEx.type === 'fill_blank' || currentEx.type === 'conjugation_drill' ? "Type your answer..." : "Type your Conlang translation..."}
                            autoFocus
                            disabled={!!feedback}
                            className={currentEx.type === 'translate_to_conlang' || currentEx.type === 'listening' ? "custom-font-text notranslate" : ""}
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
                ) : currentEx.type === 'true_false' ? (
                    <div className="ep-multiple-choice" style={{ display: 'flex', gap: '20px', width: '100%', maxWidth: '400px' }}>
                        <Button variant={selectedOption === 'True' ? 'imp' : 'default'} onClick={() => setSelectedOption('True')} disabled={!!feedback} style={{ flex: 1, padding: '15px', fontSize: '1.2rem' }}>
                            ✅ True
                        </Button>
                        <Button variant={selectedOption === 'False' ? 'error' : 'default'} onClick={() => setSelectedOption('False')} disabled={!!feedback} style={{ flex: 1, padding: '15px', fontSize: '1.2rem' }}>
                            ❌ False
                        </Button>
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
                ) : currentEx.type === 'word_bank' || currentEx.type === 'sentence_reorder' ? (
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
                        {renderRichText(currentEx.englishSentence)}
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
