import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDerivedGlossAndDefinition } from '../src/utils/derivationGloss.js';

describe('buildDerivedGlossAndDefinition', () => {
    it('generates natural derived glosses and definitions when translation & definition are provided', () => {
        const past = buildDerivedGlossAndDefinition({
            baseTranslation: 'sing',
            baseDefinition: 'To produce musical sounds with the voice',
            rule: { name: 'Past Tense', gloss: 'PST' }
        });
        assert.equal(past.translationText, 'past of sing');
        assert.ok(past.definitionText.includes('Past-tense form of "sing"'));
        assert.ok(past.definitionText.includes('Base sense: To produce musical sounds with the voice.'));

        const agent = buildDerivedGlossAndDefinition({
            baseTranslation: 'sing',
            rule: { name: 'Agentive', gloss: 'AGT' }
        });
        assert.equal(agent.translationText, 'one who sings');
        assert.ok(agent.definitionText.includes('Agentive noun'));
    });

    it('provides useful fallback rule definitions even before translation is filled', () => {
        const comp = buildDerivedGlossAndDefinition({
            baseTranslation: '',
            rule: { name: 'Comparative', gloss: 'COMP' }
        });
        assert.equal(comp.translationText, 'comparative');
        assert.ok(comp.definitionText.includes('Comparative degree form'));

        const custom = buildDerivedGlossAndDefinition({
            baseTranslation: 'water',
            rule: { name: 'diminutive', gloss: 'DIM' }
        });
        assert.equal(custom.translationText, 'little water');
        assert.ok(custom.definitionText.includes('Diminutive form'));
    });
});
