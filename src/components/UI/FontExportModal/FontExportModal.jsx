// src/components/UI/FontExportModal/FontExportModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../Buttons/Buttons.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import {
    collectScriptExportData,
    exportFontArtifacts,
    downloadFontTTF,
    downloadFontPackZip,
} from '@/utils/fontExporter.js';
import { getDefaultScriptId, getScriptData } from '@/utils/scriptResolver.js';
import { Download, Package, Type, Sparkles, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import './fontExportModal.css';

export default function FontExportModal({ isOpen, onClose, initialScriptId = null }) {
    const { t } = useTranslation();
    const config = useConfigStore();
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(
        () => (Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || [])),
        [rawLexicon]
    );

    const scriptSystems = useMemo(() => config.scriptSystems || [], [config.scriptSystems]);
    const defaultScriptId = getDefaultScriptId(config);

    const [selectedScriptId, setSelectedScriptId] = useState(
        () => initialScriptId || defaultScriptId
    );
    const [familyName, setFamilyName] = useState('');
    const [designer, setDesigner] = useState('');
    const version = 'Version 1.0';
    const [includeLatinAliases, setIncludeLatinAliases] = useState(true);
    const [includeUppercaseAliases, setIncludeUppercaseAliases] = useState(true);
    const [includeLigatures, setIncludeLigatures] = useState(true);
    const [logoTriggerMode, setLogoTriggerMode] = useState('colon');
    const [includeGlossLigatures, setIncludeGlossLigatures] = useState(false);
    const [consistentSizeOverride, setConsistentSizeOverride] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [previewFontFamily, setPreviewFontFamily] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [isCompilingPreview, setIsCompilingPreview] = useState(false);

    // Sync selectedScriptId and defaults when opening
    useEffect(() => {
        if (!isOpen) return;
        const targetId = initialScriptId || defaultScriptId;
        setSelectedScriptId(targetId);

        const targetScript = scriptSystems.find(s => s.id === targetId);
        const baseConlang = (config.conlangName || 'Conlang').trim();
        const scriptSuffix = targetScript?.name && scriptSystems.length > 1
            ? ` ${targetScript.name.trim()}`
            : '';
        setFamilyName(`${baseConlang}${scriptSuffix}`);

        const sData = getScriptData(config, targetId);
        const scriptConsistent = sData?.consistentCharacterSize !== undefined
            ? Boolean(sData.consistentCharacterSize)
            : (config.typographySettings?.consistentCharacterSize ?? true);
        setConsistentSizeOverride(scriptConsistent);
        setPreviewFontFamily('');
    }, [isOpen, initialScriptId, defaultScriptId, scriptSystems, config.conlangName, config.typographySettings, config]);

    const exportData = useMemo(() => {
        if (!isOpen) return null;
        return collectScriptExportData(config, lexicon, selectedScriptId, {
            includeLatinAliases,
            includeUppercaseAliases,
            includeLigatures,
            logoTriggerMode,
            includeGlossLigatures,
        });
    }, [
        isOpen,
        config,
        lexicon,
        selectedScriptId,
        includeLatinAliases,
        includeUppercaseAliases,
        includeLigatures,
        logoTriggerMode,
        includeGlossLigatures,
    ]);

    // Populate sensible preview sample when exportData changes
    useEffect(() => {
        if (!isOpen || !exportData) return;
        const sample = exportData.entries
            .slice(0, 12)
            .map(e => (includeLigatures && e.ligature) || (includeLatinAliases && e.aliasChar) || e.char)
            .join(' ');
        setPreviewText(sample);
    }, [isOpen, exportData, includeLigatures, includeLatinAliases]);

    // Clean up temporary preview FontFace on close/unmount
    useEffect(() => {
        if (!previewFontFamily || typeof document === 'undefined' || !document.fonts) return;
        return () => {
            document.fonts.forEach(f => {
                if (f.family === previewFontFamily) {
                    try { document.fonts.delete(f); } catch { /* ignore */ }
                }
            });
        };
    }, [previewFontFamily]);

    const hasGlyphs = (exportData?.stats?.drawnCount || 0) > 0;
    const isLogographicOrHasLogograms = exportData?.scriptType === 'logographic'
        || exportData?.entries?.some(e => e.category === 'logogram');

    const buildOptions = () => ({
        familyName: familyName.trim() || config.conlangName || 'ConlangFont',
        designer: designer.trim(),
        version: version.trim() || 'Version 1.0',
        includeLatinAliases,
        includeUppercaseAliases,
        includeLigatures,
        logoTriggerMode,
        includeGlossLigatures,
        consistentCharacterSize: consistentSizeOverride,
    });

    const handlePreviewCompile = async () => {
        if (!hasGlyphs) return;
        setIsCompilingPreview(true);
        try {
            const artifacts = await exportFontArtifacts(config, lexicon, selectedScriptId, buildOptions());
            const previewName = `ConlangExportPreview_${Date.now()}`;
            const loadedFaces = await Promise.all(
                artifacts.ttfFiles.map(file => {
                    const face = new FontFace(previewName, file.buffer);
                    return face.load();
                })
            );
            loadedFaces.forEach(face => document.fonts.add(face));
            setPreviewFontFamily(previewName);
            toast.success(t('fontExport.previewReadyToast'));
        } catch (err) {
            console.error('Font preview failed:', err);
            toast.error(t('fontExport.exportErrorToast'));
        } finally {
            setIsCompilingPreview(false);
        }
    };

    const handleDownloadTTF = async () => {
        if (!hasGlyphs) {
            return toast.error(t('fontExport.noGlyphsToast'));
        }
        setIsExporting(true);
        try {
            const res = await downloadFontTTF(config, lexicon, selectedScriptId, buildOptions());
            toast.success(t('fontExport.exportedToast', {
                count: res.exportData.stats.drawnCount,
                filename: res.downloadedFilename,
            }));
            useConfigStore.getState().unlockBadge?.('archivist', 'Archivist');
        } catch (err) {
            console.error('TTF export failed:', err);
            toast.error(t('fontExport.exportErrorToast'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadPack = async () => {
        if (!hasGlyphs) {
            return toast.error(t('fontExport.noGlyphsToast'));
        }
        setIsExporting(true);
        try {
            const res = await downloadFontPackZip(config, lexicon, selectedScriptId, buildOptions());
            toast.success(t('fontExport.exportedToast', {
                count: res.exportData.stats.drawnCount,
                filename: res.downloadedFilename,
            }));
            useConfigStore.getState().unlockBadge?.('archivist', 'Archivist');
        } catch (err) {
            console.error('Font Pack export failed:', err);
            toast.error(t('fontExport.exportErrorToast'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={isExporting ? undefined : onClose}
            title={t('fontExport.title')}
            className="modal-wide"
        >
            <div className="fe-modal-wrapper">
                <p className="fe-modal-desc">{t('fontExport.desc')}</p>

                {scriptSystems.length > 1 && (
                    <div className="fe-form-group">
                        <label className="fe-form-label">{t('fontExport.targetScript')}</label>
                        <select
                            className="fe-select"
                            value={selectedScriptId}
                            onChange={(e) => {
                                const nextId = e.target.value;
                                setSelectedScriptId(nextId);
                                const found = scriptSystems.find(s => s.id === nextId);
                                const baseConlang = (config.conlangName || 'Conlang').trim();
                                setFamilyName(found?.name ? `${baseConlang} ${found.name}` : baseConlang);
                                setPreviewFontFamily('');
                            }}
                        >
                            {scriptSystems.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.type})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {exportData && (
                    <div className="fe-stats-row">
                        <div className="fe-stats-badge">
                            <Type size={14} />
                            <span>
                                {t('fontExport.glyphsCount')}{' '}
                                <strong className="fe-stats-count">{exportData.stats.drawnCount}</strong>
                            </span>
                        </div>
                        <div className="fe-stats-badge">
                            <span>
                                {t('fontExport.aliasesCount')}{' '}
                                <strong className="fe-stats-count">{exportData.stats.aliasCount}</strong>
                            </span>
                        </div>
                        <div className="fe-stats-badge">
                            <Sparkles size={14} />
                            <span>
                                {t('fontExport.ligaturesCount')}{' '}
                                <strong className="fe-stats-count">{exportData.stats.ligatureCount}</strong>
                            </span>
                        </div>
                        {exportData.stats.estimatedChunks > 1 && (
                            <div className="fe-stats-badge">
                                <Package size={14} />
                                <span>
                                    {t('fontExport.multiPartCount', { count: exportData.stats.estimatedChunks })}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="fe-grid-2">
                    <div className="fe-form-group">
                        <label className="fe-form-label">{t('fontExport.familyName')}</label>
                        <input
                            type="text"
                            className="fe-input"
                            value={familyName}
                            onChange={(e) => setFamilyName(e.target.value)}
                            placeholder="MyConlang Script"
                        />
                    </div>
                    <div className="fe-form-group">
                        <label className="fe-form-label">{t('fontExport.designer')}</label>
                        <input
                            type="text"
                            className="fe-input"
                            value={designer}
                            onChange={(e) => setDesigner(e.target.value)}
                            placeholder={t('fontExport.designerPlaceholder')}
                        />
                    </div>
                </div>

                <div className="fe-options-card">
                    <span className="fe-form-label">{t('fontExport.mappingOptions')}</span>
                    <div className="fe-checkbox-grid">
                        <label className="fe-checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeLatinAliases}
                                onChange={(e) => setIncludeLatinAliases(e.target.checked)}
                            />
                            {t('fontExport.optLatinAliases')}
                        </label>
                        <label className="fe-checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeUppercaseAliases}
                                onChange={(e) => setIncludeUppercaseAliases(e.target.checked)}
                            />
                            {t('fontExport.optUppercaseAliases')}
                        </label>
                        <label className="fe-checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeLigatures}
                                onChange={(e) => setIncludeLigatures(e.target.checked)}
                            />
                            {t('fontExport.optLigatures')}
                        </label>
                        <label className="fe-checkbox-label">
                            <input
                                type="checkbox"
                                checked={consistentSizeOverride}
                                onChange={(e) => setConsistentSizeOverride(e.target.checked)}
                            />
                            {t('fontExport.optConsistentSize')}
                        </label>
                    </div>

                    {includeLigatures && isLogographicOrHasLogograms && (
                        <div className="fe-grid-2" style={{ marginTop: '0.4rem' }}>
                            <div className="fe-form-group">
                                <label className="fe-form-label">{t('fontExport.logoTriggerLabel')}</label>
                                <select
                                    className="fe-select"
                                    value={logoTriggerMode}
                                    onChange={(e) => setLogoTriggerMode(e.target.value)}
                                >
                                    <option value="colon">{t('fontExport.logoTriggerColon')}</option>
                                    <option value="word">{t('fontExport.logoTriggerWord')}</option>
                                    <option value="none">{t('fontExport.logoTriggerNone')}</option>
                                </select>
                            </div>
                            <div className="fe-form-group" style={{ justifyContent: 'flex-end' }}>
                                <label className="fe-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={includeGlossLigatures}
                                        onChange={(e) => setIncludeGlossLigatures(e.target.checked)}
                                    />
                                    {t('fontExport.optGlossLigatures')}
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {!hasGlyphs ? (
                    <div className="fe-empty-state">
                        {t('fontExport.noGlyphsState')}
                    </div>
                ) : (
                    <div className="fe-preview-box">
                        <div className="fe-preview-header">
                            <span className="fe-form-label">{t('fontExport.previewTitle')}</span>
                            <Button
                                variant="default"
                                className="btn-sm"
                                onClick={handlePreviewCompile}
                                disabled={isCompilingPreview}
                            >
                                {isCompilingPreview
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Eye size={14} />}
                                {t('fontExport.previewBtn')}
                            </Button>
                        </div>
                        <input
                            type="text"
                            className="fe-preview-input"
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            placeholder={t('fontExport.previewPlaceholder')}
                            style={previewFontFamily ? { fontFamily: `'${previewFontFamily}', sans-serif` } : undefined}
                        />
                    </div>
                )}

                <div className="fe-info-box">
                    <strong>{t('fontExport.tipTitle')}</strong> {t('fontExport.tipDesc')}
                </div>

                <div className="fe-modal-actions">
                    <Button variant="default" onClick={onClose} disabled={isExporting}>
                        {t('common.cancel', { defaultValue: 'Cancel' })}
                    </Button>
                    <Button
                        variant="sec"
                        onClick={handleDownloadTTF}
                        disabled={isExporting || !hasGlyphs}
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {t('fontExport.downloadTtfBtn')}
                    </Button>
                    <Button
                        variant="imp"
                        onClick={handleDownloadPack}
                        disabled={isExporting || !hasGlyphs}
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                        {t('fontExport.downloadPackBtn')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
