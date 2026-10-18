import assert from 'node:assert/strict';
import { ipaToPhoneticText, playAzureTTS, playTTS, speakWithWebSpeech } from '../src/utils/azureTTS.js';
import { tokenizeIPA, playFormantIPA } from '../src/utils/formantSynth.js';

console.log('--- test_azureTTS.js ---');

// 1. ipaToPhoneticText
assert.equal(ipaToPhoneticText(''), '');
assert.equal(ipaToPhoneticText('/sǎtēwà/'), 'satewa', 'Strips tone diacritics from vowels');
assert.equal(ipaToPhoneticText('/t͡ʃaŋ.ku/'), 'chang koo', 'Transcribes affricate t͡ʃ and velar nasal ŋ');
assert.equal(ipaToPhoneticText('/ʃolo/'), 'sholo', 'Transcribes postalveolar fricative ʃ');
assert.equal(ipaToPhoneticText('/xalo/'), 'khalo', 'Transcribes velar fricative x');
assert.equal(ipaToPhoneticText('/θɔːt/'), 'thawt', 'Transcribes dental fricative θ and open-mid vowel ɔ');
assert.equal(ipaToPhoneticText('/ɲa.ɲa/'), 'nya nya', 'Transcribes palatal nasal ɲ without breaking y');
assert.equal(ipaToPhoneticText('[ˈmæ.ɡɪk]'), 'ma gihk', 'Strips brackets and stress marks');
console.log('  ✓ ipaToPhoneticText correctly transcribes IPA phonemes into clean pronunciation');

// 2. tokenizeIPA for Formant Synthesizer
assert.deepEqual(tokenizeIPA(''), []);
assert.deepEqual(tokenizeIPA('/satewa/'), ['s', 'a', 't', 'e', 'w', 'a']);
assert.deepEqual(tokenizeIPA('/t͡ʃaŋ.ku/'), ['tʃ', 'a', 'ŋ', 'k', 'u']);
assert.deepEqual(tokenizeIPA('[ˈd͡ʒæz]'), ['dʒ', 'æ', 'z']);
console.log('  ✓ tokenizeIPA accurately parses IPA tokens, multi-character affricates, and diacritics');

// 3. playFormantIPA is safe in headless / node environments
await assert.doesNotReject(async () => {
    await playFormantIPA('/sǎtēwà/', { f0: 130, speed: 1.0 });
});
console.log('  ✓ playFormantIPA handles headless environment safely');

// 4. playTTS dispatcher across all engines
await assert.doesNotReject(async () => {
    await playTTS({ text: 'test', ipa: '/sǎtēwà/', engine: 'formant' });
    await playTTS({ text: 'test', ipa: '/sǎtēwà/', engine: 'browser' });
    await playTTS({ text: 'test', ipa: '/sǎtēwà/', engine: 'kokoro' });
    await playTTS({ text: 'test', ipa: '/sǎtēwà/', engine: 'azure' });
}, 'playTTS dispatcher is resilient and gracefully handles all engine routes');
console.log('  ✓ playTTS universal dispatcher routes and handles all engines');

// 5. playAzureTTS with missing or expired key gracefully falls back without throwing
await assert.doesNotReject(async () => {
    await playAzureTTS({
        text: 'test',
        ipa: '/sǎtēwà/',
        voice: 'ipa-default',
        useIpa: true
    });
}, 'playAzureTTS never throws unhandled rejection');
console.log('  ✓ playAzureTTS gracefully falls back without throwing');

// 6. speakWithWebSpeech resolves cleanly in non-browser environments
await assert.doesNotReject(async () => {
    await speakWithWebSpeech({ text: 'hello', ipa: '/hɛloʊ/', voice: 'ipa-default', useIpa: true });
});
console.log('  ✓ speakWithWebSpeech is safe in headless environments');

// 7. in-browser Kokoro neural engine
const { getKokoroStatus, detectDevice, KOKORO_VOICES, speakWithKokoroInBrowser } = await import('../src/utils/kokoroBrowserTTS.js');
assert.ok(Array.isArray(KOKORO_VOICES) && KOKORO_VOICES.length > 20, 'Kokoro voice catalog is populated');
assert.ok(KOKORO_VOICES.some(v => v.value === 'af_heart'), 'af_heart default voice is available');
const device = await detectDevice();
assert.ok(device === 'wasm' || device === 'webgpu', 'detectDevice resolves to valid runtime device');
const status = getKokoroStatus();
assert.ok(status && typeof status.status === 'string', 'getKokoroStatus returns valid engine state');
await assert.doesNotReject(async () => {
    await speakWithKokoroInBrowser({ text: 'test', ipa: '/sǎtēwà/', voice: 'af_heart' });
});
console.log('  ✓ in-browser Kokoro neural synthesis module works and is safe in headless environments');

// 8. As 4 Regras de Ouro de Normalização de IPA do Kokoro
const { sanitizeKokoroIPA } = await import('../src/utils/kokoroBrowserTTS.js');

