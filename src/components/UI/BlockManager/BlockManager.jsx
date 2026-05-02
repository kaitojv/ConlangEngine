import React, { useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import Card from '../Card/Card.jsx';
import Button from '../Buttons/Buttons.jsx';
import Modal from '../Modal/Modal.jsx';
import FontStudioModal from '../Fontstudio/FontStudio.jsx';
import { Brush, Grid3X3, Settings2 } from 'lucide-react';
import { generateBlockFontData } from '../../../utils/blockFontGenerator.jsx';
import './blockManager.css';

export default function BlockManager() {
    const config = useConfigStore();
    const { consonants, vowels, otherPhonemes, blockSettings, blockTemplates, featuralComponents, updateConfig } = config;
    const [drawingForComp, setDrawingForComp] = useState(null);

    const activeTemplates = blockTemplates || (blockSettings ? [
        {
            id: 'legacy',
            maxChars: blockSettings.maxChars || 3,
            layoutTemplate: blockSettings.layoutTemplate || '2top1bottom',
            slotMapping: blockSettings.slotMapping || []
        }
    ] : [
        {
            id: 'default',
            maxChars: 3,
            layoutTemplate: '2top1bottom',
            slotMapping: [{label:'Initial', source:'consonants'}, {label:'Vowel', source:'vowels'}, {label:'Final', source:'consonants'}]
        }
    ]);

    const parseList = (str) => str.split(',')
        .map(s => {
            let clean = s.trim();
            if (clean.includes('=')) clean = clean.split('=')[0].trim();
            return clean;
        })
        .filter(Boolean);

    const allComponents = [...new Set([...parseList(consonants), ...parseList(vowels), ...parseList(otherPhonemes || '')])];

    const handleAddTemplate = () => {
        const newTemplate = {
            id: `template-${Date.now()}`,
            maxChars: 2,
            layoutTemplate: '2horizontal',
            slotMapping: [{label:'Consonant', source:'consonants'}, {label:'Vowel', source:'vowels'}]
        };
        updateConfig({ blockTemplates: [...activeTemplates, newTemplate] });
    };

    const handleRemoveTemplate = (id) => {
        if (activeTemplates.length === 1) return alert("You must have at least one template.");
        updateConfig({ blockTemplates: activeTemplates.filter(t => t.id !== id) });
    };

    const handleUpdateTemplate = (id, field, val) => {
        updateConfig({
            blockTemplates: activeTemplates.map(t => t.id === id ? { ...t, [field]: val } : t)
        });
    };

    const handleUpdateSlotMapping = (templateId, index, field, val) => {
        updateConfig({
            blockTemplates: activeTemplates.map(t => {
                if (t.id !== templateId) return t;
                const newMapping = [...(t.slotMapping || [])];
                let currentSlot = newMapping[index] || { label: `Slot ${index+1}`, source: index === 1 ? 'vowels' : 'consonants' };
                if (typeof currentSlot === 'string') currentSlot = { label: currentSlot, source: index === 1 ? 'vowels' : 'consonants' };
                newMapping[index] = { ...currentSlot, [field]: val };
                return { ...t, slotMapping: newMapping };
            })
        });
    };

    const generateBlockFont = async () => {
        try {
            const newData = await generateBlockFontData(config);
            updateConfig({
                syllabaryMap: newData.syllabaryMap,
                customFontBase64: newData.customFontBase64,
                customFont: newData.customFontBase64,
                puaCounter: newData.puaCounter
            });
            alert("Block Font generated successfully! " + Object.keys(newData.syllabaryMap).length + " blocks created.");
        } catch (e) {
            alert(e.message);
        }
    };

    const handleSaveDrawing = (strokes) => {
        updateConfig({
            featuralComponents: { ...featuralComponents, [drawingForComp]: strokes }
        });
        setDrawingForComp(null);
    };

    const layouts = {
        '2top1bottom': { name: '2 Top, 1 Bottom', slots: 3 },
        '1top2bottom': { name: '1 Top, 2 Bottom', slots: 3 },
        '1left2right': { name: '1 Left, 2 Right', slots: 3 },
        '3horizontal': { name: '3 Horizontal', slots: 3 },
        '2horizontal': { name: '2 Horizontal', slots: 2 },
        '2vertical': { name: '2 Vertical', slots: 2 },
        '1inside1outside': { name: '1 Inside, 1 Outside', slots: 2 },
        '2x2grid': { name: '2x2 Grid', slots: 4 }
    };

    return (
        <>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 className="sg-title" style={{ margin: 0 }}>Block Templates</h3>
                    <Button variant="save" onClick={handleAddTemplate}>+ Add Template</Button>
                </div>
                
                {activeTemplates.map((template, tIndex) => (
                    <div key={template.id} style={{ padding: '15px', border: '1px solid var(--bd)', borderRadius: '8px', marginBottom: '15px', position: 'relative' }}>
                        <h4 style={{ marginBottom: '15px', color: 'var(--tx)' }}>Template {tIndex + 1}</h4>
                        
                        {activeTemplates.length > 1 && (
                            <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                <Button variant="error-sm" onClick={() => handleRemoveTemplate(template.id)}>Remove</Button>
                            </div>
                        )}

                        <div className="bm-settings-row">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label className="form-label"><Settings2 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Characters per Block</label>
                                <select 
                                    className="bm-select"
                                    value={template.maxChars || 3}
                                    onChange={(e) => handleUpdateTemplate(template.id, 'maxChars', parseInt(e.target.value))}
                                >
                                    <option value={2}>2 Characters</option>
                                    <option value={3}>3 Characters</option>
                                    <option value={4}>4 Characters</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label className="form-label"><Grid3X3 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Layout</label>
                                <select 
                                    className="bm-select"
                                    value={template.layoutTemplate || '2top1bottom'}
                                    onChange={(e) => handleUpdateTemplate(template.id, 'layoutTemplate', e.target.value)}
                                >
                                    {Object.entries(layouts).map(([key, data]) => {
                                        if (data.slots === (template.maxChars || 3)) {
                                            return <option key={key} value={key}>{data.name}</option>
                                        }
                                        return null;
                                    })}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <h5 style={{ marginBottom: '10px' }}>Slot Mapping (Define roles)</h5>
                            <div className="bm-slot-grid">
                                {Array.from({ length: template.maxChars || 3 }).map((_, i) => {
                                    let slot = (template.slotMapping || [])[i];
                                    if (typeof slot === 'string') {
                                        slot = { label: slot, source: i === 1 ? 'vowels' : 'consonants' };
                                    } else if (!slot) {
                                        slot = { label: ['Initial', 'Vowel', 'Final', 'Tone'][i] || `Slot ${i+1}`, source: i === 1 ? 'vowels' : 'consonants' };
                                    }
                                    return (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <label className="form-label">Slot {i + 1} Name</label>
                                            <input 
                                                className="bm-slot-input"
                                                placeholder={`Slot ${i+1}`}
                                                value={slot.label || ''}
                                                onChange={(e) => handleUpdateSlotMapping(template.id, i, 'label', e.target.value)}
                                            />
                                            <select 
                                                className="bm-select" 
                                                style={{ width: '100px', fontSize: '0.8rem', padding: '4px' }}
                                                value={slot.source || (i === 1 ? 'vowels' : 'consonants')}
                                                onChange={(e) => handleUpdateSlotMapping(template.id, i, 'source', e.target.value)}
                                            >
                                                <option value="consonants">Consonants</option>
                                                <option value="vowels">Vowels</option>
                                                <option value="otherPhonemes">Other Phonemes</option>
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </Card>

            <Card>
                <h3 className="sg-title">Base Characters</h3>
                <p style={{ marginBottom: '15px' }}>Draw the base shape for each character once. The Font Compiler will automatically scale and stack them according to your block rules.</p>
                
                <div className="bm-components-list">
                    {allComponents.map(comp => (
                        <div key={comp} className="bm-component-card">
                            <div className="bm-component-key">{comp}</div>
                            <div className="bm-component-symbol custom-font-text">
                                {/* Preview drawn strokes if available, else placeholder */}
                                {featuralComponents[comp] ? (
                                    <svg viewBox="0 0 300 300" width="40" height="40" style={{ stroke: 'var(--tx)', fill: 'none', strokeWidth: 10, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                                        {featuralComponents[comp].map((stroke, i) => (
                                            <path key={i} d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`} />
                                        ))}
                                    </svg>
                                ) : '∅'}
                            </div>
                            <Button variant="edit-sm" onClick={() => setDrawingForComp(comp)}>
                                <Brush size={14} /> Draw
                            </Button>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
                    <Button variant="save" onClick={generateBlockFont}>
                        Compile Block Font
                    </Button>
                    <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--tx2)' }}>
                        This will mathematically combine all possible valid blocks based on your slots and generate a functional font mapping.
                    </p>
                </div>
            </Card>

            <Modal 
                isOpen={!!drawingForComp} 
                onClose={() => setDrawingForComp(null)} 
                title="Draw Base Character"
            >
                <FontStudioModal 
                    targetLabel={drawingForComp} 
                    onSave={(newChar, strokes) => {
                        // The default FontStudio calls onSave with just newChar. We need to modify it to pass strokes!
                        handleSaveDrawing(strokes);
                    }} 
                    onCancel={() => setDrawingForComp(null)} 
                />
            </Modal>
        </>
    );
}
