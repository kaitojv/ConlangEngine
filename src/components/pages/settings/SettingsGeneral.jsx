import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Bolt, Atom, Languages, ArrowRight } from 'lucide-react';
import { getDefaultScriptId, getScriptSystem } from '../../../utils/scriptResolver.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';

export default function SettingsGeneral() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const conlangName = useConfigStore((state) => state.conlangName);

    const description = useConfigStore((state) => state.description) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const alphabeticScript = useConfigStore((state) => state.alphabeticScript);
    const usesParticles = useConfigStore((state) => state.usesParticles) || false;
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const scriptSystems = useConfigStore((state) => state.scriptSystems) || [];
    const scriptRules = useConfigStore((state) => state.scriptRules) || {};
    const defaultScriptId = scriptRules.defaultScriptId || getDefaultScriptId({ scriptSystems, scriptRules });
    const defaultScript = getScriptSystem({ scriptSystems, scriptRules, phonologyTypes, alphabeticScript }, defaultScriptId);
    const currentType = defaultScript?.type || phonologyTypes || 'alphabetic';
    const currentMapping = defaultScript?.alphabeticScript || alphabeticScript || 'latin';

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

            <div className="sg-input-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 1rem', marginBottom: '1rem', background: 'var(--s2)', borderRadius: '0.5rem', border: '1px solid var(--bd)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Languages size={20} color="var(--acc)" />
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--tx)' }}>{t('orthography.scriptManager.title')}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--tx2)', marginTop: '2px' }}>
                            {defaultScript?.name || 'Main Script'} · {t(`orthography.scriptManager.types.${currentType}`, { defaultValue: currentType })} ({currentMapping}) · {scriptSystems.length || 1} script{(scriptSystems.length || 1) === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
                <Button variant="sec" onClick={() => navigate('/orthography')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{t('orthography.title')}</span>
                    <ArrowRight size={15} />
                </Button>
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
