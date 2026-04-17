import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore, INITIAL_CONFIG } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { Languages, Plus, Trash2, CheckCircle2, Lock } from 'lucide-react';
import './conlangsTab.css';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const SUPABASE_URL = 'https://hgeuyvgjhonklflcdinj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ye_8zJGOXQBma3O3TMHDaA_Nr0eCYIy';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function ConlangsTab() {
    const navigate = useNavigate();
    
    // Active Workspace Stores
    const config = useConfigStore();
    const setFullConfig = useConfigStore(state => state.setFullConfig);
    const setLexicon = useLexiconStore(state => state.setLexicon);
    
    // Projects Store
    const localProjects = useProjectStore(state => state.localProjects);
    const saveProjectToArchive = useProjectStore(state => state.saveProjectToArchive);
    const deleteLocalProject = useProjectStore(state => state.deleteLocalProject);

    // Auth state
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const checkLiveStatus = async (currentSession) => {
            if (!currentSession) {
                setIsLive(false);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('live_until')
                    .eq('id', currentSession.user.id)
                    .single();

                if (!error && data?.live_until) {
                    setIsLive(new Date(data.live_until) > new Date());
                } else {
                    setIsLive(false);
                }
            } catch (err) {
                console.error('Error fetching live status:', err);
                setIsLive(false);
            } finally {
                setLoading(false);
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

    // Auto-Backup: Saves the current active workspace whenever we view the dashboard
    useEffect(() => {
        if (!config.projectId) {
            config.updateConfig({ projectId: 'local_' + Date.now() });
        } else {
            saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);
        }
    }, [config.projectId, saveProjectToArchive]);

    const handleCreateNew = () => {
        saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);
        
        // Wipe active memory for the new language
        const newId = 'local_' + Date.now();
        setLexicon([]);
        setFullConfig({ ...INITIAL_CONFIG, projectId: newId, conlangName: 'New Conlang' });
        navigate('/settings');
    };

    const handleOpenProject = (id) => {
        if (config.projectId === id) return; 

        const project = localProjects.find(p => p.id === id);
        if (!project) return;

        saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);

        // Overwrite memory with the loaded language
        const loadedLexicon = project.project_data.dictionary;
        const safeLexicon = Array.isArray(loadedLexicon) ? loadedLexicon : (loadedLexicon?.lexicon || []);
        setLexicon(safeLexicon);
        setFullConfig(project.project_data.config || {});
        navigate('/');
    };

    const handleDeleteProject = (e, id) => {
        e.stopPropagation();
        if (!window.confirm("⚠️ Are you sure you want to permanently delete this conlang?")) return;

        deleteLocalProject(id);
        if (config.projectId === id) {
            setLexicon([]);
            setFullConfig({ ...INITIAL_CONFIG, projectId: 'local_' + Date.now() });
        }
    };

    if (loading) {
        return (
            <div className="conlangs-container">
                <Card><p>Checking access...</p></Card>
            </div>
        );
    }

    if (!isLive) {
        return (
            <div className="conlangs-container">
                <Card className="locked-feature-card">
                    <Lock size={48} />
                    <h2>Workspaces are a LIVE Feature</h2>
                    <p>Upgrade to Conlang Engine LIVE to create and manage multiple conlang projects in the cloud.</p>
                    <Button variant="imp" onClick={() => navigate('/profile')}>
                        Go to Profile to Upgrade
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="conlangs-container">
            <Card>
                <h2 className="flex sg-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Languages /> My Workspaces
                </h2>
                <p style={{ color: 'var(--tx2)' }}>Manage your local conlang projects here. Switching projects automatically saves your current progress.</p>
                
                <div className="projects-grid">
                    <div className="project-card create-new" onClick={handleCreateNew}>
                        <Plus size={32} style={{ color: 'var(--tx2)', marginBottom: '10px' }} />
                        <h3 style={{ margin: 0 }}>Create New Conlang</h3>
                    </div>

                    {localProjects.map(p => {
                        const isCurrent = p.id === config.projectId;
                        return (
                            <div key={p.id} className={`project-card ${isCurrent ? 'active-workspace' : ''}`} onClick={() => handleOpenProject(p.id)}>
                                <button className="project-delete-btn" onClick={(e) => handleDeleteProject(e, p.id)} title="Delete Project"><Trash2 size={16} /></button>
                                <div className="project-title notranslate">{p.project_data?.config?.conlangName || "Untitled"}</div>
                                <div className="project-meta">{p.project_data?.dictionary?.length || 0} lexicon entries</div>
                                <div className="project-date">Last sync: <span style={{ fontWeight: 'bold', color: 'var(--tx)' }}>{new Date(p.updated_at).toLocaleDateString()}</span></div>
                                {isCurrent && <div style={{ position: 'absolute', bottom: '15px', right: '15px', color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}><CheckCircle2 size={14} /> Active</div>}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
