import React, { useState, useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Book, Plus, Trash2, Bold, Italic, Underline, Link, Save, Type, Languages, FileText } from 'lucide-react';
import './wikiTab.css';

// The new Interlinear Editor Component
function CorpusEditor({ content, onSave, writingDirection }) {
    const [mode, setMode] = useState('edit');
    const [text, setText] = useState(content || '');
    const lexicon = useLexiconStore((state) => state.lexicon);
    const { transliterate } = useTransliterator();

    useEffect(() => {
        const t = setTimeout(() => onSave(text), 2000);
        return () => clearTimeout(t);
    }, [text, onSave]);

    useEffect(() => {
        setText(content || '');
    }, [content]);

    const isVertical = writingDirection?.startsWith('vertical');
    const personRulesStr = useConfigStore(state => state.personRules) || "";

    // Parse person markers for better glossing
    const personMap = useMemo(() => {
        const map = {};
        if (!personRulesStr) return map;

        const processAffix = (aff, data) => {
            const cleanAff = aff.trim().replace(/^['"-]/, '').replace(/['"-]$/, '').split('@')[0];
            if (cleanAff) {
                map[cleanAff] = data;
                map["'" + cleanAff] = data;
                map["-" + cleanAff] = data;
            }
        };

        // Handle modern Array format
        if (Array.isArray(personRulesStr)) {
            personRulesStr.forEach(rule => {
                if (rule.affix) {
                    const p = rule.person ? rule.person.replace(/[a-z]/g, '') : '';
                    const n = rule.number || '';
                    const g = rule.gender ? '.' + rule.gender : '';
                    processAffix(rule.affix, { 
                        label: `${p}${n}${g}`, 
                        translation: rule.freeForm ? `(${rule.freeForm})` : '' 
                    });
                }
            });
            return map;
        }

        // Handle legacy String format
        if (typeof personRulesStr === 'string') {
            personRulesStr.split(',').forEach(rule => {
                const parts = rule.split(':');
                if (parts.length < 2) return;
                const label = parts[0].trim();
                const affixes = parts[1].trim();
                if (label && affixes) {
                    affixes.split('/').forEach(aff => processAffix(aff, { label, translation: '' }));
                }
            });
        }
        return map;
    }, [personRulesStr]);

    // Helper to find entry even if inflected
    const findEntry = (token) => {
        const clean = token.replace(/[.,!?()[\]{}"`:;]/g, '').toLowerCase();
        
        // 1. Exact match
        let entry = lexicon.find(e => e.word.replace(/\*/g,'').toLowerCase() === clean);
        if (entry) return { entry, isExact: true };

        // 2. Try to find root (substring match)
        const sortedLexicon = [...lexicon].sort((a, b) => b.word.length - a.word.length);
        for (const e of sortedLexicon) {
            const root = e.word.replace(/\*/g,'').toLowerCase();
            if (root.length >= 3 && clean.startsWith(root)) {
                const suffix = clean.slice(root.length);
                const personData = personMap[suffix] || personMap[suffix.replace(/^['"-]/, '')] || { label: suffix, translation: '' };
                return { entry: e, isExact: false, personData };
            }
        }
        return { entry: null, isExact: false };
    };

    const renderInterlinear = () => {
        const tokens = text.split(/(\s+)/);
        
        return (
            <div style={{
                writingMode: isVertical ? writingDirection : 'horizontal-tb',
                direction: writingDirection === 'rtl' ? 'rtl' : 'ltr',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                padding: '20px',
                lineHeight: '1.5',
                minHeight: '400px'
            }}>
                {tokens.map((token, i) => {
                    if (!token.trim()) return <span key={i} style={{ whiteSpace: 'pre' }}>{token}</span>;
                    
                    const { entry, isExact, personData } = findEntry(token);
                    const displayWord = transliterate(token, lexicon);

                    return (
                        <div key={i} style={{ 
                            display: 'inline-flex', 
                            flexDirection: isVertical ? 'row' : 'column',
                            alignItems: isVertical ? 'flex-start' : 'center',
                            gap: '2px',
                            textOrientation: 'mixed',
                            opacity: entry ? 1 : 0.6
                        }}>
                            <span className="custom-font-text notranslate" style={{ 
                                fontSize: '1.2rem', 
                                color: entry ? (isExact ? 'var(--acc)' : 'var(--acc2)') : 'var(--tx)', 
                                fontWeight: entry ? 'bold' : 'normal' 
                            }}>
                                {displayWord}
                            </span>
                            {entry && (
                                <>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--tx3)', fontStyle: 'italic', fontFamily: 'sans-serif' }}>
                                        {entry.wordClass || 'root'}{!isExact && ` (+${personData.label})`}
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--tx)', fontFamily: 'sans-serif', fontWeight: isExact ? 'normal' : '500' }}>
                                        {entry.translation} {personData?.translation}
                                    </span>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar">
                <Button variant={mode === 'edit' ? 'imp' : 'default'} onClick={() => setMode('edit')}>Edit Text</Button>
                <Button variant={mode === 'read' ? 'imp' : 'default'} onClick={() => setMode('read')}>Interlinear Reader</Button>
                <div style={{ flex: 1 }}></div>
                <Button variant="save" onClick={() => onSave(text)}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div></Button>
            </div>
            
            <div style={{ flex: 1, padding: '15px', background: 'var(--s1)', borderRadius: '0 0 8px 8px', overflowY: 'auto' }}>
                {mode === 'edit' ? (
                    <textarea 
                        className="custom-font-text notranslate"
                        style={{ 
                            width: '100%', height: '100%', minHeight: '400px', 
                            background: 'transparent', border: 'none', color: 'var(--tx)', 
                            resize: 'none', outline: 'none', fontSize: '1.1rem' 
                        }}
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Start typing your conlang text here..."
                    />
                ) : (
                    renderInterlinear()
                )}
            </div>
        </div>
    );
}

// The Classic Rich Text Editor
function LegacyWikiEditor({ content, onSave }) {
    const editorRef = useRef(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            // SEC-1: Sanitize HTML to prevent XSS via shared/cloud projects
            editorRef.current.innerHTML = DOMPurify.sanitize(content || '', {
                ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'span', 'p', 'br', 'div', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'ul', 'ol', 'li'],
                ALLOWED_ATTR: ['href', 'class', 'style', 'target']
            });
        }
    }, [content]);

    useEffect(() => {
        const autoSaveTimer = setInterval(() => {
            if (editorRef.current) onSave(editorRef.current.innerHTML);
        }, 3000);
        return () => clearInterval(autoSaveTimer);
    }, [onSave]);

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const applyConlangFont = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const selectedText = selection.toString();
        if (selectedText) {
            const html = `<span class="custom-font-text notranslate" style="color: var(--acc); font-weight: bold;">${selectedText}</span>`;
            document.execCommand('insertHTML', false, html);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="wiki-toolbar">
                <button className="wiki-tool-btn" title="Bold" onClick={() => formatText('bold')}><Bold size={16} /></button>
                <button className="wiki-tool-btn" title="Italic" onClick={() => formatText('italic')}><Italic size={16} /></button>
                <button className="wiki-tool-btn" title="Underline" onClick={() => formatText('underline')}><Underline size={16} /></button>
                <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px' }}></div>
                <button className="wiki-tool-btn" title="Insert Link" onClick={() => setLinkModalOpen(true)}><Link size={16} /></button>
                <button className="wiki-tool-btn" title="Format as Conlang Font" onClick={applyConlangFont}><Type size={16} /> <span style={{fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold'}}>CONLANG</span></button>
                <div style={{ flex: 1 }}></div>
                <Button variant="save" onClick={() => onSave(editorRef.current.innerHTML)}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div></Button>
            </div>
            <div 
                className="wiki-editor" 
                contentEditable 
                ref={editorRef} 
                onBlur={() => onSave(editorRef.current.innerHTML)}
                suppressContentEditableWarning={true}
            />

            <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Insert Link">
                <Input label="Target URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={() => { if(linkUrl) formatText('createLink', linkUrl); setLinkUrl(''); setLinkModalOpen(false); }}>Insert</Button></div>
            </Modal>
        </div>
    );
}

export default function WikiTab() {
    const wikiPages = useConfigStore((state) => state.wikiPages) || {};
    const saveWikiPage = useConfigStore((state) => state.saveWikiPage);
    const addWikiPage = useConfigStore((state) => state.addWikiPage);
    const deleteWikiPage = useConfigStore((state) => state.deleteWikiPage);
    const writingDirection = useConfigStore(state => state.writingDirection);

    const [currentPageId, setCurrentPageId] = useState(() => Object.keys(wikiPages)[0] || null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [newPageType, setNewPageType] = useState('wiki'); // 'wiki' or 'corpus'

    const handleCreatePage = () => {
        try {
            if (!newPageTitle.trim()) {
                alert("Title cannot be empty!");
                return;
            }
            const pageId = newPageTitle.trim().toLowerCase().replace(/\s+/g, '-');
            addWikiPage(pageId, newPageTitle.trim(), newPageType);
            setCurrentPageId(pageId);
            setNewPageTitle('');
            setIsCreateModalOpen(false);
        } catch (err) {
            alert("Error creating page: " + err.message);
        }
    };

    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        
        deleteWikiPage(pageId);
        if (currentPageId === pageId) {
            const remainingPages = Object.keys(wikiPages).filter(id => id !== pageId);
            setCurrentPageId(remainingPages.length > 0 ? remainingPages[0] : null);
        }
    };

    const currentPage = currentPageId ? wikiPages[currentPageId] : null;
    const isCorpus = currentPage && typeof currentPage === 'object' && currentPage.type === 'corpus';
    const content = isCorpus ? currentPage.content : currentPage;

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Card style={{ flex: '1', minWidth: '260px', maxWidth: '320px' }}>
                <h2 className='flex sg-title' style={{ marginBottom: '15px' }}><Book /> Library & Writing</h2>
                <Button variant="imp" style={{ width: '100%', marginBottom: '20px' }} onClick={() => setIsCreateModalOpen(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> New Document
                    </div>
                </Button>

                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {Object.keys(wikiPages).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--tx3)', fontStyle: 'italic', marginTop: '20px' }}>No documents created yet.</p>
                    ) : (
                        Object.keys(wikiPages).map(pageId => {
                            const p = wikiPages[pageId];
                            const isCorp = p && typeof p === 'object' && p.type === 'corpus';
                            const pTitle = isCorp ? p.title : pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                            return (
                                <div 
                                    key={pageId} 
                                    className={`wiki-page-item ${currentPageId === pageId ? 'active' : ''}`}
                                    onClick={() => setCurrentPageId(pageId)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isCorp ? <Languages size={14} color="var(--acc)" /> : <FileText size={14} color="var(--tx2)" />}
                                        <span style={{ fontWeight: 'bold', color: 'var(--tx)' }}>{pTitle}</span>
                                    </div>
                                    <button className="wiki-del-btn" onClick={(e) => handleDeletePage(pageId, e)}><Trash2 size={16} /></button>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>

            <Card style={{ flex: '3', minWidth: '300px' }}>
                {currentPageId ? (
                    isCorpus ? (
                        <CorpusEditor 
                            key={currentPageId}
                            content={content} 
                            writingDirection={writingDirection}
                            onSave={(val) => saveWikiPage(currentPageId, val)} 
                        />
                    ) : (
                        <LegacyWikiEditor 
                            key={currentPageId}
                            content={content} 
                            onSave={(val) => saveWikiPage(currentPageId, val)} 
                        />
                    )
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '50px 0' }}>
                        <Book size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <h3>Select or create a document to start writing.</h3>
                    </div>
                )}
            </Card>

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Document">
                <Input label="Document Title" value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder="e.g. Genesis Translation, Phonotactics..." autoFocus />
                
                <div style={{ marginTop: '20px' }}>
                    <label className="form-label">Document Type</label>
                    <select 
                        className="fi" 
                        value={newPageType}
                        onChange={(e) => setNewPageType(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--s1)', color: 'var(--tx)', border: '1px solid var(--bd)', borderRadius: '6px' }}
                    >
                        <option value="wiki">Wiki Article (Rich Text Formatting)</option>
                        <option value="corpus">Corpus Text (Interlinear Glossing & Live Translation)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleCreatePage}>Create</Button></div>
            </Modal>
        </div>
    );
}
