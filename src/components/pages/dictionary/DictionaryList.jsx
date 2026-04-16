import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Card from '../../UI/Card/Card.jsx';
import './dictionaryList.css';
import Modal from '../../UI/Modal/Modal.jsx'
import MatrixModal from './MatrixModal.jsx';
import EditWordModal from './EditModal.jsx';

// Icons (assuming you are using lucide-react)
import { Search, Filter, Hash, Trash2, Edit, Volume2, Table2 } from 'lucide-react';

export default function DictionaryList() {
    // 1. ZUSTAND STORES
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const deleteWord = useLexiconStore((state) => state.deleteWord);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    
    // 2. CUSTOM HOOKS
    const { transliterate } = useTransliterator();

    // 3. LOCAL STATES FOR FILTERING AND SORTING
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState('all');
    const [activeLetter, setActiveLetter] = useState('all');
    const [activeSort, setActiveSort] = useState('newest');
   const [selectedWordForMatrix, setSelectedWordForMatrix] = useState(null);
    const [selectedWordForEdit, setSelectedWordForEdit] = useState(null); // <--- Add this

    // Helper function for CSS classes based on word type
    const getTypeColor = (type) => {
        if(type === 'verb') return '#ef4444'; // Red
        if(type === 'noun') return '#3b82f6'; // Blue
        if(type === 'adjective') return '#10b981'; // Green
        return '#8b5cf6'; // Purple (Other)
    };

    // 4. EXTRACT UNIQUE FIRST LETTERS FOR THE ALPHA BAR
    const firstLetters = useMemo(() => {
        const letters = new Set(
            lexicon.map(w => w.word.replace(/\*/g, '').charAt(0).toUpperCase())
        );
        return [...letters].sort();
    }, [lexicon]);

    // 4.5 EXTRACT UNIQUE WORD CLASSES FOR THE DYNAMIC FILTER
    const uniqueClasses = useMemo(() => {
        const classes = new Set(
            lexicon.map(w => w.wordClass).filter(Boolean)
        );
        return [...classes].sort();
    }, [lexicon]);

    // 5. THE FILTERING AND SORTING ENGINE (React useMemo replaces the old renderDict)
    const filteredLexicon = useMemo(() => {
        let result = [...lexicon];

        // Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e => 
                e.word.replace(/\*/g, '').toLowerCase().includes(q) || 
                e.translation.toLowerCase().includes(q) ||
                (e.tags && e.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }

        // Type Filter
        if (activeType !== 'all') {
            result = result.filter(e => e.wordClass === activeType);
        }

        // Alphabet Filter
        if (activeLetter !== 'all') {
            result = result.filter(e => {
                const cleanWord = e.word.replace(/\*/g, '').toUpperCase();
                return cleanWord.startsWith(activeLetter.toUpperCase());
            });
        }

        // Sorting
        if (activeSort === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
        else if (activeSort === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
        else if (activeSort === 'az') result.sort((a, b) => a.word.replace(/\*/g, '').localeCompare(b.word.replace(/\*/g, '')));
        else if (activeSort === 'za') result.sort((a, b) => b.word.replace(/\*/g, '').localeCompare(a.word.replace(/\*/g, '')));

        return result;
    }, [lexicon, searchQuery, activeType, activeLetter, activeSort]);


    // 6. ACTION HANDLERS
    const handleDelete = (id) => {
        if(window.confirm("Are you sure you want to delete this root?")) {
            deleteWord(id);
        }
    };

    const handleListen = (word, ipa) => {
        if (!('speechSynthesis' in window)) {
            alert("Sorry, your browser doesn't support text-to-speech.");
            return;
        }

        // The native browser speech synthesis does not understand IPA.
        // It will pronounce the word based on standard orthography rules,
        // which may not be accurate for a conlang. We'll speak the `safeWord`.
        if (!word) {
            alert("This word is empty and cannot be pronounced.");
            return;
        }

        // Cancel any previous speech to prevent queueing
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(utterance);
    };

    // 7. RENDERERS
    return (
        <div className="dictionary-container">
            
            {/* --- TOOLBAR: SEARCH & FILTERS --- */}
            <Card className="dictionary-toolbar">
                <div className="toolbar-filters">
                    {/* Search Bar */}
                    <div className="search-box">
                        <Search className="search-icon" size={18} />
                        <input 
                            type="text" 
                            className="search-input"
                            placeholder="Search words, translations, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Sorting & Type */}
                    <select 
                        className="filter-select"
                        value={activeSort}
                        onChange={(e) => setActiveSort(e.target.value)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="az">A to Z</option>
                        <option value="za">Z to A</option>
                    </select>

                    <select 
                        className="filter-select"
                        value={activeType}
                        onChange={(e) => setActiveType(e.target.value)}
                    >
                        <option value="all">All Classes</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>
                                {cls}
                            </option>
                            ))}
                    </select>
                </div>

                {/* Alpha Bar */}
                <div className="alpha-filter-bar">
                    <Filter size={16} className="alpha-icon" />
                    <button 
                        className={`alpha-btn ${activeLetter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveLetter('all')}
                    >
                        #
                    </button>
                    {firstLetters.map(letter => (
                        <button 
                            key={letter}
                            className={`alpha-btn ${activeLetter === letter ? 'active' : ''}`}
                            onClick={() => setActiveLetter(letter)}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </Card>

            {/* --- LIST HEADER --- */}
            <div className="list-header">
                <span className="list-title">
                    Lexicon Entries
                </span>
                <span className="list-total">
                    Total: <span className="text-[var(--acc2)]">{filteredLexicon.length}</span>
                </span>
            </div>

            {/* --- EMPTY STATES --- */}
            {lexicon.length === 0 && (
                <div className="empty-state">
                    <Hash className="empty-icon" size={48} />
                    <h3>Your lexicon is empty</h3>
                    <p>Every great language starts with a single word. Let's create your first root.</p>
                </div>
            )}

            {lexicon.length > 0 && filteredLexicon.length === 0 && (
                <div className="empty-state-search">
                    <p>No words found matching your search criteria.</p>
                </div>
            )}

            {/* --- DICTIONARY CARDS --- */}
            <div className="dictionary-cards">
                {filteredLexicon.map((entry, index) => {
                    const safeWord = entry.word.replace(/\*/g, '');
                    // THE MAGIC: Converting the base word to the custom orthography for display
                    const displayWord = transliterate(safeWord, lexicon);

                    return (
                        <Card 
                            key={entry.id} 
                            className="dictionary-entry"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="entry-header">
                                <div className="entry-words">
                                    {/* Display custom orthography / Ideograms */}
                                    <span className="notranslate entry-main-word custom-font-text">
                                        {displayWord}
                                    </span>
                                    
                                    {/* Display base spelling if not alphabetic */}
                                    {phonologyTypes !== 'alphabetic' && (
                                        <span className="notranslate entry-base-word">
                                            [{safeWord}]
                                        </span>
                                    )}

                                    {/* Display IPA */}
                                    {entry.ipa && (
                                        <span className="notranslate entry-ipa">
                                            /{entry.ipa}/
                                        </span>
                                    )}
                                </div>
                                
                                {/* Word Class Badge */}
                                <span 
                                    className="word-class-badge"
                                    style={{ backgroundColor: getTypeColor(entry.wordClass) }}
                                >
                                    {entry.wordClass}
                                </span>
                            </div>

                            {/* Translation */}
                            <div className="entry-translation">
                                {entry.translation}
                            </div>

                            {/* Tags */}
                            {entry.tags && entry.tags.length > 0 && (
                                <div className="entry-tags">
                                    {entry.tags.map((tag, i) => (
                                        <span 
                                            key={i} 
                                            className="entry-tag"
                                            onClick={() => setSearchQuery(tag)}
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="entry-actions">
                                <Button 
                                    variant="ipa" 
                                    onClick={() => handleListen(safeWord, entry.ipa)}
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

                                <div className="action-matrix">
                                    <Button 
                                        variant="save" 
                                        onClick={() => setSelectedWordForMatrix(entry)}>
                                        <Table2 size={14} /> Matrix
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* --- MODALS --- */}
            <Modal isOpen={!!selectedWordForMatrix} onClose={() => setSelectedWordForMatrix(null)} title="Word Inflection Matrix">
                <MatrixModal wordObj={selectedWordForMatrix} />
            </Modal>

            <Modal isOpen={!!selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} title="Edit Lexicon Entry">
                <EditWordModal wordObj={selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} />
            </Modal>
        </div>
    );
}