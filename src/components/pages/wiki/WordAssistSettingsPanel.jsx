import React, { useMemo, useState } from 'react';
import {
    Sliders, Link2, CheckCircle2, AlertTriangle, Plus, RotateCcw, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import {
    CANONICAL_SYNTAX_ORDERS,
    GRAMMATICAL_SLOTS,
    TYPOLOGY_SELECT_FIELDS,
    resolveTranslatorSettings,
    buildGrammaticalResolver,
    buildPronounSystem,
    buildGrammarRuleEntry
} from '@/utils/wordAssist/configResolver.js';
import { auditLanguageReadiness } from '@/utils/wordAssist/diagnosticsEngine.js';

const SLOT_GROUPS = [
    { id: 'core_case', title: 'Core Alignment & Cases' },
    { id: 'oblique_case', title: 'Spatial & Oblique Cases' },
    { id: 'nominal', title: 'Number & Definiteness' },
    { id: 'tam', title: 'Tense, Aspect & Mood' },
    { id: 'clause', title: 'Polarity, Degree & Clause' }
];

export default function WordAssistSettingsPanel({ config: propConfig = {}, updateConfig, grammarRules: propRules, onClose }) {
    const navigate = useNavigate();
    const storeState = useConfigStore();
    const lexicon = useLexiconStore((state) => state.lexicon) || [];

    const fullConfig = useMemo(() => ({
        ...storeState,
        ...propConfig,
        wordAssistConfig: {
            ...(storeState.wordAssistConfig || {}),
            ...(propConfig.wordAssistConfig || {})
        }
    }), [storeState, propConfig]);

    const grammarRules = propRules || fullConfig.grammarRules || [];
    const particleDatabase = fullConfig.particleDatabase || [];
    const waConfig = fullConfig.wordAssistConfig || {};
    const resolved = useMemo(
        () => resolveTranslatorSettings({ ...fullConfig, waConfig: fullConfig.wordAssistConfig }),
        [fullConfig]
    );

    const [activeSection, setActiveSection] = useState('typology');
    const [creatingSlotId, setCreatingSlotId] = useState(null);
    const [draftRule, setDraftRule] = useState({ name: '', affix: '', gloss: '', targetPOS: 'Noun', standalone: false });

    const resolver = useMemo(() => buildGrammaticalResolver({
        grammarRules,
        particleDatabase,
        usesParticles: fullConfig.usesParticles,
        settings: resolved
    }), [grammarRules, particleDatabase, fullConfig.usesParticles, resolved]);

    const pronounSystem = useMemo(() => buildPronounSystem({
        personRulesArray: fullConfig.personRules || [],
        pronounMatrixData: fullConfig.pronounMatrixData || {}
    }), [fullConfig.personRules, fullConfig.pronounMatrixData]);

    const readiness = useMemo(() => auditLanguageReadiness({
        lexicon,
        settings: resolved,
        resolver,
        pronounSystem,
        particleDatabase,
        numberSystem: fullConfig.numberSystem || {}
    }), [lexicon, resolved, resolver, pronounSystem, particleDatabase, fullConfig.numberSystem]);

    const updateWa = (patch) => {
        const latestWa = useConfigStore.getState().wordAssistConfig || waConfig;
        const nextWa = {
            ...latestWa,
            ...patch
        };
        if (nextWa.syntaxOrder === 'QCTLJNORVMSAPG') {
            delete nextWa.syntaxOrder;
        }
        (updateConfig || useConfigStore.getState().updateConfig)({ wordAssistConfig: nextWa });
    };

    const handleBindingChange = (slotId, value) => {
        const nextRuleBindings = { ...(waConfig.ruleBindings || {}) };
        const nextParticleBindings = { ...(waConfig.particleBindings || {}) };

        if (!value || value === 'auto') {
            delete nextRuleBindings[slotId];
            delete nextParticleBindings[slotId];
        } else if (value === 'none') {
            nextRuleBindings[slotId] = 'none';
            nextParticleBindings[slotId] = 'none';
        } else if (value.startsWith('rule:')) {
            nextRuleBindings[slotId] = value.slice(5);
            delete nextParticleBindings[slotId];
        } else if (value.startsWith('ptcl:')) {
            nextParticleBindings[slotId] = value.slice(5);
            delete nextRuleBindings[slotId];
        }

        updateWa({
            ruleBindings: nextRuleBindings,
            particleBindings: nextParticleBindings
        });
    };

    const startCreateRuleForSlot = (slot) => {
        setCreatingSlotId(slot.id);
        setDraftRule({
            name: slot.label.split('(')[0].trim(),
            affix: slot.suggestedAffix || `-${slot.defaultGloss.toLowerCase()}`,
            gloss: slot.defaultGloss,
            targetPOS: slot.posHint === 'All' || slot.posHint === 'Particle' ? 'all' : slot.posHint,
            standalone: Boolean(slot.standaloneDefault)
        });
    };

    const handleSaveQuickRule = (slotId) => {
        if (!draftRule.name.trim() || !draftRule.affix.trim()) {
            toast.error('Enter both rule name and affix / marker.');
            return;
        }
        const newRule = buildGrammarRuleEntry(slotId, draftRule);
        const updatedRules = [...grammarRules, newRule];
        const nextRuleBindings = { ...(waConfig.ruleBindings || {}), [slotId]: newRule.id };
        updateConfig({
            grammarRules: updatedRules,
            wordAssistConfig: {
                ...waConfig,
                ruleBindings: nextRuleBindings
            }
        });
        setCreatingSlotId(null);
        toast.success(`Created & bound "${newRule.name}" (${newRule.affix})`);
    };

    const goToSettings = (tab = 'grammar', sub = 'syntax') => {
        if (onClose) onClose();
        navigate(`/settings?tab=${tab}&sub=${sub}`);
    };

    const handleResetOverrides = () => {
        updateWa({
            alignment: 'accusative',
            genitivePlacement: 'possessor-possessed',
            adpositionPlacement: 'preposition',
            absorbPrepositionsIntoCase: true,
            negationPlacement: 'beforeVerb',
            adverbPlacement: 'beforeVerb',
            comparativeStrategy: 'analytic',
            questionWordPlacement: 'front',
            questionParticleBehavior: 'yesNoOnly',
            articleStrategy: 'omit',
            subjectRealization: 'free_only',
            proDropMode: 'never',
            verbPersonAgreement: 'off',
            ruleBindings: {},
            particleBindings: {},
            roleOverrides: {}
        });
        toast.success('Translator settings reset to Grammar defaults.');
    };

    return (
        <div className="wasp-container" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Sync Banner & Navigation Tabs */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--s2)',
                border: '1px solid var(--bd)'
            }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--tx2)', lineHeight: 1.4 }}>
                    Directly synced with <strong>Settings &rarr; Grammar</strong>, <strong>Pronouns</strong>, <strong>Particles</strong>, and <strong>Numerals</strong>. Changes here update your conlang grammar globally.
                </div>
                <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => goToSettings('grammar', 'syntax')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem' }}
                >
                    <ExternalLink size={13} /> Open Grammar Settings
                </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--bd)', paddingBottom: '8px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={`btn btn-sm ${activeSection === 'typology' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveSection('typology')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <Sliders size={14} /> Grammar &amp; Syntax Rules
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${activeSection === 'bindings' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveSection('bindings')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <Link2 size={14} /> Bound Rules &amp; Particles ({Object.values(resolver.slotSummary).filter(Boolean).length}/{GRAMMATICAL_SLOTS.length})
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${activeSection === 'readiness' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveSection('readiness')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <CheckCircle2 size={14} /> Language Readiness ({readiness.scorePercent}%)
                </button>
            </div>

            {/* SECTION 1: EXPLICIT SYNTAX & TYPOLOGY SETTINGS */}
            {activeSection === 'typology' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px' }}>
                    <Field label="Core Word Order (Grammar Sync)">
                        <select
                            className="fi"
                            value={resolved.isLegacyCustomPriority ? (fullConfig.syntaxOrder || 'SVO') : resolved.syntaxOrder}
                            onChange={(e) => {
                                const val = e.target.value;
                                updateConfig({
                                    syntaxOrder: val,
                                    wordAssistConfig: { ...waConfig, syntaxOrder: val }
                                });
                            }}
                        >
                            {CANONICAL_SYNTAX_ORDERS.map(ord => (
                                <option key={ord} value={ord}>{ord}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Adjective Placement (Grammar Sync)">
                        <select
                            className="fi"
                            value={resolved.adjectivePlacement}
                            onChange={(e) => updateConfig({ adjectivePlacement: e.target.value })}
                        >
                            <option value="pre-nominal">Pre-nominal (e.g. Big dog)</option>
                            <option value="post-nominal">Post-nominal (e.g. Dog big)</option>
                        </select>
                    </Field>

                    {TYPOLOGY_SELECT_FIELDS.map(field => (
                        <Field key={field.key} label={field.label}>
                            <select
                                className="fi"
                                value={resolved[field.key]}
                                onChange={(e) => updateWa({ [field.key]: e.target.value })}
                            >
                                {field.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Field>
                    ))}

                    <Field label='Copula Handling ("to be" / Grammar Sync)'>
                        <select
                            className="fi"
                            value={resolved.copulaBehavior}
                            onChange={(e) => updateWa({ copulaBehavior: e.target.value })}
                        >
                            <option value="normal">Normal (&quot;to be&quot; verb from Lexicon)</option>
                            <option value="zero_copula">Zero Copula (omit or use particle)</option>
                        </select>
                    </Field>

                    {resolved.copulaBehavior === 'zero_copula' && (
                        <Field label="Optional Copula Particle / Marker">
                            <input
                                type="text"
                                className="fi"
                                value={resolved.copulaReplacement}
                                placeholder="Leave blank to drop 'is/are'"
                                onChange={(e) => updateWa({ copulaReplacement: e.target.value })}
                            />
                        </Field>
                    )}

                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: '14px', paddingTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={Boolean(fullConfig.adjectiveAgreement)}
                                onChange={(e) => updateConfig({ adjectiveAgreement: e.target.checked })}
                            />
                            Adjective Agreement (propagate Noun plural/case rules to modifying Adjectives)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={Boolean(resolved.absorbPrepositionsIntoCase)}
                                onChange={(e) => updateWa({ absorbPrepositionsIntoCase: e.target.checked })}
                            />
                            Absorb prepositions (in, from, with, to, of) into Case Rules automatically when defined
                        </label>
                    </div>
                </div>
            )}

            {/* SECTION 2: RULE & PARTICLE BINDINGS */}
            {activeSection === 'bindings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--tx2)' }}>
                        Word Assist automatically links your <strong>Grammar Rules</strong> and <strong>Particles</strong> by gloss and name. Override any slot below or create a missing rule in one click.
                    </div>
                    {SLOT_GROUPS.map(grp => {
                        const slots = GRAMMATICAL_SLOTS.filter(s => s.group === grp.id);
                        return (
                            <div key={grp.id} style={{ border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px 12px', background: 'var(--s2)' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--acc)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {grp.title}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {slots.map(slot => {
                                        const match = resolver.slotSummary[slot.id];
                                        const explicitRule = waConfig.ruleBindings?.[slot.id];
                                        const explicitPtcl = waConfig.particleBindings?.[slot.id];
                                        const selectVal = explicitRule === 'none'
                                            ? 'none'
                                            : (explicitRule && explicitRule !== 'auto'
                                                ? `rule:${explicitRule}`
                                                : (explicitPtcl && explicitPtcl !== 'auto' ? `ptcl:${explicitPtcl}` : 'auto'));

                                        return (
                                            <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '6px 8px', borderRadius: '6px', background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                                    <div style={{ minWidth: '180px' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tx)' }}>{slot.label}</div>
                                                        <div style={{ fontSize: '0.7rem', color: match ? '#10b981' : 'var(--tx3)' }}>
                                                            {match
                                                                ? `${match.source === 'binding' ? 'Pinned' : 'Auto'}: ${match.kind === 'particle' ? `Particle "${match.particle?.surface}"` : `${match.rule?.name} (${match.rule?.affix || '∅'})`}`
                                                                : `Not defined yet (expected gloss: ${slot.defaultGloss})`
                                                            }
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <select
                                                            className="fi"
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', minWidth: '180px' }}
                                                            value={selectVal}
                                                            onChange={(e) => handleBindingChange(slot.id, e.target.value)}
                                                        >
                                                            <option value="auto">Auto-detect ({match ? (match.rule?.name || match.particle?.surface) : 'None'})</option>
                                                            {grammarRules.length > 0 && (
                                                                <optgroup label="Grammar Rules">
                                                                    {grammarRules.map(r => (
                                                                        <option key={r.id || r.name} value={`rule:${r.id || r.name}`}>
                                                                            {r.name} ({r.affix || r.gloss || '∅'})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            {particleDatabase.length > 0 && (
                                                                <optgroup label="Particles">
                                                                    {particleDatabase.map(p => (
                                                                        <option key={p.id || p.surface} value={`ptcl:${p.id || p.surface}`}>
                                                                            Particle: {p.surface}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            <option value="none">Disable / Unmarked</option>
                                                        </select>

                                                        {!match && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm"
                                                                style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                                                onClick={() => creatingSlotId === slot.id ? setCreatingSlotId(null) : startCreateRuleForSlot(slot)}
                                                            >
                                                                <Plus size={12} /> Create Rule
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {creatingSlotId === slot.id && (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px auto', gap: '6px', paddingTop: '6px', borderTop: '1px dashed var(--bd)', alignItems: 'center' }}>
                                                        <input
                                                            type="text"
                                                            className="fi"
                                                            placeholder="Rule name"
                                                            value={draftRule.name}
                                                            onChange={(e) => setDraftRule(d => ({ ...d, name: e.target.value }))}
                                                        />
                                                        <input
                                                            type="text"
                                                            className="fi"
                                                            placeholder="Affix (e.g. -n)"
                                                            value={draftRule.affix}
                                                            onChange={(e) => setDraftRule(d => ({ ...d, affix: e.target.value }))}
                                                        />
                                                        <input
                                                            type="text"
                                                            className="fi"
                                                            placeholder="Gloss"
                                                            value={draftRule.gloss}
                                                            onChange={(e) => setDraftRule(d => ({ ...d, gloss: e.target.value }))}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleSaveQuickRule(slot.id)}
                                                        >
                                                            Save
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SECTION 3: READINESS AUDIT */}
            {activeSection === 'readiness' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: 'var(--s2)', border: '1px solid var(--bd)' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--tx)' }}>
                                Translator Readiness: {readiness.scorePercent}%
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--tx2)' }}>
                                {readiness.readyCount} of {readiness.totalCount} core grammatical foundations configured.
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => goToSettings('functionWords', '')}
                        >
                            Pronouns Matrix
                        </button>
                    </div>

                    {readiness.checks.map(chk => (
                        <div
                            key={chk.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--bd)',
                                background: 'var(--s1)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                {chk.status === 'ok'
                                    ? <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    : <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                                }
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--tx)' }}>{chk.label}</div>
                                    <div style={{ fontSize: '0.73rem', color: 'var(--tx2)' }}>{chk.detail}</div>
                                </div>
                            </div>
                            {chk.status !== 'ok' && chk.suggestedRule && (
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                                    onClick={() => {
                                        setActiveSection('bindings');
                                        startCreateRuleForSlot(SLOT_BY_ID_SAFE(chk.slotId) || { id: chk.slotId, label: chk.suggestedRule.name, defaultGloss: chk.suggestedRule.gloss, suggestedAffix: chk.suggestedRule.affix, posHint: chk.suggestedRule.targetPOS || 'Noun' });
                                    }}
                                >
                                    + Fix Now
                                </button>
                            )}
                            {chk.status !== 'ok' && !chk.suggestedRule && chk.targetTab && (
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    style={{ whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                                    onClick={() => goToSettings(chk.targetTab, 'syntax')}
                                >
                                    Configure
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--bd)' }}>
                <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleResetOverrides}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem' }}
                >
                    <RotateCcw size={13} /> Reset Translator Defaults
                </button>
                {onClose && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
                        Done
                    </button>
                )}
            </div>
        </div>
    );
}

function SLOT_BY_ID_SAFE(slotId) {
    return GRAMMATICAL_SLOTS.find(s => s.id === slotId) || null;
}

function Field({ label, children }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tx2)' }}>{label}</label>
            {children}
        </div>
    );
}
