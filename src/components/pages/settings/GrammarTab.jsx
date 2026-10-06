import React, { useState, useMemo } from 'react';
import Card from '../../UI/Card/Card.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import ParadigmMatrix from './grammarMatrix/ParadigmMatrix.jsx';
import {
    Layers,
    TextAlignStart,
    Play,
    BookOpen,
    ArrowRight,
    Sliders,
    Link2,
    Code2,
    Sparkles,
    Check
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import './grammartab.css';

export default function GrammarTab() {
    const [subTab, setSubTab] = useState('morphology');

    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';
    const adjectivePlacement = useConfigStore((state) => state.adjectivePlacement) || 'pre-nominal';
    const adjectiveAgreement = useConfigStore((state) => state.adjectiveAgreement) || false;
    const verbMarker = useConfigStore((state) => state.verbMarker) || '';
    const cliticsRules = useConfigStore((state) => state.cliticsRules) || '';
    const rawWaConfig = useConfigStore((state) => state.wordAssistConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const waConfig = useMemo(() => rawWaConfig || {}, [rawWaConfig]);

    // Compute constituent order pills for visual diagram
    const orderPills = useMemo(() => {
        const letters = (syntaxOrder || 'SVO').toUpperCase().split('');
        const map = {
            'S': { label: 'Subject', className: 'subject' },
            'V': { label: 'Verb', className: 'verb' },
            'O': { label: 'Object', className: 'object' },
            'A': { label: 'Adverb', className: 'adverb' }
        };
        return letters.map((char) => map[char] || { label: char, className: 'subject' });
    }, [syntaxOrder]);

    return (
        <div className="grammar-tab-container">
            {/* Sub-Navigation Header matching config-subnav */}
            <nav className="grammar-subnav" aria-label="Grammar Sections">
                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'morphology' ? 'active' : ''}`}
                    onClick={() => setSubTab('morphology')}
                >
                    <Layers size={16} />
                    <span>Morphology & Rules</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'syntax' ? 'active' : ''}`}
                    onClick={() => setSubTab('syntax')}
                >
                    <TextAlignStart size={16} />
                    <span>Syntax & Word Order</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'paradigm' ? 'active' : ''}`}
                    onClick={() => setSubTab('paradigm')}
                >
                    <Play size={16} />
                    <span>Paradigm Tester</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'reference' ? 'active' : ''}`}
                    onClick={() => setSubTab('reference')}
                >
                    <BookOpen size={16} />
                    <span>Linguistic Reference</span>
                </button>
            </nav>

            {/* TAB 1: MORPHOLOGY & RULES */}
            {subTab === 'morphology' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <Layers /> Grammatical Rules & Inflections
                        </h2>
                        <p className="settings-description">
                            Define prefixes, suffixes, infixes, and phonological stem mutations for word classes and roots.
                        </p>
                        <RulesManager />
                    </Card>
                </div>
            )}

            {/* TAB 2: SYNTAX & WORD ORDER */}
            {subTab === 'syntax' && (
                <div className="grammar-tab-content">
                    {/* Word Order Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Sliders /> Constituent Word Order
                        </h2>
                        <p className="settings-description">
                            Sets the canonical ordering of primary arguments (Subject, Verb, Object) for translation and parsing engines.
                        </p>

                        <div className="word-order-diagram">
                            {orderPills.map((pill, idx) => (
                                <React.Fragment key={idx}>
                                    <div className={`word-order-pill ${pill.className}`}>
                                        <span>{pill.label}</span>
                                    </div>
                                    {idx < orderPills.length - 1 && (
                                        <span className="word-order-arrow">
                                            <ArrowRight size={18} />
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="input-wrapper">
                            <label className="form-label" htmlFor="syntax-order-select">Word Order Pattern</label>
                            <select
                                id="syntax-order-select"
                                className="fi custom-select"
                                value={syntaxOrder}
                                onChange={(e) => updateConfig({ syntaxOrder: e.target.value })}
                            >
                                <option value="SVO">SVO - Subject Verb Object (e.g. English, Mandarin)</option>
                                <option value="SOV">SOV - Subject Object Verb (e.g. Japanese, Turkish)</option>
                                <option value="VSO">VSO - Verb Subject Object (e.g. Arabic, Irish)</option>
                                <option value="VOS">VOS - Verb Object Subject (e.g. Malagasy, Fijian)</option>
                                <option value="OVS">OVS - Object Verb Subject (e.g. Hixkaryana, Klingon)</option>
                                <option value="OSV">OSV - Object Subject Verb (e.g. Xavante)</option>
                                <option value="OVA">OVA - Object Verb Adverb</option>
                            </select>
                        </div>
                    </Card>

                    {/* Modifiers & Agreement Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Sparkles /> Nominal Modifiers & Agreement
                        </h2>
                        <p className="settings-description">
                            Controls the placement of adjectives relative to the nouns they modify, and inflection agreement rules.
                        </p>

                        <div className="syntax-options-grid">
                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="adjective-placement-select">Adjective Placement</label>
                                <select
                                    id="adjective-placement-select"
                                    className="fi custom-select"
                                    value={adjectivePlacement}
                                    onChange={(e) => updateConfig({ adjectivePlacement: e.target.value })}
                                >
                                    <option value="pre-nominal">Pre-nominal (e.g. Big dog)</option>
                                    <option value="post-nominal">Post-nominal (e.g. Dog big)</option>
                                </select>
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label">Agreement Rules</label>
                                <label className="syntax-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={adjectiveAgreement}
                                        onChange={(e) => updateConfig({ adjectiveAgreement: e.target.checked })}
                                    />
                                    <span>Adjectives copy noun affixes (Case / Number)</span>
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Markers, Clitics & Copula Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Link2 /> Markers, Clitics & Copula
                        </h2>
                        <p className="settings-description">
                            Configure bound particles, base verb forms for lexeme detection, and zero-copula handling.
                        </p>

                        <div className="syntax-options-grid">
                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="verb-marker-input">Verb Base Marker(s)</label>
                                <input
                                    id="verb-marker-input"
                                    type="text"
                                    className="fi"
                                    value={verbMarker}
                                    placeholder="e.g. -r, -ar, -en (comma separated)"
                                    onChange={(e) => updateConfig({ verbMarker: e.target.value })}
                                />
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="clitics-input">Clitics</label>
                                <input
                                    id="clitics-input"
                                    type="text"
                                    className="fi"
                                    value={cliticsRules}
                                    placeholder="e.g. s, ll, ne (comma separated)"
                                    onChange={(e) => updateConfig({ cliticsRules: e.target.value })}
                                />
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="copula-select">Copula (To Be) Behavior</label>
                                <select
                                    id="copula-select"
                                    className="fi custom-select"
                                    value={
                                        waConfig.copulaBehavior === 'replace' ||
                                        waConfig.copulaBehavior === 'both' ||
                                        waConfig.copulaBehavior === 'omit'
                                            ? 'zero_copula'
                                            : (waConfig.copulaBehavior || 'normal')
                                    }
                                    onChange={(e) =>
                                        updateConfig({
                                            wordAssistConfig: { ...waConfig, copulaBehavior: e.target.value }
                                        })
                                    }
                                >
                                    <option value="normal">Normal (Parse as verb / modal)</option>
                                    <option value="zero_copula">Enable Zero Copula</option>
                                </select>
                            </div>

                            {waConfig.copulaBehavior === 'zero_copula' && (
                                <div className="input-wrapper">
                                    <label className="form-label" htmlFor="copula-replacement-input">Copula Replacement Marker</label>
                                    <input
                                        id="copula-replacement-input"
                                        type="text"
                                        className="fi"
                                        value={waConfig.copulaReplacement || ''}
                                        placeholder="e.g. vu"
                                        onChange={(e) =>
                                            updateConfig({
                                                wordAssistConfig: { ...waConfig, copulaReplacement: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: PARADIGM TESTER */}
            {subTab === 'paradigm' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <Play /> Paradigm Matrix & Inflection Tester
                        </h2>
                        <p className="settings-description">
                            Test all inflectional rules and sandhi mutations live against any root word or lexicon entry.
                        </p>
                        <ParadigmMatrix />
                    </Card>
                </div>
            )}

            {/* TAB 4: LINGUISTIC REFERENCE */}
            {subTab === 'reference' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <BookOpen /> Linguistic Formula Reference & Guide
                        </h2>
                        <p className="settings-description">
                            Quick reference for affix notation, regex stem mutations, phonological environments, and rule chaining.
                        </p>

                        <div className="reference-cards-grid">
                            {/* Card 1: Affixes */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Code2 size={18} />
                                    <h4 className="reference-card-title">Affix Position Notation</h4>
                                </div>
                                <p className="reference-card-body">
                                    Affixes attach to word boundaries or target phonological slots based on the hyphen position:
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Suffix:</span>
                                        <code>-s</code> or <code>-ed</code> (attaches to end)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Prefix:</span>
                                        <code>ir-</code> or <code>un-</code> (attaches to start)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Infix:</span>
                                        <code>-ma-@V</code> (inserts before first vowel)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Infix:</span>
                                        <code>-n-@C</code> (inserts after first consonant)
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Stem Mutations */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Sparkles size={18} />
                                    <h4 className="reference-card-title">Stem Mutations & Formulas</h4>
                                </div>
                                <p className="reference-card-body">
                                    Use the <code>=&gt;</code> transformation operator to alter internal letters or endings:
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Ablaut:</span>
                                        <code>i =&gt; a</code> (e.g. sing &rarr; sang)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Truncate:</span>
                                        <code>um$ =&gt; i</code> (turns <i>kum</i> into <i>ki</i>)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Assimilation:</span>
                                        <code>n(?=[pb]) =&gt; m</code> (sandhi before labials)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Reduplication:</span>
                                        <code>^(.&#123;2&#125;)(.*) =&gt; $1$1$2</code>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Rule Chaining */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Link2 size={18} />
                                    <h4 className="reference-card-title">Rule Chaining & Dependencies</h4>
                                </div>
                                <p className="reference-card-body">
                                    Rules can execute sequentially in an ordered pipeline using the <b>Depends on</b> field:
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Specific:</span>
                                        <code>Depends on: plural</code> (runs after plural)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Wildcard:</span>
                                        <code>*suffix</code> (runs after any suffix rule)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Wildcard:</span>
                                        <code>*prefix</code> (runs after any prefix rule)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Universal:</span>
                                        <code>*affix</code> (runs after all morphology)
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Constraints & POS */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Check size={18} />
                                    <h4 className="reference-card-title">Target Constraints & Shifts</h4>
                                </div>
                                <p className="reference-card-body">
                                    Filter which words receive the rule and update their grammatical classification:
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Applies To:</span>
                                        Restricts execution to specific parts of speech
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Target POS:</span>
                                        Converts lexeme class (e.g. Verb &rarr; Noun derivation)
                                    </div>
                                    <div className="reference-example-line">
                                        <span className="reference-example-label">Standalone:</span>
                                        Rule conjugates independently without requiring root inflections
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
