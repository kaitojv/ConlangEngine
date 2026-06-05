// src/components/UI/StressWave/StressWave.jsx
// Shared SVG stress curve component — reused in LexiconList and ProsodyRulesCard.

import React from 'react';

const FALLBACK_VOWELS = [
    'a', 'e', 'i', 'o', 'u',
    'á', 'é', 'í', 'ó', 'ú', 'à', 'è', 'ì', 'ò', 'ù', 'â', 'ê', 'î', 'ô', 'û', 'ä', 'ë', 'ï', 'ö', 'ü',
    'ɑ', 'æ', 'ɛ', 'ə', 'ɪ', 'ɔ', 'ʊ', 'ʌ', 'ʉ', 'ɯ', 'ʏ', 'ø', 'œ', 'ɒ', 'ɐ', 'ɨ', 'ɤ'
];

export default function StressWave({ word, stress, tone, customVowelsStr, width = '100%', height = '15px' }) {
    if (!stress && !tone) return null;

    let vowelsArr = [];
    if (customVowelsStr) {
        vowelsArr = customVowelsStr.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    }

    // Intelligent fallback: include standard vowels found in the word even if not in config
    const wordLower = (word || '').toLowerCase();
    FALLBACK_VOWELS.forEach(fv => {
        if (wordLower.includes(fv) && !vowelsArr.includes(fv)) {
            vowelsArr.push(fv);
        }
    });

    vowelsArr.sort((a, b) => b.length - a.length);
    const escapedVowels = vowelsArr.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedVowels.join('|')})`, 'gi');

    const match = (word || '').match(regex);
    const syllableCount = match ? match.length : 1;

    let stressIndex = -1;
    if (stress) {
        const s = String(stress).toLowerCase();
        if (s.includes('ante') && s.includes('penult')) stressIndex = syllableCount - 3;
        else if (s.includes('penult')) stressIndex = syllableCount - 2;
        else if (s.includes('init') || s.includes('first') || s === '1') stressIndex = 0;
        else if (s.includes('ult') || s.includes('final') || s.includes('last')) stressIndex = syllableCount - 1;
        else if (s === '2') stressIndex = 1;
        else if (s === '3') stressIndex = 2;
        else {
            const n = parseInt(s, 10);
            if (!isNaN(n)) stressIndex = n - 1;
        }
    }
    if (stressIndex === -1 && (stress || tone)) {
        stressIndex = 0;
    }

    stressIndex = Math.max(0, Math.min(stressIndex, syllableCount - 1));

    const W = 100 / Math.max(1, syllableCount);
    let path = `M 0 15 `;
    for (let i = 0; i < syllableCount; i++) {
        const startX = i * W;
        const endX = (i + 1) * W;
        const midX = i * W + W / 2;
        
        if (i === stressIndex) {
            if (tone) {
                const t = tone.toLowerCase();
                if (t === 'high') {
                    path += `L ${startX} 2 L ${endX} 2 L ${endX} 15 `;
                } else if (t === 'low') {
                    path += `L ${startX} 12 L ${endX} 12 L ${endX} 15 `;
                } else if (t === 'mid') {
                    path += `L ${startX} 8 L ${endX} 8 L ${endX} 15 `;
                } else if (t === 'rising') {
                    path += `L ${endX} 2 L ${endX} 15 `;
                } else if (t === 'falling') {
                    path += `L ${startX} 2 L ${endX} 15 `;
                } else if (t === 'dipping') {
                    path += `L ${startX} 2 L ${midX} 15 L ${endX} 2 L ${endX} 15 `;
                } else if (t === 'peaking') {
                    path += `L ${midX} 2 L ${endX} 15 `;
                } else {
                    path += `Q ${midX} -5, ${endX} 15 `;
                }
            } else {
                path += `Q ${midX} -5, ${endX} 15 `;
            }
        } else {
            path += `L ${endX} 15 `;
        }
    }

    return (
        <svg
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            style={{ width, height, display: 'block', overflow: 'visible', opacity: 0.6, marginBottom: '-5px' }}
        >
            <path
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
