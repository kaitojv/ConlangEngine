// tests/test_containsCustomGlyph.js
import assert from 'assert';
import { containsCustomGlyph } from '../src/utils/scriptResolver.js';

console.log('--- test_containsCustomGlyph.js ---');

// 1. Falsy / empty strings
assert.strictEqual(containsCustomGlyph(''), false, 'Empty string should be false');
assert.strictEqual(containsCustomGlyph(null), false, 'Null should be false');
assert.strictEqual(containsCustomGlyph(undefined), false, 'Undefined should be false');

// 2. Standard Latin strings (Workspace, Lexicon, etc.)
assert.strictEqual(containsCustomGlyph('Workspace'), false, 'Standard English should be false');
assert.strictEqual(containsCustomGlyph('Lexicon'), false, 'Standard English should be false');
assert.strictEqual(containsCustomGlyph('Linguistics 123 !?'), false, 'English with numbers/punctuation should be false');

// 3. Accents and foreign non-PUA scripts (e.g. Spanish, Japanese)
assert.strictEqual(containsCustomGlyph('Léxico'), false, 'Accented Latin should be false');
assert.strictEqual(containsCustomGlyph('語彙とラベル'), false, 'Standard Japanese should be false');

// 4. Unicode Private Use Area (BMP PUA: 0xE000 - 0xF8FF)
const puaChar1 = String.fromCodePoint(0xE000);
const puaChar2 = String.fromCodePoint(57345); // 0xE001
assert.strictEqual(containsCustomGlyph(puaChar1), true, 'PUA char U+E000 should be true');
assert.strictEqual(containsCustomGlyph(`Lexicon ${puaChar2}`), true, 'String containing PUA char should be true');

// 5. Supplementary PUA (U+F0000 - U+10FFFD)
const suppPuaChar = String.fromCodePoint(0xF0000);
assert.strictEqual(containsCustomGlyph(suppPuaChar), true, 'Supplementary PUA char should be true');

// 6. Direct match in root customGlyphs
const customGlyphs = {
    '65': [[{ x: 0, y: 0 }]], // Mapped 'A'
    'custom_sym': [[{ x: 1, y: 1 }]]
};
assert.strictEqual(containsCustomGlyph('Apple', customGlyphs), true, 'Char mapped in customGlyphs should be true');
assert.strictEqual(containsCustomGlyph('Banana', customGlyphs), false, 'Char not in customGlyphs should be false');

// 7. Direct match in multi-script scriptDataById
const scriptDataById = {
    script_runic: {
        customGlyphs: {
            'B': [[{ x: 2, y: 2 }]]
        }
    }
};
assert.strictEqual(containsCustomGlyph('Banana', null, scriptDataById), true, 'Script custom glyph match should be true');
assert.strictEqual(containsCustomGlyph('Cherry', null, scriptDataById), false, 'Script custom glyph non-match should be false');

console.log('✓ All containsCustomGlyph tests passed successfully!');
