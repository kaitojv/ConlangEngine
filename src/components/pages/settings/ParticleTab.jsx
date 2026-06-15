import React, { useState, useMemo } from 'react';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { resolveParticleSenses, generateGlossLine } from '@/utils/particleEngine.js';
import { Atom, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Layers, GitMerge, Play, Settings } from 'lucide-react';
import './particleTab.css';

// ── Sense Editor Sub-component ──
function SenseEditor({ sense, onUpdate, onDelete }) {
    const POS_OPTIONS = ['*', 'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'particle', 'conjunction', 'preposition', 'numeral'];
    return (
        <div className="sense-row">
            <div className="sense-fields">
                <div className="sense-field">
                    <label>When {sense.contextPOS === '*' ? 'any POS' : `after ${sense.contextPOS}`}:</label>
                    <select value={sense.contextPOS} onChange={(e) => onUpdate({ ...sense, contextPOS: e.target.value })}>
                        {POS_OPTIONS.map(p => <option key={p} value={p}>{p === '*' ? 'any (default)' : p}</option>)}
                    </select>
                </div>
                <div className="sense-field">
                    <label>Meaning:</label>
                    <input type="text" value={sense.meaning} onChange={(e) => onUpdate({ ...sense, meaning: e.target.value })} placeholder="e.g. accusative case" />
                </div>
                <div className="sense-field">
                    <label>Gloss:</label>
                    <input type="text" value={sense.gloss} onChange={(e) => onUpdate({ ...sense, gloss: e.target.value })} placeholder="e.g. ACC" style={{ width: '70px' }} />
                </div>
                <div className="sense-field">
                    <label>Tags:</label>
                    <input type="text" value={sense.tags?.join(', ') || ''} onChange={(e) => onUpdate({ ...sense, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="case, grammatical" />
                </div>
            </div>
            <button onClick={onDelete} className="sense-delete-btn"><Trash2 size={14} /></button>
        </div>
    );
}

// ── Single Particle Editor ──
function ParticleEditor({ particle, onSave, onCancel }) {
    const [data, setData] = useState(() => particle || {
        id: `ptcl-${Date.now()}`, surface: '', ipa: '', position: 'standalone', priority: 5, senses: [], restrictToTags: [], restrictToClasses: [],
    });

    const addSense = () => {
        setData(prev => ({
            ...prev,
            senses: [...(prev.senses || []), { id: `sense-${Date.now()}`, contextPOS: '*', meaning: '', gloss: '', tags: [] }],
        }));
    };

    const updateSense = (index, updated) => {
        setData(prev => ({
            ...prev,
            senses: prev.senses.map((s, i) => i === index ? updated : s),
        }));
    };

    const deleteSense = (index) => {
        setData(prev => ({
            ...prev,
            senses: prev.senses.filter((_, i) => i !== index),
        }));
    };

    return (
        <div className="particle-editor">
            <div className="particle-editor-header">
                <h3>{particle ? 'Edit Particle' : 'New Particle'}</h3>
                <button onClick={onCancel} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="particle-editor-fields">
                <div className="pe-field">
                    <label>Surface:</label>
                    <input type="text" value={data.surface} onChange={(e) => setData(prev => ({ ...prev, surface: e.target.value }))} placeholder="e.g. wi" className="custom-font-text notranslate" />
                </div>
                <div className="pe-field">
                    <label>IPA:</label>
                    <input type="text" value={data.ipa} onChange={(e) => setData(prev => ({ ...prev, ipa: e.target.value }))} placeholder="e.g. wi" />
                </div>
                <div className="pe-field">
                    <label>Position:</label>
                    <select value={data.position} onChange={(e) => setData(prev => ({ ...prev, position: e.target.value }))}>
                        <option value="standalone">Standalone</option>
                        <option value="prefix">Prefix</option>
                        <option value="suffix">Suffix</option>
                    </select>
                </div>
                <div className="pe-field">
                    <label>Priority:</label>
                    <input type="number" value={data.priority} onChange={(e) => setData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))} style={{ width: '60px' }} />
                    <span className="pe-hint">lower = closer to root</span>
                </div>
            </div>

            <div className="senses-section">
                <div className="senses-header">
                    <h4>Senses</h4>
                    <button onClick={addSense} className="btn-add-sm"><Plus size={14} /> Add Sense</button>
                </div>
                {(data.senses || []).length === 0 && (
                    <p className="senses-empty">No senses defined. Add at least one sense.</p>
                )}
                {(data.senses || []).map((sense, i) => (
                    <SenseEditor key={sense.id || i} sense={sense} index={i} onUpdate={(s) => updateSense(i, s)} onDelete={() => deleteSense(i)} />
                ))}
            </div>

            <div className="particle-editor-actions">
                <button onClick={onCancel} className="btn-secondary">Cancel</button>
                <button onClick={() => onSave(data)} className="btn-primary" disabled={!data.surface || data.senses?.length === 0}>
                    <Save size={14} /> Save Particle
                </button>
            </div>
        </div>
    );
}

// ── Composite Particle Editor ──
function CompositeParticleEditor({ composite, particleDatabase, compositeParticles, allowRecursive, onSave, onCancel }) {
    const [data, setData] = useState(() => composite || {
        id: `cptcl-${Date.now()}`, surface: '', ipa: '', components: [], meaning: '', gloss: '', tags: [], position: 'standalone',
    });

    const componentOptions = useMemo(() => {
        const opts = (particleDatabase || []).map(p => ({
            id: p.id, surface: p.surface, type: 'primitive', meaning: p.senses?.[0]?.meaning || '',
        }));
        if (allowRecursive) {
            (compositeParticles || []).forEach(c => {
                if (c.id !== data.id) { // prevent self-reference
                    opts.push({ id: c.id, surface: c.surface, type: 'composite', meaning: c.meaning || '' });
                }
            });
        }
        return opts;
    }, [particleDatabase, compositeParticles, allowRecursive, data.id]);

    const addComponent = () => {
        setData(prev => ({ ...prev, components: [...(prev.components || []), ''] }));
    };

    const updateComponent = (index, value) => {
        setData(prev => ({
            ...prev,
            components: prev.components.map((c, i) => i === index ? value : c),
        }));
    };

    const removeComponent = (index) => {
        setData(prev => ({
            ...prev,
            components: prev.components.filter((_, i) => i !== index),
        }));
    };

    const moveComponent = (index, dir) => {
        const newIdx = index + dir;
        if (newIdx < 0 || newIdx >= data.components.length) return;
        setData(prev => {
            const arr = [...prev.components];
            [arr[index], arr[newIdx]] = [arr[newIdx], arr[index]];
            return { ...prev, components: arr };
        });
    };

    const compositionDepth = useMemo(() => {
        if (!data.components || data.components.length === 0) return 0;
        let maxD = 0;
        for (const compId of data.components) {
            const isComposite = (compositeParticles || []).some(c => c.id === compId);
            if (isComposite) {
                maxD = Math.max(maxD, 1);
            }
        }
        return maxD;
    }, [data.components, compositeParticles]);

    return (
        <div className="particle-editor composite-editor">
            <div className="particle-editor-header">
                <h3>{composite ? 'Edit Composite' : 'New Composite'}</h3>
                <button onClick={onCancel} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="particle-editor-fields">
                <div className="pe-field">
                    <label>Surface:</label>
                    <input type="text" value={data.surface} onChange={(e) => setData(prev => ({ ...prev, surface: e.target.value }))} placeholder="e.g. vo" className="custom-font-text notranslate" />
                </div>
                <div className="pe-field">
                    <label>IPA:</label>
                    <input type="text" value={data.ipa} onChange={(e) => setData(prev => ({ ...prev, ipa: e.target.value }))} placeholder="e.g. vo" />
                </div>
                <div className="pe-field">
                    <label>Position:</label>
                    <select value={data.position} onChange={(e) => setData(prev => ({ ...prev, position: e.target.value }))}>
                        <option value="standalone">Standalone</option>
                        <option value="prefix">Prefix</option>
                        <option value="suffix">Suffix</option>
                    </select>
                </div>
            </div>

            <div className="senses-section">
                <h4>Components (in order)</h4>
                <p className="pe-hint">{allowRecursive ? 'Primitives and other composites available.' : 'Only primitive particles allowed.'} Depth: {compositionDepth}</p>
                {(data.components || []).map((compId, i) => (
                    <div key={i} className="component-row">
                        <select value={compId} onChange={(e) => updateComponent(i, e.target.value)}>
                            <option value="">— select —</option>
                            {componentOptions.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.type === 'composite' ? '◇ ' : '◆ '}{opt.surface} — {opt.meaning}
                                </option>
                            ))}
                        </select>
                        <button onClick={() => moveComponent(i, -1)} disabled={i === 0}>↑</button>
                        <button onClick={() => moveComponent(i, 1)} disabled={i === data.components.length - 1}>↓</button>
                        <button onClick={() => removeComponent(i)}><Trash2 size={14} /></button>
                    </div>
                ))}
                <button onClick={addComponent} className="btn-add-sm"><Plus size={14} /> Add Component</button>
            </div>

            <div className="particle-editor-fields" style={{ marginTop: '1rem' }}>
                <div className="pe-field">
                    <label>Meaning:</label>
                    <input type="text" value={data.meaning} onChange={(e) => setData(prev => ({ ...prev, meaning: e.target.value }))} placeholder="e.g. showering" />
                </div>
                <div className="pe-field">
                    <label>Gloss:</label>
                    <input type="text" value={data.gloss} onChange={(e) => setData(prev => ({ ...prev, gloss: e.target.value }))} placeholder="e.g. SHOWER" />
                </div>
                <div className="pe-field">
                    <label>Tags:</label>
                    <input type="text" value={data.tags?.join(', ') || ''} onChange={(e) => setData(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="action, water" />
                </div>
            </div>

            <div className="particle-editor-actions">
                <button onClick={onCancel} className="btn-secondary">Cancel</button>
                <button onClick={() => onSave(data)} className="btn-primary" disabled={!data.surface || data.components?.length === 0 || data.components?.some(c => !c)}>
                    <Save size={14} /> Save Composite
                </button>
            </div>
        </div>
    );
}

// ── Live Preview ──
function ParticlePreview({ particleDatabase, compositeParticles, lexicon, allowRecursive }) {
    const [input, setInput] = useState('');
    const [resolved, setResolved] = useState([]);

    const handleResolve = (text) => {
        setInput(text);
        if (!text.trim() || !particleDatabase?.length) {
            setResolved([]);
            return;
        }
        const tokens = text.split(/\s+/).map(t => ({ token: t }));
        const result = resolveParticleSenses(tokens, particleDatabase, compositeParticles, lexicon, allowRecursive);
        setResolved(result);
    };

    const glossLine = useMemo(() => {
        if (resolved.length === 0) return null;
        return generateGlossLine(resolved);
    }, [resolved]);

    return (
        <div className="particle-preview">
            <h4><Play size={16} /> Live Preview</h4>
            <input
                type="text"
                value={input}
                onChange={(e) => handleResolve(e.target.value)}
                placeholder="Type a sentence to test particles..."
                className="preview-input"
            />
            {resolved.length > 0 && (
                <div className="preview-output">
                    <div className="preview-tokens">
                        {resolved.map((t, i) => (
                            <span key={i} className={`preview-token preview-${t.type}`}>
                                <span className="preview-surface">{t.token}</span>
                                {t.type === 'particle' && t.resolvedSense && (
                                    <span className="preview-gloss">{t.resolvedSense.gloss}</span>
                                )}
                                {t.type === 'composite' && t.composite && (
                                    <>
                                        <span className="preview-gloss">{t.composite.gloss}</span>
                                        <span className="preview-breakdown">
                                            {(t.composite.components || []).map((compId, j) => {
                                                const p = particleDatabase.find(p => p.id === compId);
                                                const cp = compositeParticles.find(c => c.id === compId);
                                                const label = p ? (p.gloss || p.surface) : cp ? (cp.gloss || cp.surface) : '?';
                                                return (
                                                    <React.Fragment key={j}>
                                                        {j > 0 && <span className="bd-plus">+</span>}
                                                        <span className="bd-part">{label}</span>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </span>
                                    </>
                                )}
                            </span>
                        ))}
                    </div>
                    {glossLine && (
                        <div className="preview-gloss-line">
                            <code>{glossLine.gloss}</code>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Particle Tab ──
export default function ParticleTab() {
    const particleDatabase = useConfigStore((state) => state.particleDatabase) || [];
    const compositeParticles = useConfigStore((state) => state.compositeParticles) || [];
    const allowRecursive = useConfigStore((state) => state.allowRecursiveComposites) || false;
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];

    const [editingParticle, setEditingParticle] = useState(null);
    const [editingComposite, setEditingComposite] = useState(null);
    const [showNewParticle, setShowNewParticle] = useState(false);
    const [showNewComposite, setShowNewComposite] = useState(false);
    const [expandedParticle, setExpandedParticle] = useState(null);
    const [expandedComposite, setExpandedComposite] = useState(null);

    // ── Particle CRUD ──
    const saveParticle = (particle) => {
        const exists = particleDatabase.findIndex(p => p.id === particle.id);
        if (exists >= 0) {
            updateConfig({ particleDatabase: particleDatabase.map(p => p.id === particle.id ? particle : p) });
        } else {
            updateConfig({ particleDatabase: [...particleDatabase, particle] });
        }
        setEditingParticle(null);
        setShowNewParticle(false);
    };

    const deleteParticle = (id) => {
        updateConfig({ particleDatabase: particleDatabase.filter(p => p.id !== id) });
    };

    // ── Composite CRUD ──
    const saveComposite = (composite) => {
        const exists = compositeParticles.findIndex(c => c.id === composite.id);
        if (exists >= 0) {
            updateConfig({ compositeParticles: compositeParticles.map(c => c.id === composite.id ? composite : c) });
        } else {
            updateConfig({ compositeParticles: [...compositeParticles, composite] });
        }
        setEditingComposite(null);
        setShowNewComposite(false);
    };

    const deleteComposite = (id) => {
        updateConfig({ compositeParticles: compositeParticles.filter(c => c.id !== id) });
    };

    // ── Render ──
    const isEditingPrimitive = editingParticle || showNewParticle;
    const isEditingComposite = editingComposite || showNewComposite;

    return (
        <div className="particle-tab-container">
            <Card>
                <h2 className="flex sg-title"><Atom /> Particle Database</h2>
                <Infobox title="Particle System Guide">
                    Particles are functional words whose meaning changes based on grammatical context.
                    <br /><br />
                    • <b>Context-dependent senses:</b> A particle like <code>-wi</code> can mean "accusative" after a noun but "progressive" after a verb.<br />
                    • <b>Composites:</b> Combine particles into new particles with emergent meanings (e.g., water + falling + purpose = showering).<br />
                    • <b>Recursive composites:</b> When enabled, composites can be built from other composites for deeper semantics.
                </Infobox>

                {/* Settings toggle */}
                <div className="particle-settings">
                    <label className="particle-toggle">
                        <input
                            type="checkbox"
                            checked={allowRecursive}
                            onChange={(e) => updateConfig({ allowRecursiveComposites: e.target.checked })}
                        />
                        <span>Allow recursive composites (composites of composites)</span>
                    </label>
                </div>
            </Card>

            <div className="particle-grid">
                {/* ── Left: Primitives ── */}
                <Card>
                    <div className="section-header">
                        <h3><Layers size={18} /> Primitive Particles ({particleDatabase.length})</h3>
                        <button onClick={() => { setShowNewParticle(true); setEditingParticle(null); }} className="btn-add">
                            <Plus size={14} /> Add Particle
                        </button>
                    </div>

                    {isEditingPrimitive && (
                        <ParticleEditor
                            particle={editingParticle}
                            onSave={saveParticle}
                            onCancel={() => { setEditingParticle(null); setShowNewParticle(false); }}
                        />
                    )}

                    {!isEditingPrimitive && particleDatabase.length === 0 && (
                        <div className="empty-state"><Layers size={32} /><p>No particles defined yet.</p></div>
                    )}

                    {!isEditingPrimitive && particleDatabase.map(p => (
                        <div key={p.id} className="particle-card" onClick={() => setExpandedParticle(expandedParticle === p.id ? null : p.id)}>
                            <div className="particle-card-header">
                                <span className="particle-surface custom-font-text notranslate">{p.surface}</span>
                                <span className="particle-meta">{p.position} • priority {p.priority}</span>
                                <span className="particle-sense-count">{p.senses?.length || 0} senses</span>
                                {expandedParticle === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                            {expandedParticle === p.id && (
                                <div className="particle-card-body" onClick={(e) => e.stopPropagation()}>
                                    {(p.senses || []).map(s => (
                                        <div key={s.id} className="sense-summary">
                                            <span className="sense-pos">{s.contextPOS === '*' ? 'any' : `after ${s.contextPOS}`}</span>
                                            <span className="sense-arrow">→</span>
                                            <span className="sense-meaning">{s.meaning}</span>
                                            <span className="sense-gloss">({s.gloss})</span>
                                        </div>
                                    ))}
                                    <div className="particle-card-actions">
                                        <button onClick={() => { setEditingParticle(p); setShowNewParticle(false); }}><Edit2 size={14} /> Edit</button>
                                        <button onClick={() => deleteParticle(p.id)} className="btn-danger"><Trash2 size={14} /> Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </Card>

                {/* ── Right: Composites ── */}
                <Card>
                    <div className="section-header">
                        <h3><GitMerge size={18} /> Composite Particles ({compositeParticles.length})</h3>
                        <button onClick={() => { setShowNewComposite(true); setEditingComposite(null); }} className="btn-add">
                            <Plus size={14} /> Add Composite
                        </button>
                    </div>

                    {isEditingComposite && (
                        <CompositeParticleEditor
                            composite={editingComposite}
                            particleDatabase={particleDatabase}
                            compositeParticles={compositeParticles}
                            allowRecursive={allowRecursive}
                            onSave={saveComposite}
                            onCancel={() => { setEditingComposite(null); setShowNewComposite(false); }}
                        />
                    )}

                    {!isEditingComposite && compositeParticles.length === 0 && (
                        <div className="empty-state"><GitMerge size={32} /><p>No composites defined yet.</p></div>
                    )}

                    {!isEditingComposite && compositeParticles.map(c => (
                        <div key={c.id} className="particle-card composite-card" onClick={() => setExpandedComposite(expandedComposite === c.id ? null : c.id)}>
                            <div className="particle-card-header">
                                <span className="particle-surface custom-font-text notranslate">{c.surface}</span>
                                <span className="particle-meta">{c.meaning}</span>
                                <span className="particle-sense-count">{c.gloss}</span>
                                {expandedComposite === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                            {expandedComposite === c.id && (
                                <div className="particle-card-body" onClick={(e) => e.stopPropagation()}>
                                    <div className="composite-chain">
                                        {(c.components || []).map((compId, i) => {
                                            const p = particleDatabase.find(p => p.id === compId);
                                            const cp = compositeParticles.find(cp => cp.id === compId);
                                            const label = p ? p.surface : cp ? cp.surface : '?';
                                            return (
                                                <React.Fragment key={i}>
                                                    {i > 0 && <span className="chain-plus">+</span>}
                                                    <span className={`chain-item ${p ? 'primitive' : 'composite'}`}>{label}</span>
                                                </React.Fragment>
                                            );
                                        })}
                                        <span className="chain-equals">=</span>
                                        <span className="chain-result">{c.surface}</span>
                                    </div>
                                    <div className="particle-card-actions">
                                        <button onClick={() => { setEditingComposite(c); setShowNewComposite(false); }}><Edit2 size={14} /> Edit</button>
                                        <button onClick={() => deleteComposite(c.id)} className="btn-danger"><Trash2 size={14} /> Delete</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </Card>
            </div>

            {/* ── Live Preview ── */}
            <Card>
                <ParticlePreview
                    particleDatabase={particleDatabase}
                    compositeParticles={compositeParticles}
                    lexicon={lexicon}
                    allowRecursive={allowRecursive}
                />
            </Card>
        </div>
    );
}
