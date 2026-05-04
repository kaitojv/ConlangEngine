
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Menu, Home, Printer, Save, FolderUp, User, Cloud, FileText, Table, FileEdit, Download } from 'lucide-react';

// Bring in our UI components and styling
import Button from '../../UI/Buttons/Buttons.jsx';
import './header.css';

// Hook up our global stores and database
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { generateConlangPDF } from '../../../utils/pdfGenerator.jsx';
import { generateObsidianMarkdown } from '../../../utils/obsidianExporter.jsx';
import { generateSheetsExport } from '../../../utils/sheetsExporter.jsx';
import { generateDocxExport } from '../../../utils/docxExporter.jsx';
import { ExportModal } from './ExportModal.jsx';
import { sanitizeBackup } from '../../../utils/schemaValidator.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';

export default function Header({ openMenu }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const { transliterate } = useTransliterator();
    
    const [session, setSession] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [exportType, setExportType] = useState(null); // 'pdf', 'docx', 'obsidian', 'sheets'

    // Listen for auth changes and figure out if the user has an active Pro subscription
    useEffect(() => {
        const checkLiveStatus = async (currentSession) => {
            if (!currentSession) {
                setIsLive(false);
                useConfigStore.setState({ isProActive: false });
                return;
            }

            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_pro, live_until')
                    .eq('id', currentSession.user.id)
                    .single();

                let activeLive = false;
                
                if (data) {
                    if (data.is_pro) {
                        activeLive = true;
                    } else if (data.live_until) {
                        const safeDateStr = data.live_until.replace(' ', 'T');
                        activeLive = new Date(safeDateStr) > new Date();
                    }
                }
                
                setIsLive(activeLive);
                
                // Silently sync with the global store so the NavBar unlocks properly
                useConfigStore.setState({ isProActive: activeLive });
            } catch (err) {
                setIsLive(false);
            }
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            checkLiveStatus(session);
        });
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            checkLiveStatus(session);
        });
        
        return () => subscription.unsubscribe();
    }, []);

    // Bundle up all the current conlang data and trigger a JSON file download
    const handleSave = () => {
        const config = useConfigStore.getState();
        const project = useProjectStore.getState();
        const lexicon = useLexiconStore.getState();

        const saveData = { config, project, lexicon };
        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.conlangName || 'MyConlang'}_Backup.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Read a JSON backup file, validate it, and safely inject into our global stores
    const handleLoad = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const rawData = JSON.parse(e.target.result);
                
                // SEC-4: Validate and sanitize the backup through our schema validator
                const data = sanitizeBackup(rawData);
                
                // BUG-1: Use proper store setters instead of raw setState
                if (data.config) {
                    useConfigStore.getState().setFullConfig(data.config);
                }
                if (data.lexicon) {
                    useLexiconStore.getState().setLexicon(data.lexicon);
                }
                alert("Project loaded successfully!");
            } catch (err) {
                console.error("Failed to parse save file:", err);
                alert(`Invalid save file! ${err.message || 'Ensure it is a valid JSON backup.'}`);
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; 
    };

    const handleExport = (template, options) => {
        const config = useConfigStore.getState();
        const lexicon = useLexiconStore.getState().lexicon || [];
        const transliteratedLexicon = lexicon.map(w => ({
            ...w,
            displayWord: transliterate(w.word.replace(/\*/g, ''), lexicon)
        }));

        if (exportType === 'pdf') {
            generateConlangPDF(config, transliteratedLexicon, template, options);
        } else if (exportType === 'docx') {
            generateDocxExport(config, lexicon, template, options);
        } else if (exportType === 'obsidian') {
            generateObsidianMarkdown(config, transliteratedLexicon, options);
        } else if (exportType === 'sheets') {
            generateSheetsExport(config, lexicon, options);
        }
        
        setExportType(null);
    };

    return (
        <>
        <header className="hdr">
            <div className="hdr-flex">
                <div className="hdr-left">
                    <button className="toggle-btn" onClick={openMenu} title="Toggle Menu">
                        <Menu size={20} />
                    </button>
                    <div className="hdr-brand">
                        <h1 className="app-dinamic-title">ConlangEngine</h1>
                        {isLive ? (
                            <span className="hdr-badge badge-live">
                                <Cloud size={14} /> LIVE
                            </span>
                        ) : (
                            <span className="hdr-badge">Local</span>
                        )}
                    </div>
                </div>

                <div className="hdr-actions">
                    <div className="hdr-right">
                        <Button className="hdr-btn" onClick={() => navigate('/')}>
                            <Home /> <span>Home</span>
                        </Button>
                        <div className="export-menu-wrapper">
                            <Button className="hdr-btn export-trigger">
                                <Download /> <span>Export</span>
                            </Button>
                            <div className="export-dropdown">
                                <button className="export-opt" onClick={() => setExportType('pdf')}>
                                    <Printer size={14} /> PDF Document
                                </button>
                                <button className="export-opt" onClick={() => setExportType('obsidian')}>
                                    <FileText size={14} /> Obsidian (MD)
                                </button>
                                <button className="export-opt" onClick={() => setExportType('docx')}>
                                    <FileEdit size={14} /> Word (DOCX)
                                </button>
                                <button className="export-opt" onClick={() => setExportType('sheets')}>
                                    <Table size={14} /> Sheets (CSV)
                                </button>
                            </div>
                        </div>
                        <Button className="hdr-btn" onClick={handleSave}>
                            <Save /> <span>Save</span>
                        </Button>
                        <input 
                            type="file" 
                            accept=".json" 
                            ref={fileInputRef} 
                            onChange={handleLoad} 
                            className="hidden-file-input"
                        />
                        <Button className="hdr-btn" onClick={() => fileInputRef.current.click()}>
                            <FolderUp /> <span>Load</span>
                        </Button>
                    </div>
                    
                    <NavLink to="/profile" className="profile-header-button" title="Profile">
                        <User size={20} />
                    </NavLink>
                </div>
            </div>
        </header>

        <ExportModal 
            isOpen={!!exportType} 
            type={exportType}
            onClose={() => setExportType(null)} 
            onExport={handleExport}
        />
        </>
    );
};
