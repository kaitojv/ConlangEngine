import React, { useState, useEffect, useRef } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import { AlertCircle, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import './csvImportModal.css';

export function CsvImportModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const addWord = useLexiconStore((state) => state.addWord);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    
    const [parsedEntries, setParsedEntries] = useState([]);
    const [hasUploaded, setHasUploaded] = useState(false);
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        if (!isOpen) {
            setParsedEntries([]);
            setHasUploaded(false);
        }
    }, [isOpen]);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvData = e.target.result;
            
            const parseCSVRow = (str) => {
                let row = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < str.length; i++) {
                    const char = str[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        row.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                row.push(current.trim());
                return row;
            };

            const lines = csvData.split(/\r?\n/).filter(line => line.trim());
            const entries = lines.map((line, index) => {
                const cols = parseCSVRow(line);
                const word = cols[0] || '';
                const translation = cols[1] || '';
                const ipa = cols[2] || '';
                const definition = cols[3] || '';
                const rawTags = cols[4] || '';
                const wordClass = cols[5] || '';
                
                const tags = rawTags.split(/[\s,]+/).filter(Boolean);

                const isDuplicate = lexicon.some(
                    (existing) => existing.word.toLowerCase() === word.toLowerCase()
                );

                return {
                    id: `csv-${index}-${Date.now()}`,
                    word,
                    translation,
                    ipa,
                    definition,
                    tags,
                    wordClass,
                    isDuplicate,
                    selected: !isDuplicate
                };
            }).filter(entry => entry.word);

            setParsedEntries(entries);
            setHasUploaded(true);
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleSelectAll = (val) => {
        setParsedEntries(prev => prev.map(entry => ({ ...entry, selected: val })));
    };

    const toggleSelection = (index) => {
        setParsedEntries(prev => {
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
    };

    const handleImport = () => {
        const toImport = parsedEntries.filter(e => e.selected);
        toImport.forEach(entry => {
            addWord({
                word: entry.word,
                translation: entry.translation,
                ipa: entry.ipa,
                definition: entry.definition,
                tags: entry.tags,
                wordClass: entry.wordClass
            });
        });
        alert(t('csvImport.successAlert', { count: toImport.length }));
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('csvImport.title')}>
            <div className="csv-modal-wrapper">
                <Infobox title={t('csvImport.rulesTitle')}>
                    <p style={{ marginBottom: '10px', marginTop: 0 }}>{t('csvImport.rulesDesc')}</p>
                    <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '10px', border: '1px solid var(--bd)' }}>
                        <div style={{ opacity: 0.6, marginBottom: '6px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('csvImport.columnHeaders')}</div>
                        <span style={{ color: 'var(--acc2)' }}>kato</span>, <span style={{ color: 'var(--tx)' }}>cat</span>, <span style={{ color: 'var(--tx3)' }}>/ka.to/</span>, <span style={{ color: 'var(--tx)' }}>A small feline</span>, <span style={{ color: 'var(--ok)' }}>animal pet</span>, <span style={{ color: 'var(--tx)' }}>Noun</span><br/>
                        <span style={{ color: 'var(--acc2)' }}>runi</span>, <span style={{ color: 'var(--tx)' }}>run</span>, <span style={{ color: 'var(--tx3)' }}>/ru.ni/</span>, <span style={{ color: 'var(--tx)' }}>To move quickly</span>, <span style={{ color: 'var(--ok)' }}>action</span>, <span style={{ color: 'var(--tx)' }}>Verb</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}><i>{t('csvImport.rulesTip')}</i></p>
                </Infobox>
                
                {!hasUploaded ? (
                    <div className="csv-upload-prompt" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '20px' }}>
                        <p style={{ color: 'var(--tx2)', textAlign: 'center' }}>{t('csvImport.uploadPrompt')}</p>
                        <input 
                            type="file" 
                            accept=".csv" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            style={{ display: 'none' }}
                        />
                        <Button variant="save" onClick={() => fileInputRef.current.click()}>
                            <UploadCloud size={20} /> {t('csvImport.selectFileBtn')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="csv-actions">
                            <Button variant="default" onClick={() => handleSelectAll(true)}>{t('csvImport.selectAll')}</Button>
                            <Button variant="default" onClick={() => handleSelectAll(false)}>{t('csvImport.deselectAll')}</Button>
                        </div>

                        <div className="csv-list">
                            {parsedEntries.map((entry, idx) => (
                                <label key={entry.id} className={`csv-item ${entry.isDuplicate ? 'duplicate' : ''}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={entry.selected} 
                                        onChange={() => toggleSelection(idx)}
                                    />
                                    <div className="csv-item-info">
                                        <span className="csv-word">{entry.word}</span>
                                        <span className="csv-translation">{entry.translation}</span>
                                        {entry.isDuplicate && <span className="csv-badge"><AlertCircle size={12} /> {t('csvImport.existsBadge')}</span>}
                                    </div>
                                </label>
                            ))}
                            {parsedEntries.length === 0 && <p style={{ color: 'var(--tx2)', padding: '20px', textAlign: 'center' }}>{t('csvImport.noWordsFound')}</p>}
                        </div>

                        <div className="csv-footer">
                            <Button variant="save" onClick={handleImport}>{t('csvImport.importSelectedBtn')}</Button>
                            <Button variant="default" onClick={onClose}>{t('csvImport.cancelBtn')}</Button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
