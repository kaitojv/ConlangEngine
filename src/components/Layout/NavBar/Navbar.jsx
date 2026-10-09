import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, Languages, Settings, PlusCircle, Book, 
    Sparkles, Activity, Map, BookOpen, Library, Layers,
    Lock, HelpCircle, Sun, Moon, Link2, Compass, MessageSquare, GraduationCap, FlaskConical
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { DARK_THEMES, LIGHT_THEMES } from '@/utils/themePresets.js';
import './navbar.css';

// We define the navigation structure outside the component so it isn't recreated on every single render.
const NAV_GROUPS = [
    {
        key: 'workspace',
        fallbackTitle: 'Workspace',
        items: [
            { id: '/', key: 'home', label: 'Home', Icon: Home },
            { id: '/conlangs', key: 'conlangs', label: 'Conlangs', Icon: Languages },
            { id: '/settings', key: 'settings', label: 'Settings', Icon: Settings },
        ]
    },
    {
        key: 'lexiconGroup',
        fallbackTitle: 'Lexicon',
        items: [
            { id: '/create', key: 'createWord', label: 'Create Word', Icon: PlusCircle },
            { id: '/lexicon', key: 'lexicon', label: 'Lexicon', Icon: Book },
            { id: '/phrases', key: 'phrases', label: 'Phrases & Idioms', Icon: MessageSquare },
            { id: '/semantic', key: 'semantic', label: 'Semantic Explorer', Icon: Compass },
        ]
    },
    {
        key: 'linguistics',
        fallbackTitle: 'Linguistics',
        items: [
            { id: '/generator', key: 'generator', label: 'Generator', Icon: Sparkles },
            { id: '/orthography', key: 'orthography', label: 'Orthography & Numbers', Icon: Languages },
            { id: '/analyzer', key: 'analyzer', label: 'Analyzer', Icon: Activity },
            { id: '/typology', key: 'typology', label: 'Naturalness', Icon: FlaskConical },
            { id: '/rootmap', key: 'rootmap', label: 'Root Map', Icon: Map },
            { id: '/aligner', key: 'aligner', label: 'Sentence Mapper', Icon: Link2 },
        ]
    },
    {
        key: 'resources',
        fallbackTitle: 'Resources',
        items: [
            { id: '/reader', key: 'reader', label: 'Reader', Icon: BookOpen },
            { id: '/wiki', key: 'wiki', label: 'Library & Writing', Icon: Library },
            { id: '/study', key: 'study', label: 'Study & Flashcards', Icon: Layers },
        ]
    },
    {
        key: 'help',
        fallbackTitle: 'Help',
        items: [
            { id: '/howtostart', key: 'howToStart', label: 'How to Start', Icon: GraduationCap },
            { id: '/help', key: 'helpInfo', label: 'Help & Info', Icon: HelpCircle },
        ]
    }
];

export default function NavBar({ isMenuOpen, closeMenu }) {
    const { t } = useTranslation();
    const isProActive = useConfigStore(state => state.isProActive);
    const theme = useConfigStore(state => state.theme);
    const customLabels = useConfigStore(state => state.customLabels) || {};
    const updateConfig = useConfigStore(state => state.updateConfig);
    const [session, setSession] = useState(null);

    // Keep track of the user's active session to determine if they get access to LIVE features
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const toggleTheme = () => {
        const isDark = theme === 'dark';
        const targetList = isDark ? LIGHT_THEMES : DARK_THEMES;
        
        // Pick a random theme from the target list for variety
        const randomTheme = targetList[Math.floor(Math.random() * targetList.length)];
        
        updateConfig({ 
            theme: isDark ? 'light' : 'dark',
            colors: randomTheme.colors 
        });
    };

    const isLive = session && isProActive;

    return (
        <>
            {/* Darkens the background when the menu is open on smaller screens */}
            <div 
                className={`navbar-overlay ${isMenuOpen ? 'active' : ''}`} 
                onClick={closeMenu} 
                aria-hidden="true"
            />

            <nav className={`navbar-container ${isMenuOpen ? 'active' : ''}`}>
                <header className="sidebar-header">
                    <button 
                        className="sidebar-header-btn theme-toggle-nav" 
                        onClick={toggleTheme} 
                        title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                        <span>{theme === 'dark' ? (t('nav.light') || 'Light') : (t('nav.dark') || 'Dark')}</span>
                    </button>
                </header>

                <div className="navbar">
                    {NAV_GROUPS.map((group) => (
                        <section key={group.key} className="nav-group">
                            <h4 className="nav-group-label">
                                {customLabels[group.fallbackTitle] || t(`nav.${group.key}`)}
                            </h4>
                            
                            {group.items.map((item) => {
                                const { id, key, label, requiresLive } = item;
                                const Icon = item.Icon;
                                // If this tab requires a LIVE subscription and the user doesn't have it, show a locked version
                                const displayLabel = customLabels[label] || t(`nav.${key}`);
                                
                                if (requiresLive && !isLive) {
                                    return (
                                        <div key={id} className="nb locked" title={t('nav.lockedWorkspaces')}>
                                            <Lock className="nav-icon" size={18} />
                                            <span className="nav-label">{displayLabel}</span>
                                        </div>
                                    );
                                }

                                return (
                                    <NavLink 
                                        key={id} 
                                        to={id}
                                        className={({isActive}) => `nb ${isActive ? 'on' : ''}`} 
                                        onClick={closeMenu} 
                                    >
                                        <Icon className="nav-icon" size={18} />
                                        <span className="nav-label">{displayLabel}</span>
                                    </NavLink>
                                );
                            })}
                        </section>
                    ))}
                </div>
            </nav>
        </>
    );
}
