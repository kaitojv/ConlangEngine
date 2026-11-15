import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabaseClient.js';
import { Globe, BookA, User, Loader2, Heart, Trash2, Library, Map as MapIcon, Search, Users, ChevronDown, ChevronsUpDown, ChevronsDownUp, MessageSquare, PenTool } from 'lucide-react';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import toast from 'react-hot-toast';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { decompressPayloadAsync } from '../../../utils/schemaValidator.jsx';
import { transliterateText } from '../../../utils/transliteration.js';
import { repairScriptSystems, getDefaultScriptId, buildScriptConfig, getScriptData, mergeScriptGlyphs } from '../../../utils/scriptResolver.js';
import { compileFont } from '../../../utils/fontCompiler.jsx';
import { buildFontCompileSignature } from '../../../utils/useFontInjector.jsx';
import { generateBlockFontData } from '../../../utils/blockFontGenerator.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import PageSkeleton from '../../UI/PageSkeleton/PageSkeleton.jsx';
import { useSharing } from '../../../hooks/useSharing.jsx';
import CommentsModal from './CommentsModal.jsx';
import './explorePage.css';

const EXPLORE_CACHE_KEY = 'explore_conlangs_base_v1';

function needsScriptFontCompile(normCfg, scriptId) {
    const sConf = buildScriptConfig(normCfg, scriptId);
    const sData = getScriptData(normCfg, scriptId);
    if (sConf.phonologyTypes === 'featural_block' && sConf.featuralComponents) {
        return !sConf.customFontBase64;
    }
    const mergedGlyphs = mergeScriptGlyphs(normCfg, scriptId);
    if (Object.keys(mergedGlyphs).length === 0) return false;
    if (!sConf.customFontBase64) return true;
    const compileSig = buildFontCompileSignature(mergedGlyphs, sConf.typographySettings || {});
    if (sData?.compiledSignature && sData.compiledSignature !== compileSig) return true;
    if (!sData?.compiledSignature && Object.keys(mergedGlyphs).length > Object.keys(sConf.customGlyphs || {}).length) {
        return true;
    }
    return false;
}

function buildExploreCardSummary(item) {
    const pd = item?.project_data || {};
    const cfg = pd.config || {};
    const wikiPages = pd.wiki || cfg.wikiPages || {};
    const customCourse = pd.customCourse || cfg.customCourse || [];
    const { scriptSystems, scriptRules } = repairScriptSystems(cfg);
    return {
        project_id: item.project_id,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        project_data: {
            last_updated: pd.last_updated,
            wordCount: pd.wordCount || (Array.isArray(pd.dictionary) ? pd.dictionary.length : 0),
            wikiCount: pd.wikiCount ?? Object.keys(wikiPages).length,
            courseCount: pd.courseCount ?? customCourse.length,
            config: {
                isPublic: true,
                conlangName: cfg.conlangName,
                conlangIcon: cfg.conlangIcon,
                authorName: cfg.authorName,
                description: cfg.description,
                phonologyTypes: cfg.phonologyTypes,
                scriptSystems: scriptSystems.map(s => ({ id: s.id, name: s.name, type: s.type, isDefault: s.isDefault, writingDirection: s.writingDirection })),
                scriptRules: { defaultScriptId: scriptRules.defaultScriptId },
                colors: { accent: cfg.colors?.accent },
            },
        },
    };
}

