import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { generateIpaFromWord } from '../../../utils/ipaGenerator.js';
import { fetchSynonymOptions, fetchDefinitionOptions } from '../../../utils/semanticUtils.js';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import DefinitionSelectModal from '../../UI/Modal/DefinitionSelectModal.jsx';
import { Search, Volume2, Save, Trash2, X, Link as LinkIcon, GitBranch, Plus, Wand2, Mic, Square, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import ToneStressSelector from './ToneStressSelector.jsx';
import './lexiconEditModal.css';

// Standard POS options
const STANDARD_WORD_CLASSES = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'particle', 'conjunction', 'preposition'
];

const layouts = {
    '1center': { name: '1 Center (Full)', slots: 1 },
    '2top1bottom': { name: '2 Top, 1 Bottom', slots: 3 },
    '1top2bottom': { name: '1 Top, 2 Bottom', slots: 3 },
    '1left2right': { name: '1 Left, 2 Right', slots: 3 },
    '2left1right': { name: '2 Left, 1 Right', slots: 3 },
    '3horizontal': { name: '3 Horizontal', slots: 3 },
    '3vertical': { name: '3 Vertical', slots: 3 },
    '2horizontal': { name: '2 Horizontal', slots: 2 },
    '2vertical': { name: '2 Vertical', slots: 2 },
    '1outside1inside': { name: '1 Outside, 1 Inside', slots: 2 },
    '1inside1outside': { name: '1 Inside, 1 Outside', slots: 2 },
    '2x2grid': { name: '2x2 Grid', slots: 4 }
};

