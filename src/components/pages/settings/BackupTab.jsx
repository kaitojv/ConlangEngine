// src/components/pages/settings/BackupTab.jsx
// Per-project configuration for the REST API backup system (see https://github.com/niruhsa/ConlangEngine-Obsidian-Backup/blob/master/README.md).
// Works independently of cloud sync and manual save/export.

import { useState, useEffect } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useBackupStore, BACKUP_STATUS } from '../../../store/useBackupStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import { Cloud, CheckCircle2, XCircle, Server, FolderOpen } from 'lucide-react';
import { checkHealth } from '../../../utils/backupClient.js';
import BackupBrowser from './BackupBrowser.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import './backuptab.css';

const DEFAULTS = {
    enabled: false,
    endpoint: 'http://localhost:3000',
    autosaveEnabled: true,
    autosaveIntervalMinutes: 5,
    onChangeEnabled: false,
    debounceMs: 2500,
    reuseEnabled: true,
    reuseWindowMinutes: 10,
};

const STATUS_TEXT = {
    [BACKUP_STATUS.SAVED]: 'Backed up',
    [BACKUP_STATUS.UNSAVED]: 'Unsaved changes',
    [BACKUP_STATUS.SAVING]: 'Backing up…',
    [BACKUP_STATUS.OFFLINE]: 'Backup server offline',
    [BACKUP_STATUS.ERROR]: 'Backup failed',
    [BACKUP_STATUS.DISABLED]: 'Disabled',
};

