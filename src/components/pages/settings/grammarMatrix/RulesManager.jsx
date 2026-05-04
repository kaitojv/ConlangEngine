import React, { useCallback } from 'react';
import { RuleRow } from './RuleRow.jsx';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../../store/useLexiconStore.jsx';
import Button from '../../../UI/Buttons/Buttons.jsx';
import { Plus, ListX } from 'lucide-react';
import './rulesManager.css';
export const RulesManager = () => {
    // Grab our grammar rules and the updater function from the global store
    const rules = useConfigStore((state) => state.grammarRules) || [];
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const lexicon = useLexiconStore((state) => state.lexicon) || [];

    const allWordClasses = React.useMemo(() => {
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

    // Add a brand new, blank rule to the bottom of the list
    const handleAddRule = () => {
        const newRule = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, 
            name: '', 
            affix: '', 
            appliesTo: 'all', 
            condition: 'always',
            dependency: '', 
            standalone: false,
            applyToPersons: false,
        };
        
        updateConfig({ grammarRules: [...rules, newRule] });
    };

    // Remove a specific rule by its unique ID
    const handleDeleteRule = useCallback((idToDelete) => {
        updateConfig({ grammarRules: rules.filter(rule => rule.id !== idToDelete) });
    }, [rules, updateConfig]);

    // Update a specific field (like 'name' or 'affix') for a single rule
    const handleUpdateRule = useCallback((idToUpdate, fieldName, newValue) => {
        const updatedRules = rules.map(rule =>
            rule.id === idToUpdate ? { ...rule, [fieldName]: newValue } : rule
        );
        
        updateConfig({ grammarRules: updatedRules });
    }, [rules, updateConfig]);

    return (
        <div className="rules-manager-wrapper">
            <div className="rules-container">
                {rules.length === 0 ? (
                    <div className="rules-empty-state">
                        <ListX size={48} className="empty-state-icon" />
                        <h3>No Grammar Rules Yet</h3>
                        <p>Click the button below to add your first inflection, prefix, or suffix rule.</p>
                    </div>
                ) : (
                    rules.map(rule => (
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
            
            <div className="rules-actions">
                <Button variant="edit" onClick={handleAddRule}>
                    <div className="btn-content-flex">
                        <Plus size={16} /> Add New Rule
                    </div>
                </Button>
            </div>
        </div>
    );
};

export default RulesManager;
