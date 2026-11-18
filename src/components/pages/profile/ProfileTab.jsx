import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { CloudUpload, CloudDownload, Trophy, Activity, User, LogOut, Globe, MessageCircle, BookOpen, Crown, Cog, Puzzle, Tags, Flame, GitBranch, GitMerge, Share2, Heart, Coffee, PieChart, Sparkles, Book, Library, BrainCircuit, ScrollText, Network, Ear, ArrowLeftRight, Layers, Volume2, PenTool, Shapes, Download, Trash2, Edit2, History, RotateCcw, RefreshCw, Gem, Landmark, Star, Compass, CheckCircle2, Award, Quote, BookMarked, Languages, Feather, Medal, GraduationCap, Zap, Scroll, Upload } from 'lucide-react';
import CreatorAvatar from '@/components/UI/CreatorAvatar/CreatorAvatar.jsx';
import { CREATOR_AVATAR_ICONS, CREATOR_AVATAR_COLORS, compressAvatarImage } from '@/components/UI/CreatorAvatar/creatorAvatarUtils.js';
import './profileTab.css';
import { isSyncReviewEnabled, setSyncReviewEnabled } from '@/utils/syncEngine.js';
import { useNavigate, useLocation } from 'react-router-dom';
import { ALLOWED_REDIRECTS } from '@/utils/navigationConstants.js';
import { supabase } from '@/utils/supabaseClient.js';
import toast from 'react-hot-toast';
import { sanitizeConfig, sanitizeLexicon, sanitizePhrases, decompressPayloadAsync } from '@/utils/schemaValidator.jsx';
import { saveSyncBase } from '@/utils/syncBaseStore.js';
import { useSharing } from '@/hooks/useSharing.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import PayPalButton from '@/components/Payment/PayPalButton.jsx';
import { broadcastAutoSyncToggle } from '@/utils/realtimeSync.js';


const BADGES = [
    { id: 'genesis', name: 'Genesis', desc: 'You started a new Conlang.', Icon: Sparkles },
    { id: 'first_word', name: 'First Word', desc: 'The vocabulary grows.', Icon: Book },
    { id: 'grammarian', name: 'Grammarian', desc: 'Set up phonetic and syntax rules.', Icon: Puzzle },
    { id: 'polyglot', name: 'Polyglot', desc: 'Reach 50 words in the lexicon.', Icon: Flame },
    { id: 'lexicographer', name: 'Lexicographer', desc: 'Reach 200 words in the lexicon.', Icon: BookOpen },
    { id: 'master_linguist', name: 'Master Linguist', desc: 'Reach 1000 words! A true language.', Icon: Crown },
    { id: 'semanticist', name: 'Semanticist', desc: 'Use 10 different semantic tags.', Icon: Tags },
    { id: 'lore_keeper', name: 'Lore Keeper', desc: 'Create your first Wiki page.', Icon: Library },
    { id: 'native_speaker', name: 'Native Speaker', desc: 'Get a 10 streak in Flashcards.', Icon: BrainCircuit },
    { id: 'storyteller', name: 'Storyteller', desc: 'Gloss a text using the Reader.', Icon: ScrollText },
    { id: 'etymologist', name: 'Etymologist', desc: 'Generate an Etymology Root Map.', Icon: Network },
    { id: 'translator', name: 'Translator', desc: 'Analyze a sentence in the Syntax Analyzer.', Icon: MessageCircle },
    { id: 'phonologist', name: 'Phonologist', desc: 'Map more than 20 unique phonemes.', Icon: Ear },
    { id: 'syntactician', name: 'Syntactician', desc: 'Configure a custom Word Order.', Icon: ArrowLeftRight },
    { id: 'morphologist', name: 'Morphologist', desc: 'Create 5 grammatical rules/affixes.', Icon: Layers },
    { id: 'vocalist', name: 'Vocalist', desc: 'Listen to a word using the TTS audio.', Icon: Volume2 },
    { id: 'calligrapher', name: 'Calligrapher', desc: 'Draw a custom ideogram or upload a Font.', Icon: PenTool },
    { id: 'typologist', name: 'Typologist', desc: 'Change the language typology.', Icon: Shapes },
    { id: 'archivist', name: 'Archivist', desc: 'Export a PDF or JSON Backup.', Icon: Download },
    { id: 'multiverse', name: 'Multiverse', desc: 'Create a second conlang project.', Icon: Globe },
    { id: 'grand_linguist', name: 'Grand Linguist', desc: 'Reach 2,000 words in the lexicon.', Icon: Gem },
    { id: 'living_dictionary', name: 'Living Dictionary', desc: 'Reach 3,500 words in the lexicon.', Icon: Landmark },
    { id: 'immortal_tongue', name: 'Immortal Tongue', desc: 'Reach 5,000 words! An epic lexicon.', Icon: Star },
    { id: 'taxonomist', name: 'Taxonomist', desc: 'Use 25 different semantic tags.', Icon: Compass },
    { id: 'ipa_perfectionist', name: 'IPA Perfectionist', desc: 'Transcribe IPA for 100% of a 100+ word lexicon.', Icon: CheckCircle2 },
    { id: 'root_architect', name: 'Root Architect', desc: 'Trace etymology or parent roots for 50+ words.', Icon: GitBranch },
    { id: 'lexical_sculptor', name: 'Lexical Sculptor', desc: 'Classify words across 8 or more parts of speech.', Icon: Award },
    { id: 'phrase_weaver', name: 'Phrase Weaver', desc: 'Record 25 sentences or phrases.', Icon: Quote },
    { id: 'master_chronicler', name: 'Master Chronicler', desc: 'Author 5 or more Wiki pages.', Icon: BookMarked },
    { id: 'grammar_engine', name: 'Grammar Engine', desc: 'Create 20 grammatical rules or affixes.', Icon: Cog },
    { id: 'biscriptal', name: 'Biscriptal', desc: 'Maintain 2 or more writing scripts.', Icon: Languages },
    { id: 'script_savant', name: 'Script Savant', desc: 'Design 100 or more custom glyphs.', Icon: Feather },
    { id: 'monumental_script', name: 'Monumental Script', desc: 'Design 500 or more custom glyphs.', Icon: Medal },
    { id: 'course_creator', name: 'Course Creator', desc: 'Build 5 or more custom course lessons.', Icon: GraduationCap },
    { id: 'study_legend', name: 'Study Legend', desc: 'Reach a 30 streak in Flashcards.', Icon: Zap },
    { id: 'worldbuilder', name: 'Worldbuilder', desc: 'Manage 3 or more conlang projects.', Icon: Scroll },
    { id: 'ambassador', name: 'Ambassador', desc: 'Publish a language to Explore.', Icon: Share2 },
// { id: 'patron', name: 'Patron', desc: 'Upgrade to Conlang Engine LIVE.', Icon: Heart },
];

