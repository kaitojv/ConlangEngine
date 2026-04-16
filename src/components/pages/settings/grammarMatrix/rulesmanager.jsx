// RulesManager.js
import React from 'react';
import { RuleRow } from './RuleRow';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';

export const RulesManager = () => {
  const rules = useConfigStore((state) => state.grammarRules) || [];
  const updateConfig = useConfigStore((state) => state.updateConfig);

  const handleAddRule = () => {
    const newRule = {
      id: Math.random(), 
      name: '', affix: '', appliesTo: 'all', condition: 'always',
      dependency: '', standalone: false,
    };
    updateConfig({ grammarRules: [...rules, newRule] });
  };

  const handleDeleteRule = (idToDelete) => {
    updateConfig({ grammarRules: rules.filter(rule => rule.id !== idToDelete) });
  };

  const handleUpdateRule = (idToUpdate, fieldName, newValue) => {
    const updatedRules = rules.map(rule =>
      rule.id === idToUpdate ? { ...rule, [fieldName]: newValue } : rule
    );
    updateConfig({ grammarRules: updatedRules });
  };

  return (
    <>
      <div id="rules-container">
        {rules.length === 0 ? (
          <div className="empty-state-card">
            <h3>No Grammar Rules Yet</h3>
            <p>Click the button below to add your first rule.</p>
          </div>
        ) : (
          rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onUpdate={handleUpdateRule}
              onDelete={handleDeleteRule}
            />
          ))
        )}
      </div>
      <button className="btn-sm btn-edit" onClick={handleAddRule}>
        + Add Rule
      </button>
    </>
  );
};

export default RulesManager;