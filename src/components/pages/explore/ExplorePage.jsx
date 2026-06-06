import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient.js';
import { Globe, BookA, User, Loader2, Heart } from 'lucide-react';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import toast from 'react-hot-toast';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { sanitizeConfig } from '../../../utils/schemaValidator.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import './explorePage.css';

export default function ExplorePage() {
    const navigate = useNavigate();
    const [conlangs, setConlangs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [likesData, setLikesData] = useState({}); // { projectId: count }
    const [userLikes, setUserLikes] = useState(new Set()); // Set of projectIds liked by user
    const [sessionUser, setSessionUser] = useState(null);

    const isPublic = useConfigStore((state) => state.isPublic);
    const updateConfig = useConfigStore((state) => state.updateConfig);

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
                    .select('project_id, project_data, created_at')
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
        
        const configData = sanitizeConfig({ ...currentStore, isPublic: newIsPublic });
        const payload = {
            dictionary: useLexiconStore.getState().lexicon || [],
            config: configData,
            wiki: configData.wikiPages || {}
        };

        try {
            if (session?.user?.id && currentProjectId) {
                const { data: existingSnapshot } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id')
                    .eq('project_id', currentProjectId)
                    .single();

                if (existingSnapshot && existingSnapshot.user_id && existingSnapshot.user_id !== session.user.id) {
                    toast.error("You cannot update a public project owned by another account.", { id: toastId });
                    updateConfig({ isPublic: !newIsPublic }); // revert
                    return;
                }
            }

            await supabase.from('conlang_snapshots').upsert({
                user_id: session.user.id,
                project_id: currentProjectId,
                project_data: payload
            }, { onConflict: 'project_id' });
            
            await supabase.from('conlangs').upsert({
                user_id: session.user.id,
                project_id: currentProjectId,
                project_data: payload
            }, { onConflict: 'project_id' });

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

    if (loading) {
        return (
            <div className="explore-loading">
                <Loader2 size={40} className="animate-spin text-accent" />
                <p>Discovering conlangs...</p>
            </div>
        );
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
                <Button 
                    variant={isPublic ? 'error' : 'primary'} 
                    onClick={handleTogglePublish}
                >
                    <Globe size={16} /> {isPublic ? 'Make Active Conlang Private' : 'Publish Active Conlang'}
                </Button>
            </div>

            {conlangs.length === 0 ? (
                <div className="explore-empty">
                    <Globe size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>No public conlangs found.</h3>
                    <p>Be the first to share your creation by toggling "Publicly Visible" in your System Settings and syncing to the cloud!</p>
                </div>
            ) : (
                <div className="explore-grid">
                    {conlangs.map((lang) => {
                        const { config, dictionary } = lang.project_data;
                        const icon = config?.conlangIcon || '🌐';
                        const name = config?.conlangName || 'Unnamed Conlang';
                        const author = config?.authorName || 'Unknown Author';
                        const desc = config?.description || 'No description provided.';
                        const themeColor = config?.colors?.accent || 'var(--acc)';
                        const wordCount = dictionary ? dictionary.length : 0;
                        
                        const customFont = config?.customFontBase64;
                        const fontName = customFont ? `ExploreFont_${lang.project_id}` : undefined;

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
                                            src: url(${customFont});
                                        }
                                    `}</style>
                                )}
                                <div className="explore-card-top">
                                    <div className="explore-icon" style={{ color: themeColor }}>
                                        {getConlangIcon(icon, 32)}
                                    </div>
                                    <div className="explore-titles">
                                        <h3 className="explore-name" title={name} style={customFont ? { fontFamily: `'${fontName}', 'Inter', sans-serif` } : {}}>{name}</h3>
                                        <p className="explore-author">
                                            <User size={12} /> {author}
                                        </p>
                                    </div>
                                </div>
                                <p className="explore-desc" style={customFont ? { fontFamily: `'${fontName}', 'Inter', sans-serif` } : {}}>{desc}</p>
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
                                            {new Date(lang.created_at).toLocaleDateString()}
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
