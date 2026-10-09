import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { RuleRow } from './RuleRow.jsx';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../../store/useLexiconStore.jsx';
import { useTranslation } from '../../../../hooks/useTranslation.jsx';
import { Plus, ListX, Search, X, ChevronDown, Layers, Wand2 } from 'lucide-react';
import './rulesManager.css';

const TEMPLATES = [
    { key: 'tmplPlural', name: 'Plural', affix: '-s', appliesTo: 'noun', gloss: 'PL', example: '-s' },
    { key: 'tmplPast', name: 'Past Tense', affix: '-ed', appliesTo: 'verb', gloss: 'PST', example: '-ed' },
    { key: 'tmplFuture', name: 'Future Tense', affix: '-ra', appliesTo: 'verb', gloss: 'FUT', example: '-ra' },
    { key: 'tmplAccusative', name: 'Accusative', affix: '-m', appliesTo: 'noun', gloss: 'ACC', example: '-m' },
    { key: 'tmplNegative', name: 'Negative', affix: 'un-', appliesTo: 'all', gloss: 'NEG', example: 'un-' },
    { key: 'tmplAgent', name: 'Agent Noun', affix: '-er', appliesTo: 'verb', targetPOS: 'noun', isDerivational: true, gloss: 'AGT', example: '-er' },
    { key: 'tmplMutation', name: 'Vowel Shift', affix: 'a => e', appliesTo: 'all', gloss: 'MUT', example: 'a => e' },
    { key: 'tmplBlank', name: '', affix: '', appliesTo: 'all', gloss: '', example: 'blank' },
];

