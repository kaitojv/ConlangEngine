import { useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import SettingsGeneral from './SettingsGeneral.jsx';
import PhonologyTab from './PhonologyTab.jsx';
import './settings.css';
import { Cog, Languages, Palette, Hash, BookOpen, FileText, Bookmark, Cloud, Atom } from 'lucide-react'
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import LexiconTab from './LexiconTab.jsx';
import GrammarTab from './GrammarTab.jsx';
import NumeralTab from './NumeralTab.jsx';
import SystemTab from './SystemTab.jsx';
import FunctionWordsTab from './FunctionWordsTab.jsx';
import ParticleTab from './ParticleTab.jsx';
import BackupTab from './BackupTab.jsx';
import { useIsDesktop } from '../../../utils/device.js';

const VALID_SETTINGS_TABS = new Set([
    'general', 'phonology', 'lexicon', 'grammar', 'numerals',
    'functionWords', 'particles', 'backup', 'system'
]);

export default function Settings() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const requestedTab = searchParams.get('tab') || location.state?.tab || '';
    const [localTab, setLocalTab] = useState('general');
    const activeTab = VALID_SETTINGS_TABS.has(requestedTab) ? requestedTab : localTab;
    // Backup talks to the desktop-only Obsidian plugin — hide the tab on mobile.
    const isDesktop = useIsDesktop();
    const usesParticles = useConfigStore((state) => state.usesParticles) || false;

    const handleTabSelect = (tabId) => {
        setLocalTab(tabId);
        const next = new URLSearchParams(searchParams);
        next.set('tab', tabId);
        if (tabId !== 'grammar') next.delete('sub');
        setSearchParams(next, { replace: true });
    };

    const configTabs = [
        { id: 'general', label: 'General', icon: Cog },
        { id: 'phonology', label: 'Phonology', icon: Languages },
        { id: 'lexicon', label: 'Lexicon', icon: BookOpen },
        { id: 'grammar', label: 'Grammar', icon: FileText },
        { id: 'numerals', label: 'Numerals', icon: Hash },
        { id: 'functionWords', label: 'Pronouns', icon: Bookmark },
        ...(usesParticles ? [{ id: 'particles', label: 'Particles', icon: Atom }] : []),
        ...(isDesktop ? [{ id: 'backup', label: 'Backup', icon: Cloud }] : []),
        { id: 'system', label: 'System and Theme', icon: Palette}
    ];
    return (
        <div>
            <h2 className="settings-header">
                {t('settings.title')}
            </h2>

            <div>
                <div role='tablist' className="tabs tabs-boxed config-subnav">
                    {configTabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`config-tab-btn tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabSelect(tab.id)}
                        >
                            <tab.icon className='settings-icon' size={18}/> 
                            {t(`settings.tabs.${tab.id}`) || tab.label}
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
                {activeTab === 'functionWords' && (
                    <FunctionWordsTab />
                )}
                {activeTab === 'particles' && (
                    <ParticleTab />
                )}
                {activeTab === 'backup' && isDesktop && (
                    <BackupTab />
                )}
                {activeTab === 'system' && (
                    <SystemTab />
                )}
                </div>
                </div>
            </div>
            
    );
}

