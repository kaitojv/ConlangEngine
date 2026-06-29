import React, { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { MessageSquare, Plus, Search, Edit2, Trash2, Volume2 } from 'lucide-react';
import PhraseEditModal from './PhraseEditModal.jsx';
import EmptyState from '@/components/UI/EmptyState/EmptyState.jsx';
import { playAzureTTS } from '@/utils/azureTTS.js';
import toast from 'react-hot-toast';

export default function PhrasesTab() {
    const phrases = useLexiconStore(state => state.phrases || []);
    const deletePhrase = useLexiconStore(state => state.deletePhrase);
    const config = useConfigStore();
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
        if (window.confirm("Are you sure you want to delete this phrase?")) {
            deletePhrase(id);
            toast.success("Phrase deleted.");
        }
    };

    const handleReadAloud = async (text) => {
        if (!config.azureTtsVoice) {
            toast.error("Please configure Azure TTS voice in Settings first.");
            return;
        }
        const toastId = toast.loading("Generating audio...");
        try {
            await playAzureTTS({
                text: text.replace(/[.\-*]/g, ''),
                voice: config.azureTtsVoice,
                useIpa: config.azureTtsUseIpa
            });
            toast.dismiss(toastId);
        } catch(err) {
            toast.dismiss(toastId);
            toast.error("Failed to play audio.");
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className='flex sg-title' style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><MessageSquare /> Phrases & Idioms</h2>
                    <Button variant="imp" onClick={handleAdd}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} /> Add Phrase
                        </div>
                    </Button>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)' }} />
                    <Input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search phrases by conlang or meaning..."
                        style={{ paddingLeft: '40px' }}
                    />
                </div>

                {filteredPhrases.length === 0 ? (
                    <EmptyState icon={<MessageSquare size={48} />} title="No phrases found">
                        {searchQuery ? "Try a different search term." : "Click 'Add Phrase' to create your first multi-word expression."}
                    </EmptyState>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {filteredPhrases.map(phrase => (
                            <div key={phrase.id} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
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
                                            Lit: "{phrase.literalTranslation}"
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <Button variant="default" onClick={() => handleReadAloud(phrase.phrase)} title="Read Aloud" style={{ padding: '8px' }}>
                                        <Volume2 size={16} />
                                    </Button>
                                    <Button variant="edit" onClick={() => handleEdit(phrase)} title="Edit Phrase" style={{ padding: '8px' }}>
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button variant="danger" onClick={() => handleDelete(phrase.id)} title="Delete Phrase" style={{ padding: '8px' }}>
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
