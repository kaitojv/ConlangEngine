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
    const { consonants, vowels, blockSettings, featuralComponents, updateConfig } = config;
    const [drawingForComp, setDrawingForComp] = useState(null);

    const parseList = (str) => str.split(',')
        .map(s => {
            let clean = s.trim();
            if (clean.includes('=')) clean = clean.split('=')[0].trim();
            return clean;
        })
        .filter(Boolean);

    const allComponents = [...new Set([...parseList(consonants), ...parseList(vowels)])];

    const handleUpdateSettings = (key, val) => {
        updateConfig({
            blockSettings: { ...blockSettings, [key]: val }
        });
    };

    const handleUpdateSlotMapping = (index, field, val) => {
        const newMapping = [...(blockSettings.slotMapping || [])];
        
        // Convert legacy string to proper object if necessary
        let currentSlot = newMapping[index];
        if (typeof currentSlot === 'string') {
            currentSlot = { label: currentSlot, source: index === 1 ? 'vowels' : 'consonants' };
        } else if (!currentSlot) {
            currentSlot = { label: `Slot ${index+1}`, source: index === 1 ? 'vowels' : 'consonants' };
        }

        newMapping[index] = { ...currentSlot, [field]: val };
        handleUpdateSettings('slotMapping', newMapping);
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
        // We bypass the standard "save to PUA" inside FontStudio by intercepting it or handling the strokes
        // But FontStudio currently calls `compileFont` and adds to `customGlyphs`.
        // We will just steal the strokes and save them to `featuralComponents`
        updateConfig({
            featuralComponents: { ...featuralComponents, [drawingForComp]: strokes }
        });
        setDrawingForComp(null);
    };

    // Layout templates definition
    const layouts = {
        '2top1bottom': { name: '2 Top, 1 Bottom', slots: 3 },
        '1top2bottom': { name: '1 Top, 2 Bottom', slots: 3 },
        '1left2right': { name: '1 Left, 2 Right', slots: 3 },
        '3horizontal': { name: '3 Horizontal', slots: 3 },
        '2horizontal': { name: '2 Horizontal', slots: 2 },
        '2vertical': { name: '2 Vertical', slots: 2 },
        '2x2grid': { name: '2x2 Grid', slots: 4 }
    };

    const currentLayout = layouts[blockSettings.layoutTemplate] || layouts['2top1bottom'];

    return (
        <>
            <Card>
                <div className="bm-settings-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="form-label"><Settings2 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Characters per Block</label>
                        <select 
                            className="bm-select"
                            value={blockSettings.maxChars || 3}
                            onChange={(e) => handleUpdateSettings('maxChars', parseInt(e.target.value))}
                        >
                            <option value={2}>2 Characters</option>
                            <option value={3}>3 Characters</option>
                            <option value={4}>4 Characters</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label className="form-label"><Grid3X3 size={14} style={{display:'inline', marginBottom:'-2px'}}/> Layout Template</label>
                        <select 
                            className="bm-select"
                            value={blockSettings.layoutTemplate || '2top1bottom'}
                            onChange={(e) => handleUpdateSettings('layoutTemplate', e.target.value)}
                        >
                            {Object.entries(layouts).map(([key, data]) => {
                                if (data.slots === (blockSettings.maxChars || 3)) {
                                    return <option key={key} value={key}>{data.name}</option>
                                }
                                return null;
                            })}
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '10px' }}>Slot Mapping (Define roles)</h4>
                    <div className="bm-slot-grid">
                        {Array.from({ length: blockSettings.maxChars || 3 }).map((_, i) => {
                            let slot = (blockSettings.slotMapping || [])[i];
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
                                        onChange={(e) => handleUpdateSlotMapping(i, 'label', e.target.value)}
                                    />
                                    <select 
                                        className="bm-select" 
                                        style={{ width: '100px', fontSize: '0.8rem', padding: '4px' }}
                                        value={slot.source || (i === 1 ? 'vowels' : 'consonants')}
                                        onChange={(e) => handleUpdateSlotMapping(i, 'source', e.target.value)}
                                    >
                                        <option value="consonants">Consonants</option>
                                        <option value="vowels">Vowels</option>
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                </div>
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