export default function ProfileTab() {
    const { t } = useTranslation();

    const [cloudProjects, setCloudProjects] = useState([]);
    const [isProjectSelectorOpen, setProjectSelectorOpen] = useState(false);
    const localProjects = useProjectStore(state => state.localProjects);
    const { transliterate } = useTransliterator();
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Grab the lexicon, but safely wrap it just in case local storage got corrupted
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const phrases = useLexiconStore((state) => state.phrases);
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    const setPhrases = useLexiconStore((state) => state.setPhrases);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);

    // Bundle up all the authentication and sync states
    const [session, setSession] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authStatus, setAuthStatus] = useState({ msg: '', type: '' });
    const [syncStatus, setSyncStatus] = useState('');
    
    // Version History State
    const [isVersionHistoryOpen, setVersionHistoryOpen] = useState(false);
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    // Listen to Supabase to see if the user is currently logged in
    useEffect(() => {
        const checkLiveStatus = async (currentSession) => {
            if (!currentSession) {
                updateConfig({ isProActive: false });
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_pro, live_until')
                    .eq('id', currentSession.user.id)
                    .maybeSingle();

                if (error) throw error;

                let activeLive = false;
                if (data) {
                    if (data.is_pro) {
                        activeLive = true;
                    } else if (data.live_until) {
                        const safeDateStr = data.live_until.replace(' ', 'T');
                        activeLive = new Date(safeDateStr) > new Date();
                    }
                }
                
                updateConfig({ isProActive: activeLive });
            } catch (err) {
                console.error('Error verifying LIVE status:', err);
                updateConfig({ isProActive: false });
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

    // Handle redirections after successfully logging in
    useEffect(() => {
        if (session) {
            const searchParams = new URLSearchParams(location.search);
            const requestedRedirect = searchParams.get('redirectTo');
            
            if (requestedRedirect) {
                const safeRedirectUrl = ALLOWED_REDIRECTS.includes(requestedRedirect) ? requestedRedirect : '/';
                navigate(safeRedirectUrl, { replace: true });
            }
        }
    }, [session, location.search, navigate]);

    // BUG-5 (proper fix): selecting only the fields this component reads, so
    // unrelated config changes no longer re-render it. The previous version
    // of this code destructured the values below but still held a broad
    // subscription to the whole store, so the component re-rendered anyway and
    // the extraction achieved nothing.
    const {
        grammarRules, streak: configStreak, wikiPages: configWikiPages,
        syntaxOrder: configSyntaxOrder, phonologyTypes: configPhonologyTypes,
        customFont: configCustomFont, customFontBase64: configCustomFontBase64,
        customGlyphs: configCustomGlyphs, scriptSystems, scriptDataById,
        customCourse, isPublic,
        unlockedBadges: configUnlockedBadges, unlockBadge, logActivity,
        isProActive, isAutoSyncEnabled, authorName, authorAvatar, authorBio, authorBadge,
        vowels, activity, projectId,
        updateConfig, setFullConfig,
    } = useConfigStore(useShallow(state => ({
        grammarRules: state.grammarRules,
        streak: state.streak,
        wikiPages: state.wikiPages,
        syntaxOrder: state.syntaxOrder,
        phonologyTypes: state.phonologyTypes,
        customFont: state.customFont,
        customFontBase64: state.customFontBase64,
        customGlyphs: state.customGlyphs,
        scriptSystems: state.scriptSystems,
        scriptDataById: state.scriptDataById,
        customCourse: state.customCourse,
        isPublic: state.isPublic,
        unlockedBadges: state.unlockedBadges,
        unlockBadge: state.unlockBadge,
        logActivity: state.logActivity,
        isProActive: state.isProActive,
        isAutoSyncEnabled: state.isAutoSyncEnabled,
        authorName: state.authorName,
        authorAvatar: state.authorAvatar,
        authorBio: state.authorBio,
        authorBadge: state.authorBadge,
        vowels: state.vowels,
        activity: state.activity,
        projectId: state.projectId,
        updateConfig: state.updateConfig,
        setFullConfig: state.setFullConfig,
    })));

    const [isCustomizingProfile, setIsCustomizingProfile] = useState(false);
    const [isSyncingProfileMeta, setIsSyncingProfileMeta] = useState(false);

    const syncAuthProfileMetadata = async (patch = {}) => {
        if (!session?.user) return;
        setIsSyncingProfileMeta(true);
        try {
            await supabase.auth.updateUser({
                data: {
                    display_name: patch.authorName !== undefined ? patch.authorName : authorName,
                    author_avatar: patch.authorAvatar !== undefined ? patch.authorAvatar : authorAvatar,
                    author_bio: patch.authorBio !== undefined ? patch.authorBio : authorBio,
                    author_badge: patch.authorBadge !== undefined ? patch.authorBadge : authorBadge
                }
            });
        } catch {
            // Non-blocking: local config still preserves profile changes
        } finally {
            setIsSyncingProfileMeta(false);
        }
    };

    const handleAvatarChange = async (nextAvatar) => {
        updateConfig({ authorAvatar: nextAvatar });
        await syncAuthProfileMetadata({ authorAvatar: nextAvatar });
    };

    const handleAvatarImageUpload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        try {
            const compressed = await compressAvatarImage(file, 128);
            const nextAvatar = { ...(authorAvatar || {}), type: 'image', imageData: compressed };
            await handleAvatarChange(nextAvatar);
            toast.success('Profile picture updated!');
        } catch (err) {
            toast.error(err?.message || 'Could not process image.');
        }
    };

    const pinnedBadgeObj = useMemo(
        () => BADGES.find((b) => b.id === authorBadge && configUnlockedBadges?.includes(b.id)) || null,
        [authorBadge, configUnlockedBadges]
    );

    const [showSyncReview, setShowSyncReview] = useState(() => isSyncReviewEnabled());
    const toggleSyncReview = () => {
        const next = !showSyncReview;
        setShowSyncReview(next);
        setSyncReviewEnabled(next);
    };

    // Check the user's progress and unlock any achievements they've earned
    useEffect(() => {
        const unlock = (id, name) => {
            if (!configUnlockedBadges?.includes(id)) {
                unlockBadge(id, name);
                logActivity(`Unlocked achievement: ${name}!`);
            }
        };

        const wordCount = lexicon.length;
        if (wordCount >= 1) unlock('first_word', 'First Word');
        if (wordCount >= 50) unlock('polyglot', 'Polyglot');
        if (wordCount >= 200) unlock('lexicographer', 'Lexicographer');
        if (wordCount >= 1000) unlock('master_linguist', 'Master Linguist');
        if (wordCount >= 2000) unlock('grand_linguist', 'Grand Linguist');
        if (wordCount >= 3500) unlock('living_dictionary', 'Living Dictionary');
        if (wordCount >= 5000) unlock('immortal_tongue', 'Immortal Tongue');

        const ruleCount = grammarRules?.length || 0;
        if (ruleCount >= 1) unlock('grammarian', 'Grammarian');
        if (ruleCount >= 5) unlock('morphologist', 'Morphologist');
        if (ruleCount >= 20) unlock('grammar_engine', 'Grammar Engine');

        const uniqueTags = new Set(lexicon.flatMap(w => w.tags || [])).size;
        if (uniqueTags >= 10) unlock('semanticist', 'Semanticist');
        if (uniqueTags >= 25) unlock('taxonomist', 'Taxonomist');

        if (wordCount >= 100 && lexicon.every(w => w.ipa && String(w.ipa).trim() !== '')) {
            unlock('ipa_perfectionist', 'IPA Perfectionist');
        }
        const etymologyCount = lexicon.filter(w => (w.etymology && String(w.etymology).trim() !== '') || w.parentRootId).length;
        if (etymologyCount >= 50) unlock('root_architect', 'Root Architect');

        const wordClassCount = new Set(lexicon.map(w => w.wordClass && String(w.wordClass).trim()).filter(Boolean)).size;
        if (wordClassCount >= 8) unlock('lexical_sculptor', 'Lexical Sculptor');

        if ((phrases?.length || 0) >= 25) unlock('phrase_weaver', 'Phrase Weaver');

        if (configStreak >= 10) unlock('native_speaker', 'Native Speaker');
        if (configStreak >= 30) unlock('study_legend', 'Study Legend');

        const wikiCount = Object.keys(configWikiPages || {}).length;
        if (wikiCount > 1) unlock('lore_keeper', 'Lore Keeper');
        if (wikiCount >= 5) unlock('master_chronicler', 'Master Chronicler');

        if (configSyntaxOrder !== 'SVO') unlock('syntactician', 'Syntactician');
        if (localProjects.length > 1) unlock('multiverse', 'Multiverse');
        if (localProjects.length >= 3) unlock('worldbuilder', 'Worldbuilder');
        if (configPhonologyTypes !== 'alphabetic') unlock('typologist', 'Typologist');

        const scriptEntries = Object.values(scriptDataById || {});
        const scriptGlyphTotal = scriptEntries.reduce((sum, entry) => sum + Object.keys(entry?.customGlyphs || {}).length, 0);
        const totalCustomGlyphs = Math.max(scriptGlyphTotal, Object.keys(configCustomGlyphs || {}).length);
        const hasAnyCustomFont = Boolean(
            configCustomFont ||
            configCustomFontBase64 ||
            scriptEntries.some(entry => entry?.customFont || entry?.customFontBase64)
        );
        if (hasAnyCustomFont || totalCustomGlyphs > 0) unlock('calligrapher', 'Calligrapher');
        if (totalCustomGlyphs >= 100) unlock('script_savant', 'Script Savant');
        if (totalCustomGlyphs >= 500) unlock('monumental_script', 'Monumental Script');

        if ((scriptSystems?.length || 0) >= 2) unlock('biscriptal', 'Biscriptal');
        if ((customCourse?.length || 0) >= 5) unlock('course_creator', 'Course Creator');
        if (isPublic) unlock('ambassador', 'Ambassador');

        // New state-based triggers
        const phonemeCount = new Set(lexicon.map(w => w.word.toLowerCase()).join('').split('')).size;
        if (phonemeCount >= 20) unlock('phonologist', 'Phonologist');
        
        if (isProActive) unlock('patron', 'Patron');
    }, [lexicon, phrases, grammarRules, configStreak, configUnlockedBadges, configWikiPages, configSyntaxOrder, localProjects.length, configPhonologyTypes, configCustomFont, configCustomFontBase64, configCustomGlyphs, scriptSystems, scriptDataById, customCourse, isPublic, isProActive, unlockBadge, logActivity]);

    // Crunch the numbers for the overall dictionary statistics
    const analytics = useMemo(() => {
        const totalWords = lexicon.length;
        const uniqueTags = new Set(lexicon.flatMap(w => w.tags || [])).size;
        const wordsWithIpa = lexicon.filter(w => w.ipa && w.ipa.trim() !== "").length;
        const ipaCoverage = totalWords > 0 ? Math.round((wordsWithIpa / totalWords) * 100) : 0;

        let topClass = "N/A";
        let maxCount = 0;
        const classCounts = {};
        lexicon.forEach(w => {
            if (w.wordClass) {
                w.wordClass.split(',').forEach(cls => {
                    const cleanCls = cls.trim().toLowerCase();
                    classCounts[cleanCls] = (classCounts[cleanCls] || 0) + 1;
                });
            }
        });
        for (const [cls, count] of Object.entries(classCounts)) {
            if (count > maxCount) { maxCount = count; topClass = cls; }
        }

        return { totalWords, uniqueTags, ipaCoverage, topClass };
    }, [lexicon]);

    // Analyze the actual letters and sounds being used in the language
    const phonotactics = useMemo(() => {
        const text = lexicon.map(w => w.word.replace(/\*/g, '').toLowerCase()).join('');
        const vowelsList = (vowels || "a,e,i,o,u").split(',').map(v => v.split('=')[0].trim().toLowerCase());
        
        let vCount = 0; 
        let cCount = 0; 
        const freqs = {};

        for (const char of text) {
            if (char.match(/[a-z]/i)) { 
                if (vowelsList.includes(char)) {
                    vCount++;
                } else {
                    cCount++;
                }
                freqs[char] = (freqs[char] || 0) + 1;
            }
        }
        
        const total = vCount + cCount;
        const vRatio = total ? Math.round((vCount/total)*100) : 0;
        const cRatio = total ? Math.round((cCount/total)*100) : 0;

        const topPhonemes = Object.entries(freqs).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxFreq = topPhonemes.length ? topPhonemes[0][1] : 1;

        return { vRatio, cRatio, topPhonemes, maxFreq, total };
    }, [lexicon, vowels]);


    // Sign up or log into the Cloud network
    const handleAuth = async () => {
        setAuthStatus({ msg: '⏳ Connecting to secure server...', type: 'tx2' });
        try {
            if (authMode === 'signup') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setAuthStatus({ msg: '✅ Account created! You can now sign in.', type: 'ok' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setAuthStatus({ msg: '✅ Signed in successfully!', type: 'ok' });
                setEmail(''); setPassword('');
            }
        } catch (error) {
            setAuthStatus({ msg: `❌ Error: ${error.message}`, type: 'err' });
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            setAuthStatus({ msg: '❌ Please enter your email address.', type: 'err' });
            return;
        }
        setAuthStatus({ msg: '⏳ Sending reset link...', type: 'tx2' });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password'
            });
            if (error) throw error;
            setAuthStatus({ msg: '✅ Reset link sent! Check your inbox.', type: 'ok' });
        } catch (error) {
            setAuthStatus({ msg: `❌ Error: ${error.message}`, type: 'err' });
        }
    };

    const handleSelectProject = async (project) => {
        if (project && project.project_data) {
            // SEC-5: Sanitize cloud data before injecting into stores
            const projectData = await decompressPayloadAsync(project.project_data);
            const safeConfig = sanitizeConfig(projectData.config || {});
            const safeLexicon = sanitizeLexicon(projectData.dictionary || []);
            const safePhrases = sanitizePhrases(projectData.phrases || []);
            
            // Save to local project archive so it persists in the Workspaces tab
            const saveProjectToArchive = useProjectStore.getState().saveProjectToArchive;
            saveProjectToArchive(
                { ...safeConfig, projectId: project.project_id },
                safeLexicon,
                safePhrases
            );

            setLexicon(safeLexicon);
            useLexiconStore.getState().setPhrases(safePhrases);
            setFullConfig({
                ...safeConfig, 
                projectId: project.project_id,
                lastCloudSync: new Date().toISOString()
            });
            
            if (projectData.wiki) {
                updateConfig({ wikiPages: projectData.wiki });
            }

            await saveSyncBase(project.project_id, {
                lexicon: safeLexicon,
                phrases: safePhrases,
                config: safeConfig,
                wiki: projectData.wiki || {}
            });

            setProjectSelectorOpen(false);
            const projectName = safeConfig.conlangName || 'Untitled Project';
            setSyncStatus(`✅ Loaded project: ${projectName}`);
            logActivity(`Pulled project '${projectName}' from cloud.`);
            setTimeout(() => setSyncStatus(''), 3000);
        }
    };

    const handleOAuth = async (provider) => {
        setAuthStatus({ msg: `⏳ Redirecting to ${provider}...`, type: 'tx2' });
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error) {
            setAuthStatus({ msg: `❌ Error: ${error.message}`, type: 'err' });
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    // Use the unified sharing hook
    const { isSharing, isPushing, handleShareLink, handlePushToCloud } = useSharing(session);

    // Retrieve cloud backups and save ALL of them into the local project archive
    const handlePullFromCloud = async () => {
        if (!session) return alert("You must be logged in to pull projects.");
        setSyncStatus('⏳ Fetching cloud projects...');

        try {
            // Fetch from conlangs
            const { data: conlangsData, error: conlangsError } = await supabase
                .from('conlangs')
                .select('project_id, project_data, updated_at')
                .eq('user_id', session.user.id);

            if (conlangsError) throw conlangsError;

            // Fetch from conlang_snapshots
            const { data: snapshotsData, error: snapshotsError } = await supabase
                .from('conlang_snapshots')
                .select('project_id, project_data, created_at')
                .eq('user_id', session.user.id);

            if (snapshotsError) throw snapshotsError;

            const projectMap = new Map();

            // Process conlangs first
            if (conlangsData) {
                for (const p of conlangsData) {
                    projectMap.set(p.project_id, {
                        project_id: p.project_id,
                        project_data: p.project_data,
                        updated_at: p.updated_at
                    });
                }
            }

            // Process snapshots and override if newer or if it doesn't exist in conlangs
            if (snapshotsData) {
                for (const p of snapshotsData) {
                    const existing = projectMap.get(p.project_id);
                    const snapshotTime = p.created_at;
                    
                    if (!existing || !existing.updated_at || new Date(snapshotTime) > new Date(existing.updated_at)) {
                        projectMap.set(p.project_id, {
                            project_id: p.project_id,
                            project_data: p.project_data,
                            updated_at: snapshotTime
                        });
                    }
                }
            }

            const projects = Array.from(projectMap.values());
            
            if (projects.length === 0) {
                setSyncStatus('ℹ️ No projects found in the cloud for your account.');
                setTimeout(() => setSyncStatus(''), 3000);
                return;
            }

            // Save ALL cloud projects to the local archive so they appear in the Workspaces tab
            const saveProjectToArchive = useProjectStore.getState().saveProjectToArchive;
            for (const project of projects) {
                // Ignore projects that were soft-deleted
                const projectData = await decompressPayloadAsync(project.project_data);
                if (projectData && !projectData.deleted) {
                    const safeConfig = sanitizeConfig(projectData.config || {});
                    const safeLexicon = sanitizeLexicon(projectData.dictionary || []);
                    const safePhrases = sanitizePhrases(projectData.phrases || []);
                    saveProjectToArchive(
                        { ...safeConfig, projectId: project.project_id },
                        safeLexicon,
                        safePhrases
                    );
                }
            }

            // Filter the final list shown in the selector
            const activeProjects = [];
            for (const p of projects) {
                const pd = await decompressPayloadAsync(p.project_data);
                if (pd && !pd.deleted) {
                    activeProjects.push(p);
                }
            }

            if (activeProjects.length === 0) {
                setSyncStatus('ℹ️ No active projects found in the cloud for your account.');
                setTimeout(() => setSyncStatus(''), 3000);
                return;
            }

            if (activeProjects.length === 1) {
                // If only one project, load it directly as the active workspace
                handleSelectProject(activeProjects[0]);
            } else {
                setCloudProjects(activeProjects);
                setProjectSelectorOpen(true);
                setSyncStatus(`✅ Pulled ${activeProjects.length} projects from cloud.`); 
                setTimeout(() => setSyncStatus(''), 3000);
            }
        } catch (err) {
            console.error(err);
            setSyncStatus(`❌ Failed to fetch projects: ${err.message}`);
        }
    };


    // Figure out which icon looks best next to the activity timeline text
    const getActivityDetails = (text) => {
        const cleanText = text.replace(/^(✍️|📚|🗑️|⚙️|☁️|🏆|✨)\s*/, '');
        let Icon = Activity;
        if (cleanText.includes('custom glyph')) Icon = PenTool;
        else if (cleanText.includes('Deleted')) Icon = Trash2;
        else if (cleanText.includes('wiki page')) Icon = Library;
        else if (cleanText.includes('Updated')) Icon = Cog;
        else if (cleanText.includes('Pushed')) Icon = CloudUpload;
        else if (cleanText.includes('Pulled')) Icon = CloudDownload;
        else if (cleanText.includes('Unlocked')) Icon = Trophy;
        return { Icon, cleanText };
    };

    const loadVersionHistory = async () => {
        if (!session) return;
        setVersionHistoryOpen(true);
        setLoadingVersions(true);
        try {
            const { data, error } = await supabase
                .from('conlang_versions')
                .select('id, created_at, version_name, project_data')
                .eq('user_id', session.user.id)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setVersions(data || []);
        } catch (err) {
            console.error("Failed to load versions:", err);
            toast.error("Failed to load version history.");
        } finally {
            setLoadingVersions(false);
        }
    };

    const handleRestoreVersion = async (version) => {
        if (!confirm(`Are you sure you want to restore "${version.version_name}"? This will overwrite your current local workspace.`)) return;
        
        toast.loading("Fetching version data...", { id: 'restore-toast' });
        
        try {
            const { data, error } = await supabase
                .from('conlang_versions')
                .select('project_data')
                .eq('id', version.id)
                .maybeSingle();
                
            if (error || !data) throw error;
            
            const projectData = await decompressPayloadAsync(data.project_data);
            const safeConfig = sanitizeConfig(projectData.config || {});
            const safeLexicon = sanitizeLexicon(projectData.dictionary || []);
            const safePhrases = sanitizePhrases(projectData.phrases || []);
            
            setLexicon(safeLexicon);
            setPhrases(safePhrases);
            setFullConfig({ ...safeConfig, projectId: projectId });
            
            if (projectData.wiki) {
                updateConfig({ wikiPages: projectData.wiki });
            }
            
            setVersionHistoryOpen(false);
            logActivity(`Restored past version: ${version.version_name}`);
            toast.success(t('profile.restoreSuccess'), { id: 'restore-toast' });
        } catch (err) {
            console.error(err);
            toast.error(t('profile.restoreError'), { id: 'restore-toast' });
        }
    };

    return (
        <div className="profile-dashboard-layout">

            {/* Social Creator Identity Banner */}
            <Card className="social-hero-card">
                <div className="social-hero-top">
                    <div className="social-hero-identity">
                        <button
                            type="button"
                            className="social-avatar-trigger"
                            onClick={() => setIsCustomizingProfile((v) => !v)}
                            title="Customize Creator Icon or Photo"
                        >
                            <CreatorAvatar avatar={authorAvatar} name={authorName} size={76} />
                            <span className="social-avatar-hover-overlay" aria-hidden="true">
                                <Edit2 size={16} />
                            </span>
                        </button>
                        <div className="social-hero-meta">
                            <div className="social-hero-name-row">
                                <h2 className="social-hero-name">
                                    {authorName && authorName !== 'Author Name'
                                        ? authorName
                                        : (session?.user?.email?.split('@')[0] || 'Creator')}
                                </h2>
                                {pinnedBadgeObj && (
                                    <span className="social-pinned-badge" title={pinnedBadgeObj.desc}>
                                        <pinnedBadgeObj.Icon size={13} />
                                        {t(`profile.badges.${pinnedBadgeObj.id}.name`) || pinnedBadgeObj.name}
                                    </span>
                                )}
                            </div>
                            <p className="social-hero-bio">
                                {authorBio?.trim() || 'Constructed Language Creator · Add a short bio or specialty'}
                            </p>
                            <div className="social-stats-strip">
                                <span><strong>{lexicon.length}</strong> Words</span>
                                <span><strong>{grammarRules.length}</strong> Rules</span>
                                <span><strong>{scriptSystems?.length || 1}</strong> Scripts</span>
                                <span><strong>{configStreak || 0}</strong> Streak</span>
                                <span><strong>{configUnlockedBadges?.length || 0}/{BADGES.length}</strong> Badges</span>
                            </div>
                        </div>
                    </div>

                    <div className="social-hero-actions">
                        <Button
                            variant={isCustomizingProfile ? 'imp' : 'default'}
                            onClick={() => setIsCustomizingProfile((v) => !v)}
                        >
                            <div className="btn-content"><Edit2 size={14} /> Customize</div>
                        </Button>
                        <Button variant="default" onClick={() => navigate('/explore')}>
                            <div className="btn-content"><Globe size={14} /> Explore</div>
                        </Button>
                    </div>
                </div>

                {isCustomizingProfile && (
                    <div className="social-customizer-panel">
                        <div className="social-customizer-row">
                            <div className="social-customizer-col">
                                <label className="form-label">Creator Picture or Icon</label>
                                <div className="social-upload-row">
                                    <label className="social-upload-btn">
                                        <Upload size={14} /> Upload Photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarImageUpload}
                                        />
                                    </label>
                                    {authorAvatar?.type === 'image' && (
                                        <button
                                            type="button"
                                            className="btn-link"
                                            onClick={() => handleAvatarChange({ ...(authorAvatar || {}), type: 'icon', imageData: '' })}
                                        >
                                            <RotateCcw size={13} /> Use Icon Instead
                                        </button>
                                    )}
                                </div>

                                <div className="avatar-icon-grid">
                                    {CREATOR_AVATAR_ICONS.map((item) => {
                                        const isActive = authorAvatar?.type !== 'image' && (authorAvatar?.icon || 'User') === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`avatar-icon-option ${isActive ? 'active' : ''}`}
                                                onClick={() => handleAvatarChange({ ...(authorAvatar || {}), type: 'icon', icon: item.id })}
                                                title={item.label}
                                            >
                                                <item.Icon size={16} />
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="avatar-color-row">
                                    {CREATOR_AVATAR_COLORS.map((hex) => {
                                        const isActive = (authorAvatar?.color || '#6366f1') === hex;
                                        return (
                                            <button
                                                key={hex}
                                                type="button"
                                                className={`avatar-color-swatch ${isActive ? 'active' : ''}`}
                                                style={{ background: hex }}
                                                onClick={() => handleAvatarChange({ ...(authorAvatar || {}), type: 'icon', color: hex })}
                                                aria-label={`Select color ${hex}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="social-customizer-col">
                                <Input
                                    label="Creator Bio / Specialty"
                                    value={authorBio || ''}
                                    maxLength={140}
                                    onChange={(e) => updateConfig({ authorBio: e.target.value })}
                                    onBlur={() => syncAuthProfileMetadata({ authorBio })}
                                    placeholder="e.g. Worldbuilder, polysynthetic & featural script creator"
                                />

                                <div style={{ marginTop: '10px' }}>
                                    <label className="form-label">Pinned Showcase Achievement</label>
                                    <select
                                        className="fi custom-select"
                                        value={authorBadge || ''}
                                        onChange={(e) => {
                                            const nextBadge = e.target.value;
                                            updateConfig({ authorBadge: nextBadge });
                                            syncAuthProfileMetadata({ authorBadge: nextBadge });
                                        }}
                                    >
                                        <option value="">None (No pinned badge)</option>
                                        {BADGES.filter((b) => configUnlockedBadges?.includes(b.id)).map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {t(`profile.badges.${b.id}.name`) || b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {session && (
                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="save"
                                            disabled={isSyncingProfileMeta}
                                            onClick={async () => {
                                                await syncAuthProfileMetadata();
                                                toast.success('Social profile synced to account!');
                                            }}
                                        >
                                            <div className="btn-content">
                                                <RefreshCw size={13} className={isSyncingProfileMeta ? 'animate-spin' : ''} />
                                                {isSyncingProfileMeta ? ' Syncing...' : ' Save Profile'}
                                            </div>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
            
            <Card className="account-status-card">
                <div className="account-header">
                    <div>
                        <h2 className="account-title">
                            <User /> {session ? t('profile.accountStatus') : t('profile.signInRegister')}
                        </h2>
                        <div className="account-subtitle">
                            {session ? `${t('profile.loggedInAs')} ${authorName !== 'Author Name' ? authorName : session.user.email}` : t('profile.localWorkspace')}
                        </div>
                    </div>
                    
                    <div className="account-actions">
                        {session ? (
                            <>
                                <Button variant="save" className="share-btn" onClick={handleShareLink} title={t('profile.copyPublicLink')} disabled={isSharing}>
                                    <div className="btn-content">
                                        <Share2 size={16} className={isSharing ? 'animate-spin' : ''}/> 
                                        {isSharing ? ` ${t('profile.generating')}` : ` ${t('profile.shareLink')}`}
                                    </div>
                                </Button>
                                {isProActive && (
                                    <>
                                        <Button variant="default" className="push-btn" onClick={() => handlePushToCloud(true)} disabled={isPushing}>
                                            <div className="btn-content">
                                                <CloudUpload size={16} className={isPushing ? 'animate-spin' : ''}/> 
                                                {isPushing ? ` ${t('profile.pushing') || 'Pushing...'}` : ` ${t('profile.pushToCloud')}`}
                                            </div>
                                        </Button>
                                        <Button variant="default" className="pull-btn" onClick={handlePullFromCloud}>
                                            <div className="btn-content"><CloudDownload size={16}/> {t('profile.pullFromCloud')}</div>
                                        </Button>
                                        <Button variant="default" onClick={loadVersionHistory}>
                                            <div className="btn-content"><History size={16}/> {t('profile.versionHistory')}</div>
                                        </Button>
                                    </>
                                )}

                                <Button variant="error" className="signout-btn" onClick={handleLogout}>
                                    <div className="btn-content"><LogOut size={16}/> {t('profile.signOut')}</div>
                                </Button>
                            </>
                        ) : (
                            <div className="login-form">
                                {authMode === 'forgot' ? (
                                    <>
                                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('profile.resetEmailPlaceholder')} className="login-input" />
                                        <Button variant="imp" onClick={handleResetPassword}>{t('profile.sendResetLink')}</Button>
                                        <Button variant="default" onClick={() => { setAuthMode('login'); setAuthStatus({msg:'', type:''}); }}>{t('profile.backToLogin')}</Button>
                                    </>
                                ) : (
                                    <>
                                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('profile.email')} className="login-input" />
                                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('profile.password')} className="login-input" />
                                        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: '8px' }}>
                                            <span 
                                                className="forgot-password-link"
                                                style={{ fontSize: '0.75rem', color: 'var(--tx3)', cursor: 'pointer', opacity: 0.8 }}
                                                onClick={() => { setAuthMode('forgot'); setAuthStatus({msg:'', type:''}); }}
                                                onMouseEnter={(e) => e.target.style.color = 'var(--acc)'}
                                                onMouseLeave={(e) => e.target.style.color = 'var(--tx3)'}
                                            >
                                                {t('profile.forgotPassword')}
                                            </span>
                                        </div>
                                        <Button variant="imp" onClick={() => { setAuthMode('login'); handleAuth(); }}>{t('profile.login')}</Button>
                                        <Button variant="default" onClick={() => { setAuthMode('signup'); handleAuth(); }}>{t('profile.signUp')}</Button>
                                        <div className="login-divider">{t('profile.orContinueWith')}</div>
                                        <div className="social-row">
                                            <Button variant="default" className="social-btn" onClick={() => handleOAuth('google')} title="Google"><Globe size={18} /></Button>
                                            <Button variant="default" className="social-btn" onClick={() => handleOAuth('github')} title="GitHub"><GitBranch size={18} /></Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {authStatus.msg && <div className={`auth-status-msg text-${authStatus.type}`}>{authStatus.msg}</div>}
                {syncStatus && <div className={`auth-status-msg ${syncStatus.includes('❌') ? 'text-err' : 'text-tx'}`}>{syncStatus}</div>}
            </Card>

            {/* Profile Settings Card — Author Name & Email */}
            <Card className="profile-settings-card">
                <h3 className="section-title mb-20"><Edit2 /> {t('profile.profileSettings')}</h3>
                <div className="profile-settings-grid">
                    <div>
                        <Input
                            label={t('profile.displayName')}
                            value={authorName || ''}
                            onChange={(e) => updateConfig({ authorName: e.target.value })}
                            placeholder={t('profile.displayNamePlaceholder')}
                        />
                        <p className="profile-settings-hint">{t('profile.displayNameHint')}</p>
                    </div>
                    {session && isProActive && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--tx)', fontWeight: 'bold' }}><RefreshCw size={14} style={{ marginRight: '6px', position: 'relative', top: '2px' }}/> {t('profile.autoSync')}</label>
                                <div 
                                    style={{ 
                                        width: '40px', height: '22px', borderRadius: '20px', background: isAutoSyncEnabled ? 'var(--acc)' : 'var(--s3)', 
                                        position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease' 
                                    }}
                                    onClick={async () => {
                                        const nextVal = !isAutoSyncEnabled;
                                        updateConfig({ isAutoSyncEnabled: nextVal });
                                        if (session?.user?.id) {
                                            try {
                                                await supabase.from('profiles').update({ live_auto_sync: nextVal }).eq('id', session.user.id);
                                                if (nextVal) {
                                                    // Immediately push latest state so cloud is guaranteed fresh
                                                    await handlePushToCloud(false);
                                                }
                                                await broadcastAutoSyncToggle({
                                                    userId: session.user.id,
                                                    enabled: nextVal,
                                                    activeProjectId: projectId
                                                });
                                                if (nextVal) {
                                                    toast.success(t('sync.status.autoLiveOn') || "Live Auto-Sync Active across devices");
                                                } else {
                                                    toast.success(t('sync.status.autoLiveOff') || "Auto-Sync Paused");
                                                }
                                            } catch (e) {
                                                console.warn("Could not sync live_auto_sync to profile:", e);
                                            }
                                        }
                                    }}
                                >
                                    <div style={{
                                        width: '18px', height: '18px', background: '#fff', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: isAutoSyncEnabled ? '20px' : '2px',
                                        transition: 'left 0.3s ease'
                                    }}/>
                                </div>
                            </div>
                            <p className="profile-settings-hint">{t('profile.autoSyncHint')}</p>
                        </div>
                    )}
                    {session && (
                        <div>
                            <div className="profile-toggle-row">
                                <label htmlFor="sync-review-toggle" className="profile-toggle-label">
                                    <GitMerge size={14} style={{ marginRight: '6px', position: 'relative', top: '2px' }}/> {t('profile.syncReview') || 'Review sync changes'}
                                </label>
                                <button
                                    id="sync-review-toggle"
                                    type="button"
                                    role="switch"
                                    aria-checked={showSyncReview}
                                    className={`profile-switch ${showSyncReview ? 'is-on' : ''}`}
                                    onClick={toggleSyncReview}
                                >
                                    <span className="profile-switch-knob" />
                                </button>
                            </div>
                            <p className="profile-settings-hint">
                                {t('profile.syncReviewHint') || 'Show the Sync & Merge review when another device changed this language. When off, clean merges apply automatically; real conflicts are still shown.'}
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {!isProActive && (
                <Card>
                    <div className="free-tier-wrapper">
                        <div className="free-tier-icon">
                            <Sparkles size={32} />
                        </div>
                        <div className="free-tier-content">
                            <h3 className="free-tier-title">{t('profile.liveTitle')}</h3>
                            <p className="free-tier-desc">
                                {t('profile.liveDesc')}
                            </p>
                            <div className="free-tier-actions">
                                <div className="paypal-integration-area">
                                    <PayPalButton />
                                </div>

                                <div className="alt-support-divider">{t('profile.altSupport')}</div>
                                <div className="alt-support-row">
                                    <Button variant="default" className="support-btn" onClick={() => window.open('https://patreon.com/kaitosz', '_blank', 'noopener,noreferrer')}>
                                        <div className="btn-content"><Heart size={14}/> Patreon</div>
                                    </Button>
                                    <Button variant="default" className="support-alt" onClick={() => window.open('https://ko-fi.com/kaitosz', '_blank', 'noopener,noreferrer')}>
                                        <div className="btn-content"><Coffee size={14}/> Ko-fi</div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <h3 className="section-title mt-10 mb-5"><Activity /> {t('profile.analyticsTitle')}</h3>
            <div className="glass-dashboard">
                <div className="analytics-grid" style={{ marginBottom: 0 }}>
                    <div className="glass-card"><div className="analytics-label">{t('profile.totalLexicon')}</div><div className="analytics-value">{analytics.totalWords}</div><div className="analytics-desc">{t('profile.totalLexiconDesc')}</div></div>
                    <div className="glass-card"><div className="analytics-label">{t('profile.studyStreak')}</div><div className="analytics-value val-blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>{configStreak} <Flame size={32} color="var(--acc)" /></div><div className="analytics-desc">{t('profile.streakDesc')}</div></div>
                    <div className="glass-card"><div className="analytics-label">{t('profile.topWordClass')}</div><div className="analytics-value val-green capitalize">{analytics.topClass}</div><div className="analytics-desc">{t('profile.topWordClassDesc')}</div></div>
                    <div className="glass-card"><div className="analytics-label">{t('profile.ipaCoverage')}</div><div className="analytics-value val-orange">{analytics.ipaCoverage}%</div><div className="analytics-desc">{t('profile.ipaCoverageDesc')}</div></div>
                </div>
            </div>

            <h3 className="section-title mt-10 mb-5"><PieChart /> {t('profile.phonotacticsTitle')}</h3>
            <div className="phonotactics-grid">
                <Card className="card-no-margin">
                    <h4 className="chart-title">{t('profile.soundDist')}</h4>
                    {phonotactics.total > 0 ? (
                        <>
                            <div className="dist-bar-wrapper">
                                {phonotactics.cRatio > 0 && <div className="dist-bar cons-bar" style={{ width: `${phonotactics.cRatio}%` }}>{phonotactics.cRatio}% C</div>}
                                {phonotactics.vRatio > 0 && <div className="dist-bar vow-bar" style={{ width: `${phonotactics.vRatio}%` }}>{phonotactics.vRatio}% V</div>}
                            </div>
                            <div className="chart-subtitle">{t('profile.soundDistSubtitle')}</div>
                        </>
                    ) : (
                        <div className="chart-empty">{t('profile.awaitingData')}</div>
                    )}
                </Card>

                <Card className="card-no-margin">
                    <h4 className="chart-title">{t('profile.mostUsedPhonemes')}</h4>
                    {phonotactics.total > 0 ? (
                        <div>
                            {phonotactics.topPhonemes.map(([char, count]) => (
                                <div key={char} className="phoneme-row">
                                    <div className="custom-font-text notranslate phoneme-symbol">{transliterate(char)}</div>
                                    <div className="phoneme-track"><div className="phoneme-fill" style={{ width: `${(count / phonotactics.maxFreq) * 100}%` }}></div></div>
                                    <div className="phoneme-count">{count}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="chart-empty">{t('profile.awaitingData')}</div>
                    )}
                </Card>
            </div>

            <div className="profile-dashboard-grid">
                <Card className="card-no-margin">
                    <h3 className="section-title mb-20"><Activity /> {t('profile.recentActivity')}</h3>
                    <div className="activity-timeline">
                        {(!activity || activity.filter(a => !a.text.includes('isProActive')).length === 0) ? (
                            <div className="activity-empty">{t('profile.noActivity')}</div>
                        ) : (
                            activity.filter(a => !a.text.includes('isProActive')).map((item, idx) => {
                                const date = new Date(item.time);
                                const { Icon, cleanText } = getActivityDetails(item.text);
                                return (
                                    <div key={idx} className="activity-item">
                                        <div className="activity-icon-wrapper">
                                            <Icon size={14} />
                                        </div>
                                        <p className="activity-text">{cleanText}</p>
                                        <span className="activity-date">
                                            {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </Card>

                <Card className="card-no-margin">
                    <h3 className="section-title mb-20"><Trophy /> {t('profile.achievements')}</h3>
                    <div className="badges-grid">
                        {BADGES.map(badge => {
                            const isUnlocked = configUnlockedBadges?.includes(badge.id);
                            const badgeName = t(`profile.badges.${badge.id}.name`) || badge.name;
                            const badgeDesc = t(`profile.badges.${badge.id}.desc`) || badge.desc;
                            return (
                                <div key={badge.id} className={`badge-item ${isUnlocked ? 'unlocked' : ''}`} title={`${badgeName}: ${badgeDesc}`}>
                                    <span className="badge-icon-wrapper"><badge.Icon size={28} /></span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <Modal isOpen={isProjectSelectorOpen} onClose={() => setProjectSelectorOpen(false)} title={t('profile.selectProjectTitle')}>
                <div className="project-selector-list">
                    {cloudProjects.map(p => (
                        <div
                            key={p.project_id}
                            className="project-selector-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectProject(p)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelectProject(p); } }}
                        >
                            <h4>{p.project_data.config?.conlangName || t('profile.untitledProject')}</h4>
                            <p>{p.project_data.wordCount !== undefined ? p.project_data.wordCount : (p.project_data.dictionary || []).length} {t('profile.words')}</p>
                            <span className="project-selector-id">ID: {p.project_id}</span>
                        </div>
                    ))}
                </div>
            </Modal>
            
            {/* Version History Modal */}
            <Modal isOpen={isVersionHistoryOpen} onClose={() => setVersionHistoryOpen(false)} title={t('profile.versionHistoryTitle')}>
                <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loadingVersions ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.loadingVersions')}</p>
                    ) : versions.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.noVersions')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {versions.map(v => (
                                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--s1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', color: 'var(--tx)' }}>{v.version_name}</h4>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--tx2)' }}>
                                            {new Date(v.created_at).toLocaleString()} • {v.project_data?.wordCount !== undefined ? v.project_data.wordCount : (Array.isArray(v.project_data?.dictionary) ? v.project_data.dictionary.length : 0)} {t('profile.words')}
                                        </div>
                                    </div>
                                    <Button variant="default" onClick={() => handleRestoreVersion(v)} style={{ padding: '6px 12px' }}>
                                        <div className="btn-content"><RotateCcw size={14}/> {t('profile.restore')}</div>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
            
        </div>
    );
}