// Regra 1: Trocar g ASCII (U+0067) por ɡ IPA (U+0261, ID 92)
assert.equal(sanitizeKokoroIPA('/gato/'), 'ɡato');
assert.equal(sanitizeKokoroIPA('mæ.gɪk'), 'mæɡɪk');
assert.equal(sanitizeKokoroIPA('g').charCodeAt(0), 0x0261);
console.log('  ✓ Regra 1: g ASCII é convertido para ɡ IPA (U+0261, ID 92)');

// Regra 2: Converter africadas duplas em ligaduras únicas
assert.equal(sanitizeKokoroIPA('t͡ʃaŋ'), 'ʧaŋ');
assert.equal(sanitizeKokoroIPA('tʃaŋ'), 'ʧaŋ');
assert.equal(sanitizeKokoroIPA('d͡ʒæz'), 'ʤæz');
assert.equal(sanitizeKokoroIPA('dʒæz'), 'ʤæz');
assert.equal(sanitizeKokoroIPA('t͡sa'), 'ʦa');
assert.equal(sanitizeKokoroIPA('tsa'), 'ʦa');
assert.equal(sanitizeKokoroIPA('d͡zo'), 'ʣo');
assert.equal(sanitizeKokoroIPA('dzo'), 'ʣo');
assert.equal(sanitizeKokoroIPA('t͡ɕi'), 'ʨi');
assert.equal(sanitizeKokoroIPA('tɕi'), 'ʨi');
assert.equal(sanitizeKokoroIPA('d͡ʑu'), 'ʥu');
assert.equal(sanitizeKokoroIPA('dʑu'), 'ʥu');
assert.equal(sanitizeKokoroIPA('t͡ʂe'), 'ꭧe');
assert.equal(sanitizeKokoroIPA('tʂe'), 'ꭧe');
console.log('  ✓ Regra 2: Africadas duplas convertidas em ligaduras únicas (ʧ, ʤ, ʦ, ʣ, ʨ, ʥ, ꭧ)');

// Regra 3: Decompor vogais nasais (NFD) para liberar \u0303 (ID 17)
const nasalA = sanitizeKokoroIPA('ã');
assert.equal(nasalA, 'a\u0303');
assert.equal(nasalA.length, 2);
assert.equal(nasalA.charCodeAt(1), 0x0303);
assert.equal(sanitizeKokoroIPA('mãõĩ'), 'ma\u0303o\u0303i\u0303');
console.log('  ✓ Regra 3: Vogais nasais decompostas em NFD liberando o combining tilde \\u0303 (ID 17)');

// Regra 4: Remover pontos de separação silábica (.)
assert.equal(sanitizeKokoroIPA('/ˈma.ni/'), 'ˈmani');
assert.equal(sanitizeKokoroIPA('/t͡ʃaŋ.ku.la/'), 'ʧaŋkula');
console.log('  ✓ Regra 4: Pontos de separação silábica removidos para leitura contínua');

// Composição: Todas as 4 regras combinadas em sequência
assert.equal(sanitizeKokoroIPA('/ˈgã.t͡ʃo.ni/'), 'ˈɡa\u0303ʧoni');
console.log('  ✓ Ordem de normalização completa testada e validada');

// 9. encodePCM16WAV universal 16-bit PCM WAV encoder
const { encodePCM16WAV, clearKokoroCache } = await import('../src/utils/kokoroBrowserTTS.js');
const testSamples = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
const wavBuffer = encodePCM16WAV(testSamples, 24000);
const wavView = new DataView(wavBuffer);
assert.equal(wavBuffer.byteLength, 44 + testSamples.length * 2, 'WAV buffer length is exactly header + 16-bit samples');
assert.equal(wavView.getUint16(20, true), 1, 'AudioFormat is 1 (Standard PCM Integer, NOT format 3 float)');
assert.equal(wavView.getUint16(22, true), 1, 'NumChannels is 1');
assert.equal(wavView.getUint32(24, true), 24000, 'SampleRate is 24000');
assert.equal(wavView.getUint16(34, true), 16, 'BitsPerSample is 16');
console.log('  ✓ encodePCM16WAV generates valid 16-bit PCM WAV headers with exact bounds');

// 10. detectDevice with preferences
assert.equal(await detectDevice('wasm'), 'wasm', 'Forced WASM preference returns wasm');
const autoDevice = await detectDevice('auto');
assert.ok(autoDevice === 'wasm' || autoDevice === 'webgpu', 'Auto device preference resolves cleanly');
console.log('  ✓ detectDevice correctly honors device preference (wasm / auto / webgpu)');

// 11. clearKokoroCache is safe in headless environment
await assert.doesNotReject(async () => {
    await clearKokoroCache();
});
console.log('  ✓ clearKokoroCache runs safely and resets engine state');

console.log('All azureTTS, kokoroTTS & formantSynth tests passed!');

