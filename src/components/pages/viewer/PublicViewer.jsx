import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient.js';
import { BookOpen, Globe, User, Search, Layers, PenTool, ChevronDown, Volume2, Type, Hash, AlignLeft, BrainCircuit } from 'lucide-react';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import { usePublicThemeInjector, usePublicFontInjector } from '../../../hooks/usePublicInjectors.jsx';
import PublicFlashcards from './PublicFlashcards.jsx';
import './publicViewer.css';

export default function PublicViewer() {
    const { projectId } = useParams();
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);

    // Fetch the project from Supabase using the project_id
    useEffect(() => {
        const fetchProject = async () => {
            try {
                setLoading(true);
                const { data, error: fetchError } = await supabase
                    .from('conlang_snapshots')
                    .select('project_data')
                    .eq('project_id', projectId)
                    .single();

                if (fetchError) throw fetchError;
                if (!data || !data.project_data) throw new Error('Project not found');

                setProjectData(data.project_data);
            } catch (err) {
                console.error('Failed to load shared project:', err);
                setError(err.message || 'Failed to load project');
            } finally {
                setLoading(false);
            }
        };

        if (projectId) fetchProject();
    }, [projectId]);

    // Extract data from the fetched project
    const config = projectData?.config || {};
    const dictionary = projectData?.dictionary || [];
    const grammarRules = config.grammarRules || [];

    // Safely inject aesthetics for this viewer only
    usePublicThemeInjector(config);
    usePublicFontInjector(config);

    // Filter + sort dictionary for the search
    const filteredDictionary = useMemo(() => {
        if (!searchQuery.trim()) return dictionary;
        const q = searchQuery.toLowerCase();
        return dictionary.filter(entry =>
            entry.word?.toLowerCase().includes(q) ||
            entry.translation?.toLowerCase().includes(q) ||
            entry.wordClass?.toLowerCase().includes(q) ||
            entry.tags?.some(t => t.toLowerCase().includes(q))
        );
    }, [dictionary, searchQuery]);

    const visibleDictionary = filteredDictionary.slice(0, visibleCount);

    // Stats
    const wordCount = dictionary.length;
    const ruleCount = grammarRules.length;
    const uniqueClasses = useMemo(() => new Set(dictionary.map(w => w.wordClass).filter(Boolean)).size, [dictionary]);
    const uniqueTags = useMemo(() => new Set(dictionary.flatMap(w => w.tags || [])).size, [dictionary]);

    // Writing direction info
    const directionLabel = {
        'ltr': 'Left to Right',
        'rtl': 'Right to Left',
        'vertical-rl': 'Vertical (↓→)',
        'vertical-lr': 'Vertical (↓←)'
    }[config.writingDirection] || 'Left to Right';

    const phonoTypeLabel = {
        'alphabetic': 'Alphabetic',
        'syllabic': 'Syllabic',
        'logographic': 'Logographic'
    }[config.phonologyTypes] || 'Alphabetic';

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="pv-page">
                <div className="pv-loading">
                    <div className="pv-loading-spinner" />
                    <p style={{ color: '#94a3b8' }}>Loading conlang...</p>
                </div>
            </div>
        );
    }

    // --- ERROR STATE ---
    if (error || !projectData) {
        return (
            <div className="pv-page">
                <div className="pv-error">
                    <div className="pv-error-code">404</div>
                    <p className="pv-error-msg">
                        {error === 'JSON object requested, multiple (or no) rows returned'
                            ? "This conlang doesn't exist or hasn't been shared yet."
                            : `Could not load this conlang. ${error || ''}`
                        }
                    </p>
                    <Link to="/" className="pv-error-link">← Go to Conlang Engine</Link>
                </div>
            </div>
        );
    }

    // --- MAIN VIEW ---
    return (
        <div className="pv-page">

            {/* ===== HERO HEADER ===== */}
            <header className="pv-hero">
                <div className="pv-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ color: 'var(--acc)' }}>
                            {getConlangIcon(config.conlangIcon, 40)}
                        </div>
                        <h1 className="pv-lang-name" style={{ margin: 0 }}>{config.conlangName || 'Untitled Conlang'}</h1>
                    </div>
                    <div className="pv-author">
                        <User size={14} />
                        <span>Created by {config.authorName || 'Anonymous'}</span>
                    </div>
                    {config.description && config.description !== 'A brief description of your conlang.' && (
                        <p className="pv-description">{config.description}</p>
                    )}
                    <div className="pv-badges">
                        <span className="pv-badge"><Globe size={12} /> {directionLabel}</span>
                        <span className="pv-badge"><PenTool size={12} /> {phonoTypeLabel}</span>
                        {config.syntaxOrder && <span className="pv-badge"><Layers size={12} /> {config.syntaxOrder}</span>}
                    </div>
                </div>
            </header>

            {/* ===== STATS BAR ===== */}
            <div className="pv-stats">
                <div className="pv-stat">
                    <div className="pv-stat-value">{wordCount}</div>
                    <div className="pv-stat-label">Words</div>
                </div>
                <div className="pv-stat">
                    <div className="pv-stat-value">{ruleCount}</div>
                    <div className="pv-stat-label">Grammar Rules</div>
                </div>
                <div className="pv-stat">
                    <div className="pv-stat-value">{uniqueClasses}</div>
                    <div className="pv-stat-label">Parts of Speech</div>
                </div>
                <div className="pv-stat">
                    <div className="pv-stat-value">{uniqueTags}</div>
                    <div className="pv-stat-label">Semantic Tags</div>
                </div>
            </div>

            {/* ===== CONTENT ===== */}
            <div className="pv-content">

                {/* PHONOLOGY */}
                {(config.consonants || config.vowels || config.syllablePattern) && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Volume2 size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Phonology</h2>
                        </div>
                        <div className="pv-section-body">
                            <div className="pv-phono-grid">
                                {config.consonants && (
                                    <div className="pv-phono-item">
                                        <div className="pv-phono-label">Consonants</div>
                                        <div className="pv-phono-value">{config.consonants}</div>
                                    </div>
                                )}
                                {config.vowels && (
                                    <div className="pv-phono-item">
                                        <div className="pv-phono-label">Vowels</div>
                                        <div className="pv-phono-value">{config.vowels}</div>
                                    </div>
                                )}
                                {config.syllablePattern && (
                                    <div className="pv-phono-item">
                                        <div className="pv-phono-label">Syllable Pattern</div>
                                        <div className="pv-phono-value">{config.syllablePattern}</div>
                                    </div>
                                )}
                                {config.verbMarker && (
                                    <div className="pv-phono-item">
                                        <div className="pv-phono-label">Verb Marker</div>
                                        <div className="pv-phono-value">{config.verbMarker}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* DICTIONARY */}
                <section className="pv-section">
                    <div className="pv-section-header">
                        <BookOpen size={20} className="pv-section-icon" />
                        <h2 className="pv-section-title">Dictionary</h2>
                    </div>
                    <div className="pv-section-body">
                        {dictionary.length === 0 ? (
                            <div className="pv-empty">No words in this dictionary yet.</div>
                        ) : (
                            <>
                                <div className="pv-dict-search">
                                    <Search size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                                    <input
                                        type="text"
                                        placeholder="Search words, translations, or tags..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(50); }}
                                    />
                                </div>
                                <div className="pv-dict-count">
                                    Showing {Math.min(visibleCount, filteredDictionary.length)} of {filteredDictionary.length} entries
                                </div>
                                <div className="pv-dict-scroll">
                                    <table className="pv-dict-table">
                                        <thead>
                                            <tr>
                                                <th>Word</th>
                                                <th>IPA</th>
                                                <th>Class</th>
                                                <th>Translation</th>
                                                <th>Tags</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleDictionary.map((entry, i) => (
                                                <tr key={entry.id || i}>
                                                    <td className="pv-word-cell">{entry.word?.replace(/\*/g, '')}</td>
                                                    <td className="pv-ipa-cell">{entry.ipa ? `/${entry.ipa}/` : '—'}</td>
                                                    <td>{entry.wordClass ? <span className="pv-class-cell">{entry.wordClass}</span> : '—'}</td>
                                                    <td className="pv-trans-cell">{entry.translation}</td>
                                                    <td>
                                                        {entry.tags?.length > 0
                                                            ? entry.tags.map(t => <span key={t} className="pv-tag-pill">#{t}</span>)
                                                            : '—'
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {visibleCount < filteredDictionary.length && (
                                    <div className="pv-show-more">
                                        <button onClick={() => setVisibleCount(prev => prev + 50)}>
                                            <ChevronDown size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                            Show More ({filteredDictionary.length - visibleCount} remaining)
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>

                {/* GRAMMAR RULES */}
                {grammarRules.length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Layers size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Grammar & Morphology</h2>
                        </div>
                        <div className="pv-section-body">
                            <div className="pv-rules-list">
                                {grammarRules.map((rule, i) => (
                                    <div key={rule.id || i} className="pv-rule-item">
                                        <div className="pv-rule-affix custom-font-text notranslate">{rule.affix || '—'}</div>
                                        <div className="pv-rule-details">
                                            <div className="pv-rule-name">{rule.name || 'Unnamed Rule'}</div>
                                            <div className="pv-rule-applies">
                                                Applies to: {rule.appliesTo || 'all'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ALPHABET / ORTHOGRAPHY */}
                {config.alphabeticScript === 'custom' && config.alphabetNames && Object.keys(config.alphabetNames).length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Type size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Alphabet</h2>
                        </div>
                        <div className="pv-section-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                                {Object.entries(config.alphabetNames).map(([phoneme, name]) => {
                                    const glyph = config.alphabetGlyphs?.[phoneme];
                                    return (
                                        <div key={phoneme} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                                            <div className="custom-font-text notranslate" style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--acc)' }}>
                                                {glyph || phoneme}
                                            </div>
                                            <div style={{ fontWeight: 600, color: 'var(--tx)' }}>{name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>/{phoneme}/</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* NUMBER SYSTEM */}
                {config.numberSystem && config.numberSystem.stems && Object.keys(config.numberSystem.stems).length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Hash size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Numeral System (Base {config.numeralBase || 10})</h2>
                        </div>
                        <div className="pv-section-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                {Object.entries(config.numberSystem.stems).sort((a,b) => Number(a[0]) - Number(b[0])).map(([val, stem]) => (
                                    <div key={val} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--acc)' }}>{val}</span>
                                        <span className="custom-font-text notranslate">{stem}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* FUNCTION WORDS */}
                {config.functionWords && config.functionWords.length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <AlignLeft size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Function Words</h2>
                        </div>
                        <div className="pv-section-body">
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {config.functionWords.map((fw, i) => (
                                    <div key={i} style={{ padding: '0.5rem 1rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '20px', fontSize: '0.9rem' }}>
                                        <span className="custom-font-text notranslate" style={{ color: 'var(--acc)', marginRight: '0.5rem' }}>{fw.word}</span>
                                        <span style={{ color: 'var(--tx2)' }}>{fw.meaning} ({fw.type})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* INTERACTIVE FLASHCARDS */}
                {dictionary.length > 0 && (
                    <section className="pv-section" style={{ border: 'none', background: 'transparent' }}>
                        <div className="pv-section-header" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                            <BrainCircuit size={28} className="pv-section-icon" />
                            <h2 className="pv-section-title" style={{ fontSize: '1.8rem' }}>Learn & Study</h2>
                        </div>
                        <PublicFlashcards lexicon={dictionary} config={config} />
                    </section>
                )}
            </div>

            {/* ===== FOOTER ===== */}
            <footer className="pv-footer">
                <p>
                    Powered by <a href={window.location.origin}>Conlang Engine</a> — Build your own language.
                </p>
            </footer>
        </div>
    );
}
