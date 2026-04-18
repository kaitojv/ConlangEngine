import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Card from '../../UI/Card/Card.jsx';
import Modal from '../../UI/Modal/Modal.jsx'
import MatrixModal from './MatrixModal.jsx';
import EditWordModal from './EditModal.jsx';
import { Search, Filter, Hash, Trash2, Edit, Volume2, Table2 } from 'lucide-react';
import './dictionaryList.css';

export default function DictionaryList() {
    // Grab the global stores for our dictionary and language settings
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const deleteWord = useLexiconStore((state) => state.deleteWord);
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    
    // Spin up the transliterator to convert base words into the language's custom script
    const { transliterate } = useTransliterator();

    // Let's bundle all our sorting and filtering logic into one neat state object
    const [filters, setFilters] = useState({
        search: '',
        type: 'all',
        letter: 'all',
        sort: 'newest'
    });

    // Track which words are currently selected for our popup modals
    const [selectedWordForMatrix, setSelectedWordForMatrix] = useState(null);
    const [selectedWordForEdit, setSelectedWordForEdit] = useState(null); 

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Extract all the unique first letters from the dictionary so we can build our A-Z quick jump bar
    const firstLetters = useMemo(() => {
        const letters = new Set(lexicon.map(w => w.word.replace(/\*/g, '').charAt(0).toUpperCase()));
        return [...letters].sort();
    }, [lexicon]);

    // Do the same for word classes (Noun, Verb, etc.) to populate the dropdown
    const uniqueClasses = useMemo(() => {
        const classes = new Set(lexicon.map(w => w.wordClass).filter(Boolean));
        return [...classes].sort();
    }, [lexicon]);

    // The heavy lifter: filters and sorts the entire dictionary based on the user's current selections
    const filteredLexicon = useMemo(() => {
        let result = [...lexicon];

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(e => 
                e.word.replace(/\*/g, '').toLowerCase().includes(q) || 
                e.translation.toLowerCase().includes(q) ||
                (e.tags && e.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }

        if (filters.type !== 'all') {
            result = result.filter(e => e.wordClass === filters.type);
        }

        if (filters.letter !== 'all') {
            result = result.filter(e => {
                const cleanWord = e.word.replace(/\*/g, '').toUpperCase();
                return cleanWord.startsWith(filters.letter.toUpperCase());
            });
        }

        if (filters.sort === 'newest') result.sort((a, b) => b.createdAt - a.createdAt);
        else if (filters.sort === 'oldest') result.sort((a, b) => a.createdAt - b.createdAt);
        else if (filters.sort === 'az') result.sort((a, b) => a.word.replace(/\*/g, '').localeCompare(b.word.replace(/\*/g, '')));
        else if (filters.sort === 'za') result.sort((a, b) => b.word.replace(/\*/g, '').localeCompare(a.word.replace(/\*/g, '')));

        return result;
    }, [lexicon, filters]);

    // Quick action to bin a word
    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this root?")) {
            deleteWord(id);
        }
    };

    // Try to pronounce the word using the browser's built-in text-to-speech
    const handleListen = (word) => {
        if (!('speechSynthesis' in window)) {
            return alert("Sorry, your browser doesn't support text-to-speech.");
        }
        if (!word) {
            return alert("This word is empty and cannot be pronounced.");
        }

        // Interrupt any ongoing speech so it doesn't queue up a dozen words if the user spams the button
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(word));
    };

    return (
        <div className="dictionary-container">
            
            <Card className="dictionary-toolbar">
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
                    </div>

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
                                {cls}
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
                <span className="list-total">
                    Total: <span className="text-[var(--acc2)]">{filteredLexicon.length}</span>
                </span>
            </div>

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

            <div className="dictionary-cards">
                {filteredLexicon.map((entry) => {
                    const safeWord = entry.word.replace(/\*/g, '');
                    const displayWord = transliterate(safeWord, lexicon);
                    
                    // Safely format the word class into a valid CSS class string (e.g. "proper noun" -> "proper-noun")
                    const safeClassBadge = entry.wordClass ? entry.wordClass.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 'other';

                    return (
                        <Card key={entry.id} className="dictionary-entry">
                            <div className="entry-header">
                                <div className="entry-words">
                                    <span className="notranslate entry-main-word custom-font-text">
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
                                
                                <span className={`word-class-badge badge-${safeClassBadge}`}>
                                    {entry.wordClass || 'Other'}
                                </span>
                            </div>

                            <div className="entry-translation">
                                {entry.translation}
                            </div>

                            {entry.tags && entry.tags.length > 0 && (
                                <div className="entry-tags">
                                    {entry.tags.map((tag, i) => (
                                        <span 
                                            key={i} 
                                            className="entry-tag"
                                            onClick={() => updateFilter('search', tag)}
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="entry-actions">
                                <Button 
                                    variant="ipa" 
                                    onClick={() => handleListen(safeWord)}
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

            <Modal isOpen={!!selectedWordForMatrix} onClose={() => setSelectedWordForMatrix(null)} title="Word Inflection Matrix">
                <MatrixModal wordObj={selectedWordForMatrix} />
            </Modal>

            <Modal isOpen={!!selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} title="Edit Lexicon Entry">
                <EditWordModal wordObj={selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} />
            </Modal>
        </div>
    );
}