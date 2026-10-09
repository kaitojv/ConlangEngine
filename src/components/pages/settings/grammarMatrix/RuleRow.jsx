import React, { useState, useMemo } from 'react';
import { Trash2, Link, Wand2, Play, ChevronDown } from 'lucide-react';
import { VisualRuleBuilder } from './VisualRuleBuilder.jsx';
import { useConfigStore } from '../../../../store/useConfigStore.jsx';
import { useTranslation } from '../../../../hooks/useTranslation.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '../../../../utils/morphologyEngine.jsx';
import './ruleRow.css';

export const RuleRow = ({ rule, onUpdate, onDelete, allWordClasses }) => {
  const { t } = useTranslation();
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
    if (!af) return { label: t('settings.grammar.badgeNoAffix'), cls: 'rule-badge-pos' };
    if (af.includes('=>')) return { label: t('settings.grammar.badgeMutation'), cls: 'rule-badge-mutation' };
    if (af.startsWith('^') || (af.endsWith('-') && !af.startsWith('-'))) return { label: t('settings.grammar.badgePrefix'), cls: 'rule-badge-prefix' };
    if (af.includes('@') || (af.startsWith('-') && af.slice(1).includes('-'))) return { label: t('settings.grammar.badgeInfix'), cls: 'rule-badge-infix' };
    if (af.startsWith('-')) return { label: t('settings.grammar.badgeSuffix'), cls: 'rule-badge-suffix' };
    return { label: t('settings.grammar.badgeSuffix'), cls: 'rule-badge-suffix' };
  }, [rule.affix, t]);

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
            {rule.name || t('settings.grammar.unnamedRule')}
          </span>
          <span className={`rule-badge ${affixInfo.cls}`}>
            {affixInfo.label}: {rule.affix || '(none)'}
          </span>
          <span className="rule-badge rule-badge-pos">
            {t('settings.grammar.forAppliesTo', { appliesTo: rule.appliesTo || 'all' })}
          </span>
          {rule.gloss && (
            <span className="rule-badge rule-badge-gloss" title={t('settings.grammar.meaningGloss')}>
              {rule.gloss}
            </span>
          )}
        </div>

        <div className="rule-header-right" onClick={(e) => e.stopPropagation()}>
          {/* Quick Mini-Tester */}
          <div className="rule-mini-test" title={t('settings.grammar.liveTest')}>
            <Play size={11} color="var(--acc)" />
            <input 
              type="text" 
              className="rule-mini-test-input notranslate" 
              value={previewWord} 
              onChange={(e) => setPreviewWord(e.target.value)} 
              placeholder={t('settings.grammar.wordPlaceholder')} 
              title={t('settings.grammar.testRootWord')}
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
            title={t('settings.grammar.openBuilder')}
          >
            <Wand2 size={14} />
          </button>

          <button 
            type="button" 
            className="rule-action-btn"
            onClick={() => setIsExpanded(prev => !prev)}
            title={isExpanded ? t('settings.grammar.collapseDetails') : t('settings.grammar.editDetails')}
          >
            <ChevronDown size={15} className={`rule-expand-chevron ${isExpanded ? 'rotated' : ''}`} />
          </button>

          <button 
            type="button" 
            className="rule-action-btn delete-btn" 
            onClick={() => onDelete(rule.id)} 
            title={t('settings.grammar.deleteRule')}
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
              <label>{t('settings.grammar.ruleName')}</label>
              <input 
                type="text" 
                name="name" 
                className="rule-field-input" 
                value={rule.name || ''} 
                onChange={handleChange} 
                placeholder={t('settings.grammar.ruleNamePlaceholder')} 
              />
            </div>

            <div className="rule-field">
              <label>{t('settings.grammar.meaningGloss')}</label>
              <input 
                type="text" 
                name="gloss" 
                className="rule-field-input" 
                value={rule.gloss || ''} 
                onChange={handleChange} 
                placeholder={t('settings.grammar.ruleGlossPlaceholder')} 
              />
            </div>

            <div className="rule-field">
              <label>{t('settings.grammar.ruleAppliesTo')}</label>
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
              <label>{t('settings.grammar.ruleTargetPOS')}</label>
              <input 
                type="text" 
                name="targetPOS" 
                className="rule-field-input" 
                value={rule.targetPOS || ''} 
                onChange={handleChange} 
                placeholder={t('settings.grammar.sameInheritPOS')} 
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
                <label>{t('settings.grammar.ruleAffix')}</label>
                <button 
                  type="button" 
                  className="rule-builder-trigger-btn"
                  onClick={() => setIsBuilderOpen(true)}
                  title={t('settings.grammar.openBuilder')}
                >
                  <Wand2 size={12} /> {t('settings.grammar.builderBtn')}
                </button>
              </div>
              <input 
                type="text" 
                name="affix" 
                className="rule-field-input notranslate" 
                value={rule.affix || ''} 
                onChange={handleChange} 
                placeholder={t('settings.grammar.ruleAffixPlaceholder')} 
                spellCheck="false" 
              />
            </div>

            <div className="rule-field">
              <label>{t('settings.grammar.phonEnv')}</label>
              <select 
                name="condition" 
                className="rule-field-select" 
                value={rule.condition || 'always'} 
                onChange={handleChange}
              >
                <option value="always">{t('settings.grammar.envAlways')}</option>
                <option value="vowel">{t('settings.grammar.envVowel')}</option>
                <option value="consonant">{t('settings.grammar.envConsonant')}</option>
                <option value="other">{t('settings.grammar.envOther')}</option>
              </select>
            </div>

            <div className="rule-field">
              <label>{t('settings.grammar.chaining')}</label>
              <div className="rule-chaining-input-group">
                <Link size={14} color="var(--acc)" />
                <input 
                  type="text" 
                  name="dependency" 
                  className="rule-field-input" 
                  value={rule.dependency || ''} 
                  onChange={handleChange} 
                  placeholder={t('settings.grammar.chainingPlaceholder')} 
                  list={`dep-rules-${rule.id}`}
                />
                <datalist id={`dep-rules-${rule.id}`}>
                  <option value="*suffix">{t('settings.grammar.allSuffixes')}</option>
                  <option value="*prefix">{t('settings.grammar.allPrefixes')}</option>
                  <option value="*infix">{t('settings.grammar.allInfixes')}</option>
                  {grammarRules.filter(r => r.id !== rule.id && r.name).map(r => (
                    <option key={r.id} value={r.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="rule-options-row">
            <label className="rule-checkbox-label" title={t('settings.grammar.ruleStandaloneTip')}>
              <input 
                type="checkbox" 
                name="standalone" 
                checked={Boolean(rule.standalone)} 
                onChange={handleChange} 
              />
              <span>{t('settings.grammar.standalone')}</span>
              <span className="rule-checkbox-help">{t('settings.grammar.standaloneDesc')}</span>
            </label>

            <label className="rule-checkbox-label" title={t('settings.grammar.ruleApplyPronounsTip')}>
              <input 
                type="checkbox" 
                name="applyToPersons" 
                checked={Boolean(rule.applyToPersons)} 
                onChange={handleChange} 
              />
              <span>{t('settings.grammar.applyToPronouns')}</span>
              <span className="rule-checkbox-help">{t('settings.grammar.applyToPronounsDesc')}</span>
            </label>

            <label className="rule-checkbox-label" title={t('settings.grammar.ruleDerivationalTip')}>
              <input 
                type="checkbox" 
                name="isDerivational" 
                checked={Boolean(rule.isDerivational)} 
                onChange={handleChange} 
              />
              <span>{t('settings.grammar.derivational')}</span>
              <span className="rule-checkbox-help">{t('settings.grammar.derivationalDesc')}</span>
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
