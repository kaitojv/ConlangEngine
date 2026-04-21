import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { BrainCircuit, Flame, RotateCcw, Check, X, Play, Map, Zap } from 'lucide-react';
import Mascot from './Mascot.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import './studyTab.css';

const PROMPT_WORDS = [
    // Level 1: Nature Nouns
    { word: "water", class: "noun", tag: "nature" }, { word: "fire", class: "noun", tag: "nature" }, { word: "earth", class: "noun", tag: "nature" },
    { word: "sun", class: "noun", tag: "nature" }, { word: "moon", class: "noun", tag: "nature" }, { word: "star", class: "noun", tag: "nature" },
    { word: "tree", class: "noun", tag: "nature" }, { word: "stone", class: "noun", tag: "nature" }, { word: "mountain", class: "noun", tag: "nature" }, { word: "river", class: "noun", tag: "nature" },
    
    // Level 2: Basic Actions
    { word: "eat", class: "verb", tag: "action" }, { word: "drink", class: "verb", tag: "action" }, { word: "sleep", class: "verb", tag: "action" },
    { word: "give", class: "verb", tag: "action" }, { word: "take", class: "verb", tag: "action" }, { word: "make", class: "verb", tag: "action" },
    
    // Level 3: Animals
    { word: "dog", class: "noun", tag: "animal" }, { word: "cat", class: "noun", tag: "animal" }, { word: "bird", class: "noun", tag: "animal" },
    { word: "fish", class: "noun", tag: "animal" }, { word: "horse", class: "noun", tag: "animal" }, { word: "snake", class: "noun", tag: "animal" },
    
    // Level 4: Basic Adjectives
    { word: "good", class: "adjective", tag: "basic" }, { word: "bad", class: "adjective", tag: "basic" }, { word: "big", class: "adjective", tag: "basic" },
    { word: "small", class: "adjective", tag: "basic" }, { word: "hot", class: "adjective", tag: "basic" }, { word: "cold", class: "adjective", tag: "basic" },
    
    // Level 5: Body Parts
    { word: "person", class: "noun", tag: "body" }, { word: "hand", class: "noun", tag: "body" }, { word: "eye", class: "noun", tag: "body" },
    { word: "mouth", class: "noun", tag: "body" }, { word: "blood", class: "noun", tag: "body" }, { word: "head", class: "noun", tag: "body" },
    
    // Level 6: Movement Verbs
    { word: "run", class: "verb", tag: "movement" }, { word: "walk", class: "verb", tag: "movement" }, { word: "go", class: "verb", tag: "movement" },
    { word: "come", class: "verb", tag: "movement" }, { word: "fly", class: "verb", tag: "movement" }, { word: "swim", class: "verb", tag: "movement" },
    
    // Level 7: Society & Home
    { word: "house", class: "noun", tag: "society" }, { word: "road", class: "noun", tag: "society" }, { word: "city", class: "noun", tag: "society" },
    { word: "friend", class: "noun", tag: "society" }, { word: "enemy", class: "noun", tag: "society" }, { word: "king", class: "noun", tag: "society" },
    
    // Level 8: Senses & Mind
    { word: "see", class: "verb", tag: "sense" }, { word: "hear", class: "verb", tag: "sense" }, { word: "know", class: "verb", tag: "sense" },
    { word: "think", class: "verb", tag: "sense" }, { word: "feel", class: "verb", tag: "sense" }, { word: "smell", class: "verb", tag: "sense" },
    
    // Level 9: Emotions & States
    { word: "happy", class: "adjective", tag: "emotion" }, { word: "sad", class: "adjective", tag: "emotion" }, { word: "angry", class: "adjective", tag: "emotion" },
    { word: "new", class: "adjective", tag: "emotion" }, { word: "old", class: "adjective", tag: "emotion" }, { word: "dead", class: "adjective", tag: "emotion" },
    
    // Level 10: Advanced
    { word: "love", class: "verb", tag: "advanced" }, { word: "hate", class: "verb", tag: "advanced" }, { word: "say", class: "verb", tag: "advanced" },
    { word: "truth", class: "noun", tag: "advanced" }, { word: "lie", class: "noun", tag: "advanced" }, { word: "time", class: "noun", tag: "advanced" }
];

