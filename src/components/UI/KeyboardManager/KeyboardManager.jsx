// src/components/UI/KeyboardManager/KeyboardManager.jsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
    Download, Wand2, RotateCcw, Trash2, Search, Layers, 
    Globe, Check, FileJson, Upload, ChevronDown, Sparkles 
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import Button from '../Buttons/Buttons.jsx';
import { 
    exportWindowsInstaller, exportKLC, exportMac, exportLinux, exportJSON, QWERTY_DEFAULTS 
} from '../../../utils/keyboardExporter.js';
import { 
    distributeLetters, ASSIGNABLE_KEYS_HOME_FIRST 
} from '../../../utils/keyboardDistributor.js';
import { 
    getScriptSystem, getScriptData, getDefaultScriptId, normalizeScriptType, resolveWordScriptId
} from '../../../utils/scriptResolver.js';
import toast from 'react-hot-toast';
import './keyboardManager.css';

const QWERTY_ROWS = [
    [
        { vk: 'OEM_3', label: '`' }, { vk: '1', label: '1' }, { vk: '2', label: '2' }, { vk: '3', label: '3' },
        { vk: '4', label: '4' }, { vk: '5', label: '5' }, { vk: '6', label: '6' }, { vk: '7', label: '7' },
        { vk: '8', label: '8' }, { vk: '9', label: '9' }, { vk: '0', label: '0' }, { vk: 'OEM_MINUS', label: '-' },
        { vk: 'OEM_PLUS', label: '=' }, { vk: 'BACK', label: 'Backspace', special: true, cls: 'wide-3' }
    ],
    [
        { vk: 'TAB', label: 'Tab', special: true, cls: 'wide-1' }, { vk: 'Q', label: 'Q' }, { vk: 'W', label: 'W' },
        { vk: 'E', label: 'E' }, { vk: 'R', label: 'R' }, { vk: 'T', label: 'T' }, { vk: 'Y', label: 'Y' },
        { vk: 'U', label: 'U' }, { vk: 'I', label: 'I' }, { vk: 'O', label: 'O' }, { vk: 'P', label: 'P' },
        { vk: 'OEM_4', label: '[' }, { vk: 'OEM_6', label: ']' }, { vk: 'OEM_5', label: '\\', cls: 'wide-1' }
    ],
    [
        { vk: 'CAPS', label: 'Caps', special: true, cls: 'wide-2' }, { vk: 'A', label: 'A' }, { vk: 'S', label: 'S' },
        { vk: 'D', label: 'D' }, { vk: 'F', label: 'F' }, { vk: 'G', label: 'G' }, { vk: 'H', label: 'H' },
        { vk: 'J', label: 'J' }, { vk: 'K', label: 'K' }, { vk: 'L', label: 'L' }, { vk: 'OEM_1', label: ';' },
        { vk: 'OEM_7', label: "'" }, { vk: 'ENTER', label: 'Enter', special: true, cls: 'wide-2' }
    ],
    [
        { vk: 'SHIFT_L', label: 'Shift', special: true, toggle: 'shift', cls: 'wide-3' }, { vk: 'Z', label: 'Z' },
        { vk: 'X', label: 'X' }, { vk: 'C', label: 'C' }, { vk: 'V', label: 'V' }, { vk: 'B', label: 'B' },
        { vk: 'N', label: 'N' }, { vk: 'M', label: 'M' }, { vk: 'OEM_COMMA', label: ',' },
        { vk: 'OEM_PERIOD', label: '.' }, { vk: 'OEM_2', label: '/' }, { vk: 'SHIFT_R', label: 'Shift', special: true, toggle: 'shift', cls: 'wide-3' }
    ],
    [
        { vk: 'CTRL_L', label: 'Ctrl', special: true, cls: 'wide-1' },
        { vk: 'ALT_L', label: 'Alt', special: true, cls: 'wide-1' },
        { vk: 'SPACE', label: 'Space', space: true, cls: 'space' },
        { vk: 'ALT_R', label: 'AltGr', special: true, toggle: 'altgr', cls: 'wide-1' },
        { vk: 'CTRL_R', label: 'Ctrl', special: true, cls: 'wide-1' }
    ]
];

