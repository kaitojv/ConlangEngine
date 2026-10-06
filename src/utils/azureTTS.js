// src/utils/azureTTS.js
// Multi-provider speech synthesis engine supporting:
// 1. Browser Web Speech (enhanced phonetic IPA transliteration)
// 2. Open-source Acoustic Formant Synthesizer (pure Web Audio client-side IPA)
// 3. OpenTTS / eSpeak-NG (self-hosted open-source server)
// 4. Custom Audio Endpoint (Kokoro / Piper / OpenAI-compatible audio API)
// 5. Microsoft Azure Neural Speech (SSML + IPA phonemes)

import { playFormantIPA } from './formantSynth.js';
import { playHumanIpaAudio } from './humanIpaAudio.js';

let cachedConfigStore = null;
if (typeof window !== 'undefined') {
    import('../store/useConfigStore.jsx')
        .then((mod) => { cachedConfigStore = mod.useConfigStore; })
        .catch(() => {});
}

/**
 * Transcribes IPA symbols into clean phonetic text that browser speech engines
 * can pronounce clearly and naturally across different operating systems.
 */
export const ipaToPhoneticText = (ipa) => {
    if (!ipa) return '';

    let s = String(ipa)
        .replace(/[\/\\\[\]]/g, '')     // remove brackets and slashes
        .replace(/[ˈˌ]/g, '')         // stress marks
        .replace(/[ːˑ]/g, '')         // length marks
        .replace(/[˥˦˧˨˩¹²³⁴⁵]/g, '') // tone bars and tone numbers
        .normalize('NFD')             // decompose accented chars into base + combining diacritic
        .replace(/[\u0300-\u036f]/g, '') // strip all combining diacritics
        .normalize('NFC')
        .trim();

    // 1. Single-pass Vowel Translation (prevents cascaded replacement of letters like 'i' in 'ih')
    const VOWEL_MAP = {
        'æ': 'a',
        'ɑ': 'ah',
        'ɒ': 'o',
        'ɔ': 'aw',
        'ʌ': 'u',
        'ə': 'uh',
        'ɜ': 'er',
        'ɛ': 'eh',
        'e': 'e',
        'ɪ': 'ih',
        'i': 'ee',
        'ʊ': 'oo',
        'u': 'oo',
        'ø': 'eu',
        'œ': 'oe'
    };
    s = s.replace(/[æɑɒɔʌəɜɛeɪiʊuøœ]/g, (char) => VOWEL_MAP[char] || char);

    // 2. Affricates and tied symbols
    s = s
        .replace(/t[͡]?ʃ/g, 'ch')
        .replace(/d[͡]?ʒ/g, 'j')
        .replace(/t[͡]?s/g, 'ts')
        .replace(/d[͡]?z/g, 'dz')
        .replace(/kp/g, 'kp')
        .replace(/gb/g, 'gb');

    // 3. Consonants
    s = s
        .replace(/ɡ/g, 'g')
        .replace(/ʃ/g, 'sh')
        .replace(/ʒ/g, 'zh')
        .replace(/θ/g, 'th')
        .replace(/ð/g, 'th')
        .replace(/ç/g, 'hy')
        .replace(/[xχ]/g, 'kh')
        .replace(/[ɣʁ]/g, 'gh')
        .replace(/ŋ/g, 'ng')
        .replace(/ɲ/g, 'ny')
        .replace(/ɳ/g, 'n')
        .replace(/ɱ/g, 'm')
        .replace(/ɴ/g, 'ng')
        .replace(/ʎ/g, 'ly')
        .replace(/ɭ/g, 'l')
        .replace(/ɬ/g, 'hl')
        .replace(/ɮ/g, 'zl')
        .replace(/[ɾrʀ]/g, 'r')
        .replace(/j/g, 'y')
        .replace(/w/g, 'w')
        .replace(/ʔ/g, "'")
        .replace(/[ħʕ]/g, 'h')
        .replace(/[ɸβ]/g, 'f');

    // Syllable markers
    s = s.replace(/\./g, ' ');

    return s.trim();
};

