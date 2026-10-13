// tests/test_syncMerge.js — run with: node tests/test_syncMerge.js
import assert from 'node:assert/strict';
import {
    mergeProject,
    combineEntries,
    strictNorm,
    looseNorm,
    valuesEqual,
    SIMILARITY,
    MERGE_MODES,
} from '../src/utils/syncMerge.js';

console.log('--- test_syncMerge.js ---');

// 1. Normalization helpers
assert.equal(strictNorm('  *Kala*  '), 'kala');
assert.equal(looseNorm('  tá-na  '), 'ta-na');
assert.equal(looseNorm('Cœur'), 'cœur');
console.log('✓ Normalization works');

// 2. valuesEqual handles semantic emptiness
assert.equal(valuesEqual('', undefined), true);
assert.equal(valuesEqual([], null), true);
assert.equal(valuesEqual({}, undefined), true);
assert.equal(valuesEqual('a', 'a'), true);
assert.equal(valuesEqual('a', 'b'), false);
console.log('✓ valuesEqual semantics verified');

// 3. Independent adds on both sides (mobile adds word A, PC adds word B)
const base0 = {
    lexicon: [{ id: 'w1', word: 'sol', translation: 'sun', createdAt: 100 }],
    phrases: [],
    config: { conlangName: 'Solaris' },
    wiki: {}
};
const local0 = {
    lexicon: [
        { id: 'w1', word: 'sol', translation: 'sun', createdAt: 100 },
        { id: 'w2', word: 'luna', translation: 'moon', createdAt: 200 }
    ],
    phrases: [],
    config: { conlangName: 'Solaris' },
    wiki: {}
};
const remote0 = {
    lexicon: [
        { id: 'w1', word: 'sol', translation: 'sun', createdAt: 100 },
        { id: 'w3', word: 'stella', translation: 'star', createdAt: 300 }
    ],
    phrases: [],
    config: { conlangName: 'Solaris' },
    wiki: {}
};

const res0 = mergeProject({ base: base0, local: local0, remote: remote0, mode: MERGE_MODES.AUTO });
assert.equal(res0.merged.lexicon.length, 3, 'Both added words must be preserved');
assert.deepEqual(res0.merged.lexicon.map(w => w.word), ['sol', 'luna', 'stella']);
assert.equal(res0.conflicts.length, 0);
assert.equal(res0.report.lexicon.addedLocal, 1);
assert.equal(res0.report.lexicon.addedRemote, 1);
console.log('✓ Independent additions on both devices merge cleanly');

// 4. Repeated word with identical meaning created independently on both devices
const localDup = {
    lexicon: [
        { id: 'local_agua', word: 'agua', translation: 'water', definition: 'liquid', tags: ['Nature'], createdAt: 100, updatedAt: 200 }
    ],
    phrases: [],
    config: {},
    wiki: {}
};
const remoteDup = {
    lexicon: [
        { id: 'remote_agua', word: 'agua', translation: 'water', definition: 'clear liquid for drinking', tags: ['Drink'], createdAt: 150, updatedAt: 250 }
    ],
    phrases: [],
    config: {},
    wiki: {}
};

// In AUTO mode, identical words auto-combine: union tags, keep longer definition, oldest createdAt
const resDupAuto = mergeProject({ base: null, local: localDup, remote: remoteDup, mode: MERGE_MODES.AUTO });
assert.equal(resDupAuto.merged.lexicon.length, 1, 'Auto mode must combine identical words');
assert.equal(resDupAuto.merged.lexicon[0].id, 'local_agua', 'Oldest createdAt survivor picked');
assert.equal(resDupAuto.merged.lexicon[0].definition, 'clear liquid for drinking', 'Longer definition picked');
assert.deepEqual(resDupAuto.merged.lexicon[0].tags.sort(), ['Drink', 'Nature'], 'Tags must be unioned');
assert.equal(resDupAuto.report.lexicon.combined, 1);
console.log('✓ Repeated words with same meaning auto-combine correctly');

