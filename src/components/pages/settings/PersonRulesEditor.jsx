import React, { useState, useEffect } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available or can be added
import Infobox from '../../UI/Infobox/Infobox.jsx';

import './personRulesEditor.css';

export default function PersonRulesEditor() {
    const storedPersonRules = useConfigStore((state) => state.personRules);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    // Internal state to manage the list of rules being edited
    const [rules, setRules] = useState([]);

    // Effect to initialize rules from store or when store changes
    useEffect(() => {
        // Attempt to parse the old string format into structured objects for backward compatibility
        if (typeof storedPersonRules === 'string' && storedPersonRules.trim() !== '') {
            const parsed = storedPersonRules.split(',').map(ruleStr => {
                const parts = ruleStr.trim().split(':');
                if (parts.length < 2) return null;

                const id = uuidv4();
                const personNumberGender = parts[0].trim();
                let person = '';
                let number = '';
                let gender = '';

                // Basic parsing for PersonNumberGender (e.g., "1S.Masc")
                const match = personNumberGender.match(/^(\d)(S|P|B)(?:\.(Masc|Fem|Neut|Anim))?$/i);
                if (match) {
                    person = match[1] === '1' ? '1st' : match[1] === '2' ? '2nd' : '3rd';
                    number = match[2].toUpperCase();
                    gender = match[3] ? match[3] : '';
                } else {
                    // Fallback for simpler cases like "1S"
                    if (personNumberGender.startsWith('1')) person = '1st';
                    else if (personNumberGender.startsWith('2')) person = '2nd';
                    else if (personNumberGender.startsWith('3')) person = '3rd';
                    if (personNumberGender.includes('S')) number = 'S';
                    else if (personNumberGender.includes('P')) number = 'P';
                    else if (personNumberGender.includes('B')) number = 'B';
                }

                const freeAffixParts = parts[1].trim().split('/');
                const freeForm = freeAffixParts[0]?.trim() || '';
                const affix = freeAffixParts[1]?.trim() || '';

                return { id, person, number, gender, freeForm, affix };
            }).filter(Boolean); // Filter out any nulls from failed parsing
            setRules(parsed);
        } else if (Array.isArray(storedPersonRules)) {
            // If it's already an array, use it directly
            setRules(storedPersonRules);
        } else {
            setRules([]);
        }
    }, [storedPersonRules]);

    // Function to update the store whenever rules change
    const updateStore = (updatedRules) => {
        // Sort rules for consistent order
        const sortedRules = [...updatedRules].sort((a, b) => {
            const personOrder = { '1st': 1, '2nd': 2, '3rd': 3 };
            const numberOrder = { 'S': 1, 'B': 2, 'P': 3 };
            const genderOrder = { '': 0, 'Masc': 1, 'Fem': 2, 'Neut': 3, 'Anim': 4 };

            // Helper to assign a high number to custom text so they sort to the end of their group safely
            const getOrder = (orderMap, val) => orderMap[val] !== undefined ? orderMap[val] : 99;

            const pA = getOrder(personOrder, a.person);
            const pB = getOrder(personOrder, b.person);
            if (pA !== pB) return pA - pB;

            const nA = getOrder(numberOrder, a.number);
            const nB = getOrder(numberOrder, b.number);
            if (nA !== nB) return nA - nB;

            return getOrder(genderOrder, a.gender) - getOrder(genderOrder, b.gender);
        });
        setRules(sortedRules);
        updateConfig({ personRules: sortedRules }); // Update the global store with the array
    };

    const handleRuleChange = (id, field, value) => {
        const updatedRules = rules.map(rule =>
            rule.id === id ? { ...rule, [field]: value } : rule
        );
        updateStore(updatedRules);
    };

    const addRule = () => {
        const newRule = {
            id: uuidv4(),
            person: '1st',
            number: 'S',
            gender: '',
            freeForm: '',
            affix: ''
        };
        updateStore([...rules, newRule]);
    };

    const deleteRule = (id) => {
        const updatedRules = rules.filter(rule => rule.id !== id);
        updateStore(updatedRules);
    };

    const handleAutoFill = () => {
        const presetRules = [
            { id: uuidv4(), person: '1st', number: 'S', gender: '', freeForm: 'I', affix: '-m' },
            { id: uuidv4(), person: '2nd', number: 'S', gender: '', freeForm: 'you', affix: '-s' },
            { id: uuidv4(), person: '3rd', number: 'S', gender: '', freeForm: 'he', affix: '-t' },
            { id: uuidv4(), person: '1st', number: 'P', gender: '', freeForm: 'we', affix: '-mus' },
            { id: uuidv4(), person: '2nd', number: 'P', gender: '', freeForm: 'you', affix: '-tis' },
            { id: uuidv4(), person: '3rd', number: 'P', gender: '', freeForm: 'they', affix: '-nt' },
        ];
        updateStore(presetRules);
    };

    return (
        <div className="person-rules-editor">
            <div className="person-rules-header">
                <label className="input-label">Pronoun / Affix Mapping</label>
                <button type="button" className="btn-auto-fill" onClick={handleAutoFill} title="Auto-fill with standard 1st, 2nd, 3rd person layout">
                    <Wand2 size={16} /> Auto-Fill Preset
                </button>
            </div>

            <div className="rules-column-headers">
                <span>Person</span>
                <span>Number</span>
                <span>Gender</span>
                <span>Free Form</span>
                <span>Affix</span>
                {/* Empty span for the delete button column */}
                <span></span> 
            </div>

            <div className="rules-list">
                {rules.map(rule => (
                    <div key={rule.id} className="rule-item">
                        <input
                            type="text"
                            className="rule-input"
                            value={rule.person}
                            list="person-options"
                            placeholder="Person (e.g. 1st)"
                            onChange={(e) => handleRuleChange(rule.id, 'person', e.target.value)}
                        />

                        <input
                            type="text"
                            className="rule-input"
                            value={rule.number}
                            list="number-options"
                            placeholder="Number (e.g. S)"
                            onChange={(e) => handleRuleChange(rule.id, 'number', e.target.value)}
                        />

                        <input
                            type="text"
                            className="rule-input"
                            value={rule.gender}
                            list="gender-options"
                            placeholder="Gender (Optional)"
                            onChange={(e) => handleRuleChange(rule.id, 'gender', e.target.value)}
                        />

                        <input
                            type="text"
                            className="rule-input"
                            placeholder="Free Form (e.g., I)"
                            value={rule.freeForm}
                            onChange={(e) => handleRuleChange(rule.id, 'freeForm', e.target.value)}
                        />

                        <input
                            type="text"
                            className="rule-input"
                            placeholder="Affix (e.g., -m, s-, -ma-@V)"
                            value={rule.affix}
                            onChange={(e) => handleRuleChange(rule.id, 'affix', e.target.value)}
                        />

                        <button type="button" className="btn-delete-rule" onClick={() => deleteRule(rule.id)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {rules.length === 0 && (
                    <p className="no-rules-message">No person rules defined. Click "Add Rule" to start.</p>
                )}
            </div>

            {/* Datalists provide autocomplete dropdowns while letting users type whatever they want */}
            <datalist id="person-options">
                <option value="1st">1st Person</option>
                <option value="2nd">2nd Person</option>
                <option value="3rd">3rd Person</option>
                <option value="4th">4th Person</option>
            </datalist>
            <datalist id="number-options">
                <option value="S">Singular</option>
                <option value="P">Plural</option>
                <option value="D">Dual</option>
                <option value="B">Bilabial</option>
            </datalist>
            <datalist id="gender-options">
                <option value="Masc">Masculine</option>
                <option value="Fem">Feminine</option>
                <option value="Neut">Neuter</option>
                <option value="Anim">Animate</option>
                <option value="Inan">Inanimate</option>
            </datalist>

            <button type="button" className="btn-add-rule" onClick={addRule}>
                <Plus size={16} /> Add Rule
            </button>

            <Infobox className="mt-15">
                <b>Pro Tip:</b> Define how each person is represented.
                <br /><br />
                <b>Person/Number/Gender:</b> Select the grammatical person, number (Singular, Plural, Bilabial/Dual), and optional gender.
                <br />
                <b>Free Form:</b> The free-standing pronoun (e.g., "I", "you").
                <br />
                <b>Affix:</b> The bound morpheme. Use hyphens to indicate position:
                <ul>
                    <li><code>-affix</code> for suffixes (e.g., <code>-m</code>)</li>
                    <li><code>affix-</code> for prefixes (e.g., <code>s-</code>)</li>
                    <li><code>-affix-</code> for infixes (e.g., <code>-ma-</code>)</li>
                    <li><code>-affix-@position</code> for infixes with specific placement (e.g., <code>-ma-@V</code> for after the first vowel).</li>
                </ul>
                <br />
                This structured mapping will help the Syntax Analyzer and Inflection Matrix!
            </Infobox>
        </div>
    );
}