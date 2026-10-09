import React, { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { MessageSquare, Plus, Search, Edit2, Trash2, Volume2 } from 'lucide-react';
import PhraseEditModal from './PhraseEditModal.jsx';
import EmptyState from '@/components/UI/EmptyState/EmptyState.jsx';
import { playAzureTTS } from '@/utils/azureTTS.js';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import './phrasesTab.css';

export default function PhrasesTab() {
    const { t } = useTranslation();
    const phrases = useLexiconStore(state => state.phrases || []);
    const deletePhrase = useLexiconStore(state => state.deletePhrase);
    const { azureTtsUseIpa, azureTtsVoice } = useConfigStore(useShallow(state => ({
        azureTtsUseIpa: state.azureTtsUseIpa,
        azureTtsVoice: state.azureTtsVoice
    })));
    const { transliterate } = useTransliterator();

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPhrase, setEditingPhrase] = useState(null);

    const filteredPhrases = phrases.filter(p => 
        p.phrase.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.idiomaticTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.literalTranslation && p.literalTranslation.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleEdit = (phrase) => {
        setEditingPhrase(phrase);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingPhrase(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm(t('phrases.deleteConfirm'))) {
            deletePhrase(id);
            toast.success(t('phrases.deleted'));
        }
    };

    const handleReadAloud = async (text) => {
        const toastId = toast.loading(t('phrases.generatingAudio'));
        try {
            await playAzureTTS({
                text: text.replace(/[.\-*]/g, ''),
                voice: azureTtsVoice || 'ipa-default',
                useIpa: azureTtsUseIpa ?? true
            });
            toast.dismiss(toastId);
        } catch {
            toast.dismiss(toastId);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/[.\-*]/g, '')));
            }
        }
    };

    return (
        <div className="phrases-container">
            <Card>
                <div className="phrases-header">
                    <h2 className='flex sg-title' style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><MessageSquare /> {t('phrases.title')}</h2>
                    <Button variant="imp" onClick={handleAdd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> {t('phrases.addPhrase')}
                        </div>
                    </Button>
                </div>

                <div className="phrases-search-wrapper">
                    <Search size={16} className="phrases-search-icon" />
                    <Input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('phrases.searchPlaceholder')}
                        className="phrases-search-input"
                    />
                </div>

                {filteredPhrases.length === 0 ? (
                    <EmptyState icon={MessageSquare} title={t('phrases.noPhrases')}>
                        {searchQuery ? t('phrases.noPhrasesSearch') : t('phrases.noPhrasesEmpty')}
                    </EmptyState>
                ) : (
                    <div className="phrases-list">
                        {filteredPhrases.map(phrase => (
                            <div key={phrase.id} className="phrase-card-item">
                                <div className="phrase-item-main">
                                    <div className="phrase-header-meta">
                                        <span className="custom-font-text notranslate" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--acc)' }}>
                                            {transliterate(phrase.phrase)}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--s4)', borderRadius: '10px', color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {phrase.category}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'var(--s4)', borderRadius: '10px', color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {phrase.register}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '1.05rem', color: 'var(--tx)', marginBottom: '4px' }}>
                                        {phrase.idiomaticTranslation}
                                    </div>
                                    {phrase.literalTranslation && (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--tx3)', fontStyle: 'italic' }}>
                                            {t('phrases.litPrefix')} "{phrase.literalTranslation}"
                                        </div>
                                    )}
                                </div>
                                <div className="phrase-actions">
                                    <Button variant="default" onClick={() => handleReadAloud(phrase.phrase)} title={t('phrases.readAloud')} style={{ padding: '8px' }}>
                                        <Volume2 size={16} />
                                    </Button>
                                    <Button variant="edit" onClick={() => handleEdit(phrase)} title={t('phrases.editPhraseTooltip')} style={{ padding: '8px' }}>
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button variant="danger" onClick={() => handleDelete(phrase.id)} title={t('phrases.deletePhraseTooltip')} style={{ padding: '8px' }}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <PhraseEditModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingPhrase={editingPhrase}
            />
        </div>
    );
}
