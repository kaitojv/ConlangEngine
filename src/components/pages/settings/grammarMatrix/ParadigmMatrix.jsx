// src/components/pages/settings/grammarMatrix/ParadigmMatrix.jsx
import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../../store/useLexiconStore.jsx';
import {
    generateFullParadigm,
    paradigmToMarkdown,
    paradigmToTSV,
    paradigmToLaTeX
} from '../../../../utils/paradigmGenerator.js';
import { CheckCircle2, AlertCircle, Layers, Grid, List, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './paradigmMatrix.css';

export default function ParadigmMatrix() {
    const config = useConfigStore();
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);

    const [testWord, setTestWord] = useState('pata');
    const [selectedPOS, setSelectedPOS] = useState('noun');
    const [viewMode, setViewMode] = useState('matrix'); // 'matrix' | 'table'
    const [copyState, setCopyState] = useState(''); // 'md' | 'tsv' | 'latex' | ''

    // Available word classes
    const posOptions = useMemo(() => {
        return ['all', 'noun', 'verb', 'adjective', 'adverb', 'pronoun'];
    }, []);

    // Generate comprehensive paradigm
    const paradigmData = useMemo(() => {
        if (!testWord.trim()) return null;
        return generateFullParadigm(testWord.trim(), config, {
            wordClass: selectedPOS,
            conjugationMode: 'affix'
        });
    }, [testWord, selectedPOS, config]);

    const handleCopyExport = async (format) => {
        if (!paradigmData || !paradigmData.matrix || paradigmData.matrix.columns.length === 0) {
            return toast.error("No paradigm data to export.");
        }

        let text = '';
        if (format === 'md') text = paradigmToMarkdown(paradigmData);
        else if (format === 'tsv') text = paradigmToTSV(paradigmData);
        else if (format === 'latex') text = paradigmToLaTeX(paradigmData);

        try {
            await navigator.clipboard.writeText(text);
            setCopyState(format);
            toast.success(`Copied paradigm table as ${format.toUpperCase()}!`);
            setTimeout(() => setCopyState(''), 2000);
        } catch {
            toast.error("Failed to copy to clipboard.");
        }
    };

    const hasData = Boolean(paradigmData && paradigmData.rows && paradigmData.rows.length > 0);

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
                    <div className="paradigm-input-group" style={{ maxWidth: '240px' }}>
                        <label>Pick from Dictionary</label>
                        <select 
                            className="paradigm-control-select notranslate"
                            onChange={(e) => {
                                const selected = lexicon.find(w => w.id === e.target.value);
                                if (selected) {
                                    setTestWord(selected.word || selected.conlangWord || '');
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
                            <option value="" disabled>Select word ({lexicon.length} available)...</option>
                            {lexicon.slice(0, 50).map(w => (
                                <option key={w.id} value={w.id}>
                                    {(w.word || w.conlangWord || '').replace(/\*/g, '')} ({w.translation || w.englishWord || ''})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Toolbar: View Switcher & Exporters */}
            <div className="paradigm-toolbar-bar">
                <div className="paradigm-mode-pills">
                    <button
                        type="button"
                        className={`paradigm-mode-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                        onClick={() => setViewMode('matrix')}
                    >
                        <Grid size={14} /> 2D Paradigm Matrix
                    </button>
                    <button
                        type="button"
                        className={`paradigm-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                    >
                        <List size={14} /> Flat Rule Table
                    </button>
                </div>

                {hasData && (
                    <div className="paradigm-export-group">
                        <button
                            type="button"
                            className="paradigm-export-btn"
                            onClick={() => handleCopyExport('md')}
                            title="Copy Markdown Table for GitHub, Obsidian, Discord"
                        >
                            {copyState === 'md' ? <Check size={13} /> : <Copy size={13} />}
                            Markdown Table
                        </button>
                        <button
                            type="button"
                            className="paradigm-export-btn"
                            onClick={() => handleCopyExport('tsv')}
                            title="Copy TSV for Excel or Google Sheets"
                        >
                            {copyState === 'tsv' ? <Check size={13} /> : <Copy size={13} />}
                            TSV
                        </button>
                        <button
                            type="button"
                            className="paradigm-export-btn"
                            onClick={() => handleCopyExport('latex')}
                            title="Copy LaTeX booktabs table"
                        >
                            {copyState === 'latex' ? <Check size={13} /> : <Copy size={13} />}
                            LaTeX
                        </button>
                    </div>
                )}
            </div>

            {/* Paradigm Results */}
            <div className="paradigm-table-container">
                {!hasData ? (
                    <div className="paradigm-empty-state">
                        <Layers size={40} opacity={0.4} />
                        <h4>No Rules Match "{selectedPOS.toUpperCase()}"</h4>
                        <p>There are no grammatical rules that apply to this word class. Switch the word class or add rules in the Morphology tab.</p>
                    </div>
                ) : viewMode === 'matrix' ? (
                    /* 2D PARADIGM MATRIX */
                    <table className="paradigm-table paradigm-matrix-table">
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Person / Form</th>
                                {paradigmData.matrix.columns.map(col => (
                                    <th key={col.id}>
                                        {col.name}
                                        {col.gloss && <span className="paradigm-dim-badge">{col.gloss}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paradigmData.matrix.rows.map(row => (
                                <tr key={row.rowLabel}>
                                    <td className="row-header notranslate">
                                        {row.rowLabel}
                                    </td>
                                    {paradigmData.matrix.columns.map(col => (
                                        <td key={col.id} className="paradigm-matrix-cell notranslate">
                                            {row.cells[col.id] || '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    /* FLAT DETAILED TABLE */
                    <table className="paradigm-table">
                        <thead>
                            <tr>
                                <th>Rule</th>
                                <th>Dimension</th>
                                <th>Affix / Formula</th>
                                <th>Gloss</th>
                                <th>Base Root</th>
                                <th>Inflected Form</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paradigmData.rows.map((row, idx) => (
                                <tr key={`${row.ruleId}-${row.person}-${idx}`}>
                                    <td>
                                        <div className="paradigm-rule-name-cell">
                                            <span>{row.ruleName}</span>
                                            {row.person !== 'BASE' && <small style={{ opacity: 0.7 }}>({row.person})</small>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="paradigm-dim-badge">{row.dimension}</span>
                                    </td>
                                    <td>
                                        <code style={{ color: 'var(--acc2)' }}>{row.affix || '—'}</code>
                                    </td>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--tx2)' }}>
                                            {row.gloss || '-'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="notranslate" style={{ color: 'var(--tx2)' }}>
                                            {row.baseWord}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="paradigm-result-cell notranslate">
                                            {row.inflectedForm}
                                        </span>
                                    </td>
                                    <td>
                                        {row.isModified ? (
                                            <span className="paradigm-status-badge paradigm-status-applied">
                                                <CheckCircle2 size={12} /> Applied
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
