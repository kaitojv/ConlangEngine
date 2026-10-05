import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal/Modal.jsx';
import { Volume2, BarChart2, FileText, ArrowRight, ArrowLeft, PenTool } from 'lucide-react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import StrokeOrderViewer from '../StrokeOrder/StrokeOrderViewer.jsx';
import GlyphPreviewBadge from '../Glyph/GlyphPreviewBadge.jsx';
import toast from 'react-hot-toast';
import './glyphDetailsModal.css';

export default function GlyphDetailsModal({ isOpen, onClose, char, glyph, type, name, isWord, scriptId = null, strokes = null }) {
    const rawLexicon = useLexiconStore(state => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);
    const config = useConfigStore.getState();
    const { transliterate } = useTransliterator();
    const [stats, setStats] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const isConscript = ['syllabic', 'logographic', 'featural_block', 'featural', 'block'].includes(type);
    // Default to the glyph viewer (large display + usage stats), NOT the stroke editor.
    const [activeTab, setActiveTab] = useState('analysis');

    useEffect(() => {
        // Always open the character viewer first; the stroke editor is opt-in via its own tab.
        setActiveTab('analysis');
    }, [char, type, isConscript]);

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
    }, [isOpen, char, type, lexicon, transliterate, isWord]);

    const handlePlayAudio = async () => {
        setIsPlaying(true);
        const toastId = toast.loading("Synthesizing audio...");
        try {
            await playAzureTTS({
                text: char,
                ipa: char,
                voice: config.azureTtsVoice || 'ipa-default',
                useIpa: config.azureTtsUseIpa ?? true
            });
            toast.dismiss(toastId);
        } catch (err) {
            console.error(err);
            toast.dismiss(toastId);
        } finally {
            setIsPlaying(false);
        }
    };

    const displayStr = glyph || char || '';
    // Scale long words down so they wrap within the modal instead of overflowing it.
    // The previous 2.5rem floor was too high to ever shrink for very long words.
    const dynamicFontSize = isWord ? Math.max(1.25, Math.min(10, 34 / displayStr.length)) + 'rem' : '10rem';

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="modal-xwide" title={`${name || char}`}>
            <div className="glyph-modal-content">
                {/* Tab Switcher for Conscript Systems */}
                {isConscript && (
                    <div className="glyph-modal-tabs">
                        <button
                            className={`glyph-modal-tab ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            <BarChart2 size={16} /> Glyph & Usage
                        </button>
                        <button
                            className={`glyph-modal-tab ${activeTab === 'stroke_order' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stroke_order')}
                        >
                            <PenTool size={16} /> Stroke Order
                        </button>
                    </div>
                )}

                {activeTab === 'stroke_order' && isConscript ? (
                    <StrokeOrderViewer word={char} char={char} scriptType={type} rawStrokes={strokes} />
                ) : (
                    <>
                        <div className="glyph-display-card glass">
                            <div 
                                className={`glyph-large custom-font-text notranslate ${scriptId ? `conlang-script-${scriptId}` : ''}`}
                                style={{ fontSize: dynamicFontSize }}
                            >
                                {isWord ? displayStr : (
                                    React.isValidElement(glyph) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {glyph}
                                        </div>
                                    ) : (
                                        <GlyphPreviewBadge plain strokes={strokes} glyph={glyph || char} scriptId={scriptId} size={180} />
                                    )
                                )}
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
                    </>
                )}
            </div>
        </Modal>
    );
}
