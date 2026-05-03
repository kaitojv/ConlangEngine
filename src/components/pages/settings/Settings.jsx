// ./src/components/pages/settings.jsx
import { useState } from 'react';
import SettingsGeneral from './SettingsGeneral.jsx';
import PhonologyTab from './PhonologyTab.jsx';
import './settings.css';
import { Cog, Languages, Palette, Hash, BookOpen, FileText } from 'lucide-react'
import LexiconTab from './LexiconTab.jsx';
import GrammarTab from './GrammarTab.jsx';
import NumeralTab from './NumeralTab.jsx';
import SystemTab from './SystemTab.jsx';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');

    const configTabs = [
        { id: 'general', label: 'General', icon: Cog },
        { id: 'phonology', label: 'Phonology', icon: Languages },
        { id: 'lexicon', label: 'Lexicon', icon: BookOpen },
        { id: 'grammar', label: 'Grammar', icon: FileText },
        { id: 'numerals', label: 'Numerals', icon: Hash },
        { id:'system', label: 'System and Theme', icon: Palette}
    ];
    return (
        <div>
            <h2 className="settings-header">
                Settings
            </h2>

            <div>
                <div role='tablist' className="tabs tabs-boxed config-subnav">
                    {configTabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`config-tab-btn tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon className='settings-icon' size={18}/> 
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="config-content config-content-wrapper">
                {activeTab === 'general' && (
                    <SettingsGeneral />
                )}
                {activeTab === 'phonology' && (
                    <PhonologyTab />
                )}
                {activeTab === 'lexicon' && (
                    <LexiconTab />
                )}
                {activeTab === 'grammar' && (
                    <GrammarTab />
                )}
                {activeTab === 'numerals' && (
                    <NumeralTab />
                )}
                {activeTab === 'system' && (
                    <SystemTab />
                )}
                </div>
                </div>
            </div>
            
    );
}

