import React, { useState, useRef, useEffect, useMemo } from 'react';
import Card from '../../UI/Card/Card.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { stripAffix, getPersonRules } from '../../../utils/morphologyEngine.jsx';
import { Trash2, Save, X, Info, Palette, Link2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import './alignertab.css';

const PRESET_COLORS = [
    '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa',
    '#fb7185', '#38bdf8', '#f472b6', '#fb923c', '#ffffff'
];

export default function AlignerTab() {
    const config = useConfigStore();
    const sentenceMaps = config.sentenceMaps || [];
    const grammarRules = config.grammarRules || [];
    const updateConfig = config.updateConfig;
    const lexicon = useLexiconStore(state => state.lexicon) || [];

    const [sourceText, setSourceText] = useState('');
    const [targetText, setTargetText] = useState('');
    const [links, setLinks] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [activeColor, setActiveColor] = useState(PRESET_COLORS[0]);
    const [viewingMap, setViewingMap] = useState(null);
    const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });

    const workspaceRef = useRef(null);
    const modalWorkspaceRef = useRef(null);

    const sourceWords = useMemo(() =>
        sourceText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w)),
        [sourceText]
    );
    const targetWords = useMemo(() =>
        targetText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w)),
        [targetText]
    );

    const analyzeWord = (surface, depth = 0) => {
        if (depth > 3) return null;
        const safeSurface = surface.toLowerCase().trim();
        const lexEntry = lexicon.find(e => e.word.toLowerCase() === safeSurface);
        if (lexEntry) return { root: lexEntry, rules: [] };
        const personRules = getPersonRules(config.personRules || []);
        const personMatch = personRules.find(r => {
            const cleanFree = r.freeForm?.toLowerCase().replace(/^-|-|'/g, '').trim();
            const cleanAffix = r.affix?.toLowerCase().replace(/^-|-|'/g, '').trim();
            return cleanFree === safeSurface || (cleanAffix && cleanAffix === safeSurface);
        });
        if (personMatch) return { root: { word: personMatch.freeForm || personMatch.affix, wordClass: 'Person/Class Marker', translation: personMatch.name || 'Pronoun/Affix' }, rules: [] };
        let allRules = [...grammarRules, ...personRules.filter(p => p.affix).map(p => ({ ...p, name: p.name || 'Person' }))];
        for (const rule of allRules) {
            if (!rule.affix) continue;
            const cleanRuleAffix = rule.affix.toLowerCase().replace(/^-|-|'/g, '').trim();
            if (cleanRuleAffix === safeSurface) return { root: { word: rule.affix, wordClass: 'Grammar Marker', translation: rule.name || 'Affix' }, rules: [] };
            const stripped = stripAffix(safeSurface, rule.affix);
            if (stripped) {
                const subParsing = analyzeWord(stripped, depth + 1);
                if (subParsing) return { root: subParsing.root, rules: [rule, ...subParsing.rules] };
            }
        }
        return null;
    };

    const handleWordHover = (word, e) => {
        const analysis = analyzeWord(word);
        const content = analysis ? (
            <div className="aligner-tooltip">
                <div className="tooltip-word">{analysis.root.word}</div>
                <div className="tooltip-class">{analysis.root.wordClass}</div>
                <div className="tooltip-trans">{analysis.root.translation}</div>
                {analysis.rules.length > 0 && <div className="tooltip-derivation">{analysis.rules.map((r, i) => <span key={i} className="derivation-tag">+{r.name || r.affix}</span>)}</div>}
            </div>
        ) : (
            <div className="aligner-tooltip">
                <div className="tooltip-word">{word}</div>
                <div className="tooltip-class">Project Term</div>
                <div className="tooltip-trans">No mapping or lexicon entry found.</div>
            </div>
        );
        setTooltip({ visible: true, content, x: e.clientX, y: e.clientY - 15 });
    };

    const handleSourceClick = (index) => {
        if (selectedSource === index) { setSelectedSource(null); return; }
        setSelectedSource(index);
        if (selectedTarget !== null) setLinks([...links, { sIdx: index, tIdx: selectedTarget, color: activeColor }], setSelectedSource(null), setSelectedTarget(null));
    };

    const handleTargetClick = (index) => {
        if (selectedTarget === index) { setSelectedTarget(null); return; }
        setSelectedTarget(index);
        if (selectedSource !== null) setLinks([...links, { sIdx: selectedSource, tIdx: index, color: activeColor }], setSelectedSource(null), setSelectedTarget(null));
    };

    const handleSave = () => {
        if (!sourceText || !targetText) return;
        updateConfig({ sentenceMaps: [{ id: Date.now(), sourceText, targetText, links, createdAt: new Date().toISOString() }, ...sentenceMaps] });
        setSourceText(''); setTargetText(''); setLinks([]); toast.success("Saved mapping!");
    };

    const getLinkColors = (index, isSource) => links.filter(l => (isSource ? l.sIdx : l.tIdx) === index).map(l => l.color);

    return (
        <div className="aligner-tab-container">
            {/* Modal first for z-index safety */}
            {viewingMap && (
                <div className="aligner-modal-overlay" onClick={() => setViewingMap(null)}>
                    <div className="aligner-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setViewingMap(null)}><X size={24} /></button>
                        <div className="modal-header"><h3>Sentence Mapping View</h3></div>
                        <div className="modal-content">
                            <div className="aligner-workspace static" ref={modalWorkspaceRef}>
                                <div className="svg-overlay">
                                    <svg width="100%" height="100%"><DynamicLinks links={viewingMap.links} sourceWords={viewingMap.sourceText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w))} targetWords={viewingMap.targetText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w))} parentRef={modalWorkspaceRef} isStatic /></svg>
                                </div>
                                <div className="word-row source-row">
                                    {viewingMap.sourceText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w)).map((word, i) => (
                                        <div key={`vs-${i}`} className="word-chip static custom-font-text" onMouseEnter={(e) => handleWordHover(word, e)} onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}>{word}</div>
                                    ))}
                                </div>
                                <div className="spacer-gap" />
                                <div className="word-row target-row">
                                    {viewingMap.targetText.trim().split(/([\s.\-'])/).filter(w => w !== '' && !/[\s.\-']/.test(w)).map((word, i) => (
                                        <div key={`vt-${i}`} className="word-chip static">{word}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <div className="aligner-header">
                    <h2><Link2 size={42} /> Sentence Mapper</h2>
                    <p>Map conlang morphology to translations and visualize complex grammar flows.</p>
                </div>
                <div className="aligner-editor">
                    <div className="input-group">
                        <label><Info size={14} /> Source Sentence</label>
                        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="e.g. soir'ma" className="custom-font-text" />
                    </div>
                    <div className="editor-divider"><ArrowRight size={32} /></div>
                    <div className="input-group">
                        <label><Palette size={14} /> Target Sentence</label>
                        <textarea value={targetText} onChange={(e) => setTargetText(e.target.value)} placeholder="e.g. I see" />
                    </div>
                </div>

                {sourceWords.length > 0 && targetWords.length > 0 && (
                    <div className="aligner-workspace-container">
                        <div className="palette-bar">
                            <Palette size={16} />
                            {PRESET_COLORS.map(c => (
                                <button key={c} className={`color-dot ${activeColor === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setActiveColor(c)} />
                            ))}
                        </div>
                        <div className="aligner-workspace" ref={workspaceRef}>
                            <div className="svg-overlay">
                                <svg width="100%" height="100%"><DynamicLinks links={links} sourceWords={sourceWords} targetWords={targetWords} onRemove={(idx) => setLinks(links.filter((_, i) => i !== idx))} parentRef={workspaceRef} /></svg>
                            </div>
                            <div className="word-row source-row">
                                {sourceWords.map((word, i) => {
                                    const linkedColors = getLinkColors(i, true);
                                    return (
                                        <button key={`s-${i}`} className={`word-chip source-chip custom-font-text ${selectedSource === i ? 'selected' : ''}`}
                                            style={linkedColors.length > 0 ? { borderColor: linkedColors[0], boxShadow: `0 0 15px ${linkedColors[0]}66` } : {}}
                                            onClick={() => handleSourceClick(i)} onMouseEnter={(e) => handleWordHover(word, e)} onMouseLeave={() => setTooltip({ ...tooltip, visible: false })}>{word}</button>
                                    );
                                })}
                            </div>
                            <div className="spacer-gap" />
                            <div className="word-row target-row">
                                {targetWords.map((word, i) => {
                                    const linkedColors = getLinkColors(i, false);
                                    return (
                                        <button key={`t-${i}`} className={`word-chip target-chip ${selectedTarget === i ? 'selected' : ''}`}
                                            style={linkedColors.length > 0 ? { borderColor: linkedColors[0], boxShadow: `0 0 15px ${linkedColors[0]}66` } : {}}
                                            onClick={() => handleTargetClick(index)}>{word}</button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="workspace-footer">
                            <Button variant="default" onClick={() => { setLinks([]); setSourceText(''); setTargetText('') }}>Clear All</Button>
                            <Button onClick={handleSave}><Save size={18} /> Save Mapping</Button>
                        </div>
                    </div>
                )}
            </Card>

            <div className="saved-maps-grid">
                <h3>Saved Mappings</h3>
                <div className="maps-container">
                    {sentenceMaps.map(map => (
                        <div key={map.id} className="map-card-clickable" onClick={() => setViewingMap(map)}>
                            <div className="map-card-preview">
                                <span className="source-preview custom-font-text">{map.sourceText}</span>
                                <ArrowRight size={16} />
                                <span className="target-preview">{map.targetText}</span>
                            </div>
                            <button className="delete-map-icon-btn" onClick={(e) => { e.stopPropagation(); updateConfig({ sentenceMaps: sentenceMaps.filter(m => m.id !== map.id) }); toast.success("Deleted!"); }}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {tooltip.visible && <div className="aligner-tooltip-wrapper" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.content}</div>}
        </div>
    );
}

function DynamicLinks({ links, sourceWords, targetWords, onRemove, isStatic, parentRef }) {
    const [coords, setCoords] = useState([]);
    useEffect(() => {
        const updateCoords = () => {
            if (!parentRef.current) return;
            const parentRect = parentRef.current.getBoundingClientRect();
            const sNodes = parentRef.current.querySelectorAll('.source-row .word-chip');
            const tNodes = parentRef.current.querySelectorAll('.target-row .word-chip');
            const newCoords = links.map(link => {
                const sEl = sNodes[link.sIdx]; const tEl = tNodes[link.tIdx];
                if (sEl && tEl) {
                    const sRect = sEl.getBoundingClientRect(); const tRect = tEl.getBoundingClientRect();
                    return { x1: sRect.left + sRect.width / 2 - parentRect.left, y1: sRect.bottom - parentRect.top, x2: tRect.left + tRect.width / 2 - parentRect.left, y2: tRect.top - parentRect.top, color: link.color };
                }
                return null;
            }).filter(c => c !== null);
            setCoords(newCoords);
        };
        updateCoords();
        const int = setInterval(updateCoords, 100);
        return () => clearInterval(int);
    }, [links, sourceWords, targetWords, parentRef]);

    return (
        <>{coords.map((c, i) => (
            <path key={i} d={`M ${c.x1} ${c.y1} C ${c.x1} ${(c.y1 + c.y2) / 2}, ${c.x2} ${(c.y1 + c.y2) / 2}, ${c.x2} ${c.y2}`}
                stroke={c.color} strokeWidth="4" fill="none" strokeLinecap="round" className="aligner-path"
                style={{ pointerEvents: isStatic ? 'none' : 'auto' }} onClick={() => !isStatic && onRemove(i)} />
        ))}</>
    );
}
