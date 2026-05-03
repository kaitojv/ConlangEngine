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
import { Search, Filter, Hash, Trash2, Edit, Volume2, Table2, PlusCircle, Settings2, Download, X } from 'lucide-react';
import { exportTextAsSVG } from '../../../utils/svgExporter.jsx';
import toast from 'react-hot-toast';
import './lexiconList.css';

export default function LexiconList() {
    // Grab the global stores for our lexicon and language settings
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);
    const deleteWord = useLexiconStore((state) => state.deleteWord);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const navigate = useNavigate();
    
    // New toggle for showing grammar rules as entries
    const [showBoundMorphemes, setShowBoundMorphemes] = useState(false);
    
    // Spin up the transliterator to convert base words into the language's custom script
    const { transliterate } = useTransliterator();

    // Let's bundle all our sorting and filtering logic into one neat state object
    const [filters, setFilters] = useState({
        search: '',
        tag: 'all',
        type: 'all',
        letter: 'all',
        sort: 'newest'
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
        const letters = new Set(lexicon.map(w => {
            const cleanWord = w.word.replace(/\*/g, '');
            const displayWord = transliterate(cleanWord, lexicon);
            return displayWord ? displayWord.charAt(0).toUpperCase() : '';
        }).filter(Boolean));
        return [...letters].sort();
    }, [lexicon, transliterate]);

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
            const q = filters.search.toLowerCase();
            result = result.filter(e => 
                e.word.replace(/\*/g, '').toLowerCase().includes(q) || 
                e.translation.toLowerCase().includes(q) ||
                (e.tags && e.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }

        if (filters.tag !== 'all') {
            result = result.filter(e => 
                e.tags && e.tags.some(tag => tag.toLowerCase() === filters.tag.toLowerCase())
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
                const cleanWord = e.word.replace(/\*/g, '');
                const displayWord = transliterate(cleanWord, lexicon).toUpperCase();
                return displayWord.startsWith(filters.letter.toUpperCase());
            });
        }

        if (filters.sort === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
        else if (filters.sort === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
        else if (filters.sort === 'az') result.sort((a, b) => a.word.replace(/\*/g, '').localeCompare(b.word.replace(/\*/g, '')));
        else if (filters.sort === 'za') result.sort((a, b) => b.word.replace(/\*/g, '').localeCompare(a.word.replace(/\*/g, '')));

        return result;
    }, [lexicon, filters, transliterate]);

    // Quick action to bin a word
    const handleDelete = (id) => {
        toast.custom((t) => (
            <div style={{ background: 'var(--s4)', color: 'var(--tx)', padding: '15px', borderRadius: '8px', border: '1px solid var(--err)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong>⚠️ Delete Word</strong>
                <span>Are you sure you want to delete this root?</span>
                <div style={{display: 'flex', gap: '10px', marginTop: '5px'}}>
                    <button onClick={() => {
                        toast.dismiss(t.id);
                        deleteWord(id);
                        toast.success("Word deleted.");
                    }} style={{padding: '5px 10px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Delete</button>
                    <button onClick={() => toast.dismiss(t.id)} style={{padding: '5px 10px', background: 'var(--s2)', color: 'var(--tx)', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Cancel</button>
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
                                style={{ position: 'absolute', right: '12px', top: '10px', cursor: 'pointer', color: 'var(--tx3)' }}
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
                </div>

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
                <div className="list-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--tx2)' }}>
                        <input 
                            type="checkbox" 
                            checked={showBoundMorphemes} 
                            onChange={(e) => setShowBoundMorphemes(e.target.checked)} 
                        />
                        Show Bound Morphemes
                    </label>
                    <span className="list-total">
                        Total: <span style={{ color: 'var(--acc2)', fontWeight: 'bold' }}>{filteredLexicon.length}</span>
                    </span>
                    <Button variant="edit" className="btn-sm" onClick={() => navigate('/create')}>
                        <PlusCircle size={14} /> Create Word
                    </Button>
                </div>
            </div>

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
                    
                    return (
                        <Card key={entry.id} className="lexicon-entry">
                            <div className="entry-header">
                                <div className="entry-words">
                                    <span className={`notranslate entry-main-word custom-font-text ${phonologyTypes === 'featural_block' ? 'featural-block-render' : ''}`}>
                                        {displayWord}
                                    </span>
                                    
                                    {phonologyTypes !== 'alphabetic' && (
                                        <span className="notranslate entry-base-word">
                                            [{safeWord}]
                                        </span>
                                    )}

                                    {entry.ipa && (
                                        <span className="notranslate entry-ipa">
                                            /{entry.ipa}/
                                        </span>
                                    )}
                                </div>
                                
                                <div className="word-classes-wrapper" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
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
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '40px' }}>
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