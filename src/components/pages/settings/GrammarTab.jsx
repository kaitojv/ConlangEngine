import React, { useState, useMemo } from 'react';
import Card from '../../UI/Card/Card.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import ParadigmMatrix from './grammarMatrix/ParadigmMatrix.jsx';
import {
    Layers,
    TextAlignStart,
    Play,
    BookOpen,
    ArrowRight,
    Sliders,
    Link2,
    Code2,
    Sparkles,
    Check
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import './grammartab.css';

export default function GrammarTab() {
    const { t } = useTranslation();
    const [subTab, setSubTab] = useState('morphology');

    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';
    const adjectivePlacement = useConfigStore((state) => state.adjectivePlacement) || 'pre-nominal';
    const adjectiveAgreement = useConfigStore((state) => state.adjectiveAgreement) || false;
    const verbMarker = useConfigStore((state) => state.verbMarker) || '';
    const cliticsRules = useConfigStore((state) => state.cliticsRules) || '';
    const rawWaConfig = useConfigStore((state) => state.wordAssistConfig);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const waConfig = useMemo(() => rawWaConfig || {}, [rawWaConfig]);

    // Compute constituent order pills for visual diagram
    const orderPills = useMemo(() => {
        const letters = (syntaxOrder || 'SVO').toUpperCase().split('');
        const map = {
            'S': { label: t('settings.grammar.subject'), className: 'subject' },
            'V': { label: t('settings.grammar.verb'), className: 'verb' },
            'O': { label: t('settings.grammar.object'), className: 'object' },
            'A': { label: t('settings.grammar.adverb'), className: 'adverb' }
        };
        return letters.map((char) => map[char] || { label: char, className: 'subject' });
    }, [syntaxOrder, t]);

    return (
        <div className="grammar-tab-container">
            {/* Sub-Navigation Header matching config-subnav */}
            <nav className="grammar-subnav" aria-label="Grammar Sections">
                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'morphology' ? 'active' : ''}`}
                    onClick={() => setSubTab('morphology')}
                >
                    <Layers size={16} />
                    <span>{t('settings.grammar.morphologyTab')}</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'syntax' ? 'active' : ''}`}
                    onClick={() => setSubTab('syntax')}
                >
                    <TextAlignStart size={16} />
                    <span>{t('settings.grammar.syntaxTab')}</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'paradigm' ? 'active' : ''}`}
                    onClick={() => setSubTab('paradigm')}
                >
                    <Play size={16} />
                    <span>{t('settings.grammar.paradigmTab')}</span>
                </button>

                <button
                    type="button"
                    className={`grammar-subnav-btn ${subTab === 'reference' ? 'active' : ''}`}
                    onClick={() => setSubTab('reference')}
                >
                    <BookOpen size={16} />
                    <span>{t('settings.grammar.referenceTab')}</span>
                </button>
            </nav>

            {/* TAB 1: MORPHOLOGY & RULES */}
            {subTab === 'morphology' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <Layers /> {t('settings.grammar.rulesTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.rulesDesc')}
                        </p>
                        <RulesManager />
                    </Card>
                </div>
            )}

            {/* TAB 2: SYNTAX & WORD ORDER */}
            {subTab === 'syntax' && (
                <div className="grammar-tab-content">
                    {/* Word Order Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Sliders /> {t('settings.grammar.wordOrderTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.wordOrderDesc')}
                        </p>

                        <div className="word-order-diagram">
                            {orderPills.map((pill, idx) => (
                                <React.Fragment key={idx}>
                                    <div className={`word-order-pill ${pill.className}`}>
                                        <span>{pill.label}</span>
                                    </div>
                                    {idx < orderPills.length - 1 && (
                                        <span className="word-order-arrow">
                                            <ArrowRight size={18} />
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="input-wrapper">
                            <label className="form-label" htmlFor="syntax-order-select">{t('settings.grammar.wordOrderPattern')}</label>
                            <select
                                id="syntax-order-select"
                                className="fi custom-select"
                                value={syntaxOrder}
                                onChange={(e) => updateConfig({ syntaxOrder: e.target.value })}
                            >
                                <option value="SVO">{t('settings.grammar.svoOption')}</option>
                                <option value="SOV">{t('settings.grammar.sovOption')}</option>
                                <option value="VSO">{t('settings.grammar.vsoOption')}</option>
                                <option value="VOS">{t('settings.grammar.vosOption')}</option>
                                <option value="OVS">{t('settings.grammar.ovsOption')}</option>
                                <option value="OSV">{t('settings.grammar.osvOption')}</option>
                                <option value="OVA">{t('settings.grammar.ovaOption')}</option>
                            </select>
                        </div>
                    </Card>

                    {/* Modifiers & Agreement Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Sparkles /> {t('settings.grammar.modifiersTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.modifiersDesc')}
                        </p>

                        <div className="syntax-options-grid">
                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="adjective-placement-select">{t('settings.grammar.adjPlacementLabel')}</label>
                                <select
                                    id="adjective-placement-select"
                                    className="fi custom-select"
                                    value={adjectivePlacement}
                                    onChange={(e) => updateConfig({ adjectivePlacement: e.target.value })}
                                >
                                    <option value="pre-nominal">{t('settings.grammar.adjPreNominal')}</option>
                                    <option value="post-nominal">{t('settings.grammar.adjPostNominal')}</option>
                                </select>
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label">{t('settings.grammar.agreementRulesLabel')}</label>
                                <label className="syntax-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={adjectiveAgreement}
                                        onChange={(e) => updateConfig({ adjectiveAgreement: e.target.checked })}
                                    />
                                    <span>{t('settings.grammar.adjectivesCopyAffixes')}</span>
                                </label>
                            </div>
                        </div>
                    </Card>

                    {/* Markers, Clitics & Copula Card */}
                    <Card>
                        <h2 className="flex sg-title">
                            <Link2 /> {t('settings.grammar.markersTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.markersDesc')}
                        </p>

                        <div className="syntax-options-grid">
                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="verb-marker-input">{t('settings.grammar.verbMarkerLabel')}</label>
                                <input
                                    id="verb-marker-input"
                                    type="text"
                                    className="fi"
                                    value={verbMarker}
                                    placeholder={t('settings.grammar.verbMarkerPlaceholder')}
                                    onChange={(e) => updateConfig({ verbMarker: e.target.value })}
                                />
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="clitics-input">{t('settings.grammar.cliticsLabel')}</label>
                                <input
                                    id="clitics-input"
                                    type="text"
                                    className="fi"
                                    value={cliticsRules}
                                    placeholder={t('settings.grammar.cliticsPlaceholder')}
                                    onChange={(e) => updateConfig({ cliticsRules: e.target.value })}
                                />
                            </div>

                            <div className="input-wrapper">
                                <label className="form-label" htmlFor="copula-select">{t('settings.grammar.copulaLabel')}</label>
                                <select
                                    id="copula-select"
                                    className="fi custom-select"
                                    value={
                                        waConfig.copulaBehavior === 'replace' ||
                                        waConfig.copulaBehavior === 'both' ||
                                        waConfig.copulaBehavior === 'omit'
                                            ? 'zero_copula'
                                            : (waConfig.copulaBehavior || 'normal')
                                    }
                                    onChange={(e) =>
                                        updateConfig({
                                            wordAssistConfig: { ...waConfig, copulaBehavior: e.target.value }
                                        })
                                    }
                                >
                                    <option value="normal">{t('settings.grammar.copulaNormal')}</option>
                                    <option value="zero_copula">{t('settings.grammar.copulaZero')}</option>
                                </select>
                            </div>

                            {waConfig.copulaBehavior === 'zero_copula' && (
                                <div className="input-wrapper">
                                    <label className="form-label" htmlFor="copula-replacement-input">{t('settings.grammar.copulaReplacement')}</label>
                                    <input
                                        id="copula-replacement-input"
                                        type="text"
                                        className="fi"
                                        value={waConfig.copulaReplacement || ''}
                                        placeholder={t('settings.grammar.copulaReplacementPlaceholder')}
                                        onChange={(e) =>
                                            updateConfig({
                                                wordAssistConfig: { ...waConfig, copulaReplacement: e.target.value }
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: PARADIGM TESTER */}
            {subTab === 'paradigm' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <Play /> {t('settings.grammar.paradigmTesterTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.paradigmTesterDesc')}
                        </p>
                        <ParadigmMatrix />
                    </Card>
                </div>
            )}

            {/* TAB 4: LINGUISTIC REFERENCE */}
            {subTab === 'reference' && (
                <div className="grammar-tab-content">
                    <Card>
                        <h2 className="flex sg-title">
                            <BookOpen /> {t('settings.grammar.referenceTitle')}
                        </h2>
                        <p className="settings-description">
                            {t('settings.grammar.referenceDesc')}
                        </p>

                        <div className="reference-cards-grid">
                            {/* Card 1: Affixes */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Code2 size={18} />
                                    <h4 className="reference-card-title">{t('settings.grammar.refAffixTitle')}</h4>
                                </div>
                                <p className="reference-card-body">
                                    {t('settings.grammar.refAffixDesc')}
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refAffixSuffix')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refAffixPrefix')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refAffixInfixV')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refAffixInfixC')}
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Stem Mutations */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Sparkles size={18} />
                                    <h4 className="reference-card-title">{t('settings.grammar.refStemTitle')}</h4>
                                </div>
                                <p className="reference-card-body">
                                    {t('settings.grammar.refStemDesc')}
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refStemAblaut')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refStemTruncate')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refStemAssim')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refStemRedup')}
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Rule Chaining */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Link2 size={18} />
                                    <h4 className="reference-card-title">{t('settings.grammar.refChainingTitle')}</h4>
                                </div>
                                <p className="reference-card-body">
                                    {t('settings.grammar.refChainingDesc')}
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refChainSpecific')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refChainWildcardSuffix')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refChainWildcardPrefix')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refChainWildcardAffix')}
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Constraints & POS */}
                            <div className="reference-card">
                                <div className="reference-card-header">
                                    <Check size={18} />
                                    <h4 className="reference-card-title">{t('settings.grammar.refConstraintsTitle')}</h4>
                                </div>
                                <p className="reference-card-body">
                                    {t('settings.grammar.refConstraintsDesc')}
                                </p>
                                <div className="reference-example-box">
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refConstApplies')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refConstTarget')}
                                    </div>
                                    <div className="reference-example-line">
                                        {t('settings.grammar.refConstStandalone')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
