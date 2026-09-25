import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { fetchDefinitionOptions } from '@/utils/semanticUtils.js';
import DefinitionSelectModal from '@/components/UI/Modal/DefinitionSelectModal.jsx';
import {
    vocabDatabase, VOCAB_LISTS, VOCAB_THEMES, VOCAB_CATEGORIES,
    getWords, getWordsByCategory
} from '@/data/vocabDatabase.js';
import { buildLexiconIndex, checkWordInLexicon, getCategoryProgress } from '@/utils/lexiconMatcher.js';
import toast from 'react-hot-toast';
import {
    Wand2, Send, Check, Dice5, Globe, Star, List, BookOpen,
    Leaf, Bird, Heart, Users, Zap, Wheat, Hammer, Brain, Clock, Layers, Hash,
    Type, Landmark, Search, Sparkles, ArrowLeft, ChevronLeft, ChevronRight,
    MessageSquare, Coins, ChevronDown, X, Filter
} from 'lucide-react';
import './vocabChecklist.css';

// ── Icon map for category chips & dropdown items ──────────────────────────
const CATEGORY_ICONS = {
    Globe, Star, List, BookOpen, Leaf, Bird, Heart, Users, Zap, Wheat,
    Hammer, Brain, Clock, Layers, Hash, Type, Landmark,
    MessageSquare, Coins, Sparkles, Filter
};

