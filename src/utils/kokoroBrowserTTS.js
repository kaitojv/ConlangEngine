/**
 * Kokoro-TTS In-Browser Neural Synthesis Engine
 *
 * Runs the 82M-parameter Kokoro neural TTS model directly inside the browser
 * using WebAssembly (WASM) or WebGPU via kokoro-js (Transformers.js + ONNX Runtime Web).
 *
 * Benefits:
 * - 100% client-side in the browser: Zero servers, Python, or Docker required
 * - Automatic caching of model weights in IndexedDB / Cache API
 * - Direct IPA symbol tokenization for custom conlang phonologies
 * - Hardware acceleration via WebGPU with automatic fallback to quantized WASM (q8)
 */

import { ipaToPhoneticText } from './azureTTS.js';

let ttsInstance = null;
let loadPromise = null;
let currentAudio = null;
let currentAudioContext = null;
let currentSourceNode = null;
let loadedDevicePreference = null;
let modelStatus = 'unloaded'; // 'unloaded' | 'loading' | 'ready' | 'error'
let loadProgress = 0;
let statusMessage = '';
let activeDevice = 'wasm';

const statusListeners = new Set();

const notifyListeners = () => {
    const state = getKokoroStatus();
    statusListeners.forEach((listener) => {
        try {
            listener(state);
        } catch (err) {
            console.error('Kokoro status listener error:', err);
        }
    });
};

/**
 * Returns current status of in-browser Kokoro engine.
 */
export const getKokoroStatus = () => ({
    status: modelStatus,
    progress: loadProgress,
    message: statusMessage,
    device: activeDevice,
    isLoaded: modelStatus === 'ready' && !!ttsInstance
});

/**
 * Subscribe to status updates (progress, loading state, readiness).
 * Returns an unsubscribe callback.
 */
export const subscribeKokoroStatus = (listener) => {
    statusListeners.add(listener);
    listener(getKokoroStatus());
    return () => statusListeners.delete(listener);
};

/**
 * Detects the execution device (webgpu or wasm) according to availability and preference.
 *
 * @param {'auto' | 'wasm' | 'webgpu'} preference
 * - 'auto': Uses WebGPU if supported by browser/GPU, fallback to WASM
 * - 'wasm': Forces CPU WebAssembly SIMD (Safe Mode - fixes GPU driver cracks/squishing)
 * - 'webgpu': Forces WebGPU hardware acceleration
 */
export const detectDevice = async (preference = 'auto') => {
    if (preference === 'wasm') {
        return 'wasm';
    }

    if (typeof navigator !== 'undefined' && 'gpu' in navigator && navigator.gpu) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) return 'webgpu';
        } catch {
            // WebGPU permission denied or unavailable
        }
    }

    return 'wasm';
};

/**
 * As 4 Regras de Ouro de Normalização de IPA para o Kokoro-TTS:
 *
 * 1. Troca o g ASCII (U+0067) pelo ɡ IPA (U+0261, ID 92)
 * 2. Converte africadas duplas em ligaduras únicas:
 *    t͡ʃ ou tʃ -> ʧ (133), d͡ʒ ou dʒ -> ʤ (82), t͡s ou ts -> ʦ (20),
 *    d͡z ou dz -> ʣ (18), t͡ɕ ou tɕ -> ʨ (21), d͡ʑ ou dʑ -> ʥ (19), t͡ʂ ou tʂ -> ꭧ (23)
 * 3. Decompõe vogais nasais (NFD) para liberar o combining tilde \u0303 (ID 17)
 * 4. Remove pontos de separação silábica (.) entre caracteres contínuos para evitar pausas/quedas de entonação (ID 4)
 */
