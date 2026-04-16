// src/components/NavBar/NavBar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Home, 
    User, 
    Languages, 
    Settings, 
    PlusCircle, 
    Book, 
    Sparkles, 
    Mail, 
    Activity, 
    Map, 
    BookOpen, 
    Library, 
    Layers 
} from 'lucide-react';
import './navbar.css';

export default function NavBar({ isMenuOpen, closeMenu }) {
    
        const tabs = [
            {
                title: 'WORKSPACE',
                items: [
                    {id: '/', label: 'Home', Icon: Home},
                    {id: '/conlangs', label: 'Conlangs', Icon: Languages},
                    {id: '/settings', label: 'Settings', Icon: Settings},
                ]},
                {title: 'Lexicon',
                items: [
                    {id: '/create', label: 'Create Word', Icon: PlusCircle},
                    {id: '/dictionary', label: 'Dictionary', Icon: Book},
                ]},
                {title: 'Linguistics',
                    items: [
                        {id: '/generator', label: 'Generator', Icon: Sparkles},
                        {id: '/analyzer', label: 'Analyzer', Icon: Activity},
                        {id: '/rootmap', label: 'Root Map', Icon: Map},
                ]},
                {
                    title: 'Resources',
                    items: [
                        {id: '/reader', label: 'Reader', Icon: BookOpen},
                        {id: '/wiki', label: 'Wiki', Icon: Library},
                        {id: '/flashcards', label: 'Flashcards', Icon: Layers},
                    ]},
                
                {
                    title: 'Contact',
                    items: [
                        {id: '/contact', label: 'Contact', Icon: Mail},
                    ]
                }
        ];

        return (
            <>
            <div 
                className={`navbar-overlay ${isMenuOpen ? 'active' : ''}`} 
                onClick={closeMenu}
            ></div>

            <div className={`navbar-container ${isMenuOpen ? 'active' : ''}`}>

                <div className="sidebar-header">
                    <h3>
                        Navigation Bar
                    </h3>
                </div>

                    <div className="navbar">
                    {tabs.map((group, index) => (
                        <div key={index} style={{ width: '100%' }}>
                            <div className="nav-group-label">{group.title}</div>
                            
                            
                            {group.items.map((tab) => (
                                <NavLink 
                                    key={tab.id} 
                                    to={tab.id}
                                    className={({isActive}) => `nb ${isActive ? 'on' : ''}`} 
                                    onClick={closeMenu} 
                                >
                                    <tab.Icon className='nav-icon' size={18}/>
                                    <span className='nav-label'>{tab.label}</span>
                                </NavLink>
                            ))}

                        </div>
                    ))}
                </div>
            </div>
            </>
        )  

    }
