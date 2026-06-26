import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Bolt, Atom } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDefaultScriptId } from '../../../utils/scriptResolver.js';

export default function SettingsGeneral() {
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

        toast((t) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--err)' }}>⚠️ Warning: Changing Typology</span>
                <span>Switching modes (e.g., Hangul to Syllabic) may break how your current lexicon words are rendered. We highly recommend <b>saving a backup</b> first.</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                        onClick={() => {
                            updateConfig({ phonologyTypes: newType });
                            // Also update the default script system's type
                            if (defaultScriptId) {
                                updateScriptSystem(defaultScriptId, { type: newType });
                            }
                            toast.dismiss(t.id);
                        }}
                        style={{ background: 'var(--acc)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Change Anyway
                    </button>
                    <button 
                        onClick={() => toast.dismiss(t.id)}
                        style={{ background: 'var(--s3)', color: 'var(--tx)', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), { duration: 6000, id: 'typology-warning' });
    };

    return (        
        
        <Card>
            
            <h2 className="flex sg-title"> <Bolt/>Basic Settings</h2>
            
            <p className="settings-description">
                Set the base identity of your conlang here. Changing the typology will unlock different tools in the engine.
            </p>



            <Input 
                label="Language Name" 
                placeholder="English, Esperanto, Mani..."
                value={conlangName}
                onChange={(e) => updateConfig({ conlangName: e.target.value })}
            />

            <div className="sg-input-group">
                <label className="form-label">Description & Lore</label>
                <textarea 
                    className="fi sg-textarea-lore" 
                    placeholder="Describe the philosophy, history, or core rules of your conlang..."
                    value={description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                />
            </div>

            <div className="sg-input-group">
                <label className="form-label">Language Typology</label>
                <select 
                    className="fi settings-select-full" 
                    value={phonologyTypes}
                    onChange={(e) => handleTypologyChange(e.target.value)}
                >
                    <option value="alphabetic">Alphabetic / Root-based</option>
                    <option value="abjad">Abjad (Consonant-heavy)</option>
                    <option value="abugida">Abugida (Alpha-syllabary)</option>
                    <option value="syllabic">Syllabic (Grid-based)</option>
                    <option value="featural_block">Featural Block (Hangul-style)</option>
                    <option value="logographic">Logographic (Ideograms)</option>
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
                        <span style={{ fontWeight: 600 }}>Uses Particles</span>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginTop: '2px' }}>
                            Enable the particle system for isolating or particle-based languages. Unlocks the Particles tab in settings.
                        </span>
                    </div>
                </label>
            </div>

            <div className="sg-input-group">
                <label className="form-label">Pre-existing Script Mapping</label>
                <select 
                    className="fi settings-select-full" 
                    value={alphabeticScript === 'custom' ? 'latin' : (alphabeticScript || 'latin')}
                    onChange={(e) => {
                        updateConfig({ alphabeticScript: e.target.value });
                        if (defaultScriptId) updateScriptSystem(defaultScriptId, { alphabeticScript: e.target.value });
                    }}
                >
                    <option value="latin">Latin (Default)</option>
                    {['alphabetic', 'abjad', 'abugida'].includes(phonologyTypes || 'alphabetic') && (
                        <>
                            <option value="cyrillic">Cyrillic</option>
                            <option value="greek">Greek</option>
                            <option value="runic">Runic</option>
                            <option value="georgian">Georgian</option>
                            <option value="arabic">Arabic</option>
                            <option value="hebrew">Hebrew</option>
                            <option value="devanagari">Devanagari</option>
                            <option value="thai">Thai</option>
                        </>
                    )}
                    {phonologyTypes === 'syllabic' && (
                        <>
                            <option value="hiragana">Hiragana</option>
                            <option value="katakana">Katakana</option>
                            <option value="cherokee">Cherokee</option>
                            <option value="inuktitut">Inuktitut</option>
                            <option value="hangul_syllables">Hangul Syllables</option>
                        </>
                    )}
                    {phonologyTypes === 'logographic' && (
                        <>
                            <option value="hanzi">Hanzi / Kanji (Basic Starter)</option>
                            <option value="hieroglyphs">Egyptian Hieroglyphs (Basic Starter)</option>
                        </>
                    )}
                    {phonologyTypes === 'featural_block' && (
                        <>
                            <option value="hangul_jamo">Hangul Jamo</option>
                        </>
                    )}
                </select>
            </div>
            
            <Infobox title="Writing System Guide">
                • <b>Alphabetic / Abjad / Abugida:</b> Linear root-based system. Uses your consonants, vowels, and syllable patterns. Maps to various scripts.<br />
                • <b>Syllabic:</b> Unlocks the Syllabary Manager.<br />
                • <b>Featural Block:</b> Unlocks the Block Manager. Dynamically composes syllables into square blocks.<br />
                • <b>Logographic:</b> Whole words become symbols.
            </Infobox>

        </Card>
    );
}
