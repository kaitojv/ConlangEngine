import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { BrainCircuit, Flame, RotateCcw, Check, X, Play } from 'lucide-react';
import './flashcardsTab.css';

export default function FlashcardsTab() {
    // Pull in the dictionary and streak settings from our global state
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { streak, lastStudyDate } = useConfigStore();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const { transliterate } = useTransliterator();

    // Keep track of what the user is currently doing with their deck
    const [deck, setDeck] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTag, setSelectedTag] = useState('all');
    const [hasFinished, setHasFinished] = useState(false);
    const [deckStarted, setDeckStarted] = useState(false);

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

        // A quick and dirty way to shuffle the deck
        const shuffled = [...filteredLexicon].sort(() => Math.random() - 0.5);
        
        setDeck(shuffled);
        setCurrentIdx(0);
        setIsFlipped(false);
        setHasFinished(false);
        setDeckStarted(true);
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

    const currentWord = deck[currentIdx];
    const remainingCards = deck.length - currentIdx;

    return (
        <div className="flashcards-container">
            
            {/* --- CONTROLS & HEADER --- */}
            <Card className="controls-card">
                <div className="controls-header">
                    <h2 className="flex sg-title mb-0"><BrainCircuit /> Study Deck</h2>
                    <div className="streak-badge">
                        <Flame size={18} /> {streak || 0} Day Streak
                    </div>
                </div>

                <div className="filter-section">
                    <div className="filter-select-container">
                        <label className="filter-select-label">Filter by Semantic Tag:</label>
                        <select 
                            value={selectedTag} 
                            onChange={(e) => {
                                setSelectedTag(e.target.value);
                                if (deckStarted) startDeck(e.target.value);
                            }}
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
                    <Button variant="imp" onClick={startDeck}>
                        <div className="btn-content-flex">
                            {deckStarted ? <RotateCcw size={18} /> : <Play size={18} />}
                            {deckStarted ? 'Restart Deck' : 'Start Study Session'}
                        </div>
                    </Button>
                </div>
            </Card>

            {/* --- ACTIVE FLASHCARD AREA --- */}
            {deckStarted && (
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
