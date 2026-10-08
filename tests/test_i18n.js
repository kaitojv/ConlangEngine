// tests/test_i18n.js
// Verification suite for i18n translation engine, languages, and fallbacks.
import assert from 'node:assert/strict';
import { t, SUPPORTED_LANGUAGES } from '../src/i18n/index.js';

console.log('--- test_i18n.js ---');

// 1. Supported languages verification
assert.equal(SUPPORTED_LANGUAGES.length, 7, 'Should have 7 supported languages');
const codes = SUPPORTED_LANGUAGES.map(l => l.code);
assert.deepEqual(codes, ['en', 'pt', 'es', 'fr', 'ru', 'zh', 'ja'], 'Supported language codes match');
console.log('✓ SUPPORTED_LANGUAGES configured correctly');

// 2. Direct translation verification for each language
assert.equal(t('nav.home', 'en'), 'Home');
assert.equal(t('nav.home', 'pt'), 'Início');
assert.equal(t('nav.home', 'es'), 'Inicio');
assert.equal(t('nav.home', 'fr'), 'Accueil');
assert.equal(t('nav.home', 'ru'), 'Главная');
assert.equal(t('nav.home', 'zh'), '首页');
assert.equal(t('nav.home', 'ja'), 'ホーム');
console.log('✓ Direct translations for nav.home work across all 7 languages');

// 3. Header translations
assert.equal(t('header.export', 'en'), 'Export');
assert.equal(t('header.export', 'pt'), 'Exportar');
assert.equal(t('header.export', 'fr'), 'Exporter');
assert.equal(t('header.export', 'ru'), 'Экспорт');
assert.equal(t('header.export', 'zh'), '导出');
assert.equal(t('header.export', 'ja'), 'エクスポート');
console.log('✓ Header translations verified');

// 4. String interpolation verification
const interpolatedEn = t('commandPalette.createWord', 'en', { word: 'test' });
assert.equal(interpolatedEn, 'Create Word: "test"');

const interpolatedPt = t('commandPalette.createWord', 'pt', { word: 'teste' });
assert.equal(interpolatedPt, 'Criar Palavra: "teste"');

const interpolatedZh = t('commandPalette.createWord', 'zh', { word: '测试' });
assert.equal(interpolatedZh, '创建词汇: "测试"');
console.log('✓ String interpolation works properly');

// 5. Fallback behavior
// Fallback to English if key missing in active language
const fallbackToEn = t('some.key.only.in.en', 'ru');
// If not found in English or requested language, returns key
assert.equal(fallbackToEn, 'some.key.only.in.en');

console.log('✓ Fallback behavior works as expected');
console.log('\nAll i18n tests passed successfully.');
