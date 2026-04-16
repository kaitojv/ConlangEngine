import React, { useState, useEffect, useRef } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { Book, Plus, Trash2, Bold, Italic, Underline, Link, Save, Type } from 'lucide-react';
import './wikiTab.css';

export default function WikiTab() {
    const wikiPages = useConfigStore((state) => state.wikiPages) || {};
    const saveWikiPage = useConfigStore((state) => state.saveWikiPage);
    const addWikiPage = useConfigStore((state) => state.addWikiPage);
    const deleteWikiPage = useConfigStore((state) => state.deleteWikiPage);

    const [currentPageId, setCurrentPageId] = useState(() => Object.keys(wikiPages)[0] || null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPageTitle, setNewPageTitle] = useState('');
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const editorRef = useRef(null);

    // Load the correct page content into the editor whenever the selected page changes
    useEffect(() => {
        if (editorRef.current && currentPageId && wikiPages[currentPageId]) {
            editorRef.current.innerHTML = wikiPages[currentPageId];
        } else if (editorRef.current && !currentPageId) {
            editorRef.current.innerHTML = '';
        }
    }, [currentPageId]); // Deliberately omitting wikiPages so it doesn't reset user typing mid-sentence

    const handleSave = () => {
        if (editorRef.current && currentPageId) {
            saveWikiPage(currentPageId, editorRef.current.innerHTML);
        }
    };

    // Auto-save the page content every 3 seconds
    useEffect(() => {
        const autoSaveTimer = setInterval(() => {
            if (editorRef.current && currentPageId) {
                saveWikiPage(currentPageId, editorRef.current.innerHTML);
            }
        }, 3000);
        return () => clearInterval(autoSaveTimer);
    }, [currentPageId, saveWikiPage]);

    const handleCreatePage = () => {
        if (!newPageTitle.trim()) return;
        const pageId = newPageTitle.trim().toLowerCase().replace(/\s+/g, '-');
        addWikiPage(pageId, newPageTitle.trim());
        setCurrentPageId(pageId);
        setNewPageTitle('');
        setIsCreateModalOpen(false);
    };

    const handleDeletePage = (pageId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this wiki page?")) return;
        
        deleteWikiPage(pageId);
        if (currentPageId === pageId) {
            const remainingPages = Object.keys(wikiPages).filter(id => id !== pageId);
            setCurrentPageId(remainingPages.length > 0 ? remainingPages[0] : null);
        }
    };

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const applyConlangFont = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const selectedText = selection.toString();
        if (selectedText) {
            // Wraps the selected text in the global custom-font class!
            const html = `<span class="custom-font-text notranslate" style="color: var(--acc); font-weight: bold;">${selectedText}</span>`;
            document.execCommand('insertHTML', false, html);
        }
    };

    const handleAddLink = () => {
        if (linkUrl) {
            formatText('createLink', linkUrl);
            setLinkUrl('');
            setLinkModalOpen(false);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Sidebar List */}
            <Card style={{ flex: '1', minWidth: '260px', maxWidth: '320px' }}>
                <h2 className='flex sg-title' style={{ marginBottom: '15px' }}><Book /> Grammar Wiki</h2>
                <Button variant="imp" style={{ width: '100%', marginBottom: '20px' }} onClick={() => setIsCreateModalOpen(true)}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Plus size={18} /> New Topic
                    </div>
                </Button>

                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
                    {Object.keys(wikiPages).length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--tx3)', fontStyle: 'italic', marginTop: '20px' }}>No pages created yet.</p>
                    ) : (
                        Object.keys(wikiPages).map(pageId => (
                            <div 
                                key={pageId} 
                                className={`wiki-page-item ${currentPageId === pageId ? 'active' : ''}`}
                                onClick={() => setCurrentPageId(pageId)}
                            >
                                <span style={{ fontWeight: 'bold', color: 'var(--tx)' }}>
                                    {pageId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <button className="wiki-del-btn" onClick={(e) => handleDeletePage(pageId, e)}><Trash2 size={16} /></button>
                            </div>
                        ))
                    )}
                </div>
            </Card>

            {/* Editor Area */}
            <Card style={{ flex: '3', minWidth: '300px' }}>
                {currentPageId ? (
                    <>
                        <div className="wiki-toolbar">
                            <button className="wiki-tool-btn" title="Bold" onClick={() => formatText('bold')}><Bold size={16} /></button>
                            <button className="wiki-tool-btn" title="Italic" onClick={() => formatText('italic')}><Italic size={16} /></button>
                            <button className="wiki-tool-btn" title="Underline" onClick={() => formatText('underline')}><Underline size={16} /></button>
                            <div style={{ width: '1px', background: 'var(--bd)', margin: '0 5px' }}></div>
                            <button className="wiki-tool-btn" title="Insert Link" onClick={() => setLinkModalOpen(true)}><Link size={16} /></button>
                            <button className="wiki-tool-btn" title="Format as Conlang Font" onClick={applyConlangFont}><Type size={16} /> <span style={{fontSize: '0.7rem', marginLeft: '4px', fontWeight: 'bold'}}>CONLANG</span></button>
                            <div style={{ flex: 1 }}></div>
                            <Button variant="save" onClick={handleSave}><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Save size={16} /> Save Document</div></Button>
                        </div>
                        <div 
                            className="wiki-editor" 
                            contentEditable 
                            ref={editorRef} 
                            onBlur={handleSave}
                            suppressContentEditableWarning={true}
                        />
                    </>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--tx3)', padding: '50px 0' }}>
                        <Book size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
                        <h3>Select or create a page to start writing.</h3>
                    </div>
                )}
            </Card>

            {/* Modals for Prompts */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Wiki Page">
                <Input label="Page Title" value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)} placeholder="e.g. Phonotactics, Noun Cases..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleCreatePage}>Create Page</Button></div>
            </Modal>

            <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Insert Link">
                <Input label="Target URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." autoFocus />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><Button variant="imp" onClick={handleAddLink}>Insert</Button></div>
            </Modal>
        </div>
    );
}
