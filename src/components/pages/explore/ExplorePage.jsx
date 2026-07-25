import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient.js';
import { Globe, BookA, User, Loader2, Heart, Trash2 } from 'lucide-react';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import toast from 'react-hot-toast';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { sanitizeConfig } from '../../../utils/schemaValidator.jsx';
import { transliterateText } from '../../../utils/transliteration.js';
import Button from '../../UI/Buttons/Buttons.jsx';
import PageSkeleton from '../../UI/PageSkeleton/PageSkeleton.jsx';
import { useSharing } from '../../../hooks/useSharing.jsx';
import './explorePage.css';

export default function ExplorePage() {
    const navigate = useNavigate();
    const [conlangs, setConlangs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [likesData, setLikesData] = useState({}); // { projectId: count }
    const [userLikes, setUserLikes] = useState(new Set()); // Set of projectIds liked by user
    const [sessionUser, setSessionUser] = useState(null);
    const [sortBy, setSortBy] = useState('updated'); // 'updated', 'likes', 'name', 'words'

    const isPublic = useConfigStore((state) => state.isPublic);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const { handlePushToCloud } = useSharing(sessionUser ? { user: sessionUser } : null);

    const fetchPublicConlangs = React.useCallback(async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error("You're not logged in");
                    navigate('/');
                    return;
                }
                setSessionUser(session.user);

                // Fetch projects from the snapshots table where isPublic is true.
                // We use .contains on the JSONB column to match { config: { isPublic: true } }
                const { data, error: fetchError } = await supabase
                    .from('conlang_snapshots')
                    .select('project_id, user_id, project_data, created_at, updated_at')
                    .contains('project_data', { config: { isPublic: true } })
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (fetchError) throw fetchError;
                
                // If the .contains filter isn't supported perfectly by the schema, 
                // we can also do a fallback client-side filter just in case.
                const validConlangs = (data || []).filter(item => 
                    item.project_data?.config?.isPublic === true
                );

                setConlangs(validConlangs);

                // Fetch likes for these projects
                const projectIds = validConlangs.map(c => c.project_id);
                if (projectIds.length > 0) {
                    const { data: likesResult, error: likesError } = await supabase
                        .from('conlang_likes')
                        .select('project_id, user_id')
                        .in('project_id', projectIds);

                    if (!likesError && likesResult) {
                        const counts = {};
                        const userSet = new Set();
                        likesResult.forEach(like => {
                            counts[like.project_id] = (counts[like.project_id] || 0) + 1;
                            if (like.user_id === session.user.id) {
                                userSet.add(like.project_id);
                            }
                        });
                        setLikesData(counts);
                        setUserLikes(userSet);
                    }
                }
            } catch (err) {
                console.error("Error fetching public conlangs:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
    }, [navigate]);

    useEffect(() => {
        fetchPublicConlangs();
    }, [fetchPublicConlangs]);

    const handleTogglePublish = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error("You're not logged in");
            return;
        }

        const newIsPublic = !isPublic;
        const toastId = toast.loading(newIsPublic ? "Publishing conlang..." : "Making conlang private...");
        
        const currentStore = useConfigStore.getState();
        const currentProjectId = currentStore.projectId;
        if (!currentProjectId) {
            toast.error("Project ID missing", { id: toastId });
            return;
        }

        updateConfig({ isPublic: newIsPublic });

        try {
            if (newIsPublic) {
                await handlePushToCloud(false);
            } else {
                const { data: dDel, error: errDel } = await supabase.from('conlang_snapshots').delete().eq('project_id', currentProjectId).select();
                if (errDel) throw errDel;
                
                if (!dDel || dDel.length === 0) {
                    const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).single();
                    if (existingConlang && existingConlang.project_data) {
                        const updatedPayload = { ...existingConlang.project_data, config: { ...existingConlang.project_data.config, isPublic: false } };
                        await supabase.from('conlangs').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                        await supabase.from('conlang_snapshots').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                    }
                } else {
                    const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).single();
                    if (existingConlang && existingConlang.project_data) {
                        const updatedPayload = { ...existingConlang.project_data, config: { ...existingConlang.project_data.config, isPublic: false } };
                        await supabase.from('conlangs').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                    }
                }
            }
            
            toast.success(newIsPublic ? "Conlang published!" : "Conlang is now private", { id: toastId });
            fetchPublicConlangs(); // Refresh list
        } catch (err) {
            console.error("Update failed", err);
            toast.error("Failed to update public conlang", { id: toastId });
            updateConfig({ isPublic: !newIsPublic }); // revert
        }
    };

    const handleCardClick = (projectId) => {
        // Open the public viewer in the same tab
        navigate(`/view/${projectId}`);
    };

    const toggleLike = async (e, projectId) => {
        e.stopPropagation(); // prevent card click

        if (!sessionUser) return;

        const isLiked = userLikes.has(projectId);
        const previousLikes = { ...likesData };
        const previousUserLikes = new Set(userLikes);

        // Optimistic update
        const newSet = new Set(userLikes);
        const newCounts = { ...likesData };

        if (isLiked) {
            newSet.delete(projectId);
            newCounts[projectId] = Math.max(0, (newCounts[projectId] || 0) - 1);
        } else {
            newSet.add(projectId);
            newCounts[projectId] = (newCounts[projectId] || 0) + 1;
        }

        setUserLikes(newSet);
        setLikesData(newCounts);

        try {
            if (isLiked) {
                const { error } = await supabase
                    .from('conlang_likes')
                    .delete()
                    .match({ project_id: projectId, user_id: sessionUser.id });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('conlang_likes')
                    .insert({ project_id: projectId, user_id: sessionUser.id });
                if (error) throw error;
            }
        } catch (err) {
            console.error("Error toggling like:", err);
            toast.error("Failed to update like status");
            // Revert on error
            setUserLikes(previousUserLikes);
            setLikesData(previousLikes);
        }
    };

    const handleDeletePublicConlang = async (e, projectId) => {
        e.stopPropagation();

        if (!window.confirm("Are you sure you want to unpublish this conlang? It will be removed from the Explore page, but your private cloud sync backup will not be deleted.")) return;

        const toastId = toast.loading("Removing from Explore...");
        try {
            const { data: d2, error: err2 } = await supabase.from('conlang_snapshots').delete().eq('project_id', projectId).select();
            if (err2) throw err2;

            // If snapshot deletion fails due to missing DELETE RLS policy, fallback to an update setting isPublic to false
            if (!d2 || d2.length === 0) {
                const { data: existing } = await supabase.from('conlang_snapshots').select('project_data').eq('project_id', projectId).single();
                if (existing && existing.project_data) {
                    await supabase.from('conlang_snapshots').update({
                        project_data: {
                            ...existing.project_data,
                            config: {
                                ...existing.project_data.config,
                                isPublic: false
                            }
                        }
                    }).eq('project_id', projectId);
                }
            }

            // Update the main conlangs table to make it private (DO NOT delete the user's private backup!)
            const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', projectId).single();
            if (existingConlang && existingConlang.project_data) {
                const updatedPayload = {
                    ...existingConlang.project_data,
                    config: {
                        ...existingConlang.project_data.config,
                        isPublic: false
                    }
                };
                await supabase.from('conlangs').update({
                    project_data: updatedPayload
                }).eq('project_id', projectId);
            }

            setConlangs(prev => prev.filter(c => c.project_id !== projectId));
            toast.success("Conlang removed from Explore", { id: toastId });

            // If this is the active project, update the local public flag to false
            if (projectId === useConfigStore.getState().projectId) {
                updateConfig({ isPublic: false });
            }

            // Also update the local archive if it exists
            const projectStore = (await import('../../../store/useProjectStore.jsx')).useProjectStore.getState();
            const localProjects = projectStore.localProjects;
            const existingIdx = localProjects.findIndex(p => p.id === projectId);
            
            if (existingIdx > -1) {
                const project = localProjects[existingIdx];
                if (project.project_data && project.project_data.config) {
                    project.project_data.config.isPublic = false;
                    projectStore.saveProjectToArchive(project.project_data.config, project.project_data.dictionary || []);
                }
            }
            
        } catch (err) {
            console.error("Delete failed", err);
            toast.error("Failed to delete public conlang", { id: toastId });
        }
    };

    const sortedConlangs = React.useMemo(() => {
        return [...conlangs].sort((a, b) => {
            if (sortBy === 'updated') {
                const dateA = new Date(a.project_data?.last_updated || a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.project_data?.last_updated || b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            }
            if (sortBy === 'likes') {
                const likesA = likesData[a.project_id] || 0;
                const likesB = likesData[b.project_id] || 0;
                if (likesB !== likesA) return likesB - likesA;
                // fallback to updated
                const dateA = new Date(a.project_data?.last_updated || a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.project_data?.last_updated || b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            }
            if (sortBy === 'name') {
                const nameA = a.project_data?.config?.conlangName || 'Unnamed Conlang';
                const nameB = b.project_data?.config?.conlangName || 'Unnamed Conlang';
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'words') {
                const wordsA = a.project_data?.wordCount || a.project_data?.dictionary?.length || 0;
                const wordsB = b.project_data?.wordCount || b.project_data?.dictionary?.length || 0;
                return wordsB - wordsA;
            }
            return 0;
        });
    }, [conlangs, likesData, sortBy]);

    if (loading) {
        return <PageSkeleton type="conlangs" />;
    }

    if (error) {
        return (
            <div className="explore-empty" style={{ borderColor: 'var(--er)' }}>
                <h3>Failed to load Explore tab</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="explore-container fade-in">
            <div className="explore-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>Explore</h1>
                    <p>Discover public conlangs created by the community.</p>
                </div>
                <div className="explore-header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="explore-sort">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="explore-sort-select"
                        >
                            <option value="updated">Last Updated</option>
                            <option value="likes">Most Liked</option>
                            <option value="name">A-Z</option>
                            <option value="words">Word Count</option>
                        </select>
                    </div>
                    <Button 
                        variant={isPublic ? 'error' : 'primary'} 
                        onClick={handleTogglePublish}
                    >
                        <Globe size={16} /> {isPublic ? 'Make Active Conlang Private' : 'Publish Active Conlang'}
                    </Button>
                </div>
            </div>

            {conlangs.length === 0 ? (
                <div className="explore-empty">
                    <Globe size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>No public conlangs found.</h3>
                    <p>Be the first to share your creation by toggling "Publicly Visible" in your System Settings and syncing to the cloud!</p>
                </div>
            ) : (
                <div className="explore-grid">
                    {sortedConlangs.map((lang) => {
                        const { config, dictionary } = lang.project_data;
                        const icon = config?.conlangIcon || '🌐';
                        const name = config?.conlangName || 'Unnamed Conlang';
                        const author = config?.authorName || 'Unknown Author';
                        const desc = config?.description || 'No description provided.';
                        const themeColor = config?.colors?.accent || 'var(--acc)';
                        const wordCount = lang.project_data.wordCount || (dictionary ? dictionary.length : 0);
                        
                        const defaultScriptId = config?.scriptRules?.defaultScriptId || 'default';
                        const scriptData = config?.scriptDataById?.[defaultScriptId] || config || {};

                        const customFont = scriptData?.customFontBase64 || config?.customFontBase64;
                        const fontName = customFont ? `ExploreFont_${lang.project_id}` : undefined;
                        // Strip charset to prevent browser decoding failure for binary fonts
                        const safeFontUrl = customFont ? customFont.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,') : '';

                        let displayName = name;

                        // Merge scriptData into a temporary config for transliteration
                        const translitConfig = { ...config, ...scriptData };

                        // If the snapshot is missing a compiled font, do not attempt to map to PUA glyphs, 
                        // as they will only render as tofu. This will allow standard Unicode transliterations 
                        // (like Cyrillic or Greek) to continue working, while falling back to base letters for custom scripts.
                        if (!customFont) {
                            translitConfig.alphabetGlyphs = {};
                            translitConfig.syllabaryMap = {};
                        }
                        

                        // Hanul (featural_block) uses font ligatures so it doesn't need text replacement
                        const needsTransliteration = ['logographic', 'syllabic', 'alphabetic'].includes(config?.phonologyTypes);
                        if (needsTransliteration) {
                            displayName = name.split(/(\s+)/).map(w => w.trim() ? transliterateText(w, translitConfig, dictionary || []) : w).join('');
                        }

                        return (
                            <div 
                                key={lang.project_id} 
                                className="conlang-explore-card"
                                style={{ '--card-theme': themeColor }}
                                onClick={() => handleCardClick(lang.project_id)}
                            >
                                {customFont && (
                                    <style>{`
                                        @font-face {
                                            font-family: '${fontName}';
                                            src: url('${safeFontUrl}');
                                        }
                                    `}</style>
                                )}
                                <div className="explore-card-top">
                                    <div className="explore-icon" style={{ color: themeColor }}>
                                        {getConlangIcon(icon, 32)}
                                    </div>
                                    <div className="explore-titles">
                                        <h3 className="explore-name notranslate" title={name} style={customFont ? { fontFamily: `'${fontName}', 'Inter', sans-serif` } : {}}>{displayName}</h3>
                                        <p className="explore-author">
                                            <User size={12} /> {author}
                                        </p>
                                    </div>
                                    {sessionUser && sessionUser.id === lang.user_id && (
                                        <button 
                                            className="explore-delete-btn" 
                                            onClick={(e) => handleDeletePublicConlang(e, lang.project_id)}
                                            title="Delete from Explore"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <p className="explore-desc notranslate">{desc}</p>
                                <div className="explore-stats">
                                    <div className="explore-stat">
                                        <BookA size={14} />
                                        <span>{wordCount} words</span>
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button 
                                            className={`explore-like-btn ${userLikes.has(lang.project_id) ? 'liked' : ''}`}
                                            onClick={(e) => toggleLike(e, lang.project_id)}
                                            title={userLikes.has(lang.project_id) ? "Unlike" : "Like"}
                                        >
                                            <Heart size={14} />
                                            <span>{likesData[lang.project_id] || 0}</span>
                                        </button>
                                        <div className="explore-stat" style={{ fontSize: '0.7rem', fontWeight: 'normal', opacity: 0.7 }}>
                                            Last updated: {new Date(lang.project_data?.last_updated || lang.updated_at || lang.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