function loadCachedExploreBase() {
    try {
        const raw = sessionStorage.getItem(EXPLORE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    } catch {
        return null;
    }
}

export default function ExplorePage() {
    const navigate = useNavigate();
    const initialCachedBase = React.useMemo(() => loadCachedExploreBase(), []);
    const [conlangs, setConlangs] = useState(() => initialCachedBase || []);
    const [loading, setLoading] = useState(() => !initialCachedBase);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fontCompileRunIdRef = React.useRef(0);
    const [error, setError] = useState(null);
    const [likesData, setLikesData] = useState({}); // { projectId: count }
    const [userLikes, setUserLikes] = useState(new Set()); // Set of projectIds liked by user
    const [commentsCountData, setCommentsCountData] = useState({}); // { projectId: count }
    const [activeCommentConlang, setActiveCommentConlang] = useState(null);
    const [sessionUser, setSessionUser] = useState(null);
    const [sortBy, setSortBy] = useState('updated'); // 'updated', 'likes', 'name', 'author', 'words'
    const [groupByAuthor, setGroupByAuthor] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedAuthors, setCollapsedAuthors] = useState(() => new Set());
    const [cardScriptSelection, setCardScriptSelection] = useState({}); // { [projectId]: scriptId }

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

                // Fetch snapshots without strict .contains filtering on project_data because compressed 
                // GZIP payloads or legacy structures can prevent Supabase's JSONB operator from matching reliably.
                const { data, error: fetchError } = await supabase
                    .from('conlang_snapshots')
                    .select('project_id, user_id, project_data, created_at, updated_at')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (fetchError) throw fetchError;
                
                // Inspect and decompress payloads if necessary so we can reliably check config.isPublic
                const processedList = await Promise.all(
                    (data || []).map(async (item) => {
                        let pData = item.project_data || {};
                        if (!pData.config && (pData.gzip_compressed_payload || pData.compressed_payload || pData.compressed)) {
                            try {
                                pData = (await decompressPayloadAsync(pData)) || pData;
                            } catch (e) {
                                console.warn("Decompression failed for item", item.project_id, e);
                            }
                        }
                        return { ...item, project_data: pData };
                    })
                );

                const validConlangs = processedList
                    .filter(item => item.project_data?.config?.isPublic === true)
                    .slice(0, 50);

                // Show the Explore base immediately without blocking on font compilation or secondary counts
                setConlangs(validConlangs);
                setLoading(false);
                setIsRefreshing(false);

                try {
                    sessionStorage.setItem(
                        EXPLORE_CACHE_KEY,
                        JSON.stringify(validConlangs.map(buildExploreCardSummary))
                    );
                } catch {
                    // Ignore sessionStorage quota errors
                }

                // Fetch likes and comments in parallel without blocking initial cards
                const projectIds = validConlangs.map(c => c.project_id);
                if (projectIds.length > 0) {
                    Promise.all([
                        supabase
                            .from('conlang_likes')
                            .select('project_id, user_id')
                            .in('project_id', projectIds),
                        supabase
                            .from('conlang_comments')
                            .select('project_id')
                            .in('project_id', projectIds),
                    ]).then(([likesRes, commentsRes]) => {
                        if (!likesRes.error && likesRes.data) {
                            const counts = {};
                            const userSet = new Set();
                            likesRes.data.forEach(like => {
                                counts[like.project_id] = (counts[like.project_id] || 0) + 1;
                                if (like.user_id === session.user.id) {
                                    userSet.add(like.project_id);
                                }
                            });
                            setLikesData(counts);
                            setUserLikes(userSet);
                        }
                        if (!commentsRes.error && commentsRes.data) {
                            const cCounts = {};
                            commentsRes.data.forEach(c => {
                                cCounts[c.project_id] = (cCounts[c.project_id] || 0) + 1;
                            });
                            setCommentsCountData(cCounts);
                        }
                    }).catch((metaErr) => {
                        console.warn("Could not fetch likes/comments:", metaErr);
                    });
                }

                // Lazily compile missing card preview fonts in small background batches (all scripts)
                const runId = ++fontCompileRunIdRef.current;
                const compileBatchSize = 2;
                const needsFont = validConlangs.filter((item) => {
                    const cfg = item.project_data?.config;
                    if (!cfg) return false;
                    const { scriptSystems, scriptRules } = repairScriptSystems(cfg);
                    const normCfg = { ...cfg, scriptSystems, scriptRules };
                    return scriptSystems.some(s => needsScriptFontCompile(normCfg, s.id));
                });

                (async () => {
                    for (let i = 0; i < needsFont.length; i += compileBatchSize) {
                        if (fontCompileRunIdRef.current !== runId) return;
                        const batch = needsFont.slice(i, i + compileBatchSize);
                        const updates = new Map();

                        await Promise.all(batch.map(async (item) => {
                            if (fontCompileRunIdRef.current !== runId) return;
                            const cfg = item.project_data?.config;
                            const { scriptSystems, scriptRules } = repairScriptSystems(cfg);
                            const normCfg = { ...cfg, scriptSystems, scriptRules };
                            const defaultScriptId = getDefaultScriptId(normCfg);
                            const scriptUpdates = {};

                            for (const s of scriptSystems) {
                                if (!needsScriptFontCompile(normCfg, s.id)) continue;
                                const merged = buildScriptConfig(normCfg, s.id);
                                let compiledFont = null;
                                let nextSyllabaryMap = null;
                                let compiledSignature = null;

                                if (merged.phonologyTypes === 'featural_block' && merged.featuralComponents) {
                                    try {
                                        const newData = await generateBlockFontData({ ...merged, lexicon: item.project_data?.dictionary || [] });
                                        compiledFont = newData?.customFontBase64 || null;
                                        nextSyllabaryMap = newData?.syllabaryMap || null;
                                    } catch (e) {
                                        console.warn("Could not generate block font for explore item", item.project_id, s.id, e);
                                    }
                                } else {
                                    const mergedGlyphs = mergeScriptGlyphs(normCfg, s.id);
                                    if (Object.keys(mergedGlyphs).length > 0) {
                                        try {
                                            const typographySettings = merged.typographySettings || {};
                                            compiledSignature = buildFontCompileSignature(mergedGlyphs, typographySettings);
                                            compiledFont = await compileFont(
                                                mergedGlyphs,
                                                typographySettings.traceWidth ?? merged.traceWidth ?? 30,
                                                typographySettings.customFontScale ?? merged.customFontScale ?? 1.0,
                                                {
                                                    consistentCharacterSize: typographySettings.consistentCharacterSize ?? true,
                                                    fixedAdvanceWidth: typographySettings.fixedAdvanceWidth ?? 1000,
                                                }
                                            );
                                        } catch (e) {
                                            console.warn("Could not compile font for explore item", item.project_id, s.id, e);
                                        }
                                    }
                                }

                                if (compiledFont) {
                                    scriptUpdates[s.id] = { compiledFont, nextSyllabaryMap, compiledSignature };
                                }
                            }

                            if (Object.keys(scriptUpdates).length > 0) {
                                updates.set(item.project_id, { scriptUpdates, defaultScriptId });
                            }
                        }));

                        if (fontCompileRunIdRef.current !== runId) return;
                        if (updates.size > 0) {
                            setConlangs((prev) => prev.map((item) => {
                                const upd = updates.get(item.project_id);
                                if (!upd) return item;
                                const cfg = item.project_data.config;
                                const updatedScriptData = cfg.scriptDataById ? { ...cfg.scriptDataById } : {};
                                for (const [sId, sUpd] of Object.entries(upd.scriptUpdates)) {
                                    updatedScriptData[sId] = {
                                        ...(updatedScriptData[sId] || {}),
                                        customFontBase64: sUpd.compiledFont,
                                        ...(sUpd.compiledSignature ? { compiledSignature: sUpd.compiledSignature } : {}),
                                        ...(sUpd.nextSyllabaryMap ? { syllabaryMap: sUpd.nextSyllabaryMap } : {}),
                                    };
                                }
                                const defaultUpd = upd.scriptUpdates[upd.defaultScriptId];
                                return {
                                    ...item,
                                    project_data: {
                                        ...item.project_data,
                                        config: {
                                            ...cfg,
                                            ...(defaultUpd?.compiledFont ? { customFontBase64: defaultUpd.compiledFont } : {}),
                                            ...(defaultUpd?.nextSyllabaryMap ? { syllabaryMap: defaultUpd.nextSyllabaryMap } : {}),
                                            scriptDataById: updatedScriptData
                                        }
                                    }
                                };
                            }));
                        }

                        // Yield to main thread between batches so scrolling & clicks stay responsive
                        await new Promise((resolve) => setTimeout(resolve, 60));
                    }
                })();
            } catch (err) {
                console.error("Error fetching public conlangs:", err);
                setError(err.message);
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
    }, [navigate]);

    useEffect(() => {
        setIsRefreshing(true);
        fetchPublicConlangs();
        return () => {
            fontCompileRunIdRef.current += 1;
        };
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
                const success = await handlePushToCloud(false);
                if (!success) {
                    throw new Error("Failed to sync project to cloud.");
                }
            } else {
                const { data: dDel, error: errDel } = await supabase.from('conlang_snapshots').delete().eq('project_id', currentProjectId).select();
                if (errDel) throw errDel;
                
                if (!dDel || dDel.length === 0) {
                    const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).maybeSingle();
                    if (existingConlang && existingConlang.project_data) {
                        const updatedPayload = { ...existingConlang.project_data, config: { ...existingConlang.project_data.config, isPublic: false } };
                        await supabase.from('conlangs').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                        await supabase.from('conlang_snapshots').update({ project_data: updatedPayload }).eq('project_id', currentProjectId);
                    }
                } else {
                    const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', currentProjectId).maybeSingle();
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

    const handleCardClick = (lang) => {
        const cfg = lang?.project_data?.config || {};
        const selectedScriptId = cardScriptSelection[lang.project_id] || null;
        // Open the public viewer in the same tab with preview metadata for the loading screen
        navigate(`/view/${lang.project_id}`, {
            state: {
                initialScriptId: selectedScriptId,
                previewMeta: {
                    name: cfg.conlangName || 'Unnamed Conlang',
                    icon: cfg.conlangIcon || '🌐',
                    author: cfg.authorName || 'Unknown Author',
                    accent: cfg.colors?.accent || 'var(--acc)',
                },
            },
        });
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
                const { data: existing } = await supabase.from('conlang_snapshots').select('project_data').eq('project_id', projectId).maybeSingle();
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
            const { data: existingConlang } = await supabase.from('conlangs').select('project_data').eq('project_id', projectId).maybeSingle();
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

            setConlangs(prev => {
                const next = prev.filter(c => c.project_id !== projectId);
                try {
                    sessionStorage.setItem(
                        EXPLORE_CACHE_KEY,
                        JSON.stringify(next.map(buildExploreCardSummary))
                    );
                } catch {
                    // Ignore sessionStorage quota errors
                }
                return next;
            });
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

    const filteredConlangs = React.useMemo(() => {
        if (!searchQuery.trim()) return conlangs;
        const q = searchQuery.toLowerCase().trim();
        return conlangs.filter(lang => {
            const name = (lang.project_data?.config?.conlangName || '').toLowerCase();
            const author = (lang.project_data?.config?.authorName || '').toLowerCase();
            const desc = (lang.project_data?.config?.description || '').toLowerCase();
            return name.includes(q) || author.includes(q) || desc.includes(q);
        });
    }, [conlangs, searchQuery]);

    const sortConlangList = React.useCallback((list) => {
        return [...list].sort((a, b) => {
            if (sortBy === 'updated') {
                const dateA = new Date(a.project_data?.last_updated || a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.project_data?.last_updated || b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            }
            if (sortBy === 'likes') {
                const likesA = likesData[a.project_id] || 0;
                const likesB = likesData[b.project_id] || 0;
                if (likesB !== likesA) return likesB - likesA;
                const dateA = new Date(a.project_data?.last_updated || a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.project_data?.last_updated || b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            }
            if (sortBy === 'name') {
                const nameA = a.project_data?.config?.conlangName || 'Unnamed Conlang';
                const nameB = b.project_data?.config?.conlangName || 'Unnamed Conlang';
                return nameA.localeCompare(nameB);
            }
            if (sortBy === 'author') {
                const authorA = a.project_data?.config?.authorName || 'Unknown Author';
                const authorB = b.project_data?.config?.authorName || 'Unknown Author';
                return authorA.localeCompare(authorB);
            }
            if (sortBy === 'words') {
                const wordsA = a.project_data?.wordCount || a.project_data?.dictionary?.length || 0;
                const wordsB = b.project_data?.wordCount || b.project_data?.dictionary?.length || 0;
                return wordsB - wordsA;
            }
            return 0;
        });
    }, [sortBy, likesData]);

    const authorGroups = React.useMemo(() => {
        if (!groupByAuthor) return [];

        const groupMap = new Map();

        filteredConlangs.forEach(lang => {
            // Group primarily by user_id if present; fallback to trimmed lowercase author name
            const key = lang.user_id 
                ? `uid_${lang.user_id}` 
                : `name_${(lang.project_data?.config?.authorName || 'unknown').trim().toLowerCase()}`;
            
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    key,
                    userId: lang.user_id,
                    authorNames: [],
                    langs: [],
                    totalLikes: 0,
                    totalWords: 0,
                    latestDate: 0
                });
            }
            
            const grp = groupMap.get(key);
            grp.langs.push(lang);
            const aName = lang.project_data?.config?.authorName?.trim();
            if (aName && !grp.authorNames.includes(aName)) {
                grp.authorNames.push(aName);
            }
            grp.totalLikes += (likesData[lang.project_id] || 0);
            grp.totalWords += (lang.project_data?.wordCount || lang.project_data?.dictionary?.length || 0);
            const itemDate = new Date(lang.project_data?.last_updated || lang.updated_at || lang.created_at).getTime();
            if (itemDate > grp.latestDate) {
                grp.latestDate = itemDate;
            }
        });

        const groups = Array.from(groupMap.values()).map(grp => {
            // Pick longest, most complete author name (e.g. "Arthur Gregório Nogueira" over "Arthur")
            const authorName = grp.authorNames.length > 0 
                ? [...grp.authorNames].sort((a, b) => b.length - a.length)[0]
                : 'Unknown Author';

            return {
                ...grp,
                authorName,
                sortedLangs: sortConlangList(grp.langs)
            };
        });

        return groups.sort((a, b) => {
            if (sortBy === 'updated') {
                return b.latestDate - a.latestDate;
            }
            if (sortBy === 'likes') {
                if (b.totalLikes !== a.totalLikes) return b.totalLikes - a.totalLikes;
                return b.latestDate - a.latestDate;
            }
            if (sortBy === 'name' || sortBy === 'author') {
                return a.authorName.localeCompare(b.authorName);
            }
            if (sortBy === 'words') {
                return b.totalWords - a.totalWords;
            }
            return 0;
        });
    }, [filteredConlangs, groupByAuthor, likesData, sortBy, sortConlangList]);

    const flatSortedConlangs = React.useMemo(() => {
        return sortConlangList(filteredConlangs);
    }, [filteredConlangs, sortConlangList]);

    const allAuthorKeys = React.useMemo(() => authorGroups.map(g => g.key), [authorGroups]);
    const areAllCollapsed = allAuthorKeys.length > 0 && allAuthorKeys.every(k => collapsedAuthors.has(k));

    const toggleAuthorCollapse = React.useCallback((key) => {
        setCollapsedAuthors(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const handleToggleAllAuthors = React.useCallback(() => {
        if (areAllCollapsed) {
            setCollapsedAuthors(new Set());
        } else {
            setCollapsedAuthors(new Set(allAuthorKeys));
        }
    }, [areAllCollapsed, allAuthorKeys]);

    // Auto-expand groups when user types a search query so results are immediately visible
    useEffect(() => {
        if (searchQuery.trim()) {
            setCollapsedAuthors(new Set());
        }
    }, [searchQuery]);

    const handleCommentsCountChange = React.useCallback((pId, count) => {
        setCommentsCountData((prev) => {
            if (prev[pId] === count) return prev;
            return { ...prev, [pId]: count };
        });
    }, []);

    const renderConlangCard = (lang) => {
        const { config, dictionary, wiki, customCourse: topCourse } = lang.project_data;
        const icon = config?.conlangIcon || '🌐';
        const name = config?.conlangName || 'Unnamed Conlang';
        const author = config?.authorName || 'Unknown Author';
        const desc = config?.description || 'No description provided.';
        const themeColor = config?.colors?.accent || 'var(--acc)';
        const wordCount = lang.project_data.wordCount || (dictionary ? dictionary.length : 0);
        
        const wikiPages = wiki || config?.wikiPages || {};
        const wikiCount = lang.project_data?.wikiCount ?? Object.keys(wikiPages).length;
        const customCourse = topCourse || config?.customCourse || [];
        const courseCount = lang.project_data?.courseCount ?? customCourse.length;
        
        const { scriptSystems, scriptRules } = repairScriptSystems(config || {});
        const normConfig = { ...(config || {}), scriptSystems, scriptRules };
        const defaultScriptId = getDefaultScriptId(normConfig);
        const activeCardScriptId = cardScriptSelection[lang.project_id] || defaultScriptId;
        const isRomanizedCard = activeCardScriptId === 'latin';
        const effectiveCardScriptId = isRomanizedCard ? defaultScriptId : activeCardScriptId;
        const translitConfig = buildScriptConfig(normConfig, effectiveCardScriptId);

        const rawCustomFont = !isRomanizedCard
            ? (translitConfig.customFontBase64 || translitConfig.customFont)
            : null;
        const customFontList = Array.isArray(rawCustomFont)
            ? rawCustomFont.filter(Boolean)
            : (rawCustomFont ? [rawCustomFont] : []);
        const customFont = customFontList.length > 0;
        const safeScriptSuffix = String(effectiveCardScriptId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fontName = customFont ? `ExploreFont_${lang.project_id}_${safeScriptSuffix}` : undefined;
        // Ensure data URL header is clean and valid for @font-face
        const safeFontUrls = customFontList.map((f) =>
            f.startsWith('data:') ? f.replace(/^data:.*?;base64,/, 'data:font/truetype;base64,') : `data:font/truetype;base64,${f}`
        );

        let displayName = name;

        // If the snapshot is missing a compiled font, do not attempt to map to PUA glyphs, 
        // as they will only render as tofu. This will allow standard Unicode transliterations 
        // (like Cyrillic or Greek) to continue working, while falling back to base letters for custom scripts.
        if (!customFont) {
            translitConfig.alphabetGlyphs = {};
            translitConfig.syllabaryMap = {};
        }

        // Hanul (featural_block) uses font ligatures so it doesn't need text replacement
        const needsTransliteration = !isRomanizedCard && ['logographic', 'syllabic', 'alphabetic', 'abjad', 'abugida'].includes(translitConfig?.phonologyTypes);
        if (needsTransliteration) {
            displayName = name.split(/(\s+)/).map(w => w.trim() ? transliterateText(w, translitConfig, dictionary || []) : w).join('');
        }

        return (
            <div 
                key={lang.project_id} 
                className="conlang-explore-card"
                style={{ '--card-theme': themeColor }}
                onClick={() => handleCardClick(lang)}
            >
                {customFont && (
                    <style>{safeFontUrls.map((url) => `
                        @font-face {
                            font-family: '${fontName}';
                            src: url('${url}');
                        }
                    `).join('\n')}</style>
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
                {scriptSystems.length > 1 && (
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '0.5rem' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {scriptSystems.map(s => {
                            const isActive = activeCardScriptId === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCardScriptSelection(prev => ({ ...prev, [lang.project_id]: s.id }));
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        border: `1px solid ${isActive ? themeColor : 'var(--bd)'}`,
                                        background: isActive ? themeColor : 'var(--s2)',
                                        color: isActive ? '#fff' : 'var(--tx2)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                    title={`Preview script: ${s.name} (${s.type})`}
                                >
                                    <PenTool size={10} />
                                    <span>{s.name || s.id}</span>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCardScriptSelection(prev => ({ ...prev, [lang.project_id]: 'latin' }));
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                border: `1px solid ${isRomanizedCard ? themeColor : 'var(--bd)'}`,
                                background: isRomanizedCard ? themeColor : 'var(--s2)',
                                color: isRomanizedCard ? '#fff' : 'var(--tx2)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            title="Preview romanized name"
                        >
                            Romanized
                        </button>
                    </div>
                )}
                <p className="explore-desc notranslate">{desc}</p>
                <div className="explore-stats">
                    <div className="explore-stat">
                        <BookA size={14} />
                        <span>{wordCount} words</span>
                    </div>
                    {wikiCount > 0 && (
                        <div className="explore-stat" title={`${wikiCount} wiki/corpus items`}>
                            <Library size={14} />
                            <span>{wikiCount} {wikiCount === 1 ? 'article' : 'articles'}</span>
                        </div>
                    )}
                    {courseCount > 0 && (
                        <div className="explore-stat" title={`${courseCount} course modules`}>
                            <MapIcon size={14} />
                            <span>{courseCount} {courseCount === 1 ? 'course' : 'courses'}</span>
                        </div>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                            className="explore-comment-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveCommentConlang(lang);
                            }}
                            title="Comments & Discussion"
                        >
                            <MessageSquare size={14} />
                            <span>{commentsCountData[lang.project_id] || 0}</span>
                        </button>
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
    };

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
            <div className="explore-header">
                <div>
                    <h1>Explore</h1>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Discover public conlangs created by the community.</span>
                        {isRefreshing && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
                                <Loader2 size={13} className="animate-spin" /> Updating...
                            </span>
                        )}
                    </p>
                </div>
                <div className="explore-header-actions">
                    <div className="explore-search-wrapper">
                        <Search size={15} className="explore-search-icon" />
                        <input 
                            type="text" 
                            className="explore-search-input"
                            placeholder="Search conlangs or authors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                className="explore-search-clear" 
                                onClick={() => setSearchQuery('')}
                                title="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <button 
                        type="button"
                        className={`explore-toggle-btn ${groupByAuthor ? 'active' : ''}`}
                        onClick={() => setGroupByAuthor(prev => !prev)}
                        title={groupByAuthor ? "Switch to flat grid" : "Group conlangs by author"}
                    >
                        <Users size={14} />
                        <span>{groupByAuthor ? 'Grouped by Author' : 'All Conlangs'}</span>
                    </button>

                    {groupByAuthor && authorGroups.length > 0 && (
                        <button 
                            type="button"
                            className="explore-toggle-btn"
                            onClick={handleToggleAllAuthors}
                            title={areAllCollapsed ? "Expand all author sections" : "Collapse all author sections"}
                        >
                            {areAllCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
                            <span>{areAllCollapsed ? 'Expand All' : 'Collapse All'}</span>
                        </button>
                    )}

                    <div className="explore-sort">
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="explore-sort-select"
                        >
                            <option value="updated">Last Updated</option>
                            <option value="likes">Most Liked</option>
                            <option value="name">Conlang A-Z</option>
                            <option value="author">Author A-Z</option>
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
            ) : filteredConlangs.length === 0 ? (
                <div className="explore-empty">
                    <Search size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>No conlangs found</h3>
                    <p>No results matching "{searchQuery}". Try a different search term.</p>
                    <div style={{ marginTop: '1rem' }}>
                        <Button variant="secondary" onClick={() => setSearchQuery('')}>
                            Clear Search
                        </Button>
                    </div>
                </div>
            ) : groupByAuthor ? (
                <div className="explore-author-groups">
                    {authorGroups.map((group) => {
                        const isCollapsed = collapsedAuthors.has(group.key);
                        return (
                            <section 
                                key={group.key} 
                                className={`explore-author-section ${isCollapsed ? 'collapsed' : ''}`}
                            >
                                <button
                                    type="button"
                                    className={`explore-author-header ${isCollapsed ? 'collapsed' : ''}`}
                                    onClick={() => toggleAuthorCollapse(group.key)}
                                    aria-expanded={!isCollapsed}
                                    aria-controls={`author-group-${group.key}`}
                                    title={isCollapsed ? `Expand ${group.authorName}'s conlangs` : `Collapse ${group.authorName}'s conlangs`}
                                >
                                    <div className="explore-author-info">
                                        <div className={`explore-author-chevron ${isCollapsed ? 'collapsed' : ''}`}>
                                            <ChevronDown size={18} />
                                        </div>
                                        <div className="explore-author-avatar">
                                            <User size={16} />
                                        </div>
                                        <div className="explore-author-name-row">
                                            <h2 className="explore-author-name">{group.authorName}</h2>
                                            <span className="explore-author-badge">
                                                {group.langs.length} {group.langs.length === 1 ? 'conlang' : 'conlangs'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="explore-author-stats">
                                        <span><BookA size={13} /> {group.totalWords.toLocaleString()} words</span>
                                        <span><Heart size={13} /> {group.totalLikes} likes</span>
                                    </div>
                                </button>
                                <div 
                                    id={`author-group-${group.key}`}
                                    className={`explore-author-content ${isCollapsed ? 'collapsed' : ''}`}
                                    aria-hidden={isCollapsed}
                                >
                                    <div className="explore-author-content-inner">
                                        <div className="explore-grid">
                                            {group.sortedLangs.map((lang) => renderConlangCard(lang))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>
            ) : (
                <div className="explore-grid">
                    {flatSortedConlangs.map((lang) => renderConlangCard(lang))}
                </div>
            )}

            <CommentsModal
                isOpen={Boolean(activeCommentConlang)}
                onClose={() => setActiveCommentConlang(null)}
                conlang={activeCommentConlang}
                sessionUser={sessionUser}
                onCommentsCountChange={handleCommentsCountChange}
            />
        </div>
    );
}
