import nlp from 'compromise';
import { MASSIVE_THEMES } from './offlineThemes.js';

/**
 * Extracts the core english word from a potentially messy translation string.
 * e.g., "to run away" -> "run", "an apple" -> "apple"
 */
function extractCoreWord(translation) {
    if (!translation) return '';
    let word = translation.toLowerCase().trim();
    
    // Remove common prefixes
    if (word.startsWith('to ')) word = word.substring(3);
    if (word.startsWith('a ')) word = word.substring(2);
    if (word.startsWith('an ')) word = word.substring(3);
    if (word.startsWith('the ')) word = word.substring(4);
    
    // Take the first main word if there are multiple (very naive, but fast)
    // E.g., "apple (fruit)" -> "apple"
    word = word.split(/[\s(,;]/)[0];
    return word;
}

/**
 * Quick offline tagger using NLP (compromise) for POS
 */
function getOfflineTags(coreWord) {
    const tags = new Set();
    const doc = nlp(coreWord);
    
    if (doc.has('#Pronoun')) tags.add('Pronouns');
    
    // Compromise POS
    if (doc.has('#Noun')) tags.add('Nouns');
    if (doc.has('#Verb')) tags.add('Verbs');
    if (doc.has('#Adjective')) tags.add('Adjectives');
    
    return Array.from(tags);
}

/**
 * Auto-tags a word based on its English translation.
 * Uses a massive offline dictionary, NLP, and Datamuse API (rel_gen) for fallbacks.
 * @param {string} translation The english meaning
 * @param {boolean} offlineOnly If true, skips the API calls completely
 * @returns {Promise<string[]>} Array of theme tags
 */
export async function getTagsForTranslation(translation, offlineOnly = false) {
    const coreWord = extractCoreWord(translation);
    if (!coreWord) return [];

    const tags = new Set();

    // 1. Check massive local offline dictionary first! (Instant)
    if (MASSIVE_THEMES[coreWord]) {
        tags.add(MASSIVE_THEMES[coreWord]);
    }
    
    // Check if it's a known POS from our basic words
    const basicPronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they'];
    const basicGreetings = ['hello', 'hi', 'goodbye', 'bye'];
    const basics = ['yes', 'no', 'please', 'thanks'];
    
    if (basicPronouns.includes(coreWord)) { tags.add('Pronouns'); tags.add('Basics'); }
    if (basicGreetings.includes(coreWord)) { tags.add('Greetings'); tags.add('Basics'); }
    if (basics.includes(coreWord)) tags.add('Basics');

    // 2. Offline NLP Analysis using compromise for POS tags
    const offlineTags = getOfflineTags(coreWord);
    offlineTags.forEach(t => tags.add(t));

    // Determine if we actually found a strong semantic theme (not just a POS)
    const hasSemanticTheme = Array.from(tags).some(t => !['Nouns', 'Verbs', 'Adjectives', 'Misc', 'Pronouns', 'Basics'].includes(t));

    // If offline only is requested, or we already found a strong semantic theme, return early!
    // This entirely prevents the 10-minute Datamuse slowdown if we already know the answer.
    if (offlineOnly || hasSemanticTheme) {
        if (tags.size === 0) tags.add('Misc');
        return Array.from(tags);
    }

    // 3. API Fallbacks (Slow, so only do this if we REALLY don't know what the word is)
    // Fetch hypernyms from Datamuse (e.g. apple -> fruit)
    try {
        const response = await fetch(`https://api.datamuse.com/words?rel_gen=${encodeURIComponent(coreWord)}&max=5`);
        if (response.ok) {
            const data = await response.json();
            for (const item of data) {
                const hypernym = item.word.toLowerCase();
                // Check if the hypernym maps to an offline theme!
                if (MASSIVE_THEMES[hypernym]) {
                    tags.add(MASSIVE_THEMES[hypernym]);
                }
            }
        }
    } catch (err) {
        console.warn("Datamuse API failed:", err);
    }

    // 4. ConceptNet Fallback
    const stillNoTheme = Array.from(tags).every(t => ['Nouns', 'Verbs', 'Adjectives', 'Misc', 'Pronouns', 'Basics'].includes(t));
    if (stillNoTheme) {
        try {
            const response = await fetch(`https://api.conceptnet.io/query?node=/c/en/${encodeURIComponent(coreWord)}&rel=/r/IsA&limit=5`);
            if (response.ok) {
                const data = await response.json();
                if (data.edges) {
                    for (const edge of data.edges) {
                        const targetLabel = edge.end?.label?.toLowerCase();
                        if (targetLabel && MASSIVE_THEMES[targetLabel]) {
                            tags.add(MASSIVE_THEMES[targetLabel]);
                        }
                    }
                }
            }
        } catch (err) {
            console.warn("ConceptNet API failed:", err);
        }
    }

    // If still empty after APIs, add a default tag
    if (tags.size === 0) {
        tags.add('Misc');
    }

    return Array.from(tags);
}