export default function BackupTab() {
    const { t } = useTranslation();
    const settings = useConfigStore((s) => s.backupSettings) || DEFAULTS;
    const updateConfig = useConfigStore((s) => s.updateConfig);
    const status = useBackupStore((s) => s.status);
    const [testing, setTesting] = useState(false);
    const [browserOpen, setBrowserOpen] = useState(false);
    // null = not yet checked, true = reachable, false = offline.
    const [serverOnline, setServerOnline] = useState(null);

    // Patch a single backupSettings field while preserving the rest.
    const patch = (changes) =>
        updateConfig({ backupSettings: { ...DEFAULTS, ...settings, ...changes } });

    // Poll the server health so the project browser can be gated on connectivity.
    // Runs regardless of whether backup is enabled, and re-checks when the
    // endpoint changes or the browser modal closes.
    useEffect(() => {
        let cancelled = false;
        const ping = async () => {
            const ok = await checkHealth(settings.endpoint);
            if (!cancelled) setServerOnline(ok);
        };
        setServerOnline(null);
        ping();
        const id = setInterval(ping, 20000);
        return () => { cancelled = true; clearInterval(id); };
    }, [settings.endpoint]);

    const testConnection = async () => {
        setTesting(true);
        const ok = await checkHealth(settings.endpoint);
        setTesting(false);
        setServerOnline(ok);
        if (ok) toast.success(t('settings.backup.connected'));
        else toast.error(t('settings.backup.unreachable'));
    };

    return (
        <Card>
            <h2 className="flex sg-title"><Cloud /> {t('settings.backup.title')}</h2>
            <p className="settings-description">
                {t('settings.backup.desc')}
            </p>

            <Infobox>
                {t('settings.backup.apiGuideDesc')}
            </Infobox>

            <Infobox title={t('settings.backup.obsidianGuideTitle')}>
                <span dangerouslySetInnerHTML={{ __html: t('settings.backup.obsidianGuideDesc') }} />
            </Infobox>

            {/* Master enable */}
            <label className="bk-toggle-row">
                <div>
                    <span className="bk-toggle-title">{t('settings.backup.enableBackup')}</span>
                    <span className="bk-toggle-sub">{t('settings.backup.enableBackupDesc')}</span>
                </div>
                <input
                    type="checkbox"
                    className="bk-checkbox"
                    checked={!!settings.enabled}
                    onChange={(e) => patch({ enabled: e.target.checked })}
                />
            </label>

            {settings.enabled && (
                <span className={`bk-status-pill bk-${status}`}>
                    Current status: {STATUS_TEXT[status] || 'Unknown'}
                </span>
            )}

            {/* Endpoint */}
            <div className="bk-section">
                <Input
                    label={t('settings.backup.serverEndpoint')}
                    placeholder="http://localhost:3000"
                    value={settings.endpoint}
                    onChange={(e) => patch({ endpoint: e.target.value })}
                />
                <span className="bk-hint">
                    Full URL including transport, host and port (e.g. <code>http://localhost:3000</code>
                    {' '}or <code>https://my-host:8443</code>).
                </span>
                <div className="bk-btn-row">
                    <button className="bk-test-btn" onClick={testConnection} disabled={testing}>
                        {testing ? <Server size={15} /> : <CheckCircle2 size={15} />}
                        {testing ? t('settings.backup.testing') : t('settings.backup.testConnection')}
                    </button>
                    <button
                        className="bk-test-btn"
                        onClick={() => setBrowserOpen(true)}
                        disabled={serverOnline !== true}
                        title={serverOnline === true
                            ? 'Browse projects stored on the backup server'
                            : serverOnline === null
                                ? 'Checking connection to the backup server…'
                                : 'Unavailable — the backup server is offline. Reconnect to browse projects.'}
                    >
                        <FolderOpen size={15} /> {t('settings.backup.browseProjects')}
                    </button>
                </div>
                {serverOnline === false && (
                    <span className="bk-offline-hint">
                        <XCircle size={13} /> {t('settings.backup.serverOffline')}
                    </span>
                )}
            </div>

            {/* Autosave */}
            <div className="bk-section">
                <label className="bk-toggle-row">
                    <div>
                        <span className="bk-toggle-title">Autosave on a timer</span>
                        <span className="bk-toggle-sub">Back up periodically while you work.</span>
                    </div>
                    <input
                        type="checkbox"
                        className="bk-checkbox"
                        checked={!!settings.autosaveEnabled}
                        onChange={(e) => patch({ autosaveEnabled: e.target.checked })}
                    />
                </label>
                {settings.autosaveEnabled && (
                    <Input
                        label="Autosave interval (minutes)"
                        type="number"
                        min={1}
                        value={settings.autosaveIntervalMinutes}
                        onChange={(e) => patch({ autosaveIntervalMinutes: Math.max(1, Number(e.target.value) || 1) })}
                    />
                )}
            </div>

            {/* On-change backup */}
            <div className="bk-section">
                <label className="bk-toggle-row">
                    <div>
                        <span className="bk-toggle-title">Back up on every change</span>
                        <span className="bk-toggle-sub">
                            Saves shortly after each committed change. Typing waits until you pause;
                            dialogs only back up once you press Save/Update.
                        </span>
                    </div>
                    <input
                        type="checkbox"
                        className="bk-checkbox"
                        checked={!!settings.onChangeEnabled}
                        onChange={(e) => patch({ onChangeEnabled: e.target.checked })}
                    />
                </label>

                {settings.onChangeEnabled && (
                    <>
                        <Input
                            label="Typing settle delay (milliseconds)"
                            type="number"
                            min={250}
                            step={250}
                            value={settings.debounceMs}
                            onChange={(e) => patch({ debounceMs: Math.max(250, Number(e.target.value) || 2500) })}
                        />

                        <label className="bk-toggle-row">
                            <div>
                                <span className="bk-toggle-title">Reuse one backup per window</span>
                                <span className="bk-toggle-sub">
                                    Overwrite the same backup version for a period instead of creating
                                    a new version on every change.
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                className="bk-checkbox"
                                checked={!!settings.reuseEnabled}
                                onChange={(e) => patch({ reuseEnabled: e.target.checked })}
                            />
                        </label>

                        {settings.reuseEnabled && (
                            <Input
                                label="Reuse window (minutes)"
                                type="number"
                                min={1}
                                value={settings.reuseWindowMinutes}
                                onChange={(e) => patch({ reuseWindowMinutes: Math.max(1, Number(e.target.value) || 10) })}
                            />
                        )}
                    </>
                )}
            </div>

            {!settings.enabled && (
                <p className="bk-disabled-note">
                    <XCircle size={14} /> Backup is currently disabled for this project.
                </p>
            )}

            <BackupBrowser
                isOpen={browserOpen}
                onClose={() => setBrowserOpen(false)}
                endpoint={settings.endpoint}
            />
        </Card>
    );
}
