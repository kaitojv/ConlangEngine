import React, { useState } from 'react';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { generateCourseExercise } from '@/utils/courseGenerator.js';
import ExercisePlayer from './ExercisePlayer.jsx';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Wand2, X, Play, ChevronUp, ChevronDown, Bold, Italic, Underline, Smile, Zap, Star, Crown, Book, Brain, Flame, Dumbbell, Sword, Shield } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import './courseBuilder.css';

const COMMON_ICONS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Heart', 'Star', 'Check', 'X', 'AlertCircle', 'Info', 'Book', 'Brain', 'Volume2', 'Ear', 'Eye', 'Pencil', 'Flame', 'Sparkles', 'ThumbsUp', 'Coffee', 'Globe', 'Music', 'MessageCircle', 'Lightbulb', 'Zap', 'Shield', 'Smile'];

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
                style={{ width: '100%', height: '100px', padding: '10px', border: 'none', background: 'transparent', color: 'var(--tx)', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
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
            setCourseData(newData);
        }
    };

    const moveLevel = (id, direction) => {
        const idx = courseData.findIndex(l => l.id === id);
        if (idx === -1) return;
        const newData = [...courseData];
        if (direction === 'up' && idx > 0) {
            [newData[idx - 1], newData[idx]] = [newData[idx], newData[idx - 1]];
            setCourseData(newData);
        } else if (direction === 'down' && idx < newData.length - 1) {
            [newData[idx + 1], newData[idx]] = [newData[idx], newData[idx + 1]];
            setCourseData(newData);
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
                    setCourseData(parsed);
                } else {
                    alert("Invalid course format");
                }
            } catch (err) {
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
        setCourseData([...courseData, newLevel]);
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

        setCourseData([...courseData, ...newLevels]);
        setIsGenerating(false);
        setShowAutoModal(false);
    };

    const deleteLevel = (id) => {
        setCourseData(courseData.filter(l => l.id !== id));
    };

    const updateLevelTitle = (id, newTitle) => {
        setCourseData(courseData.map(l => l.id === id ? { ...l, title: newTitle } : l));
    };

    const updateLevelNotes = (id, newNotes) => {
        setCourseData(courseData.map(l => l.id === id ? { ...l, lessonNotes: newNotes } : l));
    };

    const updateLevelField = (id, field, value) => {
        setCourseData(courseData.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const addPhrase = (levelId) => {
        setCourseData(courseData.map(l => {
            if (l.id === levelId) {
                return {
                    ...l,
                    phrases: [...l.phrases, { 
                        id: `phrase-${Date.now()}`, 
                        type: 'translate_to_english', 
                        conlang: '', 
                        english: '',
                        options: ['', '', ''],
                        distractors: '',
                        pairs: [{conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}, {conlang: '', english: ''}]
                    }]
                };
            }
            return l;
        }));
    };

    const deletePhrase = (levelId, phraseId) => {
        setCourseData(courseData.map(l => {
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
        setCourseData(courseData.map(l => {
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
        setCourseData(courseData.map(l => {
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
        onExit(); // return to map
    };

    return (
        <Card className="course-builder">
            <div className="cb-header">
                <div className="cb-header-title">
                    <Button variant="default" onClick={onExit} style={{ padding: '8px' }}>
                        <ArrowLeft size={18} />
                    </Button>
                    <h2 className="flex sg-title mb-0">Course Builder</h2>
                </div>
                <Button variant="imp" onClick={saveCourse}>
                    <Save size={16} style={{marginRight: '8px'}} /> Save Course
                </Button>
            </div>

            <div className="cb-intro">
                <p>Create your own Duolingo-style learning path! Add levels, and define the specific sentence translations you want to teach.</p>
            </div>

            <div className="cb-levels">
                {courseData.map((level) => (
                    <div key={level.id} className="cb-level-card">
                        <div className="cb-level-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button onClick={() => moveLevel(level.id, 'up')} style={{ background: 'none', border: 'none', color: 'var(--tx2)', cursor: 'pointer', padding: '5px', display: 'flex' }} title="Move Up">
                                    <ChevronUp size={18} />
                                </button>
                                <button onClick={() => moveLevel(level.id, 'down')} style={{ background: 'none', border: 'none', color: 'var(--tx2)', cursor: 'pointer', padding: '5px', display: 'flex' }} title="Move Down">
                                    <ChevronDown size={18} />
                                </button>
                            </div>
                            <Input 
                                value={level.title}
                                onChange={(e) => updateLevelTitle(level.id, e.target.value)}
                                placeholder="Level Title (e.g. Basics 1)"
                                style={{ flex: 1, margin: 0 }}
                            />
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
                            <Button variant="error" onClick={() => deleteLevel(level.id)} style={{ padding: '8px' }}>
                                <Trash2 size={16} />
                            </Button>
                        </div>
                        
                        <div style={{ padding: '10px 15px', background: 'var(--s1)', borderBottom: '1px solid var(--bd)' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '8px' }}>
                                Prerequisites (Used for branching paths)
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {courseData.filter(l => l.id !== level.id).length === 0 ? (
                                    <span style={{ color: 'var(--tx2)', fontSize: '0.85rem' }}>No other levels available.</span>
                                ) : (
                                    courseData.filter(l => l.id !== level.id).map(l => (
                                        <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--bg)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--bd)', cursor: 'pointer', fontSize: '0.85rem', color: (level.prerequisites || []).includes(l.id) ? 'var(--acc)' : 'var(--tx)', userSelect: 'none' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={(level.prerequisites || []).includes(l.id)}
                                                onChange={(e) => {
                                                    const current = level.prerequisites || [];
                                                    const newPrereqs = e.target.checked ? [...current, l.id] : current.filter(id => id !== l.id);
                                                    updateLevelField(level.id, 'prerequisites', newPrereqs.length > 0 ? newPrereqs : undefined);
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                            {(level.prerequisites || []).includes(l.id) ? <Check size={14} /> : null}
                                            {l.title || 'Untitled Level'}
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Removed lesson notes textbox as per user request to use teaching cards instead */}

                        <div className="cb-phrases">
                            {level.phrases.map((phrase, pIdx) => (
                                <div key={phrase.id} className="cb-phrase-card">
                                    <div className="cb-phrase-header">
                                        <div className="cb-phrase-type-select">
                                            <span style={{ fontWeight: 'bold', color: 'var(--tx2)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {pIdx + 1}. Type:
                                            </span>
                                            <select 
                                                value={phrase.type || 'translate_to_english'} 
                                                onChange={(e) => updatePhrase(level.id, phrase.id, 'type', e.target.value)}
                                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', outline: 'none', fontWeight: '500', cursor: 'pointer' }}
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
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <button className="cb-move-phrase" onClick={() => movePhrase(level.id, pIdx, 'up')} disabled={pIdx === 0} style={{ background: 'none', border: 'none', color: pIdx === 0 ? 'var(--bd)' : 'var(--tx2)', cursor: pIdx === 0 ? 'default' : 'pointer', padding: '5px', display: 'flex' }} title="Move Up">
                                                <ChevronUp size={18} />
                                            </button>
                                            <button className="cb-move-phrase" onClick={() => movePhrase(level.id, pIdx, 'down')} disabled={pIdx === level.phrases.length - 1} style={{ background: 'none', border: 'none', color: pIdx === level.phrases.length - 1 ? 'var(--bd)' : 'var(--tx2)', cursor: pIdx === level.phrases.length - 1 ? 'default' : 'pointer', padding: '5px', display: 'flex' }} title="Move Down">
                                                <ChevronDown size={18} />
                                            </button>
                                            <button className="cb-delete-phrase" onClick={() => deletePhrase(level.id, phrase.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px', display: 'flex' }} title="Delete Phrase">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                                                         'Conlang Sentence'}
                                                    </label>
                                                    <Input 
                                                        value={phrase.conlang || ''}
                                                        onChange={(e) => updatePhrase(level.id, phrase.id, 'conlang', e.target.value)}
                                                        placeholder={
                                                            phrase.type === 'picture_match' ? "e.g. 🍎" :
                                                            phrase.type === 'conjugation_drill' ? "e.g. Past tense of 'run'" :
                                                            phrase.type === 'fill_blank' ? "e.g. The ____ pays" :
                                                            "e.g. nuvir'lo zikrifi"
                                                        }
                                                        className={phrase.type !== 'picture_match' && phrase.type !== 'conjugation_drill' ? "custom-font-text notranslate" : ""}
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
                                                                    style={{ flex: 1 }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <Button variant="default" onClick={() => addPhrase(level.id)} style={{ width: '100%' }}>
                                <Plus size={16} style={{marginRight: '5px'}}/> Add Phrase to Level
                            </Button>
                        </div>
                    </div>
                ))}
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
