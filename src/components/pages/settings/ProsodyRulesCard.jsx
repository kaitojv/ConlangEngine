import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import {
    computeProsody,
    TONE_OPTIONS,
    STRESS_POSITIONS,
    TONE_CONDITIONS
} from '../../../utils/prosodyEngine.jsx';
import StressWave from '../../UI/StressWave/StressWave.jsx';
import { Zap, Music, ArrowRight, Plus, X, Beaker, Trash2, Scale } from 'lucide-react';
import './prosodyRulesCard.css';

export default function ProsodyRulesCard() {
    const vowels = useConfigStore(s => s.vowels) || '';
    const stressRules = useConfigStore(s => s.stressRules) || [];
    const toneRules = useConfigStore(s => s.toneRules) || [];
    const updateConfig = useConfigStore(s => s.updateConfig);

    const [testWord, setTestWord] = useState('makina');

    // ─── Stress rule helpers ───
    // We support one stress rule at a time (the "primary stress strategy")
    const currentStressRule = stressRules[0] || null;
    const currentStressType = currentStressRule?.type || null;
    const currentStressValue = currentStressRule?.value || null;
    const currentFallback = currentStressRule?.fallback || 'penultimate';

    const setStressRule = (type, value, fallback) => {
        const rule = {
            id: 'stress-primary',
            type,
            value,
            ...(fallback ? { fallback } : {})
        };
        updateConfig({ stressRules: [rule] });
    };

    const clearStressRules = () => {
        updateConfig({ stressRules: [] });
    };

    const handleStressClick = (value) => {
        // Toggle off if already selected
        if (currentStressType === 'fixed' && currentStressValue === value) {
            clearStressRules();
        } else {
            setStressRule('fixed', value);
        }
    };

    const handleWeightClick = () => {
        if (currentStressType === 'weight') {
            clearStressRules();
        } else {
            setStressRule('weight', 'heaviest', 'penultimate');
        }
    };

    const handleFallbackChange = (fallback) => {
        if (currentStressRule) {
            setStressRule(currentStressRule.type, currentStressRule.value, fallback);
        }
    };

    // ─── Tone rule helpers ───
    const addToneRule = () => {
        const newRule = {
            id: `tone-${Date.now()}`,
            condition: 'stressed',
            value: 'High'
        };
        updateConfig({ toneRules: [...toneRules, newRule] });
    };

    const updateToneRule = (id, field, value) => {
        updateConfig({
            toneRules: toneRules.map(r =>
                r.id === id ? { ...r, [field]: value } : r
            )
        });
    };

    const removeToneRule = (id) => {
        updateConfig({ toneRules: toneRules.filter(r => r.id !== id) });
    };

    const clearToneRules = () => {
        updateConfig({ toneRules: [] });
    };

    // ─── Live preview ───
    const preview = useMemo(() => {
        if (!testWord.trim()) return null;
        return computeProsody(testWord.trim().replace(/\*/g, ''), {
            vowels,
            stressRules,
            toneRules
        });
    }, [testWord, vowels, stressRules, toneRules]);

    const hasAnyRules = stressRules.length > 0 || toneRules.length > 0;

    return (
        <Card className="prosody-card">
            <h2 className="flex sg-title"><Zap /> Stress & Tone Rules</h2>

            <Infobox title="How Prosody Rules Work">
                Define <b>language-wide rules</b> that automatically compute stress and tone for every word.<br />
                • <b>Stress Rules:</b> Pick where primary stress falls (e.g., always on the penultimate syllable).<br />
                • <b>Tone Rules:</b> Assign tones based on position (e.g., stressed syllable gets High tone).<br />
                • <b>Manual Override:</b> Per-word stress/tone set in the Edit Modal always takes priority.
            </Infobox>

            {/* ─── STRESS SECTION ─── */}
            <div className="prosody-section">
                <div className="prosody-section-title">
                    <Zap size={14} /> Primary Stress Rule
                </div>

                <div className="prosody-stress-type-row">
                    {STRESS_POSITIONS.map(pos => (
                        <button
                            key={pos.value}
                            className={`prosody-type-btn ${currentStressType === 'fixed' && currentStressValue === pos.value ? 'active' : ''}`}
                            onClick={() => handleStressClick(pos.value)}
                        >
                            {pos.label}
                        </button>
                    ))}
                    <button
                        className={`prosody-type-btn ${currentStressType === 'weight' ? 'active' : ''}`}
                        onClick={handleWeightClick}
                    >
                        <Scale size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Weight-Based (Heaviest)
                    </button>
                </div>

                {currentStressType === 'weight' && (
                    <div className="prosody-fallback-row">
                        <span className="prosody-fallback-label">If no heavy syllable, fall back to:</span>
                        <select
                            className="prosody-fallback-select"
                            value={currentFallback}
                            onChange={(e) => handleFallbackChange(e.target.value)}
                        >
                            {STRESS_POSITIONS.map(pos => (
                                <option key={pos.value} value={pos.value}>{pos.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {stressRules.length > 0 && (
                    <div className="prosody-clear-row">
                        <button className="prosody-clear-btn" onClick={clearStressRules}>
                            <Trash2 size={12} /> Clear Stress Rule
                        </button>
                    </div>
                )}
            </div>

            {/* ─── TONE SECTION ─── */}
            <div className="prosody-section">
                <div className="prosody-section-title">
                    <Music size={14} /> Tone Assignment Rules
                </div>

                {toneRules.length > 0 ? (
                    <div className="prosody-tone-rules">
                        {toneRules.map(rule => (
                            <div key={rule.id} className="prosody-tone-rule-row">
                                <select
                                    className="prosody-tone-select"
                                    value={rule.condition}
                                    onChange={(e) => updateToneRule(rule.id, 'condition', e.target.value)}
                                >
                                    {TONE_CONDITIONS.map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>

                                <ArrowRight size={14} className="prosody-tone-arrow" />

                                <select
                                    className="prosody-tone-select"
                                    value={rule.value}
                                    onChange={(e) => updateToneRule(rule.id, 'value', e.target.value)}
                                >
                                    {TONE_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>

                                <button
                                    className="prosody-tone-remove"
                                    onClick={() => removeToneRule(rule.id)}
                                    title="Remove this rule"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="prosody-empty">
                        No tone rules defined. Words won't receive auto-computed tones.
                    </div>
                )}

                <button className="prosody-add-tone-btn" onClick={addToneRule}>
                    <Plus size={14} /> Add Tone Rule
                </button>

                {toneRules.length > 0 && (
                    <div className="prosody-clear-row">
                        <button className="prosody-clear-btn" onClick={clearToneRules}>
                            <Trash2 size={12} /> Clear All Tone Rules
                        </button>
                    </div>
                )}
            </div>

            {/* ─── LIVE PREVIEW ─── */}
            {hasAnyRules && (
                <div className="prosody-preview">
                    <div className="prosody-preview-title">
                        <Beaker size={14} /> Live Preview
                    </div>

                    <div className="prosody-preview-input-row">
                        <input
                            className="prosody-preview-input"
                            type="text"
                            placeholder="Type a word to test (e.g., makina)"
                            value={testWord}
                            onChange={(e) => setTestWord(e.target.value)}
                        />
                    </div>

                    {preview && (
                        <>
                            {/* Stress wave curve */}
                            {(preview.stress || preview.tone) && (
                                <div className="prosody-preview-wave-wrap" style={{ width: '100%', maxWidth: '300px', marginBottom: '0.5rem' }}>
                                    <StressWave
                                        word={testWord}
                                        stress={preview.stress}
                                        tone={preview.tone}
                                        customVowelsStr={vowels}
                                        width="100%"
                                        height="20px"
                                    />
                                </div>
                            )}
                            <div className="prosody-preview-result">
                            <span className="prosody-preview-badge syllables">
                                {preview.syllableCount} syllable{preview.syllableCount !== 1 ? 's' : ''}
                            </span>
                            {preview.stress && (
                                <span className="prosody-preview-badge stress">
                                    <Zap size={12} /> Stress: syllable {preview.stress}
                                </span>
                            )}
                            {preview.tone && (
                                <span className="prosody-preview-badge tone">
                                    <Music size={12} /> {preview.tone} Tone
                                </span>
                            )}
                            {!preview.stress && !preview.tone && (
                                <span className="prosody-preview-badge syllables">
                                    No rules matched this word
                                </span>
                            )}
                                </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    );
}
