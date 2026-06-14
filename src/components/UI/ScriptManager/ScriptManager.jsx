// src/components/UI/ScriptManager/ScriptManager.jsx
import React, { useState, useRef } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { SCRIPT_TYPES, normalizeScriptName, getDefaultScriptId } from '../../../utils/scriptResolver.js';
import { Plus, Trash2, Edit2, Check, X, Copy, AlertTriangle, GripVertical, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import './scriptManager.css';

const TYPE_LABELS = {
    alphabetic: 'Alphabetic',
    syllabic: 'Syllabic',
    logographic: 'Logographic',
    featural_block: 'Featural Block',
};

export default function ScriptManager() {
    const scriptSystems = useConfigStore(state => state.scriptSystems) || [];
    const scriptRules = useConfigStore(state => state.scriptRules) || {};
    const addScriptSystem = useConfigStore(state => state.addScriptSystem);
    const removeScriptSystem = useConfigStore(state => state.removeScriptSystem);
    const updateScriptSystem = useConfigStore(state => state.updateScriptSystem);
    const setDefaultScriptSystem = useConfigStore(state => state.setDefaultScriptSystem);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverDefault, setDragOverDefault] = useState(false);

    const defaultScriptId = scriptRules.defaultScriptId || getDefaultScriptId({ scriptSystems, scriptRules });
    const defaultScript = scriptSystems.find(s => s.id === defaultScriptId) || scriptSystems[0];
    const otherScripts = scriptSystems.filter(s => s.id !== defaultScriptId);

    const handleAdd = () => {
        const count = scriptSystems.length + 1;
        addScriptSystem({
            name: `Script ${count}`,
            type: 'alphabetic',
        });
        toast.success('Script added');
    };

    const handleDuplicate = (script) => {
        const count = scriptSystems.length + 1;
        addScriptSystem({
            ...script,
            id: undefined,
            name: `${script.name} ${count}`,
            isDefault: false,
        });
        toast.success('Script duplicated');
    };

    const handleStartRename = (script) => {
        setEditingId(script.id);
        setEditName(script.name);
    };

    const handleSaveRename = (id) => {
        const clean = editName.trim();
        if (!clean) {
            toast.error('Script name cannot be empty');
            return;
        }
        const duplicate = scriptSystems.find(s => s.id !== id && s.name.toLowerCase() === clean.toLowerCase());
        if (duplicate) {
            toast.error(`Name "${clean}" is already used by another script`);
            return;
        }
        updateScriptSystem(id, { name: clean });
        setEditingId(null);
        toast.success('Script renamed');
    };

    const handleCancelRename = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleDelete = (id) => {
        if (scriptSystems.length <= 1) {
            toast.error('Cannot remove the last script');
            return;
        }
        removeScriptSystem(id);
        setConfirmDelete(null);
        toast.success('Script removed');
    };

    const handleSetDefault = (id) => {
        setDefaultScriptSystem(id);
        toast.success('Default script updated');
    };

    const handleTypeChange = (id, type) => {
        updateScriptSystem(id, { type });
    };

    const getRuleCount = (scriptId) => {
        let count = 0;
        if (scriptRules.wordClasses) {
            Object.values(scriptRules.wordClasses).forEach(v => { if (v === scriptId) count++; });
        }
        if (scriptRules.tags) {
            Object.values(scriptRules.tags).forEach(v => { if (v === scriptId) count++; });
        }
        if (scriptRules.personCategories) {
            Object.values(scriptRules.personCategories).forEach(v => { if (v === scriptId) count++; });
        }
        return count;
    };

    // Drag handlers
    const handleDragStart = (e, scriptId) => {
        setDraggingId(scriptId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', scriptId);
    };

    const handleDragEnd = () => {
        setDraggingId(null);
        setDragOverDefault(false);
    };

    const handleDragOverDefault = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDefault(true);
    };

    const handleDragLeaveDefault = () => {
        setDragOverDefault(false);
    };

    const handleDropOnDefault = (e) => {
        e.preventDefault();
        setDragOverDefault(false);
        const droppedId = e.dataTransfer.getData('text/plain');
        if (droppedId && droppedId !== defaultScriptId) {
            handleSetDefault(droppedId);
        }
        setDraggingId(null);
    };

    const renderCard = (script, isDefaultSlot) => {
        const isDefault = script.id === defaultScriptId;
        const isEditing = editingId === script.id;
        const ruleCount = getRuleCount(script.id);
        const isDragging = draggingId === script.id;

        return (
            <div
                key={script.id}
                className={`script-card glass ${isDefault ? 'script-card-default' : ''} ${isDragging ? 'script-card-dragging' : ''}`}
                draggable={!isEditing}
                onDragStart={(e) => handleDragStart(e, script.id)}
                onDragEnd={handleDragEnd}
            >
                {!isDefault && (
                    <div className="script-card-drag-handle" title="Drag to reorder">
                        <GripVertical size={16} />
                    </div>
                )}
                <div className="script-card-body">
                    <div className="script-card-top">
                        <div className="script-card-name-row">
                            {isEditing ? (
                                <div className="script-name-edit">
                                    <input
                                        className="fi script-name-input"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveRename(script.id);
                                            if (e.key === 'Escape') handleCancelRename();
                                        }}
                                        autoFocus
                                    />
                                    <button className="script-btn script-btn-save" onClick={() => handleSaveRename(script.id)}>
                                        <Check size={14} />
                                    </button>
                                    <button className="script-btn script-btn-cancel" onClick={handleCancelRename}>
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <span className="script-card-name">
                                    {script.name}
                                </span>
                            )}
                        </div>

                        <div className="script-card-actions">
                            {!isEditing && (
                                <>
                                    <button className="script-btn" title="Rename" onClick={() => handleStartRename(script)}>
                                        <Edit2 size={14} />
                                    </button>
                                    <button className="script-btn" title="Duplicate" onClick={() => handleDuplicate(script)}>
                                        <Copy size={14} />
                                    </button>
                                    {confirmDelete === script.id ? (
                                        <span className="script-confirm-delete">
                                            <button className="script-btn script-btn-danger" onClick={() => handleDelete(script.id)}>
                                                <Check size={14} /> Confirm
                                            </button>
                                            <button className="script-btn" onClick={() => setConfirmDelete(null)}>
                                                <X size={14} />
                                            </button>
                                        </span>
                                    ) : (
                                        <button
                                            className="script-btn script-btn-danger"
                                            title="Remove"
                                            onClick={() => {
                                                if (ruleCount > 0) {
                                                    setConfirmDelete(script.id);
                                                } else {
                                                    handleDelete(script.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {confirmDelete === script.id && ruleCount > 0 && (
                        <div className="script-warning">
                            <AlertTriangle size={14} />
                            <span>{ruleCount} rule{ruleCount !== 1 ? 's' : ''} point to this script. They will be cleared.</span>
                        </div>
                    )}

                    <div className="script-card-meta">
                        <label className="script-type-label">Type:</label>
                        <select
                            className="script-type-select"
                            value={script.type}
                            onChange={e => handleTypeChange(script.id, e.target.value)}
                        >
                            {SCRIPT_TYPES.map(t => (
                                <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
                            ))}
                        </select>
                        <div className="script-card-meta-spacer" />
                        <button
                            className={`script-default-btn ${isDefault ? 'script-default-btn-active' : ''}`}
                            onClick={() => !isDefault && handleSetDefault(script.id)}
                            title={isDefault ? 'This is the default script' : 'Set as default script'}
                        >
                            <Star size={13} />
                            {isDefault ? 'Default' : 'Set as default'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="script-manager">
            <div className="script-manager-header">
                <h3 className="sg-title">Script Systems</h3>
                <button className="btn-add" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Add Script
                </button>
            </div>

            <p className="script-manager-desc">
                Define multiple writing systems for your conlang. Each script can be alphabetic, syllabic, logographic, or featural block.
            </p>

            {/* Default script slot */}
            {defaultScript && (
                <div className="script-default-section">
                    <label className="script-section-label">Default Script</label>
                    <div
                        className="script-default-slot"
                        onDragOver={handleDragOverDefault}
                        onDragLeave={handleDragLeaveDefault}
                        onDrop={handleDropOnDefault}
                    >
                        <div className={dragOverDefault ? 'script-card-ghost-slot' : ''}>
                            {renderCard(defaultScript, true)}
                        </div>
                        <div className={`script-drop-separator ${dragOverDefault ? 'script-drop-separator-visible' : ''}`}>
                            <span className="script-drop-separator-label">Drop to make default</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Other scripts */}
            {otherScripts.length > 0 && (
                <div className="script-other-section">
                    <label className="script-section-label">Other Scripts</label>
                    <div className="script-list">
                        {/* Ghost preview: current default slides here when dragging over default slot */}
                        {dragOverDefault && draggingId && defaultScript && (
                            <div className="script-card-ghost-preview">
                                {renderCard(defaultScript, false)}
                            </div>
                        )}
                        {otherScripts.map(script => renderCard(script, false))}
                    </div>
                </div>
            )}
        </div>
    );
}
