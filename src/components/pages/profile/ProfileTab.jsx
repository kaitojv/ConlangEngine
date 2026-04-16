import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useProjectStore } from '@/store/useProjectStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { CloudUpload, CloudDownload, Trophy, Activity, User, LogOut, Mail, Lock, Globe, MessageCircle, BookOpen, Crown, Cog, Puzzle, Tags, Flame, GitBranch, Share2, Heart, Coffee, PieChart, Sparkles, Book, Library, BrainCircuit, ScrollText, Network, Ear, ArrowLeftRight, Layers, Volume2, PenTool, Shapes, Download, Trash2 } from 'lucide-react';
import './profileTab.css';

// Initialize Supabase
const SUPABASE_URL = 'https://hgeuyvgjhonklflcdinj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Ye_8zJGOXQBma3O3TMHDaA_Nr0eCYIy';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    { id: 'patron', name: 'Patron', desc: 'Upgrade to Conlang Engine LIVE.', Icon: Heart },
];

export default function ProfileTab() {
    const config = useConfigStore();
    const localProjects = useProjectStore(state => state.localProjects);
    const { transliterate } = useTransliterator();
    
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const setLexicon = useLexiconStore((state) => state.setLexicon);
    // Failsafe for corrupted local storage from the previous project-switching bug
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);

    const [session, setSession] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authStatus, setAuthStatus] = useState({ msg: '', type: '' });
    const [syncStatus, setSyncStatus] = useState('');

    // 1. Session Management
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
        return () => subscription.unsubscribe();
    }, []);

    // 2. Gamification Checker
    useEffect(() => {
        const unlock = (id, name) => {
            if (!config.unlockedBadges?.includes(id)) {
                config.unlockBadge(id, name);
                config.logActivity(`Unlocked achievement: ${name}!`);
            }
        };

        const wordCount = lexicon.length;
        if (wordCount >= 1) unlock('first_word', 'First Word');
        if (wordCount >= 50) unlock('polyglot', 'Polyglot');
        if (wordCount >= 200) unlock('lexicographer', 'Lexicographer');
        if (wordCount >= 1000) unlock('master_linguist', 'Master Linguist');

        if (config.grammarRules?.length >= 1) unlock('grammarian', 'Grammarian');
        if (config.grammarRules?.length >= 5) unlock('morphologist', 'Morphologist');

        const uniqueTags = new Set(lexicon.flatMap(w => w.tags || [])).size;
        if (uniqueTags >= 10) unlock('semanticist', 'Semanticist');
        
        if (config.streak >= 10) unlock('native_speaker', 'Native Speaker');
        if (Object.keys(config.wikiPages || {}).length > 1) unlock('lore_keeper', 'Lore Keeper');
        if (config.syntaxOrder !== 'SVO') unlock('syntactician', 'Syntactician');
        if (localProjects.length > 1) unlock('multiverse', 'Multiverse');
        if (config.phonologyTypes !== 'alphabetic') unlock('typologist', 'Typologist');
        if (config.customFont || Object.keys(config.customGlyphs || {}).length > 0) unlock('calligrapher', 'Calligrapher');
    }, [lexicon, config.grammarRules, config.streak]);

    // 3. Analytics Calculation
    const analytics = useMemo(() => {
        const totalWords = lexicon.length;
        const uniqueTags = new Set(lexicon.flatMap(w => w.tags || [])).size;
        const wordsWithIpa = lexicon.filter(w => w.ipa && w.ipa.trim() !== "").length;
        const ipaCoverage = totalWords > 0 ? Math.round((wordsWithIpa / totalWords) * 100) : 0;

        let topClass = "N/A";
        let maxCount = 0;
        const classCounts = {};
        lexicon.forEach(w => {
            if (w.wordClass) classCounts[w.wordClass] = (classCounts[w.wordClass] || 0) + 1;
        });
        for (const [cls, count] of Object.entries(classCounts)) {
            if (count > maxCount) { maxCount = count; topClass = cls; }
        }

        return { totalWords, uniqueTags, ipaCoverage, topClass };
    }, [lexicon]);

    // Phonotactics Calculator
    const phonotactics = useMemo(() => {
        const text = lexicon.map(w => w.word.replace(/\*/g, '').toLowerCase()).join('');
        const vowelsList = (config.vowels || "a,e,i,o,u").split(',').map(v => v.split('=')[0].trim().toLowerCase());
        let vCount = 0; let cCount = 0; const freqs = {};

        for (const char of text) {
            if (char.match(/[a-z]/i)) { 
                if (vowelsList.includes(char)) vCount++;
                else cCount++;
                freqs[char] = (freqs[char] || 0) + 1;
            }
        }
        const total = vCount + cCount;
        const vRatio = total ? Math.round((vCount/total)*100) : 0;
        const cRatio = total ? Math.round((cCount/total)*100) : 0;

        const topPhonemes = Object.entries(freqs).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const maxFreq = topPhonemes.length ? topPhonemes[0][1] : 1;

        return { vRatio, cRatio, topPhonemes, maxFreq, total };
    }, [lexicon, config.vowels]);


    // 4. Handlers
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

    const handlePushToCloud = async () => {
        if (!session) return alert("You must be logged in to sync!");
        setSyncStatus('⏳ Pushing to cloud...');

        let currentProjectId = config.projectId;
        if (!currentProjectId) {
            currentProjectId = 'proj_' + Date.now();
            config.updateConfig({ projectId: currentProjectId });
        }

        const payload = { dictionary: lexicon, config: config, wiki: config.wikiPages || {} };
        
        try {
            const { error } = await supabase.from('conlangs').upsert({ 
                user_id: session.user.id, 
                project_id: currentProjectId, 
                project_data: payload 
            }, { onConflict: 'project_id' });

            if (error) throw error;
            setSyncStatus('✅ Cloud Sync Complete!');
            config.logActivity('Pushed dictionary to the cloud.');
            setTimeout(() => setSyncStatus(''), 3000);
        } catch (err) {
            console.error(err);
            setSyncStatus(`❌ Sync failed: ${err.message}`);
        }
    };

    const handlePullFromCloud = async () => {
        if (!session || !config.projectId) return alert("No active cloud project found to pull from.");
        setSyncStatus('⏳ Pulling from cloud...');

        try {
            const { data, error } = await supabase.from('conlangs').select('project_data').eq('project_id', config.projectId).single();
            if (error) throw error;
            
            if (data && data.project_data) {
                setLexicon(data.project_data.dictionary || []);
                config.updateConfig(data.project_data.config || {});
                setSyncStatus('✅ Data pulled successfully!');
                config.logActivity('Pulled latest dictionary from cloud.');
                setTimeout(() => setSyncStatus(''), 3000);
            }
        } catch (err) {
            console.error(err);
            setSyncStatus(`❌ Pull failed: ${err.message}`);
        }
    };

    const handleShareLink = async () => {
        if (!session) return alert("You must be logged in and push to cloud first to generate a link!");
        if (!config.projectId) return alert("Please push to cloud first to generate a link!");
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?view=${config.projectId}`;
        try {
            await navigator.clipboard.writeText(shareUrl);
            alert("🔗 Public Link Copied to Clipboard!");
        } catch (err) {
            alert("❌ Failed to copy link.");
        }
    };

    const getActivityDetails = (text) => {
        // Strip old legacy emojis from existing local storage entries
        let cleanText = text.replace(/^(✍️|📚|🗑️|⚙️|☁️|🏆|✨)\s*/, '');
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

    return (
        <div className="profile-dashboard-layout">
            
            {/* Account Status Card */}
            <Card className="account-status-card">
                <div className="account-header">
                    <div>
                        <h2 className="account-title">
                            <User /> {session ? 'Account Status' : 'Sign In / Register'}
                        </h2>
                        <div className="account-subtitle">
                            {session ? `Logged in as: ${config.authorName !== 'Author Name' ? config.authorName : session.user.email}` : 'Local Workspace (Not Signed In)'}
                        </div>
                    </div>
                    
                    {session ? (
                        <div className="account-actions">
                            <Button variant="imp" style={{ background: 'var(--acc)', borderColor: 'var(--acc)' }} onClick={handleShareLink} title="Copy Public Link">
                                <div className="btn-content"><Share2 size={16}/> Share Link</div>
                            </Button>
                            <Button variant="save" onClick={handlePushToCloud}>
                                <div className="btn-content"><CloudUpload size={16}/> Push to Cloud</div>
                            </Button>
                            <Button variant="edit" onClick={handlePullFromCloud}>
                                <div className="btn-content"><CloudDownload size={16}/> Pull from Cloud</div>
                            </Button>
                            <Button variant="cancel" style={{ borderColor: 'var(--err)', color: 'var(--err)' }} onClick={handleLogout}>
                                <div className="btn-content"><LogOut size={16}/> Sign Out</div>
                            </Button>
                        </div>
                    ) : (
                        <div className="login-form">
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="login-input" />
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="login-input" />
                            <Button variant="imp" onClick={() => { setAuthMode('login'); handleAuth(); }}>Login</Button>
                            <Button variant="default" onClick={() => { setAuthMode('signup'); handleAuth(); }}>Sign Up</Button>
                            <div className="login-divider">— OR CONTINUE WITH —</div>
                            <div className="social-row">
                                <Button variant="default" style={{ flex: 1, background: 'var(--s1)' }} onClick={() => handleOAuth('google')} title="Google"><Globe size={18} /></Button>
                                <Button variant="default" style={{ flex: 1, background: 'var(--s1)' }} onClick={() => handleOAuth('github')} title="GitHub"><GitBranch size={18} /></Button>
                            </div>
                        </div>
                    )}
                </div>
                {authStatus.msg && <div className={`auth-status-msg text-${authStatus.type}`}>{authStatus.msg}</div>}
                {syncStatus && <div className={`auth-status-msg ${syncStatus.includes('❌') ? 'text-err' : 'text-tx'}`}>{syncStatus}</div>}
            </Card>

            {/* Free Tier Banner */}
            {!config.isProActive && (
                <Card>
                    <div className="free-tier-wrapper">
                        <div className="free-tier-icon">
                            <Sparkles size={32} />
                        </div>
                        <div className="free-tier-content">
                            <h3 className="free-tier-title">Conlang Engine LIVE</h3>
                            <p className="free-tier-desc">
                                Support the project to unlock <b>Cloud Sync</b> and <b>Unlimited Workspaces</b>.
                            </p>
                            <div className="free-tier-actions">
                                <Button variant="default" style={{ flex: 1, background: 'var(--s1)', padding: '12px 20px' }} onClick={() => window.open('https://patreon.com', '_blank')}>
                                    <div className="btn-content"><Heart size={14}/> Support on Patreon</div>
                                </Button>
                                <Button variant="default" style={{ flex: 1, background: 'var(--s1)', padding: '12px 20px' }} onClick={() => window.open('https://ko-fi.com/kaitosz', '_blank')}>
                                    <div className="btn-content"><Coffee size={14}/> Support on Ko-fi</div>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <h3 className="section-title mt-10 mb-5">📊 Language Analytics</h3>
            <div className="analytics-grid">
                <div className="analytics-card"><div className="analytics-label">Total Lexicon</div><div className="analytics-value">{analytics.totalWords}</div><div className="analytics-desc">Roots & derivations</div></div>
                <div className="analytics-card"><div className="analytics-label">Semantic Tags</div><div className="analytics-value val-blue">{analytics.uniqueTags}</div><div className="analytics-desc">Unique categories</div></div>
                <div className="analytics-card"><div className="analytics-label">Top Word Class</div><div className="analytics-value val-green capitalize">{analytics.topClass}</div><div className="analytics-desc">Dominant POS</div></div>
                <div className="analytics-card"><div className="analytics-label">Phonetic Coverage</div><div className="analytics-value val-orange">{analytics.ipaCoverage}%</div><div className="analytics-desc">Words with IPA</div></div>
            </div>

            <h3 className="section-title mt-10 mb-5"><PieChart /> Phonotactics Lab</h3>
            <div className="phonotactics-grid">
                <Card className="card-no-margin">
                    <h4 className="chart-title">Sound Distribution</h4>
                    {phonotactics.total > 0 ? (
                        <>
                            <div className="dist-bar-wrapper">
                                {phonotactics.cRatio > 0 && <div className="dist-bar cons-bar" style={{ width: `${phonotactics.cRatio}%` }}>{phonotactics.cRatio}% C</div>}
                                {phonotactics.vRatio > 0 && <div className="dist-bar vow-bar" style={{ width: `${phonotactics.vRatio}%` }}>{phonotactics.vRatio}% V</div>}
                            </div>
                            <div className="chart-subtitle">Consonants vs Vowels</div>
                        </>
                    ) : (
                        <div className="chart-empty">Awaiting dictionary data...</div>
                    )}
                </Card>

                <Card className="card-no-margin">
                    <h4 className="chart-title">Most Used Phonemes</h4>
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
                        <div className="chart-empty">Awaiting dictionary data...</div>
                    )}
                </Card>
            </div>

            <div className="profile-dashboard-grid">
                <Card className="card-no-margin">
                    <h3 className="section-title mb-20"><Activity /> Recent Activity</h3>
                    <div className="activity-timeline">
                        {(!config.activity || config.activity.length === 0) ? (
                            <div className="activity-empty">No activity yet. Start building!</div>
                        ) : (
                            config.activity.map((item, idx) => {
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
                    <h3 className="section-title mb-20"><Trophy /> Achievements</h3>
                    <div className="badges-grid">
                        {BADGES.map(badge => {
                            const isUnlocked = config.unlockedBadges?.includes(badge.id);
                            return (
                                <div key={badge.id} className={`badge-item ${isUnlocked ? 'unlocked' : ''}`} title={`${badge.name}: ${badge.desc}`}>
                                    <span className="badge-icon-wrapper"><badge.Icon size={28} /></span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
}
