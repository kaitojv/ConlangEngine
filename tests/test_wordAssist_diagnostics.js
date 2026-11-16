import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGrammarAnalyzer } from '../src/utils/grammarAnalyzer.js';
import {
    LEGACY_STALE_WA_ORDER,
    resolveEffectiveSyntaxOrder
} from '../src/utils/wordAssist/syntaxOrdering.js';
import {
    buildGrammarRuleEntry,
    resolveTranslatorSettings,
    translateNumeralToken,
    TYPOLOGY_SELECT_FIELDS
} from '../src/utils/wordAssist/configResolver.js';

const BASE_LEXICON = [
    { id: 'w-dog', word: 'kano', translation: 'dog', wordClass: 'noun' },
    { id: 'w-cat', word: 'miso', translation: 'cat', wordClass: 'noun' },
    { id: 'w-house', word: 'doma', translation: 'house', wordClass: 'noun' },
    { id: 'w-apple', word: 'pomu', translation: 'apple', wordClass: 'noun' },
    { id: 'w-see', word: 'vida', translation: 'see', wordClass: 'verb' },
    { id: 'w-sleep', word: 'dorma', translation: 'sleep', wordClass: 'verb' },
    { id: 'w-bite', word: 'morda', translation: 'bite', wordClass: 'verb' },
    { id: 'w-big', word: 'maga', translation: 'big', wordClass: 'adjective' },
    { id: 'w-here', word: 'kiki', translation: 'here', wordClass: 'adverb' },
    { id: 'w-in', word: 'ini', translation: 'in', wordClass: 'adposition' },
    { id: 'w-the', word: 'ta', translation: 'the', wordClass: 'article' },
    { id: 'w-more', word: 'plu', translation: 'more', wordClass: 'adverb' },
    { id: 'w-than', word: 'ke', translation: 'than', wordClass: 'conjunction' },
    {
        id: 'w-go',
        word: 'koro',
        translation: 'go',
        wordClass: 'verb',
        inflectionOverrides: {
            '1S_Past': 'kora'
        }
    }
];

const CORE_RULES = [
    { id: 'r-pl', name: 'Plural', affix: '-s', gloss: 'PL', appliesTo: 'noun' },
    { id: 'r-pst', name: 'Past', affix: '-da', gloss: 'PST', appliesTo: 'verb' },
    { id: 'r-acc', name: 'Accusative', affix: '-m', gloss: 'ACC', appliesTo: 'noun' },
    { id: 'r-erg', name: 'Ergative', affix: '-ka', gloss: 'ERG', appliesTo: 'noun' },
    { id: 'r-loc', name: 'Locative', affix: '-lo', gloss: 'LOC', appliesTo: 'noun' },
    { id: 'r-abl', name: 'Ablative', affix: '-tu', gloss: 'ABL', appliesTo: 'noun' },
    { id: 'r-comp', name: 'Comparative', affix: '-or', gloss: 'COMP', appliesTo: 'adjective' },
    { id: 'r-def', name: 'Definite', affix: '-en', gloss: 'DEF', appliesTo: 'noun' }
];