export const sanitizeKokoroIPA = (ipa) => {
    if (!ipa) return '';

    // Remove delimitações de transcrição (/.../ ou [...])
    let s = String(ipa).replace(/[\/\\\[\]]/g, '').trim();

    // Regra 3: Decompor vogais nasais (NFD) para liberar o combining tilde \u0303 (ID 17)
    // Ex: ã -> a + \u0303, õ -> o + \u0303
    s = s.normalize('NFD');

    // Regra 1: Trocar g ASCII (U+0067) por ɡ IPA (U+0261, ID 92)
    s = s.replace(/g/g, 'ɡ');

    // Regra 2: Converter africadas duplas em ligaduras únicas reconhecidas pelo vocabulário do Kokoro
    s = s
        .replace(/t[͜͡]?ʃ|tʃ/g, 'ʧ') // U+02A7, ID 133
        .replace(/d[͜͡]?ʒ|dʒ/g, 'ʤ') // U+02A4, ID 82
        .replace(/t[͜͡]?s|ts/g, 'ʦ') // U+02A6, ID 20
        .replace(/d[͜͡]?z|dz/g, 'ʣ') // U+02A3, ID 18
        .replace(/t[͜͡]?ɕ|tɕ/g, 'ʨ') // U+02A8, ID 21
        .replace(/d[͜͡]?ʑ|dʑ/g, 'ʥ') // U+02A5, ID 19
        .replace(/t[͜͡]?ʂ|tʂ/g, 'ꭧ'); // U+AB67, ID 23

    // Limpar barras de ligação (tie bars) remanescentes
    s = s.replace(/[\u0361\u035c]/g, '');

    // Regra 4: Remover pontos de separação silábica (.) para que a palavra seja lida de forma contínua
    // (no vocabulário do Kokoro o ponto '.' tem ID 4 e causa pausa longa e entonação descendente de fim de frase)
    s = s.replace(/(?<=\S)\.(?=\S)/g, '');
    if (!/\s/.test(s)) {
        s = s.replace(/\./g, '');
    }

    return s.trim();
};

/**
 * Encodes audio samples to standard 16-bit PCM WAV (Format 1).
 * Universally supported across all OS audio stacks and browsers without 32-bit float decoding artifacts.
 */
export function encodePCM16WAV(samples, sampleRate = 24000) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');

    // "fmt " sub-chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat 1 = PCM (Signed 16-bit)
    view.setUint16(22, 1, true); // NumChannels = 1 (Mono)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate = sampleRate * numChannels * 2
    view.setUint16(32, 2, true); // BlockAlign = numChannels * 2
    view.setUint16(34, 16, true); // BitsPerSample = 16

    // "data" sub-chunk
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write samples clamped and scaled to 16-bit signed integer [-32768, 32767]
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
}

/**
 * High-fidelity audio player for Kokoro raw neural audio.
 *
 * Benefits:
 * 1. Native Web Audio API (AudioContext) avoids buggy browser 32-bit float WAV decoders.
 * 2. Peak normalization & limiter prevents DAC overflow clicks, squishing, and crackling.
 * 3. Falls back to standard 16-bit PCM WAV if AudioContext is unsupported.
 */
export const playRawAudio = async (rawAudio) => {
    stopKokoroAudio();

    if (!rawAudio || !rawAudio.audio) return;

    const sampleRate = rawAudio.sampling_rate || 24000;
    const rawData = rawAudio.audio;

    // 1. Sanitize NaNs/Infinities and compute peak amplitude
    let maxVal = 0;
    const cleanSamples = new Float32Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        let val = rawData[i];
        if (!Number.isFinite(val)) {
            val = 0;
        }
        cleanSamples[i] = val;
        const abs = Math.abs(val);
        if (abs > maxVal) maxVal = abs;
    }

    // 2. Anti-clipping peak limiter with safe headroom (0.98)
    if (maxVal > 0.98) {
        const factor = 0.98 / maxVal;
        for (let i = 0; i < cleanSamples.length; i++) {
            cleanSamples[i] *= factor;
        }
    }

    // 3. Web Audio API playback: Direct Float32 channel feed without codec translation
    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtx();
            currentAudioContext = ctx;

            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            const buffer = ctx.createBuffer(1, cleanSamples.length, sampleRate);
            buffer.copyToChannel(cleanSamples, 0);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            currentSourceNode = source;

            return new Promise((resolve) => {
                source.onended = () => {
                    if (currentSourceNode === source) currentSourceNode = null;
                    if (currentAudioContext === ctx) {
                        try { ctx.close(); } catch {}
                        currentAudioContext = null;
                    }
                    resolve();
                };
                source.start(0);
            });
        } catch (audioCtxErr) {
            console.warn('Web Audio API playback failed, falling back to 16-bit PCM WAV:', audioCtxErr);
        }
    }

    // 4. Fallback: 16-bit PCM WAV through HTML5 Audio element
    return new Promise((resolve, reject) => {
        try {
            const wavBuffer = encodePCM16WAV(cleanSamples, sampleRate);
            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(blob);
            const audioEl = new Audio(audioUrl);
            currentAudio = audioEl;

            audioEl.onended = () => {
                URL.revokeObjectURL(audioUrl);
                if (currentAudio === audioEl) currentAudio = null;
                resolve();
            };
            audioEl.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                if (currentAudio === audioEl) currentAudio = null;
                reject(e);
            };
            audioEl.play().catch(reject);
        } catch (playErr) {
            reject(playErr);
        }
    });
};

