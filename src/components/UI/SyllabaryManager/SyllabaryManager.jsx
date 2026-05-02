import { useState } from "react";
import { useConfigStore } from "@/store/useConfigStore";
import { LayoutGrid, List, Brush, Info, Trash2 } from "lucide-react";
import React from 'react'
import Card from "../Card/Card.jsx";
import Button from "../Buttons/Buttons.jsx";
import './syllabaryManager.css';
import Modal from "../Modal/Modal.jsx";
import FontStudioModal from "../Fontstudio/FontStudio.jsx";
import Infobox from "../Infobox/Infobox.jsx";


export default function SyllabaryManager() {
  
  const [viewMode, setViewMode] = useState('grid');

  const [newSylKey, setNewSylKey] = useState('');
  const [newSylVal, setNewSylVal] = useState('');
  const [drawingForSyl, setDrawingForSyl] = useState(null);

  const {consonants, vowels, otherPhonemes, syllabaryMap, updateConfig} = useConfigStore();

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
        updateConfig({ 
            syllabaryMap: { ...syllabaryMap, [key]: val } 
        });
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
        updateConfig({ syllabaryMap: newMap });
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
            • <b>Custom Fonts:</b> Click the <b>Draw</b> button in List View to create your own unique character shapes!
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
