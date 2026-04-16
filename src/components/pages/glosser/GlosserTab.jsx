import React, { useState, useMemo } from 'react';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { stripAffix, getPersonRules } from '@/utils/morphologyEngine.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Card from '@/components/UI/Card/card.jsx';
import Input from '@/components/UI/Input/input.jsx';
import Button from '@/components/UI/Buttons/buttons.jsx';
import Modal from '@/components/UI/Modal/Modal.jsx';
import { BookOpen, List, Wand2 } from 'lucide-react';
import './glosserTab.css';

export default function GlosserTab() {
    const [inputText, setInputText] = useState('');
    const [readerMode, setReaderMode] = useState('read'); // 'read' or 'gloss'
    const [processedWords, setProcessedWords] = useState([]);
    const [freeTranslation, setFreeTranslation] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Store Data
    const lexicon = useLexiconStore((state) => state.lexicon);
    const config = useConfigStore();
    const { normalizeToBase, transliterate } = useTransliterator();

    // --- 1. RECURSIVE PARSING ENGINE ---
    const findAllParsings = (surface, depth = 0) => {
        if (depth > 3) return [];
        let parsings = [];
        const safeSurface = normalizeToBase(surface.toLowerCase());

        // Exact match in dictionary
        lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface)
               .forEach(m => parsings.push({ root: m, rules: [] }));

        // Ghost Pronouns
        const personRules = getPersonRules(config.personRules);
        personRules.forEach(rule => {
            if (rule.free && normalizeToBase(rule.free.toLowerCase()) === safeSurface) {
                parsings.push({
                    root: { word: rule.free, wordClass: 'pronoun', translation: `Pronoun (${rule.name})` },
                    rules: []
                });
            }
        });

        // Infinitive verbs
        if (config.verbMarker) {
            const markers = config.verbMarker.split(',').map(m => m.trim().replace(/^-/, ''));
            markers.forEach(marker => {
                lexicon.filter(e => normalizeToBase(e.word.toLowerCase()) === safeSurface + normalizeToBase(marker) && e.wordClass === 'verb')
                       .forEach(m => parsings.push({ root: m, rules: [] }));
            });
        }

        // Recursive affix stripping
        let allRules = [...(config.grammarRules || []), ...personRules.filter(p => p.affix).map(p => ({ ...p, appliesTo: 'verb' }))];
        allRules.forEach(rule => {
            if (!rule.affix) return;
            let stripped = stripAffix(safeSurface, rule.affix);
            if (stripped) {
                findAllParsings(stripped, depth + 1).forEach(sp => {
                    let applies = rule.appliesTo ? rule.appliesTo.split(',').map(c => c.trim().toLowerCase()) : ['all'];
                    if (applies.includes('all') || applies.includes(sp.root.wordClass?.toLowerCase())) {
                        parsings.push({ root: sp.root, rules: [rule, ...sp.rules] });
                    }
                });
            }
        });
        return parsings;
    };

    const getUniqueParsings = (surface) => {
        let parsings = findAllParsings(surface);
        let unique = [];
        let sigs = new Set();
        parsings.forEach(p => {
            let sig = p.root.word + '|' + p.root.translation + '|' + p.rules.map(r => r.name).join('|');
            if (!sigs.has(sig)) { sigs.add(sig); unique.push(p); }
        });
        return unique;
    };

    // --- 2. EXECUTE PROCESSING ---
    const handleProcess = () => {
        if (!inputText.trim()) {
            setProcessedWords([]);
            setFreeTranslation('');
            setIsModalOpen(false);
            return;
        }

        // Split by words and keep punctuation as separate tokens
        const tokens = inputText.split(/(\s+|[.,!?;:"()]+)/).filter(Boolean);
        
        const processed = tokens.map(token => {
            if (/^[\s.,!?;:"()]+$/.test(token)) {
                return { isPunctuation: true, text: token };
            }
            
            const cleanToken = normalizeToBase(token.toLowerCase());
            const parsings = getUniqueParsings(cleanToken);
            return { isPunctuation: false, text: token, parsings };
        });

        setProcessedWords(processed);
        setFreeTranslation('');
        setIsModalOpen(true);
    };

    // --- 3. RENDER HELPERS ---
    const renderReadingMode = () => {
        return (
            <div style={{ lineHeight: '2', fontSize: '1.2rem', color: 'var(--tx)' }}>
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
                            <span key={index} className="glosser-tooltip-trigger custom-font-text notranslate">
                                {transliterate(tokenData.text)}
                                <div className="glosser-tooltip">
                                    <div style={{ fontWeight: '900', color: 'var(--acc2)', fontSize: '1.1rem', marginBottom: '4px' }}>
                                        {transliterate(baseWord)} <span className="notranslate" style={{ fontWeight: 'normal', color: 'var(--tx3)', fontSize: '0.9rem' }}>{ipa}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--tx2)', fontWeight: 'bold' }}>{p.root.wordClass}</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--tx)' }}>{p.root.translation}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--acc)', marginTop: '4px', fontWeight: 'bold' }}>{tags}</div>
                                </div>
                            </span>
                        );
                    }

                    return (
                        <span key={index} className="custom-font-text notranslate" style={{ color: 'var(--err)', borderBottom: '2px wavy var(--err)', cursor: 'help' }} title="Unknown root">
                            {transliterate(tokenData.text)}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderGlossingMode = () => {
        return (
            <div style={{ background: 'var(--s1)', padding: '25px', borderRadius: 'var(--rad-sm)', border: '1px solid var(--bd)', marginTop: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-end', marginBottom: '20px' }}>
                    {processedWords.map((tokenData, index) => {
                        if (tokenData.isPunctuation) {
                            if (!tokenData.text.trim()) return null; // Skip spaces in Leipzig mode
                            return <div key={index} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--tx)', alignSelf: 'flex-start' }}>{tokenData.text}</div>;
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
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div className="custom-font-text notranslate" style={{ fontWeight: '800', fontSize: '1.15rem', color: 'var(--acc2)' }}>{transliterate(segmentedWord)}</div>
                                    <div style={{ color: 'var(--tx2)', fontSize: '0.9rem', textTransform: 'lowercase' }}>{glossParts.join('-')}</div>
                                </div>
                            );
                        }

                        return (
                            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div className="custom-font-text notranslate" style={{ fontWeight: '800', fontSize: '1.15rem', color: 'var(--err)' }}>{transliterate(tokenData.text)}</div>
                                <div style={{ color: 'var(--err)', fontSize: '0.9rem' }}>???</div>
                            </div>
                        );
                    })}
                </div>
                <div style={{ borderTop: '1px dashed var(--bd)', paddingTop: '15px' }}>
                    <input 
                        type="text" 
                        placeholder="Type the free translation here..." 
                        value={freeTranslation}
                        onChange={(e) => setFreeTranslation(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--tx)', fontStyle: 'italic', fontSize: '1.1rem', outline: 'none' }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card>
                <h2 className='flex sg-title' style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen /> Interactive Reader & Glosser</h2>
                <p style={{ color: 'var(--tx2)', marginBottom: '20px' }}>Paste text in your conlang to generate an interactive reading interface or an Interlinear Glossed Text (IGT) breakdown.</p>
                
                <Input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Enter conlang text here..." className="custom-font-text notranslate" />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button variant={readerMode === 'read' ? 'imp' : 'default'} onClick={() => setReaderMode('read')}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} /> Reading Mode</div></Button>
                        <Button variant={readerMode === 'gloss' ? 'imp' : 'default'} onClick={() => setReaderMode('gloss')}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><List size={16} /> IGT Gloss Mode</div></Button>
                    </div>
                    <Button onClick={handleProcess}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Wand2 size={18} /> Process Text</div></Button>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={readerMode === 'read' ? 'Interactive Reader' : 'IGT Glossing Breakdown'}>
                {processedWords.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {readerMode === 'read' ? renderReadingMode() : renderGlossingMode()}
                    </div>
                )}
            </Modal>
        </div>
    );
}