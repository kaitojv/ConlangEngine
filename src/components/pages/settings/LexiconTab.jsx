import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Search, Edit, Trash2, Check, X, Tag, BookOpen } from 'lucide-react';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import toast from 'react-hot-toast';
import './lexiconTab.css';

export default function LexiconTab() {
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const updateWord = useLexiconStore((state) => state.updateWord);
    
    const { customWordClasses, customTags, updateConfig } = useConfigStore(useShallow(state => ({
        customWordClasses: state.customWordClasses || [],
        customTags: state.customTags || [],
        updateConfig: state.updateConfig
    })));

    const [editingItem, setEditingItem] = useState(null); // { type: 'pos' | 'tag', oldName: string, newName: string }
    const [searchTerm, setSearchTerm] = useState('');
    const [newPOS, setNewPOS] = useState('');
    const [newTag, setNewTag] = useState('');

    // Extract all unique POS from the lexicon
    const allPOS = useMemo(() => {
        const posSet = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'particle', 'conjunction', 'preposition']);
        customWordClasses.forEach(cls => posSet.add(cls));
        lexicon.forEach(entry => {
            if (entry.wordClass) {
                entry.wordClass.split(',').forEach(c => posSet.add(c.trim().toLowerCase()));
            }
        });
        return [...posSet].sort();
    }, [lexicon, customWordClasses]);

    // Extract all unique Tags from the lexicon
    const allTags = useMemo(() => {
        const tagSet = new Set(customTags);
        lexicon.forEach(entry => {
            if (entry.tags) entry.tags.forEach(t => tagSet.add(t.toLowerCase()));
        });
        return [...tagSet].sort();
    }, [lexicon, customTags]);

    const handleGlobalRename = () => {
        const { type, oldName, newName } = editingItem;
        const cleanOld = oldName.trim().toLowerCase();
        const cleanNew = newName.trim().toLowerCase();

        if (!cleanNew || cleanNew === cleanOld) {
            setEditingItem(null);
            return;
        }

        let affectedCount = 0;

        // 1. Update Lexicon
        lexicon.forEach(entry => {
            let changed = false;
            let updatedWordClass = entry.wordClass;
            let updatedTags = [...(entry.tags || [])];

            if (type === 'pos') {
                const classes = entry.wordClass.split(',').map(c => c.trim().toLowerCase());
                if (classes.includes(cleanOld)) {
                    const newClasses = classes.map(c => c === cleanOld ? cleanNew : c);
                    updatedWordClass = [...new Set(newClasses)].join(', ');
                    changed = true;
                }
            } else {
                if (updatedTags.includes(cleanOld)) {
                    const newTags = updatedTags.map(t => t === cleanOld ? cleanNew : t);
                    updatedTags = [...new Set(newTags)];
                    changed = true;
                }
            }

            if (changed) {
                updateWord(entry.id, {
                    wordClass: updatedWordClass,
                    tags: updatedTags
                });
                affectedCount++;
            }
        });

        // 2. Update Global Config
        if (type === 'pos') {
            const newCustomClasses = customWordClasses.map(c => c === cleanOld ? cleanNew : c);
            updateConfig({ customWordClasses: [...new Set(newCustomClasses)] });
        } else {
            const newCustomTags = customTags.map(t => t === cleanOld ? cleanNew : t);
            updateConfig({ customTags: [...new Set(newCustomTags)] });
        }

        toast.success(`Renamed "${oldName}" to "${newName}". Updated ${affectedCount} entries.`);
        setEditingItem(null);
    };

    const handleDelete = (type, name) => {
        const cleanName = name.trim().toLowerCase();
        if (!window.confirm(`Are you sure you want to delete "${name}"? This will remove it from all lexicon entries and settings.`)) return;

        let affectedCount = 0;

        // 1. Update Lexicon
        lexicon.forEach(entry => {
            let changed = false;
            let updatedWordClass = entry.wordClass;
            let updatedTags = [...(entry.tags || [])];

            if (type === 'pos') {
                const classes = entry.wordClass.split(',').map(c => c.trim().toLowerCase());
                if (classes.includes(cleanName)) {
                    updatedWordClass = classes.filter(c => c !== cleanName).join(', ');
                    changed = true;
                }
            } else {
                if (updatedTags.includes(cleanName)) {
                    updatedTags = updatedTags.filter(t => t !== cleanName);
                    changed = true;
                }
            }

            if (changed) {
                updateWord(entry.id, {
                    wordClass: updatedWordClass,
                    tags: updatedTags
                });
                affectedCount++;
            }
        });

        // 2. Update Global Config
        if (type === 'pos') {
            updateConfig({ customWordClasses: customWordClasses.filter(c => c !== cleanName) });
        } else {
            updateConfig({ customTags: customTags.filter(t => t !== cleanName) });
        }

        toast.success(`Deleted "${name}". Updated ${affectedCount} entries.`);
    };

    const handleAddPOS = () => {
        const clean = newPOS.trim().toLowerCase();
        if (!clean) return;
        if (allPOS.includes(clean)) {
            toast.error(`"${clean}" already exists.`);
            return;
        }
        updateConfig({ customWordClasses: [...customWordClasses, clean] });
        setNewPOS('');
        toast.success(`Added Part of Speech: ${clean}`);
    };

    const handleAddTag = () => {
        const clean = newTag.trim().toLowerCase();
        if (!clean) return;
        if (allTags.includes(clean)) {
            toast.error(`Tag "#${clean}" already exists.`);
            return;
        }
        updateConfig({ customTags: [...customTags, clean] });
        setNewTag('');
        toast.success(`Added Semantic Tag: #${clean}`);
    };

    const filteredPOS = allPOS.filter(p => p.includes(searchTerm.toLowerCase()));
    const filteredTags = allTags.filter(t => t.includes(searchTerm.toLowerCase()));

    return (
        <Card className="lexicon-settings-tab">
            <h2 className="flex sg-title">
                <BookOpen /> Global Lexicon Management
            </h2>
            <p className="settings-description">
                Manage your Parts of Speech and Semantic Tags globally. Renaming or deleting here will update all lexicon entries.
            </p>

            <Infobox title="Lexicon Management Tips">
                • <b>Global Rename:</b> Renaming a Part of Speech or Tag here will automatically update every single word in your lexicon.<br />
                • <b>Custom Classes:</b> Add unique categories (like "classifier" or "ideophone") to make your grammar matrix more precise.<br />
                • <b>Clean Slate:</b> Deleting a category here removes it from all words globally. Use this to prune unused tags.
            </Infobox>

            <div className="search-bar-management">
                <Input 
                    placeholder="Search for a POS or Tag..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                >
                    <Search className="search-icon-m" size={18} />
                </Input>
            </div>

            <div className="management-grid">
                <section>
                    <h4 className="management-title pos-title">
                        <BookOpen size={18} /> Parts of Speech ({filteredPOS.length})
                    </h4>
                    <div className="add-management-item">
                        <input 
                            className="management-add-input"
                            placeholder="New POS (e.g. classifier)"
                            value={newPOS}
                            onChange={(e) => setNewPOS(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPOS()}
                        />
                        <Button variant="save" onClick={handleAddPOS} className="btn-sm add-mgmt-btn">Add</Button>
                    </div>
                    <div className="management-list">
                        {filteredPOS.map(pos => (
                            <div key={pos} className="management-item">
                                {editingItem?.type === 'pos' && editingItem?.oldName === pos ? (
                                    <div className="edit-inline">
                                        <input 
                                            autoFocus
                                            value={editingItem.newName}
                                            onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGlobalRename()}
                                        />
                                        <Check size={16} className="icon-save" onClick={handleGlobalRename} />
                                        <X size={16} className="icon-cancel" onClick={() => setEditingItem(null)} />
                                    </div>
                                ) : (
                                    <>
                                        <span className="item-name">{pos}</span>
                                        <div className="item-actions">
                                            <Edit size={14} onClick={() => setEditingItem({ type: 'pos', oldName: pos, newName: pos })} />
                                            <Trash2 size={14} onClick={() => handleDelete('pos', pos)} />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h4 className="management-title tag-title">
                        <Tag size={18} /> Semantic Tags ({filteredTags.length})
                    </h4>
                    <div className="add-management-item">
                        <input 
                            className="management-add-input"
                            placeholder="New Tag (e.g. aquatic)"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        />
                        <Button variant="save" onClick={handleAddTag} className="btn-sm add-mgmt-btn">Add</Button>
                    </div>
                    <div className="management-list">
                        {filteredTags.map(tag => (
                            <div key={tag} className="management-item">
                                {editingItem?.type === 'tag' && editingItem?.oldName === tag ? (
                                    <div className="edit-inline">
                                        <input 
                                            autoFocus
                                            value={editingItem.newName}
                                            onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleGlobalRename()}
                                        />
                                        <Check size={16} className="icon-save" onClick={handleGlobalRename} />
                                        <X size={16} className="icon-cancel" onClick={() => setEditingItem(null)} />
                                    </div>
                                ) : (
                                    <>
                                        <span className="item-name">#{tag}</span>
                                        <div className="item-actions">
                                            <Edit size={14} onClick={() => setEditingItem({ type: 'tag', oldName: tag, newName: tag })} />
                                            <Trash2 size={14} onClick={() => handleDelete('tag', tag)} />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </Card>
    );
}