const createRuleId = () => `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const RulesManager = () => {
    const { t } = useTranslation();
    const rawRules = useConfigStore((state) => state.grammarRules);
    const rules = useMemo(() => rawRules || [], [rawRules]);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const rawWordClasses = useConfigStore((state) => state.customWordClasses);
    const customWordClasses = useMemo(() => rawWordClasses || [], [rawWordClasses]);
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(() => rawLexicon || [], [rawLexicon]);

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    const templateMenuRef = useRef(null);

    // Close template menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
                setIsTemplateMenuOpen(false);
            }
        };
        if (isTemplateMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isTemplateMenuOpen]);

    const allWordClasses = useMemo(() => {
        const merged = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'particle', 'conjunction', 'preposition']);
        customWordClasses.forEach(cls => merged.add(cls));
        lexicon.forEach(w => {
            if (w.wordClass) {
                w.wordClass.split(',').forEach(cls => {
                    const clean = cls.trim().toLowerCase();
                    if (clean) merged.add(clean);
                });
            }
        });
        return [...merged].sort();
    }, [customWordClasses, lexicon]);

    // Add rule from template or blank
    const handleAddRule = (template = null) => {
        const newRule = {
            id: createRuleId(), 
            name: template?.name || '', 
            affix: template?.affix || '', 
            appliesTo: template?.appliesTo || 'all', 
            targetPOS: template?.targetPOS || '',
            condition: template?.condition || 'always',
            dependency: '', 
            standalone: false,
            applyToPersons: false,
            isDerivational: Boolean(template?.isDerivational),
            gloss: template?.gloss || '',
        };
        
        updateConfig({ grammarRules: [...rules, newRule] });
        setIsTemplateMenuOpen(false);
    };

    const handleDeleteRule = useCallback((idToDelete) => {
        updateConfig({ grammarRules: rules.filter(rule => rule.id !== idToDelete) });
    }, [rules, updateConfig]);

    const handleUpdateRule = useCallback((idToUpdate, fieldName, newValue) => {
        const updatedRules = rules.map(rule =>
            rule.id === idToUpdate ? { ...rule, [fieldName]: newValue } : rule
        );
        updateConfig({ grammarRules: updatedRules });
    }, [rules, updateConfig]);

    // Category counts
    const categoryCounts = useMemo(() => {
        const counts = {
            all: rules.length,
            noun: 0,
            verb: 0,
            adjective: 0,
            derivation: 0,
            sound: 0,
        };

        rules.forEach(r => {
            const applies = (r.appliesTo || '').toLowerCase();
            const target = (r.targetPOS || '').toLowerCase();
            const affix = (r.affix || '').toLowerCase();

            if (applies.includes('noun') || target.includes('noun')) counts.noun++;
            if (applies.includes('verb') || target.includes('verb')) counts.verb++;
            if (applies.includes('adj') || target.includes('adj') || applies.includes('adv')) counts.adjective++;
            if (r.isDerivational || (r.targetPOS && r.targetPOS !== r.appliesTo && r.appliesTo !== 'all')) counts.derivation++;
            if (affix.includes('=>')) counts.sound++;
        });

        return counts;
    }, [rules]);

    // Filtered rules based on category and search query
    const filteredRules = useMemo(() => {
        let result = rules;

        // 1. Category Filter
        if (selectedCategory === 'noun') {
            result = result.filter(r => (r.appliesTo || '').toLowerCase().includes('noun') || (r.targetPOS || '').toLowerCase().includes('noun'));
        } else if (selectedCategory === 'verb') {
            result = result.filter(r => (r.appliesTo || '').toLowerCase().includes('verb') || (r.targetPOS || '').toLowerCase().includes('verb'));
        } else if (selectedCategory === 'adjective') {
            result = result.filter(r => (r.appliesTo || '').toLowerCase().includes('adj') || (r.targetPOS || '').toLowerCase().includes('adj') || (r.appliesTo || '').toLowerCase().includes('adv'));
        } else if (selectedCategory === 'derivation') {
            result = result.filter(r => r.isDerivational || (r.targetPOS && r.targetPOS !== r.appliesTo && r.appliesTo !== 'all'));
        } else if (selectedCategory === 'sound') {
            result = result.filter(r => (r.affix || '').includes('=>'));
        }

        // 2. Search Query Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            result = result.filter(r => 
                (r.name || '').toLowerCase().includes(q) ||
                (r.affix || '').toLowerCase().includes(q) ||
                (r.gloss || '').toLowerCase().includes(q) ||
                (r.appliesTo || '').toLowerCase().includes(q) ||
                (r.targetPOS || '').toLowerCase().includes(q)
            );
        }

        return result;
    }, [rules, selectedCategory, searchQuery]);

    return (
        <div className="rules-manager-wrapper">
            {/* Toolbar: Category tabs + Search + Add button */}
            <div className="rules-toolbar">
                <div className="rules-category-bar">
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                    >
                        <span>{t('settings.grammar.catAll')}</span>
                        <span className="rules-category-count">{categoryCounts.all}</span>
                    </button>
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'noun' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('noun')}
                    >
                        <span>{t('settings.grammar.catNouns')}</span>
                        <span className="rules-category-count">{categoryCounts.noun}</span>
                    </button>
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'verb' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('verb')}
                    >
                        <span>{t('settings.grammar.catVerbs')}</span>
                        <span className="rules-category-count">{categoryCounts.verb}</span>
                    </button>
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'adjective' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('adjective')}
                    >
                        <span>{t('settings.grammar.catAdjectives')}</span>
                        <span className="rules-category-count">{categoryCounts.adjective}</span>
                    </button>
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'derivation' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('derivation')}
                    >
                        <span>{t('settings.grammar.catDerivations')}</span>
                        <span className="rules-category-count">{categoryCounts.derivation}</span>
                    </button>
                    <button 
                        type="button"
                        className={`rules-category-btn ${selectedCategory === 'sound' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('sound')}
                    >
                        <span>{t('settings.grammar.catSoundChanges')}</span>
                        <span className="rules-category-count">{categoryCounts.sound}</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Search Bar */}
                    <div className="rules-search-wrap">
                        <Search size={15} className="rules-search-icon" />
                        <input 
                            type="text" 
                            className="rules-search-input"
                            placeholder={t('settings.grammar.filterRulesPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                className="rules-search-clear"
                                onClick={() => setSearchQuery('')}
                                title={t('settings.grammar.clearFilter')}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Add Rule with Template Menu */}
                    <div className="rules-add-dropdown-wrapper" ref={templateMenuRef}>
                        <button 
                            type="button"
                            className="rules-add-main-btn"
                            onClick={() => setIsTemplateMenuOpen(prev => !prev)}
                        >
                            <Plus size={16} />
                            <span>{t('settings.grammar.addRule')}</span>
                            <ChevronDown size={14} />
                        </button>

                        {isTemplateMenuOpen && (
                            <div className="rules-template-menu">
                                <span className="rules-template-header">{t('settings.grammar.chooseTemplate')}</span>
                                {TEMPLATES.map((tmpl) => (
                                    <button
                                        key={tmpl.key}
                                        type="button"
                                        className="rules-template-item"
                                        onClick={() => handleAddRule(tmpl)}
                                    >
                                        <span>{t(`settings.grammar.${tmpl.key}`)}</span>
                                        <span className="rules-template-item-example">{tmpl.example}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rules List */}
            <div className="rules-container">
                {rules.length === 0 ? (
                    <div className="rules-empty-state">
                        <ListX size={44} className="empty-state-icon" />
                        <h3>{t('settings.grammar.noRulesTitle')}</h3>
                        <p>{t('settings.grammar.noRulesDesc')}</p>
                    </div>
                ) : filteredRules.length === 0 ? (
                    <div className="rules-empty-state">
                        <Search size={40} className="empty-state-icon" />
                        <h3>{t('settings.grammar.noMatchingTitle')}</h3>
                        <p>{t('settings.grammar.noMatchingDesc')}</p>
                    </div>
                ) : (
                    filteredRules.map(rule => (
                        <RuleRow
                            key={rule.id}
                            rule={rule}
                            onUpdate={handleUpdateRule}
                            onDelete={handleDeleteRule}
                            allWordClasses={allWordClasses}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default RulesManager;
