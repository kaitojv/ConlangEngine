/**
 * Generates natural derived glosses and dictionary definitions for
 * morphological derivations in Create Word -> Auto-Derivations Preview.
 */

const DERIVATION_PATTERNS = [
    {
        match: /past|preterit|perf/i,
        gloss: (t) => (t ? `past of ${t}` : 'past tense'),
        def: (t) => (t ? `Past-tense form of "${t}", denoting an action or state completed in the past.` : 'Past-tense inflected form of this root.')
    },
    {
        match: /future|fut\b/i,
        gloss: (t) => (t ? `will ${t}` : 'future tense'),
        def: (t) => (t ? `Future-tense form of "${t}", denoting an action or state occurring in the future.` : 'Future-tense inflected form of this root.')
    },
    {
        match: /prog|continuous|imperfect/i,
        gloss: (t) => (t ? `ongoing ${t}` : 'progressive'),
        def: (t) => (t ? `Progressive aspect form of "${t}", indicating an ongoing action.` : 'Progressive / continuous aspect form of this root.')
    },
    {
        match: /comp(arative)?\b/i,
        gloss: (t) => (t ? `more ${t}` : 'comparative'),
        def: (t) => (t ? `Comparative form of "${t}", expressing a greater degree.` : 'Comparative degree form of this root.')
    },
    {
        match: /superl(ative)?\b|\bsup\b/i,
        gloss: (t) => (t ? `most ${t}` : 'superlative'),
        def: (t) => (t ? `Superlative form of "${t}", expressing the highest degree.` : 'Superlative degree form of this root.')
    },
    {
        match: /agent|agt\b|doer/i,
        gloss: (t) => (t ? `one who ${t}s` : 'agentive'),
        def: (t) => (t ? `Agentive noun: a person or entity that performs "${t}".` : 'Agentive noun denoting one who performs the action of this root.')
    },
    {
        match: /abstra|quality|\bness\b|\bity\b/i,
        gloss: (t) => (t ? `quality of ${t}` : 'abstract noun'),
        def: (t) => (t ? `Abstract noun denoting the state, quality, or condition of "${t}".` : 'Abstract noun expressing the quality or state of this root.')
    },
    {
        match: /gerund|\bvn\b|verbal noun/i,
        gloss: (t) => (t ? `act of ${t}` : 'gerund'),
        def: (t) => (t ? `Gerund / verbal noun referring to the act or process of "${t}".` : 'Gerund / verbal noun denoting the act of this root.')
    },
    {
        match: /passive|\bpass\b/i,
        gloss: (t) => (t ? `be ${t} (passive)` : 'passive voice'),
        def: (t) => (t ? `Passive-voice form of "${t}", where the grammatical subject undergoes the action.` : 'Passive-voice form of this root.')
    },
    {
        match: /adverb|mode|manner|\badv\b/i,
        gloss: (t) => (t ? `in a ${t} manner` : 'adverbial'),
        def: (t) => (t ? `Adverbial form derived from "${t}", describing the manner or mode of an action.` : 'Adverbial / manner modifier derived from this root.')
    },
    {
        match: /adject|derivat.*adj|\badj\b/i,
        gloss: (t) => (t ? `related to ${t}` : 'derived adjective'),
        def: (t) => (t ? `Adjectival form derived from "${t}", attributing its quality or relation.` : 'Adjectival modifier derived from this root.')
    },
    {
        match: /participle|\bpart\b|ptcp/i,
        gloss: (t) => (t ? `participle of ${t}` : 'participle'),
        def: (t) => (t ? `Participial form of "${t}", functioning as a verbal adjective or complement.` : 'Participial form derived from this root.')
    },
    {
        match: /plural|\bpl\b/i,
        gloss: (t) => (t ? `${t} (pl.)` : 'plural'),
        def: (t) => (t ? `Plural form referring to multiple instances of "${t}".` : 'Plural-number form of this root.')
    },
    {
        match: /negat|\bneg\b/i,
        gloss: (t) => (t ? `not ${t}` : 'negative'),
        def: (t) => (t ? `Negative form expressing the negation or opposite of "${t}".` : 'Negative polarity form of this root.')
    },
    {
        match: /dimin|\bdim\b/i,
        gloss: (t) => (t ? `little ${t}` : 'diminutive'),
        def: (t) => (t ? `Diminutive form indicating a smaller or affectionate version of "${t}".` : 'Diminutive form of this root.')
    },
    {
        match: /augm/i,
        gloss: (t) => (t ? `great ${t}` : 'augmentative'),
        def: (t) => (t ? `Augmentative form indicating a larger or intensified version of "${t}".` : 'Augmentative form of this root.')
    },
    {
        match: /causat|\bcaus\b/i,
        gloss: (t) => (t ? `cause to ${t}` : 'causative'),
        def: (t) => (t ? `Causative form meaning to cause someone or something to "${t}".` : 'Causative form derived from this root.')
    }
];

export function buildDerivedGlossAndDefinition({
    baseTranslation = '',
    baseDefinition = '',
    rule = {}
} = {}) {
    const cleanTrans = (baseTranslation || '').trim();
    const cleanBaseDef = (baseDefinition || '').trim();
    const ruleLabel = (rule.gloss || rule.name || 'derived').trim();
    const ruleName = (rule.name || rule.gloss || 'Derived form').trim();
    const descriptor = `${rule.name || ''} ${rule.gloss || ''} ${rule.targetPOS || ''}`;

    const matched = DERIVATION_PATTERNS.find((p) => p.match.test(descriptor));
    const glossPart = matched
        ? matched.gloss(cleanTrans)
        : (cleanTrans ? `${cleanTrans} (${ruleLabel.toLowerCase()})` : `(${ruleLabel.toLowerCase()})`);

    let defPart = matched
        ? matched.def(cleanTrans)
        : (cleanTrans
            ? `${ruleName} form derived from "${cleanTrans}".`
            : `${ruleName} form derived from this root.`);

    if (cleanBaseDef) {
        const shortRootDef = cleanBaseDef.replace(/\.$/, '');
        defPart = `${defPart} Base sense: ${shortRootDef}.`;
    }

    return {
        translationText: glossPart,
        definitionText: defPart
    };
}
