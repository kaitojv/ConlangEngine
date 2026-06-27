import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal/Modal.jsx';
import { Volume2, BarChart2, FileText, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import toast from 'react-hot-toast';
import './glyphDetailsModal.css';

export default function GlyphDetailsModal({ isOpen, onClose, char, glyph, type, name, isWord }) {
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const config = useConfigStore.getState();
    const { transliterate } = useTransliterator();
    const [stats, setStats] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!isOpen || !char) return;

        // Perform analysis
        const analyzeGlyph = () => {
            let frequency = 0;
            let totalChars = 0;
            const predecessors = {};
            const successors = {};
            const containingWords = [];

            if (isWord) {
                // Word Mode Statistics
                const compounds = [];
                lexicon.forEach(entry => {
                    if (entry.word === char || (type === 'logographic' && entry.ideogram === char)) return; // Skip self
                    
                    let targetString = type === 'logographic' ? (entry.ideogram || '') : transliterate(entry.word || '');
                    if (targetString.includes(char)) {
                        compounds.push(entry);
                    }
                });

                setStats({
                    isWordMode: true,
                    length: char.length, // approximation, could use phoneme count
                    compoundCount: compounds.length,
                    containingWords: compounds.slice(0, 10)
                });

            } else {
                // Glyph Mode Statistics
                lexicon.forEach(entry => {
                    let targetString = '';
                    
                    if (type === 'logographic') {
                        targetString = entry.ideogram || '';
                        totalChars += targetString.length;
                        
                        if (targetString.includes(char)) {
                            frequency += targetString.split(char).length - 1;
                            containingWords.push(entry);
                        }
                    } else {
                        // Alphabetic, Syllabic, Block
                        targetString = transliterate(entry.word) || '';
                        totalChars += targetString.length;
                        
                        // Count occurrences and context
                        if (targetString.includes(char)) {
                            let countInWord = 0;
                            let index = targetString.indexOf(char);
                            while (index !== -1) {
                                countInWord++;
                                
                                // Find predecessor
                                if (index > 0) {
                                    const prev = targetString.charAt(index - 1);
                                    predecessors[prev] = (predecessors[prev] || 0) + 1;
                                }
                                
                                // Find successor
                                const nextIndex = index + char.length;
                                if (nextIndex < targetString.length) {
                                    const next = targetString.charAt(nextIndex);
                                    successors[next] = (successors[next] || 0) + 1;
                                }
                                
                                index = targetString.indexOf(char, index + 1);
                            }
                            
                            frequency += countInWord;
                            containingWords.push(entry);
                        }
                    }
                });

                // Sort contexts
                const topPredecessor = Object.entries(predecessors).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
                const topSuccessor = Object.entries(successors).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

                setStats({
                    isWordMode: false,
                    frequency,
                    totalChars,
                    percentage: totalChars > 0 ? ((frequency / totalChars) * 100).toFixed(2) : '0.00',
                    topPredecessor: topPredecessor[0],
                    topSuccessor: topSuccessor[0],
                    containingWords: containingWords.slice(0, 10) // Take top 10 for display
                });
            }
        };

        analyzeGlyph();
    }, [isOpen, char, type, lexicon, transliterate]);

    const handlePlayAudio = async () => {
        setIsPlaying(true);
        const toastId = toast.loading("Synthesizing audio...");
        try {
            if (config.azureTtsVoice) {
                await playAzureTTS({
                    text: char,
                    ipa: char, // Assuming the char is closely tied to IPA for this feature
                    voice: config.azureTtsVoice,
                    useIpa: config.azureTtsUseIpa
                });
                toast.success("Audio played successfully", { id: toastId });
            } else {
                toast.error("Azure TTS voice not configured in settings.", { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error("Azure TTS failed: " + err.message, { id: toastId });
        } finally {
            setIsPlaying(false);
        }
    };

    const displayStr = glyph || char || '';
    const dynamicFontSize = isWord ? Math.max(2, Math.min(8, 30 / displayStr.length)) + 'rem' : '8rem';

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Glyph Analysis: ${name}`}>
            <div className="glyph-modal-content">
                <div className="glyph-display-card glass">
                    <div 
                        className="glyph-large custom-font-text notranslate"
                        style={{ fontSize: dynamicFontSize, wordBreak: 'break-all' }}
                    >
                        {displayStr}
                    </div>
                    <button 
                        className={`btn-primary audio-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={handlePlayAudio}
                        disabled={isPlaying}
                    >
                        <Volume2 size={20} /> Listen to Pronunciation
                    </button>
                </div>

                {stats && (
                    <div className="glyph-stats-grid">
                        {stats.isWordMode ? (
                            <>
                                <div className="stat-card glass">
                                    <BarChart2 size={24} className="stat-icon" />
                                    <div className="stat-value">{stats.length}</div>
                                    <div className="stat-label">Length</div>
                                </div>
                                <div className="stat-card glass">
                                    <BarChart2 size={24} className="stat-icon" />
                                    <div className="stat-value">{stats.compoundCount}</div>
                                    <div className="stat-label">Compounds Found</div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="stat-card glass">
                                    <BarChart2 size={24} className="stat-icon" />
                                    <div className="stat-value">{stats.frequency}</div>
                                    <div className="stat-label">Total Uses</div>
                                </div>
                                <div className="stat-card glass">
                                    <BarChart2 size={24} className="stat-icon" />
                                    <div className="stat-value">{stats.percentage}%</div>
                                    <div className="stat-label">of all characters</div>
                                </div>
                                
                                <div className="stat-context-card glass">
                                    <ArrowLeft size={16} className="context-icon" />
                                    <div className="context-content">
                                        <div className="context-label">Most common preceding</div>
                                        <div className="context-value custom-font-text">{stats.topPredecessor}</div>
                                    </div>
                                </div>
                                <div className="stat-context-card glass">
                                    <ArrowRight size={16} className="context-icon" />
                                    <div className="context-content">
                                        <div className="context-label">Most common following</div>
                                        <div className="context-value custom-font-text">{stats.topSuccessor}</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="glyph-words-list glass">
                    <h3 className="words-list-title"><FileText size={18}/> {stats?.isWordMode ? `Compounds containing ${name}` : `Top Words containing ${name}`}</h3>
                    {stats?.containingWords.length > 0 ? (
                        <div className="words-grid">
                            {stats.containingWords.map(word => (
                                <div key={word.id} className="word-pill">
                                    <span className="word-text custom-font-text">{type === 'logographic' ? word.ideogram : word.word}</span>
                                    <span className="word-translation">{word.translation}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-words-text">{stats?.isWordMode ? "No compounds use this word yet." : "No words in the lexicon use this glyph yet."}</p>
                    )}
                </div>
            </div>
        </Modal>
    );
}
