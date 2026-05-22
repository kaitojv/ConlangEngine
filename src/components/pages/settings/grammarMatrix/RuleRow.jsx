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

      <div className="nl-rule-builder">
        <div className="nl-rule-row">
          <span className="nl-text">Rule</span>
          <input type="text" name="name" className="nl-input fi" value={rule.name} onChange={handleChange} placeholder="Name (e.g. Plural)" style={{ width: '130px', fontWeight: 'bold', color: 'var(--acc)' }} />
          
          <span className="nl-text">: For</span>
          <input 
            type="text" name="appliesTo" className="nl-input fi" 
            value={rule.appliesTo} onChange={handleChange} 
            placeholder="all" list={`pos-list-${rule.id}`}
            style={{ width: '90px' }}
          />
          <datalist id={`pos-list-${rule.id}`}>
            <option value="all" />
            {(allWordClasses || []).map(cls => (
              <option key={cls} value={cls} />
            ))}
          </datalist>

          <span className="nl-text">words,</span>
          <select name="condition" className="nl-select fi" value={rule.condition} onChange={handleChange}>
            <option value="always">always</option>
            <option value="vowel">after vowel</option>
            <option value="consonant">after consonant</option>
            <option value="other">after other</option>
          </select>
        </div>

        <div className="nl-rule-row">
          <span className="nl-text">add</span>
          <div className="nl-affix-wrapper">
            <input type="text" name="affix" className="nl-input fi" value={rule.affix} onChange={handleChange} placeholder="-s, ir-, =>" spellCheck="false" style={{ width: '120px' }} />
            <button 
              type="button" 
              className="vrb-open-btn" 
              onClick={() => setIsBuilderOpen(true)}
              title="Open Visual Rule Builder"
            >
              <Wand2 size={14} /> Builder
            </button>
          </div>

          <span className="nl-text">to make it</span>
          <input 
            type="text" name="targetPOS" className="nl-input fi" 
            value={rule.targetPOS || ''} onChange={handleChange} 
            placeholder="inherit POS" list={`target-pos-list-${rule.id}`}
            style={{ width: '100px' }}
          />
          <datalist id={`target-pos-list-${rule.id}`}>
            <option value="" />
            {(allWordClasses || []).map(cls => (
              <option key={cls} value={cls} />
            ))}
          </datalist>

          <span className="nl-text">(Meaning:</span>
          <input 
            type="text" name="gloss" className="nl-input fi" 
            value={rule.gloss || ''} onChange={handleChange} 
            placeholder="e.g. plural" style={{ width: '100px' }} 
          />
          <span className="nl-text">).</span>
        </div>

        <div className="nl-rule-footer">
          <div className="dependency-group">
            <Link size={14} className="dependency-icon" />
            <span className="nl-sub-text">Depends on:</span>
            <input type="text" name="dependency" className="nl-input fi" value={rule.dependency} onChange={handleChange} placeholder="Rule Name" style={{ width: '120px' }} />
          </div>

          <div className="standalone-group">
            <div className="divider"></div>
            <label className="cb-wrap nl-cb">
              <input className="check-rule" type="checkbox" name="standalone" checked={!!rule.standalone} onChange={handleChange} />
              <span>Standalone</span>
            </label>
            <div className="divider"></div>
            <label className="cb-wrap nl-cb" title="Allow this rule to apply to Person and Class markers (Pronouns)">
              <input className="check-rule" type="checkbox" name="applyToPersons" checked={!!rule.applyToPersons} onChange={handleChange} />
              <span>Apply to Persons</span>
            </label>
          </div>
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
