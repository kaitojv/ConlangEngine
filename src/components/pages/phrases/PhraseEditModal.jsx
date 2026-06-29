import React, { useState, useEffect } from 'react';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import toast from 'react-hot-toast';

export default function PhraseEditModal({ isOpen, onClose, editingPhrase = null }) {
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
            toast.error("Phrase and Idiomatic Translation are required.");
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
            toast.success("Phrase updated!");
        } else {
            addPhrase(data);
            toast.success("Phrase added!");
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={editingPhrase ? "Edit Phrase" : "Add New Phrase"}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>Phrase (Conlang)</label>
                    <Input 
                        value={phrase} 
                        onChange={(e) => setPhrase(e.target.value)} 
                        placeholder="e.g., Kora tu shala"
                        className="custom-font-text notranslate"
                    />
                </div>
                
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>Idiomatic Translation (Meaning)</label>
                    <Input 
                        value={idiomaticTranslation} 
                        onChange={(e) => setIdiomaticTranslation(e.target.value)} 
                        placeholder="e.g., How are you?"
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>Literal Translation (Optional)</label>
                    <Input 
                        value={literalTranslation} 
                        onChange={(e) => setLiteralTranslation(e.target.value)} 
                        placeholder="e.g., Sun to you"
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>Category</label>
                        <select 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ width: '100%', padding: '10px', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', color: 'var(--tx)', outline: 'none' }}
                        >
                            <option value="general">General Phrase</option>
                            <option value="greeting">Greeting / Farewell</option>
                            <option value="idiom">Idiom</option>
                            <option value="proverb">Proverb</option>
                            <option value="exclamation">Exclamation</option>
                        </select>
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--tx)' }}>Register</label>
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button variant="imp" onClick={handleSave}>{editingPhrase ? "Save Changes" : "Add Phrase"}</Button>
                </div>
            </div>
        </Modal>
    );
}
