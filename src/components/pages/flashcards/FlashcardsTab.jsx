import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/card.jsx';
import Button from '@/components/UI/Buttons/buttons.jsx';
import { BrainCircuit, Flame, RotateCcw, Check, X, Play } from 'lucide-react';
import './flashcardsTab.css';

export default function FlashcardsTab() {
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { streak, lastStudyDate } = useConfigStore();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const { transliterate } = useTransliterator();

    const [deck, setDeck] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTag, setSelectedTag] = useState('all');
    const [hasFinished, setHasFinished] = useState(false);
    const [deckStarted, setDeckStarted] = useState(false);

    // Extract unique semantic tags from the dictionary
    const allTags = useMemo(() => {
        const tags = lexicon.flatMap(word => word.tags || []);
        return [...new Set(tags)].sort();
    }, [lexicon]);

    // Daily Streak Logic
    const recordDailyStudy = () => {
        const today = new Date().toDateString();
        if (lastStudyDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            let newStreak = 1;
            if (lastStudyDate === yesterday.toDateString()) {
                newStreak = (streak || 0) + 1;
            }
            
            updateConfig({ streak: newStreak, lastStudyDate: today });
        }
    };

    // Initialize the deck
    const startDeck = () => {
        let filteredLexicon = lexicon;
        if (selectedTag !== 'all') {
            filteredLexicon = lexicon.filter(w => w.tags && w.tags.includes(selectedTag));
        }

        if (filteredLexicon.length === 0) {
            alert("No words found for the selected tag.");
            return;
        }

        // Shuffle the array
        const shuffled = [...filteredLexicon].sort(() => Math.random() - 0.5);
        
        setDeck(shuffled);
        setCurrentIdx(0);
        setIsFlipped(false);
        setHasFinished(false);
        setDeckStarted(true);
    };

    const handleFlip = () => {
        if (hasFinished) return;
        setIsFlipped(!isFlipped);
    };

    const handleNext = (needsReview) => {
        setIsFlipped(false);
        
        // Wait for the flip animation to finish before swapping text
        setTimeout(() => {
            let updatedDeck = [...deck];
            if (needsReview) {
                // Push the current word to the end of the deck to review it again
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
        }, 300);
    };

    const currentWord = deck[currentIdx];
    const remainingCards = deck.length - currentIdx;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
            {/* Header & Controls */}
            <Card style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <h2 className='flex sg-title' style={{ margin: 0 }}><BrainCircuit /> Study Deck</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', padding: '8px 16px', borderRadius: 'var(--rad-sm)', fontWeight: 'bold', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                        <Flame size={18} /> {streak || 0} Day Streak
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '8px', fontWeight: 'bold' }}>Filter by Semantic Tag:</label>
                        <select 
                            value={selectedTag} 
                            onChange={(e) => setSelectedTag(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--bg)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', outline: 'none' }}
                        >
                            <option value="all">All Words</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <Button variant="imp" onClick={startDeck}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {deckStarted ? <RotateCcw size={18} /> : <Play size={18} />}
                            {deckStarted ? 'Restart Deck' : 'Start Study Session'}
                        </div>
                    </Button>
                </div>
            </Card>

            {/* Flashcard Area */}
            {deckStarted && (
                <div style={{ width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <div style={{ color: 'var(--tx2)', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
                        Cards Remaining: <span style={{ color: 'var(--acc2)' }}>{hasFinished ? 0 : remainingCards}</span>
                    </div>

                    <div className="fc-scene" onClick={handleFlip}>
                        <div className={`fc-inner ${isFlipped && !hasFinished ? 'is-flipped' : ''}`}>
                            
                            {/* FRONT FACE */}
                            <div className="fc-face">
                                {hasFinished ? (
                                    <>
                                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🎉</div>
                                        <h2 style={{ color: 'var(--ok)', fontSize: '2rem', margin: 0 }}>Deck Finished!</h2>
                                        <p style={{ color: 'var(--tx2)', marginTop: '10px' }}>Great job today! Your streak has been updated.</p>
                                    </>
                                ) : currentWord ? (
                                    <>
                                        <div className="fc-word custom-font-text notranslate">{transliterate(currentWord.word)}</div>
                                        {currentWord.ipa && <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>}
                                        <div style={{ position: 'absolute', bottom: '20px', color: 'var(--tx3)', fontSize: '0.8rem' }}>Click to flip</div>
                                    </>
                                ) : null}
                            </div>

                            {/* BACK FACE */}
                            <div className="fc-face fc-back">
                                {currentWord && !hasFinished && (
                                    <>
                                        <div className="fc-trans">{currentWord.translation}</div>
                                        <div className="fc-class">{currentWord.wordClass}</div>
                                        {currentWord.tags && currentWord.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
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

                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', gap: '20px', width: '100%', maxWidth: '400px', 
                        opacity: (isFlipped && !hasFinished) ? 1 : 0, 
                        pointerEvents: (isFlipped && !hasFinished) ? 'auto' : 'none',
                        transition: 'opacity 0.3s ease',
                        marginTop: '10px'
                    }}>
                        <Button variant="error" style={{ flex: 1, padding: '15px' }} onClick={(e) => { e.stopPropagation(); handleNext(true); }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><X size={20} /> Needs Review</div>
                        </Button>
                        <Button variant="ok" style={{ flex: 1, padding: '15px', background: 'var(--ok)', color: '#000', border: 'none' }} onClick={(e) => { e.stopPropagation(); handleNext(false); }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Check size={20} /> Got It</div>
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}