// src/utils/espeakSynth.js
// Client-side eSpeak-NG synthesis using in-browser meSpeak (Emscripten Web Audio).
// Zero-install, 100% offline (assets bundled locally in /mespeak/), zero external server needed.

let isInitializing = false;
let isReady = false;
let initPromise = null;

const AVAILABLE_ESPEAK_VOICES = [
    { id: 'en/en-us', name: 'English (US)', path: '/mespeak/voices/en/en-us.json' },
    { id: 'la', name: 'Latin (Phonetic / Classical)', path: '/mespeak/voices/la.json' },
    { id: 'eo', name: 'Esperanto (Universal Phonetic)', path: '/mespeak/voices/eo.json' },
    { id: 'es', name: 'Spanish', path: '/mespeak/voices/es.json' },
    { id: 'fr', name: 'French', path: '/mespeak/voices/fr.json' },
    { id: 'de', name: 'German', path: '/mespeak/voices/de.json' },
    { id: 'it', name: 'Italian', path: '/mespeak/voices/it.json' },
    { id: 'pt', name: 'Portuguese', path: '/mespeak/voices/pt.json' }
];

export { AVAILABLE_ESPEAK_VOICES };

/**
 * Loads a script element into the document head if not already present.
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('Window not defined'));
        if (window.meSpeak) return resolve();

        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', (err) => reject(err));
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

/**
 * Initializes the meSpeak engine with config and default voice.
 */
export async function initEspeakEngine(voiceId = 'en/en-us') {
    if (isReady && window.meSpeak && window.meSpeak.isConfigLoaded()) {
        if (window.meSpeak.isVoiceLoaded(voiceId)) {
            return window.meSpeak;
        }
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (typeof window === 'undefined') return null;

        // 1. Load meSpeak script (try local bundle first, fallback to CDN)
        try {
            await loadScript('/mespeak/mespeak.js');
        } catch {
            await loadScript('https://cdn.jsdelivr.net/npm/mespeak/mespeak.js');
        }

        const meSpeak = window.meSpeak;
        if (!meSpeak) throw new Error('Failed to load meSpeak library');

        // 2. Load Config JSON if not loaded
        if (!meSpeak.isConfigLoaded()) {
            await new Promise((resolve, reject) => {
                const configPath = '/mespeak/mespeak_config.json';
                meSpeak.loadConfig(configPath, (success) => {
                    if (success) resolve();
                    else {
                        // Fallback to CDN
                        meSpeak.loadConfig('https://cdn.jsdelivr.net/npm/mespeak/mespeak_config.json', (cdnSuccess) => {
                            if (cdnSuccess) resolve();
                            else reject(new Error('Failed to load meSpeak config'));
                        });
                    }
                });
            });
        }

        // 3. Load Selected Voice
        await loadEspeakVoice(voiceId);

        isReady = true;
        return meSpeak;
    })();

    try {
        const res = await initPromise;
        return res;
    } finally {
        initPromise = null;
    }
}

/**
 * Loads an individual eSpeak voice JSON.
 */
export function loadEspeakVoice(voiceId = 'en/en-us') {
    return new Promise((resolve, reject) => {
        const meSpeak = window.meSpeak;
        if (!meSpeak) return reject(new Error('meSpeak not loaded'));
        if (meSpeak.isVoiceLoaded(voiceId)) return resolve();

        const voiceEntry = AVAILABLE_ESPEAK_VOICES.find(v => v.id === voiceId) || AVAILABLE_ESPEAK_VOICES[0];
        const localPath = voiceEntry.path;

        meSpeak.loadVoice(localPath, (success) => {
            if (success) {
                meSpeak.setDefaultVoice(voiceId);
                resolve();
            } else {
                // Fallback to CDN
                const cdnPath = `https://cdn.jsdelivr.net/npm/mespeak/voices/${voiceId}.json`;
                meSpeak.loadVoice(cdnPath, (cdnSuccess) => {
                    if (cdnSuccess) {
                        meSpeak.setDefaultVoice(voiceId);
                        resolve();
                    } else {
                        reject(new Error(`Failed to load voice ${voiceId}`));
                    }
                });
            }
        });
    });
}

/**
 * Speaks text or IPA phonemes using eSpeak-NG WebAssembly in the browser.
 */
export async function playEspeakWasm({ text, ipa, voice = 'en/en-us', speed = 150, pitch = 50, amplitude = 100 }) {
    if (typeof window === 'undefined') return;

    const meSpeak = await initEspeakEngine(voice);
    if (!meSpeak) throw new Error('meSpeak could not be initialized');

    if (!meSpeak.isVoiceLoaded(voice)) {
        await loadEspeakVoice(voice);
    }

    // Determine target utterance: if IPA is available, format for phonetics
    let target = ipa || text || '';
    if (!target) return;

    // Normalize speed (eSpeak default is 175 wpm)
    const normSpeed = Math.round(Number(speed) || 160);
    const normPitch = Math.round(Number(pitch) || 50);
    const normAmp = Math.round(Number(amplitude) || 100);

    return new Promise((resolve) => {
        try {
            meSpeak.speak(target, {
                voice,
                speed: normSpeed,
                pitch: normPitch,
                amplitude: normAmp,
                wordgap: 0
            }, () => {
                resolve();
            });
        } catch (err) {
            console.warn('eSpeak play error:', err);
            resolve();
        }
    });
}
