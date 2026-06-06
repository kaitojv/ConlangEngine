// src/components/pages/settings/BackupBrowser.jsx
// Browse projects stored on the backup server and switch the active project to
// one of them. Each project shows its root-level metadata as a preview so you
// can tell them apart, plus its individual backup versions.

import { useState, useEffect, useCallback } from 'react';
import Modal from '../../UI/Modal/Modal.jsx';
import { getConlangIcon } from '../../../utils/iconMap.jsx';
import { listProjects, getLatestBackup, getBackupVersion } from '../../../utils/backupClient.js';
import { restoreBackupPayload } from '../../../utils/backupRestore.js';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import {
    RefreshCw, Loader, ChevronDown, ChevronRight,
    Clock, Layers, HardDrive, User, Check, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './backupbrowser.css';

function formatBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(iso) {
    if (!iso) return 'never';
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function BackupBrowser({ isOpen, onClose, endpoint }) {
    const activeProjectId = useConfigStore((s) => s.projectId);

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);   // projectId whose versions are open
    const [restoringKey, setRestoringKey] = useState(null); // `${projectId}:${version|latest}`

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await listProjects(endpoint);
            setProjects(list);
        } catch (err) {
            setError(err?.message || 'Failed to load projects from server.');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    }, [endpoint]);

    // Fetch the list whenever the modal opens.
    useEffect(() => {
        if (isOpen) refresh();
    }, [isOpen, refresh]);

    // Load a specific backup (or the latest) into the workspace and switch project.
    const useProject = async (projectId, version) => {
        const isLatest = !version;
        const confirmMsg = `Load "${projectId}"${isLatest ? ' (latest)' : ` (${version})`} into your workspace?\n\nThis replaces your CURRENT config and lexicon. Make sure your current work is backed up first.`;
        if (!window.confirm(confirmMsg)) return;

        const key = `${projectId}:${version || 'latest'}`;
        setRestoringKey(key);
        try {
            const payload = isLatest
                ? await getLatestBackup(endpoint, projectId)
                : await getBackupVersion(endpoint, projectId, version);

            if (!payload) {
                toast.error('That backup could not be found on the server.');
                return;
            }

            // restoreBackupPayload sets projectId in state via setFullConfig.
            const meta = projects.find((p) => p.projectId === projectId);
            const restoredId = restoreBackupPayload(payload, { lastBackupTime: meta?.lastBackupTime });
            toast.success(`Loaded project "${restoredId || projectId}"`);
            onClose();
        } catch (err) {
            toast.error(err?.message || 'Failed to load backup.');
        } finally {
            setRestoringKey(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Server Projects">
            <div className="bb-toolbar">
                <p className="bb-subtitle">
                    Projects stored on <code>{endpoint}</code>. Select one to load it into your workspace.
                </p>
                <button className="bb-refresh" onClick={refresh} disabled={loading}>
                    {loading ? <Loader size={15} className="bb-spin" /> : <RefreshCw size={15} />}
                    Refresh
                </button>
            </div>

            {loading && projects.length === 0 && (
                <div className="bb-state"><Loader size={20} className="bb-spin" /> Loading projects…</div>
            )}

            {error && (
                <div className="bb-state bb-error">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {!loading && !error && projects.length === 0 && (
                <div className="bb-state">No projects found on the server yet.</div>
            )}

            <div className="bb-list">
                {projects.map((p) => {
                    const isActive = p.projectId === activeProjectId;
                    const isOpenRow = expanded === p.projectId;
                    return (
                        <div key={p.projectId} className={`bb-card ${isActive ? 'active' : ''}`}>
                            <div className="bb-card-main">
                                <div className="bb-icon">{getConlangIcon(p.conlangIcon || 'Globe', 22)}</div>

                                <div className="bb-info">
                                    <div className="bb-title-row">
                                        <span className="bb-name">{p.conlangName || 'Untitled'}</span>
                                        {isActive && <span className="bb-badge-active"><Check size={12} /> Active</span>}
                                    </div>
                                    {p.description && <p className="bb-desc">{p.description}</p>}

                                    <div className="bb-meta">
                                        {p.authorName && <span><User size={12} /> {p.authorName}</span>}
                                        {p.phonologyTypes && <span className="bb-tag">{p.phonologyTypes}</span>}
                                        {p.alphabeticScript && <span className="bb-tag">{p.alphabeticScript}</span>}
                                    </div>

                                    <div className="bb-meta bb-meta-dim">
                                        <span><Clock size={12} /> {formatTime(p.lastBackupTime)}</span>
                                        <span><Layers size={12} /> {p.totalBackups || 0} backups ({p.latestVersion || '—'})</span>
                                        <span><HardDrive size={12} /> {formatBytes(p.totalSizeBytes)}</span>
                                    </div>
                                    <code className="bb-pid">{p.projectId}</code>
                                </div>

                                <div className="bb-actions">
                                    <button
                                        className="bb-use-btn"
                                        onClick={() => useProject(p.projectId)}
                                        disabled={restoringKey === `${p.projectId}:latest`}
                                    >
                                        {restoringKey === `${p.projectId}:latest`
                                            ? <Loader size={14} className="bb-spin" />
                                            : <Check size={14} />}
                                        Use latest
                                    </button>
                                    {Array.isArray(p.backups) && p.backups.length > 0 && (
                                        <button
                                            className="bb-versions-toggle"
                                            onClick={() => setExpanded(isOpenRow ? null : p.projectId)}
                                        >
                                            {isOpenRow ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            Versions
                                        </button>
                                    )}
                                </div>
                            </div>

                            {isOpenRow && Array.isArray(p.backups) && (
                                <div className="bb-versions">
                                    {p.backups.map((b) => (
                                        <div key={b.version} className="bb-version-row">
                                            <span className="bb-version-name">{b.version}</span>
                                            <span className="bb-version-meta">{formatTime(b.timestamp)}</span>
                                            <span className="bb-version-meta">{formatBytes(b.sizeBytes)}</span>
                                            <button
                                                className="bb-version-use"
                                                onClick={() => useProject(p.projectId, b.version)}
                                                disabled={restoringKey === `${p.projectId}:${b.version}`}
                                            >
                                                {restoringKey === `${p.projectId}:${b.version}`
                                                    ? <Loader size={12} className="bb-spin" />
                                                    : 'Load'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
}
