import React from 'react';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { TextInitial, TextAlignStart, Users, Languages, Info } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import './grammartab.css';

export default function GrammarTab(){
    // Grab all our syntax and morphology settings from the global store
    const syntaxOrder = useConfigStore((state) => state.syntaxOrder) || 'SVO';
    const writingDirection = useConfigStore((state) => state.writingDirection) || 'ltr';
    const verbMarker = useConfigStore((state) => state.verbMarker) || '';
    const cliticsRules = useConfigStore((state) => state.cliticsRules) || '';
    const waConfig = useConfigStore((state) => state.wordAssistConfig) || {};
    const updateConfig = useConfigStore((state) => state.updateConfig);

    return (
        <div className="grammar-tab-container">
            
            {/* --- MORPHOLOGY & RULES --- */}
            <Card>
                <h2 className="flex sg-title"><TextInitial /> Grammatical Rules & Inflections</h2>
                
                <Infobox title="Morphology & Inflection Guide">
                    • <b>Visual Rule Builder:</b> Click the <b>Magic Wand (🪄)</b> icon to build any rule visually. The "Test Lab" shows your changes in real-time.<br />
                    • <b>Manual Formulas:</b> Use the <code>=&gt;</code> operator for stem changes. Example: <code>um$ =&gt; i</code> (turns <i>kum</i> into <i>ki</i>).<br />
                    • <b>Affix / Infix:</b> Standard <b>Prefixes</b> (<code>ir-</code>), <b>Suffixes</b> (<code>-s</code>), and <b>Infixes</b> (<code>-ma-@V</code>).<br />
                    • <b>Advanced Regex:</b> Support for capture groups and lookaheads. Example: <code>n(?=[pb]) =&gt; m</code> (Assimilation) or <code>^(.{2})(.*) =&gt; $1$1$2</code> (Reduplication).<br />
                    • <b>Apostrophe Handling:</b> The engine is robust against smart/straight quotes and shared punctuation between affixes.<br />
                    • <b>Standalone Rules:</b> Check <b>"Standalone"</b> for rules that conjugate independently (e.g., Passive Voice or Infinitives).<br />
                    • <b>Applies To (Constraint):</b> Filters which words are allowed to use this rule (e.g., "This rule only applies to <b>Nouns</b>").<br />
                    • <b>Target POS (Transformation):</b> Defines what the word becomes after the rule is applied (e.g., "This rule turns a Verb into a <b>Noun</b>").<br />
                    • <b>Rule Scoping:</b> Use Person Categories or Root Tags to restrict rules to specific dictionary words.
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

                    <div className="input-wrapper">
                        <label className="input-label">Copula (To Be) Behavior</label>
                        <select 
                            className="fi custom-select"
                            value={waConfig.copulaBehavior === 'replace' || waConfig.copulaBehavior === 'both' || waConfig.copulaBehavior === 'omit' ? 'zero_copula' : (waConfig.copulaBehavior || 'normal')}
                            onChange={(e) => updateConfig({ wordAssistConfig: { ...waConfig, copulaBehavior: e.target.value } })}
                        >
                            <option value="normal">Normal (Parse as Verb/Modal)</option>
                            <option value="zero_copula">Enable Zero Copula</option>
                        </select>
                    </div>

                    {waConfig.copulaBehavior === 'zero_copula' && (
                        <Input 
                            label="Copula Replacement Marker"
                            value={waConfig.copulaReplacement || ''}
                            placeholder="e.g. vu"
                            onChange={(e) => updateConfig({ wordAssistConfig: { ...waConfig, copulaReplacement: e.target.value } })}
                        />
                    )}
                </div>
            </Card>
            
        </div>
    );
}