export default function LexiconEditModal({ wordObj, onClose, mode = 'edit' }) {
    // Grab our global lexicon tools
    const updateWord = useLexiconStore((state) => state.updateWord);
    const addWord = useLexiconStore((state) => state.addWord);
    const lexicon = useLexiconStore((state) => state.lexicon);
    const addCustomWordClass = useConfigStore((state) => state.addCustomWordClass);
    const addCustomTag = useConfigStore((state) => state.addCustomTag);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const phonologyTypes = useConfigStore(state => state.phonologyTypes);
    const grammarRules = useConfigStore(state => state.grammarRules);
    const vowels = useConfigStore(state => state.vowels);
    const consonants = useConfigStore(state => state.consonants);
    const syllablePattern = useConfigStore(state => state.syllablePattern);
    const customWordClasses = useConfigStore((state) => state.customWordClasses) || [];
    const customTags = useConfigStore((state) => state.customTags) || [];
    const vowelHarmonySets = useConfigStore(state => state.vowelHarmonySets) || [];
    const vowelHarmonyMode = useConfigStore((state) => state.vowelHarmonyMode) || 'complete';
    const vowelHarmonyOverrideWordClasses = useConfigStore((state) => state.vowelHarmonyOverrideWordClasses) || [];
    const vowelHarmonyOverrideTags = useConfigStore((state) => state.vowelHarmonyOverrideTags) || [];
    const ipaMappingRules = useConfigStore((state) => state.ipaMappingRules) || '';
    const otherPhonemes = useConfigStore(state => state.otherPhonemes);
    const blockTemplates = useConfigStore(state => state.blockTemplates);
    const blockSettings = useConfigStore(state => state.blockSettings);
    const syllabaryMap = useConfigStore(state => state.syllabaryMap) || {};
    const scriptSystems = useConfigStore(state => state.scriptSystems) || [];
    const setWordScriptOverride = useLexiconStore((state) => state.setWordScriptOverride);

    const [activeField, setActiveField] = useState('word');
    
    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Bundle all the form fields into one neat state object
    const [formData, setFormData] = useState({
        word: '', ipa: '', wordClass: '', translation: '', definition: '', tags: [], relatedWords: [], ideogram: '', personCategory: '', tone: '', stress: '', scriptOverride: null, customAudioBase64: null
    });
    const [tagInput, setTagInput] = useState('');
    const [relatedInput, setRelatedInput] = useState('');
    const [isFetchingRelated, setIsFetchingRelated] = useState(false);
    const { word, ipa, wordClass, translation, tags, relatedWords, ideogram, personCategory, tone, stress, customAudioBase64 } = formData;

    const parentWord = useMemo(() => {
        if (!wordObj.parentRootId) return null;
        return lexicon.find(w => w.id === wordObj.parentRootId);
    }, [wordObj.parentRootId, lexicon]);

    const derivationRule = useMemo(() => {
        if (!wordObj.derivationRuleId) return null;
        return grammarRules.find(r => r.id === wordObj.derivationRuleId);
    }, [wordObj.derivationRuleId, grammarRules]);

    const { transliterate, normalizeToBase } = useTransliterator();

    const harmonyStatus = useMemo(() => {
        if (!word.trim() || !vowelHarmonySets || vowelHarmonySets.length === 0) return null;
        const validation = validateNewWord(normalizeToBase(word.trim()), useConfigStore.getState());
        return validation.harmonyResult || null;
    }, [word, vowelHarmonySets, normalizeToBase]);

    const isHarmonyOverridden = useMemo(() => {
        if (!harmonyStatus || harmonyStatus.conforms) return false;
        const classes = (wordClass || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
        const overriddenByClass = classes.some(c => vowelHarmonyOverrideWordClasses.includes(c));
        const overriddenByTag = (tags || []).some(t => vowelHarmonyOverrideTags.includes(t));
        return overriddenByClass || overriddenByTag;
    }, [wordClass, tags, vowelHarmonyOverrideWordClasses, vowelHarmonyOverrideTags, harmonyStatus]);

    const possibleBlockStructures = useMemo(() => {
        if (phonologyTypes !== 'featural_block' || !word || !syllabaryMap) return [];
        const safeBaseWord = normalizeToBase(word.trim()).toLowerCase();
        if (!safeBaseWord) return [];

        const activeTemplates = blockTemplates || (blockSettings ? [
            {
                id: 'legacy',
                maxChars: blockSettings.maxChars || 3,
                layoutTemplate: blockSettings.layoutTemplate || '2top1bottom',
                slotMapping: blockSettings.slotMapping || []
            }
        ] : [
            {
                id: 'default',
                maxChars: 3,
                layoutTemplate: '2top1bottom',
                slotMapping: [{label:'Initial', source:'consonants'}, {label:'Vowel', source:'vowels'}, {label:'Final', source:'consonants'}]
            }
        ]);

        const parseList = (str) => (str || '').split(',')
            .map(s => {
                let clean = s.trim().toLowerCase();
                if (clean.includes('=')) clean = clean.split('=')[0].trim();
                return clean;
            })
            .filter(Boolean);

        const consList = ["", ...parseList(consonants)];
        const vowList = parseList(vowels);
        const otherList = parseList(otherPhonemes);

        const isValidBlock = (part) => {
            if (syllabaryMap[part]) return true; // Already compiled
            
            // Check if it perfectly matches an active template's slot mapping
            for (const template of activeTemplates) {
                if (part.length !== (template.maxChars || 3)) continue;
                
                let matches = true;
                for (let i = 0; i < part.length; i++) {
                    const char = part[i];
                    let slot = (template.slotMapping || [])[i];
                    let source;
                    if (typeof slot === 'string') {
                        source = i === 1 ? 'vowels' : 'consonants';
                    } else if (slot && slot.source) {
                        source = slot.source;
                    } else {
                        source = i === 1 ? 'vowels' : 'consonants';
                    }
                    
                    if (source === 'vowels' && !vowList.includes(char)) { matches = false; break; }
                    if (source === 'consonants' && !consList.includes(char)) { matches = false; break; }
                    if (source === 'otherPhonemes' && !otherList.includes(char)) { matches = false; break; }
                }
                if (matches) return true;
            }
            return false;
        };

        const results = [];
        let iterations = 0;
        
        const search = (currentIdx, currentPath) => {
            if (results.length >= 50 || iterations++ > 5000) return true; // Signal to abort immediately
            
            if (currentIdx === safeBaseWord.length) {
                results.push(currentPath.join('.'));
                return results.length >= 50;
            }
            
            // Search longest chunks first so greedy matches appear at the top
            for (let len = safeBaseWord.length - currentIdx; len >= 1; len--) {
                const part = safeBaseWord.substring(currentIdx, currentIdx + len);
                if (isValidBlock(part)) {
                    const shouldAbort = search(currentIdx + len, [...currentPath, part]);
                    if (shouldAbort) return true;
                }
            }
            return false;
        };
        search(0, []);
        
        return results;
    }, [word, phonologyTypes, syllabaryMap, normalizeToBase, blockTemplates, blockSettings, consonants, vowels, otherPhonemes]);

    const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    // Build merged POS list
    const allWordClasses = useMemo(() => {
        const merged = new Set([...STANDARD_WORD_CLASSES]);
        customWordClasses.forEach(cls => merged.add(cls));
        lexicon.forEach(w => {
            if (w.wordClass) {
                w.wordClass.split(',').forEach(cls => {
                    const clean = cls.trim().toLowerCase();
                    if (clean) merged.add(clean);
                });
            }
        });
        return [...merged].sort();
    }, [customWordClasses, lexicon]);

    // Build merged tags list
    const allTags = useMemo(() => {
        const merged = new Set(customTags);
        lexicon.forEach(w => {
            if (w.tags) w.tags.forEach(tag => merged.add(tag.toLowerCase()));
        });
        return [...merged].sort();
    }, [customTags, lexicon]);

    // Whenever the user clicks edit on a word, immediately populate the form with its current data
    useEffect(() => {
        if (wordObj) {
            setFormData({
                word: wordObj.word || '',
                ipa: wordObj.ipa || '',
                wordClass: wordObj.wordClass || '',
                translation: wordObj.translation || '',
                definition: wordObj.definition || '',
                tags: Array.isArray(wordObj.tags) ? wordObj.tags : (typeof wordObj.tags === 'string' ? wordObj.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                relatedWords: Array.isArray(wordObj.relatedWords) ? wordObj.relatedWords : [],
                ideogram: wordObj.ideogram || '',
                personCategory: wordObj.personCategory || '',
                tone: wordObj.tone || '',
                stress: wordObj.stress || '',
                scriptOverride: wordObj.scriptOverride || null,
                customAudioBase64: wordObj.customAudioBase64 || null
            });
        }
        return () => toast.dismiss();
    }, [wordObj]);

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        updateField(activeField, formData[activeField] + char);
    };

    // Quick-fix: add invalid characters to consonants or vowels
    const handleAddCharsToInventory = (chars, type) => {
        const currentList = type === 'consonants' ? consonants : vowels;
        const arr = currentList.trim() ? currentList.trim().split(',').map(s => s.trim()) : [];
        chars.forEach(ch => {
            if (!arr.includes(ch)) arr.push(ch);
        });
        updateConfig({ [type]: arr.join(', ') });
        toast.success(`Added "${chars.join(', ')}" to ${type}.`);
    };

    // Quick-fix: add detected pattern to syllable patterns
    const handleAddPattern = (pattern, safeWord, cleanInputTrans, processedTags) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);
        doSave(safeWord, cleanInputTrans, processedTags);
    };

    const handleAddTag = (tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (!cleanTag) return;
        if (!formData.tags.includes(cleanTag)) {
            updateField('tags', [...formData.tags, cleanTag]);
        }
        setTagInput('');
    };

    const handleClearTags = () => {
        updateField('tags', []);
        setTagInput('');
    };

    const removeTag = (tagToRemove) => {
        updateField('tags', formData.tags.filter(t => t !== tagToRemove));
    };

    const handleAddRelated = (rWord) => {
        const cleanRelated = rWord.trim().toLowerCase();
        if (!cleanRelated) return;
        if (!formData.relatedWords.includes(cleanRelated)) {
            updateField('relatedWords', [...formData.relatedWords, cleanRelated]);
        }
        setRelatedInput('');
    };

    const removeRelated = (rToRemove) => {
        updateField('relatedWords', formData.relatedWords.filter(r => r !== rToRemove));
    };

    const [isFetchingDefinition, setIsFetchingDefinition] = useState(false);
    const [isDefModalOpen, setIsDefModalOpen] = useState(false);
    const [defOptions, setDefOptions] = useState([]);

    const autoSuggestDefinition = async () => {
        if (!translation) return toast.error("Please enter a short translation first.");
        setIsFetchingDefinition(true);
        setDefOptions([]);
        setIsDefModalOpen(true);
        try {
            const options = await fetchDefinitionOptions(translation);
            if (options && options.length > 0) {
                setDefOptions(options);
            } else {
                toast('No definition found for this word.', { icon: '💡' });
            }
        } catch {
            toast.error('Failed to fetch definition.');
        } finally {
            setIsFetchingDefinition(false);
        }
    };

    const autoSuggestRelated = async () => {
        if (!translation) return toast.error("Please enter a short translation first.");
        setIsFetchingRelated(true);
        try {
            const results = await fetchSynonymOptions(translation);
            if (results && results.length > 0) {
                const newWords = results.map(r => r.lemma.toLowerCase()).filter(l => !formData.relatedWords.includes(l));
                // Just take top 8 to avoid clutter
                const topPicks = [...new Set(newWords)].slice(0, 8);
                if (topPicks.length > 0) {
                    updateField('relatedWords', [...formData.relatedWords, ...topPicks]);
                    toast.success(`Found ${topPicks.length} related words!`);
                } else {
                    toast("No new related words found.", { icon: '💡' });
                }
            } else {
                toast("No related words found for this concept.", { icon: '💡' });
            }
        } catch {
            toast.error("Failed to fetch related words.");
        } finally {
            setIsFetchingRelated(false);
        }
    };

    const showValidationToast = (content) => {
        toast.custom(content, { duration: Infinity, id: 'validation-toast' });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const base64data = reader.result;
                    updateField('customAudioBase64', base64data);
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            toast.error("Could not access microphone. Check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const playCustomAudio = () => {
        if (customAudioBase64) {
            const audio = new Audio(customAudioBase64);
            audio.play();
        }
    };

    const doSave = (sWord, cTrans, pTags) => {
        updateWord(wordObj.id, {
            word: sWord,
            ipa: ipa.trim(),
            wordClass: wordClass.trim(),
            translation: cTrans,
            definition: formData.definition.trim(),
            tags: pTags,
            relatedWords: formData.relatedWords || [],
            ideogram: ideogram.trim(),
            personCategory: personCategory.trim(),
            tone: tone.trim(),
            stress: stress.trim(),
            scriptOverride: formData.scriptOverride,
            customAudioBase64: customAudioBase64
        });

        if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.trim().toLowerCase())) {
            addCustomWordClass(wordClass);
        }
        pTags.forEach(tag => addCustomTag(tag));

        toast.success("Word updated successfully!");
        onClose();
    };

    const doSaveNew = (sWord, cTrans, pTags) => {
        addWord({
            word: sWord,
            ipa: ipa.trim(),
            wordClass: wordClass.trim(),
            translation: cTrans,
            definition: formData.definition.trim(),
            tags: pTags,
            relatedWords: formData.relatedWords || [],
            ideogram: ideogram.trim(),
            personCategory: personCategory.trim(),
            tone: tone.trim(),
            stress: stress.trim(),
            customAudioBase64: customAudioBase64
        });

        if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.trim().toLowerCase())) {
            addCustomWordClass(wordClass);
        }
        pTags.forEach(tag => addCustomTag(tag));

        toast.success("New definition added!");
        onClose();
    };

    // Validate everything before saving changes to the lexicon
    const handleSave = () => {
        const cleanInputWord = word.trim();
        const cleanInputTrans = translation.trim();

        if (!cleanInputWord || !cleanInputTrans) return toast.error("Please fill in both the word and the translation.");

        const safeWord = normalizeToBase(cleanInputWord);
        const processedTags = [...formData.tags].sort();
        const saveFn = mode === 'addSense' ? doSaveNew : doSave;

        // In addSense mode, skip duplicate-word check (we intentionally want the same word)
        if (mode === 'addSense') {
            // Only check for duplicate translation
            const safeLowerTrans = cleanInputTrans.toLowerCase();
            const isDuplicateTranslation = lexicon.some(entry =>
                entry.translation.toLowerCase() === safeLowerTrans
            );

            if (isDuplicateTranslation) {
                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong>⚠️ Duplicate Translation</strong>
                        <span>This translation already exists in another entry. Save anyway?</span>
                        <div className="toast-actions-v">
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                proceedToHarmonyValidation(safeWord, cleanInputTrans, processedTags, () => saveFn(safeWord, cleanInputTrans, processedTags));
                            }} className="btn-v btn-err-v">Save Anyway</button>
                            <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                        </div>
                    </div>
                ));
                return;
            }

            proceedToHarmonyValidation(safeWord, cleanInputTrans, processedTags, () => saveFn(safeWord, cleanInputTrans, processedTags));
            return;
        }

        // Edit mode - full duplicate checking
        const safeLowerWord = safeWord.toLowerCase();
        const safeLowerTrans = cleanInputTrans.toLowerCase();

        const { isDuplicateWord, isDuplicateTranslation } = lexicon.reduce((acc, entry) => {
            if (entry.id === wordObj.id) return acc;
            const dbWord = entry.word.replace(/\*/g, '').toLowerCase();
            const dbTrans = entry.translation.toLowerCase();
            if (dbWord === safeLowerWord) acc.isDuplicateWord = true;
            if (dbTrans === safeLowerTrans) acc.isDuplicateTranslation = true;
            return acc;
        }, { isDuplicateWord: false, isDuplicateTranslation: false });

        if (isDuplicateWord || isDuplicateTranslation) {
            if (useConfigStore.getState().suppressDuplicateWarnings) {
                return proceedToHarmonyValidation(safeWord, cleanInputTrans, processedTags, () => saveFn(safeWord, cleanInputTrans, processedTags));
            }

            let warningMsg = "";
            if (isDuplicateWord && isDuplicateTranslation) {
                warningMsg = "This exact word and translation already exist in another lexicon entry.";
            } else if (isDuplicateWord) {
                warningMsg = "This word already exists in another entry (Homonym). Save anyway?";
            } else {
                warningMsg = "This translation already exists in another entry (Synonym). Save anyway?";
            }

            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Duplicate Detected</strong>
                    <span>{warningMsg}</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            proceedToHarmonyValidation(safeWord, cleanInputTrans, processedTags, () => saveFn(safeWord, cleanInputTrans, processedTags));
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToHarmonyValidation(safeWord, cleanInputTrans, processedTags, () => saveFn(safeWord, cleanInputTrans, processedTags));
    };

    const proceedToHarmonyValidation = (safeWord, cleanInputTrans, processedTags, doSave, charIndex = 0) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState(), wordClass, processedTags);

        const getSetName = (idx) => {
            const set = (vowelHarmonySets || [])[idx];
            if (set && set.name) return set.name;
            if (Array.isArray(set)) return `Set ${idx + 1}`;
            return `Set ${idx + 1}`;
        };

        // Engine enforces Complete (always) and Flexible (unless overridden).
        if (!validation.valid && validation.type === 'vowel_harmony') {
            const mixedNames = validation.harmonyResult.mixedSets.map(i => getSetName(i)).join(', ');
            const mode = vowelHarmonyMode || 'complete';

            // Complete mode = strict block, no save bypass
            if (mode === 'complete') {
                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong>⚠️ Vowel Harmony Violation</strong>
                        <span>Vowels [{validation.harmonyResult.foundVowels.join(', ')}] mix across harmony sets ({mixedNames}). Complete mode blocks all violations.</span>
                        <div className="toast-actions-v">
                            <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                        </div>
                    </div>
                ));
                return;
            }

            // Flexible mode = blocked unless user explicitly saves anyway
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Vowel Harmony (Not Exempted)</strong>
                    <span>Vowels [{validation.harmonyResult.foundVowels.join(', ')}] mix across harmony sets ({mixedNames}). This word class/tag is not in the exempt list.</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave, charIndex);
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        // Optional (or Flexible with override): show suggestion toast then proceed
        if (validation.harmonyResult && !validation.harmonyResult.conforms) {
            const mixedNames = validation.harmonyResult.mixedSets.map(i => getSetName(i)).join(', ');
            toast(`Vowel harmony suggestion: [${validation.harmonyResult.foundVowels.join(', ')}] mix sets (${mixedNames}).`, { icon: '💡', id: 'harmony-optional' });
        }

        proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave, charIndex);
    };

    const proceedToValidation = (safeWord, cleanInputTrans, processedTags, doSave, charIndex = 0) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState(), wordClass, processedTags);

        if (!validation.valid) {
            // Handle multiple invalid characters sequentially
            if (validation.type === 'invalid_chars') {
                const char = validation.invalidChars[charIndex];

                // If we've processed all individual characters, proceed to the final save
                if (!char) {
                    return doSave();
                }

                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong className="char-violation-title">⚠️ Character Violation: "{char}"</strong>
                        <span>The character "{char}" is not in your Phoneme settings. How should we handle it?</span>
                        <div className="toast-actions-v char-violation-actions">
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddCharsToInventory([char], 'consonants');
                                setTimeout(() => proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave, charIndex + 1), 100);
                            }} className="btn-v btn-acc-v">Add to Consonants</button>
                            
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddCharsToInventory([char], 'vowels');
                                setTimeout(() => proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave, charIndex + 1), 100);
                            }} className="btn-v btn-acc2-v">Add to Vowels</button>

                            <button onClick={() => {
                                toast.dismiss(t.id);
                                // Skip this character but keep going with the next one
                                setTimeout(() => proceedToValidation(safeWord, cleanInputTrans, processedTags, doSave, charIndex + 1), 100);
                            }} className="btn-v btn-err-v">Save as Irregular</button>
                            
                            <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                        </div>
                        <div className="char-violation-progress">
                            {validation.invalidChars.length > 1 && `(Character ${charIndex + 1} of ${validation.invalidChars.length})`}
                        </div>
                    </div>
                ));
                return;
            }

            // Vowel harmony — already handled in proceedToHarmonyValidation; user agreed.
            if (validation.type === 'vowel_harmony') {
                return doSave();
            }

            // Pattern validation
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p className="pattern-warning-p">Do you want to save it as an irregular exception anyway?</p>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            doSave();
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        
                        {validation.type === 'invalid_pattern' && validation.detectedPattern && (
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddPattern(validation.detectedPattern, safeWord, cleanInputTrans, processedTags);
                            }} className="btn-v btn-acc-v">Add as Syllable Pattern</button>
                        )}
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        doSave();
    };

    if (!wordObj) return null;

    return (
        <div className="edit-modal-container">

            <div className="edit-modal-grid">
                <div>
                    <Input
                        label="Word (Conlang)"
                        value={word}
                        onChange={(e) => updateField('word', e.target.value)}
                        onFocus={() => setActiveField('word')}
                        className="custom-font-text notranslate"
                    />
                    {harmonyStatus && !harmonyStatus.conforms && (
                        <div className="harmony-indicator" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: vowelHarmonyMode === 'complete' ? '#ef4444' : (vowelHarmonyMode === 'optional' ? 'var(--acc)' : (isHarmonyOverridden ? '#22c55e' : '#ef4444')) }}>●</span>
                            <span>
                                {vowelHarmonyMode === 'complete'
                                    ? `Vowel harmony violation: [${harmonyStatus.foundVowels.join(', ')}] mix sets`
                                    : vowelHarmonyMode === 'optional'
                                        ? `Vowel harmony suggestion: [${harmonyStatus.foundVowels.join(', ')}] mix sets`
                                        : isHarmonyOverridden
                                            ? `Vowel harmony violation: [${harmonyStatus.foundVowels.join(', ')}] — allowed due to overridden part of speech/tag`
                                            : `Vowel harmony violation: [${harmonyStatus.foundVowels.join(', ')}] mix sets`}
                            </span>
                        </div>
                    )}
                    {harmonyStatus && harmonyStatus.conforms && harmonyStatus.matchingSet >= 0 && (
                        <div className="harmony-indicator" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#22c55e' }}>●</span>
                            <span>
                                Conforms to vowel harmony set: <b>{harmonyStatus.matchingSetName || `Set ${harmonyStatus.matchingSet + 1}`}</b>
                                {harmonyStatus.neutralVowels?.length > 0 && ` (with neutral ${harmonyStatus.neutralVowels.join(', ')})`}
                            </span>
                        </div>
                    )}
                    {harmonyStatus && harmonyStatus.conforms && harmonyStatus.matchingSet < 0 && harmonyStatus.neutralVowels?.length > 0 && (
                        <div className="harmony-indicator" style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: '#22c55e' }}>●</span>
                            <span>All vowels neutral ({harmonyStatus.neutralVowels.join(', ')})</span>
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }}>
                    {ipaMappingRules && (
                        <button 
                            className="btn-link"
                            title="Auto-generate IPA from word using your mapping rules"
                            style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', zIndex: 10, padding: '2px' }}
                            onClick={() => {
                                if (word) {
                                    // Generate IPA based on the display text, not the raw phonemic input
                                    const displayWord = transliterate(word);
                                    const cleanWord = displayWord.replace(/[*\\-]/g, '');
                                    
                                    const result = generateIpaFromWord(cleanWord, ipaMappingRules);
                                    if (result.matched) {
                                        updateField('ipa', result.ipa);
                                        toast.success("Generated IPA");
                                    } else {
                                        toast.error("No rules matched this word.");
                                    }
                                } else {
                                    toast.error("Please enter a word first.");
                                }
                            }}
                        >
                            <Wand2 size={12} /> Auto
                        </button>
                    )}
                    <Input
                        label="IPA (Optional)"
                        value={ipa}
                        onChange={(e) => updateField('ipa', e.target.value)}
                        onFocus={() => setActiveField('ipa')}
                    />
                </div>

                <div>
                    <Input
                        label="Part of Speech"
                        value={wordClass}
                        onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                        list="edit-word-classes"
                    >
                        <button
                            className="clear-input-btn"
                            onClick={() => updateField('wordClass', '')}
                            title="Clear Part of Speech"
                        >
                            <X size={14} />
                        </button>
                    </Input>
                    <datalist id="edit-word-classes">
                        {allWordClasses.map(cls => (
                            <option key={cls} value={cls} />
                        ))}
                    </datalist>
                </div>
            </div>

            {phonologyTypes === 'logographic' && (
                <div>
                    <Input
                        label="Ideogram / Symbol"
                        value={ideogram}
                        onChange={(e) => updateField('ideogram', e.target.value)}
                        className="ideogram-edit-input notranslate custom-font-text"
                    />
                </div>
            )}

            {phonologyTypes === 'featural_block' && possibleBlockStructures.length > 0 && (
                <div className="block-picker-section" style={{ marginTop: '1rem', background: 'var(--bg2)', padding: '1rem', borderRadius: '8px' }}>
                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Visual Block Structure</label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '12px', lineHeight: '1.4' }}>
                        Choose how this word should be visually broken down into blocks. Select from the greedy-matched suggestions below, or manually type your own distribution using periods (e.g. <code>m.e.hak.iz</code>).
                    </p>

                    <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                value={ideogram || possibleBlockStructures[0]}
                                onChange={(e) => updateField('ideogram', e.target.value.toLowerCase())}
                                placeholder="Type custom structure..."
                            />
                        </div>
                        <div style={{ minWidth: '80px', textAlign: 'center', fontSize: '2.5rem', color: 'var(--acc)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', padding: '0 15px', background: 'var(--bg)' }} className="custom-font-text notranslate">
                            {transliterate(ideogram || possibleBlockStructures[0])}
                        </div>
                    </div>

                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '4px', borderTop: '1px solid var(--bd)', paddingTop: '15px' }}>
                        {possibleBlockStructures.map((struct, idx) => {
                            const isSelected = (ideogram || possibleBlockStructures[0]) === struct;
                            return (
                                <button
                                    key={struct}
                                    onClick={() => updateField('ideogram', struct)}
                                    className={`btn-v ${isSelected ? 'btn-acc-v' : 'btn-sec-v'}`}
                                    style={{ fontSize: '1.2rem', padding: '6px 16px', border: '1px solid var(--bd)' }}
                                    title={struct}
                                >
                                    <span className="custom-font-text notranslate">{transliterate(struct)}</span>
                                    <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--bg)' : 'var(--tx2)', marginTop: '4px', fontFamily: 'sans-serif', opacity: 0.8 }}>
                                        {struct.replace(/\./g, ' + ')}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '15px', padding: '10px', background: 'var(--bg)', borderRadius: 'var(--rad)' }}>
                        <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Layout Overrides</label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '12px' }}>
                            Override the layout for specific syllables in this word.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(ideogram || possibleBlockStructures[0] || '').split('.').map((blockWithOverride, bIdx) => {
                                if (!blockWithOverride) return null;
                                const parts = blockWithOverride.split(':');
                                const baseChunk = parts[0];
                                const currentOverride = parts[1] || '';
                                
                                const validLayouts = Object.entries(layouts).filter(([key, val]) => val.slots === baseChunk.length);
                                if (validLayouts.length <= 1) return null; // No point showing if only 1 layout exists
                                
                                return (
                                    <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', background: 'var(--bg2)' }}>
                                        <div className="custom-font-text notranslate" style={{ fontSize: '1.5rem', color: 'var(--acc)', minWidth: '40px', textAlign: 'center' }}>
                                            {transliterate(blockWithOverride)}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--tx2)', minWidth: '60px' }}>
                                            {baseChunk}
                                        </div>
                                        <select
                                            className="input-v"
                                            style={{ flex: 1, padding: '6px', fontSize: '0.9rem' }}
                                            value={currentOverride}
                                            onChange={(e) => {
                                                const newOverride = e.target.value;
                                                const currentIdeogram = ideogram || possibleBlockStructures[0] || '';
                                                const blocks = currentIdeogram.split('.');
                                                if (newOverride) {
                                                    blocks[bIdx] = `${baseChunk}:${newOverride}`;
                                                } else {
                                                    blocks[bIdx] = baseChunk;
                                                }
                                                updateField('ideogram', blocks.join('.'));
                                            }}
                                        >
                                            <option value="">Default for this pattern</option>
                                            {validLayouts.map(([key, val]) => (
                                                <option key={key} value={key}>{val.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="ipa-chart-status-wrap">
                <p className="ipa-chart-status">
                    IPA Chart pastes into: <strong className="ipa-active-field">{activeField === 'word' ? 'Word' : 'IPA'}</strong>
                </p>
                <IpaChart onSelect={handleIpaSelect} />
            </div>

            <div className="edit-modal-grid">
                <div>
                    <Input
                        label="Person Category (for pronouns)"
                        value={personCategory}
                        onChange={(e) => updateField('personCategory', e.target.value)}
                        list="person-cat-options"
                        placeholder="e.g. 1st, 2nd, 3rd"
                    />
                    <datalist id="person-cat-options">
                        <option value="1st" />
                        <option value="2nd" />
                        <option value="3rd" />
                        <option value="4th" />
                    </datalist>
                </div>
                {scriptSystems.length > 1 && (
                    <div>
                        <label className="form-label" style={{ marginBottom: '4px', display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--tx2)' }}>Script Override</label>
                        <select
                            className="select select-bordered w-full"
                            value={formData.scriptOverride || ''}
                            onChange={(e) => updateField('scriptOverride', e.target.value || null)}
                        >
                            <option value="">(Use rules / default)</option>
                            {scriptSystems.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <details className="tone-stress-details">
                <summary className="tone-stress-summary">
                    Tone & Stress Options
                </summary>
                <div className="tone-stress-content">
                    <ToneStressSelector
                        word={word}
                        tone={tone}
                        stress={stress}
                        onToneChange={(v) => updateField('tone', v)}
                        onStressChange={(v) => updateField('stress', v)}
                    />
                </div>
            </details>

            <div className="edit-modal-section audio-section" style={{ padding: '15px', background: 'var(--bg2)', borderRadius: 'var(--rad)', marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Volume2 size={16} /> Custom Pronunciation Audio
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {!isRecording ? (
                        <button className="btn-v btn-sec-v" onClick={startRecording} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                            <Mic size={16} /> Record Voice
                        </button>
                    ) : (
                        <button className="btn-v btn-err-v" onClick={stopRecording} style={{ display: 'flex', gap: '5px', alignItems: 'center', animation: 'pulse 1.5s infinite' }}>
                            <Square size={16} /> Stop Recording
                        </button>
                    )}
                    
                    {customAudioBase64 && !isRecording && (
                        <>
                            <button className="btn-v btn-acc-v" onClick={playCustomAudio} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                <Play size={16} /> Play
                            </button>
                            <button className="btn-v btn-err-v" onClick={() => updateField('customAudioBase64', null)} style={{ padding: '8px' }} title="Delete Recording">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
                {customAudioBase64 && !isRecording && <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--tx2)' }}>Custom audio saved. This will play instead of the Azure TTS.</div>}
            </div>

            <div>
            <div className="edit-modal-grid trans-def-grid">
                <div>
                    <Input
                        label="Short Translation"
                        value={translation}
                        onChange={(e) => updateField('translation', e.target.value)}
                    />
                </div>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Full Definition (Optional)</label>
                        <button className="btn-link" onClick={autoSuggestDefinition} disabled={isFetchingDefinition} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Wand2 size={12} /> {isFetchingDefinition ? 'Fetching...' : 'Auto-Fill'}
                        </button>
                    </div>
                    <Input
                        value={formData.definition}
                        onChange={(e) => updateField('definition', e.target.value)}
                    />
                </div>
            </div>
            </div>

            <div>
                <label className="form-label">Semantic Tags</label>
                <div className="tags-chip-container">
                    {formData.tags.map(tag => (
                        <span key={tag} className="tag-chip">
                            {tag}
                            <X size={12} onClick={() => removeTag(tag)} className="tag-remove-icon" />
                        </span>
                    ))}
                    <div className="tag-input-wrap">
                        <Input
                            placeholder={formData.tags.length === 0 ? "Add tags..." : ""}
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onInput={(e) => {
                                if (allTags.includes(e.target.value.toLowerCase())) {
                                    handleAddTag(e.target.value);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    handleAddTag(tagInput);
                                }
                            }}
                            onBlur={() => handleAddTag(tagInput)}
                            list="edit-semantic-tags"
                            className="tag-input-field"
                        >
                            {tagInput && (
                                <button
                                    className="clear-input-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTagInput('');
                                    }}
                                    title="Clear Tag Input"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </Input>
                        <Plus size={16} className="tag-add-icon" onClick={() => handleAddTag(tagInput)} />
                    </div>
                </div>
                <datalist id="edit-semantic-tags">
                    {allTags.map(tag => (
                        <option key={tag} value={tag} />
                    ))}
                </datalist>

                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Related Words</label>
                        <button className="btn-link" onClick={autoSuggestRelated} disabled={isFetchingRelated} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Wand2 size={12} /> {isFetchingRelated ? 'Searching...' : 'Auto-Suggest'}
                        </button>
                    </div>
                    <div className="tags-chip-container">
                        {formData.relatedWords.map(rw => (
                            <span key={rw} className="tag-chip" style={{ background: 'var(--s3)', borderColor: 'var(--s4)' }}>
                                {rw}
                                <X size={12} onClick={() => removeRelated(rw)} className="tag-remove-icon" />
                            </span>
                        ))}
                        <div className="tag-input-wrap">
                            <Input
                                placeholder={formData.relatedWords.length === 0 ? "Add related concept (e.g. water, ocean)..." : ""}
                                value={relatedInput}
                                onChange={(e) => setRelatedInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        handleAddRelated(relatedInput);
                                    }
                                }}
                                onBlur={() => handleAddRelated(relatedInput)}
                                className="tag-input-field"
                            />
                            <Plus size={16} className="tag-add-icon" onClick={() => handleAddRelated(relatedInput)} />
                        </div>
                    </div>
                </div>

                {/* Etymology & Genealogy Section */}
                {(parentWord || derivationRule) && (
                    <div className="edit-modal-section etymology-section">
                        <div className="etymology-header">
                            <GitBranch size={16} />
                            <span className="etymology-title">Etymology & Genealogy</span>
                        </div>
                        <div className="etymology-content">
                            {parentWord && (
                                <div className="etymology-row">
                                    <span className="etymology-label">Derived from:</span>
                                    <div className="etymology-value">
                                        <span className="custom-font-text notranslate etymology-parent-word">{transliterate(parentWord.word)}</span>
                                        <span className="etymology-parent-trans">({parentWord.translation})</span>
                                    </div>
                                </div>
                            )}
                            {derivationRule && (
                                <div className="etymology-row">
                                    <span className="etymology-label">Grammar Rule:</span>
                                    <span className="etymology-rule-badge">
                                        {derivationRule.name} ({derivationRule.affix})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Button
                variant="save"
                className="edit-modal-save-btn"
                onClick={handleSave}
            >
                <Save size={18} /> Save Changes
            </Button>

            <DefinitionSelectModal
                isOpen={isDefModalOpen}
                onClose={() => setIsDefModalOpen(false)}
                translation={translation}
                wordClass={wordClass}
                definitions={defOptions}
                isLoading={isFetchingDefinition}
                onSelectDefinition={(selectedDef) => {
                    updateField('definition', selectedDef);
                    toast.success('Definition updated!');
                }}
            />
        </div>
    );
}
