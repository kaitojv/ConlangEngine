import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal/Modal.jsx';
import { Volume2, BarChart2, FileText, ArrowRight, ArrowLeft, PenTool } from 'lucide-react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { buildScriptConfig, getDefaultScriptId } from '../../../utils/scriptResolver.js';
import { renderWordInScript } from '../../../utils/scriptRendering.js';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import StrokeOrderViewer from '../StrokeOrder/StrokeOrderViewer.jsx';
import GlyphPreviewBadge from '../Glyph/GlyphPreviewBadge.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import './glyphDetailsModal.css';

export default function GlyphDetailsModal({ isOpen, onClose, char, phoneme, glyph, type, name, isWord, scriptId = null, strokes = null }) {
    const { t } = useTranslation();
    const rawLexicon = useLexiconStore(state => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);
    const config = useConfigStore(useShallow(state => ({
        scriptSystems: state.scriptSystems,
        scriptRules: state.scriptRules,
        scriptDataById: state.scriptDataById,
        activeScriptSystemId: state.activeScriptSystemId,
        phonologyTypes: state.phonologyTypes,
        alphabeticScript: state.alphabeticScript,
        writingDirection: state.writingDirection,
        syllabificationAlgorithm: state.syllabificationAlgorithm,
        blockSettings: state.blockSettings,
        blockTemplates: state.blockTemplates,
        alphabetNames: state.alphabetNames,
        typographySettings: state.typographySettings,
        customGlyphs: state.customGlyphs,
        syllabaryMap: state.syllabaryMap,
        featuralComponents: state.featuralComponents,
        alphabetGlyphs: state.alphabetGlyphs,
        consonants: state.consonants,
        vowels: state.vowels,
        otherPhonemes: state.otherPhonemes,
        azureTtsVoice: state.azureTtsVoice,
        azureTtsUseIpa: state.azureTtsUseIpa,
    })));
    const effectiveScriptId = scriptId || config.activeScriptSystemId || getDefaultScriptId(config);
    const scriptConfig = useMemo(
        () => buildScriptConfig(config, effectiveScriptId),
        [config, effectiveScriptId]
    );
    const { transliterate } = useTransliterator(scriptConfig);
    const [stats, setStats] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const isConscript = ['syllabic', 'logographic', 'featural_block', 'featural', 'block'].includes(type);
    // Default to the glyph viewer (large display + usage stats), NOT the stroke editor.
    const [activeTab, setActiveTab] = useState('analysis');

    const rawName = (name || '').trim();
    const displayName = (rawName && rawName.toLowerCase() !== 'unnamed')
        ? rawName
        : `/${String(phoneme || char || '').replace(/^\/+|\/+$/g, '')}/`;

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
                    const entryLogo = entry.scriptForms?.[effectiveScriptId] || entry.ideogram || '';
                    if (entry.word === char || (type === 'logographic' && entryLogo === char)) return; // Skip self
                    
                    let targetString = type === 'logographic' ? entryLogo : transliterate(entry.word || '', lexicon);
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
                const glyphToken = (typeof glyph === 'string' && glyph.length > 0) ? glyph : null;
                const transliteratedChar = transliterate(char, lexicon) || char;

                lexicon.forEach(entry => {
                    let targetString = '';
                    
                    if (type === 'logographic') {
                        targetString = entry.scriptForms?.[effectiveScriptId] || entry.ideogram || '';
                        const codePoints = Array.from(targetString);
                        totalChars += codePoints.length;
                        
                        if (targetString.includes(char)) {
                            frequency += targetString.split(char).length - 1;
                            containingWords.push(entry);
                        }
                    } else {
                        // Alphabetic, Syllabic, Block — transliterated in the target script
                        targetString = transliterate(entry.word, lexicon) || '';
                        totalChars += targetString.length;

                        const needle = (glyphToken && targetString.includes(glyphToken))
                            ? glyphToken
                            : (transliteratedChar && targetString.includes(transliteratedChar))
                                ? transliteratedChar
                                : char;
                        
                        // Count occurrences and context
                        if (needle && targetString.includes(needle)) {
                            let countInWord = 0;
                            let index = targetString.indexOf(needle);
                            while (index !== -1) {
                                countInWord++;
                                
                                // Find predecessor
                                if (index > 0) {
                                    const prev = Array.from(targetString.slice(0, index)).pop();
                                    if (prev) predecessors[prev] = (predecessors[prev] || 0) + 1;
                                }
                                
                                // Find successor
                                const nextIndex = index + needle.length;
                                if (nextIndex < targetString.length) {
                                    const next = Array.from(targetString.slice(nextIndex))[0];
                                    if (next) successors[next] = (successors[next] || 0) + 1;
                                }
                                
                                index = targetString.indexOf(needle, index + 1);
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
    }, [isOpen, char, glyph, type, lexicon, transliterate, isWord, effectiveScriptId]);

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
        <Modal isOpen={isOpen} onClose={onClose} className="modal-xwide" title={displayName}>
            <div className="glyph-modal-content">
                {/* Tab Switcher for Conscript Systems */}
                {isConscript && (
                    <div className="glyph-modal-tabs">
                        <button
                            className={`glyph-modal-tab ${activeTab === 'analysis' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analysis')}
                        >
                            <BarChart2 size={16} /> {t('glyphDetails.glyphAndUsage')}
                        </button>
                        <button
                            className={`glyph-modal-tab ${activeTab === 'stroke_order' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stroke_order')}
                        >
                            <PenTool size={16} /> {t('glyphDetails.strokeOrder')}
                        </button>
                    </div>
                )}

                {activeTab === 'stroke_order' && isConscript ? (
                    <StrokeOrderViewer word={char} char={char} scriptType={type} scriptId={effectiveScriptId} rawStrokes={strokes} />
                ) : (
                    <>
                        <div className="glyph-display-card glass">
                            <div 
                                className={`glyph-large custom-font-text notranslate ${effectiveScriptId ? `conlang-script-${effectiveScriptId}` : ''}`}
                                style={{ fontSize: dynamicFontSize }}
                            >
                                {isWord ? displayStr : (
                                    React.isValidElement(glyph) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {glyph}
                                        </div>
                                    ) : (
                                        <GlyphPreviewBadge plain strokes={strokes} glyph={glyph || char} scriptId={effectiveScriptId} size={180} />
                                    )
                                )}
                            </div>
                            <button 
                                className={`btn-primary audio-btn ${isPlaying ? 'playing' : ''}`}
                                onClick={handlePlayAudio}
                                disabled={isPlaying}
                            >
                                <Volume2 size={20} /> {t('glyphDetails.listenPronunciation')}
                            </button>
                        </div>

                        {stats && (
                            <div className="glyph-stats-grid">
                                {stats.isWordMode ? (
                                    <>
                                        <div className="stat-card glass">
                                            <BarChart2 size={24} className="stat-icon" />
                                            <div className="stat-value">{stats.length}</div>
                                            <div className="stat-label">{t('glyphDetails.length')}</div>
                                        </div>
                                        <div className="stat-card glass">
                                            <BarChart2 size={24} className="stat-icon" />
                                            <div className="stat-value">{stats.compoundCount}</div>
                                            <div className="stat-label">{t('glyphDetails.compoundsFound')}</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="stat-card glass">
                                            <BarChart2 size={24} className="stat-icon" />
                                            <div className="stat-value">{stats.frequency}</div>
                                            <div className="stat-label">{t('glyphDetails.totalUses')}</div>
                                        </div>
                                        <div className="stat-card glass">
                                            <BarChart2 size={24} className="stat-icon" />
                                            <div className="stat-value">{stats.percentage}%</div>
                                            <div className="stat-label">{t('glyphDetails.ofAllCharacters')}</div>
                                        </div>
                                        
                                        <div className="stat-context-card glass">
                                            <ArrowLeft size={16} className="context-icon" />
                                            <div className="context-content">
                                                <div className="context-label">{t('glyphDetails.mostCommonPreceding')}</div>
                                                <div className={`context-value custom-font-text notranslate ${effectiveScriptId ? `conlang-script-${effectiveScriptId}` : ''}`}>
                                                    {stats.topPredecessor && stats.topPredecessor !== '-' ? (
                                                        <GlyphPreviewBadge plain glyph={stats.topPredecessor} scriptId={effectiveScriptId} size={28} />
                                                    ) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="stat-context-card glass">
                                            <ArrowRight size={16} className="context-icon" />
                                            <div className="context-content">
                                                <div className="context-label">{t('glyphDetails.mostCommonFollowing')}</div>
                                                <div className={`context-value custom-font-text notranslate ${effectiveScriptId ? `conlang-script-${effectiveScriptId}` : ''}`}>
                                                    {stats.topSuccessor && stats.topSuccessor !== '-' ? (
                                                        <GlyphPreviewBadge plain glyph={stats.topSuccessor} scriptId={effectiveScriptId} size={28} />
                                                    ) : '-'}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="glyph-words-list glass">
                            <h3 className="words-list-title"><FileText size={18}/> {stats?.isWordMode ? t('glyphDetails.compoundsTitle', { name: displayName }) : t('glyphDetails.topWordsTitle', { name: displayName })}</h3>
                            {stats?.containingWords.length > 0 ? (
                                <div className="words-grid">
                                    {stats.containingWords.map(word => {
                                        const rendered = renderWordInScript(word, config, lexicon, effectiveScriptId);
                                        return (
                                            <div key={word.id} className="word-pill">
                                                <span
                                                    className={`word-text custom-font-text notranslate ${effectiveScriptId ? `conlang-script-${effectiveScriptId}` : ''}`}
                                                    data-script-id={effectiveScriptId}
                                                    data-writing-direction={rendered.writingDirection}
                                                >
                                                    {rendered.text}
                                                </span>
                                                <span className="word-translation">{word.translation}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="no-words-text">{stats?.isWordMode ? t('glyphDetails.noCompounds') : t('glyphDetails.noWords')}</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
