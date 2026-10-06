import React, { useState, useMemo } from 'react';
import { Trash2, Link, Wand2, Play, ChevronDown } from 'lucide-react';
import { VisualRuleBuilder } from './VisualRuleBuilder.jsx';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '../../../../utils/morphologyEngine.jsx';
import './ruleRow.css';

export const RuleRow = ({ rule, onUpdate, onDelete, allWordClasses }) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [previewWord, setPreviewWord] = useState('test');
  
  const rawGrammarRules = useConfigStore(state => state.grammarRules);
  const grammarRules = useMemo(() => rawGrammarRules || [], [rawGrammarRules]);
  const vowels = useConfigStore(state => state.vowels) || '';
  const consonants = useConfigStore(state => state.consonants) || '';
  const otherPhonemes = useConfigStore(state => state.otherPhonemes) || '';

  const affixInfo = useMemo(() => {
    const af = (rule.affix || '').trim();
    if (!af) return { label: 'No Affix', cls: 'rule-badge-pos' };
    if (af.includes('=>')) return { label: 'Mutation', cls: 'rule-badge-mutation' };
    if (af.startsWith('^') || (af.endsWith('-') && !af.startsWith('-'))) return { label: 'Prefix', cls: 'rule-badge-prefix' };
    if (af.includes('@') || (af.startsWith('-') && af.slice(1).includes('-'))) return { label: 'Infix', cls: 'rule-badge-infix' };
    if (af.startsWith('-')) return { label: 'Suffix', cls: 'rule-badge-suffix' };
    return { label: 'Affix', cls: 'rule-badge-suffix' };
  }, [rule.affix]);

  const previewResult = useMemo(() => {
      if (!previewWord) return '';
      
      const depLower = (rule.dependency || '').trim().toLowerCase();
      if (['*suffix', '*prefix', '*infix', '*affix'].includes(depLower)) {
          const expanded = expandWildcardDependencies([rule], grammarRules);
          if (expanded.length <= 1 && expanded[0].id === rule.id) {
              return '(no chain)';
          }
          const results = expanded.slice(0, 2).map(exRule => {
              return applyRuleToWord(previewWord, exRule, grammarRules, vowels, consonants, otherPhonemes);
          });
          return results.join(', ') + (expanded.length > 2 ? '...' : '');
      }

      return applyRuleToWord(previewWord, rule, grammarRules, vowels, consonants, otherPhonemes) || previewWord;
  }, [previewWord, rule, grammarRules, vowels, consonants, otherPhonemes]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    onUpdate(rule.id, name, newValue);
  };

  return (
    <div className={`rule-card ${isExpanded ? 'expanded' : ''}`}>
      {/* Scannable Header Bar */}
      <div 
        className="rule-card-header"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <div className="rule-header-left">
          <span className={`rule-name-display ${!rule.name ? 'unnamed' : ''}`}>
            {rule.name || 'Unnamed Rule'}
          </span>
          <span className={`rule-badge ${affixInfo.cls}`}>
            {affixInfo.label}: {rule.affix || '(none)'}
          </span>
          <span className="rule-badge rule-badge-pos">
            For: {rule.appliesTo || 'all'}
          </span>
          {rule.gloss && (
            <span className="rule-badge rule-badge-gloss" title="Meaning / Gloss">
              {rule.gloss}
            </span>
          )}
        </div>

        <div className="rule-header-right" onClick={(e) => e.stopPropagation()}>
          {/* Quick Mini-Tester */}
          <div className="rule-mini-test" title="Live transformation test">
            <Play size={11} color="var(--acc)" />
            <input 
              type="text" 
              className="rule-mini-test-input notranslate" 
              value={previewWord} 
              onChange={(e) => setPreviewWord(e.target.value)} 
              placeholder="word" 
              title="Test root word"
            />
            <span className="rule-mini-test-arrow">→</span>
            <span className="rule-mini-test-result notranslate">
              {previewResult}
            </span>
          </div>

          <button 
            type="button" 
            className="rule-action-btn"
            onClick={() => setIsBuilderOpen(true)}
            title="Open Visual Rule Builder"
          >
            <Wand2 size={14} />
          </button>

          <button 
            type="button" 
            className="rule-action-btn"
            onClick={() => setIsExpanded(prev => !prev)}
            title={isExpanded ? "Collapse Details" : "Edit & Details"}
          >
            <ChevronDown size={15} className={`rule-expand-chevron ${isExpanded ? 'rotated' : ''}`} />
          </button>

          <button 
            type="button" 
            className="rule-action-btn delete-btn" 
            onClick={() => onDelete(rule.id)} 
            title="Delete Rule"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Details & Form */}
      {isExpanded && (
        <div className="rule-card-details">
          <div className="rule-fields-grid">
            <div className="rule-field">
              <label>Rule Name</label>
              <input 
                type="text" 
                name="name" 
                className="rule-field-input" 
                value={rule.name || ''} 
                onChange={handleChange} 
                placeholder="e.g. Plural, Past Tense" 
              />
            </div>

            <div className="rule-field">
              <label>Meaning / Gloss</label>
              <input 
                type="text" 
                name="gloss" 
                className="rule-field-input" 
                value={rule.gloss || ''} 
                onChange={handleChange} 
                placeholder="e.g. PL, PST, NEG" 
              />
            </div>

            <div className="rule-field">
              <label>Applies To (Word Class)</label>
              <input 
                type="text" 
                name="appliesTo" 
                className="rule-field-input" 
                value={rule.appliesTo || 'all'} 
                onChange={handleChange} 
                placeholder="all" 
                list={`pos-list-${rule.id}`}
              />
              <datalist id={`pos-list-${rule.id}`}>
                <option value="all" />
                {(allWordClasses || []).map(cls => (
                  <option key={cls} value={cls} />
                ))}
              </datalist>
            </div>

            <div className="rule-field">
              <label>Resulting Word Class</label>
              <input 
                type="text" 
                name="targetPOS" 
                className="rule-field-input" 
                value={rule.targetPOS || ''} 
                onChange={handleChange} 
                placeholder="Same / Inherit POS" 
                list={`target-pos-list-${rule.id}`}
              />
              <datalist id={`target-pos-list-${rule.id}`}>
                <option value="" />
                {(allWordClasses || []).map(cls => (
                  <option key={cls} value={cls} />
                ))}
              </datalist>
            </div>

            <div className="rule-field">
              <div className="rule-field-header">
                <label>Affix or Formula</label>
                <button 
                  type="button" 
                  className="rule-builder-trigger-btn"
                  onClick={() => setIsBuilderOpen(true)}
                  title="Open Visual Rule Builder"
                >
                  <Wand2 size={12} /> Builder
                </button>
              </div>
              <input 
                type="text" 
                name="affix" 
                className="rule-field-input notranslate" 
                value={rule.affix || ''} 
                onChange={handleChange} 
                placeholder="-s, ir-, or stem => change" 
                spellCheck="false" 
              />
            </div>

            <div className="rule-field">
              <label>Phonological Environment</label>
              <select 
                name="condition" 
                className="rule-field-select" 
                value={rule.condition || 'always'} 
                onChange={handleChange}
              >
                <option value="always">Always (Default)</option>
                <option value="vowel">After Vowel Only</option>
                <option value="consonant">After Consonant Only</option>
                <option value="other">After Other Phonemes</option>
              </select>
            </div>

            <div className="rule-field">
              <label>Chaining (Depends On)</label>
              <div className="rule-chaining-input-group">
                <Link size={14} color="var(--acc)" />
                <input 
                  type="text" 
                  name="dependency" 
                  className="rule-field-input" 
                  value={rule.dependency || ''} 
                  onChange={handleChange} 
                  placeholder="Rule Name or *suffix" 
                  list={`dep-rules-${rule.id}`}
                />
                <datalist id={`dep-rules-${rule.id}`}>
                  <option value="*suffix">All Suffixes (*suffix)</option>
                  <option value="*prefix">All Prefixes (*prefix)</option>
                  <option value="*infix">All Infixes (*infix)</option>
                  {grammarRules.filter(r => r.id !== rule.id && r.name).map(r => (
                    <option key={r.id} value={r.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="rule-options-row">
            <label className="rule-checkbox-label" title="Rule can stand alone as an independent particle">
              <input 
                type="checkbox" 
                name="standalone" 
                checked={Boolean(rule.standalone)} 
                onChange={handleChange} 
              />
              <span>Standalone</span>
              <span className="rule-checkbox-help">(functions independently)</span>
            </label>

            <label className="rule-checkbox-label" title="Allow this rule to apply to Person and Class markers (Pronouns)">
              <input 
                type="checkbox" 
                name="applyToPersons" 
                checked={Boolean(rule.applyToPersons)} 
                onChange={handleChange} 
              />
              <span>Apply to Pronouns</span>
              <span className="rule-checkbox-help">(person/class markers)</span>
            </label>

            <label className="rule-checkbox-label" title="Marks this rule as creating a new derivative word">
              <input 
                type="checkbox" 
                name="isDerivational" 
                checked={Boolean(rule.isDerivational)} 
                onChange={handleChange} 
              />
              <span>Derivational</span>
              <span className="rule-checkbox-help">(creates new dictionary root)</span>
            </label>
          </div>
        </div>
      )}

      <VisualRuleBuilder 
        isOpen={isBuilderOpen} 
        onClose={() => setIsBuilderOpen(false)} 
        onApply={(newAffix) => {
          onUpdate(rule.id, 'affix', newAffix);
          setIsBuilderOpen(false);
        }}
        currentAffix={rule.affix || ''} 
      />
    </div>
  );
};

export default RuleRow;
