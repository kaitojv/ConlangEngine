import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
    X, Book, Sparkles, FileText, Download, AlertTriangle, 
    Loader2, Table2, FileSpreadsheet, FileCode, Gamepad, 
    Package, Languages, Globe, Layers, CheckCircle2,
    BookOpen, Terminal, Maximize, Swords, Code2
} from 'lucide-react';

import Button from '../../UI/Buttons/Buttons.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { MINECRAFT_KEYS, MINECRAFT_VERSIONS, buildPackMcmeta, DEFAULT_MINECRAFT_VERSION } from '../../../utils/minecraftExportData.js';
import { TERRARIA_KEYS, TERRARIA_VERSIONS, TERRARIA_LANGUAGES, buildTerrariaHjson, buildBuildTxt, DEFAULT_TERRARIA_VERSION } from '../../../utils/terrariaExportData.js';
import { autoMatchAll } from '../../../utils/gameExportMatch.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';

import { useTranslationGrid } from './useTranslationGrid.js';
import TranslationGridControls from './TranslationGridControls.jsx';
import './exportModal.css';

export const ExportModal = ({ isOpen, type, onClose, onExport }) => {
    const { t } = useTranslation();

    // Standard Exporter States
    const [includeInflections, setIncludeInflections] = useState(true);
    const [inflectionMode, setInflectionMode] = useState('compact');
    const [isProcessing, setIsProcessing] = useState(false);

    // Global Store States
    const config = useConfigStore(state => state);
    const lexicon = useLexiconStore(state => state.lexicon || []);

    // Minecraft Exporter States
    const [langName, setLangName] = useState('');
    const [langCode, setLangCode] = useState('');
    const [regionName, setRegionName] = useState('Conlangia');
    const [bidirectional, setBidirectional] = useState(false);
    const [mcVersion, setMcVersion] = useState(DEFAULT_MINECRAFT_VERSION);
    const [customTranslations, setCustomTranslations] = useState({});

    // Terraria Exporter States
    const [trModName, setTrModName] = useState('');
    const [trLangCode, setTrLangCode] = useState('en-US');
    const [trModVersion, setTrModVersion] = useState('1.0.0');
    const [trGameVersion, setTrGameVersion] = useState(DEFAULT_TERRARIA_VERSION);
    const [trModAuthor, setTrModAuthor] = useState('');
    const [trCustomTranslations, setTrCustomTranslations] = useState({});


    // Reset and initialize Minecraft configurations reactively on mount/open
    useEffect(() => {
        if (isOpen && type === 'minecraft') {
            const confName = config.conlangName || 'My Conlang';
            setLangName(`${confName} Pack`);
            
            const generatedCode = confName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .slice(0, 8) + '_res';
            setLangCode(generatedCode);
            setRegionName('Conlangia');
            setBidirectional(false);
            setMcVersion(DEFAULT_MINECRAFT_VERSION);


            // Automatically scan lexicon for matching keys. Done in one indexed
            // pass; per-key autoMatchLexicon is O(keys x lexicon) and froze the
            // modal for seconds once the vocabulary reached a few thousand keys.
            setCustomTranslations(autoMatchAll(MINECRAFT_KEYS, lexicon));
        }
    }, [isOpen, type, config.conlangName, lexicon]);

    // Reset and initialize Terraria configurations reactively on mount/open
    useEffect(() => {
        if (isOpen && type === 'terraria') {
            const confName = config.conlangName || 'My Conlang';
            const generatedModName = confName
                .trim()
                .replace(/\s+/g, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                || 'MyConlangMod';
            setTrModName(generatedModName);
            setTrLangCode('en-US');
            setTrModVersion('1.0.0');
            setTrGameVersion(DEFAULT_TERRARIA_VERSION);
            setTrModAuthor(confName);

            // Same single indexed pass for the Terraria mapper.
            setTrCustomTranslations(autoMatchAll(TERRARIA_KEYS, lexicon));
        }
    }, [isOpen, type, config.conlangName, lexicon]);

    // The modal can only be dismissed by clicking the backdrop, which is not
    // reachable by keyboard. Allow Escape to close it.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && !isProcessing) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, isProcessing, onClose]);

    // Grid state for both games. These own the active tab, the search text and
    // the page, so the JSX below does not need to filter or slice the vocabulary.
    const mcGrid = useTranslationGrid(MINECRAFT_KEYS, customTranslations, 'Interface');
    const trGrid = useTranslationGrid(TERRARIA_KEYS, trCustomTranslations, 'Items');


    if (!isOpen) return null;

    const isRichDocument = type === 'pdf' || type === 'docx';

    const templates = [
        { 
            id: 'academic', 
            name: t('exportModal.templates.academic.name'), 
            desc: t('exportModal.templates.academic.desc'),
            icon: Book,
            color: '#64748b'
        },
        { 
            id: 'modern', 
            name: t('exportModal.templates.modern.name'), 
            desc: t('exportModal.templates.modern.desc'),
            icon: Sparkles,
            color: '#a855f7'
        },
        { 
            id: 'manuscript', 
            name: t('exportModal.templates.manuscript.name'), 
            desc: t('exportModal.templates.manuscript.desc'),
            icon: FileText,
            color: '#f59e0b'
        },
        {
            id: 'fantasy',
            name: t('exportModal.templates.fantasy.name'), 
            desc: t('exportModal.templates.fantasy.desc'),
            icon: BookOpen,
            color: '#b45309'
        },
        {
            id: 'cyberpunk',
            name: t('exportModal.templates.cyberpunk.name'), 
            desc: t('exportModal.templates.cyberpunk.desc'),
            icon: Terminal,
            color: '#10b981'
        },
        {
            id: 'minimalist',
            name: t('exportModal.templates.minimalist.name'), 
            desc: t('exportModal.templates.minimalist.desc'),
            icon: Maximize,
            color: '#0f172a'
        }
    ];

    const handleExportClick = (templateId = 'default') => {
        setIsProcessing(true);
        setTimeout(() => {
            if (type === 'minecraft') {
                onExport(customTranslations, {
                    langName,
                    langCode,
                    regionName,
                    bidirectional,
                    versionId: mcVersion
                });
            } else if (type === 'terraria') {
                onExport(trCustomTranslations, {
                    modName: trModName,
                    langCode: trLangCode,
                    modVersion: trModVersion,
                    modAuthor: trModAuthor,
                    gameVersion: trGameVersion,
                });
            } else {
                onExport(templateId, {
                    includeInflections,
                    inflectionMode
                });
            }
            setIsProcessing(false);
            onClose();
        }, 100);
    };

    const handleTranslationChange = (key, value) => {
        setCustomTranslations(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // The Terraria mapper is a separate state tree, so it needs its own setter.
    // Both grids share the same controls component, which only needs a
    // (key, value) => void.
    const handleTrTranslationChange = (key, value) => {
        setTrCustomTranslations(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const getFormatIcon = () => {
        if (type === 'sheets') return <FileSpreadsheet size={20} className="text-green-400" />;
        if (type === 'obsidian') return <FileCode size={20} className="text-orange-400" />;
        if (type === 'minecraft') return <Gamepad size={20} className="text-purple-400" />;
        if (type === 'terraria') return <Swords size={20} className="text-lime-400" />;
        return <Download size={20} className="text-purple-400" />;
    };

    const getModalTitle = () => {
        if (type === 'minecraft') return t('exportModal.formats.minecraft');
        if (type === 'terraria') return t('exportModal.formats.terraria');
        if (type === 'pdf') return t('exportModal.formats.pdf');
        if (type === 'docx') return t('exportModal.formats.docx');
        if (type === 'obsidian') return t('exportModal.formats.obsidian');
        if (type === 'sheets') return t('exportModal.formats.sheets');
        return `${type?.toUpperCase()} Reference`;
    };

    const translatedCount = Object.values(
        type === 'terraria' ? trCustomTranslations : customTranslations
    ).filter(v => v && v.trim() !== '').length;

    const totalKeyCount = type === 'terraria' ? TERRARIA_KEYS.length : MINECRAFT_KEYS.length;
    const missingCount = totalKeyCount - translatedCount;

    return ReactDOM.createPortal(
        <div className="export-modal-overlay" role="presentation" onClick={isProcessing ? undefined : onClose}>
            <div className={`export-modal ${(type === 'minecraft' || type === 'terraria') ? 'minecraft-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label="Export conlang" onClick={e => e.stopPropagation()}>
                
                {isProcessing && (
                    <div className="export-processing-overlay">
                        <Loader2 className="processing-spinner" size={48} />
                        <h3>
                            {type === 'minecraft' ? t('exportModal.processing.mcTitle')
                            : type === 'terraria' ? t('exportModal.processing.trTitle')
                            : t('exportModal.processing.docTitle')}
                        </h3>
                        <p>
                            {type === 'minecraft' ? t('exportModal.processing.mcDesc')
                            : type === 'terraria' ? t('exportModal.processing.trDesc')
                            : t('exportModal.processing.docDesc')}
                        </p>
                    </div>
                )}


                <div className="vrb-header">
                    <div className="vrb-header-title-group">
                        {getFormatIcon()}
                        <h2>{t('exportModal.title', { format: getModalTitle() })}</h2>
                    </div>
                    <button className="export-modal-close-btn" onClick={onClose} disabled={isProcessing}>
                        <X size={20} />
                    </button>
                </div>

                <div className="export-modal-content">
                    {type === 'minecraft' ? (
                        <div className="minecraft-wizard-layout">
                            
                            {/* Left Panel: Pack Configuration */}
                            <div className="mc-settings-panel">
                                <h3 className="panel-title"><Package size={16} /> {t('exportModal.minecraft.packSettings')}</h3>
                                
                                <div className="mc-field">
                                    <label>{t('exportModal.minecraft.packName')}</label>
                                    <input 
                                        type="text" 
                                        value={langName} 
                                        onChange={e => setLangName(e.target.value)} 
                                        placeholder={t('exportModal.minecraft.packNamePlaceholder')}
                                    />
                                </div>

                                <div className="mc-field-row">
                                    <div className="mc-field">
                                        <label>{t('exportModal.minecraft.langCode')}</label>
                                        <input 
                                            type="text" 
                                            value={langCode} 
                                            onChange={e => setLangCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                                            placeholder={t('exportModal.minecraft.langCodePlaceholder')}
                                        />
                                        <small>{t('exportModal.minecraft.langCodeHint')}</small>
                                    </div>
                                    <div className="mc-field">
                                        <label>{t('exportModal.minecraft.region')}</label>
                                        <input 
                                            type="text" 
                                            value={regionName} 
                                            onChange={e => setRegionName(e.target.value)} 
                                            placeholder={t('exportModal.minecraft.regionPlaceholder')}
                                        />
                                        <small>{t('exportModal.minecraft.regionHint')}</small>
                                    </div>
                                </div>

                                <div className="mc-field">
                                    <label>{t('exportModal.minecraft.targetVersion')}</label>
                                    <select value={mcVersion} onChange={e => setMcVersion(e.target.value)}>
                                        {MINECRAFT_VERSIONS.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.label} — Format {v.format}{v.minor ? '.' + v.minor : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <small>
                                        {MINECRAFT_VERSIONS.find(v => v.id === mcVersion)?.era === 'New (min/max)'
                                            ? t('exportModal.minecraft.versionNewHint')
                                            : t('exportModal.minecraft.versionOldHint')}
                                    </small>
                                </div>

                                <div className="mc-field checkbox-field">
                                    <label className="mc-checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={bidirectional} 
                                            onChange={e => setBidirectional(e.target.checked)} 
                                        />
                                        <span>{t('exportModal.minecraft.rtl')}</span>
                                    </label>
                                </div>

                                <div className="mc-preview-card">
                                    <h4>{t('exportModal.minecraft.preview')}</h4>
                                    <div className="mc-code-box">
                                        <pre>{JSON.stringify(buildPackMcmeta({
                                            langName: langName || 'My Conlang Pack',
                                            langCode: langCode || 'art_custom',
                                            regionName,
                                            bidirectional,
                                            versionId: mcVersion,
                                        }), null, 2)}</pre>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Interactive Translation Mapper */}
                            <div className="mc-mapper-panel">
                                <div className="mc-mapper-header">
                                    <h3 className="panel-title"><Languages size={16} /> {t('exportModal.mapper.title')}</h3>
                                    <span className="mc-progress-badge">
                                        <CheckCircle2 size={12} /> {t('exportModal.mapper.keysCount', { count: translatedCount, total: MINECRAFT_KEYS.length })}
                                    </span>
                                </div>
                                
                                <p className="mc-mapper-desc">
                                    {t('exportModal.mapper.mcDesc')}
                                </p>

                                <TranslationGridControls
                                    grid={mcGrid}
                                    keys={MINECRAFT_KEYS}
                                    translations={customTranslations}
                                    onChange={handleTranslationChange}
                                    idPrefix="mc"
                                />
                                
                                <div className="plain-export-action" style={{ marginTop: '16px' }}>
                                    <Button variant="save" onClick={() => handleExportClick()} style={{ width: '100%', padding: '16px', fontSize: '1.05rem', gap: '8px' }}>
                                        <Gamepad size={18} /> {t('exportModal.minecraft.compileBtn')}
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : type === 'terraria' ? (
                        <div className="minecraft-wizard-layout">

                            {/* Left Panel: Mod Configuration */}
                            <div className="mc-settings-panel">
                                <h3 className="panel-title"><Package size={16} /> {t('exportModal.terraria.modSettings')}</h3>

                                <div className="mc-field">
                                    <label>{t('exportModal.terraria.internalName')}</label>
                                    <input
                                        type="text"
                                        value={trModName}
                                        onChange={e => setTrModName(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                        placeholder={t('exportModal.terraria.internalNamePlaceholder')}
                                    />
                                    <small>{t('exportModal.terraria.internalNameHint')}</small>
                                </div>

                                <div className="mc-field-row">
                                    <div className="mc-field">
                                        <label>{t('exportModal.terraria.langCode')}</label>
                                            <select value={trLangCode} onChange={e => setTrLangCode(e.target.value)}>
                                                {TERRARIA_LANGUAGES.map(l => (
                                                    <option key={l.code} value={l.code}>
                                                        {l.code} ({l.label})
                                                    </option>
                                                ))}
                                            </select>
                                            {trLangCode === 'en-US' ? (
                                                <div className="export-warning-box" style={{ marginTop: '8px' }}>
                                                    <AlertTriangle size={14} />
                                                    <span>{t('exportModal.terraria.enWarning')}</span>
                                                </div>
                                            ) : null}
                                            <small>{t('exportModal.terraria.filenameHint', { code: trLangCode })}</small>
                                    </div>
                                    <div className="mc-field">
                                        <label>{t('exportModal.terraria.version')}</label>
                                        <input
                                            type="text"
                                            value={trModVersion}
                                            onChange={e => setTrModVersion(e.target.value)}
                                            placeholder={t('exportModal.terraria.versionPlaceholder')}
                                        />
                                        <small>{t('exportModal.terraria.versionHint')}</small>
                                    </div>
                                    <div className="mc-field">
                                        <label>{t('exportModal.terraria.gameVersion')}</label>
                                        <select value={trGameVersion} onChange={e => setTrGameVersion(e.target.value)}>
                                            {TERRARIA_VERSIONS.map(v => (
                                                <option key={v.id} value={v.id}>{v.label}</option>
                                            ))}
                                        </select>
                                        <small>{t('exportModal.terraria.gameVersionHint')}</small>
                                    </div>
                                </div>

                                <div className="mc-field">
                                    <label>{t('exportModal.terraria.modAuthor')}</label>
                                    <input
                                        type="text"
                                        value={trModAuthor}
                                        onChange={e => setTrModAuthor(e.target.value)}
                                        placeholder={t('exportModal.terraria.modAuthorPlaceholder')}
                                    />
                                </div>

                                <div className="mc-preview-card">
                                    <h4>{t('exportModal.terraria.buildTxtPreview')}</h4>
                                    <div className="mc-code-box">
                                            <pre>{buildBuildTxt({
                                                displayName: config.conlangName || 'My Conlang',
                                                author: trModAuthor || 'Author',
                                                modVersion: trModVersion,
                                                homepage: 'https://tmodloader.net/',
                                            })}</pre>
                                    </div>
                                </div>

                                <div className="mc-preview-card">
                                    <h4>{t('exportModal.terraria.hjsonPreview')}</h4>
                                    <div className="mc-code-box">
                                        <pre>{buildTerrariaHjson({"Items.IronSword.DisplayName":"Keth","Items.GoldenSword.DisplayName":"Duq","NPCs.Guide.DisplayName":"Vor"}, {
                                            modName: trModName || 'MyConlangMod',
                                            gameVersion: trGameVersion,
                                        }).trim()}</pre>
                                    </div>
                                </div>
                            </div>

                            {/* Right Panel: Translation Mapper */}
                            <div className="mc-mapper-panel">
                                <div className="mc-mapper-header">
                                    <h3 className="panel-title"><Languages size={16} /> {t('exportModal.mapper.title')}</h3>
                                    <span className="mc-progress-badge">
                                        <CheckCircle2 size={12} /> {t('exportModal.mapper.keysCount', { count: translatedCount, total: totalKeyCount })}
                                    </span>
                                    {missingCount > 0 && (
                                        <span className="mc-progress-badge" title={t('exportModal.mapper.missingTooltip')}>
                                            <AlertTriangle size={12} /> {t('exportModal.mapper.missingCount', { count: missingCount })}
                                        </span>
                                    )}
                                </div>

                                <p className="mc-mapper-desc">
                                    {t('exportModal.mapper.trDesc')}
                                </p>

                                <TranslationGridControls
                                    grid={trGrid}
                                    keys={TERRARIA_KEYS}
                                    translations={trCustomTranslations}
                                    onChange={handleTrTranslationChange}
                                    idPrefix="tr"
                                />

                                <div className="plain-export-action" style={{ marginTop: '16px' }}>
                                    <Button variant="save" onClick={() => handleExportClick()} style={{ width: '100%', padding: '16px', fontSize: '1.05rem', gap: '8px' }}>
                                        <Swords size={18} /> {t('exportModal.terraria.compileBtn')}
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <>
                            <div className="export-options-section">
                                <div className="export-option-row">
                                    <div className="option-info">
                                        <Table2 size={16} />
                                        <span>{t('exportModal.options.includeInflections')}</span>
                                    </div>
                                    <label className="switch">
                                        <input 
                                            type="checkbox" 
                                            checked={includeInflections} 
                                            onChange={e => setIncludeInflections(e.target.checked)} 
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>

                                {includeInflections && (
                                    <div className="export-sub-options">
                                        <label className="export-label">{t('exportModal.options.matrixDetail')}</label>
                                        <div className="export-mode-grid">
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'compact' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('compact')}
                                            >
                                                <h4>{t('exportModal.options.compact')}</h4>
                                                <p>{t('exportModal.options.compactDesc')}</p>
                                            </button>
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'affix' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('affix')}
                                            >
                                                <h4>{t('exportModal.options.fullAffix')}</h4>
                                                <p>{t('exportModal.options.fullAffixDesc')}</p>
                                            </button>
                                            <button 
                                                className={`mode-btn ${inflectionMode === 'free' ? 'active' : ''}`}
                                                onClick={() => setInflectionMode('free')}
                                            >
                                                <h4>{t('exportModal.options.fullFree')}</h4>
                                                <p>{t('exportModal.options.fullFreeDesc')}</p>
                                            </button>
                                        </div>
                                        
                                        {inflectionMode !== 'compact' && (
                                            <div className="export-warning-box">
                                                <AlertTriangle size={16} />
                                                <span>{t('exportModal.options.paradigmWarning')}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isRichDocument ? (
                                <>
                                    <p className="export-hint">{t('exportModal.options.chooseStyle')}</p>
                                    <div className="template-grid">
                                        {templates.map(tmp => (
                                            <div
                                                key={tmp.id}
                                                className="template-card"
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => handleExportClick(tmp.id)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExportClick(tmp.id); } }}
                                            >
                                                <div className="template-icon" style={{ background: `${tmp.color}22`, color: tmp.color }}>
                                                    <tmp.icon size={24} />
                                                </div>
                                                <div className="template-info">
                                                    <h3>{tmp.name}</h3>
                                                    <p>{tmp.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="plain-export-action">
                                    <p className="export-hint">{t('exportModal.options.noTemplatesHint', { format: type === 'sheets' ? 'Excel' : 'Markdown' })}</p>
                                    <Button variant="save" onClick={() => handleExportClick()} style={{ width: '100%', padding: '20px', fontSize: '1.1rem' }}>
                                        <Download size={20} /> {t('exportModal.options.generateBtn', { format: type?.toUpperCase() })}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="vrb-footer">
                    <Button variant="edit" onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }} disabled={isProcessing}>
                        {t('exportModal.cancel')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};
