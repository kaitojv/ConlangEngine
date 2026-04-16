import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/card.jsx';
import Input from '@/components/UI/Input/input.jsx';
import { Network, AlertTriangle } from 'lucide-react';
import './etymologyTab.css';

export default function EtymologyTab() {
    const [searchInput, setSearchInput] = useState('');

    // Global Store Data
    const lexicon = useLexiconStore((state) => state.lexicon);
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);

    const { transliterate, normalizeToBase } = useTransliterator();

    // Find the word in the dictionary dynamically as the user types
    const targetWord = useMemo(() => {
        if (!searchInput.trim()) return null;
        const normalizedInput = normalizeToBase(searchInput.trim().toLowerCase());
        return lexicon.find(w => normalizeToBase(w.word.toLowerCase()) === normalizedInput);
    }, [searchInput, lexicon, normalizeToBase]);

    // Generate the derivation map
    const derivations = useMemo(() => {
        if (!targetWord) return [];
        
        let base = targetWord.word;
        
        // Strip clitics and verb markers to get the pure root
        if (cliticsRules) {
            const clitics = cliticsRules.split(',').map(c => c.trim().replace(/^-/, '')).filter(Boolean);
            const matchedClitic = clitics.find(c => base.endsWith(c));
            if (matchedClitic) base = base.slice(0, -matchedClitic.length);
        }
        if (targetWord.wordClass === 'verb' && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, '')).filter(Boolean);
            const matchedMarker = markers.find(m => base.endsWith(m));
            if (matchedMarker) base = base.slice(0, -matchedMarker.length);
        }

        // Find applicable rules for this word class
        const applicableRules = grammarRules.filter(rule => {
            const classes = rule.appliesTo.split(',').map(c => c.trim().toLowerCase());
            return classes.includes('all') || classes.includes(targetWord.wordClass.toLowerCase());
        });

        // Generate derived words
        return applicableRules.map(rule => {
            const result = applyRuleToWord(base, rule, grammarRules, vowels);
            return { ruleName: rule.name, word: result };
        }).filter(d => d.word !== null);
    }, [targetWord, grammarRules, vowels, verbMarker, cliticsRules]);

    return (
        <div className="etymology-container">
            <Card>
                <h2 className='flex sg-title etymology-header-title'>
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

                {searchInput.trim() && !targetWord && (
                    <div className="etymology-error-box">
                        <AlertTriangle size={18} /> Root not found in dictionary. Make sure you typed the exact base word.
                    </div>
                )}
            </Card>

            {targetWord && (
                <div className="etymology-tree-container">
                    {/* Base Word Node */}
                    <div className="base-word-node">
                        <div className="notranslate custom-font-text base-word-text">{transliterate(targetWord.word)}</div>
                        <div className="base-word-class">{targetWord.wordClass}</div>
                        <div className="base-word-translation">{targetWord.translation}</div>
                    </div>

                    {derivations.length > 0 ? (
                        <>
                            <div className="tree-connector"></div>
                            <div className="derivations-grid">
                                {derivations.map((d, idx) => (
                                    <div key={idx} className="derivation-card">
                                        <div className="notranslate custom-font-text derivation-word">{transliterate(d.word)}</div>
                                        <div className="derivation-rule">{d.ruleName}</div>
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
