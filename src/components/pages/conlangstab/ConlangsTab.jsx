import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore, INITIAL_CONFIG } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { Languages, Plus, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient.js';
import './conlangsTab.css';

export default function ConlangsTab() {
    const navigate = useNavigate();
    
    // Grab our global state
    const config = useConfigStore();
    const setFullConfig = useConfigStore(state => state.setFullConfig);
    const setLexicon = useLexiconStore(state => state.setLexicon);
    
    // Project management actions
    const localProjects = useProjectStore(state => state.localProjects);
    const saveProjectToArchive = useProjectStore(state => state.saveProjectToArchive);
    const deleteLocalProject = useProjectStore(state => state.deleteLocalProject);

    // Keep track of whether the user is allowed to access this feature
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    // Check if the user has an active Pro subscription
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
                    .select('is_pro, live_until')
                    .eq('id', currentSession.user.id)
                    .single();

                if (error) {
                    console.error('Supabase Profiles Error:', error.message);
                }

                let activeLive = false;
                if (data) {
                    if (data.is_pro) {
                        activeLive = true;
                    } else if (data.live_until) {
                        // Fix an annoying Safari/iOS bug by replacing the space with a T
                        const safeDateStr = data.live_until.replace(' ', 'T');
                        activeLive = new Date(safeDateStr) > new Date();
                    }
                }
                
                setIsLive(activeLive);
                
                // Keep the global config store in sync so the navigation unlocks immediately
                useConfigStore.getState().updateConfig({ isProActive: activeLive });

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

    // Auto-save the current workspace to the archive whenever they land on this page
    useEffect(() => {
        if (!config.projectId) {
            config.updateConfig({ projectId: `local_${Date.now()}` });
        } else {
            saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);
        }
    }, [config.projectId, saveProjectToArchive]);

    const handleCreateNew = () => {
        // Back up whatever they were just working on
        saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);
        
        // Wipe the slate clean for the new language
        const newId = `local_${Date.now()}`;
        setLexicon([]);
        setFullConfig({ ...INITIAL_CONFIG, projectId: newId, conlangName: 'New Conlang' });
        
        // Send them over to the settings to start customizing
        navigate('/settings');
    };

    const handleOpenProject = (id) => {
        if (config.projectId === id) return; // Don't do anything if it's already open

        const project = localProjects.find(p => p.id === id);
        if (!project) return;

        // Save the current language before switching
        saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);

        // Load the selected language into active memory
        const loadedLexicon = project.project_data.dictionary;
        const safeLexicon = Array.isArray(loadedLexicon) ? loadedLexicon : (loadedLexicon?.lexicon || []);
        
        setLexicon(safeLexicon);
        setFullConfig(project.project_data.config || {});
        
        // Take them home to see their newly loaded language
        navigate('/');
    };

    const handleDeleteProject = (e, id) => {
        e.stopPropagation(); // Stop the click from accidentally opening the project!
        
        if (!window.confirm("⚠️ Are you sure you want to permanently delete this conlang?")) return;

        deleteLocalProject(id);
        
        // If they deleted the language they were currently viewing, give them a fresh one
        if (config.projectId === id) {
            setLexicon([]);
            setFullConfig({ ...INITIAL_CONFIG, projectId: `local_${Date.now()}` });
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
                    <Lock size={48} className="locked-icon" />
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
                <h2 className="flex sg-title workspace-title">
                    <Languages /> My Workspaces
                </h2>
                <p className="workspace-desc">Manage your local conlang projects here. Switching projects automatically saves your current progress.</p>
                
                <div className="projects-grid">
                    <div className="project-card create-new" onClick={handleCreateNew}>
                        <Plus size={32} className="create-new-icon" />
                        <h3 className="create-new-text">Create New Conlang</h3>
                    </div>

                    {localProjects.map(project => {
                        const isCurrent = project.id === config.projectId;
                        
                        return (
                            <div key={project.id} className={`project-card ${isCurrent ? 'active-workspace' : ''}`} onClick={() => handleOpenProject(project.id)}>
                                <button className="project-delete-btn" onClick={(e) => handleDeleteProject(e, project.id)} title="Delete Project">
                                    <Trash2 size={16} />
                                </button>
                                
                                <div className="project-title notranslate">
                                    {project.project_data?.config?.conlangName || "Untitled"}
                                </div>
                                
                                <div className="project-meta">
                                    {project.project_data?.dictionary?.length || 0} lexicon entries
                                </div>
                                
                                <div className="project-date">
                                    Last sync: <span className="date-highlight">{new Date(project.updated_at).toLocaleDateString()}</span>
                                </div>
                                
                                {isCurrent && (
                                    <div className="active-badge">
                                        <CheckCircle2 size={14} /> Active
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
