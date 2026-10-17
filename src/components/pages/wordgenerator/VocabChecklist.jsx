import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { useWordGenerator } from '@/hooks/useWordGenerator.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '@/utils/morphologyEngine.jsx';
import { fetchDefinitionOptions } from '@/utils/semanticUtils.js';
import DefinitionSelectModal from '@/components/UI/Modal/DefinitionSelectModal.jsx';
import {
    vocabDatabase, VOCAB_LISTS, VOCAB_THEMES, VOCAB_CATEGORIES,
    getWords
} from '@/data/vocabDatabase.js';
import { buildLexiconIndex, checkWordInLexicon, getCategoryProgress } from '@/utils/lexiconMatcher.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import {
    Wand2, Send, Check, Dice5, Globe, Star, List, BookOpen,
    Leaf, Bird, Heart, Users, Zap, Wheat, Hammer, Brain, Clock, Layers, Hash,
    Type, Landmark, Search, Sparkles, ArrowLeft, ChevronLeft, ChevronRight,
    MessageSquare, Coins, ChevronDown, X, Filter, Dna
} from 'lucide-react';
import './vocabChecklist.css';

// ── Icon map for category chips & dropdown items ──────────────────────────
const CATEGORY_ICONS = {
    Globe, Star, List, BookOpen, Leaf, Bird, Heart, Users, Zap, Wheat,
    Hammer, Brain, Clock, Layers, Hash, Type, Landmark,
    MessageSquare, Coins, Sparkles, Filter
};