/**
 * Provider 1: Browser Web Speech API with phonetic IPA conversion.
 */
export const speakWithWebSpeech = ({ text, ipa, voice, useIpa = false }) => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            console.warn('Browser SpeechSynthesis is unavailable.');
            return resolve();
        }

        let speechText = '';
        if (useIpa && ipa) {
            speechText = ipaToPhoneticText(ipa);
        }
        if (!speechText) {
            speechText = (text || '').replace(/[.\-*]/g, '').trim();
        }
        if (!speechText) {
            return resolve();
        }

        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(speechText);

            let lang = 'en-US';
            const v = String(voice || '').toLowerCase();
            if (v === 'ipa-uk' || v.startsWith('en-gb')) lang = 'en-GB';
            else if (v === 'ipa-fr' || v.startsWith('fr-')) lang = 'fr-FR';
            else if (v.startsWith('de-')) lang = 'de-DE';
            else if (v.startsWith('es-')) lang = 'es-ES';
            else if (v.startsWith('it-')) lang = 'it-IT';
            else if (v.startsWith('ja-')) lang = 'ja-JP';
            else if (v.startsWith('zh-')) lang = 'zh-CN';
            else if (v.startsWith('ko-')) lang = 'ko-KR';
            else if (v.startsWith('pt-')) lang = 'pt-BR';
            else if (v.startsWith('ru-')) lang = 'ru-RU';
            else if (v.startsWith('ar-')) lang = 'ar-EG';
            else if (v.startsWith('hi-')) lang = 'hi-IN';

            utterance.lang = lang;

            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                const match = voices.find(v => v.lang === lang || v.lang.startsWith(lang.slice(0, 2)));
                if (match) utterance.voice = match;
            }

            utterance.rate = 0.95;
            utterance.pitch = 1.0;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
                console.warn('SpeechSynthesis playback warning:', e);
                resolve();
            };

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('SpeechSynthesis error:', err);
            resolve();
        }
    });
};

/**
 * Provider 2: OpenTTS / eSpeak-NG (Self-hosted open source server)
 */
