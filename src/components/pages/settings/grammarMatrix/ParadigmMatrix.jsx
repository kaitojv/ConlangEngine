import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../../store/useLexiconStore.jsx';
import { applyRuleToWord } from '../../../../utils/morphologyEngine.jsx';
import { Play, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import './paradigmMatrix.css';

export default function ParadigmMatrix() {
    const rawRules = useConfigStore((state) => state.grammarRules);
    const grammarRules = useMemo(() => rawRules || [], [rawRules]);
    const vowels = useConfigStore((state) => state.vowels) || '';
    const consonants = useConfigStore((state) => state.consonants) || '';
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes) || '';
    const lexicon = useLexiconStore((state) => state.lexicon) || [];

    const [testWord, setTestWord] = useState('pata');
    const [selectedPOS, setSelectedPOS] = useState('noun');

    // Available word classes
    const posOptions = useMemo(() => {
        return ['all', 'noun', 'verb', 'adjective', 'adverb', 'pronoun'];
    }, []);

    // Filter rules relevant to this word's POS
    const relevantRules = useMemo(() => {
        return grammarRules.filter(r => {
            const applies = (r.appliesTo || 'all').toLowerCase();
            return applies === 'all' || applies.includes(selectedPOS);
        });
    }, [grammarRules, selectedPOS]);

    // Compute inflection paradigm
    const paradigmRows = useMemo(() => {
        if (!testWord.trim()) return [];

        return relevantRules.map(rule => {
            let result = applyRuleToWord(testWord.trim(), rule, grammarRules, vowels, consonants, otherPhonemes);
            const applied = Boolean(result && result !== testWord.trim());
            const failedCondition = result === null;

            return {
                id: rule.id,
                name: rule.name || 'Unnamed Rule',
                affix: rule.affix || '',
                gloss: rule.gloss || '',
                condition: rule.condition || 'always',
                targetPOS: rule.targetPOS || selectedPOS,
                result: failedCondition ? testWord.trim() : (result || testWord.trim()),
                status: failedCondition ? 'skipped' : (applied ? 'applied' : 'unchanged'),
                reason: failedCondition ? `Condition '${rule.condition}' not met` : 'Rule applied'
            };
        });
    }, [testWord, selectedPOS, relevantRules, grammarRules, vowels, consonants, otherPhonemes]);

    return (
        <div className="paradigm-matrix-wrapper">
            {/* Controls Header */}
            <div className="paradigm-tester-controls">
                <div className="paradigm-input-group">
                    <label>Test Root Word</label>
                    <input 
                        type="text"
                        className="paradigm-control-input notranslate"
                        value={testWord}
                        onChange={(e) => setTestWord(e.target.value)}
                        placeholder="e.g. pata, kalam"
                    />
                </div>

                <div className="paradigm-input-group" style={{ maxWidth: '180px' }}>
                    <label>Word Class (POS)</label>
                    <select 
                        className="paradigm-control-select"
                        value={selectedPOS}
                        onChange={(e) => setSelectedPOS(e.target.value)}
                    >
                        {posOptions.map(pos => (
                            <option key={pos} value={pos}>{pos.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                {lexicon.length > 0 && (
                    <div className="paradigm-input-group" style={{ maxWidth: '220px' }}>
                        <label>Pick from Dictionary</label>
                        <select 
                            className="paradigm-control-select notranslate"
                            onChange={(e) => {
                                const selected = lexicon.find(w => w.id === e.target.value);
                                if (selected) {
                                    setTestWord(selected.conlangWord || '');
                                    if (selected.wordClass) {
                                        const cleanPOS = selected.wordClass.split(',')[0].trim().toLowerCase();
                                        if (posOptions.includes(cleanPOS)) {
                                            setSelectedPOS(cleanPOS);
                                        }
                                    }
                                }
                            }}
                            defaultValue=""
                        >
                            <option value="" disabled>Select word...</option>
                            {lexicon.slice(0, 30).map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.conlangWord} ({w.englishWord})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Paradigm Results Table */}
            <div className="paradigm-table-container">
                {paradigmRows.length === 0 ? (
                    <div className="paradigm-empty-state">
                        <Layers size={40} opacity={0.4} />
                        <h4>No Rules Match "{selectedPOS.toUpperCase()}"</h4>
                        <p>There are no grammatical rules that apply to this word class. Switch the word class or add rules in the Morphology tab.</p>
                    </div>
                ) : (
                    <table className="paradigm-table">
                        <thead>
                            <tr>
                                <th>Rule</th>
                                <th>Affix / Formula</th>
                                <th>Gloss</th>
                                <th>Base Root</th>
                                <th>Inflected Form</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paradigmRows.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        <div className="paradigm-rule-name-cell">
                                            <span>{row.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{ color: 'var(--acc2)' }}>{row.affix}</code>
                                    </td>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--tx2)' }}>
                                            {row.gloss || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="notranslate" style={{ color: 'var(--tx2)' }}>
                                            {testWord}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="paradigm-result-cell notranslate">
                                            {row.result}
                                        </span>
                                    </td>
                                    <td>
                                        {row.status === 'applied' ? (
                                            <span className="paradigm-status-badge paradigm-status-applied">
                                                <CheckCircle2 size={12} /> Applied
                                            </span>
                                        ) : row.status === 'skipped' ? (
                                            <span className="paradigm-status-badge paradigm-status-skipped" title={row.reason}>
                                                <AlertCircle size={12} /> Skipped
                                            </span>
                                        ) : (
                                            <span className="paradigm-status-badge" style={{ background: 'var(--s1)', color: 'var(--tx3)' }}>
                                                Unchanged
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