describe('Word Assist Remade Engine, Typology Sync & Diagnostics', () => {

    it('resolves Pronoun Matrix forms, Possessives, Pro-Drop & Verb Person Agreement', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SOV',
            pronounMatrixData: {
                '1st-S-General-sub': 'na',
                '1st-S-General-obj': 'nam',
                '1st-S-General-det': 'nas',
                '1st-S-General-affix': '-i',
                '2nd-S-General-sub': 'tu',
                '2nd-S-General-obj': 'tum',
                '2nd-S-General-affix': '-u',
                'Other-S-Near-Anim-dem': 'kese'
            },
            waConfig: {
                alignment: 'neutral',
                proDropMode: 'pronouns',
                verbPersonAgreement: 'auto',
                genitivePlacement: 'possessed-possessor'
            }
        });

        const res1 = analyzer.computePhraseSuggestion('I see you', 9);
        assert.ok(res1.length > 0);
        // SOV + neutral + proDrop drops 'na', inflects verb with '-i', object pronoun 'tum'
        assert.equal(res1[0].romanized, 'tum vidai');
        assert.ok(res1[0].appliedGrammar.some(g => g.includes('Pro-drop')));
        assert.ok(res1[0].appliedGrammar.some(g => g.includes('Agreement 1S')));

        const commonSubj = {
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO',
            pronounMatrixData: {
                '1st-S-General-sub': 'na',
                '1st-S-General-affix': '-i',
                '2nd-S-General-obj': 'tum'
            }
        };

        const freeOnly = createGrammarAnalyzer({ ...commonSubj, waConfig: { alignment: 'neutral', subjectRealization: 'free_only' } });
        assert.equal(freeOnly.computePhraseSuggestion('I see you', 9)[0].romanized, 'na vida tum');

        const affixOnly = createGrammarAnalyzer({ ...commonSubj, waConfig: { alignment: 'neutral', subjectRealization: 'affix_only' } });
        assert.equal(affixOnly.computePhraseSuggestion('I see you', 9)[0].romanized, 'vidai tum');

        const dropSubj = createGrammarAnalyzer({ ...commonSubj, waConfig: { alignment: 'neutral', subjectRealization: 'drop_subject' } });
        assert.equal(dropSubj.computePhraseSuggestion('I see you', 9)[0].romanized, 'vida tum');

        const bothSubj = createGrammarAnalyzer({ ...commonSubj, waConfig: { alignment: 'neutral', subjectRealization: 'free_and_affix' } });
        assert.equal(bothSubj.computePhraseSuggestion('I see you', 9)[0].romanized, 'na vidai tum');

        const resPoss = analyzer.computePhraseSuggestion('I see my house', 14);
        // Possessed-first places 'doma nas' before SOV verb 'vidai'
        assert.ok(resPoss[0].romanized.includes('doma nas'), `Expected 'doma nas' in '${resPoss[0].romanized}'`);
    });

    it('applies Ergative vs Accusative vs Neutral alignment accurately', () => {
        const common = {
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO'
        };

        const erg = createGrammarAnalyzer({ ...common, waConfig: { alignment: 'ergative' } });
        const ergTrans = erg.computePhraseSuggestion('the dog bites the cat', 21)[0].romanized;
        const ergIntrans = erg.computePhraseSuggestion('the dog sleeps', 14)[0].romanized;
        assert.equal(ergTrans, 'kanoka morda miso', 'Transitive subject marked ERG, object unmarked ABS');
        assert.equal(ergIntrans, 'kano dorma', 'Intransitive subject unmarked ABS');

        const acc = createGrammarAnalyzer({ ...common, waConfig: { alignment: 'accusative' } });
        const accTrans = acc.computePhraseSuggestion('the dog bites the cat', 21)[0].romanized;
        assert.equal(accTrans, 'kano morda misom', 'Subject unmarked NOM, object marked ACC');

        const neut = createGrammarAnalyzer({ ...common, waConfig: { alignment: 'neutral' } });
        const neutTrans = neut.computePhraseSuggestion('the dog bites the cat', 21)[0].romanized;
        assert.equal(neutTrans, 'kano morda miso', 'Neither core argument inflected in neutral alignment');
    });

    it('supports Postpositions and Case Absorption (Preposition -> Locative)', () => {
        const absorbed = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO',
            waConfig: {
                absorbPrepositionsIntoCase: true,
                adpositionPlacement: 'preposition'
            }
        });
        const resAbsorbed = absorbed.computePhraseSuggestion('dogs sleep in the house', 23)[0];
        assert.ok(resAbsorbed.romanized.includes('domalo'), `Expected locative 'domalo' in '${resAbsorbed.romanized}'`);
        assert.ok(!resAbsorbed.romanized.includes('ini'), 'Preposition word should be absorbed by Locative case');

        const postpos = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO',
            waConfig: {
                absorbPrepositionsIntoCase: false,
                adpositionPlacement: 'postposition'
            }
        });
        const resPost = postpos.computePhraseSuggestion('dogs sleep in the house', 23)[0];
        assert.ok(resPost.romanized.includes('doma ini'), `Expected postposition 'doma ini' in '${resPost.romanized}'`);
    });

    it('handles Standalone rules, particleDatabase particles, and Negation placement', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: [
                ...CORE_RULES,
                { id: 'r-neg', name: 'Negation', affix: 'ne', gloss: 'NEG', appliesTo: 'all', standalone: true }
            ],
            usesParticles: true,
            particleDatabase: [
                { word: 'ka', meaning: 'question marker', category: 'Question' }
            ],
            syntaxOrder: 'SVO',
            waConfig: {
                negationPlacement: 'clauseFinal',
                questionParticleBehavior: 'yesNoOnly'
            }
        });

        const negClause = analyzer.computePhraseSuggestion('dogs do not see cats', 20)[0].romanized;
        assert.ok(negClause.endsWith('ne'), `Expected clause-final standalone NEG 'ne', got '${negClause}'`);

        const qClause = analyzer.computePhraseSuggestion('do dogs see cats?', 17)[0].romanized;
        assert.ok(qClause.includes('ka'), `Expected particleDatabase question marker 'ka' in '${qClause}'`);
    });

    it('handles Comparative strategies and Article strategies', () => {
        const synthComp = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO',
            waConfig: {
                comparativeStrategy: 'suffix_ablative',
                copulaBehavior: 'zero_copula',
                articleStrategy: 'affix'
            }
        });
        const resComp = synthComp.computePhraseSuggestion('the dog is more big than the cat', 32)[0].romanized;
        assert.ok(resComp.includes('magaor'), `Expected comparative adj 'magaor' in '${resComp}'`);
        assert.ok(resComp.includes('miso') && resComp.includes('tu'), `Expected ablative standard in '${resComp}'`);
        assert.ok(resComp.includes('kanoen'), `Expected definite noun suffix 'kanoen' in '${resComp}'`);
    });

    it('respects Irregular inflectionOverrides and custom Number System numerals', () => {
        const analyzer = createGrammarAnalyzer({
            lexicon: BASE_LEXICON,
            grammarRules: CORE_RULES,
            syntaxOrder: 'SVO',
            pronounMatrixData: {
                '1st-S-General-sub': 'na'
            },
            numeralBase: 10,
            numberSystem: {
                digits: { '1': 'uno', '2': 'dwo', '3': 'tri', '4': 'kwa', '5': 'pen' },
                powers: { '10': 'ten' }
            }
        });

        const irrPast = analyzer.computePhraseSuggestion('I went', 6)[0].romanized;
        assert.ok(irrPast.includes('kora'), `Expected irregular 1S Past override 'kora' in '${irrPast}'`);

        const numRes = analyzer.computePhraseSuggestion('I see 23 dogs', 13)[0].romanized;
        const expected23 = translateNumeralToken('23', {
            digits: { '1': 'uno', '2': 'dwo', '3': 'tri' },
            powers: { '10': 'ten' }
        }, 10)?.word;
        assert.ok(expected23 && numRes.includes(expected23), `Expected decomposed numeral '${expected23}' in '${numRes}'`);
    });

    it('produces actionable Sentence Diagnostics and Language Readiness Audits when rules/words are missing', () => {
        const bareAnalyzer = createGrammarAnalyzer({
            lexicon: [
                { id: 'w1', word: 'kano', translation: 'dog', wordClass: 'noun' }
            ],
            grammarRules: [],
            syntaxOrder: 'SVO',
            waConfig: { alignment: 'accusative' }
        });

        const diagSugg = bareAnalyzer.computePhraseSuggestion('my dog is not eating 5 apples', 29)[0];
        const kinds = new Set(diagSugg.diagnostics.map(d => d.kind));
        assert.ok(kinds.has('word'), 'Should report missing lexicon words (eat, apple)');
        assert.ok(kinds.has('pronoun'), 'Should report missing possessive pronoun (my)');
        assert.ok(kinds.has('rule'), 'Should report missing morphology rules (Plural / Negation)');
        assert.ok(diagSugg.diagnostics.some(d => d.slotId === 'plural'));

        const copulaDiagSugg = bareAnalyzer.computePhraseSuggestion('the dog is big', 14)[0];
        assert.ok(copulaDiagSugg.diagnostics.some(d => d.id === 'missing_copula_or_zero'), 'Should report missing copula or zero-copula option');

        const bareAudit = bareAnalyzer.auditReadiness();
        assert.ok(bareAudit.scorePercent < 50, `Expected low readiness for empty conlang, got ${bareAudit.scorePercent}%`);

        const richAnalyzer = createGrammarAnalyzer({
            lexicon: [
                ...BASE_LEXICON,
                { id: 'w-be', word: 'esa', translation: 'is / be', wordClass: 'verb' }
            ],
            grammarRules: [
                ...CORE_RULES,
                { id: 'r-fut', name: 'Future', affix: '-lo', gloss: 'FUT', appliesTo: 'verb' },
                { id: 'r-neg', name: 'Negation', affix: 'ne-', gloss: 'NEG', appliesTo: 'all' }
            ],
            pronounMatrixData: {
                '1st-S-General-sub': 'na',
                '2nd-S-General-sub': 'tu',
                '3rd-S-General-sub': 'li'
            },
            waConfig: { alignment: 'accusative' }
        });
        const richAudit = richAnalyzer.auditReadiness();
        assert.ok(richAudit.scorePercent >= 85, `Expected high readiness >= 85%, got ${richAudit.scorePercent}%`);
    });

    it('builds valid GrammarRules entries and ignores stale legacy QCTLJNORVMSAPG priority strings', () => {
        const rule = buildGrammarRuleEntry('ergative', {
            name: 'Ergative Case',
            affix: '-ka'
        });
        assert.equal(rule.appliesTo, 'noun');
        assert.equal(rule.targetPOS, '');
        assert.equal(rule.isDerivational, false);
        assert.equal(rule.gloss, 'ERG');

        const effective = resolveEffectiveSyntaxOrder(LEGACY_STALE_WA_ORDER, 'SOV', 'SVO');
        assert.equal(effective, 'SOV');

        const resolved = resolveTranslatorSettings({
            syntaxOrder: 'VSO',
            waConfig: { syntaxOrder: LEGACY_STALE_WA_ORDER, alignment: 'ergative' }
        });
        assert.equal(resolved.syntaxOrder, 'VSO');
        assert.equal(resolved.alignment, 'ergative');

        // Verify resolveTranslatorSettings also reads wordAssistConfig (as passed by WordAssistSettingsPanel & GrammarTab)
        const fromWordAssistConfig = resolveTranslatorSettings({
            wordAssistConfig: {
                alignment: 'ergative',
                subjectRealization: 'affix_only',
                adpositionPlacement: 'postposition',
                comparativeStrategy: 'suffix_ablative'
            }
        });
        assert.equal(fromWordAssistConfig.alignment, 'ergative');
        assert.equal(fromWordAssistConfig.subjectRealization, 'affix_only');
        assert.equal(fromWordAssistConfig.adpositionPlacement, 'postposition');
        assert.equal(fromWordAssistConfig.comparativeStrategy, 'suffix_ablative');
        assert.ok(TYPOLOGY_SELECT_FIELDS.some(f => f.key === 'subjectRealization'));
    });

});