/**
 * Initializes and caches the in-browser KokoroTTS model.
 * Downloads model weights on first invocation (cached afterwards).
 *
 * @param {Object} options
 * @param {Function} [options.onProgress]
 * @param {'auto' | 'wasm' | 'webgpu'} [options.devicePreference='auto']
 */
export const initKokoroModel = async ({ onProgress, devicePreference = 'auto' } = {}) => {
    if (typeof window === 'undefined') {
        // Node / test environment safe mock
        modelStatus = 'ready';
        statusMessage = 'Headless / Test Mode';
        return null;
    }

    // If already loaded with the same device preference, reuse instance
    if (ttsInstance && (!loadedDevicePreference || loadedDevicePreference === devicePreference)) {
        return ttsInstance;
    }

    // If user changed device preference (e.g. from WebGPU to WASM), reset instance to switch backend
    if (ttsInstance && loadedDevicePreference && loadedDevicePreference !== devicePreference) {
        stopKokoroAudio();
        ttsInstance = null;
        loadPromise = null;
    }

    if (loadPromise) {
        return loadPromise;
    }

    modelStatus = 'loading';
    loadProgress = 0;
    statusMessage = 'Initializing Kokoro in-browser engine...';
    notifyListeners();

    loadPromise = (async () => {
        try {
            const { KokoroTTS } = await import('kokoro-js');
            const targetDevice = await detectDevice(devicePreference);
            activeDevice = targetDevice;

            const handleProgress = (p) => {
                if (p && typeof p.progress === 'number') {
                    loadProgress = Math.min(100, Math.round(p.progress));
                    statusMessage = `Downloading model weights: ${loadProgress}%`;
                } else if (p && p.status) {
                    statusMessage = `Loading: ${p.status} ${p.file ? `(${p.file})` : ''}`.trim();
                }
                notifyListeners();
                if (onProgress) onProgress(p);
            };

            // If WebGPU is selected/supported, use fp32 for maximum neural fidelity.
            // On WASM, use q8 quantization for fast CPU execution and clean compatibility.
            const preferredDtype = targetDevice === 'webgpu' ? 'fp32' : 'q8';
            const modelId = 'onnx-community/Kokoro-82M-v1.0-ONNX';

            statusMessage = `Loading Kokoro neural weights (${targetDevice.toUpperCase()})...`;
            notifyListeners();

            let instance;
            try {
                instance = await KokoroTTS.from_pretrained(modelId, {
                    dtype: preferredDtype,
                    device: targetDevice,
                    progress_callback: handleProgress
                });
            } catch (initErr) {
                if (targetDevice === 'webgpu') {
                    console.warn('WebGPU Kokoro load failed, falling back to WASM q8:', initErr);
                    activeDevice = 'wasm';
                    statusMessage = 'Falling back to WebAssembly (q8)...';
                    notifyListeners();
                    instance = await KokoroTTS.from_pretrained(modelId, {
                        dtype: 'q8',
                        device: 'wasm',
                        progress_callback: handleProgress
                    });
                } else {
                    throw initErr;
                }
            }

            // Patch instance voice validator so it supports all accents & international voices
            const allowedVoices = new Set(KOKORO_VOICES.map(v => v.value));
            instance._validate_voice = function(voice) {
                if (allowedVoices.has(voice)) {
                    return voice.charAt(0);
                }
                return 'a';
            };

            ttsInstance = instance;
            loadedDevicePreference = devicePreference;
            modelStatus = 'ready';
            loadProgress = 100;
            statusMessage = `Ready (${activeDevice.toUpperCase()})`;
            notifyListeners();
            return ttsInstance;
        } catch (err) {
            console.error('Failed to load in-browser Kokoro model:', err);
            modelStatus = 'error';
            statusMessage = `Failed to load: ${err.message || 'Network / browser error'}`;
            loadPromise = null;
            notifyListeners();
            throw err;
        }
    })();

    return loadPromise;
};

/**
 * Stops any currently playing Kokoro audio across all audio players.
 */
export const stopKokoroAudio = () => {
    if (currentSourceNode) {
        try {
            currentSourceNode.stop();
            currentSourceNode.disconnect();
        } catch {}
        currentSourceNode = null;
    }
    if (currentAudioContext && currentAudioContext.state !== 'closed') {
        try {
            currentAudioContext.close();
        } catch {}
        currentAudioContext = null;
    }
    if (currentAudio) {
        try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        } catch {}
    }
};

/**
 * Clears the Kokoro voice and model caches in CacheStorage
 * to fix any corrupted voice downloads or broken model weights.
 */