// 5. Repeated word in REVIEW mode (Live Auto OFF) -> flags as similar
const resDupReview = mergeProject({ base: null, local: localDup, remote: remoteDup, mode: MERGE_MODES.REVIEW });
assert.equal(resDupReview.needsReview, true, 'Review mode must flag similar entries');
assert.equal(resDupReview.similar.length, 1);
assert.equal(resDupReview.similar[0].level, SIMILARITY.SAME_MEANING);
console.log('✓ REVIEW mode correctly flags duplicate definitions for user review');

// 5b. Completely identical entries
const exactLocal = { lexicon: [{ id: '1', word: 'foo', translation: 'bar', createdAt: 10 }] };
const exactRemote = { lexicon: [{ id: '2', word: 'foo', translation: 'bar', createdAt: 20 }] };
const resExact = mergeProject({ base: null, local: exactLocal, remote: exactRemote, mode: MERGE_MODES.REVIEW });
assert.equal(resExact.similar[0].level, SIMILARITY.IDENTICAL);
console.log('✓ IDENTICAL level detected for entries with identical content');

// 6. User decision to "keepBoth" homonyms/distinct senses
const decisionsKeepBoth = {
    [resDupReview.similar[0].key]: 'keepBoth'
};
const resDecided = mergeProject({ base: null, local: localDup, remote: remoteDup, mode: MERGE_MODES.REVIEW, decisions: decisionsKeepBoth });
assert.equal(resDecided.merged.lexicon.length, 2, 'keepBoth decision keeps both entries');
console.log('✓ keepBoth decision respects user choice');

// 7. Non-conflicting edits to different fields of the same word
const baseEdit = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'good', ipa: 'ka.lo', definition: 'fine', updatedAt: 100 }],
    phrases: [],
    config: {},
    wiki: {}
};
const localEdit = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'good, pleasant', ipa: 'ka.lo', definition: 'fine', updatedAt: 200 }],
    phrases: [],
    config: {},
    wiki: {}
};
const remoteEdit = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'good', ipa: 'ˈka.lo', definition: 'fine', updatedAt: 250 }],
    phrases: [],
    config: {},
    wiki: {}
};

const resFieldEdits = mergeProject({ base: baseEdit, local: localEdit, remote: remoteEdit, mode: MERGE_MODES.AUTO });
assert.equal(resFieldEdits.conflicts.length, 0, 'Different field edits must not conflict');
const mergedW = resFieldEdits.merged.lexicon[0];
assert.equal(mergedW.translation, 'good, pleasant', 'Local translation edit kept');
assert.equal(mergedW.ipa, 'ˈka.lo', 'Remote IPA edit kept');
console.log('✓ Concurrent non-conflicting field edits merge seamlessly');

// 8. Conflicting edits to same field: newest edit wins in AUTO mode
const localConflict = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'great', updatedAt: 200 }],
    phrases: [],
    config: {},
    wiki: {}
};
const remoteConflict = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'superb', updatedAt: 300 }],
    phrases: [],
    config: {},
    wiki: {}
};
const resConflictAuto = mergeProject({ base: baseEdit, local: localConflict, remote: remoteConflict, mode: MERGE_MODES.AUTO });
assert.equal(resConflictAuto.conflicts.length, 1);
assert.equal(resConflictAuto.merged.lexicon[0].translation, 'superb', 'Newest edit (remote, 300 > 200) wins');
console.log('✓ Same-field conflict auto-resolves with newest edit in AUTO mode');

// 9. Deletion on one side vs edit on the other side
const localDeleted = {
    lexicon: [],
    phrases: [],
    config: {},
    wiki: {}
};
const remoteEdited = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'superb', updatedAt: 300 }],
    phrases: [],
    config: {},
    wiki: {}
};
const resDeleteEdit = mergeProject({ base: baseEdit, local: localDeleted, remote: remoteEdited, mode: MERGE_MODES.AUTO });
assert.equal(resDeleteEdit.conflicts.length, 1);
assert.equal(resDeleteEdit.conflicts[0].kind, 'deleteEdit');
assert.equal(resDeleteEdit.merged.lexicon.length, 1, 'Default keeps edited word over deletion');
console.log('✓ Delete vs edit conflict safely defaults to keeping the edited entry');

