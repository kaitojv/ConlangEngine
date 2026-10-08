import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { resolveWordScriptId } from '@/utils/scriptResolver.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';

import { Sunrise, Sun, Moon, Sparkles, Settings2, BookA, PlusCircle, BrainCircuit, Flame, ArrowRight, Bookmark, Library, HelpCircle, Heart, Coffee, Globe, Activity, FlaskConical } from 'lucide-react';
import Card from '@/components/UI/Card/Card.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import HealthCheckModal from './HealthCheckModal.jsx';
import './home.css';

const RollingNumber = ({ endValue, duration = 2000 }) => {
    const [value, setValue] = React.useState(0);

    React.useEffect(() => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // easeOutExpo curve for smooth slow down at the end
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            setValue(Math.floor(easeProgress * endValue));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [endValue, duration]);

    return <>{value.toLocaleString()}</>;
};


export default function Home() {
    const authorName = useConfigStore((state) => state.authorName) || "Creator";
    const streak = useConfigStore((state) => state.streak) || 0;
    const lastStudyDate = useConfigStore((state) => state.lastStudyDate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const isFeaturalBlock = phonologyTypes === 'featural_block';
    const { transliterate } = useTransliterator();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [greeting, setGreeting] = useState({
        baseKey: "home.greetings.afternoon",
        phraseKey: "home.greetings.afternoon1",
        Icon: Sun
    });

    const [stats, setStats] = useState({ languages: 0, words: 0, conlangers: 0, loading: true });
    const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch profiles count for total registered conlangers
                const { count: conlangersCount, error: err1 } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });
                
                // Fetch snapshots data to count languages and words without downloading the massive payloads
                const { data: snapshotsData, error: err2 } = await supabase
                    .from('conlang_snapshots')
                    .select('user_id, wordCount:project_data->wordCount');

                // Fetch active conlangers count as a fallback (since profiles has RLS restriction)
                const { data: conlangsData, error: err3 } = await supabase
                    .from('conlangs')
                    .select('user_id');
                    
                if (err1) console.warn("Could not fetch profiles count:", err1);
                if (err2) throw err2;
                if (err3) console.warn("Could not fetch conlangs for user count:", err3);
                
                let wordsCount = 0;
                let languagesCount = snapshotsData ? snapshotsData.length : 0;
                
                if (snapshotsData) {
                    snapshotsData.forEach(snapshot => {
                        if (snapshot.wordCount !== undefined && snapshot.wordCount !== null) {
                            wordsCount += Number(snapshot.wordCount);
                        }
                    });
                }

                let uniqueUsersCount = 0;
                if (conlangsData) {
                    uniqueUsersCount = new Set(conlangsData.map(c => c.user_id)).size;
                } else if (snapshotsData) {
                    uniqueUsersCount = new Set(snapshotsData.map(s => s.user_id)).size;
                }
                
                setStats({
                    languages: languagesCount,
                    words: wordsCount,
                    conlangers: Math.max(conlangersCount || 0, uniqueUsersCount, 1),
                    loading: false
                });
            } catch (err) {
                console.error("Error fetching global stats:", err);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };
        fetchStats();
    }, []);

    React.useEffect(() => {
        const now = new Date();
        const hour = now.getHours();
        const dayOfWeek = now.getDay();
        const month = now.getMonth();
        const date = now.getDate();
        
        const greetings = {
            morning: {
                baseKey: "home.greetings.morning",
                phraseKeys: [
                    "home.greetings.morning1", 
                    "home.greetings.morning2", 
                    "home.greetings.morning3"
                ],
                Icon: Sunrise
            },
            afternoon: {
                baseKey: "home.greetings.afternoon",
                phraseKeys: [
                    "home.greetings.afternoon1", 
                    "home.greetings.afternoon2", 
                    "home.greetings.afternoon3"
                ],
                Icon: Sun
            },
            evening: {
                baseKey: "home.greetings.evening",
                phraseKeys: [
                    "home.greetings.evening1", 
                    "home.greetings.evening2", 
                    "home.greetings.evening3"
                ],
                Icon: Moon
            },
            night: {
                baseKey: "home.greetings.night",
                phraseKeys: [
                    "home.greetings.night1", 
                    "home.greetings.night2", 
                    "home.greetings.night3"
                ],
                Icon: Sparkles
            }
        };

        let timeOfDay = 'night';
        if (hour >= 5 && hour < 12) timeOfDay = 'morning';
        else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
        else if (hour >= 18 && hour < 22) timeOfDay = 'evening';

        const selected = { ...greetings[timeOfDay] };
        selected.phraseKeys = [...selected.phraseKeys];

        // Day of week special phrases
        if (dayOfWeek === 1) { // Monday
            selected.phraseKeys.push("home.greetings.monday1", "home.greetings.monday2");
        } else if (dayOfWeek === 3) { // Wednesday
            selected.phraseKeys.push("home.greetings.wednesday");
        } else if (dayOfWeek === 5) { // Friday
            selected.phraseKeys.push("home.greetings.friday1", "home.greetings.friday2");
        } else if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
            selected.phraseKeys.push("home.greetings.weekend1", "home.greetings.weekend2");
        }

        // Holidays (Overrides base greeting and limits phrases to festive ones)
        if (month === 0 && date === 1) { // Jan 1
            selected.baseKey = "home.greetings.newYear";
            selected.phraseKeys = ["home.greetings.newYear1", "home.greetings.newYear2", "home.greetings.newYear3"];
            selected.Icon = Sparkles;
        } else if (month === 1 && date === 14) { // Feb 14
            selected.baseKey = "home.greetings.valentines";
            selected.phraseKeys = ["home.greetings.valentines1", "home.greetings.valentines2", "home.greetings.valentines3"];
            selected.Icon = Heart;
        } else if (month === 4 && date === 4) { // May 4
            selected.baseKey = "home.greetings.may4th";
            selected.phraseKeys = ["home.greetings.may4th1", "home.greetings.may4th2", "home.greetings.may4th3"];
            selected.Icon = Sparkles;
        } else if (month === 9 && date === 31) { // Oct 31
            selected.baseKey = "home.greetings.halloween";
            selected.phraseKeys = ["home.greetings.halloween1", "home.greetings.halloween2", "home.greetings.halloween3"];
            selected.Icon = Flame;
        } else if (month === 11 && date === 25) { // Dec 25
            selected.baseKey = "home.greetings.christmas";
            selected.phraseKeys = ["home.greetings.christmas1", "home.greetings.christmas2", "home.greetings.christmas3"];
            selected.Icon = Sparkles;
        } else if (month === 11 && date === 31) { // Dec 31
            selected.baseKey = "home.greetings.newYearsEve";
            selected.phraseKeys = ["home.greetings.newYearsEve1", "home.greetings.newYearsEve2"];
            selected.Icon = Sparkles;
        }

        const randomPhraseKey = selected.phraseKeys[Math.floor(Math.random() * selected.phraseKeys.length)];

        setGreeting({
            baseKey: selected.baseKey,
            phraseKey: randomPhraseKey,
            Icon: selected.Icon
        });
    }, []);

    const IconComponent = greeting.Icon;
    
    // Check if the user has completed their flashcards today
    const studiedToday = lastStudyDate === new Date().toDateString();

    // Generate a pseudo-random word of the day that changes every 24 hours
    const wordOfTheDay = useMemo(() => {
        if (lexicon.length === 0) return null;
        
        const today = new Date().toDateString();
        let hash = 0;
        for (let i = 0; i < today.length; i++) {
            hash = today.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % lexicon.length;
        return lexicon[index];
    }, [lexicon]);

    return (
        <>
        <div className="home-container">
            {/* Main Welcome Dashboard */}
            <Card className='home-page'>
                <h1>
                    {t(greeting.baseKey)}<span>, {authorName}</span>
                    <IconComponent className='icon-home'/>
                </h1>
                <p>{t(greeting.phraseKey)}</p>  
                <div className="home-actions">
                    <button onClick={() => navigate('/settings')} className="btn btn-base btn-primary">
                        <Settings2 size={18} /> {t('home.configureGrammar')}
                    </button>
                    <button onClick={() => navigate('/create')} className="btn btn-base btn-secondary">
                        <PlusCircle size={18} /> {t('home.expandLexicon')}
                    </button>
                    <button onClick={() => navigate('/lexicon')} className="btn btn-base btn-secondary">
                        <BookA size={18} /> {t('home.openLexicon')}
                    </button>
                </div>
            </Card> 

            {/* Interactive Widgets Grid */}
            <div className="widgets-grid">
                
                {/* Quick Word Creation */}
                <Card 
                    className="interactive-card help-card"
                    onClick={() => navigate('/help')} 
                >
                    <h3>
                        <HelpCircle size={24} /> {t('home.buildGuideTitle')}
                    </h3>
                    <p>{t('home.buildGuideDesc')}</p>
                    <div className="widget-footer">
                        {t('home.openGuide')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Flashcards & Gamification Status */}
                <Card 
                    className="interactive-card training-card"
                    onClick={() => navigate('/study')} 
                >
                    <h3>
                        <BrainCircuit size={24} /> {t('home.dailyTrainingTitle')}
                    </h3>
                    {studiedToday ? (
                        <p>
                            {t('home.studiedTodayDesc', { streak: `${streak}` })}
                        </p>
                    ) : (
                        <p>
                            {t('home.flashcardsWaitingDesc', { streak: `${streak}` })}
                        </p>
                    )}
                    <div className="widget-footer">
                        {t('home.practiceNow')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Word of the Day */}
                <Card 
                    className="interactive-card wotd-card"
                    onClick={() => navigate('/lexicon')} 
                >
                    <h3>
                        <Bookmark size={24} /> {t('home.wordOfTheDayTitle')}
                    </h3>
                    {wordOfTheDay ? (
                        <div className="wotd-content">
                            <div className="wotd-display">
                                <span className={`notranslate wotd-word${isFeaturalBlock ? '' : ` custom-font-text conlang-script-${resolveWordScriptId(wordOfTheDay, useConfigStore.getState())}`}`}>
                                    {isFeaturalBlock
                                        ? wordOfTheDay.word.replace(/\*/g, '')
                                        : transliterate(wordOfTheDay.word.replace(/\*/g, ''), lexicon)
                                    }
                                </span>
                                <span className="wotd-translation">
                                    {wordOfTheDay.wordClass ? `[${wordOfTheDay.wordClass}] ` : ''}{wordOfTheDay.translation}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p>{t('home.wordOfTheDayEmpty')}</p>
                    )}
                    <div className="widget-footer">
                        {t('home.openLexicon')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Grammar Wiki */}
                <Card 
                    className="interactive-card wiki-card"
                    onClick={() => navigate('/wiki')} 
                >
                    <h3>
                        <Library size={24} /> {t('home.grammarWikiTitle')}
                    </h3>
                    <p>{t('home.grammarWikiDesc')}</p>
                    <div className="widget-footer">
                        {t('home.openWiki')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Conlang Health Check */}
                <Card 
                    className="interactive-card health-card"
                    onClick={() => setIsHealthCheckOpen(true)} 
                >
                    <h3>
                        <Activity size={24} /> {t('home.healthCheckTitle')}
                    </h3>
                    <p>{t('home.healthCheckDesc')}</p>
                    <div className="widget-footer">
                        {t('home.runDiagnostics')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Naturalness & Typology */}
                <Card
                    className="interactive-card health-card"
                    onClick={() => navigate('/typology')}
                >
                    <h3>
                        <FlaskConical size={24} /> {t('home.naturalnessTitle')}
                    </h3>
                    <p>{t('home.naturalnessDesc')}</p>
                    <div className="widget-footer">
                        {t('home.viewReport')} <ArrowRight size={16} />
                    </div>
                </Card>

                {/* Global Stats */}
                <Card className="interactive-card stats-card" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Globe size={24} /> {t('home.joinCommunityTitle')}
                    </h3>
                    {stats.loading ? (
                        <p>{t('home.countingWorldbuilders')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <p style={{ margin: 0, color: 'var(--tx2)' }}>{t('home.weHave')}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px', background: 'var(--s1)', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0', color: 'var(--acc)', fontSize: '1.8rem' }}><RollingNumber endValue={stats.languages} />+</h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--tx2)', fontWeight: 'bold' }}>{t('home.languagesStat')}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0', color: 'var(--acc)', fontSize: '1.8rem' }}><RollingNumber endValue={stats.words} />+</h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--tx2)', fontWeight: 'bold' }}>{t('home.wordsStat')}</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0', color: 'var(--acc)', fontSize: '1.8rem' }}><RollingNumber endValue={stats.conlangers} />+</h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--tx2)', fontWeight: 'bold' }}>{t('home.conlangersStat')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Support the Project */}
                <Card className="interactive-card support-card">
                    <h3>
                        <Heart size={24} /> {t('home.supportTitle')}
                    </h3>
                    <p>{t('home.supportDesc')}</p>
                    <div className="support-card-actions">
                        <button onClick={() => window.open('https://ko-fi.com/kaitosz', '_blank')} className="support-link-btn">
                            <Coffee size={14} /> {t('home.kofi')}
                        </button>
                    </div>
                </Card>

            </div>
        </div>
        
        <HealthCheckModal 
            isOpen={isHealthCheckOpen} 
            onClose={() => setIsHealthCheckOpen(false)} 
        />
        </>
    );
}