export const clearKokoroCache = async () => {
    stopKokoroAudio();
    ttsInstance = null;
    loadPromise = null;
    loadedDevicePreference = null;
    modelStatus = 'unloaded';
    loadProgress = 0;
    statusMessage = 'Cache cleared. Ready to reload.';
    notifyListeners();

    let clearedVoices = false;
    let clearedModels = false;

    if (typeof caches !== 'undefined') {
        try {
            clearedVoices = await caches.delete('kokoro-voices');
        } catch (e) {
            console.warn('Could not delete kokoro-voices cache:', e);
        }
        try {
            clearedModels = await caches.delete('transformers-cache');
        } catch (e) {
            console.warn('Could not delete transformers-cache:', e);
        }
    }

    return { clearedVoices, clearedModels };
};

/**
 * Synthesizes and plays speech using the in-browser Kokoro TTS engine.
 */
export const speakWithKokoroInBrowser = async ({
    text = '',
    ipa = '',
    voice = 'af_heart',
    speed = 1.0,
    sendIpa = true,
    devicePreference = 'auto',
    onProgress
} = {}) => {
    if (typeof window === 'undefined') {
        // Safe for test / headless environment
        return;
    }

    stopKokoroAudio();

    const tts = await initKokoroModel({ onProgress, devicePreference });
    if (!tts) return;

    const cleanSpeed = Math.max(0.5, Math.min(2.0, Number(speed) || 1.0));
    const targetVoice = voice || 'af_heart';

    let cleanIpa = '';
    if (sendIpa && ipa) {
        cleanIpa = sanitizeKokoroIPA(ipa);
    }

    let audio;

    // 1. Attempt direct phonetic tokenization when IPA phonemes are present
    if (cleanIpa && tts.tokenizer && typeof tts.generate_from_ids === 'function') {
        try {
            const { input_ids } = tts.tokenizer(cleanIpa, { truncation: true });
            if (input_ids) {
                try {
                    audio = await tts.generate_from_ids(input_ids, {
                        voice: targetVoice,
                        speed: cleanSpeed
                    });
                } catch (voiceErr) {
                    if (targetVoice !== 'af_heart') {
                        console.warn(`Voice "${targetVoice}" failed, falling back to "af_heart":`, voiceErr);
                        audio = await tts.generate_from_ids(input_ids, {
                            voice: 'af_heart',
                            speed: cleanSpeed
                        });
                    } else {
                        throw voiceErr;
                    }
                }
            }
        } catch (ipaErr) {
            console.warn('Kokoro direct IPA tokenization failed, falling back to text generation:', ipaErr);
        }
    }

    // 2. Fallback to standard text generation (uses Kokoro phonemizer)
    if (!audio) {
        const inputText = text || cleanIpa || (ipa ? sanitizeKokoroIPA(ipa) : '');
        if (!inputText) return;
        try {
            audio = await tts.generate(inputText, {
                voice: targetVoice,
                speed: cleanSpeed
            });
        } catch (genErr) {
            if (targetVoice !== 'af_heart') {
                console.warn(`Voice "${targetVoice}" text generation failed, falling back to "af_heart":`, genErr);
                audio = await tts.generate(inputText, {
                    voice: 'af_heart',
                    speed: cleanSpeed
                });
            } else {
                throw genErr;
            }
        }
    }

    if (!audio) return;

    // 3. Play generated raw audio through Web Audio API with peak limiter & fallback
    return playRawAudio(audio);
};

/**
 * Full catalog of voices supported by Kokoro-TTS.
 */
export const KOKORO_VOICES = [
    // Portuguese (pt-BR / pt-PT)
    { value: 'pm_alex', label: 'Alex (Portuguese Male - Natural & Articulate)', group: 'Portuguese' },
    { value: 'pf_dora', label: 'Dora (Portuguese Female - Clear & Expressive)', group: 'Portuguese' },
    { value: 'pm_santa', label: 'Santa (Portuguese Male - Deep)', group: 'Portuguese' },

    // Spanish (es)
    { value: 'ef_dora', label: 'Dora (Spanish Female - Expressive)', group: 'Spanish' },
    { value: 'em_alex', label: 'Alex (Spanish Male - Dynamic)', group: 'Spanish' },
    { value: 'em_santa', label: 'Santa (Spanish Male - Warm)', group: 'Spanish' },

    // French (fr)
    { value: 'ff_siwis', label: 'Siwis (French Female - Natural)', group: 'French' },

    // Italian (it)
    { value: 'if_sara', label: 'Sara (Italian Female - Bright)', group: 'Italian' },
    { value: 'im_nicola', label: 'Nicola (Italian Male - Warm)', group: 'Italian' },

    // Japanese (ja)
    { value: 'jf_alpha', label: 'Alpha (Japanese Female)', group: 'Japanese' },
    { value: 'jf_gongitsune', label: 'Gongitsune (Japanese Female)', group: 'Japanese' },
    { value: 'jf_nezumi', label: 'Nezumi (Japanese Female)', group: 'Japanese' },
    { value: 'jf_tebukuro', label: 'Tebukuro (Japanese Female)', group: 'Japanese' },
    { value: 'jm_kumo', label: 'Kumo (Japanese Male)', group: 'Japanese' },

    // Mandarin Chinese (zh)
    { value: 'zf_xiaobei', label: 'Xiaobei (Mandarin Female)', group: 'Mandarin' },
    { value: 'zf_xiaoni', label: 'Xiaoni (Mandarin Female)', group: 'Mandarin' },
    { value: 'zf_xiaoxiao', label: 'Xiaoxiao (Mandarin Female)', group: 'Mandarin' },
    { value: 'zf_xiaoyi', label: 'Xiaoyi (Mandarin Female)', group: 'Mandarin' },
    { value: 'zm_yunjian', label: 'Yunjian (Mandarin Male)', group: 'Mandarin' },
    { value: 'zm_yunxi', label: 'Yunxi (Mandarin Male)', group: 'Mandarin' },

    // Hindi (hi)
    { value: 'hf_alpha', label: 'Alpha (Hindi Female)', group: 'Hindi' },
    { value: 'hm_omega', label: 'Omega (Hindi Male)', group: 'Hindi' },

    // American Female (en-US)
    { value: 'af_heart', label: 'Heart (US Female - Warm & Expressive - Recommended)', group: 'US English' },
    { value: 'af_bella', label: 'Bella (US Female - Crisp)', group: 'US English' },
    { value: 'af_nicole', label: 'Nicole (US Female - Whispery)', group: 'US English' },
    { value: 'af_sarah', label: 'Sarah (US Female - Bright)', group: 'US English' },
    { value: 'af_sky', label: 'Sky (US Female - Soft)', group: 'US English' },
    { value: 'af_alloy', label: 'Alloy (US Female - Neutral)', group: 'US English' },
    { value: 'af_aoede', label: 'Aoede (US Female - Melodic)', group: 'US English' },
    { value: 'af_jessica', label: 'Jessica (US Female - Conversational)', group: 'US English' },
    { value: 'af_kore', label: 'Kore (US Female - Youthful)', group: 'US English' },
    { value: 'af_nova', label: 'Nova (US Female - Energetic)', group: 'US English' },
    { value: 'af_river', label: 'River (US Female - Calming)', group: 'US English' },

    // American Male (en-US)
    { value: 'am_adam', label: 'Adam (US Male - Clear Narrator)', group: 'US English' },
    { value: 'am_michael', label: 'Michael (US Male - Deep & Resonant)', group: 'US English' },
    { value: 'am_echo', label: 'Echo (US Male - Balanced)', group: 'US English' },
    { value: 'am_eric', label: 'Eric (US Male - Friendly)', group: 'US English' },
    { value: 'am_fenrir', label: 'Fenrir (US Male - Heavy & Deep)', group: 'US English' },
    { value: 'am_liam', label: 'Liam (US Male - Articulate)', group: 'US English' },
    { value: 'am_onyx', label: 'Onyx (US Male - Authoritative)', group: 'US English' },
    { value: 'am_puck', label: 'Puck (US Male - Playful)', group: 'US English' },
    { value: 'am_santa', label: 'Santa (US Male - Jolly)', group: 'US English' },

    // British Female (en-GB)
    { value: 'bf_emma', label: 'Emma (UK Female - Standard British)', group: 'UK English' },
    { value: 'bf_isabella', label: 'Isabella (UK Female - Soft British)', group: 'UK English' },
    { value: 'bf_alice', label: 'Alice (UK Female - Clear & Poised)', group: 'UK English' },
    { value: 'bf_lily', label: 'Lily (UK Female - Expressive)', group: 'UK English' },

    // British Male (en-GB)
    { value: 'bm_george', label: 'George (UK Male - Warm British)', group: 'UK Male' },
    { value: 'bm_lewis', label: 'Lewis (UK Male - Resonant British)', group: 'UK Male' },
    { value: 'bm_daniel', label: 'Daniel (UK Male - Precise Narrator)', group: 'UK Male' },
    { value: 'bm_fable', label: 'Fable (UK Male - Dynamic)', group: 'UK Male' }
];
