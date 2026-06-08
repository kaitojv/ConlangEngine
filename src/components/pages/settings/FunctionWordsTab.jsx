import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../UI/Card/Card.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { Plus, Trash2, Wand2, Grid, List, Save, Sliders, CheckCircle, Users } from 'lucide-react';
import './functionWordsTab.css';
import './personRulesEditor.css';

// English helper to get default pronouns based on dimensions
const getEnglishPronoun = (person, number, gender, caseType) => {
    const isColl = number === 'C';
    const isPlur = number === 'P' || number === 'D';
    const isNone = number === 'N';

    if (caseType === 'dem') {
        if (gender === 'Near') return isPlur ? 'these' : 'this';
        if (gender === 'Far') return isPlur ? 'those' : 'that';
        return 'that/this';
    }
    if (caseType === 'int') {
        if (gender === 'Anim') return 'who / whom';
        if (gender === 'Inan') return 'what / which';
        return 'who / what';
    }
    if (caseType === 'rel') {
        if (gender === 'Anim') return 'who / that';
        if (gender === 'Inan') return 'which / that';
        return 'that';
    }
    if (caseType === 'ind') {
        if (gender === 'Anim') return 'somebody / anyone / everyone';
        if (gender === 'Inan') return 'something / anything / everything';
        return 'someone / something';
    }

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
                if (caseType === 'sub') return 'they (animate)';
                if (caseType === 'obj') return 'them (animate)';
                if (caseType === 'det') return 'their (animate)';
                if (caseType === 'pos') return 'theirs (animate)';
                if (caseType === 'ref') return 'themselves (animate)';
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

export default function FunctionWordsTab() {
    const storedPersonRules = useConfigStore((state) => state.personRules);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const setLexicon = useLexiconStore((state) => state.setLexicon);

    const [rules, setRules] = useState([]);
    const hasAutoChecked = useRef(false);
    
    // Matrix dimensions - Personal Pronouns
    const [dimPersons, setDimPersons] = useState({ '1st': true, '2nd': true, '3rd': true, '4th': false });
    const [dimNumbers, setDimNumbers] = useState({ 'S': true, 'P': true, 'C': false, 'D': false, 'N': false });
    const [dimGenders, setDimGenders] = useState({ 'General': true, 'Masc': false, 'Fem': false, 'Neut': false, 'Anim': false, 'Inan': false });

    // Matrix dimensions - Other Pronouns (Demonstrative, Interrogative, Relative, Indefinite)
    const [dimOtherLocation, setDimOtherLocation] = useState({ 'Near': true, 'Far': true, 'General': false });
    const [dimOtherAnimacy, setDimOtherAnimacy] = useState({ 'Anim': true, 'Inan': true, 'General': false });
    
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

                const match = personNumberGender.match(/^(\d)(S|P|B|C|D|N)(?:\.(.+))?$/i);
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
                    else if (personNumberGender.includes('N')) number = 'N';
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

    // Populate Matrix from Lexicon and Rules
    useEffect(() => {
        const initialData = {};
        
        // 1. Pre-fill from personRules (Subjective form & Affix)
        rules.forEach(rule => {
            const g = rule.gender || 'General';
            if (rule.freeForm) {
                initialData[`${rule.person}-${rule.number}-${g}-sub`] = rule.freeForm;
            }
            if (rule.affix) {
                initialData[`${rule.person}-${rule.number}-${g}-affix`] = rule.affix;
            }
        });

            // 2. Pre-fill from Lexicon
            lexicon.forEach(entry => {
                if (entry.wordClass?.toLowerCase() === 'pronoun' && entry.translation) {
                    const trans = entry.translation.toLowerCase();
                    
                    // Personal Pronouns check
                    const activePersons = ['1st', '2nd', '3rd', '4th'];
                    const activeNumbers = ['S', 'P', 'C', 'D', 'N'];
                    const activeGenders = ['General', 'Masc', 'Fem', 'Neut', 'Anim', 'Inan'];
                    const cases = ['sub', 'obj', 'det', 'pos', 'ref'];

                    for (const p of activePersons) {
                        for (const n of activeNumbers) {
                            for (const g of activeGenders) {
                                for (const c of cases) {
                                    const eng = getEnglishPronoun(p, n, g === 'General' ? '' : g, c).toLowerCase();
                                    if (eng === trans) {
                                        initialData[`${p}-${n}-${g}-${c}`] = entry.word;
                                    }
                                }
                            }
                        }
                    }

                    // Other Pronouns check
                    const otherLocs = ['Near', 'Far', 'General'];
                    const otherAnims = ['Anim', 'Inan', 'General'];
                    const otherCases = ['dem', 'int', 'rel', 'ind'];

                    for (const loc of otherLocs) {
                        for (const anim of otherAnims) {
                            for (const n of activeNumbers) {
                                for (const c of otherCases) {
                                    const prop = c === 'dem' ? loc : anim;
                                    const eng = getEnglishPronoun('Other', n, prop, c).toLowerCase();
                                    // simplistic matching for demo
                                    if (trans.includes(eng.split('/')[0].trim())) {
                                        initialData[`Other-${n}-${loc}-${anim}-${c}`] = entry.word;
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setMatrixData(initialData);

            // Auto-enable checkboxes so saved pronouns don't appear "hidden" on reload
            // But only do this ONCE per session, so we don't overwrite user's manual un-checks when they click Save
            if (!hasAutoChecked.current && Object.keys(initialData).length > 0) {
                hasAutoChecked.current = true;
                
                setDimPersons(prev => {
                    const next = { ...prev };
                    Object.keys(initialData).forEach(key => {
                        const [p] = key.split('-');
                        if (next[p] !== undefined) next[p] = true;
                    });
                    return next;
                });
                
                setDimNumbers(prev => {
                    const next = { ...prev };
                    Object.keys(initialData).forEach(key => {
                        const parts = key.split('-');
                        const num = parts[1];
                        if (next[num] !== undefined) next[num] = true;
                    });
                    return next;
                });

                setDimGenders(prev => {
                    const next = { ...prev };
                    Object.keys(initialData).forEach(key => {
                        const parts = key.split('-');
                        if (parts[0] !== 'Other') {
                            const gender = parts[2];
                            if (next[gender] !== undefined) next[gender] = true;
                        }
                    });
                    return next;
                });

                setDimOtherLocation(prev => {
                    const next = { ...prev };
                    Object.keys(initialData).forEach(key => {
                        const parts = key.split('-');
                        if (parts[0] === 'Other') {
                            const loc = parts[2];
                            if (next[loc] !== undefined) next[loc] = true;
                        }
                    });
                    return next;
                });

                setDimOtherAnimacy(prev => {
                    const next = { ...prev };
                    Object.keys(initialData).forEach(key => {
                        const parts = key.split('-');
                        if (parts[0] === 'Other') {
                            const anim = parts[3];
                            if (next[anim] !== undefined) next[anim] = true;
                        }
                    });
                    return next;
                });
            }

    }, [rules, lexicon]);

    const updateStore = (updatedRules) => {
        const sortedRules = [...updatedRules].sort((a, b) => {
            const personOrder = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4 };
            const numberOrder = { 'S': 1, 'D': 2, 'B': 3, 'P': 4, 'C': 5, 'N': 6 };
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

    // Matrix Generation Combinations
    const activePersonalCombinations = useMemo(() => {
        const list = [];
        const persons = Object.keys(dimPersons).filter(p => dimPersons[p]);
        const numbers = Object.keys(dimNumbers).filter(n => dimNumbers[n]);
        const genders = Object.keys(dimGenders).filter(g => dimGenders[g]);

        persons.forEach(p => {
            numbers.forEach(n => {
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

    const activeOtherCombinations = useMemo(() => {
        const list = [];
        const locs = Object.keys(dimOtherLocation).filter(l => dimOtherLocation[l]);
        const anims = Object.keys(dimOtherAnimacy).filter(a => dimOtherAnimacy[a]);
        const numbers = Object.keys(dimNumbers).filter(n => dimNumbers[n]);

        locs.forEach(loc => {
            anims.forEach(anim => {
                numbers.forEach(num => {
                    list.push({ loc, anim, num });
                });
            });
        });
        return list;
    }, [dimOtherLocation, dimOtherAnimacy, dimNumbers]);

    const handleMatrixInputChange = (key, value) => {
        setMatrixData(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveMatrix = () => {
        const newLexicon = [...lexicon];
        const newRules = [...rules];

        let addedCount = 0;
        let updatedCount = 0;

        // Save Personal Pronouns & Affixes
        activePersonalCombinations.forEach(({ person, number, gender }) => {
            const cleanGender = gender === 'General' ? '' : gender;
            const existingRuleIdx = newRules.findIndex(
                r => r.person === person && r.number === number && (r.gender || '') === cleanGender
            );

            const subKey = `${person}-${number}-${gender}-sub`;
            const subVal = matrixData[subKey]?.trim() || '';

            const affixKey = `${person}-${number}-${gender}-affix`;
            const affixVal = matrixData[affixKey]?.trim() || '';

            // Update Person Rules store with Affix & Standalone
            if (subVal || affixVal) {
                if (existingRuleIdx !== -1) {
                    newRules[existingRuleIdx] = { 
                        ...newRules[existingRuleIdx], 
                        freeForm: subVal, 
                        affix: affixVal 
                    };
                } else {
                    newRules.push({
                        id: Math.random().toString(36).substring(2, 9),
                        person, number, gender: cleanGender, freeForm: subVal, affix: affixVal, appliesTo: 'all'
                    });
                }
            } else if (!subVal && !affixVal && existingRuleIdx !== -1) {
                // If user cleared both, remove the rule
                newRules.splice(existingRuleIdx, 1);
            }

            // Also save all pronoun cases to lexicon
            const cases = ['sub', 'obj', 'det', 'pos', 'ref'];
            cases.forEach(caseType => {
                const key = `${person}-${number}-${gender}-${caseType}`;
                const conlangVal = matrixData[key]?.trim();

                if (!conlangVal) return;

                const englishTrans = getEnglishPronoun(person, number, gender === 'General' ? '' : gender, caseType);
                const desc = `${person} Person ${number === 'S' ? 'Singular' : number === 'P' ? 'Plural' : number === 'C' ? 'Collective' : 'Dual'} ${gender !== 'General' ? gender : ''} ${caseType.toUpperCase()} Pronoun`;

                const existingIdx = newLexicon.findIndex(
                    e => e.wordClass?.toLowerCase() === 'pronoun' && 
                    e.translation?.toLowerCase() === englishTrans.toLowerCase()
                );

                if (existingIdx !== -1) {
                    newLexicon[existingIdx] = { ...newLexicon[existingIdx], word: conlangVal, definition: desc };
                    updatedCount++;
                } else {
                    newLexicon.push({
                        id: Math.random().toString(36).substring(2, 9),
                        word: conlangVal,
                        wordClass: 'Pronoun',
                        translation: englishTrans,
                        definition: desc,
                        tags: ['pronoun', 'personal'],
                        createdAt: Date.now()
                    });
                    addedCount++;
                }
            });
        });

        // Save Other Pronouns
        activeOtherCombinations.forEach(({ loc, anim, num }) => {
            const cases = ['dem', 'int', 'rel', 'ind'];
            cases.forEach(caseType => {
                const key = `Other-${num}-${loc}-${anim}-${caseType}`;
                const conlangVal = matrixData[key]?.trim();

                if (!conlangVal) return;

                const prop = caseType === 'dem' ? loc : anim;
                const englishTrans = getEnglishPronoun('Other', num, prop, caseType).split('/')[0].trim();
                const desc = `${loc !== 'General' ? loc : ''} ${anim !== 'General' ? anim : ''} ${num !== 'N' ? num : ''} ${caseType.toUpperCase()} Pronoun`;

                const existingIdx = newLexicon.findIndex(
                    e => e.wordClass?.toLowerCase() === 'pronoun' && 
                    e.translation?.toLowerCase().includes(englishTrans.toLowerCase())
                );

                if (existingIdx !== -1) {
                    newLexicon[existingIdx] = { ...newLexicon[existingIdx], word: conlangVal, definition: desc };
                    updatedCount++;
                } else {
                    newLexicon.push({
                        id: Math.random().toString(36).substring(2, 9),
                        word: conlangVal,
                        wordClass: 'Pronoun',
                        translation: englishTrans,
                        definition: desc,
                        tags: ['pronoun', caseType],
                        createdAt: Date.now()
                    });
                    addedCount++;
                }
            });
        });

        setLexicon(newLexicon);
        updateStore(newRules);

        setSaveStatus(`Successfully synced to Lexicon! Added ${addedCount} and updated ${updatedCount} pronouns.`);
        setTimeout(() => setSaveStatus(null), 5000);
    };

    return (
        <div className="function-words-tab-container grammar-tab-container">
            <Card>
                <h2 className="flex sg-title"><Users /> Pronouns & Alignment</h2>
                <Infobox title="Pronoun & Affix Guide">
                    Define how each grammatical person (1st, 2nd, 3rd) or noun class is represented.
                    <br /><br />
                    • Use the Matrix below to generate and sync massive pronoun tables (Personal, Demonstrative, Relative) directly to your Lexicon.
                </Infobox>

                <div className="person-rules-editor">
                    <div className="pronoun-matrix-container">
                            {/* Dimension Selection Dashboard */}
                            <div className="dimension-selector-card">
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--acc)' }}>
                                    <Sliders size={14} /> Matrix Configurations
                                </h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
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
                                                <input type="checkbox" checked={dimNumbers.N} onChange={(e) => setDimNumbers(prev => ({ ...prev, N: e.target.checked }))} />
                                                <span>None (No Number)</span>
                                            </label>
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

                                    {/* Genders / Animacy */}
                                    <div>
                                        <span className="dim-group-label">Gender / Animacy</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.General} onChange={(e) => setDimGenders(prev => ({ ...prev, General: e.target.checked, Masc: false, Fem: false, Neut: false, Anim: false, Inan: false }))} />
                                                <span>General (None)</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.Masc} onChange={(e) => setDimGenders(prev => ({ ...prev, Masc: e.target.checked, General: false }))} />
                                                <span>Masculine</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.Fem} onChange={(e) => setDimGenders(prev => ({ ...prev, Fem: e.target.checked, General: false }))} />
                                                <span>Feminine</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.Neut} onChange={(e) => setDimGenders(prev => ({ ...prev, Neut: e.target.checked, General: false }))} />
                                                <span>Neuter</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.Anim} onChange={(e) => setDimGenders(prev => ({ ...prev, Anim: e.target.checked, General: false }))} />
                                                <span>Animate</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimGenders.Inan} onChange={(e) => setDimGenders(prev => ({ ...prev, Inan: e.target.checked, General: false }))} />
                                                <span>Inanimate</span>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Location (for Dem) */}
                                    <div>
                                        <span className="dim-group-label">Location (Demonstrative)</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimOtherLocation.Near} onChange={(e) => setDimOtherLocation(prev => ({ ...prev, Near: e.target.checked }))} />
                                                <span>Near (This)</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimOtherLocation.Far} onChange={(e) => setDimOtherLocation(prev => ({ ...prev, Far: e.target.checked }))} />
                                                <span>Far (That)</span>
                                            </label>
                                            <label className="dim-checkbox-label">
                                                <input type="checkbox" checked={dimOtherLocation.General} onChange={(e) => setDimOtherLocation(prev => ({ ...prev, General: e.target.checked }))} />
                                                <span>General</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ marginTop: '20px', color: 'var(--acc)' }}>1. Personal Pronouns</h3>
                            <div className="matrix-table-wrapper" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', background: 'var(--card)', padding: '0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <table className="matrix-grid-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Category</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Affix</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Subjective</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Objective</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Poss. Determiner</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Poss. Pronoun</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Reflexive</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activePersonalCombinations.map(({ person, number, gender }) => {
                                            const label = `${person} ${number !== 'N' ? number : ''} ${gender !== 'General' ? '(' + gender + ')' : ''}`;
                                            return (
                                                <tr key={`${person}-${number}-${gender}`} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                                                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--acc)' }}>{label}</td>
                                                    {['affix', 'sub', 'obj', 'det', 'pos', 'ref'].map(caseType => {
                                                        const engPlaceholder = caseType === 'affix' ? 'e.g. -m, s-' : getEnglishPronoun(person, number, gender === 'General' ? '' : gender, caseType);
                                                        const key = `${person}-${number}-${gender}-${caseType}`;
                                                        const val = matrixData[key] || '';
                                                        return (
                                                            <td key={caseType} style={{ padding: '6px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    placeholder={engPlaceholder}
                                                                    onChange={(e) => handleMatrixInputChange(key, e.target.value)}
                                                                    className="matrix-input"
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

                            <h3 style={{ marginTop: '30px', color: 'var(--acc)' }}>2. Demonstrative, Interrogative, Relative & Indefinite</h3>
                            <div className="matrix-table-wrapper" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto', background: 'var(--card)', padding: '0', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <table className="matrix-grid-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Category</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Demonstrative</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Interrogative</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Relative</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--tx2)', position: 'sticky', top: 0, background: 'var(--s2)', zIndex: 2 }}>Indefinite</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeOtherCombinations.map(({ loc, anim, num }) => {
                                            const label = `${loc !== 'General' ? loc : ''} ${anim !== 'General' ? anim : ''} ${num !== 'N' ? num : ''}`.trim() || 'General';
                                            return (
                                                <tr key={`Other-${num}-${loc}-${anim}`} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                                                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--acc)' }}>{label}</td>
                                                    {['dem', 'int', 'rel', 'ind'].map(caseType => {
                                                        const prop = caseType === 'dem' ? loc : anim;
                                                        const engPlaceholder = getEnglishPronoun('Other', num, prop, caseType);
                                                        const key = `Other-${num}-${loc}-${anim}-${caseType}`;
                                                        const val = matrixData[key] || '';
                                                        return (
                                                            <td key={caseType} style={{ padding: '6px' }}>
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    placeholder={engPlaceholder}
                                                                    onChange={(e) => handleMatrixInputChange(key, e.target.value)}
                                                                    className="matrix-input"
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
                                >
                                    <Save size={15} /> Save & Sync to Lexicon
                                </button>
                            </div>
                        </div>
                    </div>
            </Card>
        </div>
    );
}
