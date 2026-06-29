// src/utils/soundEffects.js
// Procedural audio using Web Audio API — no external files needed.
// Respects the studySoundEffects toggle from config store.

import { useConfigStore } from '@/store/useConfigStore.jsx';

let audioCtx = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (browsers require user gesture first)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function isMuted() {
    const state = useConfigStore.getState();
    return state.studySoundEffects === false;
}

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
    if (isMuted()) return;
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Silently fail — audio is non-critical
    }
}

/** Cheerful ascending two-note chime */
export function playCorrect() {
    if (isMuted()) return;
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;
        
        // First note
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Second note (higher)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.15, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.35);
    } catch (e) {}
}

/** Low descending buzz for wrong answers */
export function playIncorrect() {
    if (isMuted()) return;
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(120, now + 0.3);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}

/** Celebratory fanfare for completing a lesson */
export function playLevelComplete() {
    if (isMuted()) return;
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const start = now + i * 0.12;
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    } catch (e) {}
}

/** Subtle UI click */
export function playClick() {
    playTone(800, 0.05, 'sine', 0.06);
}

/** Tick sound for timer countdown */
export function playTick() {
    playTone(1200, 0.03, 'sine', 0.04);
}
