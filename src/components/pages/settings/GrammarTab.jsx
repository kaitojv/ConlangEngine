import React from 'react';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import Input from '../../UI/Input/Input.jsx';
import PersonRulesEditor from './PersonRulesEditor.jsx'; // Import the new component
import Button from '../../UI/Buttons/Buttons.jsx';
import { TextInitial, TextAlignStart, Users, Wand2 } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import './grammartab.css';

export default function GrammarTab(){
    // Grab all our syntax and morphology settings from the global store
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';
    const writingDirection = useConfigStore((state) => state.writingDirection) || 'ltr';
    const verbMarker = useConfigStore((state) => state.verbMarker) || '';
    const cliticsRules = useConfigStore((state) => state.cliticsRules) || '';
    const updateConfig = useConfigStore((state) => state.updateConfig);

    return (
        <div className="grammar-tab-container">
            
            {/* --- MORPHOLOGY & RULES --- */}
            <Card>
                <h2 className="flex sg-title"><TextInitial /> Grammatical Rules & Inflections</h2>
                
                <Infobox title="Morphology & Inflection Guide">
                    • <b>Prefixes &amp; Suffixes:</b> Use a hyphen to indicate where the root connects. <i>Prefix:</i> <code>ir-</code> | <i>Suffix:</i> <code>-s</code>.<br />
                    • <b>Infixes:</b> Use <code>-affix-@position</code>. Example: <code>-ma-@V</code> (inserts after the first vowel).<br />
                    • <b>Templatic Roots:</b> For triconsonantal roots, use Regex with the <code>=&gt;</code> operator (e.g., <code>(.)(.)(.) =&gt; $1a$2a$3</code>).<br />
                    • <b>Sound Assimilation:</b> Use Regex for context-specific sound changes. Example: <code>n(?=[pb]) =&gt; m</code> (changes 'n' to 'm' before 'p' or 'b').<br />
                    • <b>Reduplication:</b> Capture groups and repeat them. Example: <code>^(.{2})(.*) =&gt; $1$1$2</code> (copies the first two letters).<br />
                    • <b>Deletion:</b> Leave the right side of the arrow empty. Example: <code>[aeiou]$ =&gt; </code> (deletes a trailing vowel).<br />
                    • <b>Standalone Rules:</b> Check the <b>"Standalone"</b> box for inflections that should IGNORE Person/Class alignments (e.g., Passive Voice, Infinitives). They will conjugate independently in the Matrix without attaching pronouns.<br />
                    • <b>Target POS:</b> Automatically change the word class of derived words (e.g., from Noun to Adjective) when this rule is applied.<br />
                    • <b>Rule Scoping:</b> Use the <b>Person Category</b> (in Lexicon Edit) or <b>Root Tag</b> (in Person Alignment) to filter which rules appear for specific words. This is perfect for separating 1st, 2nd, and 3rd person pronoun roots.
                </Infobox>
                
                <div className="rules-wrapper">
                    <RulesManager />
                </div>
            </Card>
            
            {/* --- SYNTAX & WORD ORDER --- */}
            <Card>
                <h2 className="flex sg-title"><TextAlignStart /> Syntax & Word Order</h2>
                
                <Infobox title="Syntax & Analyzer Guide">
                    • <b>Verb Base Marker:</b> Define how your verbs typically end (e.g., <i>-ar</i> or <i>-er</i>). The Engine will use this to warn you if you create a verb that does not match this ending, helping you maintain consistency.<br />
                    • <b>Clitics:</b> List particles that attach to words but function independently in syntax (like English <i>'s</i> or <i>'ll</i>), separated by commas. The Analyzer will detach them behind the scenes to parse the sentence structure correctly.
                </Infobox>
                
                <div className="syntax-grid">
                    <div className="input-wrapper">
                        <label className="input-label">Word Order</label>
                        <select 
                            className="fi custom-select"
                            value={syntaxOrder}
                            onChange={(e) => updateConfig({ syntaxOrder: e.target.value })}
                        >
                            <option value="SVO">SVO (Subject-Verb-Object)</option>
                            <option value="SOV">SOV (Subject-Object-Verb)</option>
                            <option value="VSO">VSO (Verb-Subject-Object)</option>
                            <option value="VOS">VOS (Verb-Object-Subject)</option>
                            <option value="OVS">OVS (Object-Verb-Subject)</option>
                            <option value="OSV">OSV (Object-Subject-Verb)</option>
                            <option value="OVA">OVA (Object-Verb-Adverb)</option>
                        </select>
                    </div>
                    
                    <div className="input-wrapper">
                        <label className="input-label">Writing Direction</label>
                        <select 
                            className="fi custom-select"
                            value={writingDirection}
                            onChange={(e) => updateConfig({ writingDirection: e.target.value })}
                        >
                            <option value="ltr">Horizontal (Left to Right)</option>
                            <option value="rtl">Horizontal (Right to Left)</option>
                            <option value="vertical-rl">Vertical (Top to Bottom, R-L)</option>
                            <option value="vertical-lr">Vertical (Top to Bottom, L-R)</option>
                        </select>
                    </div>
                    
                    <Input 
                        label="Verb Base Marker(s)"
                        value={verbMarker}
                        placeholder="e.g., -r, -ar, -en (comma separated)"
                        onChange={(e) => updateConfig({ verbMarker: e.target.value })}
                    />
                    
                    <Input 
                        label="Clitics"  
                        placeholder="e.g., s, ll, ne" 
                        value={cliticsRules}
                        onChange={(e) => updateConfig({ cliticsRules: e.target.value })}
                    />
                </div>
            </Card>
            
            {/* --- ALIGNMENT & PRONOUNS --- */}
            <Card>
                <h2 className="flex sg-title"><Users /> Person & Class Alignment</h2>
                <Infobox title="Pronoun & Affix Guide">
                    Define how each grammatical person (1st, 2nd, 3rd) or noun class is represented.
                    <br /><br />
                    • <b>Person/Number/Gender:</b> Select the grammatical category. Use "Person" for pronouns and "Noun Class" for noun alignments.<br />
                    • <b>Free Form:</b> The standalone pronoun word (e.g., "I", "you").<br />
                    • <b>Affix:</b> The bound morpheme that attaches to roots (e.g., <code>-m</code>).<br />
                    • <b>Applies To:</b> Filters which word classes use this rule. Set to <code>all</code> (default) or specify <code>verb</code> for verbal conjugations.<br />
                    • <b>Root Tag:</b> Advanced scoping. Link this rule to dictionary words that share a specific tag.
                </Infobox>
                <PersonRulesEditor />
            </Card>
            
        </div>
    );
}
