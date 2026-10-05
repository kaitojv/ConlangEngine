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

console.log('All azureTTS & formantSynth tests passed!');

