import React, { useState } from 'react';
import Modal from '../../UI/Modal/Modal';
import Input from '../../UI/Input/Input';
import Button from '../../UI/Buttons/Buttons';
import { useLexiconStore } from '../../../store/useLexiconStore';
import { useConfigStore } from '../../../store/useConfigStore';
import { useProjectStore } from '../../../store/useProjectStore';
import { Hash, Network, MoveRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadLargeDataFromDB, saveLargeDataToDB } from '../../../store/useConfigStore.jsx';

export default function ProtoRootModal({ isOpen, onClose, oldWord }) {
    const config = useConfigStore(state => state);
    const localProjects = useProjectStore(state => state.localProjects);
    const addWord = useLexiconStore(state => state.addWord);
    const removeWord = useLexiconStore(state => state.removeWord);
    const updateWord = useLexiconStore(state => state.updateWord);
    
    const [newWord, setNewWord] = useState('');
    const [newTranslation, setNewTranslation] = useState(oldWord?.translation || '');
    const [destinationId, setDestinationId] = useState(config.parentId || 'current');

    const handleSave = async () => {
        if (!oldWord) return;
        if (!newWord.trim()) {
            toast.error("Please enter the new evolved word.");
            return;
        }

        const newWordObj = {
            ...oldWord,
            id: `word_${Math.random().toString(36).substr(2, 9)}`,
            word: newWord.trim(),
            translation: newTranslation.trim() || oldWord.translation,
            isProtoRoot: false
        };

        if (destinationId === 'current') {
            // Keep in current language:
            // 1. Mark old word as proto root
            updateWord(oldWord.id, { ...oldWord, isProtoRoot: true });
            
            // 2. Add new word linked to old word
            newWordObj.etymology = oldWord.id;
            addWord(newWordObj);
            
            toast.success("Converted to Proto-Root in this lexicon.");
        } else {
            // Send to Mother Language
            try {
                // We need to fetch the Mother Language's dictionary from bloat, add the old word, and save it back.
                const motherProject = localProjects.find(p => p.id === destinationId);
                if (!motherProject) throw new Error("Target project not found");

                const bloat = await loadLargeDataFromDB(destinationId);
                const motherDictionary = bloat?.dictionary || motherProject.project_data?.dictionary || [];
                
                // Add old word to mother language
                const oldWordClone = { ...oldWord, id: `word_${Math.random().toString(36).substr(2, 9)}`, isProtoRoot: true };
                motherDictionary.push(oldWordClone);
                
                // Save back to DB
                await saveLargeDataToDB(destinationId, { ...bloat, dictionary: motherDictionary });
                
                // Update project store reference
                const updatedProjects = localProjects.map(p => {
                    if (p.id === destinationId) {
                        return { ...p, project_data: { ...p.project_data, dictionary: motherDictionary } };
                    }
                    return p;
                });
                useProjectStore.setState({ localProjects: updatedProjects });

                // Remove old word from CURRENT language
                removeWord(oldWord.id);

                // Add new word to CURRENT language, linking to the mother language's word
                newWordObj.etymology = `project:${destinationId}:word:${oldWordClone.id}`;
                addWord(newWordObj);
                
                toast.success(`Proto-Root moved to ${motherProject.project_data?.config?.conlangName || 'Mother Language'}`);
            } catch (err) {
                console.error(err);
                toast.error("Failed to move proto-root to Mother Language.");
                return;
            }
        }

        onClose();
    };

    if (!oldWord) return null;

    const parentProjects = localProjects.filter(p => p.id !== config.projectId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Convert to Proto-Root">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ color: 'var(--tx2)', lineHeight: '1.5', fontSize: '0.9rem' }}>
                    This will convert <strong>{oldWord.word}</strong> into a Proto-Root. You can keep it hidden in this language's dictionary, or send it to a Mother Language. The new evolved word will replace it here.
                </p>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: 'var(--s1)', padding: '15px', borderRadius: 'var(--rad)' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Proto-Root (Old Word)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--tx)' }}>{oldWord.word}</div>
                    </div>
                    <MoveRight size={24} color="var(--tx3)" />
                    <div style={{ flex: 1 }}>
                        <Input 
                            label="Evolved Root (New Word)" 
                            value={newWord} 
                            onChange={(e) => setNewWord(e.target.value)} 
                            placeholder="e.g. father"
                            autoFocus
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ color: 'var(--tx)', fontWeight: 'bold', fontSize: '0.9rem' }}>Destination for Proto-Root</label>
                    <select 
                        className="input-v" 
                        value={destinationId} 
                        onChange={(e) => setDestinationId(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        <option value="current">Keep in current language (Hidden)</option>
                        {parentProjects.map(p => (
                            <option key={p.id} value={p.id}>
                                Send to: {p.project_data?.config?.conlangName || 'Untitled Language'}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <Button variant="default" onClick={onClose}>Cancel</Button>
                    <Button variant="imp" onClick={handleSave}>
                        <div className="btn-content-flex"><Hash size={16} /> Convert</div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
