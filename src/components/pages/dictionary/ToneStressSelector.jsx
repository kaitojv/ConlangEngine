import React from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';

const TONE_OPTIONS = ["High", "Low", "Mid", "Rising", "Falling", "Dipping", "Peaking"];

export default function ToneStressSelector({ word, tone, stress, onToneChange, onStressChange }) {
    const customVowelsStr = useConfigStore(state => state.vowels);
    
    let vowelsArr = [];
    if (customVowelsStr) {
        vowelsArr = customVowelsStr.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    }
    
    // Intelligent fallback: if the word contains standard/IPA vowels that the user forgot to add to their config, include them anyway so the UI doesn't break.
    const fallbackVowels = [
        'a', 'e', 'i', 'o', 'u', 
        'á', 'é', 'í', 'ó', 'ú', 'à', 'è', 'ì', 'ò', 'ù', 'â', 'ê', 'î', 'ô', 'û', 'ä', 'ë', 'ï', 'ö', 'ü', 
        'ɑ', 'æ', 'ɛ', 'ə', 'ɪ', 'ɔ', 'ʊ', 'ʌ', 'ʉ', 'ɯ', 'ʏ', 'ø', 'œ', 'ɒ', 'ɐ', 'ɨ', 'ɤ'
    ];
    const wordLower = (word || '').toLowerCase();
    fallbackVowels.forEach(fv => {
        if (wordLower.includes(fv) && !vowelsArr.includes(fv)) {
            vowelsArr.push(fv);
        }
    });

    vowelsArr.sort((a, b) => b.length - a.length);
    const escapedVowels = vowelsArr.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedVowels.join('|')})`, 'gi');
    
    const match = (word || '').match(regex);
    const count = match ? match.length : 1;

    let currentIndex = -1;
    if (stress) {
        const s = String(stress).toLowerCase();
        if (s.includes('ante') && s.includes('penult')) currentIndex = count - 3;
        else if (s.includes('penult')) currentIndex = count - 2;
        else if (s.includes('init') || s.includes('first') || s === '1') currentIndex = 0;
        else if (s.includes('ult') || s.includes('final') || s.includes('last')) currentIndex = count - 1;
        else {
            const num = parseInt(s, 10);
            if (!isNaN(num)) currentIndex = num - 1;
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '8px 0', width: '100%' }}>
            <div>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>Stress Position</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {Array.from({ length: count }).map((_, i) => {
                        const isActive = currentIndex === i;
                        return (
                            <div 
                                key={i}
                                onClick={() => onStressChange(isActive ? '' : String(i + 1))}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: isActive ? 'var(--acc)' : 'var(--s4)',
                                    color: isActive ? '#ffffff' : 'var(--tx)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    border: '1px solid var(--bd)',
                                    transition: 'all 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                Syllable {i + 1}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>Tone (Optional)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {TONE_OPTIONS.map(t => {
                        const isActive = tone === t;
                        return (
                            <div 
                                key={t}
                                onClick={() => onToneChange(isActive ? '' : t)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: isActive ? 'var(--acc)' : 'var(--s4)',
                                    color: isActive ? '#ffffff' : 'var(--tx)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    border: '1px solid var(--bd)',
                                    transition: 'all 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                {t}
                            </div>
                        );
                    })}
                    {tone && !TONE_OPTIONS.includes(tone) && (
                        <div 
                            onClick={() => onToneChange('')}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'var(--acc)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                border: '1px solid var(--bd)'
                            }}
                        >
                            {tone} ✕
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