// 10. Clean deletion on one side with no modification on the other
const localCleanDeleted = {
    lexicon: [],
    phrases: [],
    config: {},
    wiki: {}
};
const remoteUnmodified = {
    lexicon: [{ id: 'w1', word: 'kalo', translation: 'good', ipa: 'ka.lo', definition: 'fine', updatedAt: 100 }],
    phrases: [],
    config: {},
    wiki: {}
};
const resCleanDelete = mergeProject({ base: baseEdit, local: localCleanDeleted, remote: remoteUnmodified, mode: MERGE_MODES.AUTO });
assert.equal(resCleanDelete.merged.lexicon.length, 0, 'Clean deletion removes word without conflict');
console.log('✓ Clean deletion correctly propagated');

// 11. Wiki per-page merge
const baseWiki = {
    lexicon: [],
    phrases: [],
    config: {},
    wiki: {
        grammar: { title: 'Grammar', content: 'Base grammar' },
        phonology: { title: 'Phonology', content: 'Base phono' }
    }
};
const localWiki = {
    lexicon: [],
    phrases: [],
    config: {},
    wiki: {
        grammar: { title: 'Grammar', content: 'Updated local grammar' },
        phonology: { title: 'Phonology', content: 'Base phono' }
    }
};
const remoteWiki = {
    lexicon: [],
    phrases: [],
    config: {},
    wiki: {
        grammar: { title: 'Grammar', content: 'Base grammar' },
        phonology: { title: 'Phonology', content: 'Updated remote phono' },
        lexiconHelp: { title: 'Lexicon Notes', content: 'New page' }
    }
};
const resWiki = mergeProject({ base: baseWiki, local: localWiki, remote: remoteWiki, mode: MERGE_MODES.AUTO });
assert.equal(resWiki.merged.wiki.grammar.content, 'Updated local grammar');
assert.equal(resWiki.merged.wiki.phonology.content, 'Updated remote phono');
assert.equal(resWiki.merged.wiki.lexiconHelp.content, 'New page');
console.log('✓ Wiki pages merge independently per page');

// 12. ID remapping after duplicate combination updates parentRootId and phrases componentWords
const localRoot = {
    id: 'local_root', word: 'kar', translation: 'car', createdAt: 100
};
const remoteRoot = {
    id: 'remote_root', word: 'kar', translation: 'car', createdAt: 200
};
const localDeriv = {
    id: 'd1', word: 'karin', translation: 'little car', parentRootId: 'remote_root', etymology: 'remote_root', createdAt: 300
};
const phraseWithRef = {
    id: 'p1', phrase: 'in kar', idiomaticTranslation: 'in the car', componentWords: ['remote_root'], createdAt: 300
};

const resRemap = mergeProject({
    base: null,
    local: { lexicon: [localRoot, localDeriv], phrases: [phraseWithRef], config: {}, wiki: {} },
    remote: { lexicon: [remoteRoot], phrases: [], config: {}, wiki: {} },
    mode: MERGE_MODES.AUTO
});
assert.equal(resRemap.merged.lexicon.length, 2);
const derivEntry = resRemap.merged.lexicon.find(w => w.id === 'd1');
assert.equal(derivEntry.parentRootId, 'local_root', 'parentRootId remapped to surviving id');
assert.equal(derivEntry.etymology, 'local_root', 'etymology remapped to surviving id');
assert.deepEqual(resRemap.merged.phrases[0].componentWords, ['local_root'], 'Phrase componentWords remapped');
console.log('✓ ID remapping updates parentRootId, etymology, and phrase componentWords');

console.log('\nAll sync merge tests passed successfully!');
