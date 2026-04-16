// src/pages/SettingsGeneral.jsx
import { useState } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import SyllabaryManager from '../../UI/SyllabaryManager/SyllabaryManager.jsx';
import './phonologyTab.css'
import { Info, AudioLines, Hourglass, WholeWord, Eye } from 'lucide-react';
import  applySoundChanges  from '../../../utils/applysoundchanges.jsx'
import Button from '../../UI/Buttons/Buttons.jsx';

export default function PhonologyTab() {
    //Save Consts
    const consonants = useConfigStore((state) => state.consonants) || '';
    const vowels = useConfigStore((state) => state.vowels) || '';
    const syllablePattern = useConfigStore((state) => state.syllablePattern) || '';
    const historicalRules = useConfigStore((state) => state.historicalRules) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    
    //HSA Preview
    
    const [testWords, setTestWords] = useState('');
    const [previewResults, setPreviewResults] = useState([]);

    // FUNÇÃO QUE CHAMA O MOTOR
    const handlePreview = () => {
        const results = applySoundChanges(testWords, historicalRules);
        setPreviewResults(results);
    };
   
    return (
        <>
        <Card>
            
            <h2 className="flex sg-title"> <AudioLines/> Sounds & Orthography</h2>
            
            <Infobox>
                <b>Phonology & Orthography Guide:</b>
                    • <b>Basic Sounds:</b>Type your IPA phonemes separated by commas (e.g., <code>p, t, k, m, ṇ</code>).<br />
                    • <b>Custom Orthography (=):</b> If a sound is written differently in your romanization or native script, map it using the format <code>IPA=Text</code>. <br />
                    <i>Example:</i> If the sound /ʃ/ is written as '<b>თ</b>' and a trill /r/ as '<b>რ</b>, you should type: <code>ʃ=თ, r=რ</code>. This exact mapping is what allows the <b>Interactive Reader</b> and the <b>TTS Audio</b>to correctly pronounce your custom letters!
            </Infobox>
            
            <Input 
                label="Consonants" 
                placeholder="p, t, k, m, n..."
                value={consonants}
                onChange={(e) => updateConfig({ consonants: e.target.value })} 
                
            />

            <Input 
                label="Vowels" 
                placeholder="a, e, i, o, u..."
                value={vowels}
                onChange={(e) => updateConfig({ vowels: e.target.value })}
            />

            <IpaChart 
                consonants={consonants} 
                setConsonants={(val) => updateConfig({ consonants: val })} 
                vowels={vowels} 
                setVowels={(val) => updateConfig({ vowels: val })} 
            />

            <Input
                label="Syllable Pattern"
                placeholder="CV, CVC, VCV..."
                value={syllablePattern}
                onChange={(e) => updateConfig({ syllablePattern: e.target.value })}
            />
            
        </Card>

        {phonologyTypes === 'syllabic' && (
            <div className="animate-in fade-in duration-300">
                <SyllabaryManager />
            </div>
        )}

        <Card>
            <h2 className='flex'><Hourglass />Historical Sound Changer</h2>
            <p>Evolve your language natively. Write rules line by line using Regex format: 
                <code> pattern =&gt; replacement</code>
            </p>
            <details className='details-tab'>
                <summary className='summary-tab'>
                    <Info/> View Rule Formatting Guide
                </summary>
                <div className='info-tab'>
                    <b> Basic Replacement:</b><br />
                    <span>p =&gt; b</span> (Turns all 'p's into 'b's)<br />
                    <span>ch =&gt; თ</span> (Replaces specific digraphs with characters)<br /><br />

                    <b>Advanced Replacement:</b><br />
                    <b>Environmental (Contextual):</b><br />
                    <span>k(?=[ie]) =&gt; tS</span> ('k' becomes 'tS' ONLY before 'i' or 'e')<br />
                    <span>(?&lt;=[aeiou])s =&gt; z</span> ('s' becomes 'z' ONLY after a vowel)<br /><br />

                    <b>Positional Changes:</b><br />
                    <span>^a =&gt; e</span> (Changes 'a' to 'e' ONLY at the START of a word)<br />
                    <span>m$ =&gt; n</span> (Changes 'm' to 'n' ONLY at the END of a word)<br /><br />

                    <b>Advanced (Reduplication):</b><br />
                    <span>^(.{2})(.*) =&gt; $1$1$2</span> (Duplicates the first two letters)
                </div>
            </details>
            
            <textarea 
                className="textarea-phonology" 
                id="rules" 
                placeholder={"^(.{2})(.*) => $1$1$2\nk(?=[ie]) => tS"}
                value={historicalRules}
                onChange={(e) => updateConfig({ historicalRules: e.target.value })}
            />

            
            <div className="preview-container">
                <label className="preview-label">Test your rules</label>
                
                <div className="preview-input-group">
                    <input 
                        type="text" 
                        className="preview-input"
                        placeholder="Type words to test (e.g., makin, pata)"
                        value={testWords}
                        onChange={(e) => setTestWords(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                    />
                    
              
                    <Button variant="edit" onClick={handlePreview}>
                        <Eye size={18} /> Preview
                    </Button>
                </div>

           
                {previewResults.length > 0 && (
                    <div className="preview-results">
                        {previewResults.map((res, i) => (
                            <div key={i} className="preview-result-item">
                                <span className="preview-original">{res.original}</span>
                                <span className="preview-evolved">➔ {res.evolved}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
        </Card>

        </>
    );
}