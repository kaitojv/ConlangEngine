import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Menu, Home, Printer, Save, FolderUp, User, Cloud } from 'lucide-react';

// Bring in our UI components and styling
import Button from '../../UI/Buttons/Buttons.jsx';
import './header.css';

// Hook up our global stores and database
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useProjectStore } from '../../../store/useProjectStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { generateConlangPDF } from '../../../utils/pdfGenerator.jsx';

export default function Header({ openMenu }) {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    
    const [session, setSession] = useState(null);
    const [isLive, setIsLive] = useState(false);

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

    // Read a JSON backup file and inject it directly into our global stores
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
        // Reset the input so the user can load the exact same file again if they want to
        event.target.value = ''; 
    };

    // Grab the data and pass it to our PDF utility function
    const handleGeneratePDF = () => {
        const config = useConfigStore.getState();
        const lexicon = useLexiconStore.getState().lexicon || [];
        generateConlangPDF(config, lexicon);
    };

    return (
        <header className="hdr">
            <div className="hdr-flex">
                <div className="hdr-left">
                    <Menu className="toggle-btn" onClick={openMenu} />
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
                        <Button className="hdr-btn" onClick={handleGeneratePDF}>
                            <Printer /> <span>PDF</span>
                        </Button>
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
    );
};
