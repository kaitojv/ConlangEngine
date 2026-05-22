import React, { useState, useEffect, useMemo } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { Plus, Trash2, Wand2, Grid, List, Save, Sliders, CheckCircle } from 'lucide-react';
import Infobox from '../../UI/Infobox/Infobox.jsx';

import './personRulesEditor.css';

// English helper to get default pronouns based on dimensions
const getEnglishPronoun = (person, number, gender, caseType) => {
    const isColl = number === 'C';
    const isPlur = number === 'P' || number === 'D';

    if (person === '1st') {
        if (number === 'S') {
            if (caseType === 'sub') return 'I';
            if (caseType === 'obj') return 'me';
            if (caseType === 'det') return 'my';
            if (caseType === 'pos') return 'mine';
            if (caseType === 'ref') return 'myself';
        } else if (isColl) {
            if (caseType === 'sub') return 'we (collective)';
            if (caseType === 'obj') return 'us (collective)';
            if (caseType === 'det') return 'our (collective)';
            if (caseType === 'pos') return 'ours (collective)';
            if (caseType === 'ref') return 'ourselves (collective)';
        } else {
            if (caseType === 'sub') return 'we';
            if (caseType === 'obj') return 'us';
            if (caseType === 'det') return 'our';
            if (caseType === 'pos') return 'ours';
            if (caseType === 'ref') return 'ourselves';
        }
    }

    if (person === '2nd') {
        if (number === 'S') {
            if (caseType === 'sub') return 'you';
            if (caseType === 'obj') return 'you';
            if (caseType === 'det') return 'your';
            if (caseType === 'pos') return 'yours';
            if (caseType === 'ref') return 'yourself';
        } else if (isColl) {
            if (caseType === 'sub') return 'you all (collective)';
            if (caseType === 'obj') return 'you all (collective)';
            if (caseType === 'det') return 'your (collective)';
            if (caseType === 'pos') return 'yours (collective)';
            if (caseType === 'ref') return 'yourselves (collective)';
        } else {
            if (caseType === 'sub') return 'you (plural)';
            if (caseType === 'obj') return 'you (plural)';
            if (caseType === 'det') return 'your (plural)';
            if (caseType === 'pos') return 'yours (plural)';
            if (caseType === 'ref') return 'yourselves';
        }
    }

    if (person === '3rd') {
        if (number === 'S') {
            if (gender === 'Masc') {
                if (caseType === 'sub') return 'he';
                if (caseType === 'obj') return 'him';
                if (caseType === 'det') return 'his';
                if (caseType === 'pos') return 'his';
                if (caseType === 'ref') return 'himself';
            } else if (gender === 'Fem') {
                if (caseType === 'sub') return 'she';
                if (caseType === 'obj') return 'her';
                if (caseType === 'det') return 'her';
                if (caseType === 'pos') return 'hers';
                if (caseType === 'ref') return 'herself';
            } else if (gender === 'Neut' || gender === 'Inan') {
                if (caseType === 'sub') return 'it';
                if (caseType === 'obj') return 'it';
                if (caseType === 'det') return 'its';
                if (caseType === 'pos') return 'its';
                if (caseType === 'ref') return 'itself';
            } else if (gender === 'Anim') {
                if (caseType === 'sub') return 'they (singular animate)';
                if (caseType === 'obj') return 'them (singular animate)';
                if (caseType === 'det') return 'their (singular animate)';
                if (caseType === 'pos') return 'theirs (singular animate)';
                if (caseType === 'ref') return 'themselves (singular animate)';
            } else {
                if (caseType === 'sub') return 'they (singular)';
                if (caseType === 'obj') return 'them (singular)';
                if (caseType === 'det') return 'their (singular)';
                if (caseType === 'pos') return 'theirs (singular)';
                if (caseType === 'ref') return 'themselves (singular)';
            }
        } else if (isColl) {
            if (caseType === 'sub') return 'they (collective)';
            if (caseType === 'obj') return 'them (collective)';
            if (caseType === 'det') return 'their (collective)';
            if (caseType === 'pos') return 'theirs (collective)';
            if (caseType === 'ref') return 'themselves (collective)';
        } else {
            if (caseType === 'sub') return 'they';
            if (caseType === 'obj') return 'them';
            if (caseType === 'det') return 'their';
            if (caseType === 'pos') return 'theirs';
            if (caseType === 'ref') return 'themselves';
        }
    }

    if (person === '4th') {
        if (caseType === 'sub') return 'one';
        if (caseType === 'obj') return 'one';
        if (caseType === 'det') return "one's";
        if (caseType === 'pos') return "one's";
        if (caseType === 'ref') return 'oneself';
    }

    return caseType;
};

