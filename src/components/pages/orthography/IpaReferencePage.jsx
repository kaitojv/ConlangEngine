import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { generateIpaFromWord } from '../../../utils/ipaGenerator.js';
import {
    IPA_COLUMNS, IPA_PULMONIC, IPA_VOWELS,
    IPA_NON_PULMONIC, IPA_OTHER_CONSONANTS,
    IPA_SUPRASEGMENTALS, IPA_DIACRITICS, IPA_INFO
} from '../../../utils/ipaData.js';
import { Volume2, VolumeX, Plus, Minus, BookOpen, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
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
    const { t } = useTranslation();
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
            <div className="ipa-detail-overlay" role="presentation" onClick={onClose} />
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
                                <span className="ipa-popover-badge place">{t(`orthography.ipaRef.columns.${info.place}`, { defaultValue: info.place })}</span>
                            )}
                            {info?.manner && (
                                <span className="ipa-popover-badge manner">{t(`orthography.ipaRef.rows.${info.manner}`, { defaultValue: info.manner })}</span>
                            )}
                            {info?.isVowel && (
                                <span className="ipa-popover-badge vowel">{t('orthography.ipaRef.badgeVowel')}</span>
                            )}
                            {!info?.isVowel && info?.voiced !== undefined && (
                                <span className={`ipa-popover-badge ${info.voiced ? 'voiced' : 'voiceless'}`}>
                                    {info.voiced ? t('orthography.ipaRef.voiced') : t('orthography.ipaRef.voiceless')}
                                </span>
                            )}
                            {isActive && (
                                <span className="ipa-popover-badge vowel" style={{ background:'rgba(124,58,237,0.2)', color:'var(--acc2)', borderColor:'rgba(124,58,237,0.3)' }}>
                                    {t('orthography.ipaRef.inInventoryBadge')}
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
                            {t('orthography.ipaRef.noDescAvailable')}
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
                        title={info?.audio ? t('orthography.ipaRef.playPronunciation') : t('orthography.ipaRef.noAudioAvailable')}
                    >
                        {info?.audio ? <Volume2 size={13} /> : <VolumeX size={13} />}
                        {playing ? t('orthography.ipaRef.playing') : t('orthography.ipaRef.play')}
                    </button>

                    {/* Inventory toggles */}
                    {!info?.isVowel && (
                        <button
                            className={`ipa-action-btn ${isInCons ? 'remove' : 'add-cons'}`}
                            onClick={() => { onToggleCons(phoneme); }}
                        >
                            {isInCons ? <Minus size={12} /> : <Plus size={12} />}
                            {isInCons ? t('orthography.ipaRef.removeBtn') : t('orthography.ipaRef.consonantsBtn')}
                        </button>
                    )}
                    {info?.isVowel && (
                        <button
                            className={`ipa-action-btn ${isInVows ? 'remove' : 'add-vow'}`}
                            onClick={() => { onToggleVows(phoneme); }}
                        >
                            {isInVows ? <Minus size={12} /> : <Plus size={12} />}
                            {isInVows ? t('orthography.ipaRef.removeBtn') : t('orthography.ipaRef.vowelsBtn')}
                        </button>
                    )}
                    {/* Unknown type — offer both */}
                    {!info && (
                        <>
                            <button className={`ipa-action-btn ${isInCons ? 'remove' : 'add-cons'}`} onClick={() => onToggleCons(phoneme)}>
                                {isInCons ? <Minus size={12} /> : <Plus size={12} />}
                                {isInCons ? t('orthography.ipaRef.remConsBtn') : t('orthography.ipaRef.addConsBtn')}
                            </button>
                            <button className={`ipa-action-btn ${isInVows ? 'remove' : 'add-vow'}`} onClick={() => onToggleVows(phoneme)}>
                                {isInVows ? <Minus size={12} /> : <Plus size={12} />}
                                {isInVows ? t('orthography.ipaRef.remVowBtn') : t('orthography.ipaRef.addVowBtn')}
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
    const { t } = useTranslation();
    const consonants   = useConfigStore(s => s.consonants) || '';
    const vowels       = useConfigStore(s => s.vowels)     || '';
    const ipaMappingRules = useConfigStore(s => s.ipaMappingRules) || '';
    const updateConfig = useConfigStore(s => s.updateConfig);
    
    const lexicon      = useLexiconStore(s => s.lexicon);
    const updateWord   = useLexiconStore(s => s.updateWord);

    const { transliterate } = useTransliterator();

    const [selected, setSelected] = useState(null); // { phoneme, rect }
    const [overwriteIpa, setOverwriteIpa] = useState(false);

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
            return toast.error(t('orthography.ipaRef.noRulesToast'));
        }
        
        let updateCount = 0;
        
        lexicon.forEach(wordObj => {
            // Update if overwrite is true, or if it doesn't have an IPA
            if (overwriteIpa || !wordObj.ipa || wordObj.ipa.trim() === '') {
                // We want to generate IPA from the visible orthography, not the underlying phonemes
                const displayWord = transliterate(wordObj.word);
                const cleanWord = displayWord.replace(/[*\\-]/g, '');
                
                const result = generateIpaFromWord(cleanWord, ipaMappingRules);
                
                // Ensure a rule actually matched, and it's different from the existing IPA
                if (result.matched && result.ipa !== wordObj.ipa) {
                    updateWord(wordObj.id, { ipa: result.ipa });
                    updateCount++;
                }
            }
        });
        
        if (updateCount > 0) {
            toast.success(t('orthography.ipaRef.generatedToast', { count: updateCount }));
        } else {
            toast(t('orthography.ipaRef.noWordsNeededToast'), { icon: 'ℹ️' });
        }
    };

    return (
        <div className="ipa-ref-container">

            {/* ── IPA AUTO-GENERATION ── */}
            <div className="ipa-ref-section" style={{ backgroundColor: 'var(--s1)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div className="ipa-ref-section-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--s2)', borderRadius: '14px 14px 0 0' }}>
                    {t('orthography.ipaRef.autoGenTitle')}
                </div>
                <div className="ipa-ref-section-body" style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--tx2)', marginBottom: '1rem', lineHeight: '1.4' }}>
                        <span dangerouslySetInnerHTML={{ __html: t('orthography.ipaRef.autoGenDesc') }} />
                    </p>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label" style={{ fontSize: '0.85rem' }}>{t('orthography.ipaRef.mappingRulesLabel')}</label>
                            <input 
                                className="fi w-full"
                                value={ipaMappingRules}
                                onChange={(e) => updateConfig({ ipaMappingRules: e.target.value })}
                                placeholder={t('orthography.ipaRef.mappingRulesPlaceholder')}
                            />
                        </div>
                        <div style={{ paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <Button 
                                variant="save"
                                onClick={handleBulkApplyIpa}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', padding: '0.5rem 1rem' }}
                            >
                                <Wand2 size={16} /> {t('orthography.ipaRef.bulkApplyBtn')}
                            </Button>
                            
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--tx2)', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={overwriteIpa}
                                    onChange={(e) => setOverwriteIpa(e.target.checked)}
                                    style={{ accentColor: 'var(--acc)' }}
                                />
                                {t('orthography.ipaRef.overwriteCheckbox')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── PULMONIC CONSONANTS ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">
                    {t('orthography.ipaRef.pulmonicConsonants')}
                    <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                        {t('orthography.ipaRef.voicelessVoicedSubtitle')}
                    </span>
                </div>
                <div className="ipa-ref-section-body">
                    <table className="ipa-cons-table">
                        <thead>
                            <tr>
                                <th className="row-header"></th>
                                {IPA_COLUMNS.map(col => (
                                    <th key={col}>{t(`orthography.ipaRef.columns.${col}`, { defaultValue: col })}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {IPA_PULMONIC.map(row => (
                                <tr key={row.row}>
                                    <th className="row-header">{t(`orthography.ipaRef.rows.${row.row}`, { defaultValue: row.row })}</th>
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
                        <div className="legend-dot active"></div> {t('orthography.ipaRef.inInventory')}
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot voiceless"></div> {t('orthography.ipaRef.voiceless')}
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot voiced"></div> {t('orthography.ipaRef.voiced')}
                    </div>
                    <div className="ipa-ref-legend-item">
                        <div className="legend-dot impossible"></div> {t('orthography.ipaRef.impossibleArticulation')}
                    </div>
                </div>
            </div>
            
            {/* ── ANATOMY DIAGRAM ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">{t('orthography.ipaRef.anatomyTitle')}</div>
                <div className="ipa-ref-section-body" style={{ display: 'flex', justifyContent: 'center', background: '#ffffff', borderRadius: '0 0 14px 14px', padding: '1rem' }}>
                    <div className="ipa-anatomy-container">
                        <img 
                            src="https://commons.wikimedia.org/wiki/Special:FilePath/Places_of_articulation.svg" 
                            alt={t('orthography.ipaRef.anatomyAlt')} 
                            style={{ maxWidth: '100%', height: 'auto', maxHeight: '400px', filter: 'hue-rotate(240deg)' }}
                        />
                        {Object.entries(ANATOMY_SPOTS).map(([place, pos]) => {
                            const isSelected = selected && IPA_INFO[selected.phoneme]?.place === place;
                            return (
                                <div 
                                    key={place}
                                    className={`anatomy-dot ${isSelected ? 'active' : ''}`}
                                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                    title={t(`orthography.ipaRef.columns.${place}`, { defaultValue: place })}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── VOWELS ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">{t('orthography.ipaRef.vowelsTitle')}</div>
                <div className="ipa-vowel-section">
                    <div className="ipa-vowel-title-row">
                        <span>{t('orthography.ipaRef.front')}</span>
                        <span>{t('orthography.ipaRef.central')}</span>
                        <span>{t('orthography.ipaRef.back')}</span>
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
                                        {t(`orthography.ipaRef.vowelRows.${row.label}`, { defaultValue: row.label })}
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
                        <div className="legend-dot active"></div> {t('orthography.ipaRef.inInventory')}
                    </div>
                    <span style={{ opacity: 0.6 }}>{t('orthography.ipaRef.unroundedRoundedSubtitle')}</span>
                </div>
            </div>

            {/* ── NON-PULMONIC ── */}
            <div className="ipa-ref-section">
                <div className="ipa-ref-section-header">{t('orthography.ipaRef.nonPulmonicTitle')}</div>
                <div className="ipa-ref-grid">
                    {IPA_NON_PULMONIC.map(group => (
                        <div key={group.title} className="ipa-ref-group">
                            <div className="ipa-ref-group-title">{t(`orthography.ipaRef.groups.${group.title}`, { defaultValue: group.title })}</div>
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
                        <div className="ipa-ref-group-title">{t('orthography.ipaRef.coArticulatedTitle')}</div>
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
                <div className="ipa-ref-section-header">{t('orthography.ipaRef.suprasegmentalsTitle')}</div>
                <div className="ipa-ref-grid">
                    {IPA_SUPRASEGMENTALS.map(group => (
                        <div key={group.title} className="ipa-ref-group">
                            <div className="ipa-ref-group-title">{t(`orthography.ipaRef.groups.${group.title}`, { defaultValue: group.title })}</div>
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
                            <div className="ipa-ref-group-title">{t(`orthography.ipaRef.groups.${group.title}`, { defaultValue: group.title })}</div>
                            <div className="ipa-ref-sounds">
                                {group.sounds.map(ph => (
                                    <button
                                        key={ph}
                                        className="ipa-ref-ph"
                                        onClick={e => handlePhonemeClick(`◌${ph}`, e)}
                                        title={t('orthography.ipaRef.diacriticTooltip', { title: t(`orthography.ipaRef.groups.${group.title}`, { defaultValue: group.title }) })}
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
