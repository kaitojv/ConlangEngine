// tests/test_azureTTS.js
import assert from 'node:assert/strict';
import { ipaToPhoneticText, playAzureTTS, speakWithWebSpeech } from '../src/utils/azureTTS.js';

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

// 2. playAzureTTS with missing or expired key gracefully falls back without throwing
// (In Node environment, SpeechSynthesis is undefined, so it should resolve cleanly)
await assert.doesNotReject(async () => {
    await playAzureTTS({
        text: 'test',
        ipa: '/sǎtēwà/',
        voice: 'ipa-default',
        useIpa: true
    });
}, 'playAzureTTS never throws 401 unhandled rejection');
console.log('  ✓ playAzureTTS gracefully falls back without throwing');

// 3. speakWithWebSpeech resolves cleanly in non-browser environments
await assert.doesNotReject(async () => {
    await speakWithWebSpeech({ text: 'hello', ipa: '/hɛloʊ/', voice: 'ipa-default', useIpa: true });
});
console.log('  ✓ speakWithWebSpeech is safe in headless environments');

console.log('All azureTTS tests passed!');
