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

// 3b. HowToStart guide translations across all languages
assert.equal(t('howToStart.title', 'en'), 'How to Start');
assert.equal(t('howToStart.title', 'pt'), 'Como Começar');
assert.equal(t('howToStart.title', 'es'), 'Cómo Empezar');
assert.equal(t('howToStart.title', 'fr'), 'Comment Débuter');
assert.equal(t('howToStart.title', 'ru'), 'С чего начать');
assert.equal(t('howToStart.title', 'zh'), '入门指南');
assert.equal(t('howToStart.title', 'ja'), 'はじめに');
assert.equal(t('howToStart.part1.badge', 'pt'), 'Parte 1');
assert.equal(t('howToStart.part1.sec1.title', 'pt'), '1. Fonologia e Fonotática');
console.log('✓ HowToStart translations verified across all 7 languages');

// 3c. Help & Information translations across all languages
assert.equal(t('help.title', 'en'), 'Help & Information');
assert.equal(t('help.title', 'pt'), 'Ajuda e Informações');
assert.equal(t('help.title', 'es'), 'Ayuda e Información');
assert.equal(t('help.title', 'fr'), 'Aide & Information');
assert.equal(t('help.title', 'ru'), 'Помощь и информация');
assert.equal(t('help.title', 'zh'), '帮助与信息');
assert.equal(t('help.title', 'ja'), 'ヘルプと情報');
assert.equal(t('help.nav.buildGuide', 'pt'), 'Guia de Criação');
assert.equal(t('help.about.featuresTitle', 'pt'), 'Recursos Principais');
console.log('✓ Help translations verified across all 7 languages');

// 3d. Profile translations across all languages
assert.equal(t('profile.title', 'en'), 'Profile');
assert.equal(t('profile.title', 'pt'), 'Perfil');
assert.equal(t('profile.title', 'es'), 'Perfil');
assert.equal(t('profile.title', 'fr'), 'Profil');
assert.equal(t('profile.title', 'ru'), 'Профиль');
assert.equal(t('profile.title', 'zh'), '个人中心');
assert.equal(t('profile.title', 'ja'), 'プロフィール');
assert.equal(t('profile.badges.first_word.name', 'pt'), 'Primeira Palavra');
assert.equal(t('profile.totalLexicon', 'pt'), 'Léxico Total');
console.log('✓ Profile translations verified across all 7 languages');

// 3e. Course Builder translations across all languages
assert.equal(t('courseBuilder.title', 'en'), 'Course Builder');
assert.equal(t('courseBuilder.title', 'pt'), 'Criador de Cursos');
assert.equal(t('courseBuilder.title', 'es'), 'Creador de Cursos');
assert.equal(t('courseBuilder.title', 'fr'), 'Créateur de Cours');
assert.equal(t('courseBuilder.title', 'ru'), 'Конструктор курсов');
assert.equal(t('courseBuilder.title', 'zh'), '课程编辑器');
assert.equal(t('courseBuilder.title', 'ja'), 'コース作成ツール');
assert.equal(t('courseBuilder.types.translate_to_conlang', 'pt'), 'Digitação no Conlang');
assert.equal(t('courseBuilder.addPhraseToLevel', 'pt'), 'Adicionar Frase ao Nível');
console.log('✓ Course Builder translations verified across all 7 languages');

// 3f. Exercise Player & Timed Mode translations across all languages
assert.equal(t('exercisePlayer.timedMode', 'en'), 'Timed Mode');
assert.equal(t('exercisePlayer.timedMode', 'pt'), 'Modo Cronometrado');
assert.equal(t('exercisePlayer.timedMode', 'es'), 'Modo Contrarreloj');
assert.equal(t('exercisePlayer.timedMode', 'fr'), 'Mode Chronométré');
assert.equal(t('exercisePlayer.timedMode', 'ru'), 'Режим на время');
assert.equal(t('exercisePlayer.timedMode', 'zh'), '限时挑战');
assert.equal(t('exercisePlayer.timedMode', 'ja'), 'タイムアタック');
assert.equal(t('exercisePlayer.lessonComplete', 'pt'), 'Lição Concluída!');
assert.equal(t('exercisePlayer.timedSprintDesc', 'pt'), 'Sprint de 60 segundos');
console.log('✓ Exercise Player & Timed Mode translations verified across all 7 languages');

// 3g. Wiki (Library & Writing) translations across all languages
assert.equal(t('wiki.title', 'en'), 'Library & Writing');
assert.equal(t('wiki.title', 'pt'), 'Biblioteca e Escrita');
assert.equal(t('wiki.title', 'es'), 'Biblioteca y Escritura');
assert.equal(t('wiki.title', 'fr'), 'Bibliothèque et Écriture');
assert.equal(t('wiki.title', 'ru'), 'Библиотека и тексты');
assert.equal(t('wiki.title', 'zh'), '文献库与写作');
assert.equal(t('wiki.title', 'ja'), 'ライブラリと執筆');
assert.equal(t('wiki.newDocument', 'pt'), 'Novo Documento');
assert.equal(t('wiki.corpus.editText', 'pt'), 'Editar Texto');
assert.equal(t('wiki.corpus.interlinearReader', 'pt'), 'Leitor Interlinear');
assert.equal(t('wiki.richText.undo', 'pt'), 'Desfazer');
assert.equal(t('wiki.wordAssistSettings.syntacticPriority', 'pt'), 'Prioridade Sintática (Ordem por Arrastar e Soltar)');
console.log('✓ Wiki (Library & Writing) translations verified across all 7 languages');

// 3h. Aligner (Sentence Mapper) translations across all languages
assert.equal(t('aligner.title', 'en'), 'Sentence Mapper');
assert.equal(t('aligner.title', 'pt'), 'Mapeador de Frases');
assert.equal(t('aligner.title', 'es'), 'Mapeador de Oraciones');
assert.equal(t('aligner.title', 'fr'), 'Mappeur de Phrases');
assert.equal(t('aligner.title', 'ru'), 'Синтаксический разбор');
assert.equal(t('aligner.title', 'zh'), '句子对齐器');
assert.equal(t('aligner.title', 'ja'), '文構造マッパー');
assert.equal(t('aligner.sourceSentence', 'pt'), 'Frase de Origem');
assert.equal(t('aligner.targetSentence', 'pt'), 'Frase de Destino');
assert.equal(t('aligner.clearAll', 'pt'), 'Limpar Tudo');
assert.equal(t('aligner.saveMapping', 'pt'), 'Salvar Mapeamento');
assert.equal(t('aligner.savedMappings', 'pt'), 'Mapeamentos Salvos');
assert.equal(t('aligner.tooltip.projectTerm', 'pt'), 'Termo do Projeto');
assert.equal(t('aligner.tooltip.noMappingFound', 'pt'), 'Nenhum mapeamento ou entrada no léxico encontrado.');
console.log('✓ Aligner (Sentence Mapper) translations verified across all 7 languages');

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
