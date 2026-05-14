import React from 'react';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import RulesManager from './grammarMatrix/RulesManager.jsx';
import Input from '../../UI/Input/Input.jsx';
import PersonRulesEditor from './PersonRulesEditor.jsx'; // Import the new component
import Button from '../../UI/Buttons/Buttons.jsx';
import { TextInitial, TextAlignStart, Users, Wand2, Languages, Plus, Info } from 'lucide-react';
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

    const updateWa = (path, value) => {
        const newWa = { ...waConfig };
        const parts = path.split('.');
        if (parts.length === 1) {
            newWa[parts[0]] = value;
        } else {
            newWa[parts[0]] = { ...newWa[parts[0]], [parts[1]]: value };
        }
        updateConfig({ wordAssistConfig: newWa });
    };

    const triggers = waConfig.triggers || [];

    const updateTrigger = (id, field, value) => {
        const newTriggers = triggers.map(t => t.id === id ? { ...t, [field]: value } : t);
        updateConfig({ wordAssistConfig: { ...waConfig, triggers: newTriggers } });
    };

    const addTrigger = () => {
        const newId = `tr-${Date.now()}`;
        const newTrigger = { id: newId, name: 'New Rule', trigger: '', marker: '', type: 'word', position: 'before', priority: triggers.length + 1 };
        updateConfig({ wordAssistConfig: { ...waConfig, triggers: [...triggers, newTrigger] } });
    };

    const removeTrigger = (id) => {
        const newTriggers = triggers.filter(t => t.id !== id);
        updateConfig({ wordAssistConfig: { ...waConfig, triggers: newTriggers } });
    };

    const moveTrigger = (idx, direction) => {
        const newTriggers = [...triggers];
        const targetIdx = idx + direction;
        if (targetIdx < 0 || targetIdx >= newTriggers.length) return;
        const [moved] = newTriggers.splice(idx, 1);
        newTriggers.splice(targetIdx, 0, moved);
        updateConfig({ wordAssistConfig: { ...waConfig, triggers: newTriggers } });
    };

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

            {/* --- WORD ASSIST AUTOMATION --- */}
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 className="flex sg-title" style={{ margin: 0 }}><Wand2 /> Word Assist & Automation</h2>
                    <Button variant="default" onClick={addTrigger} style={{ padding: '6px 15px' }}><Plus size={16} /> Add Rule</Button>
                </div>
                <Infobox title="Smart Translation Settings">
                    Configure how the <b>Word Assist</b> engine handles complex grammar automatically.
                    Triggers are processed in order of <b>priority</b>. You can drag rules to reorder them in the Wiki tab, or use arrows here.
                </Infobox>

                <div className="wa-triggers-list-main">
                    {triggers.map((t, idx) => (
                        <div key={t.id} className="wa-trigger-card-main">
                            <div className="wa-card-header-main">
                                <div className="wa-controls">
                                    <button onClick={() => moveTrigger(idx, -1)} disabled={idx === 0}><ChevronUp size={16}/></button>
                                    <button onClick={() => moveTrigger(idx, 1)} disabled={idx === triggers.length - 1}><ChevronDown size={16}/></button>
                                </div>
                                <input 
                                    className="wa-title-input-main"
                                    value={t.name} 
                                    onChange={(e) => updateTrigger(t.id, 'name', e.target.value)}
                                />
                                <button className="wa-del-btn" onClick={() => removeTrigger(t.id)}><Trash2 size={16}/></button>
                            </div>
                            <div className="wa-card-body-main">
                                <div className="input-wrapper">
                                    <label className="input-label">{t.type === 'trigger' ? 'Syntactic Role' : 'English Trigger'}</label>
                                    {t.type === 'trigger' ? (
                                        <select className="fi custom-select" value={t.trigger} onChange={(e) => updateTrigger(t.id, 'trigger', e.target.value)}>
                                            <option value="">Select Role...</option>
                                            <option value="O">Object (Accusative / Patient)</option>
                                            <option value="S">Subject (Nominative / Agent)</option>
                                            <option value="V">Verb (Action)</option>
                                        </select>
                                    ) : (
                                        <Input value={t.trigger} onChange={(e) => updateTrigger(t.id, 'trigger', e.target.value)} placeholder="not, from, -ing" />
                                    )}
                                </div>
                                <div className="input-wrapper">
                                    <label className="input-label">Conlang Marker</label>
                                    <Input value={t.marker} onChange={(e) => updateTrigger(t.id, 'marker', e.target.value)} placeholder="un, -m" />
                                </div>
                                <div className="input-wrapper">
                                    <label className="input-label">Apply As</label>
                                    <select className="fi custom-select" value={t.type} onChange={(e) => updateTrigger(t.id, 'type', e.target.value)}>
                                        <option value="word">Word match</option>
                                        <option value="suffix">English suffix</option>
                                        <option value="trigger">Syntactic Role</option>
                                    </select>
                                </div>
                                <div className="input-wrapper">
                                    <label className="input-label">Position</label>
                                    <select className="fi custom-select" value={t.position} onChange={(e) => updateTrigger(t.id, 'position', e.target.value)}>
                                        <option value="prefix">Prefix</option>
                                        <option value="suffix">Suffix</option>
                                        <option value="before">Before target</option>
                                        <option value="after">After target</option>
                                        <option value="beforeVerb">Before Verb</option>
                                        <option value="afterVerb">After Verb</option>
                                        <option value="endOfSentence">End of Sentence</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            
        </div>
    );
}
