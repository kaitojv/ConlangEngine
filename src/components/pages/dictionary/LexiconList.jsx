import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { renderWordInScript } from '../../../utils/scriptRendering.js';
import { getScriptSystem, getDefaultScriptId } from '../../../utils/scriptResolver.js';
import Button from '../../UI/Buttons/Buttons.jsx';
import Card from '../../UI/Card/Card.jsx';
import Modal from '../../UI/Modal/Modal.jsx'
import LexiconEditModal from './LexiconEditModal.jsx';
import MatrixModal from './MatrixModal.jsx';
import ProtoRootModal from './ProtoRootModal.jsx';
import GlyphDetailsModal from '../../UI/GlyphDetailsModal/GlyphDetailsModal.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Search, Filter, Hash, Trash2, Edit, Volume2, Table2, PlusCircle, Settings2, Download, X, Share2, Music, Zap, LayoutGrid, List } from 'lucide-react';
import { exportTextAsSVG } from '../../../utils/svgExporter.jsx';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import toast from 'react-hot-toast';
import { supabase } from '../../../utils/supabaseClient.js';
import { useSharing } from '../../../hooks/useSharing.jsx';
import { computeProsody } from '../../../utils/prosodyEngine.jsx';
import { createPhonoMatcher } from '../../../utils/phonoSearch.js';
import { reverseDictScore } from '../../../utils/reverseDictionary.js';
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
    const grammarRules = useConfigStore(state => state.grammarRules) || [];
    const stressRules = useConfigStore(state => state.stressRules) || [];
    const toneRules = useConfigStore(state => state.toneRules) || [];
    const navigate = useNavigate();
    const location = useLocation();

    const [session, setSession] = React.useState(null);
    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    }, []);

    const { isSharing, handleShareLink } = useSharing(session);
    
    // New toggle for showing grammar rules as entries
    const [showBoundMorphemes, setShowBoundMorphemes] = useState(false);
    // Toggle for showing romanized form beneath the conscript in script modes
    const [showRomanization, setShowRomanization] = useState(false);
    // Grid vs List view mode
    const [layoutMode, setLayoutMode] = useState('list');
    const isScriptMode = ['syllabic', 'featural_block', 'logographic', 'featural', 'block'].includes(phonologyTypes);
    const scriptSystems = useConfigStore(state => state.scriptSystems) || [];
    const scriptRules = useConfigStore(state => state.scriptRules) || {};
    const configFull = useConfigStore();
    const defaultScriptId = scriptRules.defaultScriptId || 'default';
    
    // Spin up the transliterator to convert base words into the language's custom script
    const { transliterate, normalizeToBase } = useTransliterator();

    // Let's bundle all our sorting and filtering logic into one neat state object
    const [filters, setFilters] = useState({
        search: '',
        tag: 'all',
        type: 'all',
        letter: 'all',
        sort: 'newest',
        showTones: false,
        showRelated: true,
        showProtoRoots: false
    });

    // Track which words are currently selected for our popup modals
    const [selectedWordForMatrix, setSelectedWordForMatrix] = useState(null);
    const [selectedWordForEdit, setSelectedWordForEdit] = useState(null); 
    const [selectedWordForProto, setSelectedWordForProto] = useState(null);
    const [selectedGlyphDetails, setSelectedGlyphDetails] = useState(null);
    const [newSenseBase, setNewSenseBase] = useState(null);
    
    // Manage how many lexicon items are rendered at once for performance
    const [visibleCount, setVisibleCount] = useState(50);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setVisibleCount(50); // Reset visible count when filter changes
    };

    // Auto-search if we received a query from navigation (e.g. Command Palette)
    React.useEffect(() => {
        if (location.state && location.state.searchQuery) {
            updateFilter('search', location.state.searchQuery);
            // Clear the state so it doesn't re-trigger
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

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
            const rawQuery = filters.search.trim();
            if (rawQuery.startsWith('/') && rawQuery.length > 1) {
                // Phoneme pattern mode: /#st, /VnV, /[+voiced,fricative]V#  (# anchors word edges)
                const { match, error } = createPhonoMatcher(rawQuery, { consonants, vowels, otherPhonemes });
                result = error ? [] : result.filter(e => match(e)).map(e => ({ ...e, searchScore: 100 }));
            } else if (rawQuery.startsWith('=') && rawQuery.length > 1) {
                // Reverse dictionary mode: =happy also finds entries glossed "glad", "joyful", ...
                const meaningQuery = rawQuery.slice(1);
                result = result
                    .map(e => ({ ...e, searchScore: reverseDictScore(meaningQuery, e) }))
                    .filter(e => e.searchScore > 0);
            } else {
                const q = rawQuery.toLowerCase();
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
        }

        if (!filters.showProtoRoots) {
            result = result.filter(e => !e.isProtoRoot);
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
                const cleanWord = e.word.replace(/[*-]/g, '');
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
    }, [lexicon, filters, transliterate, showBoundMorphemes, grammarRules, normalizeToBase, consonants, vowels, otherPhonemes]);

    // Group identical conlang words visually so the user can see multiple senses under 1 dictionary entry
    const groupedLexicon = useMemo(() => {
        const groups = new Map();
        
        filteredLexicon.forEach(entry => {
            const key = (entry.word || '').replace(/\*/g, '').toLowerCase().trim();
            if (!groups.has(key)) {
                groups.set(key, { baseEntry: entry, senses: [] });
            }
            groups.get(key).senses.push(entry);
        });
        
        return Array.from(groups.values());
    }, [filteredLexicon]);

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

    // Try to pronounce the word using Azure TTS if configured, or fallback to the browser's built-in text-to-speech
    const handleListen = async (wordObj) => {
        const text = wordObj.word;
        if (!text) {
            return toast.error("This word is empty and cannot be pronounced.");
        }

        const cleanText = text.replace(/[.\-*]/g, '');
        const cleanIpa = wordObj.ipa ? wordObj.ipa.replace(/[.\-*]/g, '') : undefined;

        const config = useConfigStore.getState();
        if (config.azureTtsVoice) {
            const toastId = toast.loading("Generating audio...");
            try {
                await playAzureTTS({
                    text: cleanText,
                    ipa: cleanIpa, // This might be undefined, but Azure TTS utility handles it
                    voice: config.azureTtsVoice,
                    useIpa: config.azureTtsUseIpa
                });
                toast.dismiss(toastId);
            } catch (err) {
                toast.error("Azure TTS failed: " + err.message, { id: toastId });
                console.error(err);
            }
            return;
        }

        // Fallback to browser TTS
        if (!('speechSynthesis' in window)) {
            return toast.error("Sorry, your browser doesn't support text-to-speech.");
        }

        // Interrupt any ongoing speech so it doesn't queue up a dozen words if the user spams the button
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(cleanText));
    };

    return (
        <div className="lexicon-container">
            {selectedGlyphDetails && (
                <GlyphDetailsModal 
                    isOpen={!!selectedGlyphDetails} 
                    onClose={() => setSelectedGlyphDetails(null)} 
                    {...selectedGlyphDetails} 
                />
            )}
            
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
                    <label className="bound-toggle">
                        <input 
                            type="checkbox" 
                            className="bound-checkbox"
                            checked={filters.showRelated}
                            onChange={(e) => updateFilter('showRelated', e.target.checked)}
                        />
                        Related Words
                    </label>
                    <label className="bound-toggle">
                        <input 
                            type="checkbox" 
                            className="bound-checkbox"
                            checked={filters.showProtoRoots}
                            onChange={(e) => updateFilter('showProtoRoots', e.target.checked)}
                        />
                        Proto-Roots
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
                        <span className="list-total-count">{groupedLexicon.length}</span> words <span style={{fontSize: '0.75rem', opacity: 0.7}}>({filteredLexicon.length} entries)</span>
                    </span>
                    
                    <div className="layout-toggle-group">
                        <button 
                            className={`layout-toggle-btn ${layoutMode === 'list' ? 'active' : ''}`}
                            onClick={() => setLayoutMode('list')}
                            title="List View"
                        >
                            <List size={16} />
                        </button>
                        <button 
                            className={`layout-toggle-btn ${layoutMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setLayoutMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

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
                • <b>Sound Search:</b> Start with <code>/</code> to search by phonemes — <code>/#st</code> (starts with /st/), <code>/VnV</code>, <code>/[+voiced,fricative]V#</code>. <code>#</code> anchors word edges, <code>*</code> is a wildcard.<br />
                • <b>Reverse Dictionary:</b> Start with <code>=</code> to search by meaning — <code>=happy</code> also finds entries glossed "glad" or tagged with the same theme.<br />
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

            <div className={`lexicon-cards layout-${layoutMode}`}>
                {groupedLexicon.slice(0, visibleCount).map((group, groupIdx) => {
                    const baseEntry = group.baseEntry;
                    const senses = group.senses;
                    const safeWord = baseEntry.word.replace(/\*/g, '');
                    const displayWord = transliterate(safeWord, lexicon);

                    // Auto-compute prosody from rules if no manual values set
                    const computed = (filters.showTones && (!baseEntry.stress || !baseEntry.tone) && (stressRules.length > 0 || toneRules.length > 0))
                        ? computeProsody(safeWord, { vowels, stressRules, toneRules })
                        : null;
                    const displayStress = baseEntry.stress || (computed?.stress ?? '');
                    const displayTone = baseEntry.tone || (computed?.tone ?? '');
                    const isAutoComputed = (!baseEntry.stress && computed?.stress) || (!baseEntry.tone && computed?.tone);
                    
                    return (
                        <Card key={`${baseEntry.id}-${groupIdx}`} className="lexicon-entry">
                            <div className="entry-header">
                                <div className="entry-words">
                                    <div className="entry-word-with-wave" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
                                        {filters.showTones && <StressWave word={safeWord} stress={displayStress} tone={displayTone} customVowelsStr={useConfigStore.getState().vowels} />}
                                        <span 
                                            className={`notranslate entry-main-word custom-font-text ${phonologyTypes === 'featural_block' ? 'featural-block-render' : ''}`} 
                                            style={{ textAlign: 'center', cursor: 'pointer', transition: 'color 0.2s' }}
                                            onClick={() => setSelectedGlyphDetails({ 
                                                char: phonologyTypes === 'logographic' ? baseEntry.ideogram : safeWord, 
                                                glyph: displayWord, 
                                                type: phonologyTypes, 
                                                name: baseEntry.translation || baseEntry.word,
                                                isWord: true
                                            })}
                                            title="Click to analyze"
                                        >
                                            {displayWord}
                                        </span>
                                        {baseEntry.scriptOverride && scriptSystems.length > 1 && (
                                            <span className="script-badge-inline" title={`Script: ${getScriptSystem(configFull, baseEntry.scriptOverride).name}`}>
                                                {getScriptSystem(configFull, baseEntry.scriptOverride).name}
                                            </span>
                                        )}
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

                                    {baseEntry.ipa && (
                                        <span className="notranslate entry-ipa">
                                            /{baseEntry.ipa}/
                                        </span>
                                    )}

                                    {showRomanization && (
                                        <span className="entry-romanization">
                                            {transliterate(safeWord)}
                                        </span>
                                    )}

                                    {filters.showTones && displayTone && (
                                        <span className="notranslate entry-tone" style={{fontSize: '0.8rem', opacity: isAutoComputed && !baseEntry.tone ? 0.5 : 0.7, marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            <Music size={12} /> {displayTone} Tone{isAutoComputed && !baseEntry.tone ? ' (auto)' : ''}
                                        </span>
                                    )}

                                    {filters.showTones && displayStress && (
                                        <span className="notranslate entry-stress" style={{fontSize: '0.8rem', opacity: isAutoComputed && !baseEntry.stress ? 0.5 : 0.7, marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                                            <Zap size={12} /> {displayStress} Stress{isAutoComputed && !baseEntry.stress ? ' (auto)' : ''}
                                        </span>
                                    )}

                                    {(() => {
                                        const displayEtymology = senses.find(s => s.etymology)?.etymology;
                                        if (!displayEtymology) return null;
                                        return (
                                            <span className="notranslate entry-etymology-top" style={{fontSize: '0.75rem', color: 'var(--tx2)', marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--bd)', paddingLeft: '10px'}}>
                                                origin proto-root: 
                                                <span style={{ color: 'var(--acc)', cursor: 'pointer' }} title={displayEtymology.startsWith('project:') ? 'from mother language' : 'click to edit'}>
                                                    {displayEtymology.startsWith('project:') ? 'mother language root' : (rawLexicon.find(w => w.id === displayEtymology)?.word || 'Unknown')}
                                                </span>
                                            </span>
                                        );
                                    })()}
                                </div>
                                
                                <div className="entry-actions-top">
                                    <Button variant="default" className="btn-icon-only" onClick={() => setSelectedWordForProto(baseEntry)} title="Convert to Proto-Root">
                                        <Hash size={16} />
                                    </Button>
                                    <Button variant="listen" onClick={() => handleListen(baseEntry)} title="Listen" className="btn-icon-only">
                                        <Volume2 size={16} />
                                    </Button>
                                    <Button variant="edit" onClick={() => setNewSenseBase(baseEntry)} title="Add new definition" className="btn-icon-only">
                                        <PlusCircle size={16} />
                                    </Button>
                                    {phonologyTypes !== 'alphabetic' && (
                                        <Button variant="default" onClick={() => exportTextAsSVG(displayWord, `${safeWord}.svg`)} title="Download SVG" className="btn-icon-only">
                                            <Download size={16} />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="entry-senses">
                                {senses.map((entry, index) => (
                                    <div key={entry.id} className={`lexicon-sense-row ${senses.length > 1 ? 'has-multiple' : ''}`}>
                                        {senses.length > 1 && <div className="sense-index">{index + 1}.</div>}
                                        <div className="sense-content">
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
                                                <div className="entry-translation">{entry.translation}</div>
                                            </div>

                                            {entry.isProtoRoot && (
                                                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Hash size={12} /> This is a Proto-Root (Hidden from main Lexicon)
                                                </div>
                                            )}

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

                                            {filters.showRelated && entry.relatedWords && entry.relatedWords.length > 0 && (
                                                <div className="entry-related" style={{ marginTop: '0.5rem', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--tx2)' }}>Related:</span>
                                                    {entry.relatedWords.map((rw, i) => {
                                                        const cleanRw = rw.toLowerCase().trim();
                                                        // Check if this concept already exists in the lexicon
                                                        const exists = lexicon.some(e => 
                                                            (e.translation && e.translation.toLowerCase() === cleanRw) || 
                                                            (e.word && e.word.toLowerCase() === cleanRw)
                                                        );
                                                        
                                                        return (
                                                            <span 
                                                                key={i} 
                                                                className={`related-chip ${exists ? 'related-exists' : 'related-missing'}`}
                                                                title={exists ? 'View this word in lexicon' : 'Create this word'}
                                                                onClick={() => {
                                                                    if (exists) {
                                                                        updateFilter('search', '=' + rw);
                                                                    } else {
                                                                        navigate('/create', { state: { prefillTranslation: rw } });
                                                                    }
                                                                }}
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '12px',
                                                                    border: `1px solid ${exists ? 'var(--ok)' : '#ef4444'}`,
                                                                    color: exists ? 'var(--ok)' : '#ef4444',
                                                                    background: exists ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {rw}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="sense-actions">
                                            <button className="sense-btn" onClick={() => setSelectedWordForEdit(entry)} title="Edit Entry"><Edit size={14}/></button>
                                            <button className="sense-btn" onClick={() => setSelectedWordForMatrix(entry)} title="Inflection Matrix"><Table2 size={14}/></button>
                                            <button className="sense-btn sense-btn-err" onClick={() => handleDelete(entry.id)} title="Delete Entry"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {visibleCount < groupedLexicon.length && (
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                    <Button variant="sec" onClick={() => setVisibleCount(prev => prev + 50)}>
                        Load More Words
                    </Button>
                </div>
            )}

            <ProtoRootModal 
                isOpen={!!selectedWordForProto} 
                onClose={() => setSelectedWordForProto(null)} 
                oldWord={selectedWordForProto} 
            />

            <Modal isOpen={!!selectedWordForMatrix} onClose={() => setSelectedWordForMatrix(null)} title="Word Inflection Matrix">
                <MatrixModal key={selectedWordForMatrix?.id} wordObj={selectedWordForMatrix} />
            </Modal>

            <Modal isOpen={!!selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} title="Edit Lexicon Entry">
                <LexiconEditModal key={selectedWordForEdit?.id} wordObj={selectedWordForEdit} onClose={() => setSelectedWordForEdit(null)} />
            </Modal>

            <Modal isOpen={!!newSenseBase} onClose={() => setNewSenseBase(null)} title="Add New Definition">
                {newSenseBase && (
                    <LexiconEditModal 
                        key={`sense-${newSenseBase.id}`} 
                        wordObj={{ 
                            ...newSenseBase, 
                            id: null,
                            translation: '', 
                            definition: '', 
                            tags: [],
                            wordClass: ''
                        }} 
                        mode="addSense"
                        onClose={() => setNewSenseBase(null)} 
                    />
                )}
            </Modal>
        </div>
    );
}