export default function VocabChecklist({ onExit }) {
    const { t } = useTranslation();
    const { generateWord } = useWordGenerator();
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(() => rawLexicon || [], [rawLexicon]);
    const { normalizeToBase, transliterate } = useTransliterator();
    const navigate = useNavigate();

    // Pull config store for derivations & morphological rules
    const rawGrammarRules = useConfigStore((state) => state.grammarRules);
    const grammarRules = useMemo(() => rawGrammarRules || [], [rawGrammarRules]);
    const vowels = useConfigStore((state) => state.vowels);
    const consonants = useConfigStore((state) => state.consonants);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);

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

    // Derivations modal state
    const [derivModalWord, setDerivModalWord] = useState(null);
    const [derivModalSelected, setDerivModalSelected] = useState({});

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

    // Roll single word for a row - strictly preserves the row's chosen part of speech!
    const handleRollRow = (englishWord, wordClass) => {
        const min = Math.min(minSyllables, maxSyllables);
        const max = Math.max(minSyllables, maxSyllables);
        const result = generateWord(min, max, wordClass);
        if (result && result.word) {
            updateRowEdit(englishWord, 'conlangWord', result.word);
            updateRowEdit(englishWord, 'wordClass', wordClass);
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
                const targetPOS = current?.wordClass || item.class;
                const res = generateWord(min, max, targetPOS);
                if (res && res.word) {
                    newEdits[item.word] = {
                        ...(current || {}),
                        conlangWord: res.word,
                        wordClass: targetPOS,
                    };
                    newSelected.add(item.word);
                    count++;
                }
            }
        });

        setWordEdits(newEdits);
        setSelectedEnglishWords(newSelected);
        if (count > 0) {
            toast.success(t('vocabChecklist.generatedCount', { count }));
        } else {
            toast(t('vocabChecklist.noEmptyRows'));
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
                toast(t('vocabChecklist.noDefFound'));
            }
        } catch {
            toast.error(t('vocabChecklist.failedDef'));
        } finally {
            setIsFetchingRowDef(false);
        }
    };

    // Quick-save single row directly into the Lexicon without navigating away
    const handleSaveSingleRow = (englishWord) => {
        const item = vocabDatabase.find(w => w.word === englishWord);
        const edit = getRowEdit(englishWord, item ? item.class : 'noun');
        if (!edit.conlangWord || !edit.conlangWord.trim()) {
            toast.error(t('vocabChecklist.enterConlangFirst', 'Please enter or roll a word first.'));
            return;
        }

        const cleanWord = normalizeToBase(edit.conlangWord.trim());
        const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(cleanWord, englishWord);
        if (isDuplicateWord || isDuplicateTranslation) {
            toast.error(t('vocabChecklist.duplicateWordOrTrans', 'Word or translation already exists in your lexicon.'));
            return;
        }

        const tags = edit.tags
            ? edit.tags.split(',').map(t => t.trim()).filter(Boolean)
            : (item && item.category ? [item.category] : []);

        addWord({
            word: cleanWord,
            wordClass: edit.wordClass || (item ? item.class : 'noun'),
            translation: englishWord,
            tags: tags,
            description: edit.description || ''
        });

        toast.success(t('vocabChecklist.savedSingle', {
            word: cleanWord,
            defaultValue: `Saved "${cleanWord}" to Lexicon!`
        }));
        setSelectedEnglishWords(prev => {
            const next = new Set(prev);
            next.delete(englishWord);
            return next;
        });
    };

    // Open derivations modal for single row
    const handleOpenDerivModal = (englishWord) => {
        const item = vocabDatabase.find(w => w.word === englishWord);
        const edit = getRowEdit(englishWord, item ? item.class : 'noun');
        if (!edit.conlangWord || !edit.conlangWord.trim()) {
            toast.error(t('vocabChecklist.enterConlangFirst', 'Please enter or roll a word first.'));
            return;
        }
        setDerivModalWord({
            englishWord,
            conlangWord: edit.conlangWord.trim(),
            wordClass: edit.wordClass || (item ? item.class : 'noun'),
            tags: edit.tags ? edit.tags.split(',').map(t => t.trim()).filter(Boolean) : (item && item.category ? [item.category] : []),
            description: edit.description || ''
        });
        setDerivModalSelected({});
    };

    // Compute candidate derivations for the active modal word
    const derivModalOptions = useMemo(() => {
        if (!derivModalWord || !derivModalWord.conlangWord) return [];

        const safeBaseWord = normalizeToBase(derivModalWord.conlangWord);
        if (!safeBaseWord) return [];

        let base = safeBaseWord;
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }
        if (derivModalWord.wordClass === 'verb' && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        const currentClasses = derivModalWord.wordClass
            ? derivModalWord.wordClass.split(',').map(c => c.trim().toLowerCase())
            : [];

        const hasExplicitDerivational = grammarRules.some(r => r.isDerivational);
        let candidateRules = hasExplicitDerivational
            ? grammarRules.filter(r => r.isDerivational)
            : grammarRules;

        candidateRules = expandWildcardDependencies(candidateRules, grammarRules);

        const results = [];
        candidateRules.forEach(rule => {
            const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            if (ruleClasses.includes('all') || currentClasses.length === 0 || currentClasses.some(cc => ruleClasses.includes(cc))) {
                const result = applyRuleToWord(base, rule, grammarRules, vowels, consonants, otherPhonemes);
                if (result) {
                    const transLabel = derivModalWord.englishWord
                        ? `${derivModalWord.englishWord} (${(rule.gloss || rule.name || 'Unnamed Rule').toLowerCase()})`
                        : `(${(rule.gloss || rule.name || 'Unnamed Rule').toLowerCase()})`;

                    let targetPOS = derivModalWord.wordClass;
                    if (rule.targetPOS) {
                        targetPOS = rule.targetPOS;
                    } else if (!ruleClasses.includes('all') && ruleClasses.length > 0) {
                        targetPOS = ruleClasses[0];
                    }

                    results.push({
                        derivedWord: result,
                        ruleName: rule.name || 'Unnamed Rule',
                        rule,
                        translationText: transLabel,
                        targetPOS
                    });
                }
            }
        });

        return results;
    }, [derivModalWord, grammarRules, vowels, consonants, otherPhonemes, verbMarker, cliticsRules, normalizeToBase]);

    // Save base word and any checked derivations directly into the Lexicon
    const handleSaveDerivModal = () => {
        if (!derivModalWord) return;

        const safeWord = normalizeToBase(derivModalWord.conlangWord);
        const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(safeWord, derivModalWord.englishWord);
        if (isDuplicateWord || isDuplicateTranslation) {
            toast.error(t('vocabChecklist.duplicateWordOrTrans', 'Word or translation already exists in your lexicon.'));
            return;
        }

        const rootId = Date.now() + Math.random();

        // 1. Add root word
        addWord({
            id: rootId,
            word: safeWord,
            wordClass: derivModalWord.wordClass,
            translation: derivModalWord.englishWord,
            tags: derivModalWord.tags,
            description: derivModalWord.description || ''
        });

        // 2. Add selected derivations
        let derivCount = 0;
        derivModalOptions.forEach((item, idx) => {
            if (derivModalSelected[idx]) {
                const safeDerivWord = normalizeToBase(item.derivedWord);
                const { isDuplicateWord: dupDeriv } = checkDuplicate(safeDerivWord, item.translationText);
                if (!dupDeriv) {
                    addWord({
                        word: safeDerivWord,
                        wordClass: item.targetPOS || derivModalWord.wordClass,
                        translation: item.translationText,
                        tags: derivModalWord.tags ? [...derivModalWord.tags, 'derived'] : ['derived'],
                        description: `Derivation of ${safeWord} (${item.ruleName})`,
                        relatedWords: [safeWord]
                    });
                    derivCount++;
                }
            }
        });

        if (derivCount > 0) {
            toast.success(t('vocabChecklist.savedWithDerivations', {
                word: safeWord,
                count: derivCount,
                defaultValue: `Saved "${safeWord}" and ${derivCount} derivations to Lexicon!`
            }));
        } else {
            toast.success(t('vocabChecklist.savedSingle', {
                word: safeWord,
                defaultValue: `Saved "${safeWord}" to Lexicon!`
            }));
        }

        setSelectedEnglishWords(prev => {
            const next = new Set(prev);
            next.delete(derivModalWord.englishWord);
            return next;
        });

        setDerivModalWord(null);
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
            toast.error(t('vocabChecklist.noWordsWithTrans'));
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
            toast.success(t('vocabChecklist.savedCount', { count: addedCount }));
            setSelectedEnglishWords(prev => {
                const next = new Set(prev);
                toSave.forEach(s => next.delete(s.englishWord));
                return next;
            });
        }
        if (dupCount > 0) {
            toast.error(t('vocabChecklist.skippedDuplicates', { count: dupCount }));
        }
    };

    // Send single to create word with all fields prefilled (including definition & tags)
    const handleSendRowToCreate = (englishWord, wordClass, conlangWord, description, tags) => {
        navigate('/create', {
            state: {
                prefillWord: conlangWord || '',
                prefillTranslation: englishWord,
                prefillClass: wordClass,
                prefillDefinition: description || '',
                prefillTags: tags || ''
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
                            <BookOpen size={20} /> {t('vocabChecklist.title')}
                        </h2>
                        <p className="vc-subtitle">
                            {t('vocabChecklist.subtitle')}
                        </p>
                    </div>
                    <Button variant="outline" onClick={onExit}>
                        <ArrowLeft size={16} /> {t('vocabChecklist.backToGenerator')}
                    </Button>
                </div>

                {/* ── Progress Stats & Bar ── */}
                <div className="vc-progress-block">
                    <div className="vc-progress-stats">
                        <div className="vc-stat">
                            <span className="vc-stat-value accent">{totalStats.created}</span>
                            <span className="vc-stat-label">{t('vocabChecklist.inLexicon')}</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value">{totalStats.uncreated}</span>
                            <span className="vc-stat-label">{t('vocabChecklist.uncreated')}</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value">{totalStats.total}</span>
                            <span className="vc-stat-label">{t('vocabChecklist.totalConcepts')}</span>
                        </div>
                        <div className="vc-stat-divider" />
                        <div className="vc-stat">
                            <span className="vc-stat-value accent">{totalStats.pct}%</span>
                            <span className="vc-stat-label">{t('vocabChecklist.coverage')}</span>
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
                                title={t(`vocabChecklist.lists.${list.id}`, list.desc)}
                            >
                                <IconComp size={14} className="vc-cat-chip-icon" />
                                <span>{t(`vocabChecklist.lists.${list.id}`, list.label)}</span>
                                <span className="vc-cat-badge">{badgeCount}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Filters Row ── */}
                <div className="vc-filter-row">
                    {/* Collapsed Semantic Theme Dropdown */}
                    <div className="vc-filter-group vc-theme-filter-group" ref={themeDropdownRef}>
                        <span className="vc-filter-label">{t('vocabChecklist.semanticTheme')}</span>
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
                                    <span>{t(`vocabChecklist.themes.${selectedThemeObj.id}`, selectedThemeObj.label)}</span>
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
                                    title={t('vocabChecklist.resetThemes')}
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
                                                    <span>{t(`vocabChecklist.themes.${theme.id}`, theme.label)}</span>
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
                        <span className="vc-filter-label">{t('vocabChecklist.searchVocab')}</span>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="vc-filter-input"
                                placeholder={t('vocabChecklist.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '28px' }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        </div>
                    </div>

                    <div className="vc-filter-group">
                        <span className="vc-filter-label">{t('vocabChecklist.partOfSpeech')}</span>
                        <select
                            className="vc-filter-input"
                            value={posFilter}
                            onChange={(e) => setPosFilter(e.target.value)}
                        >
                            <option value="all">{t('vocabChecklist.allClasses')}</option>
                            <option value="noun">{t('generator.noun')}</option>
                            <option value="verb">{t('generator.verb')}</option>
                            <option value="adjective">{t('generator.adjective')}</option>
                            <option value="adverb">{t('generator.adverb')}</option>
                            <option value="pronoun">{t('generator.pronoun')}</option>
                            <option value="conjunction">{t('vocabChecklist.pos.conjunction', 'Conjunction')}</option>
                            <option value="preposition">{t('vocabChecklist.pos.preposition', 'Preposition')}</option>
                            <option value="numeral">{t('vocabChecklist.pos.numeral', 'Numeral')}</option>
                            <option value="particle">{t('vocabChecklist.pos.particle', 'Particle')}</option>
                        </select>
                    </div>

                    <div className="vc-filter-group" style={{ minWidth: '150px' }}>
                        <span className="vc-filter-label">{t('vocabChecklist.syllables')}</span>
                        <div className="vc-syl-range">
                            <input
                                type="number"
                                min="1"
                                max="8"
                                className="vc-filter-input"
                                value={minSyllables}
                                onChange={(e) => setMinSyllables(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                            <span className="vc-syl-sep">{t('vocabChecklist.to')}</span>
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
                        <span>{t('vocabChecklist.onlyUncreated')}</span>
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
                            <Sparkles size={16} /> {t('vocabChecklist.genAllEmpty')}
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleSelectAllVisible}
                            disabled={visibleUncreated.length === 0}
                        >
                            {allVisibleSelected ? t('vocabChecklist.deselectAll') : t('vocabChecklist.selectAll')}
                        </Button>

                        <span className="vc-count-label">
                            {t('vocabChecklist.selectedCount', { count: selectedEnglishWords.size })}
                        </span>
                    </div>

                    <div className="vc-toolbar-right">
                        <Button
                            variant="save"
                            onClick={handleSaveSelected}
                            disabled={selectedEnglishWords.size === 0 || isSaving}
                        >
                            <Check size={16} /> {t('vocabChecklist.saveSelected', { count: selectedEnglishWords.size })}
                        </Button>
                    </div>
                </div>

                {/* ── Rows List ── */}
                {filteredWords.length === 0 ? (
                    <div className="vc-empty">
                        <p className="vc-empty-title">{t('vocabChecklist.noMatch')}</p>
                        <p className="vc-empty-desc">
                            {onlyUncreated
                                ? t('vocabChecklist.allPresent')
                                : t('vocabChecklist.tryFilter')}
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
                                            <span className="vc-pos-badge">
                                                {t(`vocabChecklist.pos.${(edit.wordClass || item.class).toLowerCase()}`, edit.wordClass || item.class)}
                                            </span>
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
                                                    <span>{t('vocabChecklist.inLexicon')}:</span>
                                                    <span className="vc-status-word notranslate">
                                                        "{lexiconEntry?.word}"
                                                    </span>
                                                </>
                                            ) : (
                                                <span>{t('vocabChecklist.notInLexicon')}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inputs */}
                                    <div className="vc-row-inputs">
                                        <div className="vc-input-row">
                                            <input
                                                type="text"
                                                className={`vc-conlang-input custom-font-text notranslate ${edit.conlangWord ? 'has-value' : ''}`}
                                                placeholder={isCreated ? t('vocabChecklist.existingPlaceholder', { word: lexiconEntry?.word }) : t('vocabChecklist.conlangPlaceholder')}
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
                                                <option value="noun">{t('generator.noun')}</option>
                                                <option value="verb">{t('generator.verb')}</option>
                                                <option value="adjective">{t('generator.adjective')}</option>
                                                <option value="adverb">{t('generator.adverb')}</option>
                                                <option value="pronoun">{t('generator.pronoun')}</option>
                                                <option value="conjunction">{t('vocabChecklist.pos.conjunction', 'Conjunction')}</option>
                                                <option value="preposition">{t('vocabChecklist.pos.preposition', 'Preposition')}</option>
                                                <option value="numeral">{t('vocabChecklist.pos.numeral', 'Numeral')}</option>
                                                <option value="particle">{t('vocabChecklist.pos.particle', 'Particle')}</option>
                                            </select>

                                            <div className="vc-row-actions">
                                                <button
                                                    type="button"
                                                    className="vc-icon-btn"
                                                    title={t('vocabChecklist.rollRandom')}
                                                    disabled={isCreated}
                                                    onClick={() => handleRollRow(item.word, edit.wordClass || item.class)}
                                                >
                                                    <Dice5 size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="vc-icon-btn vc-save-btn"
                                                    title={t('vocabChecklist.saveDirect', 'Quick save to Lexicon')}
                                                    disabled={isCreated || !edit.conlangWord?.trim()}
                                                    onClick={() => handleSaveSingleRow(item.word)}
                                                >
                                                    <Check size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="vc-icon-btn vc-deriv-btn"
                                                    title={t('vocabChecklist.saveWithDerivations', 'Save with Derivations/Declensions')}
                                                    disabled={isCreated || !edit.conlangWord?.trim()}
                                                    onClick={() => handleOpenDerivModal(item.word)}
                                                >
                                                    <Dna size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="vc-icon-btn"
                                                    title={t('vocabChecklist.sendToCreate', 'Open in Word Creator')}
                                                    onClick={() => handleSendRowToCreate(item.word, edit.wordClass || item.class, edit.conlangWord, edit.description, edit.tags)}
                                                >
                                                    <Send size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="vc-meta-row">
                                            <input
                                                type="text"
                                                className="vc-meta-input"
                                                placeholder={t('vocabChecklist.tagsPlaceholder')}
                                                value={edit.tags}
                                                disabled={isCreated}
                                                onChange={(e) => updateRowEdit(item.word, 'tags', e.target.value)}
                                            />
                                            <div className="vc-def-input-wrapper">
                                                <input
                                                    type="text"
                                                    className="vc-meta-input"
                                                    placeholder={t('vocabChecklist.descPlaceholder')}
                                                    value={edit.description}
                                                    disabled={isCreated}
                                                    onChange={(e) => updateRowEdit(item.word, 'description', e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="vc-icon-btn"
                                                    title={t('vocabChecklist.autoFillDef')}
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
                    <div className="vc-pagination">
                        <span className="vc-count-label">
                            {t('vocabChecklist.showingWords', {
                                start: page * PAGE_SIZE + 1,
                                end: Math.min((page + 1) * PAGE_SIZE, filteredWords.length),
                                total: filteredWords.length
                            })}
                        </span>
                        <div className="vc-pagination-controls">
                            <Button
                                variant="secondary"
                                disabled={page === 0}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                            >
                                <ChevronLeft size={16} /> {t('vocabChecklist.prev')}
                            </Button>
                            <span className="vc-page-indicator">
                                {t('vocabChecklist.pageOf', { current: page + 1, total: totalPages })}
                            </span>
                            <Button
                                variant="secondary"
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            >
                                {t('vocabChecklist.next')} <ChevronRight size={16} />
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
                        toast.success(t('vocabChecklist.defUpdated'));
                    }
                }}
            />

            {/* Derivations / Declensions Modal */}
            <Modal
                isOpen={!!derivModalWord}
                onClose={() => setDerivModalWord(null)}
                title={t('vocabChecklist.derivModalTitle', 'Save with Derivations & Declensions')}
                className="vc-deriv-modal"
            >
                {derivModalWord && (
                    <div className="vc-deriv-modal-body">
                        {/* Root word summary */}
                        <div className="vc-deriv-root-card">
                            <div className="vc-deriv-root-header">
                                <span className="vc-deriv-root-word custom-font-text notranslate">
                                    {transliterate(derivModalWord.conlangWord)}
                                </span>
                                <span className="vc-pos-badge">{derivModalWord.wordClass}</span>
                                <span className="vc-deriv-root-trans">"{derivModalWord.englishWord}"</span>
                            </div>
                            {derivModalWord.description && (
                                <p className="vc-deriv-root-desc">{derivModalWord.description}</p>
                            )}
                        </div>

                        {/* Derivations selection */}
                        <div className="vc-deriv-section-header">
                            <h4 className="vc-deriv-section-title">
                                {t('vocabChecklist.availableDerivations', 'Available Derivations / Declensions')}
                                {derivModalOptions.length > 0 && ` (${derivModalOptions.length})`}
                            </h4>
                            {derivModalOptions.length > 0 && (
                                <button
                                    type="button"
                                    className="vc-deriv-toggle-all-btn"
                                    onClick={() => {
                                        const allSelected = derivModalOptions.every((_, idx) => derivModalSelected[idx]);
                                        if (allSelected) {
                                            setDerivModalSelected({});
                                        } else {
                                            const next = {};
                                            derivModalOptions.forEach((_, idx) => { next[idx] = true; });
                                            setDerivModalSelected(next);
                                        }
                                    }}
                                >
                                    {derivModalOptions.every((_, idx) => derivModalSelected[idx])
                                        ? t('vocabChecklist.deselectAll', 'Deselect All')
                                        : t('vocabChecklist.selectAll', 'Select All')}
                                </button>
                            )}
                        </div>

                        {derivModalOptions.length === 0 ? (
                            <div className="vc-deriv-empty">
                                <p className="vc-deriv-empty-text">
                                    {t('vocabChecklist.noRulesForPOS', `No active grammar rules found that apply to "${derivModalWord.wordClass}". You can still save the base word directly.`)}
                                </p>
                            </div>
                        ) : (
                            <div className="vc-deriv-list">
                                {derivModalOptions.map((item, idx) => {
                                    const isChecked = !!derivModalSelected[idx];
                                    return (
                                        <label
                                            key={idx}
                                            className={`vc-deriv-item ${isChecked ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                    setDerivModalSelected(prev => ({
                                                        ...prev,
                                                        [idx]: !prev[idx]
                                                    }));
                                                }}
                                            />
                                            <div className="vc-deriv-item-content">
                                                <div className="vc-deriv-item-top">
                                                    <span className="vc-deriv-derived-word custom-font-text notranslate">
                                                        {transliterate(item.derivedWord)}
                                                    </span>
                                                    <span className="vc-deriv-rule-badge">
                                                        {item.ruleName}
                                                    </span>
                                                    {item.targetPOS && item.targetPOS !== derivModalWord.wordClass && (
                                                        <span className="vc-pos-badge">{item.targetPOS}</span>
                                                    )}
                                                </div>
                                                <span className="vc-deriv-trans-text">
                                                    {item.translationText}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* Modal Footer */}
                        <div className="vc-deriv-modal-footer">
                            <Button
                                variant="outline"
                                onClick={() => setDerivModalWord(null)}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="save"
                                onClick={handleSaveDerivModal}
                            >
                                <Check size={16} />
                                {Object.values(derivModalSelected).filter(Boolean).length > 0
                                    ? t('vocabChecklist.saveWithCount', {
                                        count: Object.values(derivModalSelected).filter(Boolean).length,
                                        defaultValue: `Save Word & ${Object.values(derivModalSelected).filter(Boolean).length} Derivations`
                                    })
                                    : t('vocabChecklist.saveRootOnly', 'Save Root Word Only')}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
