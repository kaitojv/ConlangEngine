import React, { useState, useEffect } from 'react';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';

export default function PhraseEditModal({ isOpen, onClose, editingPhrase = null }) {
    const { t } = useTranslation();
    const addPhrase = useLexiconStore(state => state.addPhrase);
    const updatePhrase = useLexiconStore(state => state.updatePhrase);

    const [phrase, setPhrase] = useState('');
    const [literalTranslation, setLiteralTranslation] = useState('');
    const [idiomaticTranslation, setIdiomaticTranslation] = useState('');
    const [register, setRegister] = useState('casual');
    const [category, setCategory] = useState('general');

    useEffect(() => {
        if (editingPhrase && isOpen) {
            setPhrase(editingPhrase.phrase || '');
            setLiteralTranslation(editingPhrase.literalTranslation || '');
            setIdiomaticTranslation(editingPhrase.idiomaticTranslation || '');
            setRegister(editingPhrase.register || 'casual');
            setCategory(editingPhrase.category || 'general');
        } else if (isOpen) {
            setPhrase('');
            setLiteralTranslation('');
            setIdiomaticTranslation('');
            setRegister('casual');
            setCategory('general');
        }
    }, [editingPhrase, isOpen]);

    const handleSave = () => {
        if (!phrase.trim() || !idiomaticTranslation.trim()) {
            toast.error(t('phrases.validationError'));
            return;
        }

        const data = {
            phrase,
            literalTranslation,
            idiomaticTranslation,
            register,
            category
        };

        if (editingPhrase) {
            updatePhrase(editingPhrase.id, data);
            toast.success(t('phrases.saved'));
        } else {
            addPhrase(data);
            toast.success(t('phrases.saved'));
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingPhrase ? t('phrases.editPhrase') : t('phrases.newPhrase')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>{t('phrases.phraseLabel')}</label>
                    <Input 
                        value={phrase} 
                        onChange={(e) => setPhrase(e.target.value)} 
                        placeholder="e.g., Kora tu shala"
                        className="custom-font-text notranslate"
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>{t('phrases.idiomaticLabel')}</label>
                    <Input 
                        value={idiomaticTranslation} 
                        onChange={(e) => setIdiomaticTranslation(e.target.value)} 
                        placeholder="e.g., How are you?"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>{t('phrases.literalLabel')}</label>
                    <Input 
                        value={literalTranslation} 
                        onChange={(e) => setLiteralTranslation(e.target.value)} 
                        placeholder="e.g., Sun to you"
                    />
                </div>

                <div className="phrase-modal-grid">
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>{t('phrases.categoryLabel')}</label>
                        <select 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', color: 'var(--tx)', outline: 'none' }}
                        >
                            <option value="general">General</option>
                            <option value="greeting">Greeting / Farewell</option>
                            <option value="idiom">Idiom</option>
                            <option value="proverb">Proverb</option>
                            <option value="exclamation">Exclamation</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>{t('phrases.registerLabel')}</label>
                        <select 
                            value={register} 
                            onChange={(e) => setRegister(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', color: 'var(--tx)', outline: 'none' }}
                        >
                            <option value="casual">Casual / Standard</option>
                            <option value="formal">Formal / Polite</option>
                            <option value="slang">Slang</option>
                            <option value="archaic">Archaic / Literary</option>
                            <option value="taboo">Taboo / Vulgar</option>
                        </select>
                    </div>
                </div>

                <div className="phrase-modal-actions">
                    <Button variant="default" onClick={onClose}>{t('common.cancel')}</Button>
                    <Button variant="imp" onClick={handleSave}>{t('common.save')}</Button>
                </div>
            </div>
        </Modal>
    );
}
