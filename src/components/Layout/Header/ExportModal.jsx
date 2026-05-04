
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Book, Sparkles, FileText, Download, AlertTriangle, Loader2, Table2, FileSpreadsheet, FileCode } from 'lucide-react';
import Button from '../../UI/Buttons/Buttons.jsx';
import './exportModal.css';

export const ExportModal = ({ isOpen, type, onClose, onExport }) => {
    const [includeInflections, setIncludeInflections] = useState(true);
    const [inflectionMode, setInflectionMode] = useState('compact');
    const [isProcessing, setIsProcessing] = useState(false);

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
        }
    ];

    const handleExportClick = (templateId = 'default') => {
        setIsProcessing(true);
        // We use setTimeout to allow the UI to render the processing state before the heavy lifting starts
        setTimeout(() => {
            onExport(templateId, {
                includeInflections,
                inflectionMode
            });
            setIsProcessing(false);
            onClose();
        }, 100);
    };

    const getFormatIcon = () => {
        if (type === 'sheets') return <FileSpreadsheet size={20} className="text-green-400" />;
        if (type === 'obsidian') return <FileCode size={20} className="text-orange-400" />;
        return <Download size={20} className="text-purple-400" />;
    };

    return ReactDOM.createPortal(
        <div className="export-modal-overlay" onClick={isProcessing ? undefined : onClose}>
            <div className="export-modal" onClick={e => e.stopPropagation()}>
                
                {isProcessing && (
                    <div className="export-processing-overlay">
                        <Loader2 className="processing-spinner" size={48} />
                        <h3>Processing Documentation...</h3>
                        <p>Generating complex morphology tables. Please wait.</p>
                    </div>
                )}

                <div className="vrb-header">
                    <div className="vrb-header-title-group">
                        {getFormatIcon()}
                        <h2>Export {type?.toUpperCase()} Reference</h2>
                    </div>
                    <button className="export-modal-close-btn" onClick={onClose} disabled={isProcessing}>
                        <X size={20} />
                    </button>
                </div>

                <div className="export-modal-content">
                    
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
