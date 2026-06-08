import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { BrainCircuit, Flame, RotateCcw, Check, X, Play, Map, Zap, Volume2 } from 'lucide-react';
import Mascot from './Mascot.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import ExercisePlayer from './ExercisePlayer.jsx';
import CourseBuilder from './CourseBuilder.jsx';
import EmptyState from '@/components/UI/EmptyState/EmptyState.jsx';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import toast from 'react-hot-toast';
import './studyTab.css';

// We no longer use static PATH_LEVELS. We pull them from user config!

export default function StudyTab() {
    // Pull in the lexicon and streak settings from our global state
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const { streak, lastStudyDate, conlangName, customCourse } = useConfigStore();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const { transliterate } = useTransliterator();

    // Keep track of what the user is currently doing with their deck
    const [deck, setDeck] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTag, setSelectedTag] = useState('all');
    const [hasFinished, setHasFinished] = useState(false);
    const [deckStarted, setDeckStarted] = useState(false);
    const [flashcardDirection, setFlashcardDirection] = useState('toEnglish');
    const updateWordSRS = useLexiconStore((state) => state.updateWordSRS);
    
    // Gamification state
    const [studyMode, setStudyMode] = useState('path'); // 'path', 'flashcard', 'quiz', 'course', 'builder'
    const [pathLevel, setPathLevel] = useState(null); 
    const [quizInput, setQuizInput] = useState('');
    const [mascotState, setMascotState] = useState('idle');
    const [quizFeedback, setQuizFeedback] = useState('');
    const [quizDirection, setQuizDirection] = useState('toConlang'); // 'toConlang' or 'toEnglish'

    // Figure out all the unique semantic tags they've used so we can filter by them
    const allTags = useMemo(() => {
        const tags = lexicon.flatMap(word => word.tags || []);
        return [...new Set(tags)].sort();
    }, [lexicon]);

    // Bump up their study streak if they finish a deck today!
    const recordDailyStudy = () => {
        const today = new Date().toDateString();
        if (lastStudyDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const newStreak = lastStudyDate === yesterday.toDateString() ? (streak || 0) + 1 : 1;
            updateConfig({ streak: newStreak, lastStudyDate: today });
        }
    };

    // Gather the words, shuffle them up, and get ready to study
    const startDeck = (tag = selectedTag) => {
        const filteredLexicon = tag === 'all' 
            ? lexicon 
            : lexicon.filter(w => w.tags?.includes(tag));

        if (filteredLexicon.length === 0) {
            setDeckStarted(false);
            return alert("No words found for the selected tag.");
        }

        const now = Date.now();
        // 1. Due cards: have SRS data and nextReviewDate <= now
        const dueCards = filteredLexicon.filter(w => w.srs && w.srs.nextReviewDate <= now);
        // 2. New cards: no SRS data yet
        const newCards = filteredLexicon.filter(w => !w.srs || !w.srs.nextReviewDate);
        
        // Shuffle both sets
        dueCards.sort(() => Math.random() - 0.5);
        newCards.sort(() => Math.random() - 0.5);

        // Combine up to 20 cards: prioritize due cards, fill rest with new cards
        let selectedDeck = [...dueCards.slice(0, 20)];
        if (selectedDeck.length < 20) {
            selectedDeck = [...selectedDeck, ...newCards.slice(0, 20 - selectedDeck.length)];
        }

        // Final shuffle of the selected deck
        selectedDeck.sort(() => Math.random() - 0.5);

        if (selectedDeck.length === 0) {
            setDeckStarted(false);
            return alert("No words due for review right now! Take a break or add new words.");
        }

        setDeck(selectedDeck);
        setCurrentIdx(0);
        setIsFlipped(false);
        setHasFinished(false);
        setDeckStarted(true);
        setStudyMode('flashcard');
        setFlashcardDirection(Math.random() > 0.5 ? 'toEnglish' : 'toConlang');
    };

    const startQuiz = (levelNode) => {
        setPathLevel(levelNode);
        setStudyMode('course');
    };

    const handleFlip = () => {
        if (!hasFinished) setIsFlipped(!isFlipped);
    };

    const handleListen = async (e, wordObj) => {
        e.stopPropagation(); // Don't flip the card when clicking listen
        const text = wordObj.word;
        if (!text) return;

        const cleanText = text.replace(/[.\-*]/g, '');
        const cleanIpa = wordObj.ipa ? wordObj.ipa.replace(/[.\-*]/g, '') : undefined;

        const globalConfig = useConfigStore.getState();
        if (globalConfig.azureTtsVoice) {
            const toastId = toast.loading("Generating audio...");
            try {
                await playAzureTTS({
                    text: cleanText,
                    ipa: cleanIpa,
                    voice: globalConfig.azureTtsVoice,
                    useIpa: globalConfig.azureTtsUseIpa
                });
                toast.dismiss(toastId);
            } catch (err) {
                toast.error("Azure TTS failed: " + err.message, { id: toastId });
            }
            return;
        }

        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText));
    };

    // Handle SRS grading (0-Fail, 3-Hard, 4-Good, 5-Easy)
    const handleSRSGrade = (grade) => {
        const currentWordObj = deck[currentIdx];
        
        // Update the word in the global store with the new SM-2 calculated values
        if (currentWordObj && currentWordObj.id) {
            updateWordSRS(currentWordObj.id, grade);
        }

        setIsFlipped(false);
        
        // Wait for the card to physically flip over before changing its text!
        setTimeout(() => {
            const updatedDeck = [...deck];
            // If they failed completely (grade 1) or found it hard (grade 3), we push it to the end of the current session
            if (grade <= 3) {
                updatedDeck.push(deck[currentIdx]);
                setDeck(updatedDeck);
            }

            const nextIdx = currentIdx + 1;
            if (nextIdx >= updatedDeck.length) {
                setHasFinished(true);
                recordDailyStudy();
            } else {
                setCurrentIdx(nextIdx);
                setFlashcardDirection(Math.random() > 0.5 ? 'toEnglish' : 'toConlang');
            }
        }, 300); // Matches the CSS transition time
    };

    const handleQuizSubmit = (e) => {
        e.preventDefault();
        const currentWord = deck[currentIdx];
        const userAnswer = quizInput.trim().toLowerCase();
        
        if (!userAnswer) return;

        let isCorrect = false;
        let correctAnswerDisplay = '';

        if (currentWord.isNewPrompt) {
            // It's a new word prompt! Check if the word they typed already exists.
            const { isDuplicateWord } = checkDuplicate(userAnswer, '');
            if (isDuplicateWord) {
                setMascotState('incorrect');
                setQuizFeedback(`The word "${userAnswer}" already exists in your lexicon! Try a different one.`);
                return; // Wait for them to try again
            }

            // Otherwise, it's a new word. We add it to the lexicon.
            isCorrect = true;
            addWord({
                word: userAnswer,
                wordClass: currentWord.wordClass,
                translation: currentWord.translation,
                tags: currentWord.tags || []
            });
            setQuizFeedback(`New ${currentWord.wordClass} added!`);
        } else {
            if (quizDirection === 'toConlang') {
                const expected = currentWord.word.replace(/\*/g, '').toLowerCase();
                isCorrect = userAnswer === expected;
                correctAnswerDisplay = transliterate(currentWord.word);
            } else {
                const expected = currentWord.translation.toLowerCase();
                isCorrect = expected.includes(userAnswer) && userAnswer.length > 2 || userAnswer === expected;
                correctAnswerDisplay = currentWord.translation;
            }
        }

        if (isCorrect) {
            setMascotState('correct');
            if (!currentWord.isNewPrompt) setQuizFeedback('Correct!');
            
            setTimeout(() => {
                const nextIdx = currentIdx + 1;
                if (nextIdx >= deck.length) {
                    setHasFinished(true);
                    recordDailyStudy();
                } else {
                    setCurrentIdx(nextIdx);
                    setQuizInput('');
                    setQuizFeedback('');
                    setMascotState('idle');
                    // BUG-3: Bounds check before accessing next deck item
                    const nextWord = deck[nextIdx];
                    setQuizDirection(nextWord?.isNewPrompt ? 'toConlang' : (Math.random() > 0.5 ? 'toConlang' : 'toEnglish'));
                }
            }, 1200);
        } else {
            setMascotState('incorrect');
            setQuizFeedback(`Oops! The correct answer is: ${correctAnswerDisplay}`);
            setTimeout(() => {
                const updatedDeck = [...deck];
                updatedDeck.push(currentWord);
                setDeck(updatedDeck);
                const nextIdx = currentIdx + 1;
                setCurrentIdx(nextIdx);
                setQuizInput('');
                setQuizFeedback('');
                setMascotState('idle');
                // BUG-3: Bounds check before accessing next deck item
                const nextWord = updatedDeck[nextIdx];
                setQuizDirection(nextWord?.isNewPrompt ? 'toConlang' : (Math.random() > 0.5 ? 'toConlang' : 'toEnglish'));
            }, 2500);
        }
    };

    const currentWord = deck[currentIdx];
    const remainingCards = deck.length - currentIdx;

    // We use the customCourse array from global config for our map!
    const pathNodes = customCourse || [];

    if (studyMode === 'builder') {
        return (
            <div className="flashcards-container">
                <CourseBuilder onExit={() => setStudyMode('path')} />
            </div>
        );
    }

    return (
        <div className="flashcards-container">
            
            {/* --- CONTROLS & HEADER --- */}
            <Card className="controls-card">
                <div className="controls-header">
                    <h2 className="flex sg-title mb-0">
                        {studyMode === 'path' ? <Map /> : studyMode === 'course' ? <Zap /> : <BrainCircuit />} 
                        {studyMode === 'path' ? ' Learning Path' : studyMode === 'flashcard' ? ' Flashcard Drill' : studyMode === 'course' ? ` Course: ${pathLevel?.title}` : ' Mascot Quiz'}
                    </h2>
                    
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                        <div className="streak-badge">
                            <Flame size={18} /> {streak || 0} Day Streak
                        </div>
                        
                        {studyMode === 'path' ? (
                            <>
                                {lexicon.length >= 200 ? (
                                    <Button variant="imp" onClick={() => setStudyMode('builder')}>
                                        <div className="btn-content-flex">Edit Course</div>
                                    </Button>
                                ) : (
                                    <div style={{fontSize: '0.8rem', color: 'var(--tx2)'}}>Unlock course at 200 words</div>
                                )}
                                <Button variant="default" onClick={() => setStudyMode('flashcard')}>
                                    <div className="btn-content-flex"><BrainCircuit size={16}/> Flashcards</div>
                                </Button>
                            </>
                        ) : studyMode === 'flashcard' ? (
                            <Button variant="default" onClick={() => { setStudyMode('path'); setDeckStarted(false); }}>
                                <div className="btn-content-flex"><Map size={16}/> Learning Path</div>
                            </Button>
                        ) : null}
                    </div>
                </div>

                {studyMode === 'flashcard' && !deckStarted && (
                    <div className="filter-section">
                        <div className="filter-select-container">
                            <label className="filter-select-label">Filter by Semantic Tag:</label>
                            <select 
                                value={selectedTag} 
                                onChange={(e) => setSelectedTag(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Words</option>
                                {allTags.map(tag => (
                                    <option key={tag} value={tag}>
                                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button variant="imp" onClick={() => startDeck()}>
                            <div className="btn-content-flex">
                                <Play size={18} /> Start Study Session
                            </div>
                        </Button>
                    </div>
                )}
            </Card>

            {/* --- EXERCISE PLAYER (COURSE ENGINE) --- */}
            {studyMode === 'course' && pathLevel && (
                <ExercisePlayer 
                    levelNode={pathLevel}
                    onComplete={() => {
                        recordDailyStudy();
                        setStudyMode('path');
                    }}
                    onExit={() => setStudyMode('path')}
                />
            )}

            {/* --- LEARNING PATH --- */}
            {studyMode === 'path' && (
                <div className="learning-path-container">
                    {pathNodes.length === 0 ? (
                        <EmptyState
                            icon={Map}
                            title="Welcome to the Course Map!"
                            description={lexicon.length >= 200 
                                ? "You haven't built your language course yet. Build your skill tree and path to mastery." 
                                : `You need at least 200 words in your lexicon to build a course. Keep adding words! (${lexicon.length}/200)`}
                            actionButton={lexicon.length >= 200 ? (
                                <Button variant="imp" onClick={() => setStudyMode('builder')}>
                                    Open Course Builder
                                </Button>
                            ) : null}
                        />
                    ) : (
                        <div className="path-track" style={{ position: 'relative' }}>
                            <svg 
                                className="path-svg" 
                                style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: '100%', overflow: 'visible', zIndex: 0, pointerEvents: 'none' }}
                            >
                                {pathNodes.map((node, i) => {
                                    if (i === pathNodes.length - 1) return null;
                                    const isLeft = i % 2 === 0;
                                    const y1 = 80 + i * 150;
                                    const y2 = 80 + (i + 1) * 150;
                                    const midY = (y1 + y2) / 2;
                                    // Use raw numbers for SVG coordinates, relative to left: 50%
                                    const x1 = isLeft ? -40 : 40;
                                    const x2 = isLeft ? 40 : -40;
                                    
                                    return (
                                        <g key={`line-${i}`}>
                                            {/* Outer Border */}
                                            <path 
                                                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                                stroke="var(--bd)"
                                                strokeWidth="32"
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                            {/* Inner Track */}
                                            <path 
                                                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                                stroke="var(--s2)"
                                                strokeWidth="24"
                                                fill="none"
                                                strokeLinecap="round"
                                            />
                                        </g>
                                    );
                                })}
                            </svg>

                            {pathNodes.map((node, i) => {
                                const isZigZag = i % 2 === 0;

                                return (
                                    <div key={node.id} className={`path-node-wrapper ${isZigZag ? 'left' : 'right'}`}>
                                        <div 
                                            className="path-node" 
                                            onClick={() => startQuiz(node)}
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--acc)', boxShadow: `0 8px 0 var(--acc)` }}
                                        >
                                            <div className="path-node-icon"><Zap size={32} color="var(--acc)" fill="none" /></div>
                                        </div>
                                        <div className="path-node-label">
                                            {node.title}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* --- MASCOT QUIZ AREA --- */}
            {studyMode === 'quiz' && (
                <Card className="quiz-area">
                    {hasFinished ? (
                        <div className="quiz-finished">
                            <Mascot state="correct" isSpeaking={true} />
                            <h2 className="finished-title" style={{marginTop: '20px'}}>Level Complete!</h2>
                            <p className="finished-text">You've mastered these {pathLevel}s. Your streak has been updated!</p>
                            <Button variant="imp" onClick={() => setStudyMode('path')} style={{marginTop: '20px'}}>
                                Return to Path
                            </Button>
                        </div>
                    ) : currentWord ? (
                        <div className="quiz-active">
                            <div className="quiz-header" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <Button variant="default" onClick={() => setStudyMode('path')} style={{ padding: '8px' }}>
                                    <X size={18} />
                                </Button>
                                <div className="quiz-progress-bar" style={{ flex: 1, margin: 0 }}>
                                    <div className="quiz-progress-fill" style={{ width: `${((currentIdx) / deck.length) * 100}%` }} />
                                </div>
                            </div>
                            
                            <div className="mascot-section">
                                <Mascot state={mascotState} isSpeaking={mascotState === 'idle'} />
                                <div className={`mascot-speech-bubble ${mascotState}`}>
                                    {quizFeedback || (
                                        currentWord.isNewPrompt 
                                            ? `How do you say "${currentWord.translation}" in ${conlangName || 'your conlang'}?`
                                            : quizDirection === 'toConlang' 
                                                ? `How do you say "${currentWord.translation}"?`
                                                : `What does "${transliterate(currentWord.word)}" mean?`
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleQuizSubmit} className="quiz-input-section">
                                <Input 
                                    value={quizInput}
                                    onChange={(e) => setQuizInput(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className={quizDirection === 'toConlang' ? "custom-font-text notranslate" : ""}
                                    autoFocus
                                    disabled={mascotState !== 'idle'}
                                />
                                <Button variant="save" type="submit" disabled={mascotState !== 'idle'}>
                                    Check
                                </Button>
                            </form>
                        </div>
                    ) : null}
                </Card>
            )}

            {/* --- ACTIVE FLASHCARD AREA --- */}
            {studyMode === 'flashcard' && deckStarted && (
                <div className="flashcard-area">
                    
                    <div className="cards-remaining">
                        Cards Remaining: <span className="cards-remaining-count">{hasFinished ? 0 : remainingCards}</span>
                    </div>

                    {/* The interactive card itself */}
                    <div className="fc-scene" onClick={handleFlip}>
                        <div className={`fc-inner ${isFlipped && !hasFinished ? 'is-flipped' : ''}`}>
                            
                            <div className="fc-face">
                                {hasFinished ? (
                                    <>
                                        <div className="finished-emoji">🎉</div>
                                        <h2 className="finished-title">Deck Finished!</h2>
                                        <p className="finished-text">Great job today! Your streak has been updated.</p>
                                        <Button variant="default" onClick={() => setDeckStarted(false)} style={{marginTop: '20px'}}>Back to Menu</Button>
                                    </>
                                ) : currentWord ? (
                                    <>
                                        {flashcardDirection === 'toEnglish' ? (
                                            <>
                                                <div className="fc-word custom-font-text notranslate">
                                                    {transliterate(currentWord.word)}
                                                </div>
                                                {currentWord.ipa && (
                                                    <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="fc-word-english">
                                                {currentWord.translation}
                                            </div>
                                        )}
                                        <div style={{ marginTop: '15px' }}>
                                            <Button variant="default" onClick={(e) => handleListen(e, currentWord)} style={{ padding: '6px 12px' }}>
                                                <div className="btn-content-flex"><Volume2 size={16} /> Listen</div>
                                            </Button>
                                        </div>
                                        <div className="flip-hint" style={{ marginTop: '15px' }}>Click to flip</div>
                                    </>
                                ) : null}
                            </div>

                            <div className="fc-face fc-back">
                                {currentWord && !hasFinished && (
                                    <>
                                        {flashcardDirection === 'toEnglish' ? (
                                            <>
                                                <div className="fc-trans">{currentWord.translation}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="fc-word custom-font-text notranslate" style={{fontSize: '2rem', marginBottom: '10px'}}>
                                                    {transliterate(currentWord.word)}
                                                </div>
                                                {currentWord.ipa && (
                                                    <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>
                                                )}
                                            </>
                                        )}
                                        <div className="fc-class" style={{marginTop: '15px'}}>{currentWord.wordClass}</div>
                                        {currentWord.tags && currentWord.tags.length > 0 && (
                                            <div className="fc-tags-container">
                                                {currentWord.tags.map(tag => (
                                                    <span key={tag} className="fc-tag-pill">#{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons (Only visible when viewing the back of the card) */}
                    <div className={`fc-actions srs-actions ${isFlipped && !hasFinished ? 'visible' : ''}`}>
                        <Button 
                            variant="error" 
                            className="srs-btn srs-fail" 
                            onClick={(e) => { e.stopPropagation(); handleSRSGrade(1); }}
                        >
                            <span className="srs-label">Fail</span>
                            <span className="srs-hint">&lt;1d</span>
                        </Button>
                        <Button 
                            variant="warning" 
                            className="srs-btn srs-hard" 
                            onClick={(e) => { e.stopPropagation(); handleSRSGrade(3); }}
                            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                        >
                            <span className="srs-label">Hard</span>
                            <span className="srs-hint">Days</span>
                        </Button>
                        <Button 
                            variant="save" 
                            className="srs-btn srs-good" 
                            onClick={(e) => { e.stopPropagation(); handleSRSGrade(4); }}
                        >
                            <span className="srs-label">Good</span>
                            <span className="srs-hint">Weeks</span>
                        </Button>
                        <Button 
                            variant="imp" 
                            className="srs-btn srs-easy" 
                            onClick={(e) => { e.stopPropagation(); handleSRSGrade(5); }}
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                        >
                            <span className="srs-label">Easy</span>
                            <span className="srs-hint">Months</span>
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
