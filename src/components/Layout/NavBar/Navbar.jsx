import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, Languages, Settings, PlusCircle, Book, 
    Sparkles, Activity, Map, BookOpen, Library, Layers,
    Lock, HelpCircle, Sun, Moon, Link2
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { supabase } from '@/utils/supabaseClient.js';
import { DARK_THEMES, LIGHT_THEMES } from '@/utils/themePresets.js';
import './navbar.css';

// We define the navigation structure outside the component so it isn't recreated on every single render.
const NAV_GROUPS = [
    {
        title: 'Workspace',
        items: [
            { id: '/', label: 'Home', Icon: Home },
            { id: '/conlangs', label: 'Conlangs', Icon: Languages, requiresLive: true },
            { id: '/settings', label: 'Settings', Icon: Settings },
        ]
    },
    {
        title: 'Lexicon',
        items: [
            { id: '/create', label: 'Create Word', Icon: PlusCircle },
            { id: '/lexicon', label: 'Lexicon', Icon: Book },
        ]
    },
    {
        title: 'Linguistics',
        items: [
            { id: '/generator', label: 'Generator', Icon: Sparkles },
            { id: '/analyzer', label: 'Analyzer', Icon: Activity },
            { id: '/rootmap', label: 'Root Map', Icon: Map },
            { id: '/aligner', label: 'Sentence Mapper', Icon: Link2 },
        ]
    },
    {
        title: 'Resources',
        items: [
            { id: '/reader', label: 'Reader', Icon: BookOpen },
            { id: '/wiki', label: 'Library & Writing', Icon: Library },
            { id: '/study', label: 'Study & Flashcards', Icon: Layers },
        ]
    },
    {
        title: 'Help',
        items: [
            { id: '/help', label: 'Help & Info', Icon: HelpCircle },
        ]
    }
];

export default function NavBar({ isMenuOpen, closeMenu }) {
    const isProActive = useConfigStore(state => state.isProActive);
    const theme = useConfigStore(state => state.theme);
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
                    <button className="theme-toggle-nav" onClick={toggleTheme} title="Toggle Day/Night Mode">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </header>

                <div className="navbar">
                    {NAV_GROUPS.map((group) => (
                        <section key={group.title} className="nav-group">
                            <h4 className="nav-group-label">{group.title}</h4>
                            
                            {group.items.map(({ id, label, Icon, requiresLive }) => {
                                // If this tab requires a LIVE subscription and the user doesn't have it, show a locked version
                                if (requiresLive && !isLive) {
                                    return (
                                        <div key={id} className="nb locked" title="Upgrade to LIVE to unlock multiple workspaces.">
                                            <Lock className="nav-icon" size={18} />
                                            <span className="nav-label">{label}</span>
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
                                        <span className="nav-label">{label}</span>
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
