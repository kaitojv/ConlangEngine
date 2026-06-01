import React, { useState } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import SyllabaryManager from '../../UI/SyllabaryManager/SyllabaryManager.jsx';
import BlockManager from '../../UI/BlockManager/BlockManager.jsx';
import AlphabeticManager from '../../UI/AlphabeticManager/AlphabeticManager.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import applySoundChanges from '../../../utils/applysoundchanges.jsx';
import { VisualRuleBuilder } from './grammarMatrix/VisualRuleBuilder.jsx';
import ProsodyRulesCard from './ProsodyRulesCard.jsx';
import { Wand2, Info, AudioLines, Hourglass, Eye, BookCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../UI/Modal/Modal.jsx';
import './phonologyTab.css'

export default function PhonologyTab() {
    // Grab all our phonology and orthography settings from the global store
    const consonants = useConfigStore((state) => state.consonants) || '';
    const vowels = useConfigStore((state) => state.vowels) || '';
    const syllablePattern = useConfigStore((state) => state.syllablePattern) || '';
    const otherPhonemes = useConfigStore((state) => state.otherPhonemes) || '';
    const otherPhonemeMapping = useConfigStore((state) => state.otherPhonemeMapping) || 'X';
    const skipSyllableValidation = useConfigStore((state) => state.skipSyllableValidation) || false;
    const historicalRules = useConfigStore((state) => state.historicalRules) || '';
    const phonologyTypes = useConfigStore((state) => state.phonologyTypes);
    const syllabificationAlgorithm = useConfigStore((state) => state.syllabificationAlgorithm) || 'ltr';
    const updateConfig = useConfigStore((state) => state.updateConfig);

    // Lexicon store — needed to permanently apply sound changes
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);
    const updateWord = useLexiconStore((state) => state.updateWord);
    
    // Local state to handle the real-time sound evolution preview
    const [testWords, setTestWords] = useState('');
    const [previewResults, setPreviewResults] = useState([]);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    
    // Selective sound changes state
    const [pendingChanges, setPendingChanges] = useState(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    // Run the user's test words through the sound change engine
    const handlePreview = () => {
        if (!testWords.trim()) {
            setPreviewResults([]);
            return;
        }
        const results = applySoundChanges(testWords, historicalRules);
        setPreviewResults(results);
    };

    // Prepare the list of words that would be affected by the current sound changes
    const handlePrepareApplyToLexicon = () => {
        if (!historicalRules.trim()) {
            toast.error('No rules to apply. Write some rules first.');
            return;
        }
        if (lexicon.length === 0) {
            toast.error('Your lexicon is empty.');
            return;
        }

        const changes = [];
        lexicon.forEach((entry) => {
            const safeWord = entry.word.replace(/\*/g, '');
            const results = applySoundChanges(safeWord, historicalRules);
            if (results.length > 0 && results[0].evolved !== safeWord) {
                const prefix = entry.word.startsWith('*') ? '*' : '';
                changes.push({
                    id: entry.id,
                    original: entry.word,
                    evolved: prefix + results[0].evolved,
                    translation: entry.translation,
                    wordClass: entry.wordClass,
                    tags: entry.tags,
                    selected: true
                });
            }
        });

        if (changes.length > 0) {
            setPendingChanges(changes);
            setIsReviewModalOpen(true);
        } else {
            toast(`No words were changed — the rules may not match any stored phonemes.`, { icon: 'ℹ️' });
        }
    };

    // Apply the selected changes
    const handleConfirmSelectedChanges = () => {
        if (!pendingChanges) return;
        
        let appliedCount = 0;
        pendingChanges.forEach(change => {
            if (change.selected) {
                updateWord(change.id, { word: change.evolved });
                appliedCount++;
            }
        });
        
        setIsReviewModalOpen(false);
        setPendingChanges(null);
        
        if (appliedCount > 0) {
            toast.success(`✅ Applied rules to ${appliedCount} word${appliedCount !== 1 ? 's' : ''} in your lexicon.`);
        } else {
            toast(`No changes were applied.`, { icon: 'ℹ️' });
        }
    };

    const togglePendingChange = (index) => {
        setPendingChanges(prev => {
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
    };

    const setAllPendingChanges = (value) => {
        setPendingChanges(prev => prev.map(c => ({ ...c, selected: value })));
    };
   
    return (
        <div className="phonology-tab-container">
            
            <Card>
                <h2 className="flex sg-title"><AudioLines /> Sounds & Orthography</h2>
                
                <Infobox title="Phonology & Orthography Guide">
                    • <b>Basic Sounds:</b> Type your IPA phonemes separated by commas (e.g., <code>p, t, k, m, ṇ</code>).<br />
                    • <b>Custom Orthography (=):</b> If a sound is written differently in your romanization or native script, map it using the format <code>IPA=Text</code>. <br />
                    <i>Example:</i> If the sound /ʃ/ is written as '<b>თ</b>' and a trill /r/ as '<b>რ</b>', you should type: <code>ʃ=თ, r=რ</code>. This exact mapping is what allows the <b>Interactive Reader</b> and the <b>TTS Audio</b> to correctly pronounce your custom letters!
                </Infobox>
                
                <Input 
                    label="Consonants" 
                    placeholder="e.g., p, t, k, m, n..."
                    value={consonants}
                    onChange={(e) => updateConfig({ consonants: e.target.value })} 
                />

                <Input 
                    label="Vowels" 
                    placeholder="e.g., a, e, i, o, u..."
                    value={vowels}
                    onChange={(e) => updateConfig({ vowels: e.target.value })}
                />

                <IpaChart 
                    consonants={consonants} 
                    setConsonants={(val) => updateConfig({ consonants: val })} 
                    vowels={vowels} 
                    setVowels={(val) => updateConfig({ vowels: val })} 
                />

                <div className="sg-input-group phonology-split-group">
                    <div className="phonology-flex-1">
                        <Input 
                            label="Other Phonemes (Tones, Clicks, Particles)" 
                            placeholder="e.g., ˥, ˦, ʘ, particle..."
                            value={otherPhonemes}
                            onChange={(e) => updateConfig({ otherPhonemes: e.target.value })}
                        />
                    </div>
                    <div className="phonology-fixed-width">
                        <Input 
                            label="Mapping Char" 
                            placeholder="e.g., X"
                            value={otherPhonemeMapping}
                            onChange={(e) => updateConfig({ otherPhonemeMapping: e.target.value })}
                        />
                    </div>
                </div>

                <Input
                    label="Syllable Pattern"
                    placeholder="e.g., CV, CVC, VCV..."
                    value={syllablePattern}
                    onChange={(e) => updateConfig({ syllablePattern: e.target.value })}
                    disabled={skipSyllableValidation}
                />
                
                {phonologyTypes === 'alphabetic' && (
                    <label className="flex items-center gap-2 phonology-checkbox-label">
                        <input 
                            type="checkbox" 
                            checked={skipSyllableValidation}
                            onChange={(e) => updateConfig({ skipSyllableValidation: e.target.checked })}
                        />
                        Skip Syllable Pattern Validation
                    </label>
                )}

                {(phonologyTypes === 'syllabic' || phonologyTypes === 'featural_block') && (
                    <div className="settings-section-wrapper">
                        <label className="form-label settings-label-block">Syllabification Algorithm (for ambiguous words)</label>
                        <Infobox title="How Syllabification Works">
                            <b>Ambiguous words:</b><br />
                            If your Syllabary contains blocks for <code>cra</code>, <code>s</code>, <code>cr</code>, and <code>as</code>, and you type the word <code>cras</code>:<br /><br />
                            • <b>Left-to-Right:</b> Scans from the beginning. Finds <code>cra</code> (longest match), then <code>s</code>. Result = <code>cra</code> + <code>s</code>.<br />
                            • <b>Right-to-Left:</b> Scans from the end. Finds <code>as</code> (longest match), then <code>cr</code>. Result = <code>cr</code> + <code>as</code>.<br /><br />
                            <b>Explicit Boundaries:</b><br />
                            If you want to force a split that goes against the algorithm, use a period <code>.</code> in your lexicon entry. For example, typing <code>cr.as</code> guarantees it will be split as <code>cr</code> and <code>as</code>.
                        </Infobox>
                        <select 
                            className="settings-select-full"
                            value={syllabificationAlgorithm}
                            onChange={(e) => updateConfig({ syllabificationAlgorithm: e.target.value })}
                        >
                            <option value="ltr">Left-to-Right Greedy</option>
                            <option value="rtl">Right-to-Left Greedy</option>
                        </select>
                    </div>
                )}
            </Card>

            {phonologyTypes === 'alphabetic' && (
                <div className="animate-in fade-in duration-300">
                    <AlphabeticManager />
                </div>
            )}

            {phonologyTypes === 'syllabic' && (
                <div className="animate-in fade-in duration-300">
                    <SyllabaryManager />
                </div>
            )}

            {phonologyTypes === 'featural_block' && (
                <div className="animate-in fade-in duration-300">
                    <BlockManager />
                </div>
            )}

            <ProsodyRulesCard />

            <Card>
                <h2 className="flex sg-title"><Hourglass /> Historical Sound Changer</h2>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <p className="settings-description" style={{ margin: 0 }}>
                        Evolve your language natively. Write rules line by line:
                    </p>
                    <Button 
                        variant="edit" 
                        onClick={() => setIsBuilderOpen(true)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.4rem' }}
                    >
                        <Wand2 size={14} /> Rule Builder
                    </Button>
                </div>
                
                <Infobox title="View Rule Formatting Guide">
                    <b>Basic Replacement:</b><br />
                    <span>p =&gt; b</span> (Turns all 'p's into 'b's)<br />
                    <span>ch =&gt; თ</span> (Replaces specific digraphs with characters)<br /><br />

                    <b>Environmental (Contextual):</b><br />
                    <span>k(?=[ie]) =&gt; tS</span> ('k' becomes 'tS' ONLY before 'i' or 'e')<br />
                    <span>(?&lt;=[aeiou])s =&gt; z</span> ('s' becomes 'z' ONLY after a vowel)<br /><br />

                    <b>Positional Changes:</b><br />
                    <span>^a =&gt; e</span> (Changes 'a' to 'e' ONLY at the START of a word)<br />
                    <span>m$ =&gt; n</span> (Changes 'm' to 'n' ONLY at the END of a word)<br /><br />

                    <b>Advanced (Reduplication):</b><br />
                    <span>^(.{2})(.*) =&gt; $1$1$2</span> (Duplicates the first two letters)
                </Infobox>
                
                <textarea 
                    className="textarea-phonology" 
                    id="rules" 
                    placeholder={"^(.{2})(.*) => $1$1$2\nk(?=[ie]) => tS"}
                    value={historicalRules}
                    onChange={(e) => updateConfig({ historicalRules: e.target.value })}
                />

                <VisualRuleBuilder 
                    isOpen={isBuilderOpen}
                    onClose={() => setIsBuilderOpen(false)}
                    initialMode="mutation"
                    onApply={(newRule) => {
                        const current = historicalRules.trim();
                        const updated = current ? `${current}\n${newRule}` : newRule;
                        updateConfig({ historicalRules: updated });
                        setIsBuilderOpen(false);
                        toast.success('Sound Change added!');
                    }}
                />

                {/* Apply to Lexicon — opens the review modal */}
                <div className="pt-button-row">
                    <Button variant="edit" onClick={handlePrepareApplyToLexicon}>
                        <BookCheck size={16} /> Apply to Lexicon
                    </Button>
                </div>

                <div className="preview-container">
                    <label className="preview-label">Test your rules</label>
                    
                    <div className="preview-input-group">
                        <input 
                            type="text" 
                            className="preview-input"
                            placeholder="Type words to test (e.g., makin, pata)"
                            value={testWords}
                            onChange={(e) => setTestWords(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                        />
                        
                        <Button variant="edit" onClick={handlePreview}>
                            <Eye size={18} /> Preview
                        </Button>
                    </div>

                    {previewResults.length > 0 && (
                        <div className="preview-results">
                            {previewResults.map((res, i) => (
                                <div key={i} className="preview-result-item">
                                    <span className="preview-original">{res.original}</span>
                                    <span className="preview-evolved">➔ {res.evolved}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
            
            <Modal
                isOpen={isReviewModalOpen}
                onClose={() => {
                    setIsReviewModalOpen(false);
                    setPendingChanges(null);
                }}
                title="Review Sound Changes"
            >
                <div className="historical-review-modal">
                    <p className="historical-review-desc">
                        ⚠️ These changes will rewrite the phoneme spelling of the selected words. This cannot be undone.
                    </p>
                    
                    {pendingChanges && (
                        <>
                            <div className="historical-review-actions">
                                <Button variant="edit" onClick={() => setAllPendingChanges(true)}>Select All</Button>
                                <Button variant="edit" onClick={() => setAllPendingChanges(false)}>Deselect All</Button>
                            </div>
                            
                            <div className="historical-review-list">
                                {pendingChanges.map((change, index) => (
                                    <label key={change.id} className={`historical-review-item ${change.selected ? 'selected' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={change.selected} 
                                            onChange={() => togglePendingChange(index)} 
                                        />
                                        <div className="historical-review-item-content">
                                            <div className="historical-review-words">
                                                <span className="historical-review-original">{change.original}</span>
                                                <span className="historical-review-arrow">➔</span>
                                                <span className="historical-review-evolved">{change.evolved}</span>
                                            </div>
                                            <div className="historical-review-meta">
                                                {change.translation && <span className="historical-meta-trans">"{change.translation}"</span>}
                                                {change.wordClass && <span className="historical-meta-pos">{change.wordClass}</span>}
                                                {change.tags && change.tags.length > 0 && (
                                                    <span className="historical-meta-tags">
                                                        {change.tags.map(t => `#${t}`).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            
                            <div className="historical-review-footer">
                                <Button variant="error" onClick={handleConfirmSelectedChanges}>
                                    Apply {pendingChanges.filter(c => c.selected).length} Selected Changes
                                </Button>
                                <Button variant="edit" onClick={() => {
                                    setIsReviewModalOpen(false);
                                    setPendingChanges(null);
                                }}>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