export const speakWithOpenTTS = async ({ text, ipa, url = 'http://localhost:5500', voice = 'espeak:en' }) => {
    const input = ipa || text;
    if (!input) return;
    const cleanUrl = url.replace(/\/+$/, '');
    const ttsUrl = `${cleanUrl}/api/tts?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(input)}`;
    const response = await fetch(ttsUrl);
    if (!response.ok) {
        throw new Error(`OpenTTS returned HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    return new Promise((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.onerror = (e) => { URL.revokeObjectURL(audioUrl); reject(e); };
        audio.play().catch(reject);
    });
};

/**
 * Provider 3: Kokoro-TTS (Open-Source 82M Neural Model)
 * Connects to Kokoro-FastAPI (ghcr.io/remsky/kokoro-fastapi) or any OpenAI-compatible Kokoro instance.
 * Supports direct phonetic/IPA inputs and high-fidelity neural voices.
 */
export const speakWithKokoro = async ({
    text,
    ipa,
    url = 'http://localhost:8880/v1/audio/speech',
    voice = 'af_heart',
    speed = 1.0,
    sendIpa = true
} = {}) => {
    let targetUrl = (url || 'http://localhost:8880/v1/audio/speech').trim().replace(/\/+$/, '');
    if (!targetUrl.includes('/speech') && !targetUrl.includes('/tts')) {
        targetUrl += '/v1/audio/speech';
    }

    let input = '';
    if (sendIpa && ipa) {
        input = ipa.replace(/[\/\\\[\]]/g, '').trim();
    }
    if (!input) {
        input = text || (ipa ? ipaToPhoneticText(ipa) : '');
    }
    if (!input) return;

    const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'kokoro',
            input,
            voice: voice || 'af_heart',
            speed: Number(speed) || 1.0,
            response_format: 'mp3'
        })
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Kokoro-TTS server returned HTTP ${response.status}: ${errorText}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    return new Promise((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.onerror = (e) => { URL.revokeObjectURL(audioUrl); reject(e); };
        audio.play().catch(reject);
    });
};

/**
 * Provider 4: Custom API Endpoint (OpenAI-compatible / Piper server)
 */
export const speakWithCustomEndpoint = async ({ text, ipa, url, key, voice }) => {
    if (!url) throw new Error('Custom TTS endpoint URL is required.');
    const input = ipa || text;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(key ? { 'Authorization': `Bearer ${key}` } : {})
        },
        body: JSON.stringify({
            model: voice || 'tts-1',
            input,
            voice: voice || 'alloy'
        })
    });
    if (!response.ok) {
        throw new Error(`Custom endpoint returned HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    return new Promise((resolve, reject) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.onerror = (e) => { URL.revokeObjectURL(audioUrl); reject(e); };
        audio.play().catch(reject);
    });
};

const escapeXml = (unsafe) => {
    return (unsafe || '').replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

/**
 * Provider 4: Microsoft Azure Neural Speech (SSML + IPA phonemes)
 */
export const speakWithAzure = async ({ text, ipa, voice, useIpa = false }) => {
    let key = '';
    let region = 'brazilsouth';

    if (typeof window !== 'undefined') {
        try {
            const state = cachedConfigStore?.getState ? cachedConfigStore.getState() : {};
            if (state?.azureTtsKey) key = state.azureTtsKey.trim();
            if (state?.azureTtsRegion) region = state.azureTtsRegion.trim() || region;
        } catch {
            // Non-fatal
        }
    }

    if (!key && typeof import.meta !== 'undefined' && import.meta.env?.VITE_AZURE_TTS_KEY) {
        key = String(import.meta.env.VITE_AZURE_TTS_KEY).trim();
    }
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AZURE_TTS_REGION) {
        region = String(import.meta.env.VITE_AZURE_TTS_REGION).trim() || region;
    }

    let actualVoice = voice || 'ipa-default';
    let actualUseIpa = useIpa;

    if (actualVoice === 'ipa-default') {
        actualVoice = 'en-US-JennyMultilingualNeural';
        actualUseIpa = true;
    } else if (actualVoice === 'ipa-uk') {
        actualVoice = 'en-GB-RyanNeural';
        actualUseIpa = true;
    } else if (actualVoice === 'ipa-fr') {
        actualVoice = 'fr-FR-DeniseNeural';
        actualUseIpa = true;
    }

    if (!key) {
        return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: actualUseIpa });
    }

    const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    let ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${actualVoice.substring(0, 5)}">
        <voice name="${actualVoice}">`;

    if (ipa && actualUseIpa) {
        const rawIpa = ipa.replace(/[\/\\\[\]]/g, '').trim();
        if (rawIpa) {
            ssml += `<phoneme alphabet="ipa" ph="${escapeXml(rawIpa)}">${escapeXml(text || rawIpa)}</phoneme>`;
        } else {
            ssml += escapeXml(text);
        }
    } else {
        ssml += escapeXml(text);
    }

    ssml += `</voice></speak>`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
            },
            body: ssml
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            if (response.status === 400 && ipa && actualUseIpa) {
                console.warn('Azure TTS rejected the IPA string (400). Trying phonetic speech...');
                return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: true });
            }
            console.warn(`Azure TTS returned ${response.status} (${errorText}). Falling back to browser speech synthesis.`);
            return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: actualUseIpa });
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        return new Promise((resolve, reject) => {
            audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
            audio.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
            audio.play().catch(reject);
        });
    } catch (networkError) {
        console.warn('Azure TTS request failed, falling back to browser speech synthesis:', networkError);
        return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: actualUseIpa });
    }
};

/**
 * Universal TTS & IPA dispatcher. Routes to the user's selected engine:
 * 'browser' | 'formant' | 'opentts' | 'custom' | 'azure'.
 */
export const playTTS = async ({ text, ipa, voice, useIpa = false, engine } = {}) => {
    let state = {};
    if (typeof window !== 'undefined') {
        try {
            state = cachedConfigStore?.getState ? cachedConfigStore.getState() : {};
        } catch {
            // Non-fatal
        }
    }

    const selectedEngine = engine || state.ttsEngine || 'browser';

    // 1. Acoustic Formant Synthesizer (pure client-side open-source IPA modeling)
    if (selectedEngine === 'formant') {
        if (ipa) {
            try {
                await playFormantIPA(ipa, {
                    f0: state.formantF0 || 130,
                    speed: state.ttsSpeed || 1.0
                });
                return;
            } catch (err) {
                console.warn('Formant synthesis error, falling back to Web Speech:', err);
            }
        }
        return speakWithWebSpeech({ text, ipa, voice, useIpa: true });
    }

    // 2. Authentic Human IPA Audio Bank (Wikimedia Commons IPA recordings)
    if (selectedEngine === 'human') {
        try {
            await playHumanIpaAudio({ ipa, text });
            return;
        } catch (err) {
            console.warn('Human IPA audio player error, falling back to Web Speech:', err);
            return speakWithWebSpeech({ text, ipa, voice, useIpa: true });
        }
    }

    // 2. OpenTTS / eSpeak-NG (self-hosted open source server)
    if (selectedEngine === 'opentts' && state.openTtsUrl) {
        try {
            await speakWithOpenTTS({
                text,
                ipa,
                url: state.openTtsUrl,
                voice: state.openTtsVoice || 'espeak:en'
            });
            return;
        } catch (err) {
            console.warn('OpenTTS server failed, falling back to browser speech:', err);
            return speakWithWebSpeech({ text, ipa, voice, useIpa });
        }
    }

    // 3. Kokoro-TTS (Open-Source 82M Neural Model)
    if (selectedEngine === 'kokoro') {
        try {
            await speakWithKokoro({
                text,
                ipa,
                url: state.kokoroUrl || 'http://localhost:8880/v1/audio/speech',
                voice: state.kokoroVoice || 'af_heart',
                speed: state.kokoroSpeed ?? state.ttsSpeed ?? 1.0,
                sendIpa: state.kokoroSendIpa ?? true
            });
            return;
        } catch (err) {
            console.warn('Kokoro-TTS server request failed, falling back to Web Speech:', err);
            return speakWithWebSpeech({ text, ipa, voice, useIpa: true });
        }
    }

    // 4. Custom OpenAI-compatible / Piper endpoint
    if (selectedEngine === 'custom' && state.customTtsUrl) {
        try {
            await speakWithCustomEndpoint({
                text,
                ipa,
                url: state.customTtsUrl,
                key: state.customTtsKey,
                voice: state.customTtsVoice
            });
            return;
        } catch (err) {
            console.warn('Custom endpoint failed, falling back to browser speech:', err);
            return speakWithWebSpeech({ text, ipa, voice, useIpa });
        }
    }

    // 4. Microsoft Azure Neural Speech
    if (selectedEngine === 'azure') {
        return speakWithAzure({ text, ipa, voice: voice || state.azureTtsVoice, useIpa });
    }

    // 5. Default: Browser Web Speech with enhanced phonetic IPA conversion
    return speakWithWebSpeech({
        text,
        ipa,
        voice: voice || state.azureTtsVoice || state.ttsVoice,
        useIpa: useIpa ?? state.azureTtsUseIpa ?? true
    });
};

/**
 * Backward-compatible alias for existing codebase components.
 */
export const playAzureTTS = playTTS;
