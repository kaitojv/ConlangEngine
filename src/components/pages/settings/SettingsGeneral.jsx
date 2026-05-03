import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Bolt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsGeneral() {
    const conlangName = useConfigStore((state) => state.conlangName);

    const description = useConfigStore((state) => state.description) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const alphabeticScript = useConfigStore((state) => state.alphabeticScript);
    const autoReturnToLexicon = useConfigStore((state) => state.autoReturnToLexicon);
    const updateConfig = useConfigStore((state) => state.updateConfig);

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
                    <option value="syllabic">Syllabic (Grid-based)</option>
                    <option value="featural_block">Featural Block (Hangul-style)</option>
                    <option value="logographic">Logographic (Ideograms)</option>
                </select>
            </div>

            {phonologyTypes === 'alphabetic' && (
                <>
                    <div className="sg-input-group">
                        <label className="form-label">Pre-existing Script Mapping</label>
                        <select 
                            className="fi settings-select-full" 
                            value={alphabeticScript || 'latin'}
                            onChange={(e) => updateConfig({ alphabeticScript: e.target.value })}
                        >
                            <option value="latin">Latin (Default)</option>
                            <option value="cyrillic">Cyrillic</option>
                            <option value="greek">Greek</option>
                            <option value="runic">Runic</option>
                            <option value="georgian">Georgian</option>
                        </select>
                    </div>
                    <Infobox title="Writing System Guide">
                        • <b>Alphabetic:</b> Standard root-based system. Uses your consonants, vowels, and syllable patterns. Maps to various scripts.<br />
                        • <b>Syllabic:</b> Unlocks the Syllabary Manager.<br />
                        • <b>Featural Block:</b> Unlocks the Block Manager. Dynamically composes syllables into square blocks.<br />
                        • <b>Logographic:</b> Whole words become symbols.
                    </Infobox>
                </>
            )}

            <div className="sg-footer-settings">
                <label className="cb-wrap auto-return-row">
                    <input 
                        type="checkbox" 
                        className="check-rule-sm"
                        checked={!!autoReturnToLexicon}
                        onChange={(e) => updateConfig({ autoReturnToLexicon: e.target.checked })}
                    />
                    <span className="auto-return-label">Auto-return to Lexicon after word creation</span>
                </label>
                <p className="auto-return-desc">
                    If enabled, the app will automatically navigate back to the lexicon list after you successfully save a new root.
                </p>
            </div>

            <Infobox title="Workflow Tips">
                • <b>Auto-return:</b> Enable this to jump back to the Lexicon immediately after saving a new root.<br />
                • <b>Genealogy:</b> Use "Target POS" in grammar rules to automatically categorize derived words (e.g., Noun to Adjective).
            </Infobox>

        </Card>
    );
}
