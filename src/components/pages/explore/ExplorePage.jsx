import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient.js';
import { Globe, BookA, User, Loader2 } from 'lucide-react';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import toast from 'react-hot-toast';
import './explorePage.css';

export default function ExplorePage() {
    const navigate = useNavigate();
    const [conlangs, setConlangs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchPublicConlangs() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    toast.error("You're not logged in");
                    navigate('/');
                    return;
                }

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
            } catch (err) {
                console.error("Error fetching public conlangs:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPublicConlangs();
    }, []);

    const handleCardClick = (projectId) => {
        // Open the public viewer in the same tab
        navigate(`/view/${projectId}`);
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
            <div className="explore-header">
                <h1>Explore</h1>
                <p>Discover public conlangs created by the community.</p>
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
                                    <div className="explore-stat" style={{ marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 'normal', opacity: 0.7 }}>
                                        {new Date(lang.created_at).toLocaleDateString()}
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
