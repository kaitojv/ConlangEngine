import React, { useState } from 'react';
import Button from '../Buttons/Buttons.jsx';
import { AlertTriangle, Download, ShieldCheck } from 'lucide-react';

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
    const [acknowledged, setAcknowledged] = useState(false);

    if (!isOpen || !preview) return null;

    const toMb = (n) => (n / 1024 / 1024).toFixed(2);
    const canConfirm = acknowledged && !downloadError;

    return (
        <div className="gt-backup-overlay" role="presentation">
            <div className="gt-backup-modal" role="dialog" aria-modal="true" aria-labelledby="gt-backup-title">
                <div className="gt-backup-warning">
                    <AlertTriangle size={20} />
                    <h3 id="gt-backup-title">This cannot be undone</h3>
                </div>

                <p className="gt-backup-lead">
                    Lightening rewrites the point data of every glyph in this project and there is no
                    undo. Export a backup first so you can restore the original glyphs if the result
                    does not look right to you.
                </p>

                <dl className="gt-backup-stats">
                    <div>
                        <dt>Glyphs</dt>
                        <dd>{preview.glyphCount}</dd>
                    </div>
                    <div>
                        <dt>Points</dt>
                        <dd>
                            {preview.beforePoints.toLocaleString()} &rarr; {preview.afterPoints.toLocaleString()}
                        </dd>
                    </div>
                    <div>
                        <dt>Glyph data</dt>
                        <dd>
                            {toMb(preview.beforeBytes)} MB &rarr; {toMb(preview.afterBytes)} MB
                        </dd>
                    </div>
                    <div>
                        <dt>Saved</dt>
                        <dd>
                            {toMb(preview.beforeBytes - preview.afterBytes)} MB (
                            {Math.round(preview.byteReduction * 100)}%)
                        </dd>
                    </div>
                </dl>

                <p className="gt-backup-fidelity">
                    Each glyph keeps its outline within {tolerance}px. Points that sit further than that
                    from the simplified line are kept, so corners and fine detail survive.
                </p>

                <div className="gt-backup-download">
                    {backupInfo ? (
                        <div className="gt-backup-done">
                            <ShieldCheck size={18} />
                            <div>
                                <strong>Backup download started</strong>
                                <span>
                                    {backupInfo.filename} ({(backupInfo.bytes / 1024 / 1024).toFixed(2)} MB).
                                    Check your downloads folder before continuing.
                                </span>
                            </div>
                            <Button variant="default" className="btn-sm" onClick={onDownloadBackup}>
                                <Download size={14} /> Download again
                            </Button>
                        </div>
                    ) : (
                        <Button variant="imp" onClick={onDownloadBackup} style={{ width: '100%' }}>
                            <Download size={16} /> Download backup ({toMb(preview.beforeBytes + preview.afterBytes)} MB)
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
                        I have downloaded the backup and confirmed the file is saved.
                    </span>
                </label>

                <div className="gt-backup-actions">
                    <Button variant="default" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="imp" onClick={onConfirm} disabled={!canConfirm}>
                        Lighten all glyphs
                    </Button>
                </div>
            </div>
        </div>
    );
}
