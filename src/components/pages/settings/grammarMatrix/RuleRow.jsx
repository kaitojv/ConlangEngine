import React from 'react';
import { Trash2, Link, Wand2 } from 'lucide-react';
import { VisualRuleBuilder } from './VisualRuleBuilder.jsx';
import './ruleRow.css';

export const RuleRow = ({ rule, onUpdate, onDelete, allWordClasses }) => {
  const [isBuilderOpen, setIsBuilderOpen] = React.useState(false);
  
  // A single handler to catch changes across all inputs and checkboxes in this row
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    onUpdate(rule.id, name, newValue);
  };

  // Instantly apply a complex Regex template when the user selects one from the dropdown
  // REMOVED: Replaced by Visual Rule Builder

  return (
    <div className="rule-card">
      <button 
        type="button" 
        className="rule-delete-btn" 
        onClick={() => onDelete(rule.id)} 
        title="Delete Rule"
      >
        <Trash2 size={16} />
      </button>

      <div className="rule-grid">
        <div className="form-group">
          <label className="rule-label">Rule Name</label>
          <input type="text" name="name" className="fi" value={rule.name} onChange={handleChange} placeholder="e.g., Plural" />
        </div>

        <div className="form-group">
          <label className="rule-label">Affix / Formula</label>
          <div className="vrb-input-container" style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
            <input type="text" name="affix" className="fi" value={rule.affix} onChange={handleChange} placeholder="-s, ir-, =>" spellCheck="false" style={{ flexGrow: 1 }} />
            <button 
              type="button" 
              className="vrb-open-btn" 
              onClick={() => setIsBuilderOpen(true)}
              title="Open Visual Rule Builder"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '0.5rem',
                padding: '0.25rem',
                color: '#a855f7',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Wand2 size={16} />
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="rule-label">Applies To</label>
          <input 
            type="text" 
            name="appliesTo" 
            className="fi" 
            value={rule.appliesTo} 
            onChange={handleChange} 
            placeholder="e.g. noun, verb" 
            spellCheck="false" 
            list={`pos-list-${rule.id}`}
          />
          <datalist id={`pos-list-${rule.id}`}>
            <option value="all" />
            {(allWordClasses || []).map(cls => (
              <option key={cls} value={cls} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="rule-label">Condition</label>
          <select name="condition" className="fi" value={rule.condition} onChange={handleChange}>
            <option value="always">Always</option>
            <option value="vowel">After Vowel</option>
            <option value="consonant">After Cons</option>
            <option value="other">After Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="rule-label">Target POS</label>
          <input 
            type="text" 
            name="targetPOS" 
            className="fi" 
            value={rule.targetPOS || ''} 
            onChange={handleChange} 
            placeholder="Inherit" 
            spellCheck="false" 
            list={`target-pos-list-${rule.id}`}
          />
          <datalist id={`target-pos-list-${rule.id}`}>
            <option value="" />
            {(allWordClasses || []).map(cls => (
              <option key={cls} value={cls} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="rule-footer">
        <div className="dependency-group">
          <Link size={14} className="dependency-icon" />
          <span>Depends on:</span>
          <input type="text" name="dependency" className="fi rule-dependency" value={rule.dependency} onChange={handleChange} placeholder="Rule Name (Optional)" />
        </div>

        <div className="standalone-group">
          <div className="divider"></div>
          <label className="cb-wrap">
            <input className="check-rule" type="checkbox" name="standalone" checked={!!rule.standalone} onChange={handleChange} />
            <span>Standalone Rule</span>
          </label>
          <div className="divider"></div>
          <label className="cb-wrap" title="Allow this rule to apply to Person and Class markers (Pronouns)">
            <input className="check-rule" type="checkbox" name="applyToPersons" checked={!!rule.applyToPersons} onChange={handleChange} />
            <span>Apply to Persons</span>
          </label>
        </div>
      </div>
      <VisualRuleBuilder 
        isOpen={isBuilderOpen} 
        onClose={() => setIsBuilderOpen(false)} 
        onApply={(newAffix) => {
          onUpdate(rule.id, 'affix', newAffix);
          setIsBuilderOpen(false);
        }}
        currentAffix={rule.affix}
      />
    </div>
  );
};
