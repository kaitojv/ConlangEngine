import React, { useState } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { stripAffix, getPersonRules, segmentToken, getUniqueParsings } from '@/utils/morphologyEngine.jsx';
import { findParticleBySurface, resolveSense, getNeighborPOS } from '@/utils/particleEngine.js';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/Card.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { BookOpen, List, Wand2, Copy, Check, Plus, Volume2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import * as HoverCard from '@radix-ui/react-hover-card';
import SyntaxTreeRenderer from './SyntaxTreeRenderer.jsx';
import { playAzureTTS } from '@/utils/azureTTS.js';
import toast from 'react-hot-toast';
import './glosserTab.css';

export default function GlosserTab() {
    const [inputText, setInputText] = useState('');
    const [readerMode, setReaderMode] = useState('read'); // 'read', 'gloss', 'tree', 'build'
    const [processedWords, setProcessedWords] = useState([]);
    const [freeTranslation, setFreeTranslation] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    
    // Builder Mode State
    const [builderSearch, setBuilderSearch] = useState('');
    const [builderTokens, setBuilderTokens] = useState([]);

    // Store Data
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []);
    const config = useConfigStore();
    const particleDatabase = useConfigStore((state) => state.particleDatabase) || [];
    const compositeParticles = useConfigStore((state) => state.compositeParticles) || [];
    const usesParticles = useConfigStore((state) => state.usesParticles) || false;
    const { normalizeToBase, transliterate } = useTransliterator();

    // --- 1. RECURSIVE PARSING ENGINE ---
    // (Moved to morphologyEngine.jsx)

    // --- 2. EXECUTE PROCESSING ---
    const handleProcess = () => {
        if (!inputText.trim()) {
            setProcessedWords([]);
            setFreeTranslation('');
            setIsModalOpen(false);
            return;
        }

        // Split by words and keep punctuation as separate tokens
        const rawTokens = inputText.split(/(\s+|[.,!?;:"()]+)/).filter(Boolean);
        const processed = [];

        rawTokens.forEach(token => {
            // If it's punctuation or whitespace, just pass it through
            if (/^[\s.,!?;:"()]+$/.test(token)) {
                processed.push({ isPunctuation: true, text: token });
                return;
            }

            // Perform Lexicon-Aware Segmentation
            const cleanToken = token.replace(/[.,!?]/g, '').replace(/[‘’]/g, "'");
            const segments = segmentToken(cleanToken, lexicon, config, normalizeToBase, (t) => getUniqueParsings(t, lexicon, config, normalizeToBase));

            segments.forEach(seg => {
                const parsings = getUniqueParsings(seg, lexicon, config, normalizeToBase);

                // If no lexicon match, check if it's a particle
                if (parsings.length === 0 && usesParticles && particleDatabase.length > 0) {
                    const matchingParticles = findParticleBySurface(seg, particleDatabase);
                    if (matchingParticles.length > 0) {
                        const tokenStream = processed.map(t => ({
                            token: t.text,
                            type: t.parsings?.length > 0 ? 'word' : 'unknown',
                            lexiconEntry: t.parsings?.[0]?.root,
                        }));
                        tokenStream.push({ token: seg });
                        const neighborPOS = getNeighborPOS(tokenStream, tokenStream.length - 1, matchingParticles[0].position || 'standalone');
                        const sense = resolveSense(matchingParticles[0], neighborPOS);
                        if (sense) {
                            parsings.push({
                                root: { word: seg, wordClass: 'particle', translation: sense.meaning },
                                rules: [],
                                particleSense: sense,
                            });
                        }
                    }
                }

                processed.push({ isPunctuation: false, text: seg, parsings });
            });
        });

        setProcessedWords(processed);
        setFreeTranslation('');
        setIsModalOpen(true);

        // Unlock Storyteller achievement
        if (inputText.trim() && !config.unlockedBadges?.includes('storyteller')) {
            config.unlockBadge('storyteller', 'Storyteller');
            config.logActivity('Glossed a text using the Reader!');
        }
    };

    // --- EXPORT IGT TO CLIPBOARD ---
    const handleCopyIGT = () => {
        let line1 = []; // Segmented Conlang Words
        let line2 = []; // Grammatical Glosses

        processedWords.forEach(tokenData => {
            if (tokenData.isPunctuation && !tokenData.text.trim()) return;

            if (tokenData.isPunctuation) {
                line1.push(tokenData.text);
                line2.push(tokenData.text);
            } else if (tokenData.parsings.length > 0) {
                let p = tokenData.parsings[0];
                let baseWord = p.root.word.replace(/\*/g, '');
                let lexicalGloss = (p.root.translation?.split(',')[0] || '').toLowerCase().trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, '.');
                
                let segmentedWord = baseWord;
                let glossParts = [lexicalGloss];
                
                p.rules.slice().reverse().forEach(r => {
                    let cleanAffix = r.affix.replace(/^-|-$/g, '');
                    let tag = r.name.toUpperCase();
                    
                    if (r.affix.endsWith('-') && !r.affix.startsWith('-')) {
                        segmentedWord = cleanAffix + '-' + segmentedWord;
                        glossParts.unshift(tag);
                    } else {
                        segmentedWord = segmentedWord + '-' + cleanAffix;
                        glossParts.push(tag);
                    }
                });
                line1.push(segmentedWord);
                line2.push(glossParts.join('-'));
            }
        });

        const igtText = `${line1.join('\t')}\n${line2.join('\t')}\n${freeTranslation ? `'${freeTranslation}'` : ''}`.trim();
        navigator.clipboard.writeText(igtText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // --- 3. RENDER HELPERS ---
    const renderReadingMode = () => {
        return (
            <div style={{ lineHeight: '2.2', fontSize: '1.2rem', color: 'var(--tx)', padding: '20px', background: 'var(--card)', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
                {processedWords.map((tokenData, index) => {
                    if (tokenData.isPunctuation) {
                        return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{tokenData.text}</span>;
                    }

                    if (tokenData.parsings.length > 0) {
                        let p = tokenData.parsings[0];
                        let baseWord = p.root.word.replace(/\*/g, '');
                        let ipa = p.root.ipa ? `/${p.root.ipa}/` : '';
                        let tags = p.rules.length ? p.rules.map(r => r.name).join(' + ') : 'Root';

                        return (
                            <HoverCard.Root key={index} openDelay={200} closeDelay={150}>
                                <HoverCard.Trigger asChild>
                                    <span className="custom-font-text notranslate" style={{ cursor: 'pointer', color: 'var(--acc)', borderBottom: '2px dotted var(--acc)', transition: 'all 0.2s ease', padding: '0 2px' }}>
                                        {transliterate(tokenData.text)}
                                    </span>
                                </HoverCard.Trigger>
                                <HoverCard.Portal>
                                    <HoverCard.Content sideOffset={8} style={{ background: 'var(--card)', border: '1px solid var(--bd)', padding: '15px', borderRadius: 'var(--rad-sm)', boxShadow: 'var(--shadow-hover)', zIndex: 100000, maxWidth: '300px', color: 'var(--tx)', display: 'flex', flexDirection: 'column', gap: '6px', animation: 'slideUp 0.2s ease' }}>
                                        <div style={{ fontWeight: '900', color: 'var(--acc)', fontSize: '1.2rem' }}>
                                            {transliterate(baseWord)} <span className="notranslate" style={{ fontWeight: 'normal', color: 'var(--tx3)', fontSize: '0.9rem', marginLeft: '6px' }}>{ipa}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--tx2)', fontWeight: 'bold' }}>{p.root.wordClass}</div>
                                        <div style={{ fontSize: '1rem', color: 'var(--tx)', lineHeight: '1.4' }}>{p.root.translation}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--acc2)', marginTop: '4px', fontWeight: '600' }}>{tags}</div>
                                        <HoverCard.Arrow style={{ fill: 'var(--card)' }} />
                                    </HoverCard.Content>
                                </HoverCard.Portal>
                            </HoverCard.Root>
                        );
                    }

                    return (
                        <span key={index} className="custom-font-text notranslate" style={{ color: 'var(--err)', borderBottom: '2px wavy var(--err)', cursor: 'help', padding: '0 2px' }} title="Unknown root">
                            {transliterate(tokenData.text)}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderGlossingMode = () => {
        return (
            <div style={{ background: 'var(--card)', padding: '25px', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 25px', alignItems: 'flex-end', marginBottom: '25px' }}>
                    {processedWords.map((tokenData, index) => {
                        if (tokenData.isPunctuation) {
                            if (!tokenData.text.trim()) return null; // Skip spaces in Leipzig mode
                            return <div key={index} style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--tx2)', alignSelf: 'flex-end', paddingBottom: '4px' }}>{tokenData.text}</div>;
                        }

                        if (tokenData.parsings.length > 0) {
                            let p = tokenData.parsings[0];
                            let baseWord = p.root.word.replace(/\*/g, '');
                            let lexicalGloss = (p.root.translation?.split(',')[0] || '').toLowerCase().trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, '.');
                            
                            let segmentedWord = baseWord;
                            let glossParts = [lexicalGloss];
                            
                            p.rules.slice().reverse().forEach(r => {
                                let cleanAffix = r.affix.replace(/^-|-$/g, '');
                                let tag = r.name.toUpperCase();
                                
                                if (r.affix.endsWith('-') && !r.affix.startsWith('-')) {
                                    segmentedWord = cleanAffix + '-' + segmentedWord;
                                    glossParts.unshift(tag);
                                } else {
                                    segmentedWord = segmentedWord + '-' + cleanAffix;
                                    glossParts.push(tag);
                                }
                            });

                            return (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'max-content' }}>
                                    <div className="custom-font-text notranslate" style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--acc)' }}>{transliterate(segmentedWord)}</div>
                                    <div style={{ color: 'var(--tx2)', fontSize: '0.95rem', textTransform: 'lowercase', letterSpacing: '0.5px' }}>{glossParts.join('-')}</div>
                                </div>
                            );
                        }

                        return (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 'max-content' }}>
                                <div className="custom-font-text notranslate" style={{ fontWeight: '800', fontSize: '1.25rem', color: 'var(--err)' }}>{transliterate(tokenData.text)}</div>
                                <div style={{ color: 'var(--err)', fontSize: '0.95rem' }}>???</div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ borderTop: '1px dashed var(--bd)', paddingTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        placeholder="Type the free translation here..." 
                        value={freeTranslation}
                        onChange={(e) => setFreeTranslation(e.target.value)}
                        style={{ flex: 1, padding: '10px 15px', background: 'var(--s4)', border: '1px solid var(--bd)', borderRadius: 'var(--rad-sm)', color: 'var(--tx)', fontStyle: 'italic', fontSize: '1.05rem', outline: 'none' }}
                    />
                    <Button variant="edit" onClick={handleCopyIGT}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied!' : 'Copy IGT'}
                        </div>
                    </Button>
                </div>
            </div>
        );
    };

    // --- BUILDER HELPERS ---
    const appendToBuilder = (entry) => {
        const newTokens = [...builderTokens, { id: Math.random().toString(), word: entry.word, entry }];
        setBuilderTokens(newTokens);
        setInputText(newTokens.map(t => t.word).join(' '));
    };

    const removeBuilderToken = (id) => {
        const newTokens = builderTokens.filter(t => t.id !== id);
        setBuilderTokens(newTokens);
        setInputText(newTokens.map(t => t.word).join(' '));
    };
    
    const moveToken = (index, dir) => {
        if (index + dir < 0 || index + dir >= builderTokens.length) return;
        const newTokens = [...builderTokens];
        const temp = newTokens[index];
        newTokens[index] = newTokens[index + dir];
        newTokens[index + dir] = temp;
        setBuilderTokens(newTokens);
        setInputText(newTokens.map(t => t.word).join(' '));
    };

    const handleReadAloud = async () => {
        if (!inputText.trim()) return toast.error("Nothing to read.");
        if (!config.azureTtsVoice) return toast.error("Please configure Azure TTS voice in Settings first.");
        
        const toastId = toast.loading("Generating audio...");
        try {
            const cleanText = inputText.replace(/[.\-*]/g, '');
            await playAzureTTS({
                text: cleanText,
                voice: config.azureTtsVoice,
                useIpa: config.azureTtsUseIpa
            });
            toast.dismiss(toastId);
        } catch(err) {
            toast.dismiss(toastId);
            toast.error("Failed to play audio.");
        }
    };

    const filteredLexicon = React.useMemo(() => {
        const query = builderSearch.trim().toLowerCase();
        if (!query) return [];
        
        return lexicon
            .filter(w => (w.word && w.word.toLowerCase().includes(query)) || (w.translation && w.translation.toLowerCase().includes(query)))
            .map(w => {
                const wordRaw = (w.word || '').toLowerCase();
                const transRaw = (w.translation || '').toLowerCase();
                let score = 0;
                if (wordRaw === query || transRaw === query) score = 100;
                else if (wordRaw.startsWith(query) || transRaw.startsWith(query)) score = 80;
                else score = 50;
                return { ...w, searchScore: score };
            })
            .sort((a, b) => b.searchScore - a.searchScore)
            .slice(0, 10);
    }, [builderSearch, lexicon]);

    const renderBuilderUI = () => (
        <div style={{ marginTop: '10px', padding: '15px', background: 'var(--s2)', borderRadius: 'var(--rad)', border: '1px solid var(--bd)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--tx)' }}>Sentence Builder</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px', minHeight: '50px', padding: '10px', background: 'var(--s1)', borderRadius: 'var(--rad)', border: '1px dashed var(--bd)' }}>
                {builderTokens.length === 0 && <span style={{ color: 'var(--tx3)', fontStyle: 'italic', alignSelf: 'center' }}>Search and add words to build a sentence...</span>}
                {builderTokens.map((t, idx) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', background: 'var(--acc)', color: 'white', padding: '6px 10px', borderRadius: '6px', gap: '8px', boxShadow: 'var(--shadow)' }}>
                        <ChevronLeft size={16} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => moveToken(idx, -1)} />
                        <span className="custom-font-text notranslate" style={{ fontWeight: 'bold' }}>{transliterate(t.word)}</span>
                        <ChevronRight size={16} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => moveToken(idx, 1)} />
                        <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.3)', margin: '0 4px' }}></div>
                        <X size={16} style={{ cursor: 'pointer' }} onClick={() => removeBuilderToken(t.id)} />
                    </div>
                ))}
            </div>
            
            <div style={{ position: 'relative' }}>
                <Input value={builderSearch} onChange={(e) => setBuilderSearch(e.target.value)} placeholder="Search lexicon to add word..." />
                {builderSearch && filteredLexicon.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--bd)', borderRadius: 'var(--rad)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
                        {filteredLexicon.map(entry => (
                            <div key={entry.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between' }} onClick={() => { appendToBuilder(entry); setBuilderSearch(''); }}>
                                <span className="custom-font-text notranslate" style={{ color: 'var(--acc)', fontWeight: 'bold' }}>{transliterate(entry.word)}</span>
                                <span style={{ color: 'var(--tx2)', fontSize: '0.9rem' }}>{entry.translation}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <Button variant="imp" onClick={handleProcess} style={{ flex: 1 }}><div className="btn-content-flex"><Wand2 size={16} /> Process Built Sentence</div></Button>
                <Button variant="default" onClick={handleReadAloud}><div className="btn-content-flex"><Volume2 size={16} /> Read Aloud</div></Button>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <h2 className='flex sg-title' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen /> Interactive Reader & Glosser</h2>
                <p style={{ color: 'var(--tx2)', marginBottom: '20px' }}>Paste text in your conlang to generate an interactive reading interface or an Interlinear Glossed Text (IGT) breakdown.</p>
                
                {readerMode !== 'build' ? (
                    <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Enter conlang text here..." className="custom-font-text notranslate" />
                ) : (
                    renderBuilderUI()
                )}
                
                <div className="glosser-controls" style={{ marginTop: '20px' }}>
                    <div className="glosser-mode-toggles">
                        <Button variant={readerMode === 'read' ? 'imp' : 'default'} onClick={() => setReaderMode('read')}><div className="btn-content-flex"><BookOpen size={16} /> Reading Mode</div></Button>
                        <Button variant={readerMode === 'gloss' ? 'imp' : 'default'} onClick={() => setReaderMode('gloss')}><div className="btn-content-flex"><List size={16} /> IGT Gloss Mode</div></Button>
                        <Button variant={readerMode === 'tree' ? 'imp' : 'default'} onClick={() => setReaderMode('tree')}><div className="btn-content-flex"><Wand2 size={16} /> Syntax Tree</div></Button>
                        <Button variant={readerMode === 'build' ? 'imp' : 'default'} onClick={() => setReaderMode('build')}><div className="btn-content-flex"><Plus size={16} /> Builder Mode</div></Button>
                    </div>
                    {readerMode !== 'build' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button onClick={handleProcess} className="glosser-process-btn"><div className="btn-content-flex"><Wand2 size={18} /> Process Text</div></Button>
                            <Button variant="default" onClick={handleReadAloud} title="Read Aloud"><div className="btn-content-flex"><Volume2 size={18} /></div></Button>
                        </div>
                    )}
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={readerMode === 'read' ? 'Interactive Reader' : readerMode === 'gloss' ? 'IGT Glossing Breakdown' : 'Visual Syntax Tree'}>
                {processedWords.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {readerMode === 'read' ? renderReadingMode() : readerMode === 'gloss' ? renderGlossingMode() : <SyntaxTreeRenderer processedWords={processedWords} />}
                    </div>
                )}
            </Modal>
        </div>
    );
}