const PATH_LEVELS = [
    { id: 1, title: 'Nature Nouns', class: 'noun', tag: 'nature' },
    { id: 2, title: 'Basic Actions', class: 'verb', tag: 'action' },
    { id: 3, title: 'Animals', class: 'noun', tag: 'animal' },
    { id: 4, title: 'Basic Adjectives', class: 'adjective', tag: 'basic' },
    { id: 5, title: 'Body Parts', class: 'noun', tag: 'body' },
    { id: 6, title: 'Movement Verbs', class: 'verb', tag: 'movement' },
    { id: 7, title: 'Society & Home', class: 'noun', tag: 'society' },
    { id: 8, title: 'Senses & Mind', class: 'verb', tag: 'sense' },
    { id: 9, title: 'Emotions & States', class: 'adjective', tag: 'emotion' },
    { id: 10, title: 'Advanced Concepts', class: 'verb', tag: 'advanced' },
];

export default function StudyTab() {
    // Pull in the dictionary and streak settings from our global state
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const { streak, lastStudyDate, conlangName } = useConfigStore();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const { transliterate } = useTransliterator();

    // Keep track of what the user is currently doing with their deck
    const [deck, setDeck] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTag, setSelectedTag] = useState('all');
    const [hasFinished, setHasFinished] = useState(false);
    const [deckStarted, setDeckStarted] = useState(false);
    
    // Gamification state
    const [studyMode, setStudyMode] = useState('path'); // 'path', 'flashcard', 'quiz'
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

        const shuffled = [...filteredLexicon].sort(() => Math.random() - 0.5);
        setDeck(shuffled);
        setCurrentIdx(0);
        setIsFlipped(false);
        setHasFinished(false);
        setDeckStarted(true);
        setStudyMode('flashcard');
    };

    const startQuiz = (levelNode) => {
        // Find existing words of this class, prioritize ones that have the matching tag, or fallback
        const existingLexicon = lexicon.filter(w => w.wordClass === levelNode.class);
        
        // Find prompt words that the user hasn't created yet for this specific tag
        const unlearnedPrompts = PROMPT_WORDS.filter(p => 
            p.tag === levelNode.tag && 
            !lexicon.some(w => w.translation.toLowerCase().includes(p.word))
        ).map(p => ({ isNewPrompt: true, translation: p.word, wordClass: p.class, tags: [p.tag] }));

        const shuffledExisting = [...existingLexicon].sort(() => Math.random() - 0.5).slice(0, 7);
        const shuffledPrompts = [...unlearnedPrompts].sort(() => Math.random() - 0.5).slice(0, 3);
        
        const finalDeck = [...shuffledExisting, ...shuffledPrompts].sort(() => Math.random() - 0.5);

        if (finalDeck.length === 0) return alert(`You don't have any words for ${levelNode.title} yet!`);
        
        setDeck(finalDeck);
        setCurrentIdx(0);
        setHasFinished(false);
        setPathLevel(levelNode.title);
        setStudyMode('quiz');
        setQuizInput('');
        setMascotState('idle');
        setQuizFeedback('');
        // Ensure the first question direction is valid (new prompts must be toConlang)
        setQuizDirection(finalDeck[0].isNewPrompt ? 'toConlang' : (Math.random() > 0.5 ? 'toConlang' : 'toEnglish'));
    };

    const handleFlip = () => {
        if (!hasFinished) setIsFlipped(!isFlipped);
    };

    // Move to the next card, and maybe toss this one back in the pile if they need to review it
    const handleNext = (needsReview) => {
        setIsFlipped(false);
        
        // Wait for the card to physically flip over before changing its text!
        setTimeout(() => {
            const updatedDeck = [...deck];
            if (needsReview) {
                updatedDeck.push(deck[currentIdx]);
                setDeck(updatedDeck);
            }

            const nextIdx = currentIdx + 1;
            if (nextIdx >= updatedDeck.length) {
                setHasFinished(true);
                recordDailyStudy();
            } else {
                setCurrentIdx(nextIdx);
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
            if (checkDuplicate(userAnswer, '')) {
                setMascotState('incorrect');
                setQuizFeedback(`The word "${userAnswer}" already exists in your dictionary! Try a different one.`);
                return; // Wait for them to try again
            }

            // Otherwise, it's a new word. We add it to the dictionary.
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
                    setQuizDirection(deck[nextIdx].isNewPrompt ? 'toConlang' : (Math.random() > 0.5 ? 'toConlang' : 'toEnglish'));
                }
            }, 1200);
        } else {
            setMascotState('incorrect');
            setQuizFeedback(`Oops! The correct answer is: ${correctAnswerDisplay}`);
            setTimeout(() => {
                const updatedDeck = [...deck];
                updatedDeck.push(currentWord);
                setDeck(updatedDeck);
                setCurrentIdx(currentIdx + 1);
                setQuizInput('');
                setQuizFeedback('');
                setMascotState('idle');
                setQuizDirection(deck[currentIdx + 1].isNewPrompt ? 'toConlang' : (Math.random() > 0.5 ? 'toConlang' : 'toEnglish'));
            }, 2500);
        }
    };

    const currentWord = deck[currentIdx];
    const remainingCards = deck.length - currentIdx;

    // We use the static PATH_LEVELS for the 10-level path
    const pathNodes = PATH_LEVELS;

    return (
        <div className="flashcards-container">
            
            {/* --- CONTROLS & HEADER --- */}
            <Card className="controls-card">
                <div className="controls-header">
                    <h2 className="flex sg-title mb-0">
                        {studyMode === 'path' ? <Map /> : <BrainCircuit />} 
                        {studyMode === 'path' ? ' Learning Path' : studyMode === 'flashcard' ? ' Flashcard Drill' : ' Mascot Quiz'}
                    </h2>
                    
                    <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                        <div className="streak-badge">
                            <Flame size={18} /> {streak || 0} Day Streak
                        </div>
                        
                        {studyMode === 'path' ? (
                            <Button variant="default" onClick={() => setStudyMode('flashcard')}>
                                <div className="btn-content-flex"><BrainCircuit size={16}/> Flashcards</div>
                            </Button>
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

            {/* --- LEARNING PATH --- */}
            {studyMode === 'path' && (
                <div className="learning-path-container">
                    {pathNodes.length === 0 ? (
                        <div className="empty-path">Add some words to your dictionary to unlock the Learning Path!</div>
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
                                            Level {node.id}: {node.title}
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
                                        <div className="fc-word custom-font-text notranslate">
                                            {transliterate(currentWord.word)}
                                        </div>
                                        {currentWord.ipa && (
                                            <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>
                                        )}
                                        <div className="flip-hint">Click to flip</div>
                                    </>
                                ) : null}
                            </div>

                            <div className="fc-face fc-back">
                                {currentWord && !hasFinished && (
                                    <>
                                        <div className="fc-trans">{currentWord.translation}</div>
                                        <div className="fc-class">{currentWord.wordClass}</div>
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
                    <div className={`fc-actions ${isFlipped && !hasFinished ? 'visible' : ''}`}>
                        <Button 
                            variant="error" 
                            className="fc-action-btn" 
                            onClick={(e) => { e.stopPropagation(); handleNext(true); }}
                        >
                            <div className="btn-content-flex"><X size={20} /> Needs Review</div>
                        </Button>
                        
                        <Button 
                            variant="default" 
                            className="fc-action-btn btn-got-it" 
                            onClick={(e) => { e.stopPropagation(); handleNext(false); }}
                        >
                            <div className="btn-content-flex"><Check size={20} /> Got It</div>
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}
