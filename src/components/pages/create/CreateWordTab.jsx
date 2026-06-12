import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../UI/Card/Card.jsx';
import Input from '../../UI/Input/Input.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import { Sparkles, AlertTriangle, Save, Brush, X, Plus, Wand2 } from 'lucide-react';
import { applyRuleToWord } from '../../../utils/morphologyEngine.jsx';
import { useTransliterator } from '../../../hooks/useTransliterator.jsx';
import { validateNewWord } from '@/utils/validationEngine.jsx';
import { fetchSynonymOptions } from '../../../utils/semanticUtils.js';
import './createWordTab.css';
import Modal from '../../UI/Modal/Modal.jsx';
import FontStudioModal from '../../UI/Fontstudio/FontStudio.jsx';
import IpaChart from '../../UI/IpaChart/Ipachart.jsx';
import Infobox from '../../UI/Infobox/Infobox.jsx';
import toast from 'react-hot-toast';
import ToneStressSelector from '../dictionary/ToneStressSelector.jsx';

// Standard POS options that always show in the dropdown
const STANDARD_WORD_CLASSES = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'particle', 'conjunction', 'preposition'
];

export default function CreateWordTab() {
    const location = useLocation();
    const navigate = useNavigate();
    const { normalizeToBase, transliterate } = useTransliterator();

    // Track which input field the IPA chart should paste into
    const [activeField, setActiveField] = useState('ipa'); // default to IPA field
    const [tagInput, setTagInput] = useState('');
    const [relatedInput, setRelatedInput] = useState('');
    const [isFetchingRelated, setIsFetchingRelated] = useState(false);

    // Global stores
    const addWord = useLexiconStore((state) => state.addWord);
    const checkDuplicate = useLexiconStore((state) => state.checkDuplicate);
    const lexicon = useLexiconStore((state) => state.lexicon) || [];
    const { phonologyTypes, grammarRules, vowels, consonants, otherPhonemes, syllablePattern, verbMarker,
            customWordClasses, customTags, addCustomWordClass, addCustomTag, autoReturnToLexicon,
            vowelHarmonyMode, vowelHarmonySets, vowelHarmonyOverrideWordClasses, vowelHarmonyOverrideTags,
            updateConfig, syllabaryMap } = useConfigStore(useShallow(state => ({
        phonologyTypes: state.phonologyTypes,
        grammarRules: state.grammarRules,
        vowels: state.vowels,
        consonants: state.consonants,
        otherPhonemes: state.otherPhonemes,
        syllablePattern: state.syllablePattern,
        verbMarker: state.verbMarker,
        customWordClasses: state.customWordClasses || [],
        customTags: state.customTags || [],
        addCustomWordClass: state.addCustomWordClass,
        addCustomTag: state.addCustomTag,
        autoReturnToLexicon: state.autoReturnToLexicon,
        vowelHarmonyMode: state.vowelHarmonyMode || 'complete',
        vowelHarmonySets: state.vowelHarmonySets || [],
        vowelHarmonyOverrideWordClasses: state.vowelHarmonyOverrideWordClasses || [],
        vowelHarmonyOverrideTags: state.vowelHarmonyOverrideTags || [],
        blockTemplates: state.blockTemplates,
        blockSettings: state.blockSettings,
        updateConfig: state.updateConfig,
        syllabaryMap: state.syllabaryMap || {}
    })));

    // Let's track all our input fields in one neat object
    const [formData, setFormData] = useState({
        word: '',
        ipa: '',
        wordClass: 'noun',
        translation: '',
        definition: '',
        tags: [],
        relatedWords: [],
        ideogram: '',
        tone: '',
        stress: ''
    });

    const { word, ipa, wordClass, translation, definition, tags, relatedWords, ideogram, tone, stress } = formData;
    const [isFontStudioOpen, setIsFontStudioOpen] = useState(false);
    const [selectedDerivs, setSelectedDerivs] = useState({});
    const [customTranslations, setCustomTranslations] = useState({});

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Build the merged POS list: standard + custom (deduplicated)
    const allWordClasses = useMemo(() => {
        const merged = new Set([...STANDARD_WORD_CLASSES]);
        customWordClasses.forEach(cls => merged.add(cls));
        // Also add any unique classes found in the existing lexicon
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

    // Build the merged tags list for autocomplete
    const allTags = useMemo(() => {
        const merged = new Set(customTags);
        lexicon.forEach(w => {
            if (w.tags) w.tags.forEach(tag => merged.add(tag.toLowerCase()));
        });
        return [...merged].sort();
    }, [customTags, lexicon]);

    useEffect(() => {
        if (location.state) {
            setFormData(prev => ({
                ...prev,
                word: location.state.prefillWord || prev.word,
                ipa: location.state.prefillIpa || prev.ipa,
                wordClass: location.state.prefillClass || prev.wordClass,
                translation: location.state.prefillTranslation || prev.translation
            }));
        }

        // Cleanup toasts on unmount
        return () => toast.dismiss();
    }, [location.state]);

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

    const { isDuplicateWord, isDuplicateTranslation } = checkDuplicate(word, translation);
    const isDuplicate = (isDuplicateWord || isDuplicateTranslation) && (word !== '' || translation !== '');

    // Handle IPA chart character selection - paste into the active field
    const handleIpaSelect = (char) => {
        updateField(activeField, formData[activeField] + char);
    };

    // Quick-fix action: add invalid characters to consonants or vowels
    const handleAddCharsToInventory = (chars, type) => {
        const currentList = type === 'consonants' ? consonants : vowels;
        const arr = currentList.trim() ? currentList.trim().split(',').map(s => s.trim()) : [];
        chars.forEach(ch => {
            if (!arr.includes(ch)) arr.push(ch);
        });
        updateConfig({ [type]: arr.join(', ') });
        toast.success(`Added "${chars.join(', ')}" to ${type}.`);
    };

    // Quick-fix action: add detected pattern to syllable patterns
    const handleAddPattern = (pattern, safeWord, cleanTrans, processedTags) => {
        const current = syllablePattern || '';
        const arr = current.split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
        if (!arr.includes(pattern.toUpperCase())) {
            arr.push(pattern.toUpperCase());
        }
        updateConfig({ syllablePattern: arr.join(', ') });
        toast.success(`Added "${pattern.toUpperCase()}" to syllable patterns.`);

        // After adding the pattern, we should save the word too!
        saveConfirmedWord(safeWord, cleanTrans, processedTags);
    };

    const handleAddTag = (tag) => {
        const cleanTag = tag.trim().toLowerCase();
        if (!cleanTag) return;
        if (!formData.tags.includes(cleanTag)) {
            updateField('tags', [...formData.tags, cleanTag]);
        }
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
        } catch (e) {
            toast.error("Failed to fetch related words.");
        } finally {
            setIsFetchingRelated(false);
        }
    };

    const saveConfirmedWord = (safeWord, cleanTrans, processedTags, keepRoot = false) => {
        const rootId = Date.now() + Math.random();

        // 1. Save the main root
        addWord({
            id: rootId,
            word: safeWord,
            ipa: ipa.trim(),
            wordClass: wordClass,
            translation: cleanTrans,
            definition: definition.trim(),
            tags: processedTags,
            relatedWords: relatedWords || [],
            ideogram: ideogram.trim(),
            tone: tone.trim(),
            stress: stress.trim()
        });

        // 2. Save any selected derivations
        derivedWords.forEach((item, idx) => {
            if (selectedDerivs[idx]) {
                const rule = grammarRules.find(r => r.name === item.ruleName);

                // Determine the best class for the derivation
                let targetClass = wordClass; // Fallback
                if (rule) {
                    if (rule.targetPOS) {
                        targetClass = rule.targetPOS;
                    } else {
                        const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());
                        if (!ruleClasses.includes('all')) {
                            targetClass = ruleClasses[0];
                        } else if (wordClass.includes(',')) {
                            targetClass = wordClass.split(',')[0].trim();
                        }
                    }
                }

                addWord({
                    word: item.derivedWord,
                    ipa: '', // Derivations don't auto-generate IPA yet
                    wordClass: targetClass,
                    translation: customTranslations[idx] !== undefined ? customTranslations[idx].trim() : item.translationText,
                    definition: '',
                    tags: [...processedTags, 'derived'],
                    relatedWords: [],
                    ideogram: '',
                    parentRootId: rootId,
                    derivationRuleId: rule?.id
                });
            }
        });

        // 3. Persist any new custom POS/tags
        if (wordClass && !STANDARD_WORD_CLASSES.includes(wordClass.toLowerCase())) {
            addCustomWordClass(wordClass);
        }
        processedTags.forEach(tag => addCustomTag(tag));

        // Reset the form for the next word
        if (keepRoot) {
            setFormData(prev => ({ ...prev, translation: '', definition: '', tags: [], relatedWords: [] }));
        } else {
            setFormData({ word: '', ipa: '', wordClass: 'noun', translation: '', definition: '', tags: [], relatedWords: [], ideogram: '', tone: '', stress: '' });
        }

        setSelectedDerivs({});
        setCustomTranslations({});
        toast.success((t) => (
            <div className="toast-inner-flex">
                <span>{keepRoot ? 'Meaning saved! Add another...' : 'Root and derivations saved!'}</span>
                {!keepRoot && (
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            navigate('/lexicon');
                        }}
                        className="toast-view-btn"
                    >
                        View Lexicon
                    </button>
                )}
            </div>
        ));

        if (!keepRoot && autoReturnToLexicon) {
            navigate('/lexicon');
        }

        // --- Auto-Compile Missing Blocks on Save ---
        if (phonologyTypes === 'featural_block') {
            try {
                const fullConfig = useConfigStore.getState();
                const currentLexicon = useLexiconStore.getState().lexicon;
                const worker = new Worker(new URL('../../../utils/fontWorker.js', import.meta.url), { type: 'module' });
                
                worker.onmessage = (e) => {
                    if (e.data.success) {
                        const newData = e.data.result;
                        updateConfig({
                            syllabaryMap: newData.syllabaryMap,
                            customFontBase64: newData.customFontBase64,
                            customFont: newData.customFontBase64,
                            puaCounter: newData.puaCounter
                        });
                        toast.success("Font updated with new block!", { icon: '✨' });
                    }
                    worker.terminate();
                };
                
                worker.onerror = (err) => {
                    worker.terminate();
                };
                
                worker.postMessage({ config: JSON.parse(JSON.stringify({ ...fullConfig, lexicon: currentLexicon })) });
            } catch (e) {
                console.warn("Failed to trigger background compiler:", e);
            }
        }
    };

    const showValidationToast = (content) => {
        toast.custom(content, { duration: Infinity, id: 'validation-toast' });
    };

    // Validate and save the new root to our lexicon
    const handleSave = (keepRoot = false) => {
        const cleanWord = word.trim();
        const cleanTrans = translation.trim();

        if (!cleanWord || !cleanTrans) {
            return toast.error("Please fill in both the word and the translation.");
        }



        // Clean up the word to ensure custom alien letters map correctly to the base orthography
        const safeWord = normalizeToBase(cleanWord);
        validateNewWord(safeWord, useConfigStore.getState());
        const processedTags = [...formData.tags].sort();

        // 1. DUPLICATE CHECK (Warnings, not blocks)
        if (isDuplicate) {
            let warningMsg = "";
            if (isDuplicateWord && isDuplicateTranslation) {
                warningMsg = "This exact word and translation already exist in your lexicon.";
            } else if (isDuplicateWord && !isDuplicateTranslation) {
                warningMsg = "This word already exists (Homonym). Save it as a new entry with this different meaning?";
            } else if (!isDuplicateWord && isDuplicateTranslation) {
                warningMsg = "This translation already exists (Synonym). Save it as a new entry with this different spelling?";
            } else {
                warningMsg = "Duplicate detected: This word or translation is already in your dictionary.";
            }

            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Duplicate Detected</strong>
                    <span>{warningMsg}</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            // Bypass duplicate check and continue to validation
                            proceedToHarmonyValidation(safeWord, cleanTrans, processedTags, 0, keepRoot);
                        }} className="btn-v btn-err-v">Save Anyway</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToHarmonyValidation(safeWord, cleanTrans, processedTags, 0, keepRoot);
    };

    const proceedToHarmonyValidation = (safeWord, cleanTrans, processedTags, charIndex = 0, keepRoot = false) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState(), wordClass, processedTags);

        // Helper to resolve set names from raw store data
        const getSetName = (idx) => {
            const set = (vowelHarmonySets || [])[idx];
            if (set && set.name) return set.name;
            if (Array.isArray(set)) return `Set ${idx + 1}`;
            return `Set ${idx + 1}`;
        };

        // Vowel Harmony Check (runs before phonotactic validation)
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
                            proceedToValidation(safeWord, cleanTrans, processedTags, charIndex, keepRoot);
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

        proceedToValidation(safeWord, cleanTrans, processedTags, charIndex, keepRoot);
    };

    const proceedToValidation = (safeWord, cleanTrans, processedTags, charIndex = 0, keepRoot = false) => {
        const validation = validateNewWord(safeWord, useConfigStore.getState(), wordClass, processedTags);

        // 2. PHONOTACTIC VALIDATION
        if (!validation.valid) {
            // Handle multiple invalid characters sequentially
            if (validation.type === 'invalid_chars') {
                const char = validation.invalidChars[charIndex];

                // If we've processed all individual characters, proceed to the final step (pattern validation)
                if (!char) {
                    return proceedToGrammarValidation(safeWord, cleanTrans, processedTags, keepRoot);
                }

                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong className="char-violation-title">⚠️ Character Violation: "{char}"</strong>
                        <span>The character "{char}" is not in your Phoneme settings. How should we handle it?</span>
                        <div className="toast-actions-v char-violation-actions">
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddCharsToInventory([char], 'consonants');
                                // Delay slightly to let the toast animation complete before showing the next one
                                setTimeout(() => proceedToValidation(safeWord, cleanTrans, processedTags, charIndex + 1, keepRoot), 100);
                            }} className="btn-v btn-acc-v">Add to Consonants</button>

                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddCharsToInventory([char], 'vowels');
                                setTimeout(() => proceedToValidation(safeWord, cleanTrans, processedTags, charIndex + 1, keepRoot), 100);
                            }} className="btn-v btn-acc2-v">Add to Vowels</button>

                            <button onClick={() => {
                                toast.dismiss(t.id);
                                // Skip this character but keep going with the next one
                                setTimeout(() => proceedToValidation(safeWord, cleanTrans, processedTags, charIndex + 1, keepRoot), 100);
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
                return proceedToGrammarValidation(safeWord, cleanTrans, processedTags, keepRoot);
            }

            // Pattern validation (runs after characters are cleared or skipped)
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>⚠️ Phono-Syntax Warning</strong>
                    <span>{validation.reason}</span>
                    <p className="pattern-warning-p">Do you want to save it as an irregular exception anyway?</p>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            proceedToGrammarValidation(safeWord, cleanTrans, processedTags, keepRoot);
                        }} className="btn-v btn-err-v">Save Anyway</button>

                        {validation.type === 'invalid_pattern' && validation.detectedPattern && (
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                handleAddPattern(validation.detectedPattern, safeWord, cleanTrans, processedTags);
                            }} className="btn-v btn-acc-v">Add as Syllable Pattern</button>
                        )}
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        proceedToGrammarValidation(safeWord, cleanTrans, processedTags, keepRoot);
    };

    const proceedToGrammarValidation = (safeWord, cleanTrans, processedTags, keepRoot = false) => {
        // 3. POS CONFIRMATION (If new)
        const normalizedPOS = wordClass.toLowerCase().trim();
        if (normalizedPOS && !allWordClasses.includes(normalizedPOS)) {
            showValidationToast((t) => (
                <div className="custom-toast-v">
                    <strong>📝 New Part of Speech</strong>
                    <span>"{normalizedPOS}" does not exist in your grammar settings. Add it globally?</span>
                    <div className="toast-actions-v">
                        <button onClick={() => {
                            toast.dismiss(t.id);
                            finalizeSave(safeWord, cleanTrans, processedTags, keepRoot);
                        }} className="btn-v btn-acc-v">Add & Save</button>
                        <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                    </div>
                </div>
            ));
            return;
        }

        finalizeSave(safeWord, cleanTrans, processedTags, keepRoot);
    };

    const finalizeSave = (safeWord, cleanTrans, processedTags, keepRoot = false) => {
        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];
        if (currentClasses.includes('verb') && verbMarker) {
            const markers = verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
            const match = markers.find(m => safeWord.endsWith(m));
            if (!match) {
                showValidationToast((t) => (
                    <div className="custom-toast-v">
                        <strong>⚠️ Verb Marker Missing</strong>
                        <span>This word is marked as a verb, but it doesn't end with any of your defined verb markers ({verbMarker}).</span>
                        <div className="toast-actions-v">
                            <button onClick={() => {
                                toast.dismiss(t.id);
                                saveConfirmedWord(safeWord, cleanTrans, processedTags, keepRoot);
                            }} className="btn-v btn-err-v">Save Anyway</button>
                            <button onClick={() => toast.dismiss(t.id)} className="btn-v btn-sec-v">Cancel</button>
                        </div>
                    </div>
                ));
                return;
            }
        }

        saveConfirmedWord(safeWord, cleanTrans, processedTags, keepRoot);
    };

    // Spin up a live preview of how this word will interact with the language's grammar rules
    // BUG-4: Memoize to avoid running the morphology engine on every render
    const derivedWords = useMemo(() => {
        if (!word || !translation) return [];

        const results = [];
        const safeBaseWord = normalizeToBase(word.trim());

        const currentClasses = wordClass ? wordClass.split(',').map(c => c.trim().toLowerCase()) : [];

        grammarRules.forEach(rule => {
            const ruleClasses = (rule.appliesTo || 'all').split(',').map(c => c.trim().toLowerCase());

            if (ruleClasses.includes('all') || currentClasses.some(cc => ruleClasses.includes(cc))) {
                let base = safeBaseWord;

                // Verb markers are no longer stripped, they only act as a validation warning during creation

                const result = applyRuleToWord(base, rule, grammarRules, vowels, consonants, otherPhonemes);

                if (result) {
                    results.push({
                        derivedWord: result,
                        ruleName: rule.name,
                        translationText: `${translation} (${rule.name.toLowerCase()})`
                    });
                }
            }
        });

        return results;
    }, [word, translation, wordClass, grammarRules, vowels, consonants, otherPhonemes, normalizeToBase]);

    return (
        <div className="create-word-container">
            <Card>
                <h2 className="create-word-title">
                    <Sparkles className="title-icon" /> Create New Root
                </h2>

                <Infobox title="Derivation & Genealogy Guide">
                    • <b>Automatic Linking:</b> Words saved from the "Derivations" list are linked to this root. You can see this genealogy in the Lexicon Edit modal.<br />
                    • <b>Target POS:</b> If a grammar rule (like "Adjectival") has a Target POS set, derived words will automatically be categorized correctly.<br />
                    • <b>Duplicate Alerts:</b> The app checks for homonyms (same word) and synonyms (same translation) in real-time.<br />
                    • <b>IPA Chart:</b> Click any field to focus it, then use the IPA chart to insert phonemes.
                </Infobox>

                <div className="input-grid">
                    <div>
                        <Input
                            label="WORD (CONLANG)"
                            value={word}
                            onChange={(e) => updateField('word', e.target.value)}
                            onFocus={() => setActiveField('word')}
                            placeholder="e.g., makin"
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
                    <div>
                        <Input
                            label="IPA (OPTIONAL)"
                            value={ipa}
                            onChange={(e) => updateField('ipa', e.target.value)}
                            onFocus={() => setActiveField('ipa')}
                            placeholder="/ma'kin/"
                        />
                    </div>
                    <div>
                        <Input
                            label="PART OF SPEECH"
                            value={wordClass}
                            onChange={(e) => updateField('wordClass', e.target.value.toLowerCase())}
                            placeholder="Ex: noun, verb, classifier..."
                            list="word-classes"
                        >
                            <button
                                className="clear-input-btn"
                                onClick={() => updateField('wordClass', '')}
                                title="Clear Part of Speech"
                            >
                                <X size={14} />
                            </button>
                        </Input>

                        {/* Merged datalist: standard + user-defined classes */}
                        <datalist id="word-classes">
                            {allWordClasses.map(cls => (
                                <option key={cls} value={cls} />
                            ))}
                        </datalist>
                    </div>
                </div>

                {/* IPA chart spans the full card width so it doesn't overflow the column grid */}
                <div className="ipa-chart-status-wrap">
                    <p className="ipa-chart-status">
                        IPA Chart pastes into: <strong className="ipa-active-field">{activeField === 'word' ? 'Word' : 'IPA'}</strong> field. Click a field above to change target.
                    </p>
                    <IpaChart onSelect={handleIpaSelect} />
                </div>

                {phonologyTypes === 'logographic' && (
                    <div className="ideogram-section">
                        <div className="ideogram-input-wrapper">
                            <Input
                                label="IDEOGRAM / SYMBOL"
                                value={ideogram}
                                onChange={(e) => updateField('ideogram', e.target.value)}
                                placeholder="e.g., 水"
                                className="ideogram-input notranslate custom-font-text"
                            />
                        </div>
                        <div className="ideogram-action">
                            <Button variant="edit" onClick={() => setIsFontStudioOpen(true)}>
                                <Brush size={16} /> Draw Symbol
                            </Button>
                        </div>
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
                            <div style={{ minWidth: '80px', textAlign: 'center', fontFamily: 'var(--custom-font)', fontSize: '2.5rem', color: 'var(--acc)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', padding: '0 15px', background: 'var(--bg)' }} className="notranslate">
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
                                        style={{ fontFamily: 'var(--custom-font)', fontSize: '1.2rem', padding: '6px 16px', border: '1px solid var(--bd)' }}
                                        title={struct}
                                    >
                                        <span className="notranslate">{transliterate(struct)}</span>
                                        <div style={{ fontSize: '0.65rem', color: isSelected ? 'var(--bg)' : 'var(--tx2)', marginTop: '4px', fontFamily: 'sans-serif', opacity: 0.8 }}>
                                            {struct.replace(/\./g, ' + ')}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <details className="tone-stress-details">
                    <summary className="tone-stress-summary">
                        Tone & Stress Options
                    </summary>
                    <div className="tone-stress-content">
                        <ToneStressSelector
                            word={formData.word}
                            tone={formData.tone}
                            stress={formData.stress}
                            onToneChange={(v) => updateField('tone', v)}
                            onStressChange={(v) => updateField('stress', v)}
                        />
                    </div>
                </details>

                <div className="input-grid trans-def-grid">
                    <div>
                        <Input
                            label="Short Translation"
                            value={translation}
                            onChange={(e) => updateField('translation', e.target.value)}
                            placeholder="Primary English word..."
                        />
                    </div>
                    <div>
                        <Input
                            label="Full Definition (Optional)"
                            value={definition}
                            onChange={(e) => updateField('definition', e.target.value)}
                            placeholder="Extended description..."
                        />
                    </div>
                </div>

                {isDuplicate && (
                    <div className="warning-box">
                        <AlertTriangle size={18} />
                        Warning: {isDuplicateWord && isDuplicateTranslation ? "This exact word and translation already exist." : isDuplicateWord && isDuplicateTranslation === false ? "This word already exists (Homonym)." : isDuplicateWord === false && isDuplicateTranslation ? "This translation already exists (Synonym)." : "This entry matches existing homonyms and synonyms."}
                    </div>
                )}

                <div className="tags-section">
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
                                placeholder={formData.tags.length === 0 ? "Add tags (nature, emotion...)" : ""}
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
                                list="semantic-tags"
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
                    {/* Autocomplete from previously used tags */}
                    <datalist id="semantic-tags">
                        {allTags.map(tag => (
                            <option key={tag} value={tag} />
                        ))}
                    </datalist>
                </div>

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
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

                {word && translation && grammarRules.length > 0 && (
                    <div className="preview-box">
                        <span className="preview-title">
                            Auto-Derivations Preview
                        </span>

                        {derivedWords.length > 0 ? (
                            <div className="preview-grid">
                                {derivedWords.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className={`preview-item ${selectedDerivs[idx] ? 'selected' : ''}`}
                                        onClick={() => setSelectedDerivs(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                        title="Click to save alongside root"
                                    >
                                        <div className="deriv-item-content">
                                            <span className="preview-word notranslate custom-font-text">
                                                {transliterate(item.derivedWord)}
                                            </span>
                                            <input
                                                type="text"
                                                className="preview-translation-input"
                                                value={customTranslations[idx] !== undefined ? customTranslations[idx] : item.translationText}
                                                onChange={(e) => setCustomTranslations(prev => ({ ...prev, [idx]: e.target.value }))}
                                                onClick={(e) => e.stopPropagation()} // Prevent toggling the checkbox when editing translation
                                                placeholder={item.translationText}
                                            />
                                        </div>
                                        <div className="preview-checkbox">
                                            {selectedDerivs[idx] && <span className="deriv-checkbox-check">✓</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <i className="preview-empty">No matching grammar rules found for this class.</i>
                        )}
                    </div>
                )}

                <div className="create-actions-wrap" style={{ gap: '10px' }}>
                        <Button
                            variant="save"
                            className="create-save-main"
                            onClick={() => handleSave(false)}
                        >
                            <Save size={20} /> Save Root
                        </Button>
                        <Button
                            variant="default"
                            className="create-save-main"
                            onClick={() => handleSave(true)}
                        >
                            <Plus size={20} /> Save & Add Another Meaning
                        </Button>
                        <div style={{ flex: 1 }}></div>
                        <Button
                            variant="edit"
                            className="create-view-lexicon"
                            onClick={() => navigate('/lexicon')}
                        >
                            View Lexicon
                        </Button>
                    </div>

            </Card>

            <Modal
                isOpen={isFontStudioOpen}
                onClose={() => setIsFontStudioOpen(false)}
                title="Draw Custom Ideogram"
            >
                <FontStudioModal
                    targetLabel={word || 'New Root'}
                    onSave={(newChar) => {
                        updateField('ideogram', ideogram + newChar);
                        setIsFontStudioOpen(false);
                    }}
                    onCancel={() => setIsFontStudioOpen(false)}
                />
            </Modal>
        </div>
    );
}
