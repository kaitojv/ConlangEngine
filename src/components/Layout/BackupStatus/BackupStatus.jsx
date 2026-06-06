// src/components/Layout/BackupStatus/BackupStatus.jsx
// Navigation-bar status indicator for the REST API backup system.
// Hidden entirely when backup is disabled for the current project.

import React from 'react';
import { CloudOff, CloudUpload, Cloud, CloudCog, AlertTriangle, Loader } from 'lucide-react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useBackupStore, BACKUP_STATUS } from '../../../store/useBackupStore.jsx';
import { useIsDesktop } from '../../../utils/device.js';
import './backupstatus.css';

const STATUS_META = {
    [BACKUP_STATUS.SAVED]:   { Icon: Cloud,        label: 'Backed up',           cls: 'ok' },
    [BACKUP_STATUS.UNSAVED]: { Icon: CloudUpload,  label: 'Unsaved changes',     cls: 'pending' },
    [BACKUP_STATUS.SAVING]:  { Icon: Loader,       label: 'Backing up\u2026',    cls: 'saving' },
    [BACKUP_STATUS.OFFLINE]: { Icon: CloudOff,     label: 'Backup server offline', cls: 'offline' },
    [BACKUP_STATUS.ERROR]:   { Icon: AlertTriangle, label: 'Backup failed',      cls: 'error' },
    [BACKUP_STATUS.DISABLED]:{ Icon: CloudCog,     label: 'Backup off',          cls: 'off' },
};

export default function BackupStatus({ onBackupNow }) {
    const enabled = useConfigStore((s) => s.backupSettings?.enabled);
    const status = useBackupStore((s) => s.status);
    const lastError = useBackupStore((s) => s.lastError);
    // Backup is desktop-only (Obsidian plugin) — never show on mobile.
    const isDesktop = useIsDesktop();

    // Only render on desktop and when backup is enabled for this project.
    if (!isDesktop || !enabled) return null;

    const meta = STATUS_META[status] || STATUS_META[BACKUP_STATUS.DISABLED];
    const { Icon, label, cls } = meta;
    const title = lastError && (status === BACKUP_STATUS.ERROR || status === BACKUP_STATUS.OFFLINE)
        ? `${label}: ${lastError}`
        : `${label} (click to back up now)`;

    return (
        <button
            type="button"
            className={`backup-status ${cls}`}
            title={title}
            onClick={onBackupNow}
            aria-label={label}
        >
            <Icon size={15} className={status === BACKUP_STATUS.SAVING ? 'spin' : ''} />
            <span className="backup-status-label">{label}</span>
        </button>
    );
}
