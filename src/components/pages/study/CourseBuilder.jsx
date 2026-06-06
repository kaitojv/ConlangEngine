import React, { useState } from 'react';
import Card from '@/components/UI/Card/Card.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { generateCourseExercise } from '@/utils/courseGenerator.js';
import ExercisePlayer from './ExercisePlayer.jsx';
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Wand2, X, Play, ChevronUp, ChevronDown, Bold, Italic, Underline, Smile } from 'lucide-react';
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
        
        const newLevels = [];
        let currentId = Date.now();

        for (let i = 0; i < numLevelsToGen; i++) {
            const theme = THEMES[i % THEMES.length];
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
                            <GripVertical className="drag-handle" size={20} />
                            <Input 
                                value={level.title}
                                onChange={(e) => updateLevelTitle(level.id, e.target.value)}
                                placeholder="Level Title (e.g. Basics 1)"
                                style={{ flex: 1, margin: 0 }}
                            />
                            <Button variant="default" onClick={() => setPreviewLevel(level)} style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Play size={16} /> Preview
                            </Button>
                            <Button variant="error" onClick={() => deleteLevel(level.id)} style={{ padding: '8px' }}>
                                <Trash2 size={16} />
                            </Button>
                        </div>
                        
                        {/* Removed lesson notes textbox as per user request to use teaching cards instead */}

                        <div className="cb-phrases">
                            {level.phrases.map((phrase, pIdx) => (
                                <div key={phrase.id} style={{ padding: '15px', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '12px', marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid var(--bd)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                            <div style={{ display: 'flex', gap: '15px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Conlang Prompt</label>
                                                    <Input 
                                                        value={phrase.conlang || ''}
                                                        onChange={(e) => updatePhrase(level.id, phrase.id, 'conlang', e.target.value)}
                                                        placeholder="e.g. nuvir'lo zikrifi"
                                                        className="custom-font-text notranslate"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>
                                                        {phrase.type === 'multiple_choice' ? "Correct Answer" : "Target Translation"}
                                                    </label>
                                                    <Input 
                                                        value={phrase.english || ''}
                                                        onChange={(e) => updatePhrase(level.id, phrase.id, 'english', e.target.value)}
                                                        placeholder="e.g. The garlic pays"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {phrase.type === 'multiple_choice' && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--tx2)', marginBottom: '5px' }}>Wrong Options (Distractors)</label>
                                                <div style={{ display: 'flex', gap: '10px' }}>
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
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                    {[0, 1, 2, 3].map(idx => {
                                                        const pair = phrase.pairs?.[idx] || { conlang: '', english: '' };
                                                        return (
                                                            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--bd)' }}>
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

            <div className="cb-add-level" style={{ display: 'flex', gap: '10px' }}>
                <Button variant="imp" onClick={addLevel} style={{ flex: 1, padding: '15px' }}>
                    <Plus size={20} style={{marginRight: '8px'}} /> Create New Level
                </Button>
                <Button variant="accent" onClick={() => setShowAutoModal(true)} style={{ flex: 1, padding: '15px' }}>
                    <Wand2 size={20} style={{marginRight: '8px'}} /> Auto-Generate
                </Button>
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
