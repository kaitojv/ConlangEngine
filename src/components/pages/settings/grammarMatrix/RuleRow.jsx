import React from 'react';
import { Trash2, Link } from 'lucide-react';
import './ruleRow.css';

export const RuleRow = ({ rule, onUpdate, onDelete, allWordClasses }) => {
  
  // A single handler to catch changes across all inputs and checkboxes in this row
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    onUpdate(rule.id, name, newValue);
  };

  // Instantly apply a complex Regex template when the user selects one from the dropdown
  const handleTemplateChange = (e) => {
    if (e.target.value) {
      onUpdate(rule.id, 'affix', e.target.value);
      e.target.value = ''; // Reset the select dropdown back to the placeholder
    }
  };

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
          <div className="label-with-select">
            <label className="rule-label">Affix / Formula</label>
            <select className="template-select" onChange={handleTemplateChange} title="Insert Regex Template">
              <option value="">🪄 Templates ▾</option>
              <option value="^(.{2})(.*) => $1$1$2">🔄 Reduplication</option>
              <option value="a(.*) => e$1">🅰️ Ablaut (a - e)</option>
              <option value="(.)(.)(.) => $1a$2a$3">📐 Triconsonantal</option>
              <option value="n(?=[pb]) => m">🧲 Assimilation (n ➔ m / _p,b)</option>
            </select>
          </div>
          <input type="text" name="affix" className="fi" value={rule.affix} onChange={handleChange} placeholder="-s, ir-, =>" spellCheck="false" />
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
        </div>
      </div>
    </div>
  );
};