export default function PersonRulesEditor() {
    const storedPersonRules = useConfigStore((state) => state.personRules);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const setLexicon = useLexiconStore((state) => state.setLexicon);

    const [viewMode, setViewMode] = useState('list'); // 'list' or 'matrix'
    const [rules, setRules] = useState([]);
    
    // Matrix dimensions
    const [dimPersons, setDimPersons] = useState({ '1st': true, '2nd': true, '3rd': true, '4th': false });
    const [dimNumbers, setDimNumbers] = useState({ 'S': true, 'P': true, 'C': false, 'D': false });
    const [dimGenders, setDimGenders] = useState({ 'General': true, 'Masc': false, 'Fem': false, 'Neut': false, 'Anim': false, 'Inan': false });
    
    // Matrix inputs key: `${person}-${number}-${gender}-${caseType}` -> value: conlang word
    const [matrixData, setMatrixData] = useState({});
    const [saveStatus, setSaveStatus] = useState(null);

    // Initialize list rules from store
    useEffect(() => {
        if (typeof storedPersonRules === 'string' && storedPersonRules.trim() !== '') {
            const parsed = storedPersonRules.split(',').map(ruleStr => {
                const parts = ruleStr.trim().split(':');
                if (parts.length < 2) return null;

                const id = Math.random().toString(36).substring(2, 9);
                const personNumberGender = parts[0].trim();
                let person = '';
                let number = '';
                let gender = '';

                const match = personNumberGender.match(/^(\d)(S|P|B|C|D)(?:\.(.+))?$/i);
                if (match) {
                    const p = match[1];
                    person = p === '1' ? '1st' : p === '2' ? '2nd' : p === '3' ? '3rd' : p + 'th';
                    number = match[2].toUpperCase();
                    gender = match[3] ? match[3] : '';
                } else {
                    if (personNumberGender.startsWith('1')) person = '1st';
                    else if (personNumberGender.startsWith('2')) person = '2nd';
                    else if (personNumberGender.startsWith('3')) person = '3rd';
                    else if (personNumberGender.startsWith('4')) person = '4th';
                    if (personNumberGender.includes('S')) number = 'S';
                    else if (personNumberGender.includes('P')) number = 'P';
                    else if (personNumberGender.includes('B')) number = 'B';
                    else if (personNumberGender.includes('C')) number = 'C';
                    else if (personNumberGender.includes('D')) number = 'D';
                }

                const freeAffixParts = parts[1].trim().split('/');
                const freeForm = freeAffixParts[0]?.trim() || '';
                const affix = freeAffixParts[1]?.trim() || '';
                const appliesTo = 'all';

                return { id, person, number, gender, freeForm, affix, appliesTo };
            }).filter(Boolean);
            setRules(parsed);
        } else if (Array.isArray(storedPersonRules)) {
            setRules(storedPersonRules);
        } else {
            setRules([]);
        }
    }, [storedPersonRules]);

    // Populate Matrix from Lexicon and Rules on toggle
    useEffect(() => {
        if (viewMode === 'matrix') {
            const initialData = {};
            
            let nextPersons = {};
            let nextNumbers = {};
            let nextGenders = {};

            // 1. Pre-fill from personRules (Subjective form)
            rules.forEach(rule => {
                const g = rule.gender || 'General';
                const key = `${rule.person}-${rule.number}-${g}-sub`;
                if (rule.freeForm) {
                    initialData[key] = rule.freeForm;
                }
                
                // Auto-enable checkboxes if they are defined in rules
                if (rule.person === '4th') nextPersons['4th'] = true;
                if (rule.number === 'C') nextNumbers['C'] = true;
                if (rule.number === 'D') nextNumbers['D'] = true;
                if (g && g !== 'General') {
                    nextGenders[g] = true;
                    nextGenders['General'] = false;
                }
            });

            // 2. Pre-fill from Lexicon Pronoun entries
            lexicon.forEach(entry => {
                if (entry.wordClass?.toLowerCase() === 'pronoun' && entry.translation) {
                    const trans = entry.translation.toLowerCase();
                    
                    // Match against combinations
                    const activePersons = ['1st', '2nd', '3rd', '4th'];
                    const activeNumbers = ['S', 'P', 'C', 'D'];
                    const activeGenders = ['General', 'Masc', 'Fem', 'Neut', 'Anim', 'Inan'];
                    const cases = ['sub', 'obj', 'det', 'pos', 'ref'];

                    for (const p of activePersons) {
                        for (const n of activeNumbers) {
                            for (const g of activeGenders) {
                                for (const c of cases) {
                                    const eng = getEnglishPronoun(p, n, g === 'General' ? '' : g, c).toLowerCase();
                                    
                                    // Exact match to avoid false positives checking everything
                                    if (eng === trans) {
                                        initialData[`${p}-${n}-${g}-${c}`] = entry.word;
                                        
                                        // Auto-enable checkboxes if they contain data
                                        if (p === '4th') nextPersons['4th'] = true;
                                        if (n === 'C') nextNumbers['C'] = true;
                                        if (n === 'D') nextNumbers['D'] = true;
                                        if (g !== 'General') {
                                            nextGenders[g] = true;
                                            nextGenders['General'] = false;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Apply batched dimension updates
            if (Object.keys(nextPersons).length > 0) setDimPersons(prev => ({ ...prev, ...nextPersons }));
            if (Object.keys(nextNumbers).length > 0) setDimNumbers(prev => ({ ...prev, ...nextNumbers }));
            if (Object.keys(nextGenders).length > 0) {
                setDimGenders(prev => {
                    const updated = { ...prev, ...nextGenders };
                    if (Object.keys(nextGenders).some(k => k !== 'General' && nextGenders[k])) {
                        updated['General'] = false;
                    }
                    return updated;
                });
            }

            setMatrixData(initialData);
        }
    }, [viewMode, rules, lexicon]);

    const updateStore = (updatedRules) => {
        const sortedRules = [...updatedRules].sort((a, b) => {
            const personOrder = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
            const numberOrder = { 'S': 1, 'D': 2, 'B': 3, 'P': 4, 'C': 5 };
            const genderOrder = { '': 0, 'General': 0, 'Masc': 1, 'Fem': 2, 'Neut': 3, 'Anim': 4, 'Inan': 5 };

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
        updateConfig({ personRules: sortedRules });
    };

    const handleRuleChange = (id, field, value) => {
        const updatedRules = rules.map(rule =>
            rule.id === id ? { ...rule, [field]: value } : rule
        );
        updateStore(updatedRules);
    };

    const addRule = () => {
        const newRule = {
            id: Math.random().toString(36).substring(2, 9),
            person: '1st',
            number: 'S',
            gender: '',
            freeForm: '',
            affix: '',
            appliesTo: 'all'
        };
        updateStore([...rules, newRule]);
    };

    const deleteRule = (id) => {
        const updatedRules = rules.filter(rule => rule.id !== id);
        updateStore(updatedRules);
    };

    const handleAutoFill = () => {
        const presetRules = [
            { id: Math.random().toString(36).substring(2, 9), person: '1st', number: 'S', gender: '', freeForm: 'I', affix: '-m', appliesTo: 'verb' },
            { id: Math.random().toString(36).substring(2, 9), person: '2nd', number: 'S', gender: '', freeForm: 'you', affix: '-s', appliesTo: 'verb' },
            { id: Math.random().toString(36).substring(2, 9), person: '3rd', number: 'S', gender: '', freeForm: 'he', affix: '-t', appliesTo: 'verb' },
            { id: Math.random().toString(36).substring(2, 9), person: '1st', number: 'P', gender: '', freeForm: 'we', affix: '-mus', appliesTo: 'verb' },
            { id: Math.random().toString(36).substring(2, 9), person: '2nd', number: 'P', gender: '', freeForm: 'you', affix: '-tis', appliesTo: 'verb' },
            { id: Math.random().toString(36).substring(2, 9), person: '3rd', number: 'P', gender: '', freeForm: 'they', affix: '-nt', appliesTo: 'verb' },
        ];
        updateStore(presetRules);
    };

    // Matrix Generation Combinations
    const activeCombinations = useMemo(() => {
        const list = [];
        const persons = Object.keys(dimPersons).filter(p => dimPersons[p]);
        const numbers = Object.keys(dimNumbers).filter(n => dimNumbers[n]);
        const genders = Object.keys(dimGenders).filter(g => dimGenders[g]);

        persons.forEach(p => {
            numbers.forEach(n => {
                // If 1st, 2nd, or 4th person, gender/class is typically General
                if (p === '1st' || p === '2nd' || p === '4th') {
                    list.push({ person: p, number: n, gender: 'General' });
                } else {
                    genders.forEach(g => {
                        list.push({ person: p, number: n, gender: g });
                    });
                }
            });
        });
        return list;
    }, [dimPersons, dimNumbers, dimGenders]);

    const handleMatrixInputChange = (person, number, gender, caseType, value) => {
        const key = `${person}-${number}-${gender}-${caseType}`;
        setMatrixData(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveMatrix = () => {
        const newLexicon = [...lexicon];
        const newRules = [...rules];

        let addedCount = 0;
        let updatedCount = 0;

        activeCombinations.forEach(({ person, number, gender }) => {
            const cases = ['sub', 'obj', 'det', 'pos', 'ref'];
            
            cases.forEach(caseType => {
                const key = `${person}-${number}-${gender}-${caseType}`;
                const conlangVal = matrixData[key]?.trim();

                if (!conlangVal) return;

                const englishTrans = getEnglishPronoun(person, number, gender === 'General' ? '' : gender, caseType);
                const desc = `${person} Person ${number === 'S' ? 'Singular' : number === 'P' ? 'Plural' : number === 'C' ? 'Collective' : 'Dual'} ${gender !== 'General' ? gender : ''} ${caseType.toUpperCase()} Pronoun`;

                // Search for existing Pronoun in Lexicon
                const existingIdx = newLexicon.findIndex(
                    e => e.wordClass?.toLowerCase() === 'pronoun' && 
                    e.translation?.toLowerCase() === englishTrans.toLowerCase()
                );

                if (existingIdx !== -1) {
                    newLexicon[existingIdx] = {
                        ...newLexicon[existingIdx],
                        word: conlangVal,
                        definition: desc
                    };
                    updatedCount++;
                } else {
                    newLexicon.push({
                        id: Math.random().toString(36).substring(2, 9),
                        word: conlangVal,
                        ipa: '',
                        wordClass: 'Pronoun',
                        translation: englishTrans,
                        definition: desc,
                        tags: ['pronoun'],
                        createdAt: Date.now()
                    });
                    addedCount++;
                }

                // If Subjective Case, sync to personRules for conjugation
                if (caseType === 'sub') {
                    const cleanGender = gender === 'General' ? '' : gender;
                    const existingRuleIdx = newRules.findIndex(
                        r => r.person === person && 
                        r.number === number && 
                        (r.gender || '') === cleanGender
                    );

                    if (existingRuleIdx !== -1) {
                        newRules[existingRuleIdx] = {
                            ...newRules[existingRuleIdx],
                            freeForm: conlangVal
                        };
                    } else {
                        newRules.push({
                            id: Math.random().toString(36).substring(2, 9),
                            person,
                            number,
                            gender: cleanGender,
                            freeForm: conlangVal,
                            affix: '',
                            appliesTo: 'all'
                        });
                    }
                }
            });
        });

        // Update stores
        setLexicon(newLexicon);
        updateStore(newRules);

        setSaveStatus(`Successfully synced to Lexicon! Added ${addedCount} and updated ${updatedCount} pronouns.`);
        setTimeout(() => setSaveStatus(null), 5000);
    };

    return (
        <div className="person-rules-editor">
            
            {/* View Mode Selector Tabs */}
            <div className="wa-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                    type="button"
                    className={`wa-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                >
                    <List size={15} /> Person Rules & Affixes
                </button>
                <button
                    type="button"
                    className={`wa-tab-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                    onClick={() => setViewMode('matrix')}
                >
                    <Grid size={15} /> Pronoun Matrix Generator
                </button>
            </div>

            {viewMode === 'list' ? (
                <>
                    <div className="person-rules-header">
                        <button type="button" className="btn-auto-fill" onClick={handleAutoFill} title="Auto-fill with standard 1st, 2nd, 3rd person layout">
                            <Wand2 size={16} /> Auto-Fill Preset
                        </button>
                    </div>

                    <p className="settings-description">
                        Alignments allow you to define how your grammar changes based on the <b>Person</b> (1st, 2nd, 3rd) or <b>Noun Class</b> (Animate, Inanimate, etc.). Define both the standalone pronoun (Free Form) and the suffix/prefix (Affix), and specify which word classes use each rule.
                    </p>

                    <div className="rules-list">
                        {rules.map(rule => (
                            <div key={rule.id} className="rule-item nl-rule-builder" style={{ position: 'relative', padding: '16px' }}>
                                <div className="nl-rule-row">
                                    <span className="nl-text">For</span>
                                    <select
                                        className="nl-select fi"
                                        value={rule.person}
                                        onChange={(e) => handleRuleChange(rule.id, 'person', e.target.value)}
                                        style={{ width: '110px' }}
                                    >
                                        <option value="1st">1st Person</option>
                                        <option value="2nd">2nd Person</option>
                                        <option value="3rd">3rd Person</option>
                                        <option value="4th">4th Person</option>
                                    </select>

                                    <select
                                        className="nl-select fi"
                                        value={rule.number}
                                        onChange={(e) => handleRuleChange(rule.id, 'number', e.target.value)}
                                        style={{ width: '110px' }}
                                    >
                                        <option value="S">Singular</option>
                                        <option value="P">Plural</option>
                                        <option value="C">Collective</option>
                                        <option value="D">Dual</option>
                                        <option value="B">Bilabial</option>
                                    </select>

                                    <select
                                        className="nl-select fi"
                                        value={rule.gender}
                                        onChange={(e) => handleRuleChange(rule.id, 'gender', e.target.value)}
                                        style={{ width: '110px' }}
                                    >
                                        <option value="">(No Gender)</option>
                                        <option value="Masc">Masculine</option>
                                        <option value="Fem">Feminine</option>
                                        <option value="Neut">Neuter</option>
                                        <option value="Anim">Animate</option>
                                        <option value="Inan">Inanimate</option>
                                    </select>
                                    <span className="nl-text">,</span>
                                </div>
                                <div className="nl-rule-row">
                                    <span className="nl-text">the standalone pronoun is</span>
                                    <input
                                        type="text"
                                        className="nl-input fi"
                                        placeholder="e.g. I, he"
                                        value={rule.freeForm}
                                        onChange={(e) => handleRuleChange(rule.id, 'freeForm', e.target.value)}
                                        style={{ width: '120px' }}
                                    />
                                    <span className="nl-text">and the affix is</span>
                                    <input
                                        type="text"
                                        className="nl-input fi"
                                        placeholder="e.g. -m, s-"
                                        value={rule.affix}
                                        onChange={(e) => handleRuleChange(rule.id, 'affix', e.target.value)}
                                        style={{ width: '120px' }}
                                    />
                                </div>
                                <div className="nl-rule-row">
                                    <span className="nl-text">This rule applies to</span>
                                    <input
                                        type="text"
                                        className="nl-input fi"
                                        placeholder="all"
                                        value={rule.appliesTo || ''}
                                        list="applies-to-options"
                                        onChange={(e) => handleRuleChange(rule.id, 'appliesTo', e.target.value.toLowerCase())}
                                        style={{ width: '100px' }}
                                    />
                                    <span className="nl-text">words</span>
                                    {rule.appliesTo && rule.appliesTo !== 'all' && (
                                        <>
                                            <span className="nl-text">with root tag</span>
                                            <input
                                                type="text"
                                                className="nl-input fi"
                                                placeholder="(optional tag)"
                                                value={rule.rootTag || ''}
                                                list="root-tag-options"
                                                onChange={(e) => handleRuleChange(rule.id, 'rootTag', e.target.value.toLowerCase())}
                                                style={{ width: '120px' }}
                                            />
                                        </>
                                    )}
                                    <span className="nl-text">.</span>
                                </div>

                                <button type="button" className="btn-delete-rule" onClick={() => deleteRule(rule.id)} style={{ position: 'absolute', top: '10px', right: '10px' }} title="Delete Rule">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {rules.length === 0 && (
                            <p className="no-rules-message">No person rules defined. Click "Add Rule" to start.</p>
                        )}
                    </div>

                    <button type="button" className="btn-add-rule" onClick={addRule}>
                        <Plus size={16} /> Add Rule
                    </button>
                </>
            ) : (
                <div className="pronoun-matrix-container">
                    <p className="settings-description" style={{ marginBottom: '14px' }}>
                        Generate and sync all pronoun categories directly to your Lexicon. Configure active dimensions, fill in conlang translations, and click save.
                    </p>

                    {/* Dimension Selection Dashboard */}
                    <div className="dimension-selector-card">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--acc)' }}>
                            <Sliders size={14} /> Matrix Configurations
                        </h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                            {/* Persons */}
                            <div>
                                <span className="dim-group-label">Person Dimensions</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                    {Object.keys(dimPersons).map(p => (
                                        <label key={p} className="dim-checkbox-label">
                                            <input type="checkbox" checked={dimPersons[p]} onChange={(e) => setDimPersons(prev => ({ ...prev, [p]: e.target.checked }))} />
                                            <span>{p} Person</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Numbers */}
                            <div>
                                <span className="dim-group-label">Number Dimensions</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimNumbers.S} onChange={(e) => setDimNumbers(prev => ({ ...prev, S: e.target.checked }))} />
                                        <span>Singular (S)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimNumbers.P} onChange={(e) => setDimNumbers(prev => ({ ...prev, P: e.target.checked }))} />
                                        <span>Plural (P)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimNumbers.C} onChange={(e) => setDimNumbers(prev => ({ ...prev, C: e.target.checked }))} />
                                        <span>Collective (C)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimNumbers.D} onChange={(e) => setDimNumbers(prev => ({ ...prev, D: e.target.checked }))} />
                                        <span>Dual (D)</span>
                                    </label>
                                </div>
                            </div>

                            {/* Genders */}
                            <div>
                                <span className="dim-group-label">Gender / Noun Class</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.General} onChange={(e) => setDimGenders(prev => ({ ...prev, General: e.target.checked, Masc: false, Fem: false, Neut: false, Anim: false, Inan: false }))} />
                                        <span>General (None)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.Masc} onChange={(e) => setDimGenders(prev => ({ ...prev, Masc: e.target.checked, General: false }))} />
                                        <span>Masculine (3S only)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.Fem} onChange={(e) => setDimGenders(prev => ({ ...prev, Fem: e.target.checked, General: false }))} />
                                        <span>Feminine (3S only)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.Neut} onChange={(e) => setDimGenders(prev => ({ ...prev, Neut: e.target.checked, General: false }))} />
                                        <span>Neuter (3S only)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.Anim} onChange={(e) => setDimGenders(prev => ({ ...prev, Anim: e.target.checked, General: false }))} />
                                        <span>Animate (3S only)</span>
                                    </label>
                                    <label className="dim-checkbox-label">
                                        <input type="checkbox" checked={dimGenders.Inan} onChange={(e) => setDimGenders(prev => ({ ...prev, Inan: e.target.checked, General: false }))} />
                                        <span>Inanimate (3S only)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table Matrix */}
                    <div className="matrix-table-wrapper" style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto', marginTop: '16px', background: 'var(--card)', padding: '0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <table className="matrix-grid-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Category</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Subjective</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Objective</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Possessive</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Poss. Pronoun</th>
                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Reflexive</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCombinations.map(({ person, number, gender }) => {
                                    const label = `${person} ${number === 'S' ? 'Singular' : number === 'P' ? 'Plural' : number === 'C' ? 'Collective' : 'Dual'} ${gender !== 'General' ? '(' + gender + ')' : ''}`;
                                    
                                    let rowBg = 'transparent';
                                    let borderCol = 'rgba(255,255,255,0.03)';
                                    if (person === '1st') { rowBg = 'rgba(59, 130, 246, 0.03)'; borderCol = 'rgba(59, 130, 246, 0.15)'; }
                                    if (person === '2nd') { rowBg = 'rgba(16, 185, 129, 0.03)'; borderCol = 'rgba(16, 185, 129, 0.15)'; }
                                    if (person === '3rd') { rowBg = 'rgba(168, 85, 247, 0.03)'; borderCol = 'rgba(168, 85, 247, 0.15)'; }
                                    if (person === '4th') { rowBg = 'rgba(245, 158, 11, 0.03)'; borderCol = 'rgba(245, 158, 11, 0.15)'; }

                                    return (
                                        <tr key={`${person}-${number}-${gender}`} style={{ borderBottom: `1px solid ${borderCol}`, background: rowBg }}>
                                            <td style={{ padding: '12px', fontWeight: 700, color: 'var(--acc)' }}>{label}</td>
                                            {['sub', 'obj', 'det', 'pos', 'ref'].map(caseType => {
                                                const engPlaceholder = getEnglishPronoun(person, number, gender === 'General' ? '' : gender, caseType);
                                                const val = matrixData[`${person}-${number}-${gender}-${caseType}`] || '';
                                                
                                                return (
                                                    <td key={caseType} style={{ padding: '6px' }}>
                                                        <input
                                                            type="text"
                                                            value={val}
                                                            placeholder={engPlaceholder}
                                                            onChange={(e) => handleMatrixInputChange(person, number, gender, caseType, e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                background: val ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                                                                border: '1px solid var(--bd)',
                                                                color: 'var(--tx1)',
                                                                borderRadius: '6px',
                                                                padding: '8px 10px',
                                                                fontSize: '0.8rem',
                                                                outline: 'none',
                                                                transition: 'all 0.15s ease',
                                                                fontWeight: val ? 600 : 400
                                                            }}
                                                            onFocus={(e) => { e.target.style.borderColor = 'var(--acc)'; e.target.style.background = 'var(--s2)'; }}
                                                            onBlur={(e) => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = val ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'; }}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions and Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                        {saveStatus ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>
                                <CheckCircle size={16} /> {saveStatus}
                            </div>
                        ) : <div />}
                        
                        <button
                            type="button"
                            onClick={handleSaveMatrix}
                            style={{
                                background: 'var(--acc)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 0.9}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                        >
                            <Save size={15} /> Save & Sync to Lexicon
                        </button>
                    </div>
                </div>
            )}

            {/* Datalists */}
            <datalist id="person-options">
                <option value="1st">1st Person</option>
                <option value="2nd">2nd Person</option>
                <option value="3rd">3rd Person</option>
                <option value="4th">4th Person</option>
            </datalist>
            <datalist id="number-options">
                <option value="S">Singular</option>
                <option value="P">Plural</option>
                <option value="C">Collective</option>
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
            <datalist id="applies-to-options">
                <option value="all">Applies to All</option>
                <option value="noun">Nouns Only</option>
                <option value="verb">Verbs Only</option>
                <option value="adj">Adjectives Only</option>
                <option value="adv">Adverbs Only</option>
                <option value="pronoun">Pronouns Only</option>
            </datalist>
            <datalist id="root-tag-options">
                <option value="1p">1st Person Root</option>
                <option value="2p">2nd Person Root</option>
                <option value="3p">3rd Person Root</option>
                <option value="anim">Animate Roots</option>
                <option value="inan">Inanimate Roots</option>
            </datalist>
        </div>
    );
}