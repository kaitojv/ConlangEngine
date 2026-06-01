import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Card from '../../UI/Card/Card.jsx';
import Modal from '../../UI/Modal/Modal.jsx'
import LexiconEditModal from './LexiconEditModal.jsx';
import MatrixModal from './MatrixModal.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Search, Filter, Hash, Trash2, Edit, Volume2, Table2, PlusCircle, Settings2, Download, X, Share2, Music, Zap } from 'lucide-react';
import { exportTextAsSVG } from '../../../utils/svgExporter.jsx';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabaseClient.js';
import { useSharing } from '../../../hooks/useSharing.jsx';
import { computeProsody } from '../../../utils/prosodyEngine.jsx';
import StressWave from '../../UI/StressWave/StressWave.jsx';
import './lexiconList.css';



export default function LexiconList() {
    // Grab the global stores for our lexicon and language settings
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);
    const deleteWord = useLexiconStore((state) => state.deleteWord);
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const consonants = useConfigStore(state => state.consonants) || '';
    const vowels = useConfigStore(state => state.vowels) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';
    const enableToneAndStress = useConfigStore(state => state.enableToneAndStress) ?? true;
    const syllabificationAlgorithm = useConfigStore(state => state.syllabificationAlgorithm) || 'ltr';
    const updateConfig = useConfigStore(state => state.updateConfig);
    const conlangName = useConfigStore((state) => state.conlangName);
    const stressRules = useConfigStore(state => state.stressRules) || [];
    const toneRules = useConfigStore(state => state.toneRules) || [];
    const navigate = useNavigate();

    const [session, setSession] = React.useState(null);
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, []);

    const { isSharing, handleShareLink } = useSharing(session);
    
    // New toggle for showing grammar rules as entries
    const [showBoundMorphemes, setShowBoundMorphemes] = useState(false);
    // Toggle for showing romanized form beneath the conscript in script modes
    const [showRomanization, setShowRomanization] = useState(false);
    const isScriptMode = ['syllabic', 'featural_block', 'logographic', 'featural', 'block'].includes(phonologyTypes);
    
    // Spin up the transliterator to convert base words into the language's custom script
    const { transliterate, normalizeToBase } = useTransliterator();

    // Let's bundle all our sorting and filtering logic into one neat state object
    const [filters, setFilters] = useState({
        search: '',
        tag: 'all',
        type: 'all',
        letter: 'all',
        sort: 'newest',
        showTones: false
    });

    // Track which words are currently selected for our popup modals
    const [selectedWordForMatrix, setSelectedWordForMatrix] = useState(null);
    const [selectedWordForEdit, setSelectedWordForEdit] = useState(null); 
    
    // Manage how many lexicon items are rendered at once for performance
    const [visibleCount, setVisibleCount] = useState(50);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setVisibleCount(50); // Reset visible count when filter changes
    };

    // Extract all the unique first letters from the lexicon so we can build our A-Z quick jump bar
    const firstLetters = useMemo(() => {
        const letters = new Set();
        
        // 1. Add letters defined by the user in Phonology settings
        const parseChars = (str) => {
            if (!str) return [];
            return str.split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => {
                    if (s.includes('=')) return s.split('=')[1].trim();
                    return s;
                });
        };
        
        const configChars = [
            ...parseChars(consonants),
            ...parseChars(vowels),
            ...parseChars(otherPhonemes)
        ];
        
        configChars.forEach(char => {
            if (char) letters.add(char.charAt(0).toUpperCase());
        });

        // 2. Add first letters from actual lexicon words (fallback / auto-discovery)
        lexicon.forEach(w => {
            const cleanWord = w.word.replace(/\*/g, '');
            const displayWord = transliterate(cleanWord, lexicon);
            if (displayWord) {
                letters.add(displayWord.charAt(0).toUpperCase());
            }
        });
        
        return [...letters].sort();
    }, [lexicon, transliterate, consonants, vowels, otherPhonemes]);

    // Do the same for word classes (Noun, Verb, etc.) to populate the dropdown
    const uniqueClasses = useMemo(() => {
        const classes = new Set();
        lexicon.forEach(w => {
            if (w.wordClass) {
                w.wordClass.split(',').forEach(cls => classes.add(cls.trim()));
            }
        });
        return [...classes].sort();
    }, [lexicon]);
    
    // Extract all unique tags for the tag filter dropdown
    const allTags = useMemo(() => {
        const tags = new Set();
        lexicon.forEach(w => {
            if (w.tags) {
                w.tags.forEach(t => tags.add(t.toLowerCase()));
            }
        });
        return [...tags].sort();
    }, [lexicon]);

    // The heavy lifter: filters and sorts the entire lexicon based on the user's current selections
    const filteredLexicon = useMemo(() => {
        let result = [...lexicon];

        // If the user wants to see bound morphemes (grammar rules), we inject them here
        if (showBoundMorphemes) {
            grammarRules.forEach(rule => {
                result.push({
                    id: rule.id,
                    word: rule.affix,
                    translation: rule.name,
                    wordClass: 'bound-morpheme',
                    tags: ['grammar', rule.condition],
                    isBound: true,
                    createdAt: 0 // Keep them at the bottom if sorted by newest
                });
            });
        }

        if (filters.search) {
            const q = filters.search.toLowerCase().trim();
            if (q) {
                result = result.map(e => {
                    const safeWord = (e.word || '').replace(/\*/g, '').toLowerCase();
                    const normalizedWord = normalizeToBase(safeWord).toLowerCase();
                    const displayWord = transliterate(e.word || '', lexicon).toLowerCase();
                    const trans = (e.translation || '').toLowerCase();
                    const def = (e.definition || '').toLowerCase();
                    const ipa = (e.ipa || '').toLowerCase();
                    
                    let score = 0;
                    
                    if (safeWord === q || normalizedWord === q || displayWord === q) score = 100;
                    else if (trans === q) score = 90;
                    else if (safeWord.startsWith(q) || normalizedWord.startsWith(q) || displayWord.startsWith(q)) score = 80;
                    else if (trans.startsWith(q)) score = 70;
                    else if (safeWord.includes(q) || normalizedWord.includes(q) || displayWord.includes(q)) score = 60;
                    else if (trans.includes(q)) score = 50;
                    else if (def.includes(q) || ipa.includes(q) || (e.tags && e.tags.some(tag => tag.toLowerCase().includes(q)))) score = 40;
                    
                    return { ...e, searchScore: score };
                }).filter(e => e.searchScore > 0);
            }
        }

        if (filters.tag !== 'all') {
            result = result.filter(e => 
                (e.tags && e.tags.some(tag => tag.toLowerCase() === filters.tag.toLowerCase()))
            );
        }

        if (filters.type !== 'all') {
            result = result.filter(e => {
                if (!e.wordClass) return false;
                const classes = e.wordClass.split(',').map(c => c.trim().toLowerCase());
                return classes.includes(filters.type.toLowerCase());
            });
        }

        if (filters.letter !== 'all') {
            result = result.filter(e => {
                const cleanWord = e.word.replace(/[\*\-]/g, '');
                const displayWord = transliterate(cleanWord, lexicon).toUpperCase();
                return displayWord.startsWith(filters.letter.toUpperCase());
            });
        }

        if (filters.search && filters.search.trim() !== '') {
            result.sort((a, b) => b.searchScore - a.searchScore);
        } else if (filters.sort === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
        else if (filters.sort === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
        else if (filters.sort === 'az') result.sort((a, b) => a.word.replace(/\*/g, '').localeCompare(b.word.replace(/\*/g, '')));
        else if (filters.sort === 'za') result.sort((a, b) => b.word.replace(/\*/g, '').localeCompare(a.word.replace(/\*/g, '')));

        return result;
    }, [lexicon, filters, transliterate]);

    // Quick action to bin a word
    const handleDelete = (id) => {
        toast.custom((t) => (
            <div className="delete-toast-container">
                <strong>⚠️ Delete Word</strong>
                <span>Are you sure you want to delete this root?</span>
                <div className="delete-toast-actions">
                    <button onClick={() => {
                        toast.dismiss(t.id);
                        deleteWord(id);
                        toast.success("Word deleted.");
                    }} className="delete-toast-btn">Delete</button>
                    <button onClick={() => toast.dismiss(t.id)} className="delete-cancel-btn">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity });
    };

    // Try to pronounce the word using the browser's built-in text-to-speech
    const handleListen = (word) => {
        if (!('speechSynthesis' in window)) {
            return toast.error("Sorry, your browser doesn't support text-to-speech.");
        }
        if (!word) {
            return toast.error("This word is empty and cannot be pronounced.");
        }

        // Interrupt any ongoing speech so it doesn't queue up a dozen words if the user spams the button
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    };

    return (
        <div className="lexicon-container">
            
            <Card className="lexicon-toolbar">
                <div className="toolbar-filters">
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input 
                            type="text" 
                            className="search-input"
                            placeholder="Search words, translations, or tags..."
                            value={filters.search}
                            onChange={(e) => updateFilter('search', e.target.value)}
                        />
                        {filters.search && (
                            <X 
                                className="clear-search-icon" 
                                size={16} 
                                onClick={() => updateFilter('search', '')}
                            />
                        )}
                    </div>

                    <select 
                        className="filter-select"
                        value={filters.tag}
                        onChange={(e) => updateFilter('tag', e.target.value)}
                    >
                        <option value="all">All Tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>#{tag}</option>
                        ))}
                    </select>

                    <select 
                        className="filter-select"
                        value={filters.sort}
                        onChange={(e) => updateFilter('sort', e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A to Z</option>
                        <option value="za">Z to A</option>
                    </select>

                    <select 
                        className="filter-select"
                        value={filters.type}
                        onChange={(e) => updateFilter('type', e.target.value)}
                    >
                        <option value="all">All Classes</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>
                                {cls === 'bound-morpheme' ? 'Bound Morphemes' : cls}
                            </option>
                        ))}
                    </select>
                    <label className="bound-toggle">
                        <input 
                            type="checkbox" 
                            className="bound-checkbox"
                            checked={showBoundMorphemes}
                            onChange={(e) => setShowBoundMorphemes(e.target.checked)}
                        />
                        Show Affixes
                    </label>
                    {isScriptMode && (
                        <label className="bound-toggle">
                            <input 
                                type="checkbox" 
                                className="bound-checkbox"
                                checked={showRomanization}
                                onChange={(e) => setShowRomanization(e.target.checked)}
                            />
                            Show Romanization
                        </label>
                    )}
                    <label className="bound-toggle">
                        <input 
                            type="checkbox" 
                            className="bound-checkbox"
                            checked={filters.showTones}
                            onChange={(e) => updateFilter('showTones', e.target.checked)}
                        />
                        Tones/Stress
                    </label>
                </div>

                {/* Active Filters Bar */}
                {(filters.search || filters.tag !== 'all' || filters.type !== 'all' || filters.letter !== 'all') && (
                    <div className="active-filters-bar">
                        <span className="filters-label">Active Filters:</span>
                        {filters.tag !== 'all' && (
                            <span className="tag-chip" onClick={() => updateFilter('tag', 'all')}>#{filters.tag} <X size={12} /></span>
                        )}
                        {filters.type !== 'all' && (
                            <span className="tag-chip type-filter-chip" onClick={() => updateFilter('type', 'all')}>{filters.type} <X size={12} /></span>
                        )}
                        {filters.letter !== 'all' && (
                            <span className="tag-chip letter-filter-chip" onClick={() => updateFilter('letter', 'all')}>Starts with {filters.letter} <X size={12} /></span>
                        )}
                        <button 
                            className="btn-v btn-sec-v clear-filters-btn" 
                            onClick={() => setFilters({ search: '', tag: 'all', type: 'all', letter: 'all', sort: 'newest' })}
                        >
                            Clear All
                        </button>
                    </div>
                )}

                <div className="alpha-filter-bar">
                    <Filter size={16} className="alpha-icon" />
                    <button 
                        className={`alpha-btn ${filters.letter === 'all' ? 'active' : ''}`}
                        onClick={() => updateFilter('letter', 'all')}
                    >
                        #
                    </button>
                    {firstLetters.map(letter => (
                        <button 
                            key={letter}
                            className={`alpha-btn ${filters.letter === letter ? 'active' : ''}`}
                            onClick={() => updateFilter('letter', letter)}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </Card>

            <div className="list-header">
                <span className="list-title">
                    Lexicon Entries
                </span>
                <div className="list-header-actions">
                    <span className="list-total">
                        Total: <span className="list-total-count">{filteredLexicon.length}</span>
                    </span>
                    {session && (
                        <Button variant="default" className="btn-sm" onClick={handleShareLink} disabled={isSharing}>
                            <Share2 size={14} className={isSharing ? 'animate-spin' : ''} /> 
                            {isSharing ? 'Sharing...' : 'Share'}
                        </Button>
                    )}
                    <Button variant="edit" className="btn-sm" onClick={() => navigate('/create')}>
                        <PlusCircle size={14} /> Create Word
                    </Button>
                </div>
            </div>

            <Infobox title="Lexicon Pro Tips">
                • <b>Search:</b> You can search by word, translation, or even tag (e.g. "#aquatic").<br />
                • <b>Filtering:</b> Use the alphabetic bar to quickly jump to words starting with a specific letter.<br />
                • <b>Affixes:</b> Enable "Show Affixes" to see bound morphemes like prefixes and suffixes in the list.
            </Infobox>

            {lexicon.length === 0 && (
                <div className="empty-state">
                    <Hash className="empty-icon" size={48} />
                    <h3>Your lexicon is empty</h3>
                    <p>Every great language starts with a single word. Let's create your first root.</p>
                    <div className="empty-state-actions">
                        <Button variant="save" onClick={() => navigate('/create')}>
                            <PlusCircle size={16} /> Create First Word
                        </Button>
                        <Button variant="default" onClick={() => navigate('/settings')}>
                            <Settings2 size={16} /> Configure Phonology
                        </Button>
                    </div>
                </div>
            )}

            {lexicon.length > 0 && filteredLexicon.length === 0 && (
                <div className="empty-state-search">
                    <p>No words found matching your search criteria.</p>
                </div>
            )}

            <div className="lexicon-cards">
                {filteredLexicon.slice(0, visibleCount).map((entry) => {
                    const safeWord = entry.word.replace(/\*/g, '');
                    const displayWord = transliterate(safeWord, lexicon);

                    // Auto-compute prosody from rules if no manual values set
                    const computed = (filters.showTones && (!entry.stress || !entry.tone) && (stressRules.length > 0 || toneRules.length > 0))
                        ? computeProsody(safeWord, { vowels, stressRules, toneRules })
                        : null;
                    const displayStress = entry.stress || (computed?.stress ?? '');
                    const displayTone = entry.tone || (computed?.tone ?? '');
                    const isAutoComputed = (!entry.stress && computed?.stress) || (!entry.tone && computed?.tone);
                    
                    return (
                        <Card key={entry.id} className="lexicon-entry">
                            <div className="entry-header">
                                <div className="entry-words">
                                    <div className="entry-word-with-wave" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                        {filters.showTones && <StressWave word={safeWord} stress={displayStress} tone={displayTone} customVowelsStr={useConfigStore.getState().vowels} />}
                                        <span className={`notranslate entry-main-word custom-font-text ${phonologyTypes === 'featural_block' ? 'featural-block-render' : ''}`} style={{ textAlign: 'center' }}>
                                            {displayWord}
                                        </span>
                                    </div>

                                    {/* Romanized form — shown as a dedicated readable line when toggle is on */}
                                    {isScriptMode && showRomanization && (
                                        <span className="notranslate entry-romanized">
                                            {safeWord}
                                        </span>
                                    )}

                                    {/* Compact bracket form — shown when toggle is off */}
                                    {phonologyTypes !== 'alphabetic' && !showRomanization && (
                                        <span className="notranslate entry-base-word">
                                            [{safeWord}]
                                        </span>
                                    )}

                                    {entry.ipa && (
                                        <span className="notranslate entry-ipa">
                                            /{entry.ipa}/
                                        </span>
                                    )}

                                    {showRomanization && (
                                        <span className="entry-romanization">
                                            {transliterate(safeWord)}
                                        </span>
                                    )}

                                    {filters.showTones && displayTone && (
                                        <span className="notranslate entry-tone" style={{fontSize: '0.8rem', opacity: isAutoComputed && !entry.tone ? 0.5 : 0.7, marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            <Music size={12} /> {displayTone} Tone{isAutoComputed && !entry.tone ? ' (auto)' : ''}
                                        </span>
                                    )}

                                    {filters.showTones && displayStress && (
                                        <span className="notranslate entry-stress" style={{fontSize: '0.8rem', opacity: isAutoComputed && !entry.stress ? 0.5 : 0.7, marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            <Zap size={12} /> {displayStress} Stress{isAutoComputed && !entry.stress ? ' (auto)' : ''}
                                        </span>
                                    )}
                                </div>
                                

                                <div className="word-classes-wrapper classes-preview-wrap">
                                    {entry.wordClass ? entry.wordClass.split(',').map((cls, idx) => {
                                        const cleanCls = cls.trim();
                                        const safeClassBadge = cleanCls.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
                                        return (
                                            <span key={idx} className={`word-class-badge badge-${safeClassBadge}`}>
                                                {cleanCls}
                                            </span>
                                        );
                                    }) : (
                                        <span className="word-class-badge badge-other">Other</span>
                                    )}
                                </div>
                            </div>

                            <div className="entry-translation">
                                {entry.translation}
                            </div>

                            {entry.definition && (
                                <div className="entry-definition">
                                    {entry.definition}
                                </div>
                            )}

                            {entry.tags && entry.tags.length > 0 && (
                                <div className="entry-tags">
                                    {[...entry.tags].sort().map((tag, i) => (
                                        <span 
                                            key={i} 
                                            className={`entry-tag ${filters.tag === tag ? 'active' : ''}`}
                                            onClick={() => updateFilter('tag', filters.tag === tag ? 'all' : tag)}
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="entry-actions">
                                <Button 
                                    variant="listen" 
                                    onClick={() => handleListen(entry.ipa || safeWord)}
                                >
                                    <Volume2 size={14} /> Listen
                                </Button>
                                
                                <Button 
                                    variant="edit" 
                                    onClick={() => setSelectedWordForEdit(entry)}
                                >
                                    <Edit size={14} /> Edit
                                </Button>
                                
                                <Button 
                                    variant="error" 
                                    onClick={() => handleDelete(entry.id)}
                                >
                                    <Trash2 size={14} /> Delete
                                </Button>

                                {phonologyTypes !== 'alphabetic' && (
                                    <Button 
                                        variant="default" 
                                        onClick={() => exportTextAsSVG(displayWord, `${safeWord}.svg`)}
                                        title="Download SVG"
                                    >
                                        <Download size={14} />
                                    </Button>
                                )}

                                <div className="action-matrix">
                                    <Button 
                                        variant="save" 
                                        onClick={() => setSelectedWordForMatrix(entry)}
                                    >
                                        <Table2 size={14} /> Matrix
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {visibleCount < filteredLexicon.length && (
                <div className="load-more-wrap">
                    <Button variant="edit" onClick={() => setVisibleCount(prev => prev + 50)}>
                        Load More ({filteredLexicon.length - visibleCount} remaining)
                    </Button>
                </div>
            )}


            <Modal isOpen={!!selectedWordForMatrix} onClose={() => setSelectedWordForMatrix(null)} title="Word Inflection Matrix">
                <MatrixModal key={selectedWordForMatrix?.id} wordObj={selectedWordForMatrix} />
            </Modal>

            <Modal isOpen={!!selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} title="Edit Lexicon Entry">
                <LexiconEditModal key={selectedWordForEdit?.id} wordObj={selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} />
            </Modal>
        </div>
    );
}