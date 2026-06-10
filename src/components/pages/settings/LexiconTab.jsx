import React, { useState, useMemo, useRef } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Search, Edit, Trash2, Check, X, Tag, BookOpen, Sparkles, Loader2, Link, FileText } from 'lucide-react';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import toast from 'react-hot-toast';
import { getTagsForTranslation } from '../../../utils/semanticTagger.js';
import { fetchSynonymOptions, fetchDefinitionForWord } from '../../../utils/semanticUtils.js';
import './lexiconTab.css';

export default function LexiconTab() {
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const updateWord = useLexiconStore((state) => state.updateWord);
    
    const { customWordClasses, customTags, updateConfig } = useConfigStore(useShallow(state => ({
        customWordClasses: state.customWordClasses || [],
        customTags: state.customTags || [],
        updateConfig: state.updateConfig
    })));

    const abortDefRef = useRef(false);

    const [editingItem, setEditingItem] = useState(null); // { type: 'pos' | 'tag', oldName: string, newName: string }
    const [searchTerm, setSearchTerm] = useState('');
    const [newPOS, setNewPOS] = useState('');
    const [newTag, setNewTag] = useState('');
    
    const [isAutoTagging, setIsAutoTagging] = useState(false);
    const [autoTagProgress, setAutoTagProgress] = useState(0);

    const [isAutoRelating, setIsAutoRelating] = useState(false);
    const [autoRelateProgress, setAutoRelateProgress] = useState(0);

    const [isAutoDefining, setIsAutoDefining] = useState(false);
    const [autoDefineProgress, setAutoDefineProgress] = useState(0);

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

    const handleAutoCategorize = async () => {
        if (!window.confirm("This will analyze your entire lexicon and automatically apply semantic tags (like 'Food', 'Animals', 'Verbs') based on English translations. This may take a few minutes. Proceed?")) return;
        
        setIsAutoTagging(true);
        setAutoTagProgress(0);
        
        let processedCount = 0;
        let updatedCount = 0;
        const total = lexicon.length;
        
        for (let i = 0; i < total; i++) {
            const entry = lexicon[i];
            
            // Skip if they already have decent semantic tags
            const hasSemanticTags = entry.tags && entry.tags.some(t => !['Nouns', 'Verbs', 'Adjectives', 'Misc'].includes(t));
            
            if (!hasSemanticTags && entry.translation) {
                // Use offline NLP and the massive dictionary (Instant)
                let newTags = await getTagsForTranslation(entry.translation, true);

                const finalTags = [...new Set([...(entry.tags || []), ...newTags])].filter(t => t !== 'Misc');
                
                if (finalTags.length > 0 && JSON.stringify(finalTags) !== JSON.stringify(entry.tags)) {
                    updateWord(entry.id, { tags: finalTags });
                    updatedCount++;
                }
            }
            
            processedCount++;
            if (processedCount % 5 === 0) {
                setAutoTagProgress(Math.round((processedCount / total) * 100));
                // Yield to event loop to update UI
                await new Promise(r => setTimeout(r, 10));
            }
        }
        
        // Refresh custom tags configuration just in case
        const tagSet = new Set(customTags);
        lexicon.forEach(entry => {
            if (entry.tags) entry.tags.forEach(t => tagSet.add(t.toLowerCase()));
        });
        updateConfig({ customTags: [...tagSet].sort() });
        
        setIsAutoTagging(false);
        setAutoTagProgress(0);
        toast.success(`Auto-categorization complete! Added tags to ${updatedCount} words.`);
    };

    const handleAutoRelate = async () => {
        if (!window.confirm("This will scan your lexicon and use the Semantic API to automatically find related concepts/synonyms for words that don't have them yet. Proceed?")) return;
        
        setIsAutoRelating(true);
        setAutoRelateProgress(0);
        
        let processedCount = 0;
        let updatedCount = 0;
        const total = lexicon.length;
        
        for (let i = 0; i < total; i++) {
            const entry = lexicon[i];
            
            // Only process if it has a translation and few/no related words
            if (entry.translation && (!entry.relatedWords || entry.relatedWords.length < 3)) {
                try {
                    const results = await fetchSynonymOptions(entry.translation);
                    if (results && results.length > 0) {
                        const newWords = results.map(r => r.lemma.toLowerCase());
                        const topPicks = [...new Set(newWords)].slice(0, 5);
                        
                        const finalRelated = [...new Set([...(entry.relatedWords || []), ...topPicks])];
                        
                        if (JSON.stringify(finalRelated) !== JSON.stringify(entry.relatedWords || [])) {
                            updateWord(entry.id, { relatedWords: finalRelated });
                            updatedCount++;
                        }
                    }
                } catch (e) {
                    console.error("Failed auto-relating", entry.translation);
                }
            }
            
            processedCount++;
            if (processedCount % 5 === 0) {
                setAutoRelateProgress(Math.round((processedCount / total) * 100));
                // Yield to event loop to update UI
                await new Promise(r => setTimeout(r, 10));
            }
            // Add a small delay to avoid hammering the Datamuse API too hard
            await new Promise(r => setTimeout(r, 150));
        }
        
        setIsAutoRelating(false);
        setAutoRelateProgress(0);
        toast.success(`Auto-relating complete! Added semantic links to ${updatedCount} words.`);
    };

    const handleAutoDefine = () => {
        const doAutoDefine = async (shouldOverwrite) => {
            abortDefRef.current = false;
            setIsAutoDefining(true);
            setAutoDefineProgress(0);

            let processedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;
            const total = lexicon.length;

            for (let i = 0; i < total; i++) {
                if (abortDefRef.current) {
                    toast.error("Generation cancelled.");
                    break;
                }

                const entry = lexicon[i];

                // Skip entries without a translation
                if (!entry.translation) {
                    processedCount++;
                    continue;
                }

                // Skip entries that already have a definition (unless overwrite)
                if (!shouldOverwrite && entry.definition && entry.definition.trim()) {
                    skippedCount++;
                    processedCount++;
                    continue;
                }

                try {
                    const def = await fetchDefinitionForWord(entry.translation, entry.wordClass);
                    if (def) {
                        updateWord(entry.id, { definition: def });
                        updatedCount++;
                    }
                } catch (e) {
                    console.error("Failed auto-defining", entry.translation);
                }

                processedCount++;
                if (processedCount % 5 === 0) {
                    setAutoDefineProgress(Math.round((processedCount / total) * 100));
                    await new Promise(r => setTimeout(r, 10));
                }
                // Rate limit to respect APIs
                await new Promise(r => setTimeout(r, 150));
            }

            setIsAutoDefining(false);
            setAutoDefineProgress(0);
            const skipMsg = skippedCount > 0 ? ` (${skippedCount} skipped — already had definitions)` : '';
            toast.success(`Auto-define complete! Generated definitions for ${updatedCount} words.${skipMsg}`);
        };

        // Show confirmation toast with overwrite checkbox
        let overwriteChecked = false;
        toast.custom((t) => (
            <div className="custom-toast-v">
                <strong>📖 Generate Full Definitions</strong>
                <span>This will look up English definitions for all <b>{lexicon.length}</b> entries using Datamuse and Wiktionary. This may take a few minutes.</span>
                <label className="auto-define-overwrite-label">
                    <input
                        type="checkbox"
                        defaultChecked={false}
                        onChange={(e) => { overwriteChecked = e.target.checked; }}
                    />
                    Regenerate existing definitions too
                </label>
                <div className="toast-actions-v">
                    <button onClick={() => {
                        toast.dismiss(t.id);
                        doAutoDefine(overwriteChecked);
                    }} className="btn-v btn-acc-v">Generate Definitions</button>
                    <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                </div>
            </div>
        ), { duration: Infinity, id: 'auto-define-confirm' });
    };

    return (
        <Card className="lexicon-settings-tab">
            <h2 className="flex sg-title">
                <BookOpen /> Global Lexicon Management
            </h2>
            <p className="settings-description">
                Manage your Parts of Speech and Semantic Tags globally. Renaming or deleting here will update all lexicon entries.
            </p>

            <div className="auto-tagger-banner">
                <div className="auto-tagger-info">
                    <h4><Sparkles size={16}/> Smart Auto-Categorizer</h4>
                    <p>Missing tags? Let the engine use NLP and WordNet to automatically categorize your entire <b>{lexicon.length}</b> word lexicon into themes like Food, Animals, and Family.</p>
                </div>
                {isAutoTagging ? (
                    <div className="auto-tagger-progress">
                        <Loader2 className="spinner" size={20} />
                        <span>Processing Tags... {autoTagProgress}%</span>
                    </div>
                ) : (
                    <Button variant="primary" onClick={handleAutoCategorize} style={{marginBottom: '0.5rem'}}>
                        Bulk Auto-Categorize Lexicon
                    </Button>
                )}

                {isAutoRelating ? (
                    <div className="auto-tagger-progress">
                        <Loader2 className="spinner" size={20} />
                        <span>Finding Links... {autoRelateProgress}%</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Button variant="save" onClick={handleAutoRelate} style={{ width: '100%' }}>
                            <Link size={16} style={{marginRight: '6px'}}/> Bulk Auto-Link Related Words
                        </Button>
                    </div>
                )}

                {isAutoDefining ? (
                    <div className="auto-tagger-progress" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 className="spinner" size={20} />
                            <span>Generating Definitions... {autoDefineProgress}%</span>
                        </div>
                        <Button variant="err" className="btn-sm" onClick={() => { abortDefRef.current = true; }}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Button variant="save" onClick={handleAutoDefine} style={{ width: '100%' }}>
                            <FileText size={16} style={{marginRight: '6px'}}/> Bulk Generate Full Definitions
                        </Button>
                    </div>
                )}

                <span style={{ fontSize: '0.75rem', color: 'var(--tx2)', marginTop: '4px', textAlign: 'center', width: '100%' }}>
                    * These processes may take a few minutes for larger lexicons to respect API rate limits.
                </span>
            </div>

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
