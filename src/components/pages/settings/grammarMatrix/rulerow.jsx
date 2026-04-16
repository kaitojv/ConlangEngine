// RuleRow.js
import React from 'react';



// Styles can be defined as
const labelStyle = {
  fontSize: '0.65rem', color: 'var(--tx2)', textTransform: 'uppercase',
  fontWeight: 800, letterSpacing: '0.5px', background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--bd)', padding: '5px 10px', borderRadius: '6px',
  width: 'fit-content', lineHeight: 1, whiteSpace: 'nowrap',
};

export const RuleRow = ({ rule, onUpdate, onDelete }) => {
  // Um único "handler" para atualizar qualquer campo da regra
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    onUpdate(rule.id, name, newValue);
  };

  // Handler para o seletor de templates
  const handleTemplateChange = (e) => {
    if (e.target.value) {
      onUpdate(rule.id, 'affix', e.target.value);
      e.target.value = ''; // Reseta o <select>
    }
  };

  return (
    
    <div className="rule-card">
      <button type="button" className="rule-delete-btn" onClick={() => onDelete(rule.id)} title="Delete Rule">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
      </button>

      <div className="rule-grid">
        <div className="form-group">
          <label style={labelStyle}>Rule Name</label>
          <input type="text" name="name" className="fi" value={rule.name} onChange={handleChange} placeholder="e.g., Plural" />
        </div>

        <div className="form-group">
          <div className="label-with-select">
            <label style={labelStyle}>Affix / Formula</label>
            <select className="template-select" onChange={handleTemplateChange} title="Insert Regex Template">
              <option value="">🪄 Templates ▾</option>
              <option value="^(.{2})(.*) => $1$1$2">🔄 Reduplication</option>
              <option value="a(.*) => e$1">🅰️ Ablaut (a - e)</option>
              <option value="(.)(.)(.) => $1a$2a$3">📐 Triconsonantal</option>
            </select>
          </div>
          <input type="text" name="affix" className="fi" value={rule.affix} onChange={handleChange} placeholder="-s, ir-, =>" spellCheck="false" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Applies To</label>
          <input type="text" name="appliesTo" className="fi" value={rule.appliesTo} onChange={handleChange} placeholder="noun, verb..." spellCheck="false" />
        </div>

        <div className="form-group">
          <label style={labelStyle}>Condition</label>
          <select name="condition" className="fi" value={rule.condition} onChange={handleChange}>
            <option value="always">Always</option>
            <option value="vowel">After Vowel</option>
            <option value="consonant">After Cons</option>
          </select>
        </div>
      </div>

      <div className="rule-footer">
        <div className="dependency-group">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--acc2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
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