export default function VocabChecklist({ onExit }) {
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { normalizeToBase } = useTransliterator();
    const navigate = useNavigate();

    // Generation settings
    const [minSyllables, setMinSyllables] = useState(2);
    const [maxSyllables, setMaxSyllables] = useState(3);

    // Filtering: List Tiers & Collapsible Semantic Themes
    const [selectedList, setSelectedList] = useState('all');
    const [selectedTheme, setSelectedTheme] = useState('all');
    const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
    const themeDropdownRef = useRef(null);

    const [onlyUncreated, setOnlyUncreated] = useState(true);
    const [posFilter, setPosFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 30;

    // Word edits map: { [englishWord]: { conlangWord, wordClass, tags, description } }
    const [wordEdits, setWordEdits] = useState({});
    // Selected English words for bulk save
    const [selectedEnglishWords, setSelectedEnglishWords] = useState(new Set());

    // Definition modal state
    const [activeDefWord, setActiveDefWord] = useState(null);
    const [defModalTarget, setDefModalTarget] = useState({ word: '', pos: '' });
    const [defModalOptions, setDefModalOptions] = useState([]);
    const [isFetchingRowDef, setIsFetchingRowDef] = useState(false);
    const [isDefModalOpen, setIsDefModalOpen] = useState(false);

    // Close theme dropdown on outside click or Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target)) {
                setIsThemeDropdownOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsThemeDropdownOpen(false);
            }
        };
        if (isThemeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isThemeDropdownOpen]);

    // Build O(1) lexicon lookup index
    const lexiconIndex = useMemo(() => buildLexiconIndex(lexicon), [lexicon]);

    // List progress stats map
    const listStats = useMemo(() => {
        const stats = {};
        for (const l of VOCAB_LISTS) {
            const words = getWords(l.id, 'all');
            stats[l.id] = getCategoryProgress(words, lexiconIndex);
        }
        return stats;
    }, [lexiconIndex]);

    // Theme progress map (scoped to active list if one is selected)
    const themeStats = useMemo(() => {
        const stats = {};
        for (const t of VOCAB_THEMES) {
            const words = getWords(selectedList, t.id);
            stats[t.id] = getCategoryProgress(words, lexiconIndex);
        }
        return stats;
    }, [selectedList, lexiconIndex]);

    // Words in current scope (List + Theme)
    const scopedWords = useMemo(() => {
        return getWords(selectedList, selectedTheme);
    }, [selectedList, selectedTheme]);

    // Active scope progress stats for the progress bar & numbers
    const totalStats = useMemo(() => {
        return getCategoryProgress(scopedWords, lexiconIndex);
    }, [scopedWords, lexiconIndex]);

    // Filtered words
    const filteredWords = useMemo(() => {
        return scopedWords.filter(item => {
            const { isCreated } = checkWordInLexicon(item.word, lexiconIndex);

            // Filter: only uncreated
            if (onlyUncreated && isCreated) return false;

            // Filter: POS
            if (posFilter !== 'all' && item.class !== posFilter) return false;

            // Filter: Search
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase().trim();
                const matchesWord = item.word.toLowerCase().includes(q);
                const matchesCategory = (item.category || '').toLowerCase().includes(q);
                const matchesClass = (item.class || '').toLowerCase().includes(q);
                if (!matchesWord && !matchesCategory && !matchesClass) return false;
            }

            return true;
        });
    }, [scopedWords, onlyUncreated, posFilter, searchTerm, lexiconIndex]);

    // Reset pagination when filter changes
    useEffect(() => {
        setPage(0);
    }, [selectedList, selectedTheme, onlyUncreated, posFilter, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
    const paginatedWords = useMemo(() => {
        const start = page * PAGE_SIZE;
        return filteredWords.slice(start, start + PAGE_SIZE);
    }, [filteredWords, page, PAGE_SIZE]);

    // Row helpers
    const getRowEdit = (englishWord, fallbackClass) => {
        return wordEdits[englishWord] || { conlangWord: '', wordClass: fallbackClass, tags: '', description: '' };
    };

    const updateRowEdit = (englishWord, field, value) => {
        setWordEdits(prev => {
            const current = prev[englishWord] || { conlangWord: '', wordClass: '', tags: '', description: '' };
            return {
                ...prev,
                [englishWord]: {
                    ...current,
                    [field]: value
                }
            };
        });
    };

    const handleToggleSelect = (englishWord) => {
        setSelectedEnglishWords(prev => {
            const next = new Set(prev);
            if (next.has(englishWord)) next.delete(englishWord);
            else next.add(englishWord);
            return next;
        });
    };

    const handleSelectAllVisible = () => {
        const visibleUncreated = paginatedWords.filter(w => !checkWordInLexicon(w.word, lexiconIndex).isCreated);
        const allSelected = visibleUncreated.length > 0 && visibleUncreated.every(w => selectedEnglishWords.has(w.word));

        setSelectedEnglishWords(prev => {
            const next = new Set(prev);
            if (allSelected) {
                visibleUncreated.forEach(w => next.delete(w.word));
            } else {
                visibleUncreated.forEach(w => next.add(w.word));
            }
            return next;
        });
    };

    // Roll single word for a row
    const handleRollRow = (englishWord, wordClass) => {
        const min = Math.min(minSyllables, maxSyllables);
        const max = Math.max(minSyllables, maxSyllables);
        const result = generateWord(min, max, wordClass);
        if (result && result.word) {
            updateRowEdit(englishWord, 'conlangWord', result.word);
            updateRowEdit(englishWord, 'wordClass', result.wordClass || wordClass);
            setSelectedEnglishWords(prev => new Set(prev).add(englishWord));
        }
    };

    // Batch generate for visible empty rows
    const handleGenerateAllEmpty = () => {
        let count = 0;
        const min = Math.min(minSyllables, maxSyllables);
        const max = Math.max(minSyllables, maxSyllables);

        const newEdits = { ...wordEdits };
        const newSelected = new Set(selectedEnglishWords);

        paginatedWords.forEach(item => {
            const status = checkWordInLexicon(item.word, lexiconIndex);
            if (status.isCreated) return;

            const current = newEdits[item.word];
            if (!current || !current.conlangWord.trim()) {
                const res = generateWord(min, max, item.class);
                if (res && res.word) {
                    newEdits[item.word] = {
                        ...(current || {}),
                        conlangWord: res.word,
                        wordClass: res.wordClass || item.class,
                    };
                    newSelected.add(item.word);
                    count++;
                }
            }
        });

        setWordEdits(newEdits);
        setSelectedEnglishWords(newSelected);
        if (count > 0) {
            toast.success(`Generated ${count} words!`);
        } else {
            toast('No empty rows on this page to generate.');
        }
    };

    // Auto-fetch definition modal
    const handleFetchRowDef = async (englishWord, wordClass) => {
        setIsFetchingRowDef(true);
        setDefModalTarget({ word: englishWord, pos: wordClass });
        setActiveDefWord(englishWord);
        setDefModalOptions([]);
        setIsDefModalOpen(true);
        try {
            const options = await fetchDefinitionOptions(englishWord);
            if (options && options.length > 0) {
                setDefModalOptions(options);
            } else {
                toast('No definition found for this word.');
            }
        } catch {
            toast.error('Failed to fetch definition options.');
        } finally {
            setIsFetchingRowDef(false);
        }
    };

    // Save selected to lexicon
    const [isSaving, setIsSaving] = useState(false);
    const handleSaveSelected = () => {
        const toSave = [];
        selectedEnglishWords.forEach(englishWord => {
            const edit = wordEdits[englishWord];
            if (edit && edit.conlangWord && edit.conlangWord.trim()) {
                const item = vocabDatabase.find(w => w.word === englishWord);
                toSave.push({
                    englishWord,
                    conlangWord: edit.conlangWord.trim(),
                    wordClass: edit.wordClass || (item ? item.class : 'noun'),
                    tags: edit.tags ? edit.tags.split(',').map(t => t.trim()).filter(Boolean) : (item && item.category ? [item.category] : []),
                    description: edit.description || ''
                });
            }
        });

        if (toSave.length === 0) {
            toast.error('No selected words have a conlang translation.');
            return;
        }

        setIsSaving(true);
        let addedCount = 0;
        let dupCount = 0;

        for (const row of toSave) {
            const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(row.conlangWord, row.englishWord);
            if (isDuplicateWord || isDuplicateTranslation) {
                dupCount++;
                continue;
            }

            const safeWord = normalizeToBase(row.conlangWord);
            addWord({
                word: safeWord,
                wordClass: row.wordClass,
                translation: row.englishWord,
                tags: row.tags,
                description: row.description
            });
            addedCount++;
        }

        setIsSaving(false);
        if (addedCount > 0) {
            toast.success(`Saved ${addedCount} words to your lexicon!`);
            setSelectedEnglishWords(prev => {
                const next = new Set(prev);
                toSave.forEach(s => next.delete(s.englishWord));
                return next;
            });
        }
        if (dupCount > 0) {
            toast.error(`${dupCount} words were skipped because they already exist in the lexicon.`);
        }
    };

    // Send single to create word
    const handleSendRowToCreate = (englishWord, wordClass, conlangWord) => {
        navigate('/create', {
            state: {
                prefillWord: conlangWord || '',
                prefillTranslation: englishWord,
                prefillClass: wordClass
            }
        });
    };

    const visibleUncreated = paginatedWords.filter(w => !checkWordInLexicon(w.word, lexiconIndex).isCreated);
    const allVisibleSelected = visibleUncreated.length > 0 && visibleUncreated.every(w => selectedEnglishWords.has(w.word));

    const selectedThemeObj = useMemo(() => {
        return VOCAB_THEMES.find(t => t.id === selectedTheme) || VOCAB_THEMES[0];
    }, [selectedTheme]);

    const SelectedThemeIcon = CATEGORY_ICONS[selectedThemeObj.icon] || Globe;
    const activeThemeBadge = onlyUncreated
        ? (themeStats[selectedTheme]?.uncreated ?? 0)
        : (themeStats[selectedTheme]?.total ?? 0);

    return (
        <div className="vc-container">
            <Card>
                {/* ── Header ── */}
                <div className="vc-header">
                    <div className="vc-header-left">
                        <h2 className="vc-title">
                            <BookOpen size={20} /> Vocab Checklist
                        </h2>
                        <p className="vc-subtitle">
                            Curated conlang vocabulary database organized by semantic domains and frequency lists.
                        </p>
                    </div>
                    <Button variant="outline" onClick={onExit}>
                        <ArrowLeft size={16} /> Back to Generator
                    </Button>
                </div>

                {/* ── Progress Stats & Bar ── */}
                <div className="vc-progress-block">
                    <div className="vc-progress-stats">
                        <div className="vc-stat">
                            <span className="vc-stat-value accent">{totalStats.created}</span>
                            <span className="vc-stat-label">In Lexicon</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value">{totalStats.uncreated}</span>
                            <span className="vc-stat-label">Uncreated</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value">{totalStats.total}</span>
                            <span className="vc-stat-label">Total Concepts</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value accent">{totalStats.pct}%</span>
                            <span className="vc-stat-label">Coverage</span>
                        </div>
                    </div>
                    <div className="vc-progress-bar">
                        <div className="vc-progress-fill" style={{ width: `${totalStats.pct}%` }} />
                    </div>
                </div>

                {/* ── List / Tier Navigation Pills ── */}
                <div className="vc-list-nav">
                    {VOCAB_LISTS.map(list => {
                        const IconComp = CATEGORY_ICONS[list.icon] || Globe;
                        const stats = listStats[list.id] || { total: 0, created: 0, uncreated: 0 };
                        const isActive = selectedList === list.id;
                        const badgeCount = onlyUncreated ? stats.uncreated : stats.total;
                        const isPhraseBuilder = list.id === 'phrase-builder';

                        return (
                            <button
                                key={list.id}
                                type="button"
                                className={`vc-cat-chip ${isActive ? 'active' : ''} ${isPhraseBuilder ? 'phrase-builder-chip' : ''}`}
                                onClick={() => setSelectedList(list.id)}
                                title={list.desc}
                            >
                                <IconComp size={14} className="vc-cat-chip-icon" />
                                <span>{list.label}</span>
                                <span className="vc-cat-badge">{badgeCount}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Filters Row ── */}
                <div className="vc-filter-row">
                    {/* Collapsed Semantic Theme Dropdown */}
                    <div className="vc-filter-group vc-theme-filter-group" ref={themeDropdownRef}>
                        <span className="vc-filter-label">Semantic Theme</span>
                        <div className="vc-theme-dropdown-wrapper">
                            <button
                                type="button"
                                className={`vc-filter-input vc-theme-dropdown-btn ${selectedTheme !== 'all' ? 'active-theme' : ''}`}
                                onClick={() => setIsThemeDropdownOpen(prev => !prev)}
                                aria-haspopup="listbox"
                                aria-expanded={isThemeDropdownOpen}
                            >
                                <div className="vc-theme-btn-text">
                                    <SelectedThemeIcon size={14} className="vc-theme-icon" />
                                    <span>{selectedThemeObj.label}</span>
                                </div>
                                <div className="vc-theme-btn-end">
                                    <span className="vc-cat-badge">{activeThemeBadge}</span>
                                    <ChevronDown size={14} className={`vc-theme-chevron ${isThemeDropdownOpen ? 'rotated' : ''}`} />
                                </div>
                            </button>
                            {selectedTheme !== 'all' && (
                                <button
                                    type="button"
                                    className="vc-theme-clear-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTheme('all');
                                    }}
                                    title="Reset to All Themes"
                                >
                                    <X size={12} />
                                </button>
                            )}
                            {isThemeDropdownOpen && (
                                <div className="vc-theme-menu" role="listbox">
                                    {VOCAB_THEMES.map(theme => {
                                        const IconComp = CATEGORY_ICONS[theme.icon] || Globe;
                                        const stats = themeStats[theme.id] || { total: 0, created: 0, uncreated: 0 };
                                        const isSelected = selectedTheme === theme.id;
                                        const badgeCount = onlyUncreated ? stats.uncreated : stats.total;

                                        return (
                                            <button
                                                key={theme.id}
                                                type="button"
                                                className={`vc-theme-menu-item ${isSelected ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedTheme(theme.id);
                                                    setIsThemeDropdownOpen(false);
                                                }}
                                                role="option"
                                                aria-selected={isSelected}
                                            >
                                                <div className="vc-theme-menu-item-left">
                                                    <IconComp size={14} className="vc-theme-item-icon" />
                                                    <span>{theme.label}</span>
                                                </div>
                                                <span className="vc-cat-badge">{badgeCount}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="vc-filter-group" style={{ flex: 2 }}>
                        <span className="vc-filter-label">Search Vocabulary</span>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="vc-filter-input"
                                placeholder="Search word, category, or POS..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '28px' }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        </div>
                    </div>

                    <div className="vc-filter-group">
                        <span className="vc-filter-label">Part of Speech</span>
                        <select
                            className="vc-filter-input"
                            value={posFilter}
                            onChange={(e) => setPosFilter(e.target.value)}
                        >
                            <option value="all">All Classes</option>
                            <option value="noun">Noun</option>
                            <option value="verb">Verb</option>
                            <option value="adjective">Adjective</option>
                            <option value="adverb">Adverb</option>
                            <option value="pronoun">Pronoun</option>
                            <option value="conjunction">Conjunction</option>
                            <option value="preposition">Preposition</option>
                            <option value="numeral">Numeral</option>
                            <option value="particle">Particle</option>
                        </select>
                    </div>

                    <div className="vc-filter-group" style={{ minWidth: '150px' }}>
                        <span className="vc-filter-label">Syllables (Min - Max)</span>
                        <div className="vc-syl-range">
                            <input
                                type="number"
                                min="1"
                                max="8"
                                className="vc-filter-input"
                                value={minSyllables}
                                onChange={(e) => setMinSyllables(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                            <span className="vc-syl-sep">to</span>
                            <input
                                type="number"
                                min="1"
                                max="8"
                                className="vc-filter-input"
                                value={maxSyllables}
                                onChange={(e) => setMaxSyllables(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Toggle Row ── */}
                <div className="vc-toggle-row">
                    <label className="vc-toggle-label">
                        <input
                            type="checkbox"
                            checked={onlyUncreated}
                            onChange={(e) => setOnlyUncreated(e.target.checked)}
                        />
                        <span>Only Uncreated Words</span>
                    </label>
                </div>

                {/* ── Batch Toolbar ── */}
                <div className="vc-toolbar">
                    <div className="vc-toolbar-left">
                        <Button
                            variant="imp"
                            onClick={handleGenerateAllEmpty}
                            disabled={visibleUncreated.length === 0}
                        >
                            <Sparkles size={16} /> Generate for All Empty
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleSelectAllVisible}
                            disabled={visibleUncreated.length === 0}
                        >
                            {allVisibleSelected ? 'Deselect All' : 'Select All Visible'}
                        </Button>

                        <span className="vc-count-label">
                            Selected: <strong>{selectedEnglishWords.size}</strong>
                        </span>
                    </div>

                    <div className="vc-toolbar-right">
                        <Button
                            variant="save"
                            onClick={handleSaveSelected}
                            disabled={selectedEnglishWords.size === 0 || isSaving}
                        >
                            <Check size={16} /> Save Selected ({selectedEnglishWords.size})
                        </Button>
                    </div>
                </div>

                {/* ── Rows List ── */}
                {filteredWords.length === 0 ? (
                    <div className="vc-empty">
                        <p className="vc-empty-title">No words match the selected filters.</p>
                        <p className="vc-empty-desc">
                            {onlyUncreated
                                ? 'All words in this category are already present in your lexicon! Toggle "Only Uncreated Words" to view them.'
                                : 'Try changing your search query or selected category.'}
                        </p>
                    </div>
                ) : (
                    <div className="vc-rows">
                        {paginatedWords.map(item => {
                            const { isCreated, lexiconEntry } = checkWordInLexicon(item.word, lexiconIndex);
                            const edit = getRowEdit(item.word, item.class);
                            const isSelected = selectedEnglishWords.has(item.word);

                            return (
                                <div
                                    key={item.word}
                                    className={`vc-row ${isSelected ? 'selected' : ''} ${isCreated ? 'created' : ''}`}
                                >
                                    {/* Checkbox */}
                                    <div className="vc-row-check">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isCreated}
                                            onChange={() => handleToggleSelect(item.word)}
                                        />
                                    </div>

                                    {/* English word & meta */}
                                    <div className="vc-row-english">
                                        <span className="vc-english-word">{item.word}</span>
                                        <div className="vc-row-meta">
                                            <span className="vc-pos-badge">{edit.wordClass || item.class}</span>
                                            {item.lists && item.lists.map(listId => (
                                                <span key={listId} className="vc-list-badge">
                                                    {listId.replace('swadesh-', 'S-').replace('leipzig-jakarta', 'LJ')}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Status */}
                                        <div className={`vc-status ${isCreated ? 'created' : 'uncreated'}`}>
                                            {isCreated ? (
                                                <>
                                                    <Check size={12} />
                                                    <span>In Lexicon:</span>
                                                    <span className="vc-status-word notranslate">
                                                        "{lexiconEntry?.word}"
                                                    </span>
                                                </>
                                            ) : (
                                                <span>Not in Lexicon</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inputs */}
                                    <div className="vc-row-inputs">
                                        <div className="vc-input-row">
                                            <input
                                                type="text"
                                                className={`vc-conlang-input custom-font-text notranslate ${edit.conlangWord ? 'has-value' : ''}`}
                                                placeholder={isCreated ? `Existing: ${lexiconEntry?.word}` : 'Conlang word...'}
                                                value={edit.conlangWord}
                                                disabled={isCreated}
                                                onChange={(e) => {
                                                    updateRowEdit(item.word, 'conlangWord', e.target.value);
                                                    if (e.target.value.trim() && !selectedEnglishWords.has(item.word)) {
                                                        setSelectedEnglishWords(prev => new Set(prev).add(item.word));
                                                    }
                                                }}
                                            />

                                            <select
                                                className="vc-row-select"
                                                value={edit.wordClass || item.class}
                                                disabled={isCreated}
                                                onChange={(e) => updateRowEdit(item.word, 'wordClass', e.target.value)}
                                            >
                                                <option value="noun">Noun</option>
                                                <option value="verb">Verb</option>
                                                <option value="adjective">Adjective</option>
                                                <option value="adverb">Adverb</option>
                                                <option value="pronoun">Pronoun</option>
                                                <option value="numeral">Numeral</option>
                                                <option value="particle">Particle</option>
                                            </select>

                                            <button
                                                type="button"
                                                className="vc-icon-btn"
                                                title="Roll random valid word"
                                                disabled={isCreated}
                                                onClick={() => handleRollRow(item.word, edit.wordClass || item.class)}
                                            >
                                                <Dice5 size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className="vc-icon-btn"
                                                title="Send to Create Word"
                                                onClick={() => handleSendRowToCreate(item.word, edit.wordClass || item.class, edit.conlangWord)}
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>

                                        <div className="vc-meta-row">
                                            <input
                                                type="text"
                                                className="vc-meta-input"
                                                placeholder="Tags (comma separated)..."
                                                value={edit.tags}
                                                disabled={isCreated}
                                                onChange={(e) => updateRowEdit(item.word, 'tags', e.target.value)}
                                            />
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    className="vc-meta-input"
                                                    placeholder="Description..."
                                                    value={edit.description}
                                                    disabled={isCreated}
                                                    onChange={(e) => updateRowEdit(item.word, 'description', e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="vc-icon-btn"
                                                    title="Auto-fill definition options"
                                                    disabled={isCreated || (isFetchingRowDef && activeDefWord === item.word)}
                                                    onClick={() => handleFetchRowDef(item.word, edit.wordClass || item.class)}
                                                >
                                                    <Wand2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Pagination Controls ── */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}>
                        <span className="vc-count-label">
                            Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, filteredWords.length)} of {filteredWords.length} words
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Button
                                variant="secondary"
                                disabled={page === 0}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                            >
                                <ChevronLeft size={16} /> Prev
                            </Button>
                            <span style={{ fontSize: '0.82rem', color: 'var(--tx2)', padding: '0 8px' }}>
                                Page {page + 1} of {totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            >
                                Next <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Definition lookup modal */}
            <DefinitionSelectModal
                isOpen={isDefModalOpen}
                onClose={() => setIsDefModalOpen(false)}
                translation={defModalTarget.word}
                wordClass={defModalTarget.pos}
                definitions={defModalOptions}
                isLoading={isFetchingRowDef}
                onSelectDefinition={(selectedDef) => {
                    if (activeDefWord) {
                        updateRowEdit(activeDefWord, 'description', selectedDef);
                        toast.success('Definition updated!');
                    }
                }}
            />
        </div>
    );
}
