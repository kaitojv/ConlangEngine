// src/pages/SettingsGeneral.jsx
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Lightbulb, WholeWord, Bolt } from 'lucide-react'

export default function SettingsGeneral() {
    const conlangName = useConfigStore((state) => state.conlangName);
    const authorName = useConfigStore((state) => state.authorName);
    const description = useConfigStore((state) => state.description) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const alphabeticScript = useConfigStore((state) => state.alphabeticScript);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    return (        
        
        <Card>
            
            <h2 className="flex sg-title"> <Bolt/>Basic Settings</h2>
            
            <Infobox>
                <p className="flex items-center gap-2"><Lightbulb /> Set the base identity of your conlang here. Changing the typology will unlock different tools in the engine.</p>
            </Infobox>

            <Input 
                label="User Name / Alias" 
                placeholder="e.g., Your username here..."
                value={authorName}
                onChange={(e) => updateConfig({ authorName: e.target.value })}
            />

            <Input 
                label="Language Name" 
                placeholder="English, Esperanto, Mani..."
                value={conlangName}
                onChange={(e) => updateConfig({ conlangName: e.target.value })}
            />

            <div className="sg-input-group">
                <label className="form-label">Description & Lore</label>
                <textarea 
                    className="fi" 
                    style={{ minHeight: '120px', resize: 'vertical', paddingTop: '12px' }}
                    placeholder="Describe the philosophy, history, or core rules of your conlang..."
                    value={description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                />
            </div>

            <div className="sg-input-group">
                <label className="form-label">Language Typology</label>
                <select 
                    className="fi" 
                    value={phonologyTypes}
                    onChange={(e) => updateConfig({ phonologyTypes: e.target.value })}
                >
                    <option value="alphabetic">Alphabetic / Root-based</option>
                    <option value="syllabic">Syllabic (Grid-based)</option>
                    <option value="featural_block">Featural Block (Hangul-style)</option>
                    <option value="logographic">Logographic (Ideograms)</option>
                </select>
            </div>

            {phonologyTypes === 'alphabetic' && (
                <div className="sg-input-group">
                    <label className="form-label">Pre-existing Script Mapping</label>
                    <select 
                        className="fi" 
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
            )}
            
            <Infobox>

                <div className="flex items-center gap-2"><WholeWord /> <b>Writing System Guide:</b></div>  
                • <b>Alphabetic:</b> Standard root-based system. Uses your consonants, vowels, and syllable patterns. Maps to various scripts.<br />
                • <b>Syllabic:</b> Unlocks the Syllabary Manager.<br />
                • <b>Featural Block:</b> Unlocks the Block Manager. Dynamically composes syllables into square blocks.<br />
                • <b>Logographic:</b> Whole words become symbols.
            </Infobox>

        </Card>
    );
}
