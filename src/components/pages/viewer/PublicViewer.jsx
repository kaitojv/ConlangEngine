import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/utils/supabaseClient.js';
import { BookOpen, Globe, User, Search, Layers, PenTool, ChevronDown, Volume2, Type, Hash, AlignLeft, BrainCircuit, FileText, Map, Zap, ArrowLeft, Loader2, Calendar, Clock } from 'lucide-react';
import { playAzureTTS } from '@/utils/azureTTS.js';
import DOMPurify from 'dompurify';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import { usePublicThemeInjector, usePublicFontInjector } from '../../../hooks/usePublicInjectors.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { renderWordInScript } from '../../../utils/scriptRendering.js';
import { generateBlockFontData } from '../../../utils/blockFontGenerator.jsx';
import PublicFlashcards from './PublicFlashcards.jsx';
import ExercisePlayer from '../study/ExercisePlayer.jsx';
import PageSkeleton from '../../UI/PageSkeleton/PageSkeleton.jsx';
import './publicViewer.css';
import '../study/studyTab.css'; // Required for the course map layout

export default function PublicViewer() {
    const { projectId } = useParams();
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(50);
    const [activeTab, setActiveTab] = useState('overview'); // overview, course, flashcards
    const [activeLevel, setActiveLevel] = useState(null);
    const [savedScroll, setSavedScroll] = useState(0);
    const [playingWordId, setPlayingWordId] = useState(null);
    const [collapsedFolders, setCollapsedFolders] = useState({});

    const handlePlayIpa = useCallback(async (entry) => {
        if (playingWordId) return; // prevent overlapping
        setPlayingWordId(entry.id || entry.word);
        try {
            await playAzureTTS({
                text: entry.word,
                ipa: entry.ipa,
                voice: 'ipa-default',
                useIpa: true
            });
        } catch (err) {
            console.warn('TTS playback failed:', err);
        } finally {
            setPlayingWordId(null);
        }
    }, [playingWordId]);

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

    // Auto-compile the block font on the fly if it was stripped from the cloud sync payload
    useEffect(() => {
        if (!projectData || !projectData.config) return;
        const rawConf = projectData.config;
        const defaultScriptId = rawConf.scriptRules?.defaultScriptId || 'default';
        const scriptData = rawConf.scriptDataById?.[defaultScriptId] || {};
        const conf = { ...rawConf, ...scriptData };
        
        if (conf.phonologyTypes === 'featural_block' && !conf.customFontBase64 && conf.featuralComponents) {
            const compileFont = async () => {
                try {
                    const newData = await generateBlockFontData({ ...conf, lexicon: projectData.dictionary || [] });
                    setProjectData(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            config: {
                                ...prev.config,
                                customFontBase64: newData.customFontBase64,
                                syllabaryMap: newData.syllabaryMap
                            }
                        };
                    });
                } catch (e) {
                    console.warn("PublicViewer auto-compile failed:", e);
                }
            };
            compileFont();
        }
    }, [projectData]);

    // Extract data from the fetched project — memoize to prevent re-running
    // expensive hooks (font injection, theme injection) on unrelated re-renders
    const config = useMemo(() => {
        const rawConfig = projectData?.config || {};
        const defaultScriptId = rawConfig.scriptRules?.defaultScriptId || 'default';
        const scriptData = rawConfig.scriptDataById?.[defaultScriptId] || {};
        return { ...rawConfig, ...scriptData };
    }, [projectData]);
    
    const dictionary = useMemo(() => projectData?.dictionary || [], [projectData]);
    const grammarRules = config.grammarRules || [];
    const wikiPages = config.wikiPages || {};

    const { transliterate } = useTransliterator(config);
    const isLogographic = ['logographic', 'syllabic', 'featural_block'].includes(config.phonologyTypes);

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
        syllabic: 'Syllabic',
        logographic: 'Logographic',
        featural_block: 'Featural Block',
        abjad: 'Abjad',
        abugida: 'Abugida'
    }[config.phonologyTypes] || 'Alphabetic';

    // --- LOADING STATE ---
    if (loading) {
        return (
            <div className="pv-page">
                <PageSkeleton type="lexicon" />
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
    const writingDirection = config.writingDirection || 'ltr';

    // Prepare title and description
    let displayName = config.conlangName || 'Untitled Conlang';
    let displayDesc = config.description;

    const needsTransliteration = ['logographic', 'syllabic', 'alphabetic', 'abjad', 'abugida'].includes(config.phonologyTypes);
    if (needsTransliteration) {
        displayName = (config.conlangName || 'Untitled Conlang').split(/(\s+)/).map(w => w.trim() ? transliterate(w, dictionary) : w).join('');
        // Description is intentionally NOT transliterated — it should remain readable
    }

    return (
        <div className="pv-page">
            <style>
                {`
                    .custom-font-text {
                        writing-mode: ${writingDirection.startsWith('vertical') ? writingDirection : 'horizontal-tb'};
                        direction: ${writingDirection === 'rtl' ? 'rtl' : 'ltr'};
                        ${writingDirection.startsWith('vertical') ? 'text-orientation: upright;' : ''}
                    }
                    input.custom-font-text, 
                    textarea.custom-font-text,
                    .pv-dict-table .custom-font-text,
                    .pv-rule-affix.custom-font-text {
                        writing-mode: horizontal-tb !important;
                    }
                    .pv-back-btn {
                        position: absolute;
                        top: 20px;
                        left: 20px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        color: var(--tx2);
                        text-decoration: none;
                        font-size: 0.85rem;
                        font-weight: 600;
                        background: var(--bg);
                        padding: 6px 12px;
                        border-radius: 20px;
                        border: 1px solid var(--bd);
                        transition: all 0.2s;
                        z-index: 10;
                    }
                    .pv-back-btn:hover {
                        color: var(--tx);
                        border-color: var(--tx3);
                        background: var(--s1);
                    }
                `}
            </style>

            {/* ===== HERO HEADER ===== */}
            <header className="pv-hero" style={{ position: 'relative' }}>
                <Link to="/" className="pv-back-btn">
                    <ArrowLeft size={14} /> Back
                </Link>
                <div className="pv-hero-content">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ color: 'var(--acc)' }}>
                            {getConlangIcon(config.conlangIcon, 40)}
                        </div>
                        <h1 className="pv-lang-name custom-font-text notranslate" style={{ margin: 0, writingMode: 'horizontal-tb' }}>{displayName}</h1>
                    </div>
                    <div className="pv-author">
                        <User size={14} />
                        <span>Created by {config.authorName || 'Anonymous'}</span>
                    </div>
                    {displayDesc && displayDesc !== 'A brief description of your conlang.' && (
                        <p className="pv-description notranslate" style={{ writingMode: 'horizontal-tb' }}>{displayDesc}</p>
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

            {/* ===== TAB NAVIGATION ===== */}
            <div className="pv-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '20px', background: 'var(--s1)', borderBottom: '1px solid var(--bd)', flexWrap: 'wrap' }}>
                <button 
                    className={`pv-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('overview'); setActiveLevel(null); }}
                    style={{ padding: '10px 20px', border: 'none', background: activeTab === 'overview' ? 'var(--acc)' : 'transparent', color: activeTab === 'overview' ? '#fff' : 'var(--tx)', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    <BookOpen size={16} style={{display: 'inline', marginRight: '8px', marginBottom: '-3px'}}/> Overview
                </button>
                <button 
                    className={`pv-tab-btn ${activeTab === 'course' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('course'); setActiveLevel(null); }}
                    style={{ padding: '10px 20px', border: 'none', background: activeTab === 'course' ? 'var(--acc)' : 'transparent', color: activeTab === 'course' ? '#fff' : 'var(--tx)', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    <Map size={16} style={{display: 'inline', marginRight: '8px', marginBottom: '-3px'}}/> Course Map
                </button>
                <button 
                    className={`pv-tab-btn ${activeTab === 'flashcards' ? 'active' : ''}`} 
                    onClick={() => { setActiveTab('flashcards'); setActiveLevel(null); }}
                    style={{ padding: '10px 20px', border: 'none', background: activeTab === 'flashcards' ? 'var(--acc)' : 'transparent', color: activeTab === 'flashcards' ? '#fff' : 'var(--tx)', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                    <BrainCircuit size={16} style={{display: 'inline', marginRight: '8px', marginBottom: '-3px'}}/> Flashcards
                </button>
            </div>

            {/* ===== CONTENT ===== */}
            <div className="pv-content">
                {activeTab === 'overview' && (
                    <>

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
                                                    <td className="pv-word-cell">
                                                        {config.customGlyphs?.[(entry.word || '').toLowerCase()] ? (
                                                            <img 
                                                                src={config.customGlyphs[(entry.word || '').toLowerCase()]} 
                                                                alt={entry.word}
                                                                className="entry-custom-glyph"
                                                                style={{ maxHeight: '40px', maxWidth: '100px', objectFit: 'contain' }}
                                                            />
                                                        ) : (
                                                            <span className={`custom-font-text notranslate ${isLogographic && entry.ideogram ? 'pv-featural-word' : ''}`}>
                                                                {(() => {
                                                                    // Use script rendering if script override exists
                                                                    if (entry.scriptOverride) {
                                                                        const rendered = renderWordInScript(entry, config, dictionary);
                                                                        return rendered.text;
                                                                    }
                                                                    // Legacy fallback
                                                                    return config.phonologyTypes === 'logographic' && entry.ideogram ? entry.ideogram : transliterate(entry.word, dictionary);
                                                                })()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="pv-ipa-cell">
                                                        {entry.ipa ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                                /{entry.ipa}/
                                                                <button
                                                                    className="pv-ipa-play-btn"
                                                                    title="Listen to pronunciation"
                                                                    onClick={(e) => { e.stopPropagation(); handlePlayIpa(entry); }}
                                                                    disabled={!!playingWordId}
                                                                >
                                                                    {playingWordId === (entry.id || entry.word)
                                                                        ? <Loader2 size={12} className="animate-spin" />
                                                                        : <Volume2 size={12} />
                                                                    }
                                                                </button>
                                                            </span>
                                                        ) : '—'}
                                                    </td>
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

                {/* WIKI & DOCUMENTATION */}
                {Object.keys(wikiPages).length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <FileText size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Grammar Wiki</h2>
                        </div>
                        <div className="pv-section-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(() => {
                                const rootItems = Object.keys(wikiPages).filter(k => {
                                    const p = wikiPages[k];
                                    const pId = typeof p === 'object' ? p.parentId : null;
                                    return pId === 'root' || pId === null || pId === undefined;
                                }).sort((a, b) => {
                                    const orderA = typeof wikiPages[a] === 'object' && wikiPages[a].order !== undefined ? wikiPages[a].order : 0;
                                    const orderB = typeof wikiPages[b] === 'object' && wikiPages[b].order !== undefined ? wikiPages[b].order : 0;
                                    return orderA - orderB;
                                });

                                const getChildren = (parentId) => {
                                    return Object.keys(wikiPages).filter(k => {
                                        const p = wikiPages[k];
                                        return p && typeof p === 'object' && p.parentId === parentId;
                                    }).sort((a, b) => {
                                        const orderA = typeof wikiPages[a] === 'object' && wikiPages[a].order !== undefined ? wikiPages[a].order : 0;
                                        const orderB = typeof wikiPages[b] === 'object' && wikiPages[b].order !== undefined ? wikiPages[b].order : 0;
                                        return orderA - orderB;
                                    });
                                };

                                return (
                                    <>
                                        {rootItems.map(itemId => {
                                            const p = wikiPages[itemId];
                                            const isNotebook = p && typeof p === 'object' && p.type === 'notebook';

                                            if (isNotebook) {
                                                const children = getChildren(itemId);
                                                if (children.length === 0) return null;
                                                return (
                                                    <div key={itemId} className="pv-wiki-notebook" style={{ marginBottom: '1rem' }}>
                                                        <h3 
                                                            onClick={() => setCollapsedFolders(prev => ({...prev, [itemId]: !prev[itemId]}))}
                                                            style={{ 
                                                                color: 'var(--tx)', 
                                                                borderBottom: '1px solid var(--bd)', 
                                                                paddingBottom: '0.5rem', 
                                                                marginBottom: collapsedFolders[itemId] ? '0' : '1.5rem', 
                                                                marginTop: '1rem',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            {p.title}
                                                            <ChevronDown size={18} style={{ transform: collapsedFolders[itemId] ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--tx2)' }} />
                                                        </h3>
                                                        {!collapsedFolders[itemId] && children.map(childId => {
                                                            const pageData = wikiPages[childId];
                                                            const title = pageData.title;
                                                            const content = pageData.content;
                                                            if (!content) return null;
                                                            return (
                                                                <div key={childId} className="pv-wiki-page" style={{ paddingLeft: '1rem', borderLeft: '3px solid var(--s2)', marginBottom: '2rem' }}>
                                                                    <h4 style={{ color: 'var(--acc)', marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>{title}</h4>
                                                                    <div 
                                                                        className="pv-wiki-content"
                                                                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} 
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            } else {
                                                const isObj = typeof p === 'object' && p !== null;
                                                const title = isObj ? p.title : (itemId.charAt(0).toUpperCase() + itemId.slice(1));
                                                const content = isObj ? p.content : p;
                                                if (!content) return null;
                                                
                                                return (
                                                    <div key={itemId} className="pv-wiki-page" style={{ marginBottom: '2rem' }}>
                                                        {isObj && title && <h3 style={{ color: 'var(--acc)', marginTop: 0, marginBottom: '1rem' }}>{title}</h3>}
                                                        <div 
                                                            className="pv-wiki-content"
                                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} 
                                                        />
                                                    </div>
                                                );
                                            }
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    </section>
                )}

                {/* ALPHABET / ORTHOGRAPHY */}
                {config.alphabetNames && Object.keys(config.alphabetNames).length > 0 && (
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
                                                {glyph || transliterate(phoneme, dictionary)}
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

                {/* NUMBER DERIVED RULES */}
                {config.numberDerivedRules && (config.numberDerivedRules.ordinal || config.numberDerivedRules.fractional || config.numberDerivedRules.multiplier) && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Hash size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Derived Mathematical Forms</h2>
                        </div>
                        <div className="pv-section-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                {config.numberDerivedRules.ordinal && (
                                    <div style={{ padding: '0.75rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Ordinal</div>
                                        <div className="custom-font-text notranslate" style={{ fontWeight: 600, color: 'var(--acc)' }}>{config.numberDerivedRules.ordinal}</div>
                                    </div>
                                )}
                                {config.numberDerivedRules.fractional && (
                                    <div style={{ padding: '0.75rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Fractional</div>
                                        <div className="custom-font-text notranslate" style={{ fontWeight: 600, color: 'var(--acc)' }}>{config.numberDerivedRules.fractional}</div>
                                    </div>
                                )}
                                {config.numberDerivedRules.multiplier && (
                                    <div style={{ padding: '0.75rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '6px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Multiplier</div>
                                        <div className="custom-font-text notranslate" style={{ fontWeight: 600, color: 'var(--acc)' }}>{config.numberDerivedRules.multiplier}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* TIME SYSTEM VOCABULARY */}
                {config.timeSystemVocab && Object.values(config.timeSystemVocab).some(val => val) && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Clock size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Time System</h2>
                        </div>
                        <div className="pv-section-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                                {Object.entries({ second: 'Second', minute: 'Minute', hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' }).map(([key, label]) => {
                                    const val = config.timeSystemVocab[key];
                                    if (!val) return null;
                                    return (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '6px' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--tx2)' }}>{label}</span>
                                            <span className="custom-font-text notranslate" style={{ color: 'var(--acc)' }}>{val}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {/* NUMBER MATRIX (CALENDAR) */}
                {config.numberMatrix && Object.keys(config.numberMatrix).length > 0 && (
                    <section className="pv-section">
                        <div className="pv-section-header">
                            <Calendar size={20} className="pv-section-icon" />
                            <h2 className="pv-section-title">Calendar System</h2>
                        </div>
                        <div className="pv-section-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                            <div className="matrix-table-wrapper" style={{ overflowX: 'auto', background: 'var(--s1)', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                                <table className="matrix-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead style={{ borderBottom: '1px solid var(--bd)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', color: 'var(--tx2)', fontWeight: 600 }}>Day of the Week</th>
                                            <th style={{ padding: '0.75rem 1rem', color: 'var(--tx2)', fontWeight: 600 }}>Word</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1,2,3,4,5,6,7].map(day => {
                                            const val = config.numberMatrix[day]?.day;
                                            if (!val) return null;
                                            return (
                                                <tr key={day} style={{ borderBottom: '1px solid var(--bd)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--tx)' }}>Day {day}</td>
                                                    <td className="custom-font-text notranslate" style={{ padding: '0.75rem 1rem', color: 'var(--acc)', fontWeight: 600 }}>{val}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="matrix-table-wrapper" style={{ overflowX: 'auto', background: 'var(--s1)', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                                <table className="matrix-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead style={{ borderBottom: '1px solid var(--bd)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', color: 'var(--tx2)', fontWeight: 600 }}>Month of the Year</th>
                                            <th style={{ padding: '0.75rem 1rem', color: 'var(--tx2)', fontWeight: 600 }}>Word</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => {
                                            const val = config.numberMatrix[month]?.month;
                                            if (!val) return null;
                                            return (
                                                <tr key={month} style={{ borderBottom: '1px solid var(--bd)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--tx)' }}>Month {month}</td>
                                                    <td className="custom-font-text notranslate" style={{ padding: '0.75rem 1rem', color: 'var(--acc)', fontWeight: 600 }}>{val}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
                    </>
                )}

                {activeTab === 'course' && (
                    <>

                {/* COURSE MAP */}
                {!activeLevel && config.customCourse && config.customCourse.length > 0 && (
                    <section className="pv-section" style={{ border: 'none', background: 'transparent' }}>
                        <div className="pv-section-header" style={{ justifyContent: 'center', marginBottom: '2rem', background: 'transparent', borderBottom: 'none' }}>
                            <Map size={28} className="pv-section-icon" />
                            <h2 className="pv-section-title" style={{ fontSize: '1.8rem' }}>Course Map</h2>
                        </div>
                        <div className="pv-learning-path-container" style={{ margin: '0 auto' }}>
                            <div className="pv-path-track" style={{ position: 'relative' }}>
                                <svg 
                                    className="path-svg" 
                                    style={{ position: 'absolute', top: 0, left: '50%', width: '2px', height: `${80 + (config.customCourse.length - 1) * 150}px`, overflow: 'visible', zIndex: 0, pointerEvents: 'none' }}
                                >
                                    {config.customCourse.map((node, i) => {
                                        if (i === config.customCourse.length - 1) return null;
                                        const isLeft = i % 2 === 0;
                                        const y1 = 80 + i * 150;
                                        const y2 = 80 + (i + 1) * 150;
                                        const midY = (y1 + y2) / 2;
                                        const x1 = isLeft ? -40 : 40;
                                        const x2 = isLeft ? 40 : -40;
                                        
                                        return (
                                            <g key={`line-${i}`}>
                                                <path 
                                                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                                    stroke="var(--bd)"
                                                    strokeWidth="32"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                />
                                                <path 
                                                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                                                    stroke="var(--s2)"
                                                    strokeWidth="24"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>

                                {config.customCourse.map((node, i) => {
                                    const isZigZag = i % 2 === 0;
                                    return (
                                        <div key={node.id} className={`pv-path-node-wrapper ${isZigZag ? 'left' : 'right'}`}>
                                            <div 
                                                className="pv-path-node" 
                                                onClick={() => {
                                                    setSavedScroll(window.scrollY);
                                                    setActiveLevel(node);
                                                    setTimeout(() => window.scrollTo(0, 0), 50);
                                                }}
                                                style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--acc)', boxShadow: `0 8px 0 var(--acc)`, cursor: 'pointer' }}
                                            >
                                                <div className="pv-path-node-icon"><Zap size={32} color="var(--acc)" fill="none" /></div>
                                            </div>
                                            <div className="pv-path-node-label">
                                                {node.title}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}
                
                {activeLevel && (
                    <div style={{ marginTop: '2rem' }}>
                        <ExercisePlayer 
                            levelNode={activeLevel} 
                            onComplete={() => {
                                setActiveLevel(null);
                                setTimeout(() => window.scrollTo(0, savedScroll), 50);
                            }} 
                            onExit={() => {
                                setActiveLevel(null);
                                setTimeout(() => window.scrollTo(0, savedScroll), 50);
                            }} 
                            customLexicon={dictionary} 
                            customConfig={config} 
                        />
                    </div>
                )}

                    </>
                )}

                {activeTab === 'flashcards' && (
                    <>
                {/* INTERACTIVE FLASHCARDS */}
                {dictionary.length > 0 && (
                    <section className="pv-section" style={{ border: 'none', background: 'transparent' }}>
                        <div className="pv-section-header" style={{ justifyContent: 'center', marginBottom: '2rem', background: 'transparent', borderBottom: 'none' }}>
                            <BrainCircuit size={28} className="pv-section-icon" />
                            <h2 className="pv-section-title" style={{ fontSize: '1.8rem' }}>Flashcards</h2>
                        </div>
                        <PublicFlashcards lexicon={dictionary} config={config} />
                    </section>
                )}
                    </>
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
