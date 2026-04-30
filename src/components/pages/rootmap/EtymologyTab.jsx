import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { Network, AlertTriangle } from 'lucide-react';
import './etymologyTab.css';

export default function EtymologyTab() {
    const [searchInput, setSearchInput] = useState('');

    // Let's grab what we need from our global linguistic stores
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);

    const { transliterate, normalizeToBase } = useTransliterator();

    // As the user types, we'll try to find the exact root word in the dictionary
    const targetWord = useMemo(() => {
        if (!searchInput.trim()) return null;
        
        const normalizedInput = normalizeToBase(searchInput.trim().toLowerCase());
        return lexicon.find(wordEntry => normalizeToBase(wordEntry.word.toLowerCase()) === normalizedInput);
    }, [searchInput, lexicon, normalizeToBase]);

    // If we found a word, let's generate a family tree of all its possible grammatical derivations
    const derivations = useMemo(() => {
        if (!targetWord) return [];
        
        let baseWord = targetWord.word;
        
        // First, we need to strip away any clitics so we're working with the pure root
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => baseWord.endsWith(c));
            if (matchedClitic) baseWord = baseWord.slice(0, -matchedClitic.length);
        }
        
        // If it's a verb, we should also strip the infinitive marker before conjugating it
        const targetClasses = targetWord.wordClass ? targetWord.wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        if (targetClasses.includes('verb') && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => baseWord.endsWith(m));
            if (matchedMarker) baseWord = baseWord.slice(0, -matchedMarker.length);
        }

        // Now, find all grammar rules that actually apply to this specific part of speech
        const applicableRules = grammarRules.filter(rule => {
            const allowedClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return allowedClasses.includes('all') || targetClasses.some(tc => allowedClasses.includes(tc));
        });

        // Finally, apply each rule to the base word and build our list of generated derivations
        return applicableRules.reduce((acc, rule) => {
            const result = applyRuleToWord(baseWord, rule, grammarRules, vowels);
            if (result) {
                acc.push({ ruleName: rule.name, word: result });
            }
            return acc;
        }, []);
    }, [targetWord, grammarRules, vowels, verbMarker, cliticsRules]);

    return (
        <div className="etymology-container">
            <Card>
                <h2 className="flex sg-title etymology-header-title">
                    <Network /> Etymology & Derivation Map
                </h2>
                <p className="etymology-description">
                    Search for a root word in your dictionary to visualize all of its generated grammatical derivations.
                </p>
                
                <Input 
                    label="Search Root Word" 
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Type the exact base word here..."
                    className="custom-font-text notranslate"
                />

                {/* Give the user a heads up if they typed something that doesn't exist yet */}
                {searchInput.trim() && !targetWord && (
                    <div className="etymology-error-box">
                        <AlertTriangle size={18} /> 
                        <span>Root not found in dictionary. Make sure you typed the exact base word.</span>
                    </div>
                )}
            </Card>

            {targetWord && (
                <div className="etymology-tree-container">
                    
                    {/* The core root word sits at the top of the tree */}
                    <div className="base-word-node">
                        <div className="notranslate custom-font-text base-word-text">{transliterate(targetWord.word)}</div>
                        <div className="base-word-class">{targetWord.wordClass}</div>
                        <div className="base-word-translation">{targetWord.translation}</div>
                    </div>

                    {derivations.length > 0 ? (
                        <>
                            <div className="tree-connector"></div>
                            <div className="derivations-grid">
                                {derivations.map((derivation, idx) => (
                                    <div key={idx} className="derivation-card">
                                        <div className="notranslate custom-font-text derivation-word">{transliterate(derivation.word)}</div>
                                        <div className="derivation-rule">{derivation.ruleName}</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="no-derivations-msg">
                            No grammatical rules apply to this root yet. Go to Settings to add inflections!
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
