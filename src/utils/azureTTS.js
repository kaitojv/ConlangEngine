// src/utils/azureTTS.js
// Text-to-Speech utility supporting Azure Neural Speech (SSML + IPA phonemes)
// with automatic fallback to Web Speech API phonetic synthesis when Azure
// is offline, unauthorized, or not configured.

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
 * Fallback synthesizer using browser Web Speech API with phonetic IPA conversion.
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

            // Determine best matching language accent
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
 * Main TTS dispatcher. Tries Azure TTS if configured; otherwise gracefully falls back
 * to Web Speech API phonetic synthesis without failing or throwing error toasts.
 */
export const playAzureTTS = async ({ text, ipa, voice, useIpa = false }) => {
    // 1. Get Azure configuration from store or env
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

    // Handle IPA-specific voice aliases
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

    // 2. If no Azure key is configured, seamlessly synthesize via Web Speech API
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

            // If Azure throws 400 with IPA, retry with normal text or phonetic approximation
            if (response.status === 400 && ipa && actualUseIpa) {
                console.warn('Azure TTS rejected the IPA string (400). Trying phonetic speech...');
                return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: true });
            }

            // On 401 Unauthorized, 403 Forbidden, 429 Rate Limit, etc., fall back to browser Web Speech API!
            console.warn(`Azure TTS returned ${response.status} (${errorText}). Falling back to browser speech synthesis.`);
            return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: actualUseIpa });
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };
            audio.play().catch(err => {
                URL.revokeObjectURL(url);
                reject(err);
            });
        });
    } catch (networkError) {
        console.warn('Azure TTS request failed, falling back to browser speech synthesis:', networkError);
        return speakWithWebSpeech({ text, ipa, voice: actualVoice, useIpa: actualUseIpa });
    }
};
