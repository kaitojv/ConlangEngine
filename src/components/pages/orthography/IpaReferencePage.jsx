import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { generateIpaFromWord } from '../../../utils/ipaGenerator.js';
import {
    IPA_COLUMNS, IPA_PULMONIC, IPA_VOWELS,
import {
    IPA_NON_PULMONIC, IPA_OTHER_CONSONANTS,
    IPA_SUPRASEGMENTALS, IPA_DIACRITICS, IPA_INFO
} from '../../../utils/ipaData.js';
import { Volume2, VolumeX, Plus, Minus, BookOpen, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import './ipaReferencePage.css';
import './anatomyOverlay.css';

const ANATOMY_SPOTS = {
    'Bilabial': { x: 13, y: 68 },
    'Labiodental': { x: 15, y: 67 },
    'Dental': { x: 20, y: 65 },
    'Alveolar': { x: 26, y: 57 },
    'Postalveolar': { x: 30, y: 52 },
    'Retroflex': { x: 34, y: 48 },
    'Palatal': { x: 43, y: 43 },
    'Velar': { x: 62, y: 45 },
    'Uvular': { x: 72, y: 52 },
    'Pharyngeal': { x: 78, y: 72 },
    'Glottal': { x: 70, y: 89 }
};

// ─── Audio Playback ───────────────────────────────────────────────────────────
let currentAudio = null;

function playPhonemeAudio(url, onPlay, onEnd) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (!url) return;
    try {
        const audio = new Audio(url);
        currentAudio = audio;
        audio.onended  = () => { currentAudio = null; onEnd(); };
        audio.onerror  = () => { currentAudio = null; onEnd(); };
        audio.play().then(onPlay).catch(onEnd);
    } catch {
        onEnd();
    }
}

// ─── Detail Popover ───────────────────────────────────────────────────────────
function PhonemePopover({ phoneme, anchorRect, onClose, isInCons, isInVows, onToggleCons, onToggleVows }) {
    const info = IPA_INFO[phoneme];
    const [playing, setPlaying] = useState(false);
    const ref = useRef(null);

    // Position logic: prefer appearing above the anchor, clamped to viewport
    const style = (() => {
        if (!anchorRect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
        const pw = 308;
        const ph = 320; // estimated height
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = anchorRect.left + anchorRect.width / 2 - pw / 2;
        let top  = anchorRect.top - ph - 10;

        if (top < 60) top = anchorRect.bottom + 10;  // flip below
        if (left + pw > vw - 10) left = vw - pw - 10;
        if (left < 10) left = 10;
        if (top + ph > vh - 10) top = vh - ph - 10;
        if (top < 10) top = 10;

        return { top, left };
    })();

    const handlePlay = () => {
        if (!info?.audio) return;
        setPlaying(true);
        playPhonemeAudio(info.audio, () => {}, () => setPlaying(false));
    };

    const isActive = isInCons || isInVows;

    return (
        <>
            <div className="ipa-detail-overlay" onClick={onClose} />
            <div className="ipa-detail-popover" style={style} ref={ref}>
                {/* Header */}
                <div className="ipa-popover-header">
                    <div className="ipa-popover-symbol">{phoneme}</div>
                    <div>
                        <div className="ipa-popover-name">
                            {info?.name ?? `IPA /${phoneme}/`}
                        </div>
                        <div className="ipa-popover-badges">
                            {info?.place && (
                                <span className="ipa-popover-badge place">{info.place}</span>
                            )}
                            {info?.manner && (
                                <span className="ipa-popover-badge manner">{info.manner}</span>
                            )}
                            {info?.isVowel && (
                                <span className="ipa-popover-badge vowel">Vowel</span>
                            )}
                            {!info?.isVowel && info?.voiced !== undefined && (
                                <span className={`ipa-popover-badge ${info.voiced ? 'voiced' : 'voiceless'}`}>
                                    {info.voiced ? 'Voiced' : 'Voiceless'}
                                </span>
                            )}
                            {isActive && (
                                <span className="ipa-popover-badge vowel" style={{ background:'rgba(124,58,237,0.2)', color:'var(--acc2)', borderColor:'rgba(124,58,237,0.3)' }}>
                                    In Inventory
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="ipa-popover-body">
                    {info?.description ? (
                        <div className="ipa-popover-description">{info.description}</div>
                    ) : (
                        <div className="ipa-popover-description" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                            No description available for this phoneme yet.
                        </div>
                    )}
                    {info?.example && (
                        <div className="ipa-popover-example">
                            <BookOpen size={12} />
                            {info.example}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="ipa-popover-actions">
                    {/* Audio */}
                    <button
                        className={`ipa-action-btn play ${playing ? 'playing' : ''}`}
                        onClick={handlePlay}
                        disabled={!info?.audio}
                        title={info?.audio ? 'Play pronunciation' : 'No audio available'}
                    >
                        {info?.audio ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        {playing ? 'Playing…' : 'Play'}
                    </button>

                    {/* Inventory toggles */}
                    {!info?.isVowel && (
                        <button
                            className={`ipa-action-btn ${isInCons ? 'remove' : 'add-cons'}`}
                            onClick={() => { onToggleCons(phoneme); }}
                        >
                            {isInCons ? <Minus size={12} /> : <Plus size={12} />}
                            {isInCons ? 'Remove' : 'Consonants'}
                        </button>
                    )}
                    {info?.isVowel && (
                        <button
                            className={`ipa-action-btn ${isInVows ? 'remove' : 'add-vow'}`}
                            onClick={() => { onToggleVows(phoneme); }}
                        >
                            {isInVows ? <Minus size={12} /> : <Plus size={12} />}
                            {isInVows ? 'Remove' : 'Vowels'}
                        </button>
                    )}
                    {/* Unknown type — offer both */}
                    {!info && (
                        <>
                            <button className={`ipa-action-btn ${isInCons ? 'remove' : 'add-cons'}`} onClick={() => onToggleCons(phoneme)}>
                                {isInCons ? <Minus size={12} /> : <Plus size={12} />}
                                {isInCons ? 'Rem. Cons.' : '+ Cons.'}
                            </button>
                            <button className={`ipa-action-btn ${isInVows ? 'remove' : 'add-vow'}`} onClick={() => onToggleVows(phoneme)}>
                                {isInVows ? <Minus size={12} /> : <Plus size={12} />}
                                {isInVows ? 'Rem. Vow.' : '+ Vow.'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IpaReferencePage() {
    const consonants   = useConfigStore(s => s.consonants) || '';
    const vowels       = useConfigStore(s => s.vowels)     || '';
    const ipaMappingRules = useConfigStore(s => s.ipaMappingRules) || '';
    const updateConfig = useConfigStore(s => s.updateConfig);
    
    const lexicon      = useLexiconStore(s => s.lexicon);
    const updateWord   = useLexiconStore(s => s.updateWord);

    const [selected, setSelected] = useState(null); // { phoneme, rect }

    // Parse inventory into Sets for O(1) lookup
    const consSet = new Set(
        consonants.split(',').map(s => s.trim().split('=')[0]).filter(Boolean)
    );
    const vowsSet = new Set(
        vowels.split(',').map(s => s.trim().split('=')[0]).filter(Boolean)
    );

    const isInCons = ph => consSet.has(ph);
    const isInVows = ph => vowsSet.has(ph);
    const isActive = ph => consSet.has(ph) || vowsSet.has(ph);

    // Toggle helpers
    const toggleInventory = useCallback((phoneme, type) => {
        const key = type === 'cons' ? 'consonants' : 'vowels';
        const current = type === 'cons' ? consonants : vowels;
        let arr = current.trim() ? current.split(',').map(s => s.trim()) : [];
        const idx = arr.findIndex(a => a === phoneme || a.startsWith(phoneme + '='));
        if (idx > -1) arr.splice(idx, 1);
        else arr.push(phoneme);
        updateConfig({ [key]: arr.join(', ') });
    }, [consonants, vowels, updateConfig]);

    // Open popover on phoneme click
    const handlePhonemeClick = useCallback((phoneme, e) => {
        if (!phoneme) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setSelected({ phoneme, rect });
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // ── Render helpers ──
    const renderPh = (phoneme, extraClass = '') => {
        if (!phoneme) return (
            <button key="empty" className="ipa-ph-btn empty" disabled aria-hidden="true">·</button>
        );
        const active = isActive(phoneme);
        return (
            <button
                key={phoneme}
                className={`ipa-ph-btn ${extraClass} ${active ? 'active' : ''}`}
                onClick={(e) => handlePhonemeClick(phoneme, e)}
                title={IPA_INFO[phoneme]?.name ?? phoneme}
            >
                {phoneme}
            </button>
        );
    };

    // Vowel trapezoid positions
    // Each vowel row: [frontLeft%, centralLeft%, backLeft%] at a given top%
    const vowelPositions = [
        { top: 2,   frontLeft: 10, centralLeft: 50, backLeft: 90 },  // Close
        { top: 20,  frontLeft: 17, centralLeft: 55, backLeft: 90 },  // Near-close
        { top: 36,  frontLeft: 24, centralLeft: 61, backLeft: 90 },  // Close-mid
        { top: 52,  frontLeft: 32, centralLeft: 66, backLeft: 90 },  // Mid
        { top: 66,  frontLeft: 38, centralLeft: 72, backLeft: 90 },  // Open-mid
        { top: 80,  frontLeft: 44, centralLeft: 76, backLeft: 90 },  // Near-open
        { top: 96,  frontLeft: 50, centralLeft: 80, backLeft: 90 },  // Open
    ];

    const handleBulkApplyIpa = () => {
        if (!ipaMappingRules.trim()) {
            return toast.error("Please define some IPA mapping rules first.");
        }
        
        let updateCount = 0;
        
        lexicon.forEach(wordObj => {
            // Only update words that don't have IPA defined yet
            if (!wordObj.ipa || wordObj.ipa.trim() === '') {
                // Strip asterisks/hyphens just like the generator does internally, or feed it straight?
                // Actually the word might have asterisks. The generator might leave them or not based on rules.
                // Let's remove them for IPA generation to be safe
                const cleanWord = wordObj.word.replace(/[*\\-]/g, '');
                const generatedIpa = generateIpaFromWord(cleanWord, ipaMappingRules);
                
                if (generatedIpa && generatedIpa !== cleanWord.toLowerCase()) {
                    updateWord(wordObj.id, { ipa: generatedIpa });
                    updateCount++;
                }
            }
        });
        
        if (updateCount > 0) {
            toast.success(`Generated IPA for ${updateCount} words.`);
        } else {
            toast('No words needed IPA generation.', { icon: 'ℹ️' });
        }
    };

    return (
        <div className="ipa-ref-container">

            {/* ── IPA AUTO-GENERATION ── */}
            <div className="ipa-ref-section" style={{ backgroundColor: 'var(--s1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div className="ipa-ref-section-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--s2)', borderRadius: '14px 14px 0 0' }}>
                    IPA Auto-Generation
                </div>
                <div className="ipa-ref-section-body" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)', marginBottom: '1rem', lineHeight: '1.4' }}>
                        Define rules to automatically generate IPA from your orthography (e.g., <span className="custom-font-text" style={{background: 'var(--s2)', padding: '2px 6px', borderRadius: '4px'}}>oo=oʊ, c=k, sh=ʃ</span>). 
                        The generator will use these rules when you click the magic wand icon in the dictionary editor.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>Mapping Rules (Comma Separated)</label>
                            <input 
                                className="fi w-full"
                                value={ipaMappingRules}
                                onChange={(e) => updateConfig({ ipaMappingRules: e.target.value })}
                                placeholder="oo=oʊ, c=k, sh=ʃ"
                            />
                        </div>
                        <div style={{ paddingTop: '1.5rem' }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleBulkApplyIpa}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                            >
                                <Wand2 size={16} /> Bulk Apply to Lexicon
                            </button>
                            <div style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '0.5rem', textAlign: 'center' }}>
                                (Only affects words without IPA)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PULMONIC CONSONANTS ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">
                    Pulmonic Consonants
                    <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        left = voiceless · right = voiced
                    </span>
                </div>
                <div className="ipa-ref-section-body">
                    <table className="ipa-cons-table">
                        <thead>
                            <tr>
                                <th className="row-header"></th>
                                {IPA_COLUMNS.map(col => (
                                    <th key={col}>{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {IPA_PULMONIC.map(row => (
                                <tr key={row.row}>
                                    <th className="row-header">{row.row}</th>
                                    {row.cells.map((cell, j) => (
                                        <td key={j} className={!cell ? 'impossible' : ''}>
                                            {cell ? (
                                                <div className="ipa-cell-pair">
                                                    {renderPh(cell[0], 'voiceless')}
                                                    {renderPh(cell[1], 'voiced')}
                                                </div>
                                            ) : null}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="ipa-ref-legend">
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot active"></div> In your inventory
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot voiceless"></div> Voiceless
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot voiced"></div> Voiced
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot impossible"></div> Impossible articulation
                    </div>
                </div>
            </div>
            
            {/* ── ANATOMY DIAGRAM ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">Places of Articulation Anatomy</div>
                <div className="ipa-ref-section-body" style={{ display: 'flex', justifyContent: 'center', background: '#ffffff', borderRadius: '0 0 14px 14px', padding: '1rem' }}>
                    <div className="ipa-anatomy-container">
                        <img 
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Places_of_articulation.svg" 
                            alt="Sagittal section of the vocal tract showing places of articulation" 
                            style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px', filter: 'hue-rotate(240deg)' }}
                        />
                        {Object.entries(ANATOMY_SPOTS).map(([place, pos]) => {
                            const isSelected = selected && IPA_INFO[selected.phoneme]?.place === place;
                            return (
                                <div 
                                    key={place}
                                    className={`anatomy-dot ${isSelected ? 'active' : ''}`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                    title={place}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── VOWELS ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">Vowels (IPA Trapezoid)</div>
                <div className="ipa-vowel-section">
                    <div className="ipa-vowel-title-row">
                        <span>Front</span>
                        <span>Central</span>
                        <span>Back</span>
                    </div>
                    <div className="ipa-vowel-trapezoid-wrap">
                        {/* SVG grid lines */}
                        <svg className="ipa-vowel-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
                            {/* Outer trapezoid */}
                            <polygon
                                points="10,1 90,1 90,49 50,49"
                                fill="none" stroke="var(--bd)" strokeWidth="0.5"
                                vectorEffect="non-scaling-stroke"
                            />
                            {/* Central line */}
                            <line x1="50" y1="1" x2="70" y2="49" stroke="var(--bd)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                            {/* Horizontal row guides */}
                            {vowelPositions.slice(1, 6).map((pos, i) => (
                                <line
                                    key={i}
                                    x1={pos.frontLeft}
                                    y1={pos.top}
                                    x2="90"
                                    y2={pos.top}
                                    stroke="var(--bd)"
                                    strokeWidth="0.3"
                                    strokeDasharray="1,1"
                                    vectorEffect="non-scaling-stroke"
                                />
                            ))}
                        </svg>

                        {/* Vowel buttons positioned on the trapezoid */}
                        {IPA_VOWELS.map((row, rowIdx) => {
                            const pos = vowelPositions[rowIdx];
                            const [s0, s1, s2, s3, s4, s5] = row.sounds;

                            return (
                                <div key={row.label} className="ipa-vowel-row-wrap">
                                    {/* Row label */}
                                    <span
                                        className="ipa-vowel-row-label"
                                        style={{ top: `${pos.top}%`, left: `${pos.frontLeft}%` }}
                                    >
                                        {row.label}
                                    </span>

                                    {/* Front pair */}
                                    {(s0 || s1) && (
                                        <div
                                            className="ipa-vowel-pair"
                                            style={{ left: `${pos.frontLeft}%`, top: `${pos.top}%` }}
                                        >
                                            {s0 && (
                                                <button
                                                    className={`ipa-vowel-btn ${isActive(s0) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s0, e)}
                                                    title={IPA_INFO[s0]?.name ?? s0}
                                                >{s0}</button>
                                            )}
                                            {s1 && (
                                                <button
                                                    className={`ipa-vowel-btn rounded ${isActive(s1) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s1, e)}
                                                    title={IPA_INFO[s1]?.name ?? s1}
                                                >{s1}</button>
                                            )}
                                        </div>
                                    )}

                                    {/* Central pair */}
                                    {(s2 || s3) && (
                                        <div
                                            className="ipa-vowel-pair"
                                            style={{ left: `${pos.centralLeft}%`, top: `${pos.top}%` }}
                                        >
                                            {s2 && (
                                                <button
                                                    className={`ipa-vowel-btn ${isActive(s2) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s2, e)}
                                                    title={IPA_INFO[s2]?.name ?? s2}
                                                >{s2}</button>
                                            )}
                                            {s3 && (
                                                <button
                                                    className={`ipa-vowel-btn rounded ${isActive(s3) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s3, e)}
                                                    title={IPA_INFO[s3]?.name ?? s3}
                                                >{s3}</button>
                                            )}
                                        </div>
                                    )}

                                    {/* Back pair */}
                                    {(s4 || s5) && (
                                        <div
                                            className="ipa-vowel-pair"
                                            style={{ left: `${pos.backLeft}%`, top: `${pos.top}%` }}
                                        >
                                            {s4 && (
                                                <button
                                                    className={`ipa-vowel-btn ${isActive(s4) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s4, e)}
                                                    title={IPA_INFO[s4]?.name ?? s4}
                                                >{s4}</button>
                                            )}
                                            {s5 && (
                                                <button
                                                    className={`ipa-vowel-btn rounded ${isActive(s5) ? 'active' : ''}`}
                                                    onClick={e => handlePhonemeClick(s5, e)}
                                                    title={IPA_INFO[s5]?.name ?? s5}
                                                >{s5}</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="ipa-ref-legend" style={{ marginTop: '0.5rem' }}>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot active"></div> In your inventory
                    </div>
                    <span style={{ opacity: 0.6 }}>Left = unrounded · Right (darker) = rounded</span>
                </div>
            </div>

            {/* ── NON-PULMONIC ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">Non-Pulmonic & Co-articulated</div>
                <div className="ipa-ref-grid">
                    {IPA_NON_PULMONIC.map(group => (
                        <div key={group.title} className="ipa-ref-group">
                            <div className="ipa-ref-group-title">{group.title}</div>
                            <div className="ipa-ref-sounds">
                                {group.sounds.map(ph => (
                                    <button
                                        key={ph}
                                        className={`ipa-ref-ph ${isActive(ph) ? 'active' : ''}`}
                                        onClick={e => handlePhonemeClick(ph, e)}
                                        title={IPA_INFO[ph]?.name ?? ph}
                                    >{ph}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="ipa-ref-group">
                        <div className="ipa-ref-group-title">Co-articulated & Other</div>
                        <div className="ipa-ref-sounds">
                            {IPA_OTHER_CONSONANTS.map(ph => (
                                <button
                                    key={ph}
                                    className={`ipa-ref-ph ${isActive(ph) ? 'active' : ''}`}
                                    onClick={e => handlePhonemeClick(ph, e)}
                                    title={IPA_INFO[ph]?.name ?? ph}
                                >{ph}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SUPRASEGMENTALS & DIACRITICS ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">Suprasegmentals & Diacritics</div>
                <div className="ipa-ref-grid">
                    {IPA_SUPRASEGMENTALS.map(group => (
                        <div key={group.title} className="ipa-ref-group">
                            <div className="ipa-ref-group-title">{group.title}</div>
                            <div className="ipa-ref-sounds">
                                {group.sounds.map(ph => (
                                    <button
                                        key={ph}
                                        className="ipa-ref-ph"
                                        onClick={e => handlePhonemeClick(ph, e)}
                                    >{ph}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {IPA_DIACRITICS.map(group => (
                        <div key={group.title} className="ipa-ref-group">
                            <div className="ipa-ref-group-title">{group.title}</div>
                            <div className="ipa-ref-sounds">
                                {group.sounds.map(ph => (
                                    <button
                                        key={ph}
                                        className="ipa-ref-ph"
                                        onClick={e => handlePhonemeClick(`◌${ph}`, e)}
                                        title={`${group.title} diacritic`}
                                    >◌{ph}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── DETAIL POPOVER ── */}
            {selected && (
                <PhonemePopover
                    phoneme={selected.phoneme}
                    anchorRect={selected.rect}
                    onClose={() => setSelected(null)}
                    isInCons={isInCons(selected.phoneme)}
                    isInVows={isInVows(selected.phoneme)}
                    onToggleCons={(ph) => { toggleInventory(ph, 'cons'); setSelected(null); }}
                    onToggleVows={(ph) => { toggleInventory(ph, 'vow'); setSelected(null); }}
                />
            )}
        </div>
    );
}
