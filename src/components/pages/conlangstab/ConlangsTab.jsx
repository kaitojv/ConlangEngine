import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore, INITIAL_CONFIG } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { Languages, Plus, Trash2, CheckCircle2, Lock, Copy, GitMerge, Network, LayoutGrid, Map as MapIcon, Upload, MapPin, ZoomIn, ZoomOut, Crosshair, X, ArrowUpFromLine, GitCompare } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient.js';
import { sanitizeConfig, sanitizeLexicon } from '@/utils/schemaValidator.jsx';
import { getConlangIcon } from '@/utils/iconMap.jsx';
import LanguageCompareModal from './LanguageCompareModal.jsx';
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
    
    // View mode: 'grid', 'tree', or 'map'
    const [viewMode, setViewMode] = useState('grid');
    
    // Map State
    const globalWorldMap = useProjectStore(state => state.globalWorldMap) || { image: '/classic_map.svg' };
    const setGlobalWorldMap = useProjectStore(state => state.setGlobalWorldMap);
    const [mapScale, setMapScale] = useState(1);
    const [mapPos, setMapPos] = useState({ x: 0, y: 0 });
    const [isDraggingMap, setIsDraggingMap] = useState(false);
    const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0 });
    const [targetingMode, setTargetingMode] = useState(null); // ID of project we are placing
    const [selectedPin, setSelectedPin] = useState(null); // ID of project pin clicked
    const mapContainerRef = React.useRef(null);
    
    // Derivation Modal State
    const [deriveModalOpen, setDeriveModalOpen] = useState(false);
    const [deriveParent, setDeriveParent] = useState(null);
    const [daughterName, setDaughterName] = useState('');
    const [soundChanges, setSoundChanges] = useState('');

    const [parentModalOpen, setParentModalOpen] = useState(false);
    const [parentTargetProject, setParentTargetProject] = useState(null);
    const [selectedParentId, setSelectedParentId] = useState('');

    // Compare Modal State
    const [compareModalOpen, setCompareModalOpen] = useState(false);
    const [compareProject, setCompareProject] = useState(null);

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
        
        // Wipe the slate clean for the new language but preserve account-wide settings
        const newId = `local_${Date.now()}`;
        const { isProActive, theme, colors, autoReturnToLexicon } = useConfigStore.getState();
        
        setLexicon([]);
        setFullConfig({ 
            ...INITIAL_CONFIG, 
            projectId: newId, 
            conlangName: 'New Conlang',
            isProActive,
            theme,
            colors,
            autoReturnToLexicon
        });
        
        // Send them over to the settings to start customizing
        navigate('/settings');
    };

    const handleOpenProject = (id) => {
        if (config.projectId === id) return;

        const project = localProjects.find(p => p.id === id);
        if (!project) return;

        // Save the current language before switching
        saveProjectToArchive(useConfigStore.getState(), useLexiconStore.getState().lexicon);

        // SEC-5: Sanitize local project data before loading
        const safeLexicon = sanitizeLexicon(project.project_data.dictionary);
        const safeConfig = sanitizeConfig(project.project_data.config || {});
        
        setLexicon(safeLexicon);
        setFullConfig(safeConfig);
        
        navigate('/');
    };

    const handleDeleteProject = async (e, id) => {
        e.stopPropagation(); // Stop the click from accidentally opening the project!
        
        if (!window.confirm("⚠️ Are you sure you want to permanently delete this conlang?")) return;

        deleteLocalProject(id);

        if (session) {
            try {
                // Try to delete it properly, returning the deleted rows to verify
                const { data: d1, error: e1 } = await supabase.from('conlangs').delete().eq('project_id', id).select();
                const { data: d2, error: e2 } = await supabase.from('conlang_snapshots').delete().eq('project_id', id).select();
                
                // If the deletion silently failed (e.g., missing DELETE RLS policy on Supabase), 
                // the rows won't be returned. We fallback to an UPDATE which we know is permitted.
                if (!d1 || d1.length === 0) {
                    await supabase.from('conlangs').update({ project_data: { deleted: true } }).eq('project_id', id);
                }
                if (!d2 || d2.length === 0) {
                    await supabase.from('conlang_snapshots').update({ project_data: { deleted: true } }).eq('project_id', id);
                }
            } catch (err) {
                console.error('Failed to delete from cloud:', err);
            }
        }
        
        // If they deleted the language they were currently viewing, give them a fresh one
        if (config.projectId === id) {
            const { isProActive, theme, colors, autoReturnToLexicon } = useConfigStore.getState();
            setLexicon([]);
            setFullConfig({ 
                ...INITIAL_CONFIG, 
                projectId: `local_${Date.now()}`,
                conlangName: 'New Conlang',
                isProActive,
                theme,
                colors,
                autoReturnToLexicon
            });
        }
    };

    const handleDuplicateProject = (e, project) => {
        e.stopPropagation();
        const newId = `local_${Date.now()}`;
        const newProjectData = JSON.parse(JSON.stringify(project.project_data || {}));
        
        if (newProjectData.config) {
            newProjectData.config.projectId = newId;
            newProjectData.config.conlangName = `${newProjectData.config.conlangName || 'Untitled'} (Copy)`;
            newProjectData.config.isPublic = false; // Reset public flag for the fork
        }
        
        saveProjectToArchive(
            newProjectData.config || { ...INITIAL_CONFIG, projectId: newId }, 
            newProjectData.dictionary || []
        );
    };

    const handleOpenDeriveModal = (e, project) => {
        e.stopPropagation();
        setDeriveParent(project);
        setDaughterName(`${project.project_data?.config?.conlangName || 'Untitled'} Daughter`);
        setSoundChanges('p=>f\nt=>s\nk=>h');
        setDeriveModalOpen(true);
    };

    const handleDeriveLanguage = () => {
        if (!deriveParent) return;

        const newId = `local_${Date.now()}`;
        const parentData = deriveParent.project_data || {};
        const newConfig = JSON.parse(JSON.stringify(parentData.config || { ...INITIAL_CONFIG }));
        let newDictionary = JSON.parse(JSON.stringify(parentData.dictionary || []));

        // Parse rules
        const rules = soundChanges.split('\n')
            .map(line => line.trim())
            .filter(line => line.includes('=>'))
            .map(line => {
                const [pattern, replacement] = line.split('=>').map(s => s.trim());
                return { pattern, replacement };
            });

        // Apply rules to all words in the dictionary
        newDictionary = newDictionary.map(entry => {
            let evolvedWord = entry.word;
            rules.forEach(({ pattern, replacement }) => {
                try {
                    const regex = new RegExp(pattern, 'g');
                    evolvedWord = evolvedWord.replace(regex, replacement);
                } catch (e) {
                    console.error("Invalid Regex rule:", pattern);
                }
            });
            return { ...entry, word: evolvedWord, id: `word_${Math.random().toString(36).substr(2, 9)}` };
        });

        // Update config
        newConfig.projectId = newId;
        newConfig.parentId = deriveParent.id; // Link to parent
        newConfig.conlangName = daughterName;
        newConfig.isPublic = false;

        saveProjectToArchive(newConfig, newDictionary);
        setDeriveModalOpen(false);
    };

    const handleOpenParentModal = (e, project) => {
        e.stopPropagation();
        setParentTargetProject(project);
        setSelectedParentId(project.project_data?.config?.parentId || '');
        setParentModalOpen(true);
    };

    const handleSetParent = () => {
        if (!parentTargetProject) return;

        const newProjectData = JSON.parse(JSON.stringify(parentTargetProject.project_data || {}));
        if (!newProjectData.config) newProjectData.config = { ...INITIAL_CONFIG };
        
        newProjectData.config.parentId = selectedParentId === '' ? null : selectedParentId;

        // If this is the active project, update it in the store too
        if (config.projectId === parentTargetProject.id) {
            setFullConfig(newProjectData.config);
        }

        saveProjectToArchive(newProjectData.config, newProjectData.dictionary || []);
        setParentModalOpen(false);
    };

    const handleOpenCompareModal = (e, project) => {
        e.stopPropagation();
        setCompareProject(project);
        setCompareModalOpen(true);
    };

    // State for Map Pin Selection
    const [pinSelectModalOpen, setPinSelectModalOpen] = useState(false);

    // Map Rendering & Interaction
    const handleMapWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(0.5, mapScale + delta), 4);
        setMapScale(newScale);
    };

    const handleMapMouseDown = (e) => {
        setIsDraggingMap(true);
        setMapDragStart({ x: e.clientX - mapPos.x, y: e.clientY - mapPos.y });
    };

    const handleMapMouseMove = (e) => {
        if (isDraggingMap) {
            setMapPos({
                x: e.clientX - mapDragStart.x,
                y: e.clientY - mapDragStart.y
            });
        }
    };

    const handleMapClick = (e) => {
        if (targetingMode) {
            const rect = mapContainerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - mapPos.x) / mapScale;
            const y = (e.clientY - rect.top - mapPos.y) / mapScale;

            const project = localProjects.find(p => p.id === targetingMode);
            if (project) {
                // We update the local archive for this project
                const updatedConfig = { ...project.project_data.config, worldMap: { x, y } };
                saveProjectToArchive(updatedConfig, project.project_data.dictionary);
                
                // If it's the active project, update the live config store too
                if (targetingMode === config.projectId) {
                    config.updateConfig({ worldMap: { x, y } });
                }
            }
            setTargetingMode(null);
            setSelectedPin(project ? project.id : null);
        } else {
            // Clicked map empty space
            setSelectedPin(null);
        }
    };

    const handleRemovePin = (project) => {
        if (!project) return;
        const updatedConfig = { ...project.project_data.config };
        if (updatedConfig.worldMap) {
            updatedConfig.worldMap.x = null;
            updatedConfig.worldMap.y = null;
        }
        saveProjectToArchive(updatedConfig, project.project_data.dictionary);
        if (project.id === config.projectId) {
            config.updateConfig({ worldMap: { x: null, y: null } });
        }
        setSelectedPin(null);
    };

    const handleMapUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setGlobalWorldMap({ image: ev.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const renderMap = () => {
        return (
            <div className="conlangs-map-container" style={{ position: 'relative', width: '100%', height: '600px', background: 'var(--s1)', borderRadius: 'var(--rad)', overflow: 'hidden', border: '1px solid var(--bd)' }}>
                {/* Map Controls */}
                <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 100, display: 'flex', gap: '10px', background: 'rgba(11, 15, 25, 0.8)', padding: '10px', borderRadius: 'var(--rad)', backdropFilter: 'blur(10px)', color: 'white' }}>
                    <div className="zoom-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button className="icon-btn" onClick={() => setMapScale(Math.max(0.5, mapScale - 0.2))} style={{ color: 'white' }}><ZoomOut size={16}/></button>
                        <span style={{ minWidth: '40px', textAlign: 'center' }}>{Math.round(mapScale * 100)}%</span>
                        <button className="icon-btn" onClick={() => setMapScale(Math.min(4, mapScale + 0.2))} style={{ color: 'white' }}><ZoomIn size={16}/></button>
                    </div>
                    
                    <div className="upload-wrapper" style={{ position: 'relative' }}>
                        <button className="upload-btn" onClick={() => setPinSelectModalOpen(true)} style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                            <MapPin size={14} /> Place Conlang
                        </button>
                    </div>

                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                    
                    <div className="upload-wrapper" style={{ position: 'relative' }}>
                        <input type="file" accept="image/png, image/jpeg, image/svg+xml" id="conlangs-map-upload" style={{ display: 'none' }} onChange={handleMapUpload} />
                        <label htmlFor="conlangs-map-upload" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--s3)', color: 'var(--tx)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' }}>
                            <Upload size={14} /> Change Base Map
                        </label>
                    </div>
                </div>

                {targetingMode && (
                    <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--acc)', color: 'white', padding: '10px 20px', borderRadius: 'var(--rad)', boxShadow: 'var(--shadow)', fontWeight: 'bold' }}>
                        <Crosshair size={18} /> Click anywhere on the map to place the conlang!
                        <button onClick={(e) => { e.stopPropagation(); setTargetingMode(null); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '10px' }}><X size={16} /></button>
                    </div>
                )}

                {/* The Map Canvas */}
                <div 
                    ref={mapContainerRef}
                    style={{ width: '100%', height: '100%', cursor: targetingMode ? 'crosshair' : (isDraggingMap ? 'grabbing' : 'grab') }}
                    onWheel={handleMapWheel}
                    onMouseDown={handleMapMouseDown}
                    onMouseMove={handleMapMouseMove}
                    onMouseUp={() => setIsDraggingMap(false)}
                    onMouseLeave={() => setIsDraggingMap(false)}
                    onClick={handleMapClick}
                >
                    <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${mapPos.x}px, ${mapPos.y}px) scale(${mapScale})`, transformOrigin: '0 0', willChange: 'transform' }}>
                        <img src={globalWorldMap.image} alt="World Map" draggable="false" style={{ display: 'block', pointerEvents: 'none' }} />
                        
                        {/* Render Conlang Pins */}
                        {localProjects.map(project => {
                            const mapCoords = project.project_data?.config?.worldMap;
                            if (!mapCoords || mapCoords.x === null || mapCoords.y === null || mapCoords.x === undefined) return null;

                            return (
                                <div 
                                    key={project.id} 
                                    className="map-pin"
                                    style={{ position: 'absolute', left: `${mapCoords.x}px`, top: `${mapCoords.y}px`, transform: `translate(-50%, -100%) scale(${1/mapScale})`, transformOrigin: 'bottom center' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if(!targetingMode) {
                                            setSelectedPin(project.id === selectedPin ? null : project.id);
                                        }
                                    }}
                                    title={project.project_data?.config?.conlangName}
                                >
                                    {getConlangIcon(
                                        project.project_data?.config?.conlangIcon, 
                                        24, 
                                        { 
                                            style: { 
                                                color: project.id === config.projectId ? 'var(--ok)' : 'var(--acc)', 
                                                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', 
                                                cursor: 'pointer' 
                                            } 
                                        }
                                    )}
                                    <div style={{ background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(4px)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', marginTop: '2px', pointerEvents: 'none' }}>
                                        {project.project_data?.config?.conlangName}
                                    </div>

                                    {selectedPin === project.id && (
                                        <div style={{ 
                                            position: 'absolute', bottom: '40px', left: '50%', transform: `translateX(-50%) scale(${mapScale})`, 
                                            background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', 
                                            padding: '12px', width: '220px', boxShadow: 'var(--shadow)', zIndex: 1000,
                                            cursor: 'default', transformOrigin: 'bottom center'
                                        }} onClick={(e) => e.stopPropagation()}>
                                            <h4 style={{ margin: 0, color: 'var(--tx)', fontSize: '1rem' }}>{project.project_data?.config?.conlangName || "Untitled"}</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', margin: '5px 0 12px 0' }}>{project.project_data?.dictionary?.length || 0} lexicon entries</p>
                                            
                                            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                                <Button variant="imp" onClick={() => handleOpenProject(project.id)} style={{ width: '100%', padding: '6px' }}>
                                                    <div className="btn-content-flex"><Languages size={14}/> Open Workspace</div>
                                                </Button>
                                                <Button variant="default" onClick={() => handleRemovePin(project)} style={{ width: '100%', padding: '6px' }}>
                                                    <div className="btn-content-flex"><Trash2 size={14}/> Remove Pin</div>
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Tree Rendering Logic
    const renderTree = () => {
        // Find all root projects (no parent, or parent not in localProjects)
        const roots = localProjects.filter(p => !p.project_data?.config?.parentId || !localProjects.some(parent => parent.id === p.project_data.config.parentId));
        
        const renderNode = (project) => {
            const isCurrent = project.id === config.projectId;
            const children = localProjects.filter(p => p.project_data?.config?.parentId === project.id);
            
            return (
                <div key={project.id} className="tree-node-wrapper">
                    <div className={`project-card tree-card ${isCurrent ? 'active-workspace' : ''}`} onClick={() => handleOpenProject(project.id)}>
                        <div className="project-card-actions">
                            <button className="project-action-btn" onClick={(e) => handleOpenCompareModal(e, project)} title="Compare with Relatives">
                                <GitCompare size={16} />
                            </button>
                            <button className="project-action-btn" onClick={(e) => handleOpenParentModal(e, project)} title="Set Mother Language">
                                <ArrowUpFromLine size={16} />
                            </button>
                            <button className="project-action-btn" onClick={(e) => handleOpenDeriveModal(e, project)} title="Derive Daughter Language">
                                <GitMerge size={16} />
                            </button>
                            <button className="project-action-btn" onClick={(e) => handleDuplicateProject(e, project)} title="Duplicate Project">
                                <Copy size={14} />
                            </button>
                            <button className="project-delete-btn" onClick={(e) => handleDeleteProject(e, project.id)} title="Delete Project">
                                <Trash2 size={14} />
                            </button>
                        </div>
                        
                        <div className="project-title notranslate" style={{ fontSize: '1.1rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getConlangIcon(project.project_data?.config?.conlangIcon, 20)}
                            {project.project_data?.config?.conlangName || "Untitled"}
                        </div>
                        <div className="project-meta" style={{ fontSize: '0.8rem' }}>
                            {project.project_data?.dictionary?.length || 0} words
                        </div>
                        {isCurrent && (
                            <div className="active-badge" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                <CheckCircle2 size={12} /> Active
                            </div>
                        )}
                    </div>
                    
                    {children.length > 0 && (
                        <div className="tree-children">
                            {children.map(child => renderNode(child))}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="family-tree-container">
                {roots.map(root => renderNode(root))}
            </div>
        );
    };

    // The page is now fully accessible to all users! No need to block on isLive anymore.

    return (
        <div className="conlangs-container">
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 className="flex sg-title workspace-title">
                            <Languages /> My Workspaces
                        </h2>
                        <p className="workspace-desc">Manage your local conlang projects here. Switching projects automatically saves your current progress.</p>
                    </div>
                    
                    <div className="view-mode-toggles" style={{ display: 'flex', gap: '5px', background: 'var(--s2)', padding: '5px', borderRadius: 'var(--rad)' }}>
                        <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
                            <LayoutGrid size={18} />
                        </button>
                        <button className={`view-toggle-btn ${viewMode === 'tree' ? 'active' : ''}`} onClick={() => setViewMode('tree')} title="Family Tree View">
                            <Network size={18} />
                        </button>
                        <button className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')} title="World Map View">
                            <MapIcon size={18} />
                        </button>
                    </div>
                </div>
                
                {viewMode === 'grid' && (
                    <div className="projects-grid">
                        <div className="project-card create-new" onClick={handleCreateNew}>
                            <Plus size={32} className="create-new-icon" />
                            <h3 className="create-new-text">Create New Conlang</h3>
                        </div>

                        {localProjects.map(project => {
                            const isCurrent = project.id === config.projectId;
                            
                            return (
                                <div key={project.id} className={`project-card ${isCurrent ? 'active-workspace' : ''}`} onClick={() => handleOpenProject(project.id)}>
                                    <div className="project-card-actions">
                                        <button className="project-action-btn" onClick={(e) => { e.stopPropagation(); setTargetingMode(project.id); setViewMode('map'); }} title="Place on Map">
                                            <MapPin size={16} />
                                        </button>
                                        <button className="project-action-btn" onClick={(e) => handleOpenCompareModal(e, project)} title="Compare with Relatives">
                                            <GitCompare size={16} />
                                        </button>
                                        <button className="project-action-btn" onClick={(e) => handleOpenParentModal(e, project)} title="Set Mother Language">
                                            <ArrowUpFromLine size={16} />
                                        </button>
                                        <button className="project-action-btn" onClick={(e) => handleOpenDeriveModal(e, project)} title="Derive Daughter Language">
                                            <GitMerge size={16} />
                                        </button>
                                        <button className="project-action-btn" onClick={(e) => handleDuplicateProject(e, project)} title="Duplicate Project">
                                            <Copy size={16} />
                                        </button>
                                        <button className="project-delete-btn" onClick={(e) => handleDeleteProject(e, project.id)} title="Delete Project">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="project-title notranslate" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getConlangIcon(project.project_data?.config?.conlangIcon, 20)}
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
                )}
                
                {viewMode === 'tree' && (
                    <div className="tree-view-wrapper" style={{ marginTop: '30px', overflowX: 'auto', paddingBottom: '20px' }}>
                        {renderTree()}
                    </div>
                )}

                {viewMode === 'map' && (
                    <div style={{ marginTop: '20px' }}>
                        {renderMap()}
                    </div>
                )}
            </Card>

            <Modal isOpen={deriveModalOpen} onClose={() => setDeriveModalOpen(false)} title="Derive Daughter Language">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ color: 'var(--tx2)', lineHeight: '1.5' }}>
                        This will create a brand new workspace by cloning <strong>{deriveParent?.project_data?.config?.conlangName || 'this language'}</strong>'s lexicon and applying historical sound changes to every word.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--tx)', fontWeight: 'bold' }}>Daughter Language Name</label>
                        <Input value={daughterName} onChange={(e) => setDaughterName(e.target.value)} placeholder="e.g. Vulgar Latin" />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--tx)', fontWeight: 'bold' }}>Historical Sound Changes (Regex)</label>
                        <p style={{ color: 'var(--tx3)', fontSize: '0.85rem' }}>One rule per line. Format: <code>pattern =&gt; replacement</code></p>
                        <textarea 
                            style={{ 
                                width: '100%', height: '150px', background: 'var(--s1)', 
                                border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', 
                                color: 'var(--tx)', padding: '12px', fontFamily: 'monospace' 
                            }}
                            value={soundChanges}
                            onChange={(e) => setSoundChanges(e.target.value)}
                            placeholder="p=>f&#10;t=>s&#10;k=>h"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <Button variant="default" onClick={() => setDeriveModalOpen(false)}>Cancel</Button>
                        <Button variant="imp" onClick={handleDeriveLanguage}>
                            <div className="btn-content-flex"><GitMerge size={16} /> Breed Daughter Language</div>
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={parentModalOpen} onClose={() => setParentModalOpen(false)} title="Set Mother Language">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ color: 'var(--tx2)', lineHeight: '1.5' }}>
                        Select an existing workspace to act as the parent (Mother Language) for <strong>{parentTargetProject?.project_data?.config?.conlangName || 'this language'}</strong>. This will link them in the Family Tree view.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ color: 'var(--tx)', fontWeight: 'bold' }}>Mother Language</label>
                        <select 
                            style={{ 
                                width: '100%', padding: '10px', background: 'var(--s1)', 
                                border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', 
                                color: 'var(--tx)' 
                            }}
                            value={selectedParentId}
                            onChange={(e) => setSelectedParentId(e.target.value)}
                        >
                            <option value="">None (Independent Language)</option>
                            {localProjects
                                .filter(p => p.id !== parentTargetProject?.id)
                                .map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.project_data?.config?.conlangName || "Untitled Project"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <Button variant="default" onClick={() => setParentModalOpen(false)}>Cancel</Button>
                        <Button variant="imp" onClick={handleSetParent}>
                            <div className="btn-content-flex"><ArrowUpFromLine size={16} /> Set Parent</div>
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={pinSelectModalOpen} onClose={() => setPinSelectModalOpen(false)} title="Select Conlang to Place">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
                    <p style={{ color: 'var(--tx2)' }}>Select a conlang below to place a pin for it on the world map.</p>
                    {localProjects.map(project => {
                        const hasPin = project.project_data?.config?.worldMap?.x !== null && project.project_data?.config?.worldMap?.x !== undefined;
                        return (
                            <div 
                                key={project.id} 
                                onClick={() => {
                                    setTargetingMode(project.id);
                                    setPinSelectModalOpen(false);
                                }}
                                style={{ 
                                    padding: '15px', background: 'var(--s2)', border: '1px solid var(--bd)', 
                                    borderRadius: 'var(--rad-sm)', cursor: 'pointer', display: 'flex', 
                                    justifyContent: 'space-between', alignItems: 'center' 
                                }}
                                className="hover:border-[var(--acc)] transition-colors"
                            >
                                <span style={{ fontWeight: 'bold', color: 'var(--tx)' }}>{project.project_data?.config?.conlangName || "Untitled"}</span>
                                {hasPin && <span style={{ fontSize: '0.8rem', color: 'var(--ok)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12}/> Placed</span>}
                            </div>
                        )
                    })}
                </div>
            </Modal>

            <Modal isOpen={compareModalOpen} onClose={() => setCompareModalOpen(false)} title="Compare Relatives">
                {compareProject && (
                    <LanguageCompareModal baseProject={compareProject} localProjects={localProjects} />
                )}
            </Modal>
        </div>
    );
}
