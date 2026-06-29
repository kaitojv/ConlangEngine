import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';

import Button from '../../UI/Buttons/Buttons.jsx';
import applySoundChanges from '../../../utils/applysoundchanges.jsx';
import { VisualRuleBuilder } from './grammarMatrix/VisualRuleBuilder.jsx';
import ProsodyRulesCard from './ProsodyRulesCard.jsx';
import MultiSelectDropdown from '../../UI/MultiSelectDropdown/MultiSelectDropdown.jsx';
import { Info, AudioLines, Headphones, Music, Hourglass, Wand2, BookCheck, Eye, Trash2, SquarePen } from 'lucide-react';
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
    const azureTtsVoice = useConfigStore((state) => state.azureTtsVoice) || 'en-US-JennyNeural';
    const azureTtsUseIpa = useConfigStore((state) => state.azureTtsUseIpa) ?? true;
    const vowelHarmonyMode = useConfigStore((state) => state.vowelHarmonyMode) || 'complete';
    const vowelHarmonySets = useConfigStore((state) => state.vowelHarmonySets) || [];
    const vowelHarmonyOverrideWordClasses = useConfigStore((state) => state.vowelHarmonyOverrideWordClasses) || [];
    const vowelHarmonyOverrideTags = useConfigStore((state) => state.vowelHarmonyOverrideTags) || [];
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const AZURE_VOICES = [
        { value: 'ipa-default', label: 'IPA Reading (US Base - Fluid)' },
        { value: 'ipa-uk', label: 'IPA Reading (UK Base - Crisp Consonants)' },
        { value: 'ipa-fr', label: 'IPA Reading (French Base - Soft Rs)' },
        { value: 'en-US-JennyNeural', label: 'US English (Jenny)' },
        { value: 'en-US-GuyNeural', label: 'US English (Guy)' },
        { value: 'en-GB-SoniaNeural', label: 'UK English (Sonia)' },
        { value: 'en-GB-RyanNeural', label: 'UK English (Ryan)' },
        { value: 'en-AU-NatashaNeural', label: 'Australian English (Natasha)' },
        { value: 'fr-FR-DeniseNeural', label: 'French (Denise)' },
        { value: 'fr-FR-HenriNeural', label: 'French (Henri)' },
        { value: 'es-ES-ElviraNeural', label: 'Spanish (Elvira)' },
        { value: 'es-ES-AlvaroNeural', label: 'Spanish (Alvaro)' },
        { value: 'de-DE-KatjaNeural', label: 'German (Katja)' },
        { value: 'de-DE-ConradNeural', label: 'German (Conrad)' },
        { value: 'it-IT-ElsaNeural', label: 'Italian (Elsa)' },
        { value: 'ja-JP-NanamiNeural', label: 'Japanese (Nanami)' },
        { value: 'ja-JP-KeitaNeural', label: 'Japanese (Keita)' },
        { value: 'zh-CN-XiaoxiaoNeural', label: 'Mandarin (Xiaoxiao)' },
        { value: 'ko-KR-SunHiNeural', label: 'Korean (SunHi)' },
        { value: 'ru-RU-SvetlanaNeural', label: 'Russian (Svetlana)' },
        { value: 'pt-BR-FranciscaNeural', label: 'Portuguese BR (Francisca)' },
        { value: 'ar-EG-SalmaNeural', label: 'Arabic EG (Salma)' },
        { value: 'hi-IN-SwaraNeural', label: 'Hindi (Swara)' }
    ];

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

    const HARMONY_MODES = [
        { value: 'complete', label: 'Complete — All words must conform to vowel harmony' },
        { value: 'flexible', label: 'Flexible — Override allowed per word class or tag' },
        { value: 'optional', label: 'Optional — Suggestions displayed, no enforcement' },
    ];

    const [harmonySetsInput, setHarmonySetsInput] = useState('');
    const [harmonySetNameInput, setHarmonySetNameInput] = useState('');
    const [editingSetIndex, setEditingSetIndex] = useState(-1);
    const [editingSetName, setEditingSetName] = useState('');

    const vowelInventory = useMemo(() => {
        return (vowels || '').split(',')
            .map(s => s.trim().split('=')[0].toLowerCase())
            .filter(Boolean);
    }, [vowels]);

    const normalizedHarmonySets = useMemo(() => {
        return (vowelHarmonySets || []).map((s, i) => {
            if (Array.isArray(s)) return { name: `Set ${i + 1}`, vowels: s, neutral: false };
            if (s && Array.isArray(s.vowels)) return { name: s.name || `Set ${i + 1}`, vowels: s.vowels, neutral: !!s.neutral };
            return { name: `Set ${i + 1}`, vowels: [], neutral: false };
        });
    }, [vowelHarmonySets]);

    const getHarmonySetsDisplay = () => {
        if (normalizedHarmonySets.length === 0) return 'No sets defined yet.';
        return normalizedHarmonySets.map((set) => `${set.name}: [${set.vowels.join(', ')}]`).join(' | ');
    };

    const handleAddHarmonySet = () => {
        const parts = harmonySetsInput.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (parts.length === 0) { toast.error('Enter vowels separated by commas.'); return; }
        if (parts.length < 2) { toast.error('A vowel set needs at least 2 vowels.'); return; }
        // Validate each vowel against the phonology inventory
        const invalid = parts.filter(v => !vowelInventory.includes(v) && !vowelInventory.includes(v.split('=')[0]));
        if (invalid.length > 0) {
            toast.error(`Vowels not in your phonology: ${invalid.join(', ')}. Add them to the Vowels field first.`);
            return;
        }
        const name = harmonySetNameInput.trim() || `Set ${normalizedHarmonySets.length + 1}`;
        const newSets = [...vowelHarmonySets, { name, vowels: parts, neutral: false }];
        updateConfig({ vowelHarmonySets: newSets });
        setHarmonySetsInput('');
        setHarmonySetNameInput('');
        toast.success(`Added vowel set "${name}": [${parts.join(', ')}]`);
    };

    const handleRemoveHarmonySet = (index) => {
        const newSets = vowelHarmonySets.filter((_, i) => i !== index);
        updateConfig({ vowelHarmonySets: newSets });
    };

    const handleStartEdit = (index) => {
        const set = normalizedHarmonySets[index];
        setEditingSetIndex(index);
        setEditingSetName(set.name);
    };

    const handleCancelEdit = () => {
        setEditingSetIndex(-1);
        setEditingSetName('');
    };

    const handleSaveEdit = (index) => {
        const newName = editingSetName.trim();
        if (!newName) { toast.error('Name cannot be empty.'); return; }
        const newSets = vowelHarmonySets.map((s, i) => {
            if (i !== index) return s;
            if (Array.isArray(s)) return { name: newName, vowels: s, neutral: false };
            return { ...s, name: newName };
        });
        updateConfig({ vowelHarmonySets: newSets });
        setEditingSetIndex(-1);
        setEditingSetName('');
        toast.success(`Renamed to "${newName}"`);
    };

    const handleToggleNeutral = (index) => {
        const newSets = vowelHarmonySets.map((s, i) => {
            if (i !== index) return s;
            if (Array.isArray(s)) return { name: `Set ${i + 1}`, vowels: s, neutral: true };
            return { ...s, neutral: !s.neutral };
        });
        updateConfig({ vowelHarmonySets: newSets });
    };

    const handleToggleOverrideWordClass = (cls) => {
        const list = vowelHarmonyOverrideWordClasses.includes(cls)
            ? vowelHarmonyOverrideWordClasses.filter(c => c !== cls)
            : [...vowelHarmonyOverrideWordClasses, cls];
        updateConfig({ vowelHarmonyOverrideWordClasses: list });
    };

    const handleToggleOverrideTag = (tag) => {
        const list = vowelHarmonyOverrideTags.includes(tag)
            ? vowelHarmonyOverrideTags.filter(t => t !== tag)
            : [...vowelHarmonyOverrideTags, tag];
        updateConfig({ vowelHarmonyOverrideTags: list });
    };

    // Build available classes / tags from lexicon + custom store
    const allAvailableWordClasses = useMemo(() => {
        const merged = new Set(['noun','verb','adjective','adverb','pronoun','particle','conjunction','preposition']);
        lexicon.forEach(w => {
            if (w.wordClass) w.wordClass.split(',').forEach(c => { const cl = c.trim().toLowerCase(); if (cl) merged.add(cl); });
        });
        return [...merged].sort();
    }, [lexicon]);

    const allAvailableTags = useMemo(() => {
        const merged = new Set();
        lexicon.forEach(w => { if (w.tags) w.tags.forEach(t => merged.add(t.toLowerCase())); });
        return [...merged].sort();
    }, [lexicon]);
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
                    label="Custom Alphabet Sort Order (Optional)"
                    placeholder="e.g., a, á, b, c, ch, d... (Comma separated)"
                    value={useConfigStore((state) => state.customAlphabet) || ''}
                    onChange={(e) => updateConfig({ customAlphabet: e.target.value })}
                />

                <Input
                    label="Syllable Pattern"
                    placeholder="e.g., CV, CVC, VCV..."
                    value={syllablePattern}
                    onChange={(e) => updateConfig({ syllablePattern: e.target.value })}
                    disabled={skipSyllableValidation}
                />

                {['alphabetic', 'abjad', 'abugida'].includes(phonologyTypes || 'alphabetic') && (
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

            {/* ─── VOWEL HARMONY SECTION ─── */}
            <Card>
                <h2 className="flex sg-title"><Music /> Vowel Harmony</h2>

                <Infobox title="Vowel Harmony">
                    Define which vowels group together into harmony sets. The engine validates words based on the selected mode:
                    <br /><br />
                    <b>Complete</b> — Every word must use vowels from a single set only.<br />
                    <b>Flexible</b> — Words should conform, but can be overridden for specific word classes or tags.<br />
                    <b>Optional</b> — Harmony status is shown inline; suggestions are made but never enforced.
                </Infobox>

                <div className="settings-section-wrapper">
                    <div className="harmony-mode-row">
                        <label className="form-label">Harmony Mode</label>
                        <select
                            className="harmony-mode-select"
                            value={vowelHarmonyMode}
                            onChange={(e) => updateConfig({ vowelHarmonyMode: e.target.value })}
                        >
                            {HARMONY_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="settings-section-wrapper">
                    <label className="form-label">Vowel Sets</label>
                    <p className="harmony-section-desc">
                        Name each set, enter its vowels, then add it. Repeat for each set.
                    </p>
                    <div className="harmony-add-row">
                        <div className="harmony-name-col">
                            <Input
                                label=""
                                placeholder="e.g., High"
                                value={harmonySetNameInput}
                                onChange={(e) => setHarmonySetNameInput(e.target.value)}
                            />
                        </div>
                        <div className="harmony-vowels-col">
                            <Input
                                label=""
                                placeholder="e.g., a, o, u"
                                value={harmonySetsInput}
                                onChange={(e) => setHarmonySetsInput(e.target.value)}
                            />
                        </div>
                        <Button className="harmony-add-btn" onClick={handleAddHarmonySet} variant="primary">Add Set</Button>
                    </div>
                    {normalizedHarmonySets.length > 0 ? (
                        <ul className="harmony-sets-list">
                            {normalizedHarmonySets.map((set, i) => (
                                <li key={i} className="harmony-set-item">
                                    <span className="harmony-set-info">
                                        {editingSetIndex === i ? (
                                            <>
                                                <input
                                                    type="text"
                                                    className="harmony-edit-input"
                                                    value={editingSetName}
                                                    onChange={(e) => setEditingSetName(e.target.value)}
                                                    autoFocus
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(i); if (e.key === 'Escape') handleCancelEdit(); }}
                                                />
                                                <button className="harmony-edit-confirm" onClick={() => handleSaveEdit(i)}>✓</button>
                                                <button className="harmony-edit-cancel" onClick={handleCancelEdit}>✗</button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="harmony-set-name">
                                                    {set.name}{set.neutral && set.name.toLowerCase() !== 'neutral' ? '' : ''}:
                                                </span>
                                                {set.neutral && <span className="harmony-set-neutral-badge">neutral</span>}
                                                <span className="harmony-set-vowels">[ {set.vowels.join(' | ')} ]</span>
                                            </>
                                        )}
                                    </span>
                                    <div className="harmony-set-actions">
                                        <label className="harmony-neutral-label">
                                            <input
                                                type="checkbox"
                                                checked={!!set.neutral}
                                                onChange={() => handleToggleNeutral(i)}
                                            />
                                            Neutral
                                        </label>
                                        {editingSetIndex !== i && (
                                            <button className="harmony-icon-btn" onClick={() => handleStartEdit(i)} title="Rename"><SquarePen size={14} /></button>
                                        )}
                                        <button className="harmony-icon-btn danger" onClick={() => handleRemoveHarmonySet(i)} title="Remove"><Trash2 size={14} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="harmony-empty-state">{getHarmonySetsDisplay()}</p>
                    )}
                </div>

                {vowelHarmonyMode === 'flexible' && (
                    <div className="settings-section-wrapper">
                        <p className="harmony-section-desc">
                            Select which word classes or tags are exempt from vowel harmony enforcement.
                        </p>
                        <MultiSelectDropdown
                            label="Override by Word Class"
                            options={allAvailableWordClasses}
                            selected={vowelHarmonyOverrideWordClasses}
                            onToggle={handleToggleOverrideWordClass}
                            placeholder="Select exempt word classes..."
                        />
                        <MultiSelectDropdown
                            label="Override by Semantic Tag"
                            options={allAvailableTags}
                            selected={vowelHarmonyOverrideTags}
                            onToggle={handleToggleOverrideTag}
                            placeholder="Select exempt tags..."
                            emptyMessage="No tags in your lexicon yet."
                        />
                    </div>
                )}
            </Card>



            <ProsodyRulesCard />

            <Card>
                <h2 className="flex sg-title"><Headphones /> Text-to-Speech (Azure)</h2>
                <Infobox title="SSML Phonetic Pronunciation">
                    The app uses Microsoft's Neural voices to read the exact <b>IPA</b> of your conlang instead of guessing the pronunciation from its spelling. Select the base accent for your language below.
                </Infobox>

                <div className="settings-section-wrapper" style={{ marginTop: '15px' }}>
                    <label className="form-label settings-label-block">Base Accent (Voice Model)</label>
                    <select
                        className="settings-select-full"
                        value={azureTtsVoice}
                        onChange={(e) => updateConfig({ azureTtsVoice: e.target.value })}
                    >
                        {AZURE_VOICES.map(voice => (
                            <option key={voice.value} value={voice.value}>{voice.label}</option>
                        ))}
                    </select>
                </div>
            </Card>

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
