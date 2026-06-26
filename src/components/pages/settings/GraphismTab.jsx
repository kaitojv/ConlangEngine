import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Type, Monitor } from 'lucide-react';
import Card from '../../UI/Card/Card.jsx';
import { CONLANG_FONTS } from '../../../utils/useFontInjector.jsx';
import './graphismTab.css';

export default function TypographyStudio() {
    const conlangFontFamily = useConfigStore(state => state.conlangFontFamily) || "'Outfit', sans-serif";
    const typographySettings = useConfigStore(state => state.typographySettings) || { activeDisplayMode: 'Base' };
    const updateConfig = useConfigStore(state => state.updateConfig);

    const scriptSystemsRaw = useConfigStore(state => state.scriptSystems);
    const scriptSystems = scriptSystemsRaw || [];
    const defaultScriptId = useConfigStore(state => state.scriptRules?.defaultScriptId) || 'default';
    const legacyWritingDirection = useConfigStore(state => state.writingDirection) || 'ltr';
    const updateScriptSystem = useConfigStore(state => state.updateScriptSystem);

    const [editingScriptId, setEditingScriptId] = useState(defaultScriptId);

    const selectedScript = useMemo(() => {
        const list = scriptSystemsRaw || [];
        return list.find(s => s.id === editingScriptId)
            || list.find(s => s.id === defaultScriptId)
            || list[0]
            || null;
    }, [scriptSystemsRaw, editingScriptId, defaultScriptId]);

    const selectedScriptId = selectedScript?.id || defaultScriptId;
    const isDefaultSelected = selectedScriptId === defaultScriptId;
    const hasMultipleScripts = scriptSystems.length > 1;

    const writingDirection = selectedScript?.writingDirection
        || (isDefaultSelected ? legacyWritingDirection : 'ltr');

    const handleWritingDirection = (e) => {
        const next = e.target.value;
        updateScriptSystem(selectedScriptId, { writingDirection: next });
        if (isDefaultSelected) {
            updateConfig({ writingDirection: next });
        }
    };

    const handleFontChange = (e) => {
        const selectedFontName = e.target.value;
        const fontConfig = CONLANG_FONTS.find(f => f.name === selectedFontName);
        if (fontConfig) {
            const fontString = `'${fontConfig.name}', ${fontConfig.category}`;
            updateConfig({ conlangFontFamily: fontString });
        }
    };

    // Extract current font name for the dropdown value
    const currentFontName = conlangFontFamily.replace(/['"]/g, '').split(',')[0].trim();

    return (
        <div className="tab-pane-container">
            <Infobox title="Typography & Writing">
                Select the font and writing direction for your conlang. This will be applied globally across the dictionary, grammar wiki, and readers!
            </Infobox>

            {hasMultipleScripts && (
                <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', margin: 0 }}>
                            Editing Script
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', margin: 0 }}>
                            Two writing systems can share the same script type. Pick which one this Graphism page edits.
                        </p>
                    </div>
                    <select
                        className="sg-select"
                        style={{ minWidth: '260px', padding: '0.5rem', marginLeft: 'auto' }}
                        value={selectedScriptId}
                        onChange={(e) => setEditingScriptId(e.target.value)}
                    >
                        {scriptSystems.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                                {s.id === defaultScriptId ? ' (default)' : ''}
                            </option>
                        ))}
                    </select>
                </Card>
            )}

            <Card style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    
                    {/* Font Family Selector */}
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Type size={18} /> Conlang Font Family
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                            Choose the font that will be used to render your conlang text globally.
                        </p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                            value={currentFontName}
                            onChange={handleFontChange}
                        >
                            {CONLANG_FONTS.map(font => (
                                <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                    {font.name} ({font.category})
                                </option>
                            ))}
                        </select>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--s1)', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                            <h4 style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '10px' }}>Live Preview</h4>
                            <div className="custom-font-text" style={{ fontSize: '1.5rem', color: 'var(--tx)' }}>
                                The quick brown fox jumps over the lazy dog.
                            </div>
                        </div>
                    </div>

                    {/* Writing Direction */}
                    <div style={{ flex: '1 1 300px' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem' }}>Writing Direction</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>Define how the language is written on the page.</p>
                        <select 
                            className="sg-select" 
                            style={{ width: '100%', padding: '0.75rem' }}
                            value={writingDirection}
                            onChange={handleWritingDirection}
                        >
                            <option value="ltr">Horizontal (Left to Right)</option>
                            <option value="rtl">Horizontal (Right to Left)</option>
                            <option value="vertical-rl">Vertical (Top to Bottom, R-L)</option>
                            <option value="vertical-lr">Vertical (Top to Bottom, L-R)</option>
                        </select>

                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--tx)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Monitor size={16} className="text-accent" /> Letter Spacing
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '1rem' }}>
                                Adjust the gap between characters specifically for your conlang text.
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <input 
                                    type="range" 
                                    min="-1.5" 
                                    max="1.5" 
                                    step="0.1" 
                                    value={typographySettings.letterSpacing || 0}
                                    onChange={(e) => updateConfig({ typographySettings: { ...typographySettings, letterSpacing: parseFloat(e.target.value) } })}
                                    style={{ flex: 1, accentColor: 'var(--acc)' }}
                                />
                                <span style={{ color: 'var(--tx)', fontWeight: 'bold', minWidth: '40px' }}>
                                    {(typographySettings.letterSpacing || 0).toFixed(1)}em
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
