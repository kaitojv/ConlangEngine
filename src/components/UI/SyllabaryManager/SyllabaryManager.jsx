import { useState } from "react";
import { useConfigStore } from "@/store/useConfigStore";
import { LayoutGrid, List, Brush, Info, Trash2, Wand2 } from "lucide-react";
import React from 'react'
import Card from "../Card/Card.jsx";
import Button from "../Buttons/Buttons.jsx";
import './syllabaryManager.css';
import Modal from "../Modal/Modal.jsx";
import FontStudioModal from "../Fontstudio/FontStudio.jsx";
import Infobox from "../Infobox/Infobox.jsx";
import { SCRIPT_MAPS, composeHangulSyllable } from "../../../utils/transliteration.js";
import toast from 'react-hot-toast';


export default function SyllabaryManager({ scriptId } = {}) {
  
  const [viewMode, setViewMode] = useState('grid');

  const [newSylKey, setNewSylKey] = useState('');
  const [newSylVal, setNewSylVal] = useState('');
  const [drawingForSyl, setDrawingForSyl] = useState(null);

  const consonants = useConfigStore(s => s.consonants);
  const vowels = useConfigStore(s => s.vowels);
  const otherPhonemes = useConfigStore(s => s.otherPhonemes);
  const legacySyllabaryMap = useConfigStore(s => s.syllabaryMap);
  const scriptDataById = useConfigStore(s => s.scriptDataById);
  const defaultScriptId = useConfigStore(s => s.scriptRules?.defaultScriptId) || 'default';
  const legacyAlphabeticScript = useConfigStore(s => s.alphabeticScript) || 'latin';
  const updateConfig = useConfigStore(s => s.updateConfig);
  const updateScriptData = useConfigStore(s => s.updateScriptData);

  const targetScriptId = scriptId || defaultScriptId;
  const isDefault = targetScriptId === defaultScriptId;
  // Read from script-scoped data; fall back to legacy top-level only for default.
  const syllabaryMap = scriptDataById?.[targetScriptId]?.syllabaryMap
    || (isDefault ? legacySyllabaryMap : {})
    || {};
  const alphabeticScript = scriptDataById?.[targetScriptId]?.alphabeticScript
    || (isDefault ? legacyAlphabeticScript : 'latin');

  // Route writes to the selected script. Mirror to legacy field for default so
  // transliteration / public viewer keep working.
  const writeSyllabaryMap = (nextMap) => {
    updateScriptData(targetScriptId, { syllabaryMap: nextMap });
    if (isDefault) updateConfig({ syllabaryMap: nextMap });
  };

  const parseList = (str) => str.split(',')
  .map(s=>{
    let clean = s.trim();
    if (clean.includes('=')) clean = clean.split('=')[0].trim();
    return clean;
  })
  .filter(Boolean);

  const consList = ["", ...parseList(consonants)];
  const vowList = parseList(vowels);
  const otherList = parseList(otherPhonemes || '');

  const handleUpdateSyllable = (key, val) => {
        writeSyllabaryMap({ ...syllabaryMap, [key]: val });
    };

    const handleAddSyllable = () => {
        if (!newSylKey.trim()) return alert("Type the romanized syllable first!");
        handleUpdateSyllable(newSylKey.trim().toLowerCase(), newSylVal.trim());
        setNewSylKey('');
        setNewSylVal('');
    };

    const handleRemoveSyllable = (key) => {
        const newMap = {...syllabaryMap};
        delete newMap[key];
        writeSyllabaryMap(newMap);
    };

    const handleAutoMap = () => {
        if (alphabeticScript === 'hangul_syllables') {
            const newMap = { ...syllabaryMap };
            let count = 0;
            
            const allSyls = [];
            consList.forEach(c => {
                vowList.forEach(v => allSyls.push(c + v));
            });
            otherList.forEach(p => allSyls.push(p));
            
            allSyls.forEach(syl => {
                if (!newMap[syl]) {
                    // Try to extract initial, vowel, final from the syllable string
                    let initial = '';
                    let vowel = '';
                    let final = '';
                    
                    let vIdx = -1;
                    for (let i = 0; i < syl.length; i++) {
                        if (vowList.includes(syl.substring(i))) {
                            vIdx = i;
                            break; // Find longest matching vowel? Or just simple? Let's just use naive split since it's CV mostly
                        }
                    }
                    
                    // A better way to split CV for standard phonologies:
                    // Try to match longest vowel in the middle
                    let bestVowel = '';
                    for (const v of vowList) {
                        if (v && syl.includes(v) && v.length > bestVowel.length) {
                            bestVowel = v;
                        }
                    }
                    
                    if (bestVowel) {
                        const parts = syl.split(bestVowel);
                        initial = parts[0] || '';
                        final = parts.slice(1).join(bestVowel) || ''; // Re-join if vowel appeared twice
                        vowel = bestVowel;
                        
                        const composed = composeHangulSyllable(initial, vowel, final);
                        if (composed) {
                            newMap[syl] = composed;
                            count++;
                        }
                    }
                }
            });
            
            if (count > 0) {
                writeSyllabaryMap(newMap);
                toast.success(`Auto-mapped ${count} missing Hangul syllables!`);
            } else {
                toast('No missing Hangul syllables to map.', { icon: 'ℹ️' });
            }
            return;
        }

        const mappingObj = alphabeticScript !== 'custom' && SCRIPT_MAPS[alphabeticScript] ? SCRIPT_MAPS[alphabeticScript] : null;
        if (!mappingObj) {
             toast('No pre-existing script mapping selected for this script.', { icon: 'ℹ️' });
             return;
        }

        const newMap = { ...syllabaryMap };
        let count = 0;

        const allSyls = [];
        consList.forEach(c => {
            vowList.forEach(v => allSyls.push(c + v));
        });
        otherList.forEach(p => allSyls.push(p));

        allSyls.forEach(syl => {
            if (!newMap[syl]) {
                const mapped = mappingObj[syl];
                if (mapped) {
                    newMap[syl] = mapped;
                    count++;
                }
            }
        });

        if (count > 0) {
            writeSyllabaryMap(newMap);
            toast.success(`Auto-mapped ${count} missing syllables!`);
        } else {
            toast('No missing syllables to map.', { icon: 'ℹ️' });
        }
    };

    return (
    <>
        <Card>
        <div className="bm-header">
            <h2 className="sg-title"><LayoutGrid size={20} className="sm-title-icon"/> Syllabary Grid</h2>
        </div>
        <p className="bm-p-margin">Map your syllables to characters. You can draw custom characters or paste existing Unicode symbols.</p>

        <Infobox title="How to use the Syllabary">
            • <b>Grid View:</b> Quickly map CV (Consonant-Vowel) combinations. Empty cells default to the syllable text itself.<br />
            • <b>List View:</b> Add complex syllables (like CVC or CCC) that don't fit in the standard grid.<br />
            • <b>Custom Fonts:</b> Click the <b>Draw</b> button in List View to create your own unique character shapes!<br />
            • <b>Typography Forms:</b> If Capitalization or Contextual Forms are enabled in Orthography, you can map variants in List View using suffixes (e.g. <code>ki_uppercase</code>, <code>ki_initial</code>).
        </Infobox>

        <div className="sm-toggle-group">
            <Button 
                variant={viewMode === 'grid' ? 'toggle-active' : 'toggle'}
                onClick={() => setViewMode('grid')}
            >
                <LayoutGrid size={16} /> Grid View (CV)
            </Button>
            <Button 
                variant={viewMode === 'list' ? 'toggle-active' : 'toggle'}
                onClick={() => setViewMode('list')}
            >
                <List size={16} /> List View (Complex)
            </Button>
            <Button 
                variant="primary" 
                className="btn-sm" 
                style={{ marginLeft: 'auto' }}
                onClick={handleAutoMap}
                title={`Auto-fill missing characters using ${alphabeticScript} mapping`}
            >
                <Wand2 size={14} style={{ marginRight: '6px' }}/> Auto-Map Script
            </Button>
        </div>

        {viewMode === 'grid' && (
            <>
                <div className="sm-table-wrapper">
                    <table className="sm-table">
                        <thead className="sm-thead">
                            <tr>
                                <th className="sm-th"></th>
                                {vowList.map(v => (
                                    <th key={v} className="sm-th">{v}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {consList.map((c, i) => (
                                <tr key={i} className="sm-tr">
                                    <th className="sm-th-row">
                                        {c === "" ? "Ø" : c}
                                    </th>
                                    {vowList.map(v => {
                                        const syl = c + v;
                                        const savedChar = syllabaryMap[syl] || "";
                                        return (
                                            <td key={syl} className="sm-td">

                                                <input 
                                                    type="text" 
                                                    className="sm-grid-input custom-font-text" 
                                                    placeholder={syl}
                                                    value={savedChar}
                                                    onChange={(e) => handleUpdateSyllable(syl, e.target.value)}
                                                />
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {otherList.length > 0 && (
                <div className="sm-mt-20">
                    <h4 className="sm-subtitle"><Info size={14}/> Other Phonemes (Standalone)</h4>
                    <div className="sm-table-wrapper">
                    <table className="sm-table">
                            <tbody>
                                <tr className="sm-tr">
                                    {otherList.map(p => (
                                        <th key={p} className="sm-th">{p}</th>
                                    ))}
                                </tr>
                                <tr className="sm-tr">
                                    {otherList.map(p => {
                                        const savedChar = syllabaryMap[p] || "";
                                        return (
                                            <td key={p} className="sm-td">
                                                <input 
                                                    type="text" 
                                                    className="sm-grid-input custom-font-text" 
                                                    placeholder={p}
                                                    value={savedChar}
                                                    onChange={(e) => handleUpdateSyllable(p, e.target.value)}
                                                />
                                            </td>
                                        )
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
            </>
            )}

            {viewMode === 'list' && (
                <div>
                    <div className="sm-add-group">
                        <input 
                            type="text" 
                            className="sm-list-input" 
                            placeholder="Romanized (e.g. strin, n, tt)"
                            value={newSylKey}
                            onChange={(e) => setNewSylKey(e.target.value)}
                        />
                        <input 
                            type="text" 
                            className="sm-list-input sm-list-input-lg custom-font-text" 
                            placeholder="Symbol (e.g. 𐍁, ん)"
                            value={newSylVal}
                            onChange={(e) => setNewSylVal(e.target.value)}
                        />
                        <Button variant="edit" onClick={handleAddSyllable}>
                            + Add
                        </Button>
                    </div>

                    <div className="sm-list-grid">
                        {Object.keys(syllabaryMap).length === 0 ? (
                            <i className="sm-empty-msg">No symbols mapped yet.</i>
                        ) : (
                            Object.keys(syllabaryMap).sort().map(key => (
                                <div key={key} className="sm-list-card">
                                    <div className="sm-list-card-info">
                                        <span className="sm-list-card-symbol custom-font-text">{syllabaryMap[key] || '∅'}</span>
                                        <span className="sm-list-card-key">{key}</span>
                                    </div>
                                    <div className="sm-list-card-actions">
                                        <Button variant="edit" className="btn-icon" onClick={() => setDrawingForSyl(key)}>
                                            <Brush size={16} />
                                        </Button>
                                        <Button variant="error" className="btn-icon" onClick={() => handleRemoveSyllable(key)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </Card>

        <Modal 
            isOpen={!!drawingForSyl} 
            onClose={() => setDrawingForSyl(null)} 
            title="Draw Custom Symbol"
        >
            <FontStudioModal 
                targetLabel={drawingForSyl} 
                onSave={(newChar) => {
                    handleUpdateSyllable(drawingForSyl, newChar);
                    setDrawingForSyl(null);
                }} 
                onCancel={() => setDrawingForSyl(null)} 
            />
        </Modal>
    </>
  )
}
