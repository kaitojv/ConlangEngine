import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { 
    Search, Command, Book, Languages, Settings, Map, 
    Sparkles, Library, FileText, ArrowRight, Type
} from 'lucide-react';
import { DARK_THEMES, LIGHT_THEMES } from '@/utils/themePresets.js';
import './commandPalette.css';

// Pre-defined app routes for navigation search
const APP_ROUTES = [
    { id: 'nav-home', title: 'Home', type: 'route', path: '/', icon: 'Command' },
    { id: 'nav-lexicon', title: 'Lexicon', type: 'route', path: '/lexicon', icon: 'Book' },
    { id: 'nav-create', title: 'Create Word', type: 'route', path: '/create', icon: 'Type' },
    { id: 'nav-settings', title: 'Settings', type: 'route', path: '/settings', icon: 'Settings' },
    { id: 'nav-conlangs', title: 'Conlangs', type: 'route', path: '/conlangs', icon: 'Languages' },
    { id: 'nav-generator', title: 'Word Generator', type: 'route', path: '/generator', icon: 'Sparkles' },
    { id: 'nav-wiki', title: 'Wiki / Library', type: 'route', path: '/wiki', icon: 'Library' },
    { id: 'nav-rootmap', title: 'Root Map', type: 'route', path: '/rootmap', icon: 'Map' },
];

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const navigate = useNavigate();
    
    const lexicon = useLexiconStore(state => state.lexicon) || [];
    const wikiPages = useConfigStore(state => state.wikiPages) || {};
    const theme = useConfigStore(state => state.theme);
    const updateConfig = useConfigStore(state => state.updateConfig);

    // Toggle on Ctrl+K or Cmd+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Reset state when opening/closing
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const toggleTheme = () => {
        const isDark = theme === 'dark';
        const targetList = isDark ? LIGHT_THEMES : DARK_THEMES;
        const randomTheme = targetList[Math.floor(Math.random() * targetList.length)];
        updateConfig({ theme: isDark ? 'light' : 'dark', colors: randomTheme.colors });
    };

    const QUICK_ACTIONS = [
        { id: 'act-theme', title: 'Toggle Light/Dark Theme', type: 'action', action: toggleTheme, icon: 'Settings' }
    ];

    // Compute search results
    const results = useMemo(() => {
        if (!query.trim()) {
            // Default view when empty
            return [
                ...APP_ROUTES.slice(0, 4),
                ...QUICK_ACTIONS
            ];
        }

        const lowerQuery = query.toLowerCase();
        let matches = [];

        // 1. Search Routes
        APP_ROUTES.forEach(route => {
            if (route.title.toLowerCase().includes(lowerQuery)) {
                matches.push(route);
            }
        });

        // 2. Search Actions
        QUICK_ACTIONS.forEach(action => {
            if (action.title.toLowerCase().includes(lowerQuery)) {
                matches.push(action);
            }
        });

        // 3. Search Wiki
        Object.entries(wikiPages).forEach(([id, page]) => {
            const title = typeof page === 'object' ? page.title : id;
            if (title && title.toLowerCase().includes(lowerQuery)) {
                matches.push({
                    id: `wiki-${id}`,
                    title: title,
                    type: 'wiki',
                    subtitle: 'Wiki Document',
                    path: '/wiki',
                    icon: 'FileText'
                });
            }
        });

        // 4. Search Lexicon (up to 20 results to avoid lag)
        const lexiconMatches = lexicon
            .filter(word => 
                word.word.toLowerCase().includes(lowerQuery) || 
                word.translation.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 20)
            .map(word => ({
                id: `lex-${word.id}`,
                title: word.word,
                subtitle: word.translation,
                type: 'word',
                path: '/lexicon',
                icon: 'Book'
            }));
            
        matches.push(...lexiconMatches);

        return matches;
    }, [query, lexicon, wikiPages]);

    // Handle keyboard navigation inside the modal
    useEffect(() => {
        if (!isOpen) return;

        const handleNav = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter' && results.length > 0) {
                e.preventDefault();
                executeResult(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, results, selectedIndex]);

    // Ensure selected item stays in view
    useEffect(() => {
        if (listRef.current && isOpen) {
            const selectedEl = listRef.current.children[selectedIndex];
            if (selectedEl) {
                selectedEl.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, isOpen]);

    const executeResult = (result) => {
        if (result.type === 'action') {
            result.action();
        } else if (result.type === 'route' || result.type === 'wiki' || result.type === 'word') {
            navigate(result.path);
        }
        setIsOpen(false);
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'Book': return <Book size={18} />;
            case 'Languages': return <Languages size={18} />;
            case 'Settings': return <Settings size={18} />;
            case 'Map': return <Map size={18} />;
            case 'Sparkles': return <Sparkles size={18} />;
            case 'Library': return <Library size={18} />;
            case 'FileText': return <FileText size={18} />;
            case 'Type': return <Type size={18} />;
            default: return <Command size={18} />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
            <div className="command-palette" onClick={e => e.stopPropagation()}>
                <div className="cp-header">
                    <Search className="cp-search-icon" size={20} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        className="cp-input" 
                        placeholder="Search workspace... (Words, Pages, Actions)"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                    />
                    <div className="cp-esc">ESC</div>
                </div>
                
                <div className="cp-results" ref={listRef}>
                    {results.length === 0 ? (
                        <div className="cp-empty">No results found for "{query}"</div>
                    ) : (
                        results.map((result, index) => (
                            <div 
                                key={result.id}
                                className={`cp-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => executeResult(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="cp-item-icon">
                                    {getIcon(result.icon)}
                                </div>
                                <div className="cp-item-content">
                                    <div className="cp-item-title">
                                        {result.type === 'word' ? (
                                            <span className="notranslate custom-font-text">{result.title.replace(/\*/g, '')}</span>
                                        ) : (
                                            result.title
                                        )}
                                    </div>
                                    {result.subtitle && (
                                        <div className="cp-item-subtitle">{result.subtitle}</div>
                                    )}
                                </div>
                                <div className="cp-item-type">{result.type}</div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="cp-footer">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>↵</kbd> to select</span>
                </div>
            </div>
        </div>
    );
}
