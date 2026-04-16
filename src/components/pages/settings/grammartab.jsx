import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import './grammartab.css';
import Input from '../../UI/Input/Input.jsx';
import {TextInitial, TextAlignStart} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';



export default function GrammarTab(){
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder);
    const writingDirection = useConfigStore((state) => state.writingDirection) || 'ltr';
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);
    const personrules = useConfigStore((state) => state.personrules);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    return (
        <>
        <Card>
            <h2 className='flex sg-title'> <TextInitial/> Grammatical Rules and Inflections</h2>
            <Infobox>
                        <b>Morphology &amp; Inflection Guide:</b><br />
                        • <b>Prefixes &amp; Suffixes:</b> Use a hyphen to indicate where the root connects. <i>Prefix:</i> <code>ir-</code> | <i>Suffix:</i> <code>-s</code>.<br />
                        • <b>Infixes:</b> Use <code>-affix-@position</code>. Example: <code>-ma-@V</code> (inserts after the first vowel).<br />
                        • <b>Templatic Roots:</b> For triconsonantal roots, use Regex with the <code>=&gt;</code> operator (e.g., <code>(.)(.)(.) =&gt; $1a$2a$3</code>).<br />
                        • <b>Standalone Rules:</b> Check the <b>"Standalone"</b> box for inflections that should IGNORE Person/Class alignments (e.g., Passive Voice, Infinitives). They will conjugate independently in the Matrix without attaching pronouns.
            </Infobox>
            <div className='rules-container'>
                <RulesManager />
            </div>
        </Card>
        <Card>
            <h2 className='flex sg-title'> <TextAlignStart/> Syntax and Word Order</h2>
            <Infobox>
                <b>Syntax &amp; Analyzer Guide:</b><br />
                • <b>Verb Base Marker:</b> If your dictionary stores verbs in their infinitive form (e.g., ending in <i>-ar</i> or <i>-er</i>), put that ending here. The Engine will intelligently strip this marker off before applying any conjugations in the Universal Matrix.<br />
                • <b>Clitics:</b> List particles that attach to words but function independently in syntax (like English <i>'s</i> or <i>'ll</i>), separated by commas. The Analyzer will detach them behind the scenes to parse the sentence structure correctly.
            </Infobox>
            <div className='syntax-box'>
                <div>
                    <label>Word Order</label>
                    <select 
                        className="select-btn fi"
                        value={syntaxOrder}
                        onChange={(e) => updateConfig({ syntaxOrder: e.target.value })}
                    >
                        <option value="SVO">SVO</option>
                        <option value="SOV">SOV</option>
                        <option value="VSO">VSO</option>
                        <option value="VOS">VOS</option>
                        <option value="OVS">OVS</option>
                        <option value="OSV">OSV</option>
                        <option value="OVA">OVA</option>
                    </select>
                </div>
                <div>
                    <label>Writing Direction</label>
                    <select 
                        className="select-btn fi"
                        value={writingDirection}
                        onChange={(e) => updateConfig({ writingDirection: e.target.value })}
                    >
                        <option value="ltr">Horizontal (Left to Right)</option>
                        <option value="rtl">Horizontal (Right to Left)</option>
                        <option value="vertical-rl">Vertical (Top to Bottom, R-L)</option>
                        <option value="vertical-lr">Vertical (Top to Bottom, L-R)</option>
                    </select>
                </div>
                <div>
                    <label></label>
                    <Input 
                        label="Verb Base Marker"
                        value={verbMarker}
                        onChange={(e) => updateConfig({ verbMarker: e.target.value })}
                    />
                </div>
                <div>
                    <label></label>
                    <Input 
                        label="Clitics"  
                        placeholder="s, ll" 
                        value={cliticsRules}
                        onChange={(e) => updateConfig({ cliticsRules: e.target.value })}
                    />
                </div>
            </div>
        </Card>
        <Card>
            <div>
                <Input 
                    label='Person and Class Alignment' 
                    placeholder="1S: mau / 'ma, 2S: tau / 'ta, 3S Masc: lou / 'lo" 
                    value={personrules}
                    onChange={(e) => updateConfig({ personrules: e.target.value })} 
                />
            </div>
            <Infobox>
                    <b>Pro Tip:</b> You can define exactly how each person is represented in your language by mapping their free pronouns and affixes. 
                    <br /><br />
                    <b>Suggested format:</b> <code>Person: Free Pronoun / Affix</code>
                    <br />
                    <b>Example:</b> <code>1S: mau / 'ma, 2S: tau / 'ta, 3S Masc: lou / 'lo</code>. 
                    <br /><br />
                    This exact mapping will help the Syntax Analyzer automatically slice and recognize verb conjugations later!
                </Infobox>
        </Card>
        </>
    );
    
}