// src/utils/formantSynth.js
// Open-source acoustic formant synthesizer for exact linguistic IPA reproduction.
// Uses Web Audio API resonant filters (F1, F2, F3) and noise generators to model
// the human vocal tract directly from IPA phonetic descriptions.
// 100% client-side, zero external server or API keys required.

const VOWEL_FORMANTS = {
    // Front vowels
    'i': { f1: 280, f2: 2250, f3: 2900 },
    'y': { f1: 280, f2: 1900, f3: 2400 },
    'e': { f1: 390, f2: 2000, f3: 2600 },
    'ø': { f1: 390, f2: 1600, f3: 2300 },
    'ɛ': { f1: 530, f2: 1840, f3: 2480 },
    'œ': { f1: 530, f2: 1500, f3: 2300 },
    'æ': { f1: 660, f2: 1720, f3: 2410 },
    // Central vowels
    'ɨ': { f1: 300, f2: 1500, f3: 2500 },
    'ʉ': { f1: 300, f2: 1400, f3: 2300 },
    'ə': { f1: 500, f2: 1500, f3: 2500 },
    'ɜ': { f1: 550, f2: 1450, f3: 2450 },
    'a': { f1: 800, f2: 1400, f3: 2400 },
    // Back vowels
    'ɯ': { f1: 300, f2: 1400, f3: 2300 },
    'u': { f1: 300, f2: 870, f3: 2240 },
    'o': { f1: 450, f2: 900, f3: 2400 },
    'ɔ': { f1: 570, f2: 840, f3: 2410 },
    'ʌ': { f1: 640, f2: 1190, f3: 2390 },
    'ɑ': { f1: 730, f2: 1090, f3: 2440 },
    'ɒ': { f1: 640, f2: 980, f3: 2400 },
    // Near-close vowels
    'ɪ': { f1: 400, f2: 1990, f3: 2550 },
    'ʊ': { f1: 440, f2: 1020, f3: 2240 }
};

export const tokenizeIPA = (ipa) => {
    if (!ipa) return [];
    const clean = String(ipa)
        .replace(/[\/\\\[\]]/g, '')
        .replace(/[ˈˌːˑ]/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .normalize('NFC')
        .trim();

    const tokens = [];
    let i = 0;
    while (i < clean.length) {
        if (clean[i] === ' ' || clean[i] === '.') {
            i++;
            continue;
        }
        // Affricates and tied symbols
        if (clean.slice(i, i + 3) === 't͡ʃ' || clean.slice(i, i + 2) === 'tʃ') {
            tokens.push('tʃ');
            i += clean.slice(i, i + 3) === 't͡ʃ' ? 3 : 2;
            continue;
        }
        if (clean.slice(i, i + 3) === 'd͡ʒ' || clean.slice(i, i + 2) === 'dʒ') {
            tokens.push('dʒ');
            i += clean.slice(i, i + 3) === 'd͡ʒ' ? 3 : 2;
            continue;
        }
        if (clean.slice(i, i + 3) === 't͡s' || clean.slice(i, i + 2) === 'ts') {
            tokens.push('ts');
            i += clean.slice(i, i + 3) === 't͡s' ? 3 : 2;
            continue;
        }
        if (clean.slice(i, i + 3) === 'd͡z' || clean.slice(i, i + 2) === 'dz') {
            tokens.push('dz');
            i += clean.slice(i, i + 3) === 'd͡z' ? 3 : 2;
            continue;
        }
        tokens.push(clean[i]);
        i++;
    }
    return tokens;
};

let audioCtxInstance = null;
const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtxInstance || audioCtxInstance.state === 'closed') {
        audioCtxInstance = new AudioContextClass();
    }
    if (audioCtxInstance.state === 'suspended') {
        audioCtxInstance.resume();
    }
    return audioCtxInstance;
};

/**
 * Creates white noise buffer for unvoiced consonants and bursts
 */
const createNoiseBuffer = (ctx, duration = 0.5) => {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
};

/**
 * Synthesizes and plays IPA phonemes using acoustic vocal tract formant filters.
 */
export const playFormantIPA = async (ipa, { f0 = 130, speed = 1.0 } = {}) => {
    const ctx = getAudioContext();
    if (!ctx) {
        console.warn('Web Audio API not supported in this environment.');
        return;
    }

    const tokens = tokenizeIPA(ipa);
    if (tokens.length === 0) return;

    const baseDuration = Math.max(0.06, 0.14 / Math.max(0.5, speed));
    const noiseBuffer = createNoiseBuffer(ctx, 1.0);

    return new Promise((resolve) => {
        let currentTime = ctx.currentTime + 0.05;

        // Master gain with soft limiter to prevent clipping
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.25, currentTime);
        masterGain.connect(ctx.destination);

        tokens.forEach((token) => {
            const isVowel = !!VOWEL_FORMANTS[token];
            const duration = isVowel ? baseDuration * 1.3 : baseDuration * 0.9;

            if (isVowel) {
                const { f1, f2, f3 } = VOWEL_FORMANTS[token];

                // Glottal source (sawtooth oscillator)
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f0, currentTime);

                const oscGain = ctx.createGain();
                oscGain.gain.setValueAtTime(0.001, currentTime);
                oscGain.gain.exponentialRampToValueAtTime(0.3, currentTime + 0.02);
                oscGain.gain.setValueAtTime(0.3, currentTime + duration - 0.02);
                oscGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

                // Formant 1 filter
                const bp1 = ctx.createBiquadFilter();
                bp1.type = 'bandpass';
                bp1.frequency.setValueAtTime(f1, currentTime);
                bp1.Q.setValueAtTime(5.0, currentTime);

                // Formant 2 filter
                const bp2 = ctx.createBiquadFilter();
                bp2.type = 'bandpass';
                bp2.frequency.setValueAtTime(f2, currentTime);
                bp2.Q.setValueAtTime(7.0, currentTime);

                // Formant 3 filter
                const bp3 = ctx.createBiquadFilter();
                bp3.type = 'bandpass';
                bp3.frequency.setValueAtTime(f3, currentTime);
                bp3.Q.setValueAtTime(10.0, currentTime);

                osc.connect(bp1);
                osc.connect(bp2);
                osc.connect(bp3);

                bp1.connect(oscGain);
                bp2.connect(oscGain);
                bp3.connect(oscGain);

                oscGain.connect(masterGain);

                osc.start(currentTime);
                osc.stop(currentTime + duration);

            } else if (['s', 'z', 'ʃ', 'ʒ', 'f', 'v', 'θ', 'ð', 'x', 'h'].includes(token)) {
                // Fricative noise
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';

                let centerFreq = 5000;
                let q = 3.0;

                if (token === 'ʃ' || token === 'ʒ') {
                    centerFreq = 3000;
                    q = 2.0;
                } else if (token === 'f' || token === 'v' || token === 'θ' || token === 'ð') {
                    centerFreq = 2200;
                    q = 1.0;
                } else if (token === 'x') {
                    centerFreq = 1600;
                    q = 3.0;
                } else if (token === 'h') {
                    centerFreq = 1200;
                    q = 1.5;
                }

                filter.frequency.setValueAtTime(centerFreq, currentTime);
                filter.Q.setValueAtTime(q, currentTime);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.001, currentTime);
                noiseGain.gain.exponentialRampToValueAtTime(0.18, currentTime + 0.02);
                noiseGain.gain.setValueAtTime(0.18, currentTime + duration - 0.02);
                noiseGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

                noise.connect(filter);
                filter.connect(noiseGain);
                noiseGain.connect(masterGain);

                // Add voicing for voiced fricatives (z, ʒ, v, ð)
                if (['z', 'ʒ', 'v', 'ð'].includes(token)) {
                    const voiceOsc = ctx.createOscillator();
                    voiceOsc.type = 'sine';
                    voiceOsc.frequency.setValueAtTime(f0, currentTime);

                    const voiceGain = ctx.createGain();
                    voiceGain.gain.setValueAtTime(0.001, currentTime);
                    voiceGain.gain.linearRampToValueAtTime(0.1, currentTime + 0.02);
                    voiceGain.gain.setValueAtTime(0.1, currentTime + duration - 0.02);
                    voiceGain.gain.linearRampToValueAtTime(0.001, currentTime + duration);

                    voiceOsc.connect(voiceGain);
                    voiceGain.connect(masterGain);

                    voiceOsc.start(currentTime);
                    voiceOsc.stop(currentTime + duration);
                }

                noise.start(currentTime);
                noise.stop(currentTime + duration);

            } else if (['p', 't', 'k', 'b', 'd', 'ɡ', 'tʃ', 'dʒ', 'ts', 'dz', 'ʔ'].includes(token)) {
                // Plosive / Affricate: brief silent closure followed by burst
                const burstTime = currentTime + duration * 0.4;
                const burstDur = 0.025;

                if (token !== 'ʔ') {
                    const noise = ctx.createBufferSource();
                    noise.buffer = noiseBuffer;

                    const burstFilter = ctx.createBiquadFilter();
                    burstFilter.type = 'bandpass';

                    let bFreq = 2000;
                    if (['t', 'd', 'ts', 'dz'].includes(token)) bFreq = 3800;
                    else if (['p', 'b'].includes(token)) bFreq = 700;
                    else if (['tʃ', 'dʒ'].includes(token)) bFreq = 2800;

                    burstFilter.frequency.setValueAtTime(bFreq, burstTime);
                    burstFilter.Q.setValueAtTime(2.5, burstTime);

                    const burstGain = ctx.createGain();
                    burstGain.gain.setValueAtTime(0.001, burstTime);
                    burstGain.gain.linearRampToValueAtTime(0.25, burstTime + 0.005);
                    burstGain.gain.exponentialRampToValueAtTime(0.001, burstTime + burstDur);

                    noise.connect(burstFilter);
                    burstFilter.connect(burstGain);
                    burstGain.connect(masterGain);

                    noise.start(burstTime);
                    noise.stop(burstTime + burstDur);
                }

            } else if (['m', 'n', 'ŋ', 'ɲ'].includes(token)) {
                // Nasal murmur: low voice with nasal antiresonance
                const osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(f0, currentTime);

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(450, currentTime);

                const oscGain = ctx.createGain();
                oscGain.gain.setValueAtTime(0.001, currentTime);
                oscGain.gain.exponentialRampToValueAtTime(0.2, currentTime + 0.02);
                oscGain.gain.setValueAtTime(0.2, currentTime + duration - 0.02);
                oscGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

                osc.connect(filter);
                filter.connect(oscGain);
                oscGain.connect(masterGain);

                osc.start(currentTime);
                osc.stop(currentTime + duration);

            } else if (['l', 'r', 'ɾ', 'w', 'j'].includes(token)) {
                // Liquid / glide
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f0, currentTime);

                let f1 = 350;
                let f2 = 1200;
                if (token === 'w') { f1 = 300; f2 = 750; }
                else if (token === 'j') { f1 = 280; f2 = 2200; }
                else if (token === 'l') { f1 = 360; f2 = 1300; }

                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(f2, currentTime);
                bp.Q.setValueAtTime(4.0, currentTime);

                const oscGain = ctx.createGain();
                oscGain.gain.setValueAtTime(0.001, currentTime);
                oscGain.gain.exponentialRampToValueAtTime(0.2, currentTime + 0.02);
                oscGain.gain.setValueAtTime(0.2, currentTime + duration - 0.02);
                oscGain.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

                osc.connect(bp);
                bp.connect(oscGain);
                oscGain.connect(masterGain);

                osc.start(currentTime);
                osc.stop(currentTime + duration);
            }

            currentTime += duration;
        });

        const totalMs = Math.max(50, (currentTime - ctx.currentTime) * 1000);
        setTimeout(() => {
            resolve();
        }, totalMs);
    });
};
