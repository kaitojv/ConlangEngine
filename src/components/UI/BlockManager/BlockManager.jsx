import React, { useState } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import Card from '../Card/Card.jsx';
import Button from '../Buttons/Buttons.jsx';
import Modal from '../Modal/Modal.jsx';
import FontStudioModal from '../Fontstudio/FontStudio.jsx';
import Infobox from '../Infobox/Infobox.jsx';
import { Brush, Grid3X3, Settings2, Info, Layers, Trash2, Eraser } from 'lucide-react';
import { generateBlockFontData } from '../../../utils/blockFontGenerator.jsx';
import './blockManager.css';

export default function BlockManager({ scriptId } = {}) {
    const config = useConfigStore();
    const lexicon = useLexiconStore(state => state.lexicon);
    const { consonants, vowels, otherPhonemes, updateConfig } = config;
    const updateScriptData = useConfigStore(s => s.updateScriptData);
    const updateScriptSystem = useConfigStore(s => s.updateScriptSystem);
    const defaultScriptId = config.scriptRules?.defaultScriptId || 'default';
    const targetScriptId = scriptId || defaultScriptId;
    const isDefaultScript = targetScriptId === defaultScriptId;
    // Block settings/templates live on the scriptSystems entry. For the default
    // script, prefer the script entry but fall back to the legacy top-level
    // fields so legacy projects keep rendering.
    const targetScript = config.scriptSystems?.find(s => s.id === targetScriptId);
    const blockSettings = targetScript?.blockSettings
        || (isDefaultScript ? config.blockSettings : null);
    const blockTemplates = (targetScript?.blockTemplates && targetScript.blockTemplates.length)
        ? targetScript.blockTemplates
        : (isDefaultScript ? config.blockTemplates : null);
    // Read featuralComponents from the selected script's data, falling back to
    // the legacy top-level field only for the default script.
    const featuralComponents = (config.scriptDataById?.[targetScriptId]?.featuralComponents)
        || (isDefaultScript ? config.featuralComponents : {})
        || {};
    const [drawingForComp, setDrawingForComp] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Per-script writers. updateScriptData persists glyph/font bytes to
    // IndexedDB under the chosen scriptId; small script settings
    // (blockSettings, blockTemplates) live on the scriptSystems entry itself.
    const writeScriptData = (patch) => {
        updateScriptData(targetScriptId, patch);
        if (isDefaultScript) updateConfig(patch); // mirror legacy fields
    };
    const writeScriptSettings = (patch) => {
        updateScriptSystem(targetScriptId, patch);
        if (isDefaultScript) updateConfig(patch);
    };

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
        writeScriptSettings({ blockTemplates: [...activeTemplates, newTemplate] });
    };

    const handleRemoveTemplate = (id) => {
        if (activeTemplates.length === 1) return alert("You must have at least one template.");
        writeScriptSettings({ blockTemplates: activeTemplates.filter(t => t.id !== id) });
    };

    const handleUpdateTemplate = (id, field, val) => {
        writeScriptSettings({
            blockTemplates: activeTemplates.map(t => t.id === id ? { ...t, [field]: val } : t)
        });
    };

    const handleUpdateSlotMapping = (templateId, index, field, val) => {
        writeScriptSettings({
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

    const handleAddToneMapping = () => {
        const currentToneMap = blockSettings?.toneMap || [];
        writeScriptSettings({ blockSettings: { ...blockSettings, toneMap: [...currentToneMap, { toned: '', base: '', tone: '' }] } });
    };

    const handleUpdateToneMapping = (index, field, val) => {
        const currentToneMap = blockSettings?.toneMap || [];
        const newMap = [...currentToneMap];
        newMap[index] = { ...newMap[index], [field]: val };
        writeScriptSettings({ blockSettings: { ...blockSettings, toneMap: newMap } });
    };

    const handleRemoveToneMapping = (index) => {
        const currentToneMap = blockSettings?.toneMap || [];
        writeScriptSettings({ blockSettings: { ...blockSettings, toneMap: currentToneMap.filter((_, i) => i !== index) } });
    };

    const generateBlockFont = async () => {

        setIsGenerating(true);
        try {
            const worker = new Worker(new URL('../../../utils/fontWorker.js', import.meta.url), { type: 'module' });
            
            worker.onmessage = (e) => {
                if (e.data.success) {
                    const newData = e.data.result;
                    writeScriptData({
                        syllabaryMap: newData.syllabaryMap,
                        customFontBase64: newData.customFontBase64,
                        customFont: newData.customFontBase64,
                        puaCounter: newData.puaCounter
                    });
                    alert("Block Font generated successfully! " + Object.keys(newData.syllabaryMap).length + " blocks created.");
                } else {
                    alert("Font generation failed: " + e.data.error);
                }
                setIsGenerating(false);
                worker.terminate();
            };
            
            worker.onerror = (err) => {
                alert("Worker error occurred during font generation.");
                console.error(err);
                setIsGenerating(false);
                worker.terminate();
            };
            
            // Pass a clean clone of the config state, STRIPPING massive fonts to prevent OOM serialization crashes
            const cleanConfig = { ...config, lexicon };
            delete cleanConfig.customFontBase64;
            delete cleanConfig.customFont;
            worker.postMessage({ config: JSON.parse(JSON.stringify(cleanConfig)) });
            
        } catch (e) {
            alert(e.message);
            setIsGenerating(false);
        }
    };

    const handleClearFont = () => {
        if (window.confirm("Are you sure you want to delete all compiled blocks? This will revert text back to basic base characters until you compile again.")) {
            writeScriptData({
                syllabaryMap: {},
                customFontBase64: null,
                customFont: null,
                puaCounter: 57344
            });
            alert("Compiled font data erased.");
        }
    };

    const handleSaveDrawing = (strokes) => {
        writeScriptData({
            featuralComponents: { ...featuralComponents, [drawingForComp]: strokes }
        });
        setDrawingForComp(null);
    };

    const layouts = {
        '1center': { name: '1 Center (Full)', slots: 1 },
        '2top1bottom': { name: '2 Top, 1 Bottom', slots: 3 },
        '1top2bottom': { name: '1 Top, 2 Bottom', slots: 3 },
        '1left2right': { name: '1 Left, 2 Right', slots: 3 },
        '2left1right': { name: '2 Left, 1 Right', slots: 3 },
        '3horizontal': { name: '3 Horizontal', slots: 3 },
        '3vertical': { name: '3 Vertical', slots: 3 },
        '2horizontal': { name: '2 Horizontal', slots: 2 },
        '2vertical': { name: '2 Vertical', slots: 2 },
        '1outside1inside': { name: '1 Outside, 1 Inside', slots: 2 },
        '1inside1outside': { name: '1 Inside, 1 Outside', slots: 2 },
        '2x2grid': { name: '2x2 Grid', slots: 4 }
    };

    return (
        <>
            <Card>
                <div className="bm-header">
                    <h2 className="sg-title"><Layers size={20} className="bm-icon-inline"/> Block Templates</h2>
                    <Button variant="save" onClick={handleAddTemplate}>+ Add Template</Button>
                </div>

                <div className="bm-global-settings" style={{ marginBottom: '20px', padding: '15px', background: 'var(--s2)', borderRadius: 'var(--rad)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--tx)', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={blockSettings?.compileStandaloneBases !== false} 
                            onChange={(e) => writeScriptSettings({ blockSettings: { ...blockSettings, compileStandaloneBases: e.target.checked } })}
                        />
                        <strong>Compile Standalone Bases</strong>
                    </label>
                    <p style={{ margin: '5px 0 0 25px', fontSize: '0.85rem', color: 'var(--tx2)' }}>
                        When enabled, the compiler automatically generates a 1-character block for every drawn character. This allows the Visual Picker to suggest breaking down words into individual letters. Disable to strictly enforce only the templates below.
                    </p>
                </div>
                
                <Infobox title="How to combine Syllables or Radicals">
                    <b>Want to combine full syllables instead of consonants/vowels?</b><br />
                    If you have roots like <code>"ka"</code> and <code>"ta"</code> and want to combine them into <code>"kata"</code>:<br />
                    1. Type your roots into the <b>Other Phonemes</b> box in the Sounds tab.<br />
                    2. They will appear as base characters below. Draw their strokes.<br />
                    3. Set Slot 1 and Slot 2 to <b>Other Phonemes</b>.<br />
                    The compiler will automatically generate all combinations (like <code>ka</code><code>ka</code>, <code>ka</code><code>ta</code>, etc.).
                </Infobox>
                
                {activeTemplates.map((template, tIndex) => (
                    <div key={template.id} className="bm-template-card">
                        <h4 className="bm-template-title">Template {tIndex + 1}</h4>
                        
                        {activeTemplates.length > 1 && (
                            <div className="bm-template-remove">
                                <Button variant="error" className="btn-sm" onClick={() => handleRemoveTemplate(template.id)}>
                                    <Trash2 size={14} /> Remove
                                </Button>
                            </div>
                        )}

                        <div className="bm-settings-row">
                            <div className="bm-input-group">
                                <label className="form-label"><Settings2 size={14} className="bm-icon-inline"/> Characters per Block</label>
                                <select 
                                    className="bm-select"
                                    value={template.maxChars || 3}
                                    onChange={(e) => handleUpdateTemplate(template.id, 'maxChars', parseInt(e.target.value))}
                                >
                                    <option value={1}>1 Character</option>
                                    <option value={2}>2 Characters</option>
                                    <option value={3}>3 Characters</option>
                                    <option value={4}>4 Characters</option>
                                </select>
                            </div>

                            <div className="bm-input-group">
                                <label className="form-label"><Grid3X3 size={14} className="bm-icon-inline"/> Layout</label>
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

                        <div className="bm-slot-section">
                            <h5>Slot Mapping (Define roles)</h5>
                            <div className="bm-slot-grid">
                                {Array.from({ length: template.maxChars || 3 }).map((_, i) => {
                                    let slot = (template.slotMapping || [])[i];
                                    if (typeof slot === 'string') {
                                        slot = { label: slot, source: i === 1 ? 'vowels' : 'consonants' };
                                    } else if (!slot) {
                                        slot = { label: ['Initial', 'Vowel', 'Final', 'Tone'][i] || `Slot ${i+1}`, source: i === 1 ? 'vowels' : 'consonants' };
                                    }
                                    return (
                                        <div key={i} className="bm-input-group">
                                            <label className="form-label">Slot {i + 1} Name</label>
                                            <input 
                                                className="bm-slot-input"
                                                placeholder={`Slot ${i+1}`}
                                                value={slot.label || ''}
                                                onChange={(e) => handleUpdateSlotMapping(template.id, i, 'label', e.target.value)}
                                            />
                                            <select 
                                                className="bm-select bm-select-small"
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

                <div className="bm-global-settings" style={{ marginTop: '30px', padding: '15px', background: 'var(--s2)', borderRadius: 'var(--rad)' }}>
                    <h4 className="bm-template-title" style={{ marginBottom: '10px' }}>Tone Vowel Mapping</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '15px' }}>
                        If your romanization uses tone diacritics (e.g. ō, à) but your block templates require tone to be a separate slot, define the mapping here. The compiler will automatically split them during generation.
                    </p>
                    
                    {(blockSettings?.toneMap || []).map((mapping, index) => (
                        <div key={index} className="bm-settings-row" style={{ alignItems: 'flex-end', marginBottom: '10px', background: 'var(--s1)', padding: '10px', borderRadius: '4px' }}>
                            <div className="bm-input-group">
                                <label className="form-label">Toned Vowel (e.g. ō)</label>
                                <input 
                                    className="bm-slot-input custom-font-text notranslate"
                                    placeholder="ō"
                                    value={mapping.toned || ''}
                                    onChange={(e) => handleUpdateToneMapping(index, 'toned', e.target.value)}
                                />
                            </div>
                            <div style={{ paddingBottom: '10px', color: 'var(--tx2)' }}>=</div>
                            <div className="bm-input-group" style={{ flex: 1 }}>
                                <label className="form-label">Replacement Sequence (e.g. o˧ or ˧o)</label>
                                <input 
                                    className="bm-slot-input custom-font-text notranslate"
                                    placeholder="e.g. o˧"
                                    title="IMPORTANT: The order of characters here must exactly match the order of slots in your template!"
                                    value={mapping.output !== undefined ? mapping.output : ((mapping.base || '') + (mapping.tone || ''))}
                                    onChange={(e) => handleUpdateToneMapping(index, 'output', e.target.value)}
                                />
                            </div>
                            <Button variant="error" className="btn-icon" onClick={() => handleRemoveToneMapping(index)} style={{ padding: '8px' }}>
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    ))}
                    
                    <Button variant="outline" onClick={handleAddToneMapping} style={{ marginTop: '10px' }}>
                        + Add Mapping
                    </Button>
                </div>
            </Card>

            <Card>
                <h2 className="sg-title"><Brush size={20} className="bm-icon-inline"/> Base Characters</h2>
                <p className="bm-p-margin">Draw the base shape for each character once. The Font Compiler will automatically scale and stack them according to your block rules.</p>
                
                <Infobox title="Hangul-style Base Characters">
                    Draw each base character (consonant, vowel, or radical) exactly once. The engine will automatically scale and reposition these drawings based on your layout templates to create the final blocks.
                </Infobox>

                <div className="bm-components-list">
                    {allComponents.map(comp => (
                        <div key={comp} className="bm-component-card">
                            <div className="bm-component-key custom-font-text">{comp}</div>
                            <div className="bm-component-symbol">
                                {/* Preview drawn strokes if available, else placeholder */}
                                {featuralComponents[comp] ? (
                                    <svg viewBox="0 0 300 300" width="40" height="40" className="bm-svg-preview">
                                        {featuralComponents[comp]
                                            .filter(s => Array.isArray(s) && !(s.length === 1 && (s[0].x === -999 || s[0].x === -998)))
                                            .map((stroke, i) => (
                                                <path key={i} d={`M ${stroke.map(p => `${p.x} ${p.y}`).join(' L ')}`} />
                                            ))
                                        }
                                    </svg>
                                ) : '∅'}
                            </div>
                            <Button variant="edit" className="btn-icon" onClick={() => setDrawingForComp(comp)}>
                                <Brush size={16} />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="bm-compile-section">
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <Button 
                            variant="save" 
                            onClick={generateBlockFont} 
                            disabled={isGenerating}
                            className={isGenerating ? 'btn-loading' : ''}
                        >
                            {isGenerating ? 'Rebuilding Font...' : 'Rebuild Font from Lexicon'}
                        </Button>
                        <Button 
                            variant="error" 
                            onClick={handleClearFont}
                            disabled={isGenerating}
                        >
                            <Eraser size={16} style={{marginRight: '5px'}} /> Clear Data
                        </Button>
                    </div>
                    <p className="bm-compile-help">
                        {isGenerating 
                            ? "Working in the background... you can keep using the app!"
                            : "Compiles only the blocks used in your lexicon. New words auto-compile their blocks when saved."
                        }
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
