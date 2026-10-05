import React, { useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import StrokeOrderViewer from './StrokeOrderViewer.jsx';
import { Volume2 } from 'lucide-react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import { playAzureTTS } from '../../../utils/azureTTS.js';
import toast from 'react-hot-toast';

export default function StrokeOrderModal({
    isOpen,
    onClose,
    word,
    char,
    name,
    scriptType,
    translation
}) {
    const { azureTtsUseIpa, azureTtsVoice } = useConfigStore(useShallow(state => ({
        azureTtsUseIpa: state.azureTtsUseIpa,
        azureTtsVoice: state.azureTtsVoice
    })));
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isDirty) {
            const ok = window.confirm(
                'You have unsaved stroke changes.\n\nClose and discard them? (Your saved character is untouched.)'
            );
            if (!ok) return;
        }
        onClose();
    };

    const displayTitle = name || word || char || 'Stroke Order';
    const displaySubtitle = translation ? `"${translation}"` : (word && word !== displayTitle ? word : '');

    const handlePlayAudio = async () => {
        setIsPlaying(true);
        const toastId = toast.loading("Synthesizing audio...");
        try {
            await playAzureTTS({
                text: word || char || displayTitle,
                ipa: word || char || displayTitle,
                voice: azureTtsVoice || 'ipa-default',
                useIpa: azureTtsUseIpa ?? true
            });
            toast.dismiss(toastId);
        } catch {
            toast.dismiss(toastId);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(word || char || displayTitle));
            }
        } finally {
            setIsPlaying(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Stroke Order: ${displayTitle}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', minWidth: 0 }}>
                {/* Header Summary */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: 'var(--s2)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    border: '1px solid var(--bd)',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="custom-font-text notranslate" style={{ fontSize: '1.75rem', color: 'var(--acc)', lineHeight: 1 }}>
                            {char || word}
                        </span>
                        <div>
                            <div style={{ fontWeight: 600, color: 'var(--tx)', fontSize: '1rem' }}>{displayTitle}</div>
                            {displaySubtitle && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--tx2)' }}>{displaySubtitle}</div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {scriptType && (
                            <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                background: 'var(--s3)', 
                                color: 'var(--tx2)',
                                border: '1px solid var(--bd)',
                                textTransform: 'capitalize'
                            }}>
                                {scriptType.replace('_', ' ')}
                            </span>
                        )}
                        <button
                            className={`so-control-btn ${isPlaying ? 'primary' : ''}`}
                            onClick={handlePlayAudio}
                            disabled={isPlaying}
                            title="Listen to pronunciation"
                            style={{ height: '30px', padding: '0 0.6rem' }}
                        >
                            <Volume2 size={15} style={{ marginRight: '4px' }} />
                            <span>Listen</span>
                        </button>
                    </div>
                </div>

                {/* Stroke Order Visualizer */}
                <StrokeOrderViewer word={word} char={char} scriptType={scriptType} onDirtyChange={setIsDirty} />
            </div>
        </Modal>
    );
}
