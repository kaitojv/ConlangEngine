import React, { useState, useMemo } from 'react';
import { Trash2, Link, Wand2, Play } from 'lucide-react';
import { VisualRuleBuilder } from './VisualRuleBuilder.jsx';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '../../../../utils/morphologyEngine.jsx';
import './ruleRow.css';

export const RuleRow = ({ rule, onUpdate, onDelete, allWordClasses }) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [previewWord, setPreviewWord] = useState('test');
  
  const grammarRules = useConfigStore(state => state.grammarRules) || [];
  const vowels = useConfigStore(state => state.vowels) || '';
  const consonants = useConfigStore(state => state.consonants) || '';
  const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';

  const previewResult = useMemo(() => {
      if (!previewWord) return '';
      
      const depLower = (rule.dependency || '').trim().toLowerCase();
      if (['*suffix', '*prefix', '*infix', '*affix'].includes(depLower)) {
          // If it's a wildcard, let's preview it against the first matching rule, or show a helpful message
          const expanded = expandWildcardDependencies([rule], grammarRules);
          if (expanded.length <= 1 && expanded[0].id === rule.id) {
              return '(No matching rules found to chain)';
          }
          // Just show the first 2 expansions so the user sees it's working
          const results = expanded.slice(0, 2).map(exRule => {
              return applyRuleToWord(previewWord, exRule, grammarRules, vowels, consonants, otherPhonemes);
          });
          return results.join(', ') + (expanded.length > 2 ? '...' : '');
      }

      return applyRuleToWord(previewWord, rule, grammarRules, vowels, consonants, otherPhonemes) || previewWord;
  }, [previewWord, rule, grammarRules, vowels, consonants, otherPhonemes]);
  
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

          <div className="preview-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--s2)', padding: '4px 10px', borderRadius: '6px', border: '1px dashed var(--bd)', marginLeft: 'auto' }}>
            <Play size={12} color="var(--acc)" fill="var(--acc)" />
            <input type="text" className="nl-input fi custom-font-text notranslate" value={previewWord} onChange={(e) => setPreviewWord(e.target.value)} placeholder="word" style={{ width: '70px', padding: '2px 6px', background: 'var(--s1)', fontSize: '0.8rem' }} />
            <span className="nl-sub-text" style={{ margin: '0 2px' }}>→</span>
            <span className="custom-font-text notranslate" style={{ fontWeight: 'bold', color: 'var(--tx)', minWidth: '50px', fontSize: '0.9rem' }}>{previewResult}</span>
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
            <div className="divider"></div>
            <label className="cb-wrap nl-cb" title="Mark this rule as a derivational rule">
              <input className="check-rule" type="checkbox" name="isDerivational" checked={!!rule.isDerivational} onChange={handleChange} />
              <span>Derivational</span>
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
