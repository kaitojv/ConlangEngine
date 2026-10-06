// src/utils/humanIpaAudio.js
// Authentic Human IPA Phoneme Player
// Plays real recordings of phoneticians from the International Phonetic Association (Wikimedia Commons).
// Zero-install, 100% web-native, zero setup.

import { IPA_INFO } from './ipaData.js';

let currentAudio = null;

/**
 * Extracts recognized IPA phonemes from an IPA transcription string.
 */
export function extractIpaPhonemes(ipaStr) {
    if (!ipaStr) return [];
    const cleaned = String(ipaStr)
        .replace(/[\/\\\[\]ˈˌːˑ˥˦˧˨˩¹²³⁴⁵\.]/g, '')
        .trim();

    const phonemes = [];
    const chars = Array.from(cleaned);
    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        if (IPA_INFO[char]?.audio) {
            phonemes.push(char);
        } else {
            // Also check decomposed accents or lowercase
            const lower = char.toLowerCase();
            if (IPA_INFO[lower]?.audio) {
                phonemes.push(lower);
            }
        }
    }
    return phonemes;
}

/**
 * Plays a single audio file from URL and returns a Promise that resolves when finished.
 */
function playAudioFile(url) {
    return new Promise((resolve) => {
        try {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
            const audio = new Audio(url);
            currentAudio = audio;
            audio.onended = () => {
                currentAudio = null;
                resolve();
            };
            audio.onerror = () => {
                currentAudio = null;
                resolve();
            };
            audio.play().catch(() => resolve());
        } catch {
            resolve();
        }
    });
}

/**
 * Plays the sequence of authentic human IPA recordings for an IPA string.
 */
export async function playHumanIpaAudio({ ipa, text }) {
    const target = ipa || text || '';
    const phonemes = extractIpaPhonemes(target);

    if (phonemes.length === 0) {
        // If single isolated character exists
        const single = target.trim();
        if (IPA_INFO[single]?.audio) {
            return playAudioFile(IPA_INFO[single].audio);
        }
        return;
    }

    // Play each phoneme with a small gap
    for (const ph of phonemes) {
        const audioUrl = IPA_INFO[ph]?.audio;
        if (audioUrl) {
            await playAudioFile(audioUrl);
            await new Promise((r) => setTimeout(r, 60)); // 60ms inter-phoneme pause
        }
    }
}
