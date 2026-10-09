import React, { useState, useMemo } from 'react';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';

import Button from '../../UI/Buttons/Buttons.jsx';
import applySoundChanges from '../../../utils/applysoundchanges.jsx';
import { VisualRuleBuilder } from './grammarMatrix/VisualRuleBuilder.jsx';
import ProsodyRulesCard from './ProsodyRulesCard.jsx';
import MultiSelectDropdown from '../../UI/MultiSelectDropdown/MultiSelectDropdown.jsx';
import { Info, AudioLines, Headphones, Music, Hourglass, Wand2, BookCheck, Eye, Trash2, SquarePen, Volume2, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../UI/Modal/Modal.jsx';
import { playTTS } from '../../../utils/azureTTS.js';
import './phonologyTab.css';

export default function PhonologyTab() {
    const { t } = useTranslation();
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

    // Multi-engine TTS & IPA Reader settings
    const rawTtsEngine = useConfigStore((state) => state.ttsEngine) || 'browser';
    const ttsEngine = ['browser', 'formant', 'human', 'kokoro', 'opentts', 'custom', 'azure'].includes(rawTtsEngine) ? rawTtsEngine : 'browser';
    const ttsVoice = useConfigStore((state) => state.ttsVoice) || '';
    const ttsSpeed = useConfigStore((state) => state.ttsSpeed) ?? 1.0;
    const formantF0 = useConfigStore((state) => state.formantF0) ?? 130;
    const kokoroUrl = useConfigStore((state) => state.kokoroUrl) || 'http://localhost:8880/v1/audio/speech';
    const kokoroVoice = useConfigStore((state) => state.kokoroVoice) || 'af_heart';
    const kokoroSpeed = useConfigStore((state) => state.kokoroSpeed) ?? 1.0;
    const kokoroSendIpa = useConfigStore((state) => state.kokoroSendIpa) ?? true;
    const openTtsUrl = useConfigStore((state) => state.openTtsUrl) || 'http://localhost:5500';
    const openTtsVoice = useConfigStore((state) => state.openTtsVoice) || 'espeak:en';
    const customTtsUrl = useConfigStore((state) => state.customTtsUrl) || '';
    const customTtsKey = useConfigStore((state) => state.customTtsKey) || '';
    const customTtsVoice = useConfigStore((state) => state.customTtsVoice) || '';
    const azureTtsVoice = useConfigStore((state) => state.azureTtsVoice) || 'ipa-default';
    const azureTtsKey = useConfigStore((state) => state.azureTtsKey) || '';
    const azureTtsRegion = useConfigStore((state) => state.azureTtsRegion) || 'brazilsouth';

    // Interactive pronunciation test state
    const [testWord, setTestWord] = useState('satewa');
    const [testIpa, setTestIpa] = useState('/sǎtēwà/');
    const [isTestingTts, setIsTestingTts] = useState(false);

    const handleTestTts = async () => {
        setIsTestingTts(true);
        try {
            await playTTS({
                text: testWord,
                ipa: testIpa,
                useIpa: true,
                engine: ttsEngine
            });
            toast.success("Playing pronunciation test");
        } catch (err) {
            toast.error("Test failed: " + (err.message || 'Check your settings'));
        } finally {
            setIsTestingTts(false);
        }
    };

    const vowelHarmonyMode = useConfigStore((state) => state.vowelHarmonyMode) || 'complete';
    const vowelHarmonySets = useConfigStore((state) => state.vowelHarmonySets) || [];
    const vowelHarmonyOverrideWordClasses = useConfigStore((state) => state.vowelHarmonyOverrideWordClasses) || [];
    const vowelHarmonyOverrideTags = useConfigStore((state) => state.vowelHarmonyOverrideTags) || [];
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const KOKORO_VOICES = [
        { value: 'af_heart', label: 'Heart (American Female - Warm & Expressive - Recommended)' },
        { value: 'af_bella', label: 'Bella (American Female - Crisp)' },
        { value: 'af_nicole', label: 'Nicole (American Female - Whispery)' },
        { value: 'af_sarah', label: 'Sarah (American Female - Bright)' },
        { value: 'af_sky', label: 'Sky (American Female - Soft)' },
        { value: 'am_adam', label: 'Adam (American Male - Clear narrator)' },
        { value: 'am_michael', label: 'Michael (American Male - Deep)' },
        { value: 'bf_emma', label: 'Emma (British Female - Standard)' },
        { value: 'bf_isabella', label: 'Isabella (British Female - Soft)' },
        { value: 'bm_george', label: 'George (British Male - Warm)' },
        { value: 'bm_lewis', label: 'Lewis (British Male - Resonant)' },
        { value: 'ef_dora', label: 'Dora (Spanish Female)' },
        { value: 'em_alex', label: 'Alex (Spanish Male)' },
        { value: 'ff_siwis', label: 'Siwis (French Female)' },
        { value: 'if_sara', label: 'Sara (Italian Female)' },
        { value: 'jf_alpha', label: 'Alpha (Japanese Female)' },
        { value: 'jm_kento', label: 'Kento (Japanese Male)' },
        { value: 'pf_dora', label: 'Dora (Portuguese Female)' },
        { value: 'pm_alex', label: 'Alex (Portuguese Male)' },
        { value: 'zf_xiaobei', label: 'Xiaobei (Mandarin Female)' }
    ];

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
        { value: 'complete', label: t('settings.phonology.harmonyModeComplete') },
        { value: 'flexible', label: t('settings.phonology.harmonyModeFlexible') },
        { value: 'optional', label: t('settings.phonology.harmonyModeOptional') },
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
        if (normalizedHarmonySets.length === 0) return t('settings.phonology.noSetsDefined');
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
            toast.success(`Applied rules to ${appliedCount} word${appliedCount !== 1 ? 's' : ''} in your lexicon.`);
        } else {
            toast('No changes were applied.');
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
                <h2 className="flex sg-title"><AudioLines /> {t('settings.phonology.soundsTitle')}</h2>

                <Infobox title={t('settings.phonology.guideTitle')}>
                    • <b>Basic Sounds:</b> Type your IPA phonemes separated by commas (e.g., <code>p, t, k, m, ṇ</code>).<br />
                    • <b>Custom Orthography (=):</b> If a sound is written differently in your romanization or native script, map it using the format <code>IPA=Text</code>. <br />
                    <i>Example:</i> If the sound /ʃ/ is written as '<b>თ</b>' and a trill /r/ as '<b>რ</b>', you should type: <code>ʃ=თ, r=რ</code>. This exact mapping is what allows the <b>Interactive Reader</b> and the <b>TTS Audio</b> to correctly pronounce your custom letters!
                </Infobox>

                <Input
                    label={t('settings.phonology.consonantsLabel')}
                    placeholder={t('settings.phonology.consonantsPlaceholder')}
                    value={consonants}
                    onChange={(e) => updateConfig({ consonants: e.target.value })}
                />

                <Input
                    label={t('settings.phonology.vowelsLabel')}
                    placeholder={t('settings.phonology.vowelsPlaceholder')}
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
                            label={t('settings.phonology.otherPhonemesLabel')}
                            placeholder={t('settings.phonology.otherPhonemesPlaceholder')}
                            value={otherPhonemes}
                            onChange={(e) => updateConfig({ otherPhonemes: e.target.value })}
                        />
                    </div>
                    <div className="phonology-fixed-width">
                        <Input
                            label={t('settings.phonology.mappingCharLabel')}
                            placeholder={t('settings.phonology.mappingCharPlaceholder')}
                            value={otherPhonemeMapping}
                            onChange={(e) => updateConfig({ otherPhonemeMapping: e.target.value })}
                        />
                    </div>
                </div>

                <Input
                    label={t('settings.phonology.customAlphabetLabel')}
                    placeholder={t('settings.phonology.customAlphabetPlaceholder')}
                    value={useConfigStore((state) => state.customAlphabet) || ''}
                    onChange={(e) => updateConfig({ customAlphabet: e.target.value })}
                />

                <Input
                    label={t('settings.phonology.syllablePatternLabel')}
                    placeholder={t('settings.phonology.syllablePatternPlaceholder')}
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
                        {t('settings.phonology.skipSyllableValidation')}
                    </label>
                )}

                {(phonologyTypes === 'syllabic' || phonologyTypes === 'featural_block') && (
                    <div className="settings-section-wrapper">
                        <label className="form-label settings-label-block">{t('settings.phonology.syllabificationAlgorithmLabel')}</label>
                        <Infobox title={t('settings.phonology.howSyllabificationWorks')}>
                            <span dangerouslySetInnerHTML={{ __html: t('settings.phonology.syllabGuideAmbiguous') }} />
                        </Infobox>
                        <select
                            className="settings-select-full"
                            value={syllabificationAlgorithm}
                            onChange={(e) => updateConfig({ syllabificationAlgorithm: e.target.value })}
                        >
                            <option value="ltr">{t('settings.phonology.syllabificationLtr')}</option>
                            <option value="rtl">{t('settings.phonology.syllabificationRtl')}</option>
                        </select>
                    </div>
                )}
            </Card>

            {/* ─── VOWEL HARMONY SECTION ─── */}
            <Card>
                <h2 className="flex sg-title"><Music /> {t('settings.phonology.harmonyTitle')}</h2>

                <Infobox title={t('settings.phonology.harmonyTitle')}>
                    {t('settings.phonology.harmonyGuideDesc')}
                    <br /><br />
                    <b>{t('settings.phonology.harmonyModeComplete').split('—')[0].trim()}</b> — {t('settings.phonology.harmonyModeComplete').split('—')[1]?.trim() || ''}<br />
                    <b>{t('settings.phonology.harmonyModeFlexible').split('—')[0].trim()}</b> — {t('settings.phonology.harmonyModeFlexible').split('—')[1]?.trim() || ''}<br />
                    <b>{t('settings.phonology.harmonyModeOptional').split('—')[0].trim()}</b> — {t('settings.phonology.harmonyModeOptional').split('—')[1]?.trim() || ''}
                </Infobox>

                <div className="settings-section-wrapper">
                    <div className="harmony-mode-row">
                        <label className="form-label">{t('settings.phonology.harmonyModeLabel')}</label>
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
                    <label className="form-label">{t('settings.phonology.vowelSetsLabel')}</label>
                    <p className="harmony-section-desc">
                        {t('settings.phonology.vowelSetsDesc')}
                    </p>
                    <div className="harmony-add-row">
                        <div className="harmony-name-col">
                            <Input
                                label=""
                                placeholder={t('settings.phonology.setNamePlaceholder')}
                                value={harmonySetNameInput}
                                onChange={(e) => setHarmonySetNameInput(e.target.value)}
                            />
                        </div>
                        <div className="harmony-vowels-col">
                            <Input
                                label=""
                                placeholder={t('settings.phonology.vowelsPlaceholder')}
                                value={harmonySetsInput}
                                onChange={(e) => setHarmonySetsInput(e.target.value)}
                            />
                        </div>
                        <Button className="harmony-add-btn" onClick={handleAddHarmonySet} variant="primary">{t('settings.phonology.addSetBtn')}</Button>
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
                                                {set.neutral && <span className="harmony-set-neutral-badge">{t('settings.phonology.neutralBadge')}</span>}
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
                                            {t('settings.phonology.neutralCheckbox')}
                                        </label>
                                        {editingSetIndex !== i && (
                                            <button className="harmony-icon-btn" onClick={() => handleStartEdit(i)} title={t('settings.phonology.renameTooltip')}><SquarePen size={14} /></button>
                                        )}
                                        <button className="harmony-icon-btn danger" onClick={() => handleRemoveHarmonySet(i)} title={t('settings.phonology.removeTooltip')}><Trash2 size={14} /></button>
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
                            {t('settings.phonology.exemptDesc')}
                        </p>
                        <MultiSelectDropdown
                            label={t('settings.phonology.overrideWordClass')}
                            options={allAvailableWordClasses}
                            selected={vowelHarmonyOverrideWordClasses}
                            onToggle={handleToggleOverrideWordClass}
                            placeholder={t('settings.phonology.selectExemptClasses')}
                        />
                        <MultiSelectDropdown
                            label={t('settings.phonology.overrideSemanticTag')}
                            options={allAvailableTags}
                            selected={vowelHarmonyOverrideTags}
                            onToggle={handleToggleOverrideTag}
                            placeholder={t('settings.phonology.selectExemptTags')}
                            emptyMessage={t('settings.phonology.noTagsYet')}
                        />
                    </div>
                )}
            </Card>



            <ProsodyRulesCard />

            <Card>
                <h2 className="flex sg-title"><Headphones /> {t('settings.phonology.ttsTitle')}</h2>
                <Infobox title={t('settings.phonology.ttsGuideTitle')}>
                    <span dangerouslySetInnerHTML={{ __html: t('settings.phonology.ttsGuideDesc') }} />
                </Infobox>

                {/* 1. Engine Selector */}
                <div className="settings-section-wrapper" style={{ marginTop: '15px' }}>
                    <label className="form-label settings-label-block">{t('settings.phonology.speechEngineProvider')}</label>
                    <select
                        className="settings-select-full"
                        value={ttsEngine}
                        onChange={(e) => updateConfig({ ttsEngine: e.target.value })}
                    >
                        <optgroup label={t('settings.phonology.ttsGroupInstant')}>
                            <option value="browser">{t('settings.phonology.ttsBrowser')}</option>
                            <option value="formant">{t('settings.phonology.ttsFormant')}</option>
                            <option value="human">{t('settings.phonology.ttsHuman')}</option>
                        </optgroup>
                        <optgroup label={t('settings.phonology.ttsGroupSelfHosted')}>
                            <option value="kokoro">{t('settings.phonology.ttsKokoro')}</option>
                            <option value="opentts">{t('settings.phonology.ttsOpenTts')}</option>
                            <option value="custom">{t('settings.phonology.ttsCustom')}</option>
                            <option value="azure">{t('settings.phonology.ttsAzure')}</option>
                        </optgroup>
                    </select>
                </div>

                {/* 2. Provider-Specific Configurations */}
                {ttsEngine === 'browser' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsBrowserTitle')}>
                            {t('settings.phonology.ttsBrowserDesc')}
                        </Infobox>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">{t('settings.phonology.ttsAccentLabel')}</label>
                            <select
                                className="settings-select-full"
                                value={azureTtsVoice}
                                onChange={(e) => updateConfig({ azureTtsVoice: e.target.value })}
                            >
                                {AZURE_VOICES.map(voice => (
                                    <option key={voice.value} value={voice.value}>{voice.label}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--tx3)', marginTop: '4px', display: 'block' }}>
                                Converts conlang IPA phonemes into natural speech using your device's native speech engine.
                            </small>
                        </div>
                    </div>
                )}

                {ttsEngine === 'formant' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsFormantTitle')}>
                            {t('settings.phonology.ttsFormantDesc')}
                        </Infobox>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">{t('settings.phonology.ttsPitchLabel', { f0: formantF0 })}</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    min="80"
                                    max="260"
                                    step="5"
                                    value={formantF0}
                                    onChange={(e) => updateConfig({ formantF0: Number(e.target.value) })}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ minWidth: '70px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--tx2)' }}>
                                    {formantF0 < 120 ? t('settings.phonology.ttsDeep') : formantF0 < 180 ? t('settings.phonology.ttsMid') : t('settings.phonology.ttsHigh')} ({formantF0}Hz)
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {ttsEngine === 'human' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsAudioBankTitle')}>
                            {t('settings.phonology.ttsAudioBankDesc')}
                        </Infobox>
                        <p style={{ fontSize: '0.88rem', color: 'var(--tx2)', margin: '4px 0 0' }}>
                            Zero installation required. Each IPA phoneme is vocalized using genuine human phonetician recordings.
                        </p>
                    </div>
                )}

                {ttsEngine === 'kokoro' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsKokoroTitle')}>
                            {t('settings.phonology.ttsKokoroDesc')}
                        </Infobox>
                        <div className="settings-section-wrapper">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="form-label settings-label-block" style={{ margin: 0 }}>Kokoro Server Endpoint</label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => updateConfig({ kokoroUrl: 'http://localhost:8880/v1/audio/speech' })}
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: kokoroUrl === 'http://localhost:8880/v1/audio/speech' ? 'var(--primary)' : 'var(--bg2)', color: 'var(--tx1)', cursor: 'pointer' }}
                                    >
                                        Local Docker
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (kokoroUrl === 'http://localhost:8880/v1/audio/speech') {
                                                updateConfig({ kokoroUrl: '' });
                                            }
                                        }}
                                        style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', background: kokoroUrl !== 'http://localhost:8880/v1/audio/speech' ? 'var(--primary)' : 'var(--bg2)', color: 'var(--tx1)', cursor: 'pointer' }}
                                    >
                                        Cloud / Remote URL
                                    </button>
                                </div>
                            </div>
                            <Input
                                type="text"
                                placeholder="http://localhost:8880/v1/audio/speech or https://my-kokoro-server/v1/audio/speech"
                                value={kokoroUrl}
                                onChange={(e) => updateConfig({ kokoroUrl: e.target.value })}
                            />
                            <small style={{ color: 'var(--tx3)', marginTop: '4px', display: 'block' }}>
                                Use your local Docker instance (localhost:8880) or point to any OpenAI-compatible speech endpoint in the cloud.
                            </small>
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Neural Voice</label>
                            <select
                                className="settings-select-full"
                                value={kokoroVoice}
                                onChange={(e) => updateConfig({ kokoroVoice: e.target.value })}
                            >
                                {KOKORO_VOICES.map(voice => (
                                    <option key={voice.value} value={voice.value}>{voice.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">{t('settings.phonology.ttsSpeedLabel', { speed: kokoroSpeed })}</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.75"
                                    step="0.05"
                                    value={kokoroSpeed}
                                    onChange={(e) => updateConfig({ kokoroSpeed: Number(e.target.value) })}
                                    style={{ flex: 1 }}
                                />
                                <span style={{ minWidth: '50px', textAlign: 'right', fontSize: '0.85rem', color: 'var(--tx2)' }}>
                                    {kokoroSpeed}x
                                </span>
                            </div>
                        </div>
                        <div className="settings-section-wrapper">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                                <input
                                    type="checkbox"
                                    checked={kokoroSendIpa}
                                    onChange={(e) => updateConfig({ kokoroSendIpa: e.target.checked })}
                                />
                                <span>Send direct IPA symbols to Kokoro phonetic tokenizer</span>
                            </label>
                            <small style={{ color: 'var(--tx3)', marginTop: '4px', display: 'block', marginLeft: '24px' }}>
                                Feeds clean IPA phonemes straight into Kokoro, bypassing English orthography bias.
                            </small>
                        </div>
                    </div>
                )}

                {ttsEngine === 'opentts' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsEspeakTitle')}>
                            {t('settings.phonology.ttsEspeakDesc')}
                        </Infobox>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">OpenTTS Server URL</label>
                            <Input
                                type="text"
                                placeholder="e.g. http://localhost:5500"
                                value={openTtsUrl}
                                onChange={(e) => updateConfig({ openTtsUrl: e.target.value })}
                            />
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Voice ID</label>
                            <Input
                                type="text"
                                placeholder="e.g. espeak:en, espeak:fr, piper:en_US-lessac-medium"
                                value={openTtsVoice}
                                onChange={(e) => updateConfig({ openTtsVoice: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {ttsEngine === 'custom' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Infobox title={t('settings.phonology.ttsCustomApiTitle')}>
                            {t('settings.phonology.ttsCustomApiDesc')}
                        </Infobox>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Endpoint URL</label>
                            <Input
                                type="text"
                                placeholder="e.g. http://localhost:8880/v1/audio/speech"
                                value={customTtsUrl}
                                onChange={(e) => updateConfig({ customTtsUrl: e.target.value })}
                            />
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Voice / Model Name</label>
                            <Input
                                type="text"
                                placeholder="e.g. alloy, kokoro, piper"
                                value={customTtsVoice}
                                onChange={(e) => updateConfig({ customTtsVoice: e.target.value })}
                            />
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">API Key / Token (Optional)</label>
                            <Input
                                type="password"
                                placeholder="Bearer token (if required by your server)"
                                value={customTtsKey}
                                onChange={(e) => updateConfig({ customTtsKey: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {ttsEngine === 'azure' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Neural Voice Model</label>
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
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Azure Speech Key</label>
                            <Input
                                type="password"
                                placeholder="Paste your Azure Speech subscription key"
                                value={azureTtsKey}
                                onChange={(e) => updateConfig({ azureTtsKey: e.target.value })}
                            />
                        </div>
                        <div className="settings-section-wrapper">
                            <label className="form-label settings-label-block">Azure Region</label>
                            <Input
                                type="text"
                                placeholder="e.g. brazilsouth, eastus, westeurope"
                                value={azureTtsRegion}
                                onChange={(e) => updateConfig({ azureTtsRegion: e.target.value })}
                            />
                        </div>
                    </div>
                )}

                {/* 3. Interactive Test Pronunciation Widget */}
                <div style={{ marginTop: '20px', padding: '14px', borderRadius: '8px', background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Volume2 size={16} /> {t('settings.phonology.ttsTestTitle')}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>
                            {t('settings.phonology.ttsActiveEngine')} <strong style={{ color: 'var(--accent)' }}>{ttsEngine}</strong>
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>{t('settings.phonology.ttsSampleWord')}</label>
                            <Input
                                type="text"
                                value={testWord}
                                onChange={(e) => setTestWord(e.target.value)}
                                placeholder="Word"
                            />
                        </div>
                        <div>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px', display: 'block' }}>{t('settings.phonology.ttsSampleIpa')}</label>
                            <Input
                                type="text"
                                value={testIpa}
                                onChange={(e) => setTestIpa(e.target.value)}
                                placeholder="/IPA/"
                            />
                        </div>
                        <Button
                            variant="imp"
                            onClick={handleTestTts}
                            disabled={isTestingTts}
                            style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Hear pronunciation"
                        >
                            <Play size={15} /> {isTestingTts ? t('settings.phonology.ttsPlayingBtn') : t('settings.phonology.ttsTestBtn')}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="flex sg-title"><Hourglass /> {t('settings.phonology.soundChangerTitle')}</h2>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <p className="settings-description" style={{ margin: 0 }}>
                        {t('settings.phonology.soundChangerDesc')}
                    </p>
                    <Button
                        variant="edit"
                        onClick={() => setIsBuilderOpen(true)}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.4rem' }}
                    >
                        <Wand2 size={14} /> {t('settings.phonology.ruleBuilderBtn')}
                    </Button>
                </div>

                <Infobox title={t('settings.phonology.viewGuideTitle')}>
                    <b>{t('settings.phonology.guideBasicReplacement')}</b><br />
                    <span>p =&gt; b</span> ({t('settings.phonology.guideTurnsPtoB')})<br />
                    <span>ch =&gt; თ</span> ({t('settings.phonology.guideReplacesDigraphs')})<br /><br />

                    <b>{t('settings.phonology.guideContextual')}</b><br />
                    <span>k(?=[ie]) =&gt; tS</span> ({t('settings.phonology.guideKtoTS')})<br />
                    <span>(?&lt;=[aeiou])s =&gt; z</span> ({t('settings.phonology.guideStoZ')})<br /><br />

                    <b>{t('settings.phonology.guidePositional')}</b><br />
                    <span>^a =&gt; e</span> ({t('settings.phonology.guideStartWord')})<br />
                    <span>m$ =&gt; n</span> ({t('settings.phonology.guideEndWord')})<br /><br />

                    <b>{t('settings.phonology.guideAdvancedRedup')}</b><br />
                    <span>^(.{2})(.*) =&gt; $1$1$2</span> ({t('settings.phonology.guideDuplicatesLetters')})
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
                        <BookCheck size={16} /> {t('settings.phonology.applyToLexiconBtn')}
                    </Button>
                </div>

                <div className="preview-container">
                    <label className="preview-label">{t('settings.phonology.testRulesLabel')}</label>

                    <div className="preview-input-group">
                        <input
                            type="text"
                            className="preview-input"
                            placeholder={t('settings.phonology.testWordsPlaceholder')}
                            value={testWords}
                            onChange={(e) => setTestWords(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
                        />

                        <Button variant="edit" onClick={handlePreview}>
                            <Eye size={18} /> {t('settings.phonology.previewBtn')}
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
                title={t('settings.phonology.reviewModalTitle')}
            >
                <div className="historical-review-modal">
                    <p className="historical-review-desc">
                        {t('settings.phonology.reviewModalDesc')}
                    </p>

                    {pendingChanges && (
                        <>
                            <div className="historical-review-actions">
                                <Button variant="edit" onClick={() => setAllPendingChanges(true)}>{t('settings.phonology.selectAll')}</Button>
                                <Button variant="edit" onClick={() => setAllPendingChanges(false)}>{t('settings.phonology.deselectAll')}</Button>
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
                                                        {change.tags.map(tTag => `#${tTag}`).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="historical-review-footer">
                                <Button variant="error" onClick={handleConfirmSelectedChanges}>
                                    {t('settings.phonology.applySelectedCount', { count: pendingChanges.filter(c => c.selected).length })}
                                </Button>
                                <Button variant="edit" onClick={() => {
                                    setIsReviewModalOpen(false);
                                    setPendingChanges(null);
                                }}>
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
