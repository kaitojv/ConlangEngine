import React, { useState, useMemo } from 'react';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { BrainCircuit, Play, X, Check, Volume2 } from 'lucide-react';
import { renderWordInScript } from '../../../utils/scriptRendering.js';
import { playAzureTTS } from '../../../utils/azureTTS.js';

import toast from 'react-hot-toast';
import '../../pages/study/studyTab.css';

export default function PublicFlashcards({ lexicon = [], config = {}, rawConfig = null, activeScriptId = null }) {
    const forcedScriptId = (activeScriptId && activeScriptId !== 'auto' && activeScriptId !== 'latin') ? activeScriptId : null;

    const [deck, setDeck] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [selectedTag, setSelectedTag] = useState('all');
    const [hasFinished, setHasFinished] = useState(false);
    const [deckStarted, setDeckStarted] = useState(false);
    const [scriptPracticeMode, setScriptPracticeMode] = useState('standard'); // 'standard', 'native_only', 'romanized_only'

    // Figure out all the unique semantic tags they've used so we can filter by them
    const allTags = useMemo(() => {
        const tags = lexicon.flatMap(word => word.tags || []);
        return [...new Set(tags)].sort();
    }, [lexicon]);

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

        if (wordObj.customAudioBase64) {
            try {
                const audio = new Audio(wordObj.customAudioBase64);
                await audio.play();
                return;
            } catch {
                // Fall back to synthesized speech if custom audio fails
            }
        }

        if (config.azureTtsVoice) {
            const safeEngine = ['browser', 'formant', 'human'].includes(config?.ttsEngine) ? config.ttsEngine : 'browser';
            const toastId = toast.loading("Generating audio...");
            try {
                await playAzureTTS({
                    text: cleanText,
                    ipa: cleanIpa,
                    voice: config.azureTtsVoice,
                    useIpa: config.azureTtsUseIpa,
                    engine: safeEngine
                });
                toast.dismiss(toastId);
            } catch {
                toast.dismiss(toastId);
            }
            return;
        }

        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText));
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
            } else {
                setCurrentIdx(nextIdx);
            }
        }, 300); // Matches the CSS transition time
    };

    const currentWord = deck[currentIdx];
    const remainingCards = deck.length - currentIdx;

    return (
        <div className="flashcards-container" style={{ padding: '0', maxWidth: '800px', margin: '0 auto' }}>
            
            {/* --- CONTROLS & HEADER --- */}
            <Card className="controls-card" style={{ marginBottom: '20px' }}>
                <div className="controls-header">
                    <h2 className="flex sg-title mb-0">
                        <BrainCircuit /> Flashcard Drill
                    </h2>
                </div>

                {!deckStarted && (
                    <>
                        <div className="filter-section">
                            <div className="filter-select-container">
                                <label className="filter-select-label">Filter by Semantic Tag:</label>
                                <select 
                                    value={selectedTag} 
                                    onChange={(e) => setSelectedTag(e.target.value)}
                                    className="filter-select"
                                >
                                    <option value="all">All Words ({lexicon.length})</option>
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

                        <div className="study-options-row">
                            <div className="study-options-group">
                                <label className="study-options-label">Script Mode:</label>
                                <div className="study-toggle-pills">
                                    <button
                                        type="button"
                                        className={`study-pill-btn ${scriptPracticeMode === 'standard' ? 'active' : ''}`}
                                        onClick={() => setScriptPracticeMode('standard')}
                                    >
                                        Standard
                                    </button>
                                    <button
                                        type="button"
                                        className={`study-pill-btn ${scriptPracticeMode === 'native_only' ? 'active' : ''}`}
                                        onClick={() => setScriptPracticeMode('native_only')}
                                        title="Practice reading native script glyphs only"
                                    >
                                        Native Script Drill
                                    </button>
                                    <button
                                        type="button"
                                        className={`study-pill-btn ${scriptPracticeMode === 'romanized_only' ? 'active' : ''}`}
                                        onClick={() => setScriptPracticeMode('romanized_only')}
                                        title="Show phonetic romanization only"
                                    >
                                        Romanized Only
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Card>


            {/* --- ACTIVE FLASHCARD AREA --- */}
            {deckStarted && (
                <div className="flashcard-area">
                    
                    <div className="cards-remaining">
                        Cards Remaining: <span className="cards-remaining-count">{hasFinished ? 0 : remainingCards}</span>
                    </div>

                    {/* The interactive card itself */}
                    <div
                        className="fc-scene"
                        role="button"
                        tabIndex={0}
                        aria-label="Flashcard, activate to flip"
                        onClick={handleFlip}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
                    >
                        <div className={`fc-inner ${isFlipped && !hasFinished ? 'is-flipped' : ''}`}>
                            
                            <div className="fc-face">
                                {hasFinished ? (
                                    <>
                                        <div className="finished-emoji">🎉</div>
                                        <h2 className="finished-title">Deck Finished!</h2>
                                        <p className="finished-text">Great job! You've gone through all the selected words.</p>
                                        <Button variant="default" onClick={() => setDeckStarted(false)} style={{marginTop: '20px'}}>Back to Menu</Button>
                                    </>
                                ) : currentWord ? (
                                    (() => {
                                        const rendered = renderWordInScript(currentWord, rawConfig || config, lexicon, forcedScriptId);
                                        const isRomanizedView = scriptPracticeMode === 'romanized_only' || activeScriptId === 'latin';
                                        const wordImg = typeof config.customGlyphs?.[(currentWord.word || '').toLowerCase()] === 'string'
                                            ? config.customGlyphs[(currentWord.word || '').toLowerCase()]
                                            : null;
                                        return (
                                            <>
                                                {scriptPracticeMode === 'native_only' ? (
                                                    <div className="fc-script-drill">
                                                        <div className={`fc-word custom-font-text notranslate fc-word-large ${rendered.cssClass || ''}`} data-writing-direction={rendered.direction} style={{ display: 'flex', justifyContent: 'center' }}>
                                                            {wordImg ? (
                                                                <img 
                                                                    src={wordImg} 
                                                                    alt={currentWord.word}
                                                                    style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
                                                                />
                                                            ) : (
                                                                rendered.text || (currentWord.word || '').replace(/\*/g, '')
                                                            )}
                                                        </div>
                                                        <div className="fc-script-hint">Native Script Drill</div>
                                                    </div>
                                                ) : isRomanizedView ? (
                                                    <>
                                                        <div className="fc-word notranslate" style={{ fontSize: '2rem', fontWeight: 600 }}>
                                                            {(currentWord.word || '').replace(/\*/g, '')}
                                                        </div>
                                                        {currentWord.ipa && (
                                                            <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`fc-word custom-font-text notranslate ${rendered.cssClass || ''}`} data-writing-direction={rendered.direction} style={{ display: 'flex', justifyContent: 'center' }}>
                                                            {wordImg ? (
                                                                <img 
                                                                    src={wordImg} 
                                                                    alt={currentWord.word}
                                                                    style={{ maxHeight: '80px', maxWidth: '200px', objectFit: 'contain' }}
                                                                />
                                                            ) : (
                                                                rendered.text || (currentWord.word || '').replace(/\*/g, '')
                                                            )}
                                                        </div>
                                                        {currentWord.ipa && (
                                                            <div className="fc-ipa notranslate">/{currentWord.ipa}/</div>
                                                        )}
                                                    </>
                                                )}
                                                <div style={{ marginTop: '15px' }}>
                                                    <Button variant="default" onClick={(e) => handleListen(e, currentWord)} style={{ padding: '6px 12px' }}>
                                                        <div className="btn-content-flex"><Volume2 size={16} /> Listen</div>
                                                    </Button>
                                                </div>
                                                <div className="flip-hint" style={{ marginTop: '15px' }}>Click to flip</div>
                                            </>
                                        );
                                    })()
                                ) : null}
                            </div>

                            <div className="fc-face fc-back">
                                {currentWord && !hasFinished && (
                                    <>
                                        <div className="fc-trans">{currentWord.translation}</div>
                                        {scriptPracticeMode === 'native_only' && (
                                            <div className="fc-revealed-phonetics">
                                                <span className="notranslate" style={{ fontWeight: 600, color: 'var(--tx)' }}>
                                                    {currentWord.word.replace(/\*/g, '')}
                                                </span>
                                                {currentWord.ipa && <span className="notranslate" style={{ marginLeft: '8px' }}>/{currentWord.ipa}/</span>}
                                            </div>
                                        )}
                                        <div className="fc-class" style={{ marginTop: '10px' }}>{currentWord.wordClass}</div>
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
