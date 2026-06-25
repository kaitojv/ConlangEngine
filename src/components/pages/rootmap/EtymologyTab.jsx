import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { applyRuleToWord, expandWildcardDependencies } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import EmptyState from '@/components/UI/EmptyState/EmptyState.jsx';
import { Network, AlertTriangle, Search, BookOpen, ChevronRight, Layers } from 'lucide-react';
import PanZoomContainer from '@/components/UI/PanZoomContainer/PanZoomContainer.jsx';
import './etymologyTab.css';

export default function EtymologyTab() {
    const [searchInput, setSearchInput] = useState('');

    // Let's grab what we need from our global linguistic stores
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const grammarRules = useConfigStore((state) => state.grammarRules) || [];
    const vowels = useConfigStore((state) => state.vowels);
    const consonants = useConfigStore((state) => state.consonants);
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes);
    const verbMarker = useConfigStore((state) => state.verbMarker);
    const cliticsRules = useConfigStore((state) => state.cliticsRules);

    const { transliterate, normalizeToBase } = useTransliterator();
    const unlockBadge = useConfigStore((state) => state.unlockBadge);
    const logActivity = useConfigStore((state) => state.logActivity);
    const unlockedBadges = useConfigStore((state) => state.unlockedBadges);

    // As the user types, we'll try to find the exact root word in the lexicon
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
        
        // Verb markers are no longer stripped, they only act as a validation warning during creation

        // Now, find all grammar rules that actually apply to this specific part of speech
        const targetClasses = (targetWord.wordClass || '').split(',').map(c => c.trim().toLowerCase());
        let applicableRules = grammarRules.filter(rule => {
            const allowedClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
            return allowedClasses.includes('all') || targetClasses.some(tc => allowedClasses.includes(tc));
        });
        
        applicableRules = expandWildcardDependencies(applicableRules, grammarRules);

        // Finally, apply each rule to the base word and build our list of generated derivations
        return applicableRules.reduce((acc, rule) => {
            const result = applyRuleToWord(baseWord, rule, grammarRules, vowels, consonants, otherPhonemes);
            if (result) {
                acc.push({ ruleName: rule.name, word: result });
            }
            return acc;
        }, []);
    }, [targetWord, grammarRules, vowels, verbMarker, cliticsRules]);

    // Find actual distinct lexicon entries that derived from this root
    const lexicalDescendants = useMemo(() => {
        if (!targetWord) return [];
        return lexicon.filter(w => w.etymology === targetWord.id);
    }, [targetWord, lexicon]);

    // Unlock achievement when a map is generated
    React.useEffect(() => {
        if (targetWord && !unlockedBadges?.includes('etymologist')) {
            unlockBadge('etymologist', 'Etymologist');
            logActivity('Generated an Etymology Root Map!');
        }
    }, [targetWord, unlockedBadges, unlockBadge, logActivity]);

    return (
        <div className="etymology-container">
            <Card>
                <h2 className="flex sg-title etymology-header-title">
                    <Network /> Etymology & Derivation Map
                </h2>
                <p className="etymology-description">
                    Search for a root word in your lexicon to visualize all of its generated grammatical derivations.
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
                        <span>Root not found in lexicon. Make sure you typed the exact base word.</span>
                    </div>
                )}
            </Card>

            {!searchInput.trim() && !targetWord && (
                <EmptyState
                    icon={Network}
                    title="Etymology Map"
                    description="Visualize how words in your conlang are derived. Search for a root word to see its entire grammatical family tree, automatically generated from your grammar rules."
                />
            )}

            {targetWord && (
                <PanZoomContainer>
                    <div className="etymology-tree-container">
                        
                        {/* The core root word sits at the top of the tree */}
                        <div className="base-word-node">
                            <div className="notranslate custom-font-text base-word-text">{transliterate(targetWord.word)}</div>
                            <div className="base-word-class">{targetWord.wordClass}</div>
                            <div className="base-word-translation">{targetWord.translation}</div>
                        </div>

                        {/* If we have either grammar derivations or lexical descendants, draw the tree */}
                        {(derivations.length > 0 || lexicalDescendants.length > 0) ? (
                            <>
                                <div className="tree-connector"></div>
                                
                                <div className="tree-branches" style={{ display: 'flex', gap: '40px', justifyContent: 'center' }}>
                                    
                                    {/* Lexical Descendants Branch (Real Etymology) */}
                                    {lexicalDescendants.length > 0 && (
                                        <div className="tree-branch">
                                            <div className="branch-header"><Network size={14}/> Lexical Descendants</div>
                                            <div className="derivations-grid branch-grid">
                                                {lexicalDescendants.map((desc, idx) => (
                                                    <div key={idx} className="derivation-card descendant-card">
                                                        <div className="notranslate custom-font-text derivation-word">{transliterate(desc.word)}</div>
                                                        <div className="derivation-rule">{desc.translation}</div>
                                                        <div className="descendant-class">{desc.wordClass}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Grammatical Inflections Branch */}
                                    {derivations.length > 0 && (
                                        <div className="tree-branch">
                                            <div className="branch-header"><Layers size={14}/> Grammatical Inflections</div>
                                            <div className="derivations-grid branch-grid">
                                                {derivations.map((derivation, idx) => (
                                                    <div key={idx} className="derivation-card">
                                                        <div className="notranslate custom-font-text derivation-word">{transliterate(derivation.word)}</div>
                                                        <div className="derivation-rule">{derivation.ruleName}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="no-derivations-msg">
                                No descendants or grammatical rules apply to this root yet.
                            </div>
                        )}
                    </div>
                </PanZoomContainer>
            )}
        </div>
    );
}
