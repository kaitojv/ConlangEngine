import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    X, Book, Sparkles, FileText, Download, AlertTriangle, 
    Loader2, Table2, FileSpreadsheet, FileCode, Gamepad, 
    Package, Languages, Globe, Layers, CheckCircle2,
    BookOpen, Terminal, Maximize
} from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { MINECRAFT_KEYS, autoMatchLexicon } from '../../../utils/minecraftExporter.jsx';
import './exportModal.css';

export const ExportModal = ({ isOpen, type, onClose, onExport }) => {
    // Standard Exporter States
    const [includeInflections, setIncludeInflections] = useState(true);
    const [inflectionMode, setInflectionMode] = useState('compact');
    const [isProcessing, setIsProcessing] = useState(false);

    // Global Store States
    const config = useConfigStore(state => state);
    const lexicon = useLexiconStore(state => state.lexicon || []);

    // Minecraft Exporter States
    const [langName, setLangName] = useState('');
    const [langCode, setLangCode] = useState('');
    const [regionName, setRegionName] = useState('Conlangia');
    const [bidirectional, setBidirectional] = useState(false);
    const [packFormat, setPackFormat] = useState('15');
    const [activeCategory, setActiveCategory] = useState('Interface');
    const [customTranslations, setCustomTranslations] = useState({});

    // Reset and initialize Minecraft configurations reactively on mount/open
    useEffect(() => {
        if (isOpen && type === 'minecraft') {
            const confName = config.conlangName || 'My Conlang';
            setLangName(`${confName} Pack`);
            
            const generatedCode = confName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .slice(0, 8) + '_res';
            setLangCode(generatedCode);
            setRegionName('Conlangia');
            setBidirectional(false);
            setPackFormat('15');
            setActiveCategory('Interface');

            // Automatically scan lexicon for matching keys
            const initialTrans = {};
            MINECRAFT_KEYS.forEach(item => {
                const match = autoMatchLexicon(item.english, lexicon);
                initialTrans[item.key] = match || '';
            });
            setCustomTranslations(initialTrans);
        }
    }, [isOpen, type, config.conlangName, lexicon]);

    if (!isOpen) return null;

    const isRichDocument = type === 'pdf' || type === 'docx';

    const templates = [
        { 
            id: 'academic', 
            name: 'Academic Paper', 
            desc: 'Classic serif typography, clean tables, and a formal layout. Best for linguistics papers.',
            icon: Book,
            color: '#64748b'
        },
        { 
            id: 'modern', 
            name: 'Modern Reference', 
            desc: 'Bold purple accents, sans-serif fonts, and a sleek digital feel.',
            icon: Sparkles,
            color: '#a855f7'
        },
        { 
            id: 'manuscript', 
            name: 'Aesthetic Manuscript', 
            desc: 'Typewriter fonts and off-white backgrounds for a classic worldbuilding vibe.',
            icon: FileText,
            color: '#f59e0b'
        },
        {
            id: 'fantasy',
            name: 'Fantasy Grimoire',
            desc: 'Elegant serif fonts with rich gold and crimson accents. Perfect for high-fantasy conlangs.',
            icon: BookOpen,
            color: '#b45309'
        },
        {
            id: 'cyberpunk',
            name: 'Cyberpunk Datafile',
            desc: 'Dark background, neon accents, and monospace terminal fonts for sci-fi worldbuilding.',
            icon: Terminal,
            color: '#10b981'
        },
        {
            id: 'minimalist',
            name: 'Clean Minimalist',
            desc: 'High contrast, sans-serif typography with generous whitespace. Focuses purely on content.',
            icon: Maximize,
            color: '#0f172a'
        }
    ];

    const handleExportClick = (templateId = 'default') => {
        setIsProcessing(true);
        setTimeout(() => {
            if (type === 'minecraft') {
                onExport(customTranslations, {
                    langName,
                    langCode,
                    regionName,
                    bidirectional,
                    packFormat
                });
            } else {
                onExport(templateId, {
                    includeInflections,
                    inflectionMode
                });
            }
            setIsProcessing(false);
            onClose();
        }, 100);
    };

    const handleTranslationChange = (key, value) => {
        setCustomTranslations(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getFormatIcon = () => {
        if (type === 'sheets') return <FileSpreadsheet size={20} className="text-green-400" />;
        if (type === 'obsidian') return <FileCode size={20} className="text-orange-400" />;
        if (type === 'minecraft') return <Gamepad size={20} className="text-purple-400" />;
        return <Download size={20} className="text-purple-400" />;
    };

    const translatedCount = Object.values(customTranslations).filter(v => v && v.trim() !== '').length;

    return ReactDOM.createPortal(
        <div className="export-modal-overlay" onClick={isProcessing ? undefined : onClose}>
            <div className={`export-modal ${type === 'minecraft' ? 'minecraft-modal-wide' : ''}`} onClick={e => e.stopPropagation()}>
                
                {isProcessing && (
                    <div className="export-processing-overlay">
                        <Loader2 className="processing-spinner" size={48} />
                        <h3>{type === 'minecraft' ? 'Assembling Resource Pack...' : 'Processing Documentation...'}</h3>
                        <p>{type === 'minecraft' ? 'Compressing zip file and generating custom icon.' : 'Generating complex morphology tables. Please wait.'}</p>
                    </div>
                )}

                <div className="vrb-header">
                    <div className="vrb-header-title-group">
                        {getFormatIcon()}
                        <h2>Export {type === 'minecraft' ? 'Minecraft Resource Pack' : `${type?.toUpperCase()} Reference`}</h2>
                    </div>
                    <button className="export-modal-close-btn" onClick={onClose} disabled={isProcessing}>
                        <X size={20} />
                    </button>
                </div>

                <div className="export-modal-content">
                    {type === 'minecraft' ? (
                        <div className="minecraft-wizard-layout">
                            
                            {/* Left Panel: Pack Configuration */}
                            <div className="mc-settings-panel">
                                <h3 className="panel-title"><Package size={16} /> Pack Settings</h3>
                                
                                <div className="mc-field">
                                    <label>Resource Pack Name</label>
                                    <input 
                                        type="text" 
                                        value={langName} 
                                        onChange={e => setLangName(e.target.value)} 
                                        placeholder="e.g. High Elvish Language Pack"
                                    />
                                </div>

                                <div className="mc-field-row">
                                    <div className="mc-field">
                                        <label>Language Code</label>
                                        <input 
                                            type="text" 
                                            value={langCode} 
                                            onChange={e => setLangCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                                            placeholder="e.g. qya_val"
                                        />
                                        <small>Lowercase alphanumeric (e.g. art_custom)</small>
                                    </div>
                                    <div className="mc-field">
                                        <label>Region / Country</label>
                                        <input 
                                            type="text" 
                                            value={regionName} 
                                            onChange={e => setRegionName(e.target.value)} 
                                            placeholder="e.g. Valinor"
                                        />
                                        <small>Where the conlang is spoken</small>
                                    </div>
                                </div>

                                <div className="mc-field">
                                    <label>Minecraft Target Version</label>
                                    <select value={packFormat} onChange={e => setPackFormat(e.target.value)}>
                                        <option value="15">1.20 - 1.20.1 (Format 15)</option>
                                        <option value="18">1.20.2+ (Format 18)</option>
                                        <option value="13">1.19.4 (Format 13)</option>
                                        <option value="12">1.19 - 1.19.3 (Format 12)</option>
                                        <option value="9">1.18.2 (Format 9)</option>
                                        <option value="6">1.16.5 (Format 6)</option>
                                    </select>
                                </div>

                                <div className="mc-field checkbox-field">
                                    <label className="mc-checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={bidirectional} 
                                            onChange={e => setBidirectional(e.target.checked)} 
                                        />
                                        <span>Right-to-Left (RTL) / Bidirectional</span>
                                    </label>
                                </div>

                                <div className="mc-preview-card">
                                    <h4>Real-Time pack.mcmeta Preview</h4>
                                    <div className="mc-code-box">
                                        <pre>
{`{
  "pack": {
    "pack_format": ${packFormat},
    "description": "${langName}"
  },
  "language": {
    "${langCode || 'art_custom'}": {
      "name": "${config.conlangName || 'My Conlang'}",
      "region": "${regionName}",
      "bidirectional": ${bidirectional}
    }
  }
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Interactive Translation Mapper */}
                            <div className="mc-mapper-panel">
                                <div className="mc-mapper-header">
                                    <h3 className="panel-title"><Languages size={16} /> Translation Mapper</h3>
                                    <span className="mc-progress-badge">
                                        <CheckCircle2 size={12} /> {translatedCount} / {MINECRAFT_KEYS.length} Keys
                                    </span>
                                </div>
                                
                                <p className="mc-mapper-desc">
                                    Below are the most prominent translation keys in Minecraft. The engine automatically scanned your lexicon for matching glosses. You can override or manually enter terms below:
                                </p>

                                <div className="mc-tabs">
                                    {['Interface', 'Blocks', 'Items & Tools', 'Gameplay'].map(cat => (
                                        <button 
                                            key={cat} 
                                            className={`mc-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                                            onClick={() => setActiveCategory(cat)}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                <div className="mc-keys-scroll">
                                    <div className="mc-keys-grid">
                                        {MINECRAFT_KEYS.filter(item => item.category === activeCategory).map(item => {
                                            const autoMatched = autoMatchLexicon(item.english, lexicon);
                                            const isAutoMatched = autoMatched && customTranslations[item.key] === autoMatched;
                                            
                                            return (
                                                <div key={item.key} className="mc-key-card">
                                                    <div className="mc-key-meta">
                                                        <span className="mc-eng">{item.english}</span>
                                                        <span className="mc-key-id">{item.key}</span>
                                                    </div>
                                                    <div className="mc-input-wrapper">
                                                        <input 
                                                            type="text" 
                                                            value={customTranslations[item.key] || ''} 
                                                            onChange={e => handleTranslationChange(item.key, e.target.value)} 
                                                            placeholder={`Translate: "${item.english}"`}
                                                            className={isAutoMatched ? 'auto-matched' : ''}
                                                        />
                                                        {isAutoMatched && (
                                                            <span className="mc-match-badge" title="Automatically pre-filled from your lexicon">
                                                                Lexicon Match
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="plain-export-action" style={{ marginTop: '16px' }}>
                                    <Button variant="save" onClick={() => handleExportClick()} style={{ width: '100%', padding: '16px', fontSize: '1.05rem', gap: '8px' }}>
                                        <Gamepad size={18} /> Compile & Download Resource Pack
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <>
                            <div className="export-options-section">
                                <div className="export-option-row">
                                    <div className="option-info">
                                        <Table2 size={16} />
                                        <span>Include Inflection Matrices</span>
                                    </div>
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={includeInflections} 
                                            onChange={e => setIncludeInflections(e.target.checked)} 
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                {includeInflections && (
                                    <div className="export-sub-options">
                                        <label className="export-label">Matrix Detail Level</label>
                                        <div className="export-mode-grid">
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'compact' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('compact')}
                                            >
                                                <h4>Compact</h4>
                                                <p>Rules only</p>
                                            </button>
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'affix' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('affix')}
                                            >
                                                <h4>Full (Affix)</h4>
                                                <p>Rules + Persons</p>
                                            </button>
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'free' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('free')}
                                            >
                                                <h4>Full (Free)</h4>
                                                <p>Rules + Pronouns</p>
                                            </button>
                                        </div>
                                        
                                        {inflectionMode !== 'compact' && (
                                            <div className="export-warning-box">
                                                <AlertTriangle size={16} />
                                                <span><b>Warning:</b> Full paradigms create huge files. Do not close the browser while processing.</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isRichDocument ? (
                                <>
                                    <p className="export-hint">Finally, choose a visual style for your document:</p>
                                    <div className="template-grid">
                                        {templates.map(tmp => (
                                            <div key={tmp.id} className="template-card" onClick={() => handleExportClick(tmp.id)}>
                                                <div className="template-icon" style={{ background: `${tmp.color}22`, color: tmp.color }}>
                                                    <tmp.icon size={24} />
                                                </div>
                                                <div className="template-info">
                                                    <h3>{tmp.name}</h3>
                                                    <p>{tmp.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="plain-export-action">
                                    <p className="export-hint">This format does not support visual templates. Click below to generate your {type === 'sheets' ? 'Excel' : 'Markdown'} file.</p>
                                    <Button variant="save" onClick={() => handleExportClick()} style={{ width: '100%', padding: '20px', fontSize: '1.1rem' }}>
                                        <Download size={20} /> Generate {type?.toUpperCase()} Export
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="vrb-footer">
                    <Button variant="edit" onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} disabled={isProcessing}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