export default function KeyboardManager({ initialScriptId, allChars = [], alphabetGlyphs = {} }) {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);

    // Global Stores
    const scriptSystems = useConfigStore(s => s.scriptSystems) || [];
    const defaultScriptId = useConfigStore(s => s.scriptRules?.defaultScriptId) || 'default';
    const legacyConsonants = useConfigStore(s => s.consonants) || '';
    const legacyVowels = useConfigStore(s => s.vowels) || '';
    const legacyOther = useConfigStore(s => s.otherPhonemes) || '';
    const configState = useConfigStore(s => s);
    const projectId = configState?.projectId || 'local';
    const resolvedDefaultScriptId = getDefaultScriptId(configState) || defaultScriptId;
    const rawLexicon = useLexiconStore(s => s.lexicon);
    const lexicon = useMemo(() => rawLexicon || [], [rawLexicon]);

    // Local State — keyboard mappings stored independently per script
    const storageKey = `ce_keyboard_mappings_${projectId}`;
    const [selectedScriptId, setSelectedScriptId] = useState(() => initialScriptId || resolvedDefaultScriptId || 'default');
    const [activeLayer, setActiveLayer] = useState('base'); // 'base' | 'shift' | 'altgr'
    const [selectedKey, setSelectedKey] = useState(null); // { vk, label }
    const [mappingsByScript, setMappingsByScript] = useState(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : null;
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch {
            return {};
        }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showDistributeMenu, setShowDistributeMenu] = useState(false);

    const mappings = useMemo(() => mappingsByScript[selectedScriptId] || {}, [mappingsByScript, selectedScriptId]);

    const setMappings = useCallback((updater) => {
        setMappingsByScript(prev => {
            const currentScriptMap = prev[selectedScriptId] || {};
            const nextScriptMap = typeof updater === 'function' ? updater(currentScriptMap) : updater;
            const nextAll = { ...prev, [selectedScriptId]: nextScriptMap || {} };
            try {
                localStorage.setItem(storageKey, JSON.stringify(nextAll));
            } catch {
                /* ignore storage quota errors */
            }
            return nextAll;
        });
    }, [selectedScriptId, storageKey]);

    const handleScriptChange = (nextScriptId) => {
        setSelectedScriptId(nextScriptId);
        setSelectedKey(null);
        setActiveCategory('all');
        setSearchQuery('');
        setShowDistributeMenu(false);
    };

    // Resolve current writing system & data
    const currentScript = useMemo(() => {
        return getScriptSystem(configState, selectedScriptId);
    }, [configState, selectedScriptId]);

    const currentScriptData = useMemo(() => {
        return getScriptData(configState, selectedScriptId);
    }, [configState, selectedScriptId]);

    const isDefaultScript = (currentScript?.id || selectedScriptId) === resolvedDefaultScriptId;
    const scriptType = normalizeScriptType(
        currentScript?.type || (isDefaultScript ? configState?.phonologyTypes : 'alphabetic')
    );
    const scriptName = currentScript?.name || 'Conlang';
    const scriptWritingDirection = currentScript?.writingDirection || (isDefaultScript ? configState?.writingDirection : 'ltr') || 'ltr';

    // Parse comma-separated phoneme strings ("phoneme=orthography" or "char")
    const parsePhonemes = useCallback((str) => {
        if (!str) return [];
        return str.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => {
                if (s.includes('=')) {
                    const [k, v] = s.split('=');
                    const phoneme = k.trim();
                    const mapped = v.trim();
                    return { raw: s, phoneme, char: mapped || phoneme, mapped: mapped || phoneme };
                }
                return { raw: s, phoneme: s, char: s, mapped: s };
            });
    }, []);

    // Build strictly script-isolated character inventory
    const availableItems = useMemo(() => {
        const items = [];
        const seenOutputByCat = new Set();
        const seenScriptOutputs = new Set();

        const addUnique = (item) => {
            const val = item.unicode || item.char;
            if (!val) return;
            const catKey = `${item.category}_${val}`;
            if (!seenOutputByCat.has(catKey)) {
                seenOutputByCat.add(catKey);
                if (item.category !== 'punctuation') {
                    seenScriptOutputs.add(val);
                }
                items.push(item);
            }
        };

        const legacyAlphabetGlyphs = configState?.alphabetGlyphs || {};
        const legacySyllabaryMap = configState?.syllabaryMap || {};
        const legacyCustomGlyphs = configState?.customGlyphs || {};
        const legacyFeatural = configState?.featuralComponents || {};
        const numberSystem = configState?.numberSystem || {};

        const activeAlphabetGlyphs = currentScriptData?.alphabetGlyphs
            || (isDefaultScript ? (Object.keys(legacyAlphabetGlyphs).length > 0 ? legacyAlphabetGlyphs : alphabetGlyphs) : {})
            || {};
        const activeNames = (currentScript?.alphabetNames && Object.keys(currentScript.alphabetNames).length > 0)
            ? currentScript.alphabetNames
            : (isDefaultScript ? (configState?.alphabetNames || {}) : {});

        // 1. Alphabetic / Abjad / Abugida letters (isolated from syllabary/logographs)
        if (['alphabetic', 'abjad', 'abugida'].includes(scriptType)) {
            const phonemes = [
                ...parsePhonemes(legacyConsonants),
                ...parsePhonemes(legacyVowels),
                ...parsePhonemes(legacyOther),
            ];
            // Include any extra allChars entries not already covered by phonemes
            const knownMapped = new Set(phonemes.map(p => p.mapped));
            allChars.forEach(c => {
                if (c && !knownMapped.has(c)) {
                    phonemes.push({ raw: c, phoneme: c, char: c, mapped: c });
                }
            });

            phonemes.forEach(({ phoneme, char, mapped }) => {
                const baseChar = mapped || char;
                const glyphCode = activeAlphabetGlyphs[baseChar] || activeAlphabetGlyphs[phoneme];
                const name = activeNames[baseChar] || activeNames[phoneme] || (phoneme !== baseChar ? phoneme : baseChar);
                addUnique({
                    id: `letter_${baseChar}`,
                    char: baseChar,
                    phoneme,
                    unicode: glyphCode || baseChar,
                    label: name,
                    category: 'letters',
                    hasGlyph: Boolean(glyphCode),
                    isUpper: false
                });

                // Include uppercase glyph variant if mapped in this script
                const upperGlyph = activeAlphabetGlyphs[`${baseChar}_uppercase`] || activeAlphabetGlyphs[`${phoneme}_uppercase`];
                if (upperGlyph) {
                    addUnique({
                        id: `letter_upper_${baseChar}`,
                        char: baseChar.toUpperCase(),
                        phoneme,
                        unicode: upperGlyph,
                        label: `${name} (Upper)`,
                        category: 'letters',
                        hasGlyph: true,
                        isUpper: true
                    });
                }
            });
        }

        // 2. Syllabary (only for syllabic scripts, strictly isolated to selected script)
        if (scriptType === 'syllabic') {
            const sylMap = currentScriptData?.syllabaryMap
                || (isDefaultScript ? legacySyllabaryMap : {})
                || {};
            Object.entries(sylMap).forEach(([syl, code]) => {
                addUnique({
                    id: `syl_${syl}`,
                    char: syl,
                    phoneme: syl,
                    unicode: code || syl,
                    label: syl,
                    category: 'syllables',
                    hasGlyph: Boolean(code && code !== syl)
                });
            });
        }

        // 3. Logographs & direct lexicon forms (only for logographic scripts, or entries explicitly targeting this script)
        if (scriptType === 'logographic') {
            lexicon.forEach(entry => {
                const directScriptForm = entry.scriptForms?.[selectedScriptId];
                const resolvesHere = resolveWordScriptId(entry, configState) === selectedScriptId;
                const glyph = directScriptForm || (resolvesHere ? (entry.customGlyph || entry.ideogram) : '');
                if (glyph) {
                    addUnique({
                        id: `logo_${entry.id || entry.word}`,
                        char: entry.word,
                        phoneme: entry.word,
                        unicode: glyph,
                        label: entry.translation ? `${entry.word} (${entry.translation})` : entry.word,
                        category: 'logographs',
                        hasGlyph: true
                    });
                }
            });
        }

        // 4. Featural components (only for featural_block scripts)
        if (scriptType === 'featural_block') {
            const featural = currentScriptData?.featuralComponents
                || (isDefaultScript ? legacyFeatural : {})
                || {};
            Object.entries(featural).forEach(([slotName, val]) => {
                addUnique({
                    id: `feat_${slotName}`,
                    char: slotName,
                    phoneme: slotName,
                    unicode: val,
                    label: slotName,
                    category: 'blocks',
                    hasGlyph: true
                });
            });
        }

        // 5. Custom Drawn Glyphs belonging to THIS script that aren't already represented above
        const customGlyphs = currentScriptData?.customGlyphs
            || (isDefaultScript ? legacyCustomGlyphs : {})
            || {};
        const fallbackCategory = scriptType === 'syllabic'
            ? 'syllables'
            : scriptType === 'logographic'
                ? 'logographs'
                : scriptType === 'featural_block'
                    ? 'blocks'
                    : 'letters';

        Object.keys(customGlyphs).forEach(code => {
            const num = Number(code);
            const unicodeChar = !isNaN(num) ? String.fromCodePoint(num) : code;
            if (seenScriptOutputs.has(unicodeChar)) return;
            addUnique({
                id: `glyph_${selectedScriptId}_${code}`,
                char: unicodeChar,
                unicode: unicodeChar,
                label: `Glyph ${code}`,
                category: fallbackCategory,
                hasGlyph: true
            });
        });

        // 6. Number System Digits — ALWAYS use the digit glyph or actual digit '0'..'9',
        // never multi-letter number word names like "uri" or "luta".
        const emitDigit = (digitStr, name) => {
            const customDigit = numberSystem.digitGlyphs?.[digitStr];
            addUnique({
                id: `num_${digitStr}`,
                char: digitStr,
                unicode: customDigit || digitStr,
                label: name ? `${digitStr} (${name})` : digitStr,
                category: 'numbers',
                hasGlyph: Boolean(customDigit)
            });
        };

        if (numberSystem.zero || numberSystem.digitGlyphs?.['0']) {
            emitDigit('0', numberSystem.zero || '');
        }
        Object.entries(numberSystem.digits || {}).forEach(([digit, name]) => {
            if (/^[0-9]$/.test(String(digit))) {
                emitDigit(String(digit), name || '');
            }
        });
        for (let d = 0; d <= 9; d++) {
            const ds = String(d);
            if (!seenOutputByCat.has(`numbers_${numberSystem.digitGlyphs?.[ds] || ds}`)) {
                emitDigit(ds, '');
            }
        }

        // 7. Standard Punctuation & Symbols (digits omitted — handled in numbers above)
        const STD_PUNCT = "[]{}|;:'\",.<>/?-=_+`~!@#$%^&*()".split("");
        STD_PUNCT.forEach(p => {
            addUnique({
                id: `punct_${p}`,
                char: p,
                unicode: p,
                label: p,
                category: 'punctuation',
                hasGlyph: false
            });
        });

        return items;
    }, [
        currentScriptData, currentScript, selectedScriptId, isDefaultScript, scriptType,
        legacyConsonants, legacyVowels, legacyOther, allChars, alphabetGlyphs, configState, lexicon, parsePhonemes
    ]);

    // Available categories
    const categoryCounts = useMemo(() => {
        const counts = { all: availableItems.length };
        availableItems.forEach(it => {
            counts[it.category] = (counts[it.category] || 0) + 1;
        });
        return counts;
    }, [availableItems]);

    const filteredItems = useMemo(() => {
        let list = availableItems;
        if (activeCategory !== 'all') {
            list = list.filter(it => it.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(it => 
                (it.char && it.char.toLowerCase().includes(q)) ||
                (it.label && it.label.toLowerCase().includes(q)) ||
                (it.unicode && it.unicode.includes(q))
            );
        }
        return list;
    }, [availableItems, activeCategory, searchQuery]);

    // Check where a character is mapped
    const getMappedKeysForChar = useCallback((unicodeOrChar) => {
        if (!unicodeOrChar) return [];
        const hits = [];
        Object.entries(mappings).forEach(([vk, m]) => {
            if (m.base === unicodeOrChar) hits.push(`${vk} (Base)`);
            if (m.shift === unicodeOrChar) hits.push(`${vk} (Shift)`);
            if (m.altgr === unicodeOrChar) hits.push(`${vk} (AltGr)`);
        });
        return hits;
    }, [mappings]);

    // Keyboard key click handler
    const handleKeyClick = (keyDef) => {
        if (keyDef.toggle === 'shift') {
            setActiveLayer(prev => prev === 'shift' ? 'base' : 'shift');
            return;
        }
        if (keyDef.toggle === 'altgr') {
            setActiveLayer(prev => prev === 'altgr' ? 'base' : 'altgr');
            return;
        }
        if (keyDef.special) return;

        setSelectedKey(keyDef);
    };

    // Assign character to selected key
    const handleAssignChar = (item) => {
        if (!selectedKey) {
            // If no key selected, pick the first assignable key that is empty on this layer
            const emptyKey = ASSIGNABLE_KEYS_HOME_FIRST.find(k => {
                const cur = mappings[k]?.[activeLayer];
                return !cur || cur === '-1';
            });
            if (emptyKey) {
                const newMapping = {
                    ...(mappings[emptyKey] || { base: '-1', shift: '-1', altgr: '-1' }),
                    [activeLayer]: item ? item.unicode : '-1'
                };
                setMappings(prev => ({ ...prev, [emptyKey]: newMapping }));
                toast.success(t('keyboardManager.assignedToKey', { defaultValue: `Assigned to ${emptyKey} (${activeLayer})` }));
                setSelectedKey({ vk: emptyKey, label: emptyKey });
            } else {
                toast.error(t('keyboardManager.selectKeyFirst', { defaultValue: 'Please select a key on the keyboard first.' }));
            }
            return;
        }

        const vk = selectedKey.vk;
        const currentMapping = mappings[vk] || { base: '-1', shift: '-1', altgr: '-1' };
        const newMapping = {
            ...currentMapping,
            [activeLayer]: item ? item.unicode : '-1'
        };

        setMappings(prev => ({
            ...prev,
            [vk]: newMapping
        }));

        // Advance to next key in row for fast successive mapping
        const allKeys = ASSIGNABLE_KEYS_HOME_FIRST;
        const curIdx = allKeys.indexOf(vk);
        if (curIdx >= 0 && curIdx < allKeys.length - 1) {
            const nextVk = allKeys[curIdx + 1];
            setSelectedKey({ vk: nextVk, label: nextVk });
        }
    };

    const handleClearSelectedKey = () => {
        if (!selectedKey) return;
        const vk = selectedKey.vk;
        const currentMapping = mappings[vk] || { base: '-1', shift: '-1', altgr: '-1' };
        setMappings(prev => ({
            ...prev,
            [vk]: {
                ...currentMapping,
                [activeLayer]: '-1'
            }
        }));
    };

    const handleResetSelectedKey = () => {
        if (!selectedKey) return;
        const vk = selectedKey.vk;
        const def = QWERTY_DEFAULTS[vk] || { base: '', shift: '' };
        const currentMapping = mappings[vk] || { base: '-1', shift: '-1', altgr: '-1' };
        setMappings(prev => ({
            ...prev,
            [vk]: {
                ...currentMapping,
                [activeLayer]: def[activeLayer] || '-1'
            }
        }));
    };

    // Auto-Distribute triggers
    const handleRunDistribute = (strategy) => {
        setShowDistributeMenu(false);
        const next = distributeLetters(availableItems, {
            strategy,
            existingMappings: mappings,
            preserveExisting: strategy === 'fill_unmapped',
            scriptType
        });
        setMappings(next);

        let mappedCount = 0;
        Object.values(next).forEach(m => {
            if (m.base && m.base !== '-1') mappedCount++;
            if (m.shift && m.shift !== '-1') mappedCount++;
            if (m.altgr && m.altgr !== '-1') mappedCount++;
        });

        toast.success(t('keyboardManager.autoDistributeSuccess', { 
            count: mappedCount,
            defaultValue: `Auto-distributed ${mappedCount} character mappings!`
        }));
    };

    const handleClearAllMappings = () => {
        setShowDistributeMenu(false);
        const blank = {};
        ASSIGNABLE_KEYS_HOME_FIRST.forEach(vk => {
            blank[vk] = { base: '-1', shift: '-1', altgr: '-1' };
        });
        setMappings(blank);
        toast.success(t('keyboardManager.clearedAll', { defaultValue: 'Cleared all key mappings.' }));
    };

    const handleResetToQwerty = () => {
        setShowDistributeMenu(false);
        const reset = {};
        Object.entries(QWERTY_DEFAULTS).forEach(([vk, def]) => {
            reset[vk] = { base: def.base, shift: def.shift, altgr: '-1' };
        });
        setMappings(reset);
        toast.success(t('keyboardManager.resetQwertyDone', { defaultValue: 'Reset keyboard to default US QWERTY.' }));
    };

    // JSON Backup / Restore
    const handleExportJson = () => {
        exportJSON(scriptName, mappings, { scriptId: selectedScriptId, scriptType });
    };

    const handleImportJsonFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.mappings && typeof parsed.mappings === 'object') {
                    setMappings(parsed.mappings);
                    toast.success(t('keyboardManager.importSuccess', { defaultValue: 'Imported keyboard layout successfully!' }));
                } else {
                    toast.error(t('keyboardManager.invalidFile', { defaultValue: 'Invalid keyboard layout JSON format.' }));
                }
            } catch {
                toast.error(t('keyboardManager.readError', { defaultValue: 'Could not parse JSON file.' }));
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="km-root">
            {/* Top Toolbar */}
            <div className="km-toolbar">
                {/* Script selector */}
                <div className="km-tool-group">
                    <label className="km-tool-label">
                        <Globe size={14} />
                        <span>{t('keyboardManager.selectScript', { defaultValue: 'Script' })}:</span>
                    </label>
                    <select 
                        className="km-select"
                        value={selectedScriptId}
                        onChange={(e) => handleScriptChange(e.target.value)}
                    >
                        {scriptSystems.length > 0 ? (
                            scriptSystems.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.type || 'alphabetic'})
                                </option>
                            ))
                        ) : (
                            <option value="default">{scriptName} ({scriptType})</option>
                        )}
                    </select>
                </div>

                {/* Layer Switcher Tabs */}
                <div className="km-layer-tabs">
                    <button 
                        type="button"
                        className={`km-layer-tab ${activeLayer === 'base' ? 'active' : ''}`}
                        onClick={() => setActiveLayer('base')}
                    >
                        <Layers size={14} />
                        {t('keyboardManager.layerBase', { defaultValue: 'Normal (Base)' })}
                    </button>
                    <button 
                        type="button"
                        className={`km-layer-tab ${activeLayer === 'shift' ? 'active' : ''}`}
                        onClick={() => setActiveLayer('shift')}
                    >
                        {t('keyboardManager.layerShift', { defaultValue: 'Shift' })}
                    </button>
                    <button 
                        type="button"
                        className={`km-layer-tab ${activeLayer === 'altgr' ? 'active' : ''}`}
                        onClick={() => setActiveLayer('altgr')}
                    >
                        {t('keyboardManager.layerAltGr', { defaultValue: 'AltGr / Option' })}
                    </button>
                </div>

                {/* Auto-Distribute Dropdown */}
                <div className="km-tool-group km-dropdown-anchor">
                    <Button 
                        variant="imp" 
                        size="sm"
                        className="km-btn-with-icon"
                        onClick={() => setShowDistributeMenu(prev => !prev)}
                    >
                        <Sparkles size={15} />
                        {t('keyboardManager.autoDistribute', { defaultValue: 'Auto-Distribute' })}
                        <ChevronDown size={14} />
                    </Button>

                    {showDistributeMenu && (
                        <div className="km-dropdown-menu animate-in fade-in zoom-in-95 duration-150">
                            <button 
                                type="button" 
                                className="km-dropdown-item"
                                onClick={() => handleRunDistribute('smart_phonetic')}
                            >
                                <Wand2 size={15} />
                                <div>
                                    <span className="km-item-title">{t('keyboardManager.autoDistributePhonetic', { defaultValue: 'Smart Phonetic Match' })}</span>
                                    <span className="km-item-sub">{t('keyboardManager.autoDistributePhoneticDesc', { defaultValue: 'Matches letters/syllables to natural QWERTY keys' })}</span>
                                </div>
                            </button>
                            <button 
                                type="button" 
                                className="km-dropdown-item"
                                onClick={() => handleRunDistribute('sequential')}
                            >
                                <Layers size={15} />
                                <div>
                                    <span className="km-item-title">{t('keyboardManager.autoDistributeSequential', { defaultValue: 'Sequential Home-Row Fill' })}</span>
                                    <span className="km-item-sub">{t('keyboardManager.autoDistributeSequentialDesc', { defaultValue: 'Fills keys in natural ergonomic order across layers' })}</span>
                                </div>
                            </button>
                            <button 
                                type="button" 
                                className="km-dropdown-item"
                                onClick={() => handleRunDistribute('fill_unmapped')}
                            >
                                <Check size={15} />
                                <div>
                                    <span className="km-item-title">{t('keyboardManager.autoDistributeFillEmpty', { defaultValue: 'Fill Unmapped Only' })}</span>
                                    <span className="km-item-sub">{t('keyboardManager.autoDistributeFillEmptyDesc', { defaultValue: 'Preserves your custom keys, fills remaining slots' })}</span>
                                </div>
                            </button>
                            <div className="km-dropdown-divider" />
                            <button 
                                type="button" 
                                className="km-dropdown-item"
                                onClick={handleResetToQwerty}
                            >
                                <RotateCcw size={15} />
                                <span>{t('keyboardManager.resetQwerty', { defaultValue: 'Reset to US QWERTY' })}</span>
                            </button>
                            <button 
                                type="button" 
                                className="km-dropdown-item danger"
                                onClick={handleClearAllMappings}
                            >
                                <Trash2 size={15} />
                                <span>{t('keyboardManager.clearAll', { defaultValue: 'Clear All Mappings' })}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Exporters */}
                <div className="km-export-group">
                    <Button
                        variant="sec"
                        size="sm"
                        title={t('keyboardManager.windowsInstallerTooltip', { defaultValue: 'Download 2-click Windows Installer (.zip) + .klc' })}
                        onClick={() => {
                            exportWindowsInstaller(scriptName, mappings);
                            toast.success(t('keyboardManager.windowsInstallerToast', {
                                defaultValue: 'ZIP downloaded! Extract it and double-click Install_*.bat to run.'
                            }));
                        }}
                    >
                        <Download size={14} /> {t('keyboardManager.windowsInstallerBtn', { defaultValue: 'Windows (Installer .zip)' })}
                    </Button>
                    <Button
                        variant="sec"
                        size="sm"
                        title={t('keyboardManager.windowsKlcTooltip', { defaultValue: 'Export raw MSKLC source (.klc)' })}
                        onClick={() => exportKLC(scriptName, mappings)}
                    >
                        <Download size={14} /> .klc
                    </Button>
                    <Button variant="sec" size="sm" onClick={() => exportMac(scriptName, mappings)}>
                        <Download size={14} /> macOS (.keylayout)
                    </Button>
                    <Button variant="sec" size="sm" onClick={() => exportLinux(scriptName, mappings)}>
                        <Download size={14} /> Linux (XKB)
                    </Button>
                    <Button variant="sec" size="sm" onClick={handleExportJson} title="Backup JSON">
                        <FileJson size={14} />
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".json" 
                        onChange={handleImportJsonFile} 
                    />
                    <Button variant="sec" size="sm" onClick={() => fileInputRef.current?.click()} title="Import JSON">
                        <Upload size={14} />
                    </Button>
                </div>
            </div>

            {/* Interactive Physical Keyboard */}
            <div className="km-keyboard-wrapper">
                <div className="km-keyboard">
                    {QWERTY_ROWS.map((row, rIdx) => (
                        <div key={rIdx} className="km-row">
                            {row.map(k => {
                                const mapping = mappings[k.vk] || { base: '-1', shift: '-1', altgr: '-1' };
                                const val = mapping[activeLayer] !== '-1' && mapping[activeLayer] !== undefined
                                    ? mapping[activeLayer]
                                    : (QWERTY_DEFAULTS[k.vk]?.[activeLayer] || '');
                                const isMapped = val && val !== '-1';
                                const isSelected = selectedKey?.vk === k.vk;

                                const hasShift = mapping.shift && mapping.shift !== '-1';
                                const hasAltgr = mapping.altgr && mapping.altgr !== '-1';

                                return (
                                    <div
                                        key={k.vk}
                                        className={`km-key ${k.cls || ''} ${k.special ? 'special' : ''} ${k.space ? 'space' : ''} ${isSelected ? 'selected' : ''} ${isMapped ? 'mapped' : ''} ${k.toggle === activeLayer ? 'active-toggle' : ''}`}
                                        onClick={() => handleKeyClick(k)}
                                        title={`${k.label}: ${isMapped ? val : 'Unmapped'}`}
                                    >
                                        <span className="km-key-hint">{k.label}</span>
                                        {isMapped && !k.special && (
                                            <span
                                                className={`km-key-val custom-font-text conlang-script-${selectedScriptId} notranslate`}
                                                style={{ writingMode: 'horizontal-tb', direction: scriptWritingDirection === 'rtl' ? 'rtl' : 'ltr' }}
                                            >
                                                {val}
                                            </span>
                                        )}
                                        {/* Layer status indicators */}
                                        {!k.special && (
                                            <div className="km-key-dots">
                                                {hasShift && <span className="km-dot shift" title="Shift layer set" />}
                                                {hasAltgr && <span className="km-dot altgr" title="AltGr layer set" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Character Palette Panel */}
            <div className="km-palette-panel">
                <div className="km-palette-header">
                    <div className="km-palette-title-area">
                        <span className="km-palette-heading">
                            {selectedKey ? (
                                <>
                                    {t('keyboardManager.assigningTo', { defaultValue: 'Assigning to Key' })}: 
                                    <strong className="km-key-tag">{selectedKey.label}</strong>
                                    <span className="km-layer-tag">({activeLayer.toUpperCase()})</span>
                                </>
                            ) : (
                                <span className="km-hint-text">
                                    {t('keyboardManager.selectAKey', { defaultValue: 'Click a key on the keyboard above, then click any character below to map it.' })}
                                </span>
                            )}
                        </span>
                        {selectedKey && (
                            <div className="km-key-actions">
                                <button type="button" className="km-action-btn" onClick={handleResetSelectedKey}>
                                    <RotateCcw size={13} /> {t('keyboardManager.resetKey', { defaultValue: 'Default QWERTY' })}
                                </button>
                                <button type="button" className="km-action-btn danger" onClick={handleClearSelectedKey}>
                                    <Trash2 size={13} /> {t('keyboardManager.clearKey', { defaultValue: 'Clear' })}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Search & Categories */}
                    <div className="km-search-bar">
                        <Search size={15} className="km-search-icon" />
                        <input 
                            type="text" 
                            className="km-search-input"
                            placeholder={t('keyboardManager.searchPlaceholder', { defaultValue: 'Filter characters, syllables, glosses...' })}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button type="button" className="km-clear-search" onClick={() => setSearchQuery('')}>
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                <div className="km-category-pills">
                    {['all', 'letters', 'syllables', 'logographs', 'blocks', 'numbers', 'punctuation'].map(cat => {
                        const count = categoryCounts[cat] || 0;
                        if (cat !== 'all' && count === 0) return null;
                        const labelKey = `keyboardManager.cat${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
                        return (
                            <button
                                key={cat}
                                type="button"
                                className={`km-pill ${activeCategory === cat ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat)}
                            >
                                {t(labelKey, { defaultValue: cat.charAt(0).toUpperCase() + cat.slice(1) })}
                                <span className="km-pill-count">{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Character Cards Grid */}
                <div className="km-cards-grid">
                    {filteredItems.map(item => {
                        const mappedTo = getMappedKeysForChar(item.unicode);
                        const isMappedSomewhere = mappedTo.length > 0;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`km-char-card ${isMappedSomewhere ? 'already-mapped' : ''}`}
                                onClick={() => handleAssignChar(item)}
                                title={`${item.label} (${item.unicode}) ${isMappedSomewhere ? `— ${mappedTo.join(', ')}` : ''}`}
                            >
                                <span
                                    className={`km-char-glyph custom-font-text conlang-script-${selectedScriptId} notranslate`}
                                    style={{ writingMode: 'horizontal-tb', direction: scriptWritingDirection === 'rtl' ? 'rtl' : 'ltr' }}
                                >
                                    {item.unicode}
                                </span>
                                <span className="km-char-meta">
                                    {item.phoneme && item.phoneme !== item.char ? `${item.char} (${item.phoneme})` : (item.char || item.label)}
                                </span>
                                {isMappedSomewhere && (
                                    <span className="km-char-badge" title={mappedTo.join(', ')}>
                                        ✓
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="km-empty-state">
                            <p>{t('keyboardManager.noCharactersFound', { defaultValue: 'No matching characters found for this filter.' })}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
