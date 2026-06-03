// src/utils/courseGenerator.js
import { createGrammarAnalyzer } from './grammarAnalyzer.js';

// A massive library of high-quality English sentences grouped by theme.
// These sentences will be fed into the Word Assist engine to generate perfect conlang translations.
const SENTENCE_BANK = [
    { theme: 'Animals', text: 'The dog sees the cat.' },
    { theme: 'Animals', text: 'The cat catches the mouse.' },
    { theme: 'Animals', text: 'The bird flies.' },
    { theme: 'Animals', text: 'The horse runs fast.' },
    { theme: 'Animals', text: 'The wolf hunts the rabbit.' },
    { theme: 'Animals', text: 'The cow eats grass.' },
    { theme: 'Animals', text: 'The fish swims in the water.' },
    { theme: 'Animals', text: 'The bear sleeps.' },
    { theme: 'Food', text: 'The man eats the bread.' },
    { theme: 'Food', text: 'The woman drinks the water.' },
    { theme: 'Food', text: 'The child bites the apple.' },
    { theme: 'Food', text: 'The cook makes the cake.' },
    { theme: 'Food', text: 'I like meat.' },
    { theme: 'Food', text: 'He cooks the fish.' },
    { theme: 'Food', text: 'She tastes the soup.' },
    { theme: 'Basics', text: 'The tall man walks.' },
    { theme: 'Basics', text: 'The woman is beautiful.' },
    { theme: 'Basics', text: 'The house is big.' },
    { theme: 'Basics', text: 'The door is open.' },
    { theme: 'Basics', text: 'The book is old.' },
    { theme: 'Basics', text: 'The fire is hot.' },
    { theme: 'Basics', text: 'The water is cold.' },
    { theme: 'Basics', text: 'He is happy.' },
    { theme: 'Basics', text: 'She is sad.' },
    { theme: 'Basics', text: 'I am tired.' },
    { theme: 'Basics', text: 'They are strong.' },
    { theme: 'People', text: 'The king rules the city.' },
    { theme: 'People', text: 'The farmer works.' },
    { theme: 'People', text: 'The soldier fights.' },
    { theme: 'People', text: 'The teacher speaks.' },
    { theme: 'People', text: 'The doctor helps the child.' },
    { theme: 'Family', text: 'The mother loves the son.' },
    { theme: 'Family', text: 'The father protects the daughter.' },
    { theme: 'Family', text: 'The brother plays.' },
    { theme: 'Family', text: 'The sister sings.' },
    { theme: 'Places', text: 'The forest is dark.' },
    { theme: 'Places', text: 'The mountain is high.' },
    { theme: 'Places', text: 'The river flows.' },
    { theme: 'Places', text: 'The city is large.' },
    { theme: 'Places', text: 'The road is long.' },
    { theme: 'Clothing', text: 'The shirt is new.' },
    { theme: 'Clothing', text: 'He wears a hat.' },
    { theme: 'Clothing', text: 'She buys shoes.' }
];

export function generateCourseExercise(theme, lexicon, config) {
    if (!lexicon || lexicon.length === 0) {
        return null;
    }

    let personRulesArray = config.personRules || [];
    if (typeof personRulesArray === 'string') {
        personRulesArray = personRulesArray.trim() ? personRulesArray.split(',').map(ruleStr => {
            const parts = ruleStr.trim().split(':');
            if (parts.length < 2) return null;
            const pg = parts[0].trim();
            let person = '1st', number = 'S', gender = '';
            if (pg.startsWith('1')) person = '1st';
            else if (pg.startsWith('2')) person = '2nd';
            else if (pg.startsWith('3')) person = '3rd';
            else if (pg.startsWith('4')) person = '4th';
            
            const upperPg = pg.toUpperCase();
            if (upperPg.includes('P')) number = 'P';
            else if (upperPg.includes('C')) number = 'C';
            else if (upperPg.includes('D')) number = 'D';
            else if (upperPg.includes('B')) number = 'B';
            
            if (/masc/i.test(pg)) gender = 'Masc';
            else if (/fem/i.test(pg)) gender = 'Fem';
            else if (/neut/i.test(pg)) gender = 'Neut';
            else if (/anim/i.test(pg)) gender = 'Anim';
            else if (/inan/i.test(pg)) gender = 'Inan';
            
            const fap = parts[1].trim().split('/');
            return { id: `pr-${pg}`, person, number, gender, freeForm: fap[0]?.trim() || '', affix: fap[1]?.trim() || '', appliesTo: 'all' };
        }).filter(Boolean) : [];
    }

    // Initialize the Word Assist analyzer
    const analyzer = createGrammarAnalyzer({
        lexicon,
        grammarRules: config.grammarRules || [],
        syntaxOrder: config.syntaxOrder || 'SVO',
        waConfig: config.wordAssistConfig || {},
        personRulesArray: personRulesArray,
        adjectivePlacement: config.adjectivePlacement,
        adjectiveAgreement: config.adjectiveAgreement
    });

    // 1. Filter sentences by theme
    let validSentences = SENTENCE_BANK;
    if (theme && theme !== 'Misc') {
        validSentences = SENTENCE_BANK.filter(s => s.theme === theme);
        if (validSentences.length === 0) validSentences = SENTENCE_BANK; // Fallback to all
    }

    // 2. Shuffle valid sentences
    const shuffled = [...validSentences].sort(() => Math.random() - 0.5);

    // 3. Iterate and find a sentence where ALL required words exist in the lexicon
    for (const sentenceObj of shuffled) {
        const text = sentenceObj.text;
        
        // Use the analyzer to translate the sentence
        const suggestions = analyzer.computePhraseSuggestion(text, text.length, config.syntaxOrder || 'SVO', {}, 'normal');
        if (!suggestions || suggestions.length === 0) continue;
        
        // The first suggestion is the primary translation
        const suggestion = suggestions[0];
        
        // Verify no missing words
        // A word is considered missing if its breakdown token has `found === false` and it wasn't swallowed (like 'the')
        let hasMissingWords = false;
        if (suggestion.wordBreakdown) {
            for (const token of suggestion.wordBreakdown) {
                // If it's not swallowed, not punctuation, and not found, it's missing!
                if (!token.isPunct && !token.swallowed && token.found === false) {
                    hasMissingWords = true;
                    break;
                }
            }
        } else {
            // Fallback check: if the romanized string contains brackets like [dog], it means missing word
            if (suggestion.romanized.includes('[')) hasMissingWords = true;
        }

        if (!hasMissingWords) {
            // Success! We found a valid sentence for the user.
            
            // Reconstruct the words array for ExercisePlayer compatibility
            const finalWords = (suggestion.reordered || []).filter(t => !t.isPunct && !t.swallowed).map(t => ({
                original: t.original,
                inflected: t.conlang,
                translation: t.entry ? t.entry.translation : t.original,
                type: t.role === 'V' ? 'VERB' : (t.role === 'S' ? 'SUBJECT' : (t.role === 'O' ? 'OBJECT' : 'OTHER'))
            }));

            return {
                theme: sentenceObj.theme,
                template: 'word_assist_phrase',
                conlangSentence: suggestion.display,
                englishSentence: text,
                words: finalWords,
                waSuggestion: suggestion // pass the full suggestion for UI rendering if needed
            };
        }
    }

    // If we iterated through ALL sentences and couldn't find a single one the user has vocabulary for:
    return null;
}
