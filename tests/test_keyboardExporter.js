// tests/test_keyboardExporter.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
    getHexPoint, getMapping, QWERTY_DEFAULTS,
    generateKLCContent, buildWindowsPackageFiles, createZipBuffer
} from '../src/utils/keyboardExporter.js';
import { 
    distributeLetters, getPhoneticTargetKey, ASSIGNABLE_KEYS_HOME_FIRST 
} from '../src/utils/keyboardDistributor.js';

describe('keyboardExporter utilities', () => {
    it('getHexPoint converts characters to safe uppercase 4+ digit hex strings', () => {
        assert.strictEqual(getHexPoint('a'), '0061');
        assert.strictEqual(getHexPoint('A'), '0041');
        assert.strictEqual(getHexPoint('\uE000'), 'E000');
        assert.strictEqual(getHexPoint('\uE055'), 'E055');
        assert.strictEqual(getHexPoint(String.fromCodePoint(0x10000)), '10000');
        assert.strictEqual(getHexPoint(null), '-1');
        assert.strictEqual(getHexPoint(undefined), '-1');
        assert.strictEqual(getHexPoint('-1'), '-1');
        assert.strictEqual(getHexPoint(''), '-1');
    });

    it('getMapping returns base, shift, and altgr with fallback to QWERTY defaults', () => {
        const mappedKeys = {
            'A': { base: '\uE001', shift: '\uE002', altgr: '\uE003' },
            'B': { base: '-1', shift: 'B' }
        };

        const mapA = getMapping('A', mappedKeys);
        assert.strictEqual(mapA.baseChar, '\uE001');
        assert.strictEqual(mapA.shiftChar, '\uE002');
        assert.strictEqual(mapA.altgrChar, '\uE003');

        // B base is unmapped, so it falls back to QWERTY default 'b'
        const mapB = getMapping('B', mappedKeys);
        assert.strictEqual(mapB.baseChar, 'b');
        assert.strictEqual(mapB.shiftChar, 'B');
        assert.strictEqual(mapB.altgrChar, '');

        // Z is entirely unmapped, so full QWERTY defaults
        const mapZ = getMapping('Z', mappedKeys);
        assert.strictEqual(mapZ.baseChar, 'z');
        assert.strictEqual(mapZ.shiftChar, 'Z');
        assert.strictEqual(mapZ.altgrChar, '');
    });
});

