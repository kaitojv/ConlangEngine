import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Bolt, Atom } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDefaultScriptId } from '../../../utils/scriptResolver.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';

export default function SettingsGeneral() {
    const { t } = useTranslation();
    const conlangName = useConfigStore((state) => state.conlangName);

    const description = useConfigStore((state) => state.description) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const alphabeticScript = useConfigStore((state) => state.alphabeticScript);
    const usesParticles = useConfigStore((state) => state.usesParticles) || false;
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const scriptSystems = useConfigStore((state) => state.scriptSystems) || [];
    const scriptRules = useConfigStore((state) => state.scriptRules) || {};
    const updateScriptSystem = useConfigStore((state) => state.updateScriptSystem);
    const defaultScriptId = scriptRules.defaultScriptId || getDefaultScriptId({ scriptSystems, scriptRules });

    const handleTypologyChange = (newType) => {
        if (newType === phonologyTypes) return;

        toast((toastObj) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--err)' }}>{t('settings.general.warningTypologyTitle')}</span>
                <span>{t('settings.general.warningTypologyDesc')}</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                        onClick={() => {
                            updateConfig({ phonologyTypes: newType });
                            // Also update the default script system's type
                            if (defaultScriptId) {
                                updateScriptSystem(defaultScriptId, { type: newType });
                            }
                            useConfigStore.getState().unlockBadge('typologist', 'Typologist');
                            toast.dismiss(toastObj.id);
                        }}
                        style={{ background: 'var(--acc)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {t('settings.general.changeAnyway')}
                    </button>
                    <button 
                        onClick={() => toast.dismiss(toastObj.id)}
                        style={{ background: 'var(--s3)', color: 'var(--tx)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        ), { duration: 6000, id: 'typology-warning' });
    };

    return (        
        
        <Card>
            
            <h2 className="flex sg-title"> <Bolt/>{t('settings.general.title')}</h2>
            
            <p className="settings-description">
                {t('settings.general.desc')}
            </p>

            <Input 
                label={t('settings.general.langName')} 
                placeholder={t('settings.general.langNamePlaceholder')}
                value={conlangName}
                onChange={(e) => updateConfig({ conlangName: e.target.value })}
            />

            <div className="sg-input-group">
                <label className="form-label">{t('settings.general.loreLabel')}</label>
                <textarea 
                    className="fi sg-textarea-lore" 
                    placeholder={t('settings.general.lorePlaceholder')}
                    value={description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                />
            </div>

            <div className="sg-input-group">
                <label className="form-label">{t('settings.general.typologyLabel')}</label>
                <select 
                    className="fi settings-select-full" 
                    value={phonologyTypes}
                    onChange={(e) => handleTypologyChange(e.target.value)}
                >
                    <option value="alphabetic">{t('settings.general.typologyOptions.alphabetic')}</option>
                    <option value="abjad">{t('settings.general.typologyOptions.abjad')}</option>
                    <option value="abugida">{t('settings.general.typologyOptions.abugida')}</option>
                    <option value="syllabic">{t('settings.general.typologyOptions.syllabic')}</option>
                    <option value="featural_block">{t('settings.general.typologyOptions.featural_block')}</option>
                    <option value="logographic">{t('settings.general.typologyOptions.logographic')}</option>
                </select>
            </div>

            <div className="sg-input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', background: usesParticles ? 'rgba(124, 58, 237, 0.1)' : 'var(--s2)', borderRadius: '0.5rem', border: usesParticles ? '1px solid var(--acc)' : '1px solid var(--bd)' }}>
                <Atom size={20} color={usesParticles ? 'var(--acc)' : 'var(--tx2)'} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}>
                    <input
                        type="checkbox"
                        checked={usesParticles}
                        onChange={(e) => updateConfig({ usesParticles: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    <div>
                        <span style={{ fontWeight: 600 }}>{t('settings.general.particlesTitle')}</span>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginTop: '2px' }}>
                            {t('settings.general.particlesDesc')}
                        </span>
                    </div>
                </label>
            </div>

            <div className="sg-input-group">
                <label className="form-label">{t('settings.general.scriptMappingLabel')}</label>
                <select 
                    className="fi settings-select-full" 
                    value={alphabeticScript === 'custom' ? 'latin' : (alphabeticScript || 'latin')}
                    onChange={(e) => {
                        updateConfig({ alphabeticScript: e.target.value });
                        if (defaultScriptId) updateScriptSystem(defaultScriptId, { alphabeticScript: e.target.value });
                    }}
                >
                    <option value="latin">{t('settings.general.scriptOptions.latin')}</option>
                    {['alphabetic', 'abjad', 'abugida'].includes(phonologyTypes || 'alphabetic') && (
                        <>
                            <option value="cyrillic">{t('settings.general.scriptOptions.cyrillic')}</option>
                            <option value="greek">{t('settings.general.scriptOptions.greek')}</option>
                            <option value="runic">{t('settings.general.scriptOptions.runic')}</option>
                            <option value="georgian">{t('settings.general.scriptOptions.georgian')}</option>
                            <option value="arabic">{t('settings.general.scriptOptions.arabic')}</option>
                            <option value="hebrew">{t('settings.general.scriptOptions.hebrew')}</option>
                            <option value="devanagari">{t('settings.general.scriptOptions.devanagari')}</option>
                            <option value="thai">{t('settings.general.scriptOptions.thai')}</option>
                        </>
                    )}
                    {phonologyTypes === 'syllabic' && (
                        <>
                            <option value="hiragana">{t('settings.general.scriptOptions.hiragana')}</option>
                            <option value="katakana">{t('settings.general.scriptOptions.katakana')}</option>
                            <option value="cherokee">{t('settings.general.scriptOptions.cherokee')}</option>
                            <option value="inuktitut">{t('settings.general.scriptOptions.inuktitut')}</option>
                            <option value="hangul_syllables">{t('settings.general.scriptOptions.hangul_syllables')}</option>
                        </>
                    )}
                    {phonologyTypes === 'logographic' && (
                        <>
                            <option value="hanzi">{t('settings.general.scriptOptions.hanzi')}</option>
                            <option value="hieroglyphs">{t('settings.general.scriptOptions.hieroglyphs')}</option>
                        </>
                    )}
                    {phonologyTypes === 'featural_block' && (
                        <>
                            <option value="hangul_jamo">{t('settings.general.scriptOptions.hangul_jamo')}</option>
                        </>
                    )}
                </select>
            </div>
            
            <Infobox title={t('settings.general.guideTitle')}>
                • <b>{t('settings.general.guideAlphabeticLabel')}:</b> {t('settings.general.guideAlphabeticDesc')}<br />
                • <b>{t('settings.general.guideSyllabicLabel')}:</b> {t('settings.general.guideSyllabicDesc')}<br />
                • <b>{t('settings.general.guideFeaturalLabel')}:</b> {t('settings.general.guideFeaturalDesc')}<br />
                • <b>{t('settings.general.guideLogographicLabel')}:</b> {t('settings.general.guideLogographicDesc')}
            </Infobox>

        </Card>
    );
}
