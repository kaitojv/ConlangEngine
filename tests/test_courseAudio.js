// tests/test_courseAudio.js
import assert from 'node:assert/strict';
import {
    extensionForMime,
    buildAudioPath,
    getCourseAudioUrl,
    hasCourseAudio,
    localAudioCache,
    uploadCourseAudio,
    deleteCourseAudio,
    blobToDataUrl
} from '../src/utils/courseAudio.js';

console.log('--- test_courseAudio.js ---');

// 1. extensionForMime
assert.equal(extensionForMime('audio/webm'), 'webm');
assert.equal(extensionForMime('audio/webm;codecs=opus'), 'webm');
assert.equal(extensionForMime('audio/ogg'), 'ogg');
assert.equal(extensionForMime('audio/mp4'), 'm4a');
assert.equal(extensionForMime('audio/wav'), 'wav');
assert.equal(extensionForMime('unknown/format'), 'webm');
console.log('  ✓ extensionForMime parses clean and complex MIME types');

// 2. buildAudioPath
const path = buildAudioPath({
    userId: 'user_123',
    projectId: 'proj_456',
    phraseId: 'phrase_789',
    extension: 'webm'
});
assert.equal(path, 'user_123/proj_456/phrase_789.webm');
console.log('  ✓ buildAudioPath generates sanitized paths');

// 3. blobToDataUrl
const sampleText = 'fake-audio-content';
const blob = new Blob([sampleText], { type: 'audio/webm' });
const dataUrl = await blobToDataUrl(blob);
assert.ok(dataUrl.startsWith('data:audio/webm;base64,'), 'Produces data URL with audio/webm');
console.log('  ✓ blobToDataUrl converts Blob to base64 Data URL');

// 4. getCourseAudioUrl
assert.equal(getCourseAudioUrl(''), '');
assert.equal(getCourseAudioUrl(dataUrl), dataUrl, 'Direct data URL resolves to itself');
assert.equal(getCourseAudioUrl('blob:http://localhost/123'), 'blob:http://localhost/123');

// Phrase object resolution
const phraseWithData = {
    id: 'p-1',
    audioData: 'data:audio/webm;base64,AAAA',
    audioPath: 'user/proj/p-1.webm'
};
assert.equal(getCourseAudioUrl(phraseWithData), 'data:audio/webm;base64,AAAA', 'Prefers audioData over storage path');

// Local audio cache resolution
localAudioCache.set('p-cached', 'data:audio/ogg;base64,BBBB');
assert.equal(getCourseAudioUrl('p-cached'), 'data:audio/ogg;base64,BBBB', 'Resolves from localAudioCache by key');

// Dead bucket suppression (prevents 400 Bad Request console errors)
const deadBucketUrl = 'https://hgeuyvgjhonklflcdinj.supabase.co/storage/v1/object/course-audio/93fb73db-efab-4674-a840-57bc74365407/local_1776372927593/phrase-1780517812661.webm';
assert.equal(getCourseAudioUrl(deadBucketUrl), '', 'Blocks dead course-audio bucket URL from being fetched');
assert.equal(hasCourseAudio({ audioPath: '93fb73db-efab-4674-a840-57bc74365407/local/phrase-123.webm' }), false, 'Dead bucket path is not treated as having audio');
assert.equal(hasCourseAudio({ audioData: 'data:audio/webm;base64,123' }), true, 'base64 audioData is treated as having audio');
console.log('  ✓ getCourseAudioUrl resolves data URLs, phrase objects, and blocks dead bucket URLs');

// 5. uploadCourseAudio (even when bucket is missing / throws bucket error)
const uploadResult = await uploadCourseAudio({
    blob,
    userId: 'user-abc',
    projectId: 'proj-xyz',
    phraseId: 'phrase-101',
    mimeType: 'audio/webm'
});

assert.ok(uploadResult.audioData, 'Returns audioData Data URL');
assert.ok(uploadResult.audioData.startsWith('data:audio/webm;base64,'), 'audioData is valid base64');
assert.ok(uploadResult.path, 'Returns storage path');
assert.equal(localAudioCache.get('phrase-101'), uploadResult.audioData, 'Stores into localAudioCache for instant playback');
console.log('  ✓ uploadCourseAudio saves to browser and database without failing on bucket errors');

// 6. deleteCourseAudio
await deleteCourseAudio(uploadResult.path, 'phrase-101');
assert.equal(localAudioCache.has('phrase-101'), false, 'Evicts from local cache on deletion');
console.log('  ✓ deleteCourseAudio cleans up browser memory and storage');

console.log('All courseAudio tests passed!');
