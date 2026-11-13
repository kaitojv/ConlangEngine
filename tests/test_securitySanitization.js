// tests/test_securitySanitization.js
import assert from 'node:assert/strict';
import {
    escapeHtml,
    sanitizeUrl,
    sanitizeCssFontUrl,
    sanitizeCssValue,
    sanitizeFilename,
    sanitizeSpreadsheetCell,
    stripDangerousKeys
} from '../src/utils/sanitizeHtml.js';
import { sanitizeConfig, sanitizeBackup } from '../src/utils/schemaValidator.js';
import { decodeThemeCode, parseThemeJSON, encodeThemeCode } from '../src/utils/themePresets.js';
import { generateAnkiTSV } from '../src/utils/ankiExporter.js';

console.log('Testing security sanitization & hardening...');

// 1. HTML escaping & URL filtering
assert.equal(
    escapeHtml('<script>alert("xss")</script> & \'test\''),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;test&#39;'
);

assert.equal(sanitizeUrl('javascript:alert(1)'), null);
assert.equal(sanitizeUrl('  java\nscript:alert(1)'), null);
assert.equal(sanitizeUrl('vbscript:msgbox(1)'), null);
assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), null);
assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>', { allowDataImage: true }), null);
assert.equal(sanitizeUrl('//evil.com/phish'), null);
assert.equal(sanitizeUrl('https://example.com/path?a=1'), 'https://example.com/path?a=1');
assert.equal(sanitizeUrl('mailto:user@example.com'), 'mailto:user@example.com');
assert.equal(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: true }), 'data:image/png;base64,iVBORw0KGgo=');
assert.equal(sanitizeUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: false }), null);

// 2. CSS font & variable injection guards
assert.equal(sanitizeCssFontUrl("https://evil.com/f.ttf');}</style><script>alert(1)</script>"), '');
assert.equal(sanitizeCssFontUrl('javascript:alert(1)'), '');
assert.equal(sanitizeCssFontUrl('data:font/truetype;base64,AAEAAA=='), 'data:font/truetype;base64,AAEAAA==');
assert.equal(sanitizeCssFontUrl('https://cdn.example.com/fonts/test.woff2'), 'https://cdn.example.com/fonts/test.woff2');
assert.equal(sanitizeCssValue('url(https://evil.com/track.png)'), '');
assert.equal(sanitizeCssValue('#7c3aed'), '#7c3aed');

// 3. Filename & spreadsheet cell sanitization
assert.equal(sanitizeFilename('../../etc/passwd'), 'etc_passwd');
assert.ok(!sanitizeFilename('..\\..\\evil.doc').includes('..'));
assert.ok(!sanitizeFilename('a/b\\c:d*e?f').match(/[\\/:*?]/));
assert.equal(sanitizeSpreadsheetCell('=CMD|"/C calc"!A0'), "'=CMD|\"/C calc\"!A0");
assert.equal(sanitizeSpreadsheetCell('@SUM(1+1)'), "'@SUM(1+1)");
assert.equal(sanitizeSpreadsheetCell('+SUM(1,2)'), "'+SUM(1,2)");
assert.equal(sanitizeSpreadsheetCell('-en'), '-en', 'must preserve normal hyphenated affixes');

// 4. Prototype pollution & own __proto__ key stripping + API secret stripping
const maliciousJson = JSON.parse('{"conlangName":"Test","__proto__":{"polluted":true},"colors":{"bg":"#000","__proto__":{"evil":"yes"},"constructor":{"bad":1}},"azureTtsKey":"secret-azure-key","customTtsKey":"secret-custom-key"}');
const cleanedSave = sanitizeConfig(maliciousJson, true);
assert.equal(Object.hasOwn(cleanedSave, '__proto__'), false);
assert.equal(Object.hasOwn(cleanedSave.colors, '__proto__'), false);
assert.equal(Object.hasOwn(cleanedSave.colors, 'constructor'), false);
assert.equal(cleanedSave.azureTtsKey, undefined, 'azureTtsKey must not be saved/published');
assert.equal(cleanedSave.customTtsKey, undefined, 'customTtsKey must not be saved/published');

const pollutedObj = stripDangerousKeys(JSON.parse('{"a":1,"__proto__":{"x":2},"nested":[{"prototype":{"y":3},"ok":true}]}'));
assert.equal(Object.hasOwn(pollutedObj, '__proto__'), false);
assert.equal(Object.hasOwn(pollutedObj.nested[0], 'prototype'), false);
assert.equal(pollutedObj.nested[0].ok, true);

const cleanBackup = sanitizeBackup({
    config: maliciousJson,
    lexicon: [{ word: 'ka', translation: 'fire' }],
    project: JSON.parse('{"__proto__":{"hacked":true},"localProjects":[]}')
});
assert.equal(Object.hasOwn(cleanBackup.project, '__proto__'), false);

// 5. Theme import sanitization
const themeCode = encodeThemeCode({ name: 'Safe', colors: { bg: '#111' } });
const decodedTheme = decodeThemeCode(themeCode);
assert.equal(decodedTheme.name, 'Safe');
const parsedTheme = parseThemeJSON('{"name":"Evil","colors":{"bg":"#000","__proto__":{"x":1}}}');
assert.equal(Object.hasOwn(parsedTheme.colors, '__proto__'), false);

// 6. Anki HTML escaping
const tsv = generateAnkiTSV([
    {
        word: 'ka<script>alert(1)</script>',
        translation: '<img src=x onerror=alert(2)>',
        definition: '<b>raw</b>',
        etymology: '<script>bad</script>',
        exampleSentence: 'hello <svg onload=alert(3)>'
    }
], { includeScript: false, includeIPA: false, includePOS: false, includeTags: false });
assert.ok(!tsv.includes('<script>'));
assert.ok(!tsv.includes('<img '));
assert.ok(!tsv.includes('<svg '));
assert.ok(tsv.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

console.log('All security sanitization tests passed!');
