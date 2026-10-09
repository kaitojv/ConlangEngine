import React, { useState } from 'react';
import Button from '../Buttons/Buttons.jsx';
import { AlertTriangle, Download, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation.jsx';

/**
 * Confirmation gate for the irreversible "Lighten all glyphs" rewrite.
 *
 * The backup is mandatory rather than advisory. A user who later regrets the
 * change has no undo, so the only thing standing between them and lost work is
 * a copy of the original point data, and this makes that copy a precondition
 * rather than a suggestion they can dismiss.
 *
 * Note the limit of what a web page can promise: clicking the download button
 * asks the browser to save a file, and the browser reports back when it
 * accepts the request, not when the write to disk has finished. The checkbox
 * therefore records a deliberate user action rather than a verified fact, and
 * the wording above it says so plainly instead of implying certainty we cannot
 * deliver.
 */
export default function GlyphLightenBackupModal({
    isOpen,
    onCancel,
    onConfirm,
    preview,
    tolerance,
    onDownloadBackup,
    backupInfo,
    downloadError,
}) {
    const { t } = useTranslation();
    const [acknowledged, setAcknowledged] = useState(false);

    if (!isOpen || !preview) return null;

    const toMb = (n) => (n / 1024 / 1024).toFixed(2);
    const canConfirm = acknowledged && !downloadError;

    return (
        <div className="gt-backup-overlay" role="presentation">
            <div className="gt-backup-modal" role="dialog" aria-modal="true" aria-labelledby="gt-backup-title">
                <div className="gt-backup-warning">
                    <AlertTriangle size={20} />
                    <h3 id="gt-backup-title">{t('settings.graphism.backupModalTitle')}</h3>
                </div>

                <p className="gt-backup-lead">
                    {t('settings.graphism.backupModalLead')}
                </p>

                <dl className="gt-backup-stats">
                    <div>
                        <dt>{t('settings.graphism.statGlyphs')}</dt>
                        <dd>{preview.glyphCount}</dd>
                    </div>
                    <div>
                        <dt>{t('settings.graphism.statPoints')}</dt>
                        <dd>
                            {preview.beforePoints.toLocaleString()} &rarr; {preview.afterPoints.toLocaleString()}
                        </dd>
                    </div>
                    <div>
                        <dt>{t('settings.graphism.statGlyphData')}</dt>
                        <dd>
                            {toMb(preview.beforeBytes)} MB &rarr; {toMb(preview.afterBytes)} MB
                        </dd>
                    </div>
                    <div>
                        <dt>{t('settings.graphism.statSaved')}</dt>
                        <dd>
                            {toMb(preview.beforeBytes - preview.afterBytes)} MB (
                            {Math.round(preview.byteReduction * 100)}%)
                        </dd>
                    </div>
                </dl>

                <p className="gt-backup-fidelity">
                    {t('settings.graphism.backupFidelityText', { tolerance })}
                </p>

                <div className="gt-backup-download">
                    {backupInfo ? (
                        <div className="gt-backup-done">
                            <ShieldCheck size={18} />
                            <div>
                                <strong>{t('settings.graphism.backupDownloadStarted')}</strong>
                                <span>
                                    {t('settings.graphism.backupCheckFolder', { filename: backupInfo.filename, size: (backupInfo.bytes / 1024 / 1024).toFixed(2) })}
                                </span>
                            </div>
                            <Button variant="default" className="btn-sm" onClick={onDownloadBackup}>
                                <Download size={14} /> {t('settings.graphism.downloadAgain')}
                            </Button>
                        </div>
                    ) : (
                        <Button variant="imp" onClick={onDownloadBackup} style={{ width: '100%' }}>
                            <Download size={16} /> {t('settings.graphism.downloadBackupBtn', { size: toMb(preview.beforeBytes + preview.afterBytes) })}
                        </Button>
                    )}
                    {downloadError && (
                        <p className="gt-backup-error" role="alert">
                            {downloadError}
                        </p>
                    )}
                </div>

                <label className="gt-backup-ack">
                    <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                    <span>
                        {t('settings.graphism.backupAckCheckbox')}
                    </span>
                </label>

                <div className="gt-backup-actions">
                    <Button variant="default" onClick={onCancel}>
                        {t('settings.graphism.backupCancelBtn')}
                    </Button>
                    <Button variant="imp" onClick={onConfirm} disabled={!canConfirm}>
                        {t('settings.graphism.lightenTitle')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
