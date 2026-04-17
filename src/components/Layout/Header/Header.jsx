import React, { useRef, useState, useEffect } from 'react';
import './header.css' //Importing styles from CSS file
import {Menu, Home, Printer, Save, FolderUp, User, Cloud} from 'lucide-react'
import Button from '../../UI/Buttons/Buttons.jsx';
import { useNavigate, NavLink } from 'react-router-dom';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const SUPABASE_URL = 'https://hgeuyvgjhonklflcdinj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ye_8zJGOXQBma3O3TMHDaA_Nr0eCYIy';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


export default function Header({ openMenu }){

    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const isProActive = useConfigStore(state => state.isProActive);
    const [session, setSession] = useState(null);
    const [isLive, setIsLive] = useState(false);

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
                // Silently sync global store so NavBar unlocks without spamming the activity log
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

    const handleLoad = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.config) useConfigStore.setState(data.config);
                if (data.project) useProjectStore.setState(data.project);
                if (data.lexicon) useLexiconStore.setState(data.lexicon);
                alert("Project loaded successfully!");
            } catch (err) {
                console.error("Failed to parse save file:", err);
                alert("Invalid save file! Ensure it is a valid JSON backup.");
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input to allow loading the same file again if needed
    };

    const handleGeneratePDF = () => {
        const config = useConfigStore.getState();
        const lexicon = useLexiconStore.getState().lexicon || [];

        const printWindow = window.open('', '', 'height=900,width=800');
        if (!printWindow) return alert("Please allow pop-ups to generate the PDF.");

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${config.conlangName || 'Conlang'} - Reference Document</title>
                <style>
                    ${config.customFontBase64 ? `
                    @font-face {
                        font-family: 'ConlangCustomFont';
                        src: url('${config.customFontBase64}') format('truetype');
                    }
                    .custom-font { font-family: 'ConlangCustomFont', sans-serif; }
                    ` : ''}
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
                    h1 { color: #111; text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 5px; }
                    .subtitle { text-align: center; font-size: 1.1rem; color: #555; margin-bottom: 30px; }
                    h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 40px; page-break-after: avoid; }
                    h3 { color: #444; margin-top: 20px; }
                    p { margin: 8px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; }
                    .page-break { page-break-before: always; }
                    .wiki-page { margin-bottom: 30px; }
                    .tag { display: inline-block; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; }
                </style>
            </head>
            <body>
                <h1>${config.conlangName || 'My Conlang'}</h1>
                <div class="subtitle">
                    <strong>Author:</strong> ${config.authorName || 'Anonymous'}<br/>
                    ${config.description || ''}
                </div>

                <h2>1. Phonology</h2>
                <p><strong>Typology:</strong> <span style="text-transform: capitalize;">${config.phonologyTypes || 'Not specified'}</span></p>
                <p><strong>Consonants:</strong> <span class="custom-font">${config.consonants || 'None'}</span></p>
                <p><strong>Vowels:</strong> <span class="custom-font">${config.vowels || 'None'}</span></p>
                <p><strong>Syllable Structure:</strong> ${config.syllablePattern || 'None'}</p>
                <p><strong>Historical Rules:</strong> ${config.historicalRules || 'None'}</p>

                <h2>2. Grammar & Syntax</h2>
                <p><strong>Word Order:</strong> ${config.syntaxOrder || 'SVO'}</p>
                <p><strong>Writing Direction:</strong> <span style="text-transform: uppercase;">${config.writingDirection || 'LTR'}</span></p>
                <p><strong>Verb Marker:</strong> ${config.verbMarker || 'None'}</p>
                <p><strong>Person Rules:</strong> ${config.personRules || 'None'}</p>
                <p><strong>Clitics/Particles:</strong> ${config.cliticsRules || 'None'}</p>
                
                ${config.grammarRules && config.grammarRules.length > 0 ? `
                <h3>Grammar Rules</h3>
                <ul>
                    ${config.grammarRules.map(r => `<li>${typeof r === 'object' ? `<strong>${r.title || r.name || 'Rule'}:</strong> ${r.content || r.description || ''}` : r}</li>`).join('')}
                </ul>
                ` : ''}

                <div class="page-break"></div>

                <h2>3. Dictionary (${lexicon.length} entries)</h2>
                <table>
                    <thead>
                        <tr><th>Word</th><th>IPA</th><th>Class</th><th>Translation</th><th>Tags</th></tr>
                    </thead>
                    <tbody>
                        ${lexicon.map(w => `
                            <tr>
                                <td><span class="custom-font" style="font-size: 1.1em;"><strong>${w.word}</strong></span>${w.ideogram ? `<br/><span style="font-size: 1.4em;" class="custom-font">${w.ideogram}</span>` : ''}</td>
                                <td>${w.ipa ? `/${w.ipa}/` : ''}</td>
                                <td><em>${w.wordClass || ''}</em></td>
                                <td>${w.translation || ''}</td>
                                <td>${(w.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${Object.keys(config.wikiPages || {}).length > 0 ? `
                <div class="page-break"></div>
                <h2>4. Wiki & Lore</h2>
                ${Object.entries(config.wikiPages || {}).map(([id, content]) => `<div class="wiki-page">${content}</div>`).join('')}
                ` : ''}
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 500); // 500ms delay to ensure the custom font paints
    };

    return (
        <header className="hdr">
            <div className="hdr-flex">
                <div className="hdr-left">
                    <Menu className='toggle-btn' onClick={openMenu} style={{ cursor: 'pointer' }} />
                    <div className="hdr-brand">
                        <h1 className='app-dinamic-title'>ConlangEngine</h1>
                        {isLive ? (
                            <span className='hdr-badge' style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--acc)', color: '#fff', boxShadow: '0 0 10px var(--acc)', borderColor: 'var(--acc)' }}>
                                <Cloud size={14} /> LIVE
                            </span>
                        ) : (
                            <span className='hdr-badge'>Local</span>
                        )}
                    </div>
                </div>

                <div className="hdr-right">
                    <Button className="hdr-btn" onClick={() => navigate('/')}>
                        <Home /> Home
                    </Button>
                    <Button className="hdr-btn" onClick={handleGeneratePDF}>
                        <Printer /> PDF
                    </Button>
                    <Button className="hdr-btn" onClick={handleSave}>
                        <Save /> Save
                    </Button>
                    <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleLoad} 
                        style={{ display: 'none' }} 
                    />
                    <Button className="hdr-btn" onClick={() => fileInputRef.current.click()}>
                        <FolderUp /> Load
                    </Button>

                </div>

                <NavLink to="/profile" className="profile-header-button" title="Profile">
                    <User size={24} />
                </NavLink>

            </div>
        </header>
    )
};
