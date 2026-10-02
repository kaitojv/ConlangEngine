import React, { useState, useMemo } from 'react';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { generateCourseExercise } from '@/utils/courseGenerator.js';
import { resolveWordStrokes } from '@/utils/strokeOrderResolver.js';
import AudioRecorder from './AudioRecorder.jsx';
import ExercisePlayer from './ExercisePlayer.jsx';
import { Plus, Trash2, Save, ArrowLeft, ArrowRight, ArrowUp, Wand2, X, Play, ChevronUp, ChevronDown, ChevronRight, Search, Mic, Volume2, AlertTriangle, Bold, Italic, Underline, Smile, Zap, Star, Crown, Book, Brain, Flame, Dumbbell, Sword, Shield, Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import './courseBuilder.css';

const COMMON_ICONS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Heart', 'Star', 'Check', 'X', 'AlertCircle', 'Info', 'Book', 'Brain', 'Volume2', 'Ear', 'Eye', 'Pencil', 'Flame', 'Sparkles', 'ThumbsUp', 'Coffee', 'Globe', 'Music', 'MessageCircle', 'Lightbulb', 'Zap', 'Shield', 'Smile'];

const PHRASE_TYPES = [
    'translate_to_english', 'translate_to_conlang', 'word_bank', 'multiple_choice',
    'matching_pairs', 'teach', 'listening', 'fill_blank', 'sentence_reorder',
    'picture_match', 'true_false', 'conjugation_drill', 'glyph_drawing'
];

const TYPE_LABELS = {
    translate_to_english: 'English Typing',
    translate_to_conlang: 'Conlang Typing',
    word_bank: 'Word Bank',
    multiple_choice: 'Multiple Choice',
    matching_pairs: 'Matching Pairs',
    teach: 'Teaching Card',
    listening: 'Listening Exercise',
    fill_blank: 'Fill-in-the-Blank',
    sentence_reorder: 'Sentence Reorder',
    picture_match: 'Picture Match',
    true_false: 'True or False',
    conjugation_drill: 'Conjugation Drill',
    glyph_drawing: 'Draw the Glyph'
};

// Pronunciation only makes sense where the learner actually reads/hears the
// conlang text. Info cards, pair grids and emoji prompts have nothing to speak.
const AUDIO_NEVER_TYPES = new Set(['teach', 'matching_pairs', 'picture_match']);
// These exercise types are pointless to the learner without hearing them.
const AUDIO_ALWAYS_TYPES = new Set(['listening', 'glyph_drawing']);

const supportsAudio = (phrase) => !AUDIO_NEVER_TYPES.has(phrase?.type || 'translate_to_english');

// A short, single-line summary of a phrase for its collapsed row.
const phraseSummary = (phrase) => {
    const type = phrase.type || 'translate_to_english';
    if (type === 'teach') return (phrase.english || 'Empty teaching card').replace(/\s+/g, ' ').slice(0, 70);
    if (type === 'matching_pairs') {
        const filled = (phrase.pairs || []).filter(p => p?.conlang || p?.english).length;
        return `${filled} of 4 pairs filled`;
    }
    const left = (phrase.conlang || '—').trim();
    const right = (phrase.english || '').trim();
    return right ? `${left} → ${right}` : left;
};

// Flags content a learner would find broken if it shipped as-is.
const phraseIssues = (phrase) => {
    const issues = [];
    const type = phrase.type || 'translate_to_english';
    if (type === 'teach') {
        if (!(phrase.english || '').trim()) issues.push('No teaching content');
    } else if (type === 'matching_pairs') {
        if (!(phrase.pairs || []).every(p => (p?.conlang || '').trim() && (p?.english || '').trim())) {
            issues.push('Incomplete pairs');
        }
    } else if (type === 'multiple_choice') {
        if (!(phrase.options || []).filter(Boolean).length) issues.push('No distractor options');
    } else if (type === 'picture_match') {
        if (!(phrase.conlang || '').trim()) issues.push('No image/emoji');
    } else {
        if (!(phrase.conlang || '').trim()) issues.push('Missing conlang text');
        // A blank target makes the exercise unanswerable.
        if (['translate_to_english', 'true_false', 'listening'].includes(type) && !(phrase.english || '').trim()) {
            issues.push('Missing answer');
        }
    }
    return issues;
};

const TextcardEditor = ({ value, onChange }) => {
    const textareaRef = React.useRef(null);
    const [showIcons, setShowIcons] = React.useState(false);

    const insertText = (before, after = '') => {
        const el = textareaRef.current;
        if (!el) {
            onChange(value + before + after);
            return;
        }
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newText = value.substring(0, start) + before + value.substring(start, end) + after + value.substring(end);
        onChange(newText);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    return (
        <div style={{ border: '1px solid var(--bd)', borderRadius: '8px', background: 'var(--bg)', overflow: 'visible' }}>
            <div style={{ display: 'flex', gap: '5px', padding: '5px', borderBottom: '1px solid var(--bd)', background: 'var(--s1)', position: 'relative' }}>
                <Button variant="default" style={{ padding: '5px', height: 'auto' }} onClick={() => insertText('**', '**')} title="Bold"><Bold size={16} /></Button>
                <Button variant="default" style={{ padding: '5px', height: 'auto' }} onClick={() => insertText('*', '*')} title="Italic"><Italic size={16} /></Button>
                <Button variant="default" style={{ padding: '5px', height: 'auto' }} onClick={() => insertText('__', '__')} title="Underline"><Underline size={16} /></Button>
                <Button variant="default" style={{ padding: '5px', height: 'auto' }} onClick={() => insertText('→')} title="Arrow"><LucideIcons.ArrowRight size={16} /></Button>
                <Button variant="default" style={{ padding: '5px', height: 'auto' }} onClick={() => setShowIcons(!showIcons)} title="Insert Icon"><Smile size={16} /></Button>
                
                {showIcons && (
                    <div style={{ position: 'absolute', top: '100%', left: '0', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: '8px', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '5px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', marginTop: '5px' }}>
                        {COMMON_ICONS.map(icon => {
                            const IconCmp = LucideIcons[icon];
                            return (
                                <button key={icon} onClick={() => { insertText(`[icon:${icon}]`); setShowIcons(false); }} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '4px', padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx)' }} title={icon}>
                                    {IconCmp && <IconCmp size={18} />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
            <textarea 
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. In this lesson, we will learn about... (Line breaks supported)"
                className="custom-font-text notranslate"
                style={{ width: '100%', height: '100px', padding: '10px', border: 'none', background: 'transparent', color: 'var(--tx)', resize: 'vertical', outline: 'none' }}
            />
        </div>
    );
};

const IconSelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
        const handleClick = (e) => { if(ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const options = [
        { value: 'Zap', icon: Zap },
        { value: 'Star', icon: Star },
        { value: 'Crown', icon: Crown },
        { value: 'Book', icon: Book },
        { value: 'Brain', icon: Brain },
        { value: 'Flame', icon: Flame },
        { value: 'Dumbbell', icon: Dumbbell },
        { value: 'Sword', icon: Sword },
        { value: 'Shield', icon: Shield },
    ];

    const currentOpt = options.find(o => o.value === value) || options[0];
    const CurrentIcon = currentOpt.icon;

    return (
        <div ref={ref} style={{ position: 'relative', minWidth: '120px' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '100%', userSelect: 'none' }}
                title="Node Icon"
            >
                <CurrentIcon size={16} color="var(--acc)" /> <span style={{flex: 1}}>{currentOpt.value}</span> <ChevronDown size={14} style={{ opacity: 0.5 }} />
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: '6px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', maxHeight: '200px', overflowY: 'auto' }}>
                    {options.map(opt => {
                        const OptIcon = opt.icon;
                        return (
                            <div 
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: value === opt.value ? 'var(--s1)' : 'transparent', userSelect: 'none' }}
                            >
                                <OptIcon size={16} color="var(--acc)" /> {opt.value}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

const ColorSelect = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
        const handleClick = (e) => { if(ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const options = [
        { value: 'var(--acc)', label: 'Default' },
        { value: '#3b82f6', label: 'Blue' },
        { value: '#10b981', label: 'Green' },
        { value: '#f59e0b', label: 'Yellow' },
        { value: '#ef4444', label: 'Red' },
        { value: '#8b5cf6', label: 'Purple' },
        { value: '#ec4899', label: 'Pink' },
    ];

    const currentOpt = options.find(o => o.value === value) || options[0];

    return (
        <div ref={ref} style={{ position: 'relative', minWidth: '130px' }}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '100%', userSelect: 'none' }}
                title="Node Color"
            >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: currentOpt.value === 'var(--acc)' ? 'var(--acc)' : currentOpt.value }} /> <span style={{flex: 1}}>{currentOpt.label}</span> <ChevronDown size={14} style={{ opacity: 0.5 }} />
            </div>
            {isOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: '6px', zIndex: 10, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    {options.map(opt => (
                        <div 
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: value === opt.value ? 'var(--s1)' : 'transparent', userSelect: 'none' }}
                        >
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.value === 'var(--acc)' ? 'var(--acc)' : opt.value }} /> {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CourseBuilder({ onExit }) {
    const config = useConfigStore();
    const customCourse = config.customCourse || [];
    const updateConfig = config.updateConfig;
    const lexicon = useLexiconStore((state) => state.lexicon);

    const [courseData, setCourseData] = useState(customCourse);
    const [showAutoModal, setShowAutoModal] = useState(false);
    const [numLevelsToGen, setNumLevelsToGen] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewLevel, setPreviewLevel] = useState(null);
    const [genMode, setGenMode] = useState('theme');

    // --- Editor UI state -----------------------------------------------------
    // Levels are collapsed by default so a 50-level course is scannable instead
    // of one endless wall of expanded cards. The set is seeded with the ids of
    // every level that already exists, which is what actually collapses them on
    // open - an empty set here leaves them all expanded. Ids are only ever added
    // to this set, so a level the user has expanded stays expanded.
    const [collapsedLevels, setCollapsedLevels] = useState(
        () => new Set((customCourse || []).map(l => l.id))
    );
    // Phrases start expanded: they are the actual editing surface, and a freshly
    // added phrase must never be hidden behind a collapsed card.
    const [collapsedPhrases, setCollapsedPhrases] = useState(() => new Set());
    // Audio is opt-in per phrase unless the exercise type needs it.
    const [audioOpen, setAudioOpen] = useState(() => new Set());
    const [search, setSearch] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    const toggleInSet = (setter, id) => {
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleLevel = (id) => toggleInSet(setCollapsedLevels, id);
    const togglePhrase = (id) => toggleInSet(setCollapsedPhrases, id);

    const allCollapsed = courseData.length > 0 && courseData.every(l => collapsedLevels.has(l.id));

    const toggleAllLevels = () => {
        setCollapsedLevels(prev => {
            const everyClosed = courseData.length > 0 && courseData.every(l => prev.has(l.id));
            return everyClosed ? new Set() : new Set(courseData.map(l => l.id));
        });
    };

    // Search filters both levels and the phrases inside them, so a phrase can be
    // found without expanding the level that holds it.
    const visibleData = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return courseData;
        return courseData
            .map(level => ({
                ...level,
                phrases: (level.phrases || []).filter(p =>
                    phraseSummary(p).toLowerCase().includes(q) ||
                    TYPE_LABELS[p.type || 'translate_to_english'].toLowerCase().includes(q)
                )
            }))
            .filter(level =>
                (level.title || '').toLowerCase().includes(q) ||
                (level.phrases || []).length > 0
            );
    }, [courseData, search]);

    const totalIssues = useMemo(
        () => courseData.reduce((n, l) => n + (l.phrases || []).filter(p => phraseIssues(p).length).length, 0),
        [courseData]
    );

    // Any mutation marks the course dirty so Save can advertise unsaved work.
    const mutate = (updater) => {
        setCourseData(updater);
        setIsDirty(true);
    };

    const duplicateLevel = (id) => {
        const levelToCopy = courseData.find(l => l.id === id);
        if (levelToCopy) {
            const newLevel = {
                ...levelToCopy,
                id: `level-${Date.now()}`,
                title: `${levelToCopy.title} (Copy)`,
                phrases: levelToCopy.phrases.map((p, i) => ({ ...p, id: `phrase-${Date.now()}-${i}` }))
            };
            const idx = courseData.findIndex(l => l.id === id);
            const newData = [...courseData];
            newData.splice(idx + 1, 0, newLevel);
            // Mirror the source level's open/closed state so a copy behaves like
            // the card it came from.
            setCollapsedLevels(prev => {
                const next = new Set(prev);
                if (prev.has(id)) next.add(newLevel.id); else next.delete(newLevel.id);
                return next;
            });
            mutate(newData);
        }
    };

    const moveLevel = (id, direction) => {
        const idx = courseData.findIndex(l => l.id === id);
        if (idx === -1) return;
        const newData = [...courseData];
        if (direction === 'up' && idx > 0) {
            [newData[idx - 1], newData[idx]] = [newData[idx], newData[idx - 1]];
            mutate(newData);
        } else if (direction === 'down' && idx < newData.length - 1) {
            [newData[idx + 1], newData[idx]] = [newData[idx], newData[idx + 1]];
            mutate(newData);
        }
    };

    const exportCourse = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(courseData, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = "conlang_course.json";
        a.click();
    };

    const importCourse = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    // An imported course replaces the level set entirely, so the
                    // collapse set has to be rebuilt to match the new ids.
                    setCollapsedLevels(new Set(parsed.map(l => l.id).filter(Boolean)));
                    mutate(parsed);
                } else {
                    alert("Invalid course format");
                }
            } catch {
                alert("Invalid JSON file");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const addLevel = () => {
        const newLevel = {
            id: `level-${Date.now()}`,
            title: `Level ${courseData.length + 1}`,
            lessonNotes: '',
            phrases: []
        };
        // A brand new level is opened for editing rather than left hidden behind
        // the collapse that every pre-existing level starts in.
        setCollapsedLevels(prev => {
            const next = new Set(prev);
            next.delete(newLevel.id);
            return next;
        });
        mutate([...courseData, newLevel]);
    };

    const handleAutoGenerate = async () => {
        setIsGenerating(true);
        await new Promise(r => setTimeout(r, 100)); // UI update delay

        const THEMES = ['Basics', 'Animals', 'Family', 'People', 'Food', 'Colors', 'Feelings', 'Size', 'Misc'];
        const allTags = [...new Set(lexicon.flatMap(w => w.tags || []))].filter(Boolean);
        const SOURCES = (genMode === 'tag' && allTags.length > 0) ? allTags : THEMES;
        
        const newLevels = [];
        let currentId = Date.now();

        for (let i = 0; i < numLevelsToGen; i++) {
            const theme = SOURCES[i % SOURCES.length];
            const phrases = [];
            
            for(let p = 0; p < 5; p++) {
                const types = ['translate_to_english', 'translate_to_conlang', 'word_bank', 'multiple_choice', 'matching_pairs'];
                let type = types[Math.floor(Math.random() * types.length)];
                
                let phraseData = {
                    id: `phrase-${currentId++}`,
                    type,
                    conlang: '',
                    english: '',
                    options: ['', '', ''],
                    distractors: '',
                    pairs: [{conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}]
                };

                if (type === 'multiple_choice') {
                    const validWords = [...lexicon].filter(w => w.word && w.translation && w.tags.includes(theme));
                    const fallbackWords = [...lexicon].filter(w => w.word && w.translation);
                    const pool = validWords.length > 0 ? validWords : fallbackWords;
                    
                    const word = pool.sort(() => 0.5 - Math.random())[0];
                    if (word) {
                        phraseData.conlang = word.word;
                        phraseData.english = word.translation.split(/[,(]/)[0].trim();
                        const wrong = fallbackWords.filter(w => w.translation !== word.translation).sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.translation.split(/[,(]/)[0].trim());
                        phraseData.options = [wrong[0] || '', wrong[1] || '', wrong[2] || ''];
                        phrases.push(phraseData);
                    }
                    continue;
                }

                if (type === 'matching_pairs') {
                    const pairs = [...lexicon].filter(w => w.word && w.translation).sort(() => 0.5 - Math.random()).slice(0, 4).map(w => ({ conlang: w.word, english: w.translation.split(/[,(]/)[0].trim() }));
                    if (pairs.length === 4) {
                        phraseData.pairs = pairs;
                        phraseData.conlang = "Match the pairs";
                        phraseData.english = "Match the pairs";
                        phrases.push(phraseData);
                    }
                    continue;
                }

                const exercise = generateCourseExercise(theme, lexicon, config);
                if (exercise && exercise.conlangSentence) {
                    phraseData.conlang = exercise.conlangSentence;
                    phraseData.english = exercise.englishSentence;
                    if (type === 'word_bank') {
                        const distractors = [...lexicon].sort(() => 0.5 - Math.random()).slice(0, 2).map(w => w.word);
                        phraseData.distractors = distractors.join(', ');
                    }
                    phrases.push(phraseData);
                } else {
                    phraseData.type = 'translate_to_english';
                    phraseData.conlang = '???';
                    phraseData.english = `Missing vocabulary for ${theme} sentences`;
                    phrases.push(phraseData);
                }
            }

            newLevels.push({
                id: `level-${currentId++}`,
                title: `${theme} ${Math.floor(i / THEMES.length) + 1}`,
                lessonNotes: '',
                phrases
            });
        }

        mutate([...courseData, ...newLevels]);
        // Auto-generate drops in several levels at once, so they start collapsed
        // like any other level. Expanding one is a single click.
        setCollapsedLevels(prev => {
            const next = new Set(prev);
            newLevels.forEach(l => next.add(l.id));
            return next;
        });
        setIsGenerating(false);
        setShowAutoModal(false);
    };

    const deleteLevel = (id) => {
        const level = courseData.find(l => l.id === id);
        const label = level?.title || 'Untitled Level';
        const count = level?.phrases?.length || 0;
        const detail = count
            ? ` and its ${count} phrase${count === 1 ? '' : 's'}`
            : '';
        // Deleting a level is unrecoverable without a save/reload, so confirm.
        if (!window.confirm(`Delete "${label}"${detail}?`)) return;
        mutate(courseData.filter(l => l.id !== id));
    };

    const updateLevelTitle = (id, newTitle) => {
        mutate(courseData.map(l => l.id === id ? { ...l, title: newTitle } : l));
    };

    const updateLevelField = (id, field, value) => {
        mutate(courseData.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const addPhrase = (levelId) => {
        // A freshly added phrase is opened for editing rather than left hidden.
        const id = `phrase-${Date.now()}`;
        setCollapsedPhrases(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
        mutate(courseData.map(l => {
            if (l.id === levelId) {
                return {
                    ...l,
                    phrases: [...l.phrases, { 
                        id,
                        type: 'translate_to_english', 
                        conlang: '', 
                        english: '',
                        options: ['', '', ''],
                        distractors: '',
                        audioPath: '',
                        checkOrder: true,
                        showGuide: false,
                        pairs: [{conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}]
                    }]
                };
            }
            return l;
        }));
    };

    const deletePhrase = (levelId, phraseId) => {
        mutate(courseData.map(l => {
            if (l.id === levelId) {
                return {
                    ...l,
                    phrases: l.phrases.filter(p => p.id !== phraseId)
                };
            }
            return l;
        }));
    };

    const movePhrase = (levelId, pIdx, direction) => {
        mutate(courseData.map(l => {
            if (l.id === levelId) {
                const newPhrases = [...l.phrases];
                if (direction === 'up' && pIdx > 0) {
                    [newPhrases[pIdx - 1], newPhrases[pIdx]] = [newPhrases[pIdx], newPhrases[pIdx - 1]];
                } else if (direction === 'down' && pIdx < newPhrases.length - 1) {
                    [newPhrases[pIdx + 1], newPhrases[pIdx]] = [newPhrases[pIdx], newPhrases[pIdx + 1]];
                }
                return { ...l, phrases: newPhrases };
            }
            return l;
        }));
    };

    const updatePhrase = (levelId, phraseId, field, value) => {
        mutate(courseData.map(l => {
            if (l.id === levelId) {
                return {
                    ...l,
                    phrases: l.phrases.map(p => p.id === phraseId ? { ...p, [field]: value } : p)
                };
            }
            return l;
        }));
    };

    const saveCourse = () => {
        updateConfig({ customCourse: courseData });
        setIsDirty(false);
        onExit(); // return to map
    };

    return (
        <Card className="course-builder">
            <div className="cb-header">
                <div className="cb-header-title">
                    <Button variant="default" onClick={onExit} style={{ padding: '8px' }} title="Back to learning path">
                        <ArrowLeft size={18} />
                    </Button>
                    <h2 className="flex sg-title mb-0">Course Builder</h2>
                </div>
                <div className="cb-header-actions">
                    {isDirty && (
                        <span className="cb-dirty-badge" title="You have unsaved changes">
                            <span className="cb-dirty-dot" /> Unsaved changes
                        </span>
                    )}
                    <Button variant="imp" onClick={saveCourse}>
                        <Save size={16} /> Save Course
                    </Button>
                </div>
            </div>

            <div className="cb-intro">
                <p>Create your own Duolingo-style learning path! Add levels, and define the specific sentence translations you want to teach.</p>
            </div>

            <div className="cb-toolbar">
                <div className="cb-search">
                    <Search size={16} className="cb-search-icon" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search levels and phrases..."
                        className="cb-search-input notranslate"
                    />
                    {search && (
                        <button
                            type="button"
                            className="cb-search-clear"
                            onClick={() => setSearch('')}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="cb-toolbar-right">
                    {totalIssues > 0 && (
                        <span className="cb-issue-badge" title="Phrases with missing or incomplete content">
                            <AlertTriangle size={14} /> {totalIssues} incomplete
                        </span>
                    )}
                    <Button
                        variant="default"
                        onClick={toggleAllLevels}
                        disabled={courseData.length === 0}
                        className="cb-toolbar-btn"
                    >
                        {allCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        {allCollapsed ? 'Expand all' : 'Collapse all'}
                    </Button>
                </div>
            </div>

            {visibleData.length === 0 && (
                <div className="cb-empty">
                    {search
                        ? `No levels or phrases match "${search}".`
                        : 'No levels yet. Create your first level to get started.'}
                </div>
            )}

            <div className="cb-levels">
                {visibleData.map((level) => {
                    const realIndex = courseData.findIndex(l => l.id === level.id);
                    // A search must always reveal its matches, never leave them
                    // hidden behind a collapsed card.
                    const levelCollapsed = !search && collapsedLevels.has(level.id);
                    const levelIssues = (level.phrases || []).filter(p => phraseIssues(p).length).length;
                    return (
                    <div key={level.id} className={`cb-level-card ${levelCollapsed ? 'is-collapsed' : ''}`}>
                        <div className="cb-level-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button onClick={() => moveLevel(level.id, 'up')} className="cb-move-phrase" title="Move Up">
                                    <ChevronUp size={18} />
                                </button>
                                <button onClick={() => moveLevel(level.id, 'down')} className="cb-move-phrase" title="Move Down">
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                            <button
                                type="button"
                                className="cb-level-toggle"
                                onClick={() => toggleLevel(level.id)}
                                aria-expanded={!levelCollapsed}
                                aria-controls={`cb-level-body-${level.id}`}
                            >
                                <span className="cb-level-chevron">
                                    {levelCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                </span>
                                <span className="cb-level-num">{realIndex + 1}</span>
                                <span className="cb-level-name">{level.title || 'Untitled Level'}</span>
                                <span className="cb-level-badges">
                                    <span className="cb-badge">
                                        {(level.phrases || []).length} phrase{(level.phrases || []).length === 1 ? '' : 's'}
                                    </span>
                                    {(level.prerequisites || []).length > 0 && (
                                        <span className="cb-badge cb-badge-muted">
                                            {(level.prerequisites || []).length} prereq
                                        </span>
                                    )}
                                    {levelIssues > 0 && (
                                        <span className="cb-badge cb-badge-warn">
                                            <AlertTriangle size={12} /> {levelIssues}
                                        </span>
                                    )}
                                </span>
                            </button>
                            <div className="cb-level-controls">
                            <IconSelect 
                                value={level.icon || 'Zap'}
                                onChange={(val) => updateLevelField(level.id, 'icon', val)}
                            />
                            <ColorSelect 
                                value={level.color || 'var(--acc)'}
                                onChange={(val) => updateLevelField(level.id, 'color', val)}
                            />
                            <Button variant="default" onClick={() => duplicateLevel(level.id)} style={{ padding: '8px' }} title="Duplicate Level">
                                <Plus size={16} />
                            </Button>
                            <Button variant="default" onClick={() => setPreviewLevel(level)} style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Play size={16} /> Preview
                            </Button>
                            <Button variant="error" onClick={() => deleteLevel(level.id)} style={{ padding: '8px' }} title="Delete level">
                                <Trash2 size={16} />
                            </Button>
                            </div>
                        </div>

                        {!levelCollapsed && (
                        <div className="cb-level-body" id={`cb-level-body-${level.id}`}>
                        <div className="cb-level-settings">
                            <div className="cb-level-title-field">
                                <label htmlFor={`cb-level-title-${level.id}`}>Level Title</label>
                                <Input
                                    id={`cb-level-title-${level.id}`}
                                    value={level.title || ''}
                                    onChange={(e) => updateLevelTitle(level.id, e.target.value)}
                                    placeholder="Level Title (e.g. Basics 1)"
                                    className="notranslate"
                                />
                            </div>
                        </div>

                        <div className="cb-prereq-panel">
                            <label className="cb-prereq-title">
                                Prerequisites (Used for branching paths)
                            </label>
                            <div className="cb-prereq-list">
                                {courseData.filter(l => l.id !== level.id).length === 0 ? (
                                    <span className="cb-hint">No other levels available.</span>
                                ) : (
                                    courseData.filter(l => l.id !== level.id).map(l => {
                                        const isPrereq = (level.prerequisites || []).includes(l.id);
                                        return (
                                        <label key={l.id} className={`cb-prereq-chip ${isPrereq ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isPrereq}
                                                onChange={(e) => {
                                                    const current = level.prerequisites || [];
                                                    const newPrereqs = e.target.checked ? [...current, l.id] : current.filter(id => id !== l.id);
                                                    updateLevelField(level.id, 'prerequisites', newPrereqs.length > 0 ? newPrereqs : undefined);
                                                }}
                                                className="cb-prereq-input"
                                            />
                                            {isPrereq && <Check size={14} />}
                                            {l.title || 'Untitled Level'}
                                        </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Removed lesson notes textbox as per user request to use teaching cards instead */}

                        <div className="cb-phrases">
                            {(level.phrases || []).length === 0 && (
                                <div className="cb-empty cb-empty-inline">No phrases yet. Add the first one below.</div>
                            )}
                            {(level.phrases || []).map((phrase, pIdx) => {
                                const phraseCollapsed = !search && collapsedPhrases.has(phrase.id);
                                const issues = phraseIssues(phrase);
                                const phraseType = phrase.type || 'translate_to_english';
                                // Audio opens by default only where the learner must
                                // hear the word, or when a clip already exists.
                                const audioDefaultsOpen = AUDIO_ALWAYS_TYPES.has(phraseType) || !!phrase.audioPath;
                                const audioVisible = supportsAudio(phrase) && (audioOpen.has(phrase.id) || audioDefaultsOpen);
                                return (
                                <div key={phrase.id} className={`cb-phrase-card ${phraseCollapsed ? 'is-collapsed' : ''}`}>
                                    <div className="cb-phrase-header">
                                        <button
                                            type="button"
                                            className="cb-phrase-toggle"
                                            onClick={() => togglePhrase(phrase.id)}
                                            aria-expanded={!phraseCollapsed}
                                            aria-controls={`cb-phrase-body-${phrase.id}`}
                                        >
                                            <span className="cb-phrase-chevron">
                                                {phraseCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                            </span>
                                            <span className="cb-phrase-num">{pIdx + 1}</span>
                                            <span className="cb-phrase-type-chip">{TYPE_LABELS[phraseType]}</span>
                                            <span className="cb-phrase-summary custom-font-text notranslate">{phraseSummary(phrase)}</span>
                                            {issues.length > 0 && (
                                                <span className="cb-phrase-issue" title={issues.join(', ')}>
                                                    <AlertTriangle size={13} /> {issues.length}
                                                </span>
                                            )}
                                            {phrase.audioPath && (
                                                <span className="cb-phrase-has-audio" title="Audio attached"><Volume2 size={13} /></span>
                                            )}
                                        </button>
                                        <div className="cb-phrase-actions">
                                            {supportsAudio(phrase) && (
                                                <button
                                                    type="button"
                                                    className={`cb-audio-chip ${audioVisible ? 'open' : ''}`}
                                                    onClick={() => toggleInSet(setAudioOpen, phrase.id)}
                                                    title={audioVisible ? 'Hide pronunciation audio' : 'Add pronunciation audio'}
                                                >
                                                    {audioVisible ? <ChevronDown size={14} /> : <Mic size={14} />}
                                                    Audio
                                                    {phrase.audioPath && <span className="cb-audio-dot" />}
                                                </button>
                                            )}
                                            <select
                                                value={phraseType}
                                                onChange={(e) => updatePhrase(level.id, phrase.id, 'type', e.target.value)}
                                                className="cb-type-select"
                                                aria-label="Exercise type"
                                            >
                                                <option value="translate_to_english">English Typing</option>
                                                <option value="translate_to_conlang">Conlang Typing</option>
                                                <option value="word_bank">Word Bank</option>
                                                <option value="multiple_choice">Multiple Choice</option>
                                                <option value="matching_pairs">Matching Pairs</option>
                                                <option value="teach">Teaching Card (Info)</option>
                                                <option value="listening">Listening Exercise</option>
                                                <option value="fill_blank">Fill-in-the-Blank</option>
                                                <option value="sentence_reorder">Sentence Reorder</option>
                                                <option value="picture_match">Picture Match</option>
                                                <option value="true_false">True or False</option>
                                                <option value="conjugation_drill">Conjugation Drill</option>
                                                <option value="glyph_drawing">Draw the Glyph</option>
                                            </select>
                                            <div className="cb-move-buttons">
                                                <button className="cb-move-phrase" onClick={() => movePhrase(level.id, pIdx, 'up')} disabled={pIdx === 0} title="Move phrase up">
                                                    <ChevronUp size={18} />
                                                </button>
                                                <button className="cb-move-phrase" onClick={() => movePhrase(level.id, pIdx, 'down')} disabled={pIdx === (level.phrases || []).length - 1} title="Move phrase down">
                                                    <ChevronDown size={18} />
                                                </button>
                                                <button className="cb-delete-phrase" onClick={() => deletePhrase(level.id, phrase.id)} title="Delete phrase">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {!phraseCollapsed && (
                                    <div className="cb-phrase-body" id={`cb-phrase-body-${phrase.id}`}>
                                        <div className="cb-phrase-fields">
                                        {phrase.type === 'teach' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Teaching Content</label>
                                                <TextcardEditor 
                                                    value={phrase.english || ''}
                                                    onChange={(newVal) => updatePhrase(level.id, phrase.id, 'english', newVal)}
                                                />
                                            </div>
                                        )}

                                        {phrase.type !== 'matching_pairs' && phrase.type !== 'teach' && (
                                            <div className="cb-phrase-inputs-row">
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>
                                                        {phrase.type === 'picture_match' ? 'Emoji / Image URL' : 
                                                         phrase.type === 'conjugation_drill' ? 'Instruction / English Prompt' :
                                                         phrase.type === 'fill_blank' ? 'Conlang Sentence (use ____ for blank)' :
                                                         phrase.type === 'listening' ? 'Conlang Audio Text' :
                                                         phrase.type === 'glyph_drawing' ? 'Glyph to Draw (word / syllable / letter)' :
                                                         'Conlang Sentence'}
                                                    </label>
                                                    <Input 
                                                        value={phrase.conlang || ''}
                                                        onChange={(e) => updatePhrase(level.id, phrase.id, 'conlang', e.target.value)}
                                                        placeholder={
                                                            phrase.type === 'picture_match' ? "e.g. 🍎" :
                                                            phrase.type === 'conjugation_drill' ? "e.g. Past tense of 'run'" :
                                                            phrase.type === 'fill_blank' ? "e.g. The ____ pays" :
                                                            phrase.type === 'glyph_drawing' ? "e.g. nuvir or ka or the glyph character itself" :
                                                            "e.g. nuvir'lo zikrifi"
                                                        }
                                                        className={phrase.type !== 'picture_match' ? "custom-font-text notranslate" : ""}
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>
                                                        {phrase.type === 'multiple_choice' ? "Correct Answer" : 
                                                         phrase.type === 'fill_blank' ? "Missing Word (Conlang)" :
                                                         phrase.type === 'true_false' ? "Displayed Translation (to judge)" :
                                                         phrase.type === 'conjugation_drill' ? "Conlang Answer" :
                                                         phrase.type === 'listening' ? "Reference English (Optional)" :
                                                         "Target English Translation"}
                                                    </label>
                                                    <Input 
                                                        value={phrase.english || ''}
                                                        onChange={(e) => updatePhrase(level.id, phrase.id, 'english', e.target.value)}
                                                        placeholder={
                                                            phrase.type === 'multiple_choice' ? "e.g. The garlic pays" : 
                                                            phrase.type === 'fill_blank' ? "e.g. garlic" :
                                                            phrase.type === 'conjugation_drill' ? "e.g. ran" :
                                                            "e.g. Hi, Hello (comma separated)"
                                                        }
                                                        className="custom-font-text notranslate"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {phrase.type === 'true_false' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Is the translation Correct?</label>
                                                <select 
                                                    value={phrase.isTrue ? 'true' : 'false'}
                                                    onChange={(e) => updatePhrase(level.id, phrase.id, 'isTrue', e.target.value === 'true')}
                                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', width: '100%', outline: 'none' }}
                                                >
                                                    <option value="true">True (Matches)</option>
                                                    <option value="false">False (Doesn't match)</option>
                                                </select>
                                            </div>
                                        )}

                                        {phrase.type === 'multiple_choice' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Wrong Options (Distractors)</label>
                                                <div className="cb-distractors-row">
                                                    {[0, 1, 2].map(idx => (
                                                        <Input 
                                                            key={idx}
                                                            value={phrase.options?.[idx] || ''}
                                                            onChange={(e) => {
                                                                const newOptions = [...(phrase.options || ['', '', ''])];
                                                                newOptions[idx] = e.target.value;
                                                                updatePhrase(level.id, phrase.id, 'options', newOptions);
                                                            }}
                                                            placeholder={`Incorrect option ${idx + 1}`}
                                                            className="custom-font-text notranslate"
                                                            style={{ flex: 1 }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {phrase.type === 'word_bank' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Extra Word Bank Distractors (Comma Separated)</label>
                                                <Input 
                                                    value={phrase.distractors || ''}
                                                    onChange={(e) => updatePhrase(level.id, phrase.id, 'distractors', e.target.value)}
                                                    placeholder="e.g. dog, cat, run"
                                                    className="custom-font-text notranslate"
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                        )}

                                        {phrase.type === 'matching_pairs' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '10px' }}>Define 4 Matching Pairs</label>
                                                <div className="cb-matching-grid">
                                                    {[0, 1, 2, 3].map(idx => {
                                                        const pair = phrase.pairs?.[idx] || { conlang: '', english: '' };
                                                        return (
                                                            <div key={idx} className="cb-matching-pair">
                                                                <span style={{ color: 'var(--tx2)', fontWeight: 'bold' }}>{idx + 1}.</span>
                                                                <Input 
                                                                    value={pair.conlang}
                                                                    onChange={(e) => {
                                                                        const newPairs = [...(phrase.pairs || [{conlang:'', english:''}, {conlang:'', english:''}, {conlang:'', english:''}, {conlang:'', english:''}])];
                                                                        newPairs[idx] = { ...newPairs[idx], conlang: e.target.value };
                                                                        updatePhrase(level.id, phrase.id, 'pairs', newPairs);
                                                                    }}
                                                                    placeholder="Conlang Word"
                                                                    className="custom-font-text notranslate"
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <span style={{ color: 'var(--tx2)' }}>=</span>
                                                                <Input 
                                                                    value={pair.english}
                                                                    onChange={(e) => {
                                                                        const newPairs = [...(phrase.pairs || [{conlang:'', english:''}, {conlang:'', english:''}, {conlang:'', english:''}, {conlang:'', english:''}])];
                                                                        newPairs[idx] = { ...newPairs[idx], english: e.target.value };
                                                                        updatePhrase(level.id, phrase.id, 'pairs', newPairs);
                                                                    }}
                                                                    placeholder="English Meaning"
                                                                    className="custom-font-text notranslate"
                                                                    style={{ flex: 1 }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {phrase.type === 'glyph_drawing' && (
                                            <div className="cb-glyph-options">
                                                <div className="cb-toggle-row">
                                                    <label className="cb-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={phrase.checkOrder !== false}
                                                            onChange={(e) => updatePhrase(level.id, phrase.id, 'checkOrder', e.target.checked)}
                                                        />
                                                        <span>Enforce stroke order</span>
                                                    </label>
                                                    <label className="cb-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!phrase.showGuide}
                                                            onChange={(e) => updatePhrase(level.id, phrase.id, 'showGuide', e.target.checked)}
                                                        />
                                                        <span>Show guide outline</span>
                                                    </label>
                                                </div>
                                                <p className="cb-hint">
                                                    {(() => {
                                                        const { characters } = resolveWordStrokes(
                                                            phrase.conlang || phrase.english || '',
                                                            config,
                                                            lexicon
                                                        );
                                                        const strokeCount = characters.reduce((n, c) => n + (c.strokes?.length || 0), 0);
                                                        if (!phrase.conlang && !phrase.english) return 'Enter the glyph to draw above.';
                                                        if (strokeCount === 0) {
                                                            return 'No stroke data found for this glyph. Draw it in Font Studio / Orthography first, or the student will just see a notice.';
                                                        }
                                                        return `${strokeCount} stroke${strokeCount === 1 ? '' : 's'} detected across ${characters.length} character${characters.length === 1 ? '' : 's'}.`;
                                                    })()}
                                                </p>
                                            </div>
                                        )}

                                        {audioVisible && (
                                            <AudioRecorder
                                                phrase={phrase}
                                                projectId={config.projectId}
                                                onChange={(field, value) => updatePhrase(level.id, phrase.id, field, value)}
                                            />
                                        )}
                                        </div>
                                    </div>
                                    )}
                                </div>
                                );
                                })}
                            <Button variant="default" onClick={() => addPhrase(level.id)} className="cb-add-phrase">
                                <Plus size={16} /> Add Phrase to Level
                            </Button>
                        </div>
                        </div>
                        )}
                    </div>
                );
                })}
            </div>

            <div className="cb-add-level">
                <Button variant="imp" onClick={addLevel} style={{ flex: 1, padding: '15px' }}>
                    <Plus size={20} style={{marginRight: '8px'}} /> Create New Level
                </Button>
                <Button variant="accent" onClick={() => setShowAutoModal(true)} style={{ flex: 1, padding: '15px' }}>
                    <Wand2 size={20} style={{marginRight: '8px'}} /> Auto-Generate
                </Button>
                <Button variant="default" onClick={exportCourse} style={{ padding: '15px' }} title="Export Course">
                    <ArrowLeft size={20} style={{ transform: 'rotate(90deg)' }} />
                </Button>
                <label style={{ cursor: 'pointer', display: 'flex' }}>
                    <input type="file" accept=".json" onChange={importCourse} style={{ display: 'none' }} />
                    <Button variant="default" style={{ padding: '15px', pointerEvents: 'none' }} title="Import Course">
                        <ArrowLeft size={20} style={{ transform: 'rotate(-90deg)' }} />
                    </Button>
                </label>
            </div>

            {showAutoModal && (
                <div className="cb-modal-overlay">
                    <Card className="cb-auto-modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className="sg-title" style={{ margin: 0 }}>Auto-Generate Course</h3>
                            <button onClick={() => setShowAutoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--tx)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        {lexicon.length < 200 && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem' }}>
                                <strong>Tip:</strong> We recommend a lexicon of at least 200 words (with various parts of speech) for the best results. You currently have {lexicon.length} words.
                            </div>
                        )}
                        <p style={{ color: 'var(--tx2)', marginBottom: '15px', fontSize: '0.9rem' }}>
                            Automatically construct levels based on your lexicon. These will be appended to your current course. You can edit them before saving.
                        </p>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--tx)' }}>Generation Source</label>
                            <select value={genMode} onChange={(e) => setGenMode(e.target.value)} style={{ padding: '8px', width: '100%', borderRadius: '6px', background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--tx)' }}>
                                <option value="theme">Preset Themes (Animals, Food, etc.)</option>
                                <option value="tag">My Custom Semantic Tags</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--tx)' }}>Number of Levels</label>
                            <Input 
                                type="number" 
                                min="1" 
                                max="50"
                                value={numLevelsToGen} 
                                onChange={(e) => setNumLevelsToGen(parseInt(e.target.value) || 1)} 
                            />
                        </div>
                        <Button variant="accent" onClick={handleAutoGenerate} disabled={isGenerating} style={{ width: '100%' }}>
                            {isGenerating ? 'Generating...' : 'Generate Now'}
                        </Button>
                    </Card>
                </div>
            )}

            {previewLevel && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--bg)', zIndex: 9999, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', background: 'var(--s1)', borderBottom: '1px solid var(--bd)' }}>
                        <Button variant="default" onClick={() => setPreviewLevel(null)}>
                            <X size={16} style={{marginRight: '8px'}} /> Exit Preview
                        </Button>
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <ExercisePlayer 
                            levelNode={previewLevel} 
                            onComplete={() => setPreviewLevel(null)}
                            onExit={() => setPreviewLevel(null)}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
}