describe('keyboardDistributor automatic distribution algorithms', () => {
    it('getPhoneticTargetKey identifies phonetic keys for letters, multigraphs, and syllables', () => {
        assert.strictEqual(getPhoneticTargetKey('k'), 'K');
        assert.strictEqual(getPhoneticTargetKey('th'), 'T');
        assert.strictEqual(getPhoneticTargetKey('sh'), 'S');
        assert.strictEqual(getPhoneticTargetKey('ch'), 'C');
        assert.strictEqual(getPhoneticTargetKey('ng'), 'N');
        assert.strictEqual(getPhoneticTargetKey('ʃ'), 'S');
        assert.strictEqual(getPhoneticTargetKey('θ'), 'T');
        assert.strictEqual(getPhoneticTargetKey('ka'), 'K');
        assert.strictEqual(getPhoneticTargetKey('ta'), 'T');
        assert.strictEqual(getPhoneticTargetKey('piro'), 'P');
    });

    it('distributeLetters performs smart phonetic distribution on alphabetic conlang', () => {
        const letters = [
            { char: 'a', unicode: 'a' },
            { char: 'k', unicode: 'k' },
            { char: 'm', unicode: 'm' },
            { char: 's', unicode: 's' },
            { char: 't', unicode: 't' },
            { char: 'th', unicode: 'θ' }
        ];

        const mappings = distributeLetters(letters, { strategy: 'smart_phonetic' });

        assert.strictEqual(mappings.A?.base, 'a');
        assert.strictEqual(mappings.K?.base, 'k');
        assert.strictEqual(mappings.M?.base, 'm');
        assert.strictEqual(mappings.S?.base, 's');
        assert.strictEqual(mappings.T?.base, 't');
        // 'th' shares 'T' with 't', so it spills to shift or altgr
        assert.strictEqual(mappings.T?.shift, 'θ');
    });

    it('distributeLetters maps uppercase forms to Shift layer', () => {
        const letters = [
            { char: 'a', unicode: '\uE001', isUpper: false },
            { char: 'A', unicode: '\uE002', isUpper: true }
        ];

        const mappings = distributeLetters(letters, { strategy: 'smart_phonetic' });
        assert.strictEqual(mappings.A?.base, '\uE001');
        assert.strictEqual(mappings.A?.shift, '\uE002');
    });

    it('distributeLetters supports non-alphabetic syllabic conlangs', () => {
        const syllables = [
            { char: 'ka', unicode: '\uE010' },
            { char: 'ki', unicode: '\uE011' },
            { char: 'ku', unicode: '\uE012' },
            { char: 'sa', unicode: '\uE020' },
            { char: 'si', unicode: '\uE021' }
        ];

        const mappings = distributeLetters(syllables, { strategy: 'smart_phonetic', scriptType: 'syllabic' });
        
        // ka on K base, ki on K shift, ku on K altgr
        assert.strictEqual(mappings.K?.base, '\uE010');
        assert.strictEqual(mappings.K?.shift, '\uE011');
        assert.strictEqual(mappings.K?.altgr, '\uE012');

        // sa on S base, si on S shift
        assert.strictEqual(mappings.S?.base, '\uE020');
        assert.strictEqual(mappings.S?.shift, '\uE021');
    });

    it('distributeLetters fills home row first in sequential mode', () => {
        const items = Array.from({ length: 15 }, (_, i) => ({
            char: `item_${i}`,
            unicode: String.fromCharCode(0xE000 + i)
        }));

        const mappings = distributeLetters(items, { strategy: 'sequential' });

        // Home row starts with A, S, D, F, G, H, J, K, L, OEM_1, OEM_7
        assert.strictEqual(mappings.A?.base, '\uE000');
        assert.strictEqual(mappings.S?.base, '\uE001');
        assert.strictEqual(mappings.D?.base, '\uE002');
        assert.strictEqual(mappings.F?.base, '\uE003');
    });

    it('distributeLetters fill_unmapped preserves existing custom mappings', () => {
        const existing = {
            'A': { base: 'CUSTOM_A', shift: '-1', altgr: '-1' }
        };
        const newItems = [
            { char: 'a', unicode: 'NEW_A' },
            { char: 'b', unicode: 'NEW_B' }
        ];

        const result = distributeLetters(newItems, {
            strategy: 'fill_unmapped',
            existingMappings: existing,
            preserveExisting: true
        });

        // A.base is preserved!
        assert.strictEqual(result.A?.base, 'CUSTOM_A');
        // NEW_B was mapped to an empty slot
        const values = Object.values(result).flatMap(m => [m.base, m.shift, m.altgr]);
        assert.ok(values.includes('NEW_B'));
    });

    it('resolves diacritic and IPA characters phonetically and skips plain punctuation noise', () => {
        const items = [
            { id: '1', char: 't', unicode: 't', category: 'letters', hasGlyph: false },
            { id: '2', char: 'ṫ', phoneme: 'θ', unicode: 'ṫ', category: 'letters', hasGlyph: false },
            { id: '3', char: 'l', unicode: 'l', category: 'letters', hasGlyph: false },
            { id: '4', char: 'λ', unicode: 'λ', category: 'letters', hasGlyph: false },
            { id: '5', char: 'ł', unicode: 'ł', category: 'letters', hasGlyph: false },
            { id: '6', char: 'j', unicode: 'j', category: 'letters', hasGlyph: false },
            { id: '7', char: 'ɟ', unicode: 'ɟ', category: 'letters', hasGlyph: false },
            { id: '8', char: 'k', unicode: 'k', category: 'letters', hasGlyph: false },
            { id: '9', char: 'ʞ', unicode: 'ʞ', category: 'letters', hasGlyph: false },
            { id: 'p1', char: '@', unicode: '@', category: 'punctuation', hasGlyph: false },
            { id: 'p2', char: '#', unicode: '#', category: 'punctuation', hasGlyph: false },
        ];

        const mappings = distributeLetters(items, { strategy: 'smart_phonetic' });
        assert.strictEqual(mappings.T.base, 't');
        assert.strictEqual(mappings.T.shift, 'ṫ');
        assert.strictEqual(mappings.L.base, 'l');
        assert.strictEqual(mappings.L.shift, 'λ');
        assert.strictEqual(mappings.L.altgr, 'ł');
        assert.strictEqual(mappings.J.base, 'j');
        assert.strictEqual(mappings.J.shift, 'ɟ');
        assert.strictEqual(mappings.K.base, 'k');
        assert.strictEqual(mappings.K.shift, 'ʞ');

        // Plain uncustomized punctuation must not overwrite empty letter keys
        const allMapped = Object.values(mappings).flatMap(m => [m.base, m.shift, m.altgr]);
        assert.ok(!allMapped.includes('@'));
        assert.ok(!allMapped.includes('#'));
    });

    it('generateKLCContent produces CRLF lines and LIGATURE entries for multi-char or non-BMP strings', () => {
        const mapped = {
            'A': { base: 'a', shift: 'A', altgr: 'æ' },
            'K': { base: 'ka', shift: 'KA', altgr: String.fromCodePoint(0x10000) }
        };
        const klc = generateKLCContent('TestLang', mapped);
        assert.ok(klc.includes('\r\n'));
        assert.ok(klc.includes('ENDKBD'));
        assert.ok(klc.includes('%%'));
        assert.ok(klc.includes('LIGATURE'));
    });

    it('buildWindowsPackageFiles & createZipBuffer produce valid 2-click installer ZIP with PK headers', () => {
        const mapped = {
            'A': { base: '\uE001', shift: '\uE002', altgr: '-1' },
            'K': { base: 'k', shift: 'K', altgr: 'ʞ' }
        };
        const files = buildWindowsPackageFiles('Mani Script', mapped);
        const names = files.map(f => f.name);
        assert.ok(names.some(n => n.startsWith('Install_') && n.endsWith('.bat')));
        assert.ok(names.some(n => n.endsWith('_Keyboard.ps1')));
        assert.ok(names.some(n => n.endsWith('.klc')));
        assert.ok(names.includes('README.txt'));

        const ps1 = new TextDecoder().decode(files.find(f => f.name.endsWith('_Keyboard.ps1')).data);
        assert.ok(ps1.includes('\\uE001'));
        assert.ok(ps1.includes('WH_KEYBOARD_LL'));

        const zip = createZipBuffer(files);
        // PK\x03\x04 local file signature at byte 0, EOCD PK\x05\x06 at end - 22
        assert.strictEqual(zip[0], 0x50);
        assert.strictEqual(zip[1], 0x4B);
        assert.strictEqual(zip[2], 0x03);
        assert.strictEqual(zip[3], 0x04);
        const eocdOffset = zip.length - 22;
        assert.strictEqual(zip[eocdOffset], 0x50);
        assert.strictEqual(zip[eocdOffset + 1], 0x4B);
        assert.strictEqual(zip[eocdOffset + 2], 0x05);
        assert.strictEqual(zip[eocdOffset + 3], 0x06);
    });
});
