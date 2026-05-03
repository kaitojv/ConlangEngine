import React, { useState } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import SyllabaryManager from '../../UI/SyllabaryManager/SyllabaryManager.jsx';
import BlockManager from '../../UI/BlockManager/BlockManager.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import applySoundChanges from '../../../utils/applysoundchanges.jsx';
import { Info, AudioLines, Hourglass, Eye, BookCheck } from 'lucide-react';
import toast from 'react-hot-toast';
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
    const [showApplyConfirm, setShowApplyConfirm] = useState(false);

    // Run the user's test words through the sound change engine
    const handlePreview = () => {
        if (!testWords.trim()) {
            setPreviewResults([]);
            return;
        }
        const results = applySoundChanges(testWords, historicalRules);
        setPreviewResults(results);
    };

    // Permanently apply all sound-change rules to every word in the lexicon
    const handleApplyToLexicon = () => {
        if (!historicalRules.trim()) {
            toast.error('No rules to apply. Write some rules first.');
            return;
        }
        if (lexicon.length === 0) {
            toast.error('Your lexicon is empty.');
            return;
        }

        let changed = 0;
        lexicon.forEach((entry) => {
            const safeWord = entry.word.replace(/\*/g, '');
            const results = applySoundChanges(safeWord, historicalRules);
            if (results.length > 0 && results[0].evolved !== safeWord) {
                // Preserve any leading * (root marker)
                const prefix = entry.word.startsWith('*') ? '*' : '';
                updateWord(entry.id, { word: prefix + results[0].evolved });
                changed++;
            }
        });

        setShowApplyConfirm(false);
        if (changed > 0) {
            toast.success(`✅ Applied rules to ${changed} word${changed !== 1 ? 's' : ''} in your lexicon.`);
        } else {
            toast(`No words were changed — the rules may not match any stored phonemes.`, { icon: 'ℹ️' });
        }
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

            <Card>
                <h2 className="flex sg-title"><Hourglass /> Historical Sound Changer</h2>
                <p className="settings-description">
                    Evolve your language natively. Write rules line by line using Regex format: 
                    <code> pattern =&gt; replacement</code>
                </p>
                
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

                {/* Apply to Lexicon — destructive action, gated behind a confirmation */}
                {!showApplyConfirm ? (
                    <div className="pt-button-row">
                        <Button variant="edit" onClick={() => setShowApplyConfirm(true)}>
                            <BookCheck size={16} /> Apply to Lexicon
                        </Button>
                    </div>
                ) : (
                    <div className="apply-confirm-box">
                        <p className="apply-confirm-text">
                            ⚠️ This will <strong>permanently rewrite</strong> the stored phoneme spelling of every matching word. This cannot be undone. Are you sure?
                        </p>
                        <div className="apply-confirm-actions">
                            <Button variant="error" onClick={handleApplyToLexicon}>
                                Yes, apply to all {lexicon.length} words
                            </Button>
                            <Button variant="edit" onClick={() => setShowApplyConfirm(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

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
            
        </div>
    );
}
