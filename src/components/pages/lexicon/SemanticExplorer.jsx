import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, Share2, Info, Plus, ArrowRight, HelpCircle, Compass, Layers, GitBranch, Repeat, Wand2, X } from 'lucide-react';
import { fetchSynsets, fetchHyponymOptions, fetchHypernymOptions, fetchSynonymOptions, fetchHolonymOptions, fetchMeronymOptions, fetchTopicOptions, fetchWordFamily, fetchFullDictionary, fetchAntonymOptions, fetchRhymeOptions, fetchModifierOptions, fetchFollowerOptions } from '../../../utils/semanticUtils';
import { useConfigStore } from '../../../store/useConfigStore.jsx';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import Modal from '../../UI/Modal/Modal.jsx';
import Button from '../../UI/Buttons/Buttons.jsx';
import Card from '../../UI/Card/Card.jsx';
import toast from 'react-hot-toast';
import './semanticExplorer.css';

const TABS = [
    { id: 'definitions', label: 'Definitions', Icon: Compass, desc: "Explore multi-sense dictionary data for any concept." },
    { id: 'taxonomy', label: 'Taxonomy', Icon: Layers, desc: "Traverse the hierarchy of meaning from general to specific." },
    { id: 'word-family', label: 'Word Family', Icon: GitBranch, desc: "Discover related concepts and sister terms in the semantic web." },
    { id: 'compare', label: 'Compare', Icon: Repeat, desc: "Analyze and differentiate between two distinct semantic spaces." }
];

const QUICK_GUIDE = [
    { 
        title: "The Dictionary", 
        text: "Search any English word to view its definitions grouped by part of speech. Click 'Map this Sense' to adopt that precise meaning into your Conlang." 
    },
    { 
        title: "Taxonomy (Scientific vs Creative)", 
        text: "Visualize semantic relationships! Toggle to 'Scientific' for structural hierarchies (Hypernyms, Meronyms) or switch to 'Creative' for poetic inspiration (Rhymes, Antonyms, Modifiers)." 
    },
    { 
        title: "Morphological Word Family", 
        text: "Explore how words are compounded in English. This radial web shows words physically derived from your root (e.g., 'water' -> 'waterfall', 'underwater')." 
    },
    { 
        title: "Interactive Canvas", 
        text: "Click and drag anywhere on the visualizer backgrounds to pan around the semantic trees. Use your scroll wheel or the zoom controls to explore dense data." 
    }
];

export default function SemanticExplorer() {
    const [activeTab, setActiveTab] = useState('definitions');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [taxonomyChain, setTaxonomyChain] = useState([]);
    const [wordFamily, setWordFamily] = useState([]);
    const [compareTerm, setCompareTerm] = useState('');
    const [compareResults, setCompareResults] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fullDictionary, setFullDictionary] = useState(null);
    const [showGuide, setShowGuide] = useState(false);
    const [taxonomyMode, setTaxonomyMode] = useState('scientific'); // 'scientific' or 'creative'
    const [taxonomyData, setTaxonomyData] = useState({ 
        hypernyms: [], hyponyms: [], synonyms: [], holonyms: [], meronyms: [], topics: [],
        antonyms: [], rhymes: [], modifiers: [], followers: []
    });
    
    // Pan and Zoom state
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const hasDragged = useRef(false);

    // Selection state
    const [selectedSynset, setSelectedSynset] = useState(null);
    const [editingMapping, setEditingMapping] = useState({ word: '', ipa: '', translation: '' });

    const cleanText = (text) => {
        if (!text) return '';
        // Remove style blocks and their content
        let cleaned = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        // Remove all other HTML tags
        cleaned = cleaned.replace(/<[^>]*>?/gm, '');
        // Remove any residual CSS-like blocks that might be raw text
        cleaned = cleaned.replace(/\.[a-z0-0_-]+\s*\{[^}]*\}/gi, '');
        return cleaned.trim();
    };

    const semanticMappings = useConfigStore(state => state.semanticMappings);
    const updateConfig = useConfigStore(state => state.updateConfig);
    const addWord = useLexiconStore(state => state.addWord);

    // Reset view when tab changes
    useEffect(() => {
        setTransform({ x: 0, y: 0, scale: 1 });
    }, [activeTab]);

    // Non-passive wheel handler to prevent page scroll while zooming
    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        setTransform(prev => ({
            ...prev,
            scale: Math.min(Math.max(0.3, prev.scale * zoomFactor), 4)
        }));
    };

    const svgWheelRef = (node) => {
        if (node) {
            node.removeEventListener('wheel', handleWheel);
            node.addEventListener('wheel', handleWheel, { passive: false });
        }
    };

    // Sync data when tab changes or synset is selected
    useEffect(() => {
        if (!selectedSynset) return;

        const syncData = async () => {
            if (activeTab === 'taxonomy') {
                if (taxonomyMode === 'scientific') {
                    const [hypernyms, hyponyms, synonyms, holonyms, meronyms, topics] = await Promise.all([
                        fetchHypernymOptions(selectedSynset.lemma),
                        fetchHyponymOptions(selectedSynset.lemma),
                        fetchSynonymOptions(selectedSynset.lemma),
                        fetchHolonymOptions(selectedSynset.lemma),
                        fetchMeronymOptions(selectedSynset.lemma),
                        fetchTopicOptions(selectedSynset.lemma)
                    ]);
                    setTaxonomyData(prev => ({ ...prev, hypernyms, hyponyms, synonyms, holonyms, meronyms, topics }));
                } else {
                    const [antonyms, rhymes, modifiers, followers, topics] = await Promise.all([
                        fetchAntonymOptions(selectedSynset.lemma),
                        fetchRhymeOptions(selectedSynset.lemma),
                        fetchModifierOptions(selectedSynset.lemma),
                        fetchFollowerOptions(selectedSynset.lemma),
                        fetchTopicOptions(selectedSynset.lemma)
                    ]);
                    setTaxonomyData(prev => ({ ...prev, antonyms, rhymes, modifiers, followers, topics }));
                }
            }
            if (activeTab === 'word-family') {
                const family = await fetchWordFamily(selectedSynset);
                setWordFamily(family);
            }
        };

        syncData();
    }, [activeTab, selectedSynset, taxonomyMode]);

    const handleSearch = async () => {
        if (!searchTerm) return;
        setLoading(true);
        setTaxonomyChain([]);
        setWordFamily([]);
        setSelectedSynset(null);
        setFullDictionary(null);
        setTransform({ x: 0, y: 0, scale: 1 });

        try {
            const dict = await fetchFullDictionary(searchTerm);
            setFullDictionary(dict);

            const coreWord = {
                id: `core-${searchTerm}`,
                lemma: searchTerm,
                pos: dict?.senses?.[0]?.pos || 'n',
                definition: dict?.senses?.[0]?.definitions?.[0] || "Explore this concept...",
                isCore: true
            };
            
            await handleSelectSynset(coreWord);
        } catch (error) {
            toast.error("Failed to fetch semantic data. Try another term.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSynset = async (synset) => {
        setSelectedSynset(synset);
        
        const dict = await fetchFullDictionary(synset.lemma);
        setFullDictionary(dict);

        setEditingMapping({
            word: semanticMappings[synset.id]?.word || '',
            ipa: semanticMappings[synset.id]?.ipa || '',
            translation: synset.lemma || ''
        });

        // If we're in taxonomy, refresh tree data
        if (activeTab === 'taxonomy') {
            const [hypernyms, hyponyms, synonyms, holonyms, meronyms, topics] = await Promise.all([
                fetchHypernymOptions(synset.lemma),
                fetchHyponymOptions(synset.lemma),
                fetchSynonymOptions(synset.lemma),
                fetchHolonymOptions(synset.lemma),
                fetchMeronymOptions(synset.lemma),
                fetchTopicOptions(synset.lemma)
            ]);
            setTaxonomyData({ hypernyms, hyponyms, synonyms, holonyms, meronyms, topics });
        }
    };

    const handleCompare = async () => {
        if (!searchTerm || !compareTerm) return;
        setLoading(true);
        try {
            const [dictA, dictB, resA, resB] = await Promise.all([
                fetchFullDictionary(searchTerm),
                fetchFullDictionary(compareTerm),
                fetchSynsets(searchTerm),
                fetchSynsets(compareTerm)
            ]);
            
            const getOptions = (dict, synsets) => {
                const options = [];
                // 1. Add precise dictionary senses
                if (dict?.senses) {
                    dict.senses.forEach((s, sIdx) => {
                        if (s.definitions) {
                            s.definitions.forEach((d, dIdx) => {
                                const cleanDef = cleanText(d || "");
                                options.push({
                                    id: `dict-${dict.lemma}-${sIdx}-${dIdx}`,
                                    lemma: dict.lemma,
                                    pos: s.pos || 'n',
                                    definition: d,
                                    label: `${(s.pos || 'sense').toUpperCase()}: ${cleanDef.substring(0, 50)}${cleanDef.length > 50 ? '...' : ''}`
                                });
                            });
                        }
                    });
                }
                // 2. Add semantic synonyms/related concepts
                synsets.forEach(s => {
                    const isDuplicate = options.some(o => 
                        cleanText(o.definition).toLowerCase() === cleanText(s.definition).toLowerCase()
                    );
                    if (!isDuplicate) {
                        options.push({
                            ...s,
                            label: `REL: ${cleanText(s.lemma)} (${s.pos || '?'})`
                        });
                    }
                });
                return options;
            };

            const optionsA = getOptions(dictA, resA);
            const optionsB = getOptions(dictB, resB);

            if (optionsA.length && optionsB.length) {
                setCompareResults({ 
                    a: optionsA[0],
                    b: optionsB[0],
                    optionsA,
                    optionsB
                });
            } else {
                toast.error("Concepts not found.");
            }
        } catch (error) {
            toast.error("Compare failed.");
        } finally {
            setLoading(false);
        }
    };

    const saveMapping = () => {
        if (!selectedSynset || !editingMapping.word) {
            toast.error("Please enter a conlang word first!");
            return;
        }
        
        const newMappings = { ...semanticMappings, [selectedSynset.id]: editingMapping };
        updateConfig({ semanticMappings: newMappings });

        addWord({
            word: editingMapping.word.trim(),
            ipa: editingMapping.ipa.trim(),
            translation: editingMapping.translation.trim(),
            wordClass: selectedSynset.pos === 'n' ? 'Noun' : (selectedSynset.pos === 'v' ? 'Verb' : 'Other'),
            tags: ['semantic-explorer'],
            ideogram: '',
            personCategory: ''
        });

        toast.success(`'${editingMapping.word}' added to Lexicon!`);
        setIsModalOpen(false);
    };

    const currentTabInfo = TABS.find(t => t.id === activeTab);

    return (
        <div className="semantic-page-container">
            <Card className="semantic-header-card">
                <header className="page-header">
                    <div className="header-content">
                        <h2 className="flex sg-title">
                            <Compass className="text-accent" />
                            Semantic Explorer
                        </h2>
                        <p className="subtitle">
                            Map the boundaries of meaning for your constructed language.
                        </p>
                    </div>

                    <div className="header-actions">
                        <Button variant="toggle" onClick={() => setShowGuide(!showGuide)}>
                            <HelpCircle size={18} />
                            {showGuide ? "Hide Guide" : "Quick Guide"}
                        </Button>
                    </div>

                    <nav className="page-subnav">
                        {TABS.map(tab => (
                            <button 
                                key={tab.id}
                                className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.Icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <div className="main-search-wrapper">
                    <div className="semantic-search-bar">
                        <Search className="search-icon" size={22} />
                        <input 
                            type="text" 
                            placeholder="Enter a concept (e.g. 'water', 'justice', 'run')..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button variant="save" onClick={handleSearch} disabled={loading} className="search-submit">
                            {loading ? 'Searching...' : `Explore`} <ArrowRight size={20} />
                        </Button>
                    </div>
                </div>
            </Card>

            {showGuide && (
                <Card className="quick-guide-panel" style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setShowGuide(false)} 
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--tx2)' }}
                        title="Close Guide"
                    >
                        <X size={20} />
                    </button>
                    {QUICK_GUIDE.map((item, i) => (
                        <div key={i} className="guide-item">
                            <h4>{item.title}</h4>
                            <p>{item.text}</p>
                        </div>
                    ))}
                </Card>
            )}

            <div className="semantic-main-content">
                <section className="semantic-visualizer">
                        {!fullDictionary && !loading && activeTab !== 'compare' && (
                            <div className="empty-explorer-state">
                                <div className="empty-icon-wrap">
                                    <Compass size={60} strokeWidth={1} />
                                </div>
                                <h3>Ready to Explore?</h3>
                                <p>Search for a concept above to begin mapping your semantic space.</p>
                            </div>
                        )}

                        {activeTab === 'taxonomy' && selectedSynset && (() => {
                            let currentY = 150;
                            const availableBranches = taxonomyMode === 'scientific' 
                                ? [
                                    { key: 'holonyms', label: 'PART OF (Holonyms)', color: '#f59e0b' },
                                    { key: 'hypernyms', label: 'BROADER (Hypernyms)', color: '#a78bfa' },
                                    { key: 'synonyms', label: 'SIMILAR (Synonyms)', color: 'var(--s4)' },
                                    { key: 'hyponyms', label: 'SPECIFIC (Hyponyms)', color: 'var(--ok)' },
                                    { key: 'meronyms', label: 'HAS PARTS (Meronyms)', color: '#0ea5e9' },
                                ]
                                : [
                                    { key: 'antonyms', label: 'OPPOSITES (Antonyms)', color: '#ef4444' },
                                    { key: 'rhymes', label: 'RHYMES (Sounds)', color: '#ec4899' },
                                    { key: 'modifiers', label: 'MODIFIERS (Adjectives)', color: '#10b981' },
                                    { key: 'followers', label: 'FOLLOWERS (Context)', color: '#6366f1' },
                                ];

                            const rightBranches = availableBranches.filter(b => taxonomyData[b.key] && taxonomyData[b.key].length > 0);

                            const branchLayouts = rightBranches.map(branch => {
                                const items = taxonomyData[branch.key];
                                const branchHeight = items.length * 35;
                                const requiredSpace = branchHeight + 120; // Padding between branches
                                const cy = currentY + (requiredSpace / 2);
                                currentY += requiredSpace;
                                return { ...branch, items, cy, branchHeight };
                            });

                            const totalHeight = Math.max(1400, currentY + 150);
                            const rootCy = totalHeight / 2;

                            const topics = taxonomyData.topics || [];
                            const topicsHeight = topics.length * 45;
                            const topicsStartY = rootCy - (topicsHeight / 2);

                            return (
                                <div className="taxonomy-tree horizontal-tree" style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: '0.5rem', background: 'var(--s2)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--bd)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                        <button 
                                            onClick={() => setTaxonomyMode('scientific')}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: taxonomyMode === 'scientific' ? 'var(--acc)' : 'transparent', color: taxonomyMode === 'scientific' ? 'var(--bg)' : 'var(--tx2)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Scientific
                                        </button>
                                        <button 
                                            onClick={() => setTaxonomyMode('creative')}
                                            style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', background: taxonomyMode === 'creative' ? 'var(--acc)' : 'transparent', color: taxonomyMode === 'creative' ? 'var(--bg)' : 'var(--tx2)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                        >
                                            Creative
                                        </button>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                            onClick={() => setTransform(prev => ({...prev, scale: Math.min(prev.scale * 1.2, 4)}))}
                                            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '36px' }}
                                            title="Zoom In"
                                        >
                                            +
                                        </button>
                                        <button 
                                            onClick={() => setTransform(prev => ({...prev, scale: Math.max(prev.scale / 1.2, 0.3)}))}
                                            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '36px' }}
                                            title="Zoom Out"
                                        >
                                            -
                                        </button>
                                        <button 
                                            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                                            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        >
                                            Reset View
                                        </button>
                                    </div>
                                    <svg 
                                        ref={svgWheelRef}
                                        width="100%" 
                                        height="100%" 
                                        viewBox={`0 0 1200 ${totalHeight}`} 
                                        preserveAspectRatio="xMidYMid meet" 
                                        className="visualizer-svg"
                                        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
                                        onMouseDown={() => { setIsDragging(true); hasDragged.current = false; }}
                                        onMouseUp={() => setIsDragging(false)}
                                        onMouseLeave={() => setIsDragging(false)}
                                        onMouseMove={(e) => {
                                            if (isDragging) {
                                                hasDragged.current = true;
                                                setTransform(prev => ({
                                                    ...prev,
                                                    x: prev.x + e.movementX * 2.5,
                                                    y: prev.y + e.movementY * 2.5
                                                }));
                                            }
                                        }}
                                    >
                                        <g style={{ 
                                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                            transformOrigin: `600px ${rootCy}px`,
                                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                        }}>
                                            {/* Domain Topics (Left) */}
                                            {topics.length > 0 && (
                                                <g>
                                                    <text x="140" y={topicsStartY - 20} fontSize="14" fontWeight="800" fill="var(--tx2)" letterSpacing="1px" textAnchor="middle">CONTEXT (Topics)</text>
                                                    {topics.map((node, i) => {
                                                        const y = topicsStartY + i * 45 + 22.5;
                                                        return (
                                                            <g key={node.id}>
                                                                <text x="115" y={y + 5} className="node-label" fontSize="16" textAnchor="end" onClick={() => { if (!hasDragged.current) handleSelectSynset(node); }}>
                                                                    {cleanText(node.lemma)}
                                                                </text>
                                                                <circle cx="140" cy={y} r="5" fill="#ec4899" stroke="var(--bd)" strokeWidth="1" />
                                                                <path d={`M 145,${y} C 250,${y} 250,${rootCy} 365,${rootCy}`} fill="none" stroke="var(--bd)" strokeWidth="1" opacity="0.4" />
                                                            </g>
                                                        );
                                                    })}
                                                </g>
                                            )}

                                            {/* Root Node */}
                                            <circle cx="380" cy={rootCy} r="14" fill="var(--acc)" className="node-pulse" />
                                            <text x="380" y={rootCy - 40} className="tree-root-label" fontSize="32" fontWeight="900" fill="var(--tx)" textAnchor="middle">
                                                {cleanText(selectedSynset.lemma).toUpperCase()}
                                            </text>

                                            {/* Dynamic Right Branches */}
                                            {branchLayouts.map(branch => (
                                                <g key={branch.key}>
                                                    <path d={`M 395,${rootCy} C 550,${rootCy} 550,${branch.cy} 700,${branch.cy}`} fill="none" stroke="var(--bd)" strokeWidth="2" opacity="0.5" />
                                                    <circle cx="700" cy={branch.cy} r="6" fill="var(--tx3)" />
                                                    <text x="700" y={branch.cy - 25} fontSize="14" fontWeight="800" fill="var(--tx2)" letterSpacing="1px" textAnchor="middle">{branch.label}</text>
                                                    
                                                    {branch.items.map((node, i) => {
                                                        const y = branch.cy - (branch.branchHeight / 2) + i * 35 + 17.5;
                                                        return (
                                                            <g key={node.id}>
                                                                <path d={`M 705,${branch.cy} C 800,${branch.cy} 800,${y} 950,${y}`} fill="none" stroke="var(--bd)" strokeWidth="1" opacity="0.4" />
                                                                <circle cx="950" cy={y} r="5" fill={branch.color} stroke="var(--bd)" strokeWidth="1" />
                                                                <text x="965" y={y + 5} className="node-label" fontSize="16" onClick={() => { if (!hasDragged.current) handleSelectSynset(node); }}>
                                                                    {cleanText(node.lemma)}
                                                                </text>
                                                            </g>
                                                        );
                                                    })}
                                                </g>
                                            ))}
                                        </g>
                                    </svg>
                                </div>
                            );
                        })()}

                        {activeTab === 'definitions' && fullDictionary && (
                            <div className="dictionary-view">
                                <div className="dictionary-card">
                                    <div className="dict-sense-badge">
                                        <span className="sense-count">{fullDictionary.totalSenses}</span>
                                        <span className="sense-label">Senses</span>
                                    </div>
                                    
                                    <header className="dict-header">
                                        <h3 className="dict-lemma">{fullDictionary.lemma.toLowerCase()}</h3>
                                        <span className="dict-ipa">[ {fullDictionary.lemma.toLowerCase()} ]</span>
                                    </header>

                                    <div className="dict-body">
                                        {fullDictionary.senses.map((group, gIdx) => (
                                            <div key={gIdx} className="dict-pos-group">
                                                <div className="dict-pos-header">
                                                    <span className="pos-label">{group.pos.toUpperCase()}</span>
                                                    <span className="sense-index">Sense {gIdx + 1}</span>
                                                </div>
                                                <div className="dict-definitions">
                                                    <button className="map-sense-btn" onClick={() => {
                                                        setSelectedSynset({ id: `group-${fullDictionary.lemma}-${gIdx}`, lemma: fullDictionary.lemma, definition: group.definitions[0], pos: group.pos });
                                                        setIsModalOpen(true);
                                                    }}>
                                                        <Plus size={14} /> Map this Sense
                                                    </button>
                                                    {group.definitions.slice(0, 3).map((def, dIdx) => {
                                                        const cleaned = cleanText(def);
                                                        if (!cleaned) return null;
                                                        return (
                                                            <p key={dIdx} className="dict-def-text" onClick={() => {
                                                                setSelectedSynset({ id: `def-${fullDictionary.lemma}-${gIdx}-${dIdx}`, lemma: fullDictionary.lemma, definition: def, pos: group.pos });
                                                                setIsModalOpen(true);
                                                            }}>
                                                                {cleaned}
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'word-family' && selectedSynset && wordFamily.length > 0 && (
                            <div className="family-star" style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => setTransform(prev => ({...prev, scale: Math.min(prev.scale * 1.2, 4)}))}
                                        style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '36px' }}
                                        title="Zoom In"
                                    >
                                        +
                                    </button>
                                    <button 
                                        onClick={() => setTransform(prev => ({...prev, scale: Math.max(prev.scale / 1.2, 0.3)}))}
                                        style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', width: '36px' }}
                                        title="Zoom Out"
                                    >
                                        -
                                    </button>
                                    <button 
                                        onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
                                        style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tx2)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    >
                                        Reset View
                                    </button>
                                </div>
                                <svg 
                                    ref={svgWheelRef}
                                    width="100%" height="100%" viewBox="0 0 1200 1200" preserveAspectRatio="xMidYMid meet" className="visualizer-svg"
                                    style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
                                    onMouseDown={() => { setIsDragging(true); hasDragged.current = false; }}
                                    onMouseUp={() => setIsDragging(false)}
                                    onMouseLeave={() => setIsDragging(false)}
                                    onMouseMove={(e) => {
                                        if (isDragging) {
                                            hasDragged.current = true;
                                            setTransform(prev => ({
                                                ...prev,
                                                x: prev.x + e.movementX * 1.5,
                                                y: prev.y + e.movementY * 1.5
                                            }));
                                        }
                                    }}
                                >
                                    <g style={{ 
                                        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                                        transformOrigin: '600px 600px',
                                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                                    }}>
                                        <circle cx="600" cy="600" r="25" fill="var(--acc)" className="node-pulse" />
                                        <text x="600" y="550" className="tree-root-label" fontSize="32" fontWeight="900" fill="var(--tx)" textAnchor="middle">
                                            {cleanText(selectedSynset.lemma).toUpperCase()}
                                        </text>
                                        {wordFamily.map((node, i) => {
                                        const angle = (i / wordFamily.length) * Math.PI * 2;
                                        // Stagger distance: even nodes are closer, odd nodes are further
                                        const dist = i % 2 === 0 ? 280 : 450;
                                        const x = 600 + Math.cos(angle) * dist;
                                        const y = 600 + Math.sin(angle) * dist;
                                        
                                        // Control point for quadratic bezier (Q) to make it swirl like linguistic roots
                                        const cpDist = dist * 0.5;
                                        const cpAngle = angle + 0.3; // Slight twist
                                        const cpx = 600 + Math.cos(cpAngle) * cpDist;
                                        const cpy = 600 + Math.sin(cpAngle) * cpDist;
                                        
                                        // Dynamic text placement to avoid overlap
                                        const textDist = dist + 20;
                                        const tx = 600 + Math.cos(angle) * textDist;
                                        const ty = 600 + Math.sin(angle) * textDist;
                                        
                                        let anchor = "middle";
                                        if (Math.cos(angle) > 0.4) anchor = "start";
                                        if (Math.cos(angle) < -0.4) anchor = "end";

                                        return (
                                            <g key={node.id} className="family-node-group">
                                                <path d={`M 600,600 Q ${cpx},${cpy} ${x},${y}`} fill="none" stroke="var(--acc)" strokeWidth="2" opacity="0.4" />
                                                <circle cx={x} cy={y} r="8" fill={semanticMappings[node.id] ? 'var(--acc)' : 'var(--bg)'} stroke="var(--bd)" strokeWidth="2" />
                                                <text 
                                                    x={tx} y={ty + 5} 
                                                    className="node-label" 
                                                    textAnchor={anchor}
                                                    onClick={() => { if (!hasDragged.current) handleSelectSynset(node); }} 
                                                    fontSize="16" 
                                                    fontWeight="800"
                                                >
                                                    {cleanText(node.lemma).toUpperCase()}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    </g>
                                </svg>
                            </div>
                        )}

                        {activeTab === 'compare' && (
                            <div className="compare-view">
                                <div className="compare-inputs-row">
                                    <div className="comp-input-group">
                                        <label>Concept A</label>
                                        <input 
                                            placeholder="First concept..." 
                                            value={searchTerm} 
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                                        />
                                        {compareResults?.optionsA && (
                                            <select 
                                                className="comp-select"
                                                value={compareResults.optionsA.indexOf(compareResults.a)}
                                                onChange={(e) => setCompareResults({...compareResults, a: compareResults.optionsA[e.target.value]})}
                                            >
                                                {compareResults.optionsA.map((o, idx) => (
                                                    <option key={idx} value={idx}>{o.label}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="comp-vs-orb">VS</div>
                                    <div className="comp-input-group">
                                        <label>Concept B</label>
                                        <input 
                                            placeholder="Second concept..." 
                                            value={compareTerm} 
                                            onChange={(e) => setCompareTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                                        />
                                        {compareResults?.optionsB && (
                                            <select 
                                                className="comp-select"
                                                value={compareResults.optionsB.indexOf(compareResults.b)}
                                                onChange={(e) => setCompareResults({...compareResults, b: compareResults.optionsB[e.target.value]})}
                                            >
                                                {compareResults.optionsB.map((o, idx) => (
                                                    <option key={idx} value={idx}>{o.label}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <button className="comp-trigger" onClick={handleCompare} disabled={loading}>
                                    {loading ? "Analyzing..." : "Perform Semantic Analysis"}
                                </button>
                                {compareResults && (
                                    <div className="compare-cards-container">
                                        <div className="comp-result-card">
                                            <span className="comp-pos">{compareResults.a.pos}</span>
                                            <h4>{cleanText(compareResults.a.lemma).toUpperCase()}</h4>
                                            <p>{cleanText(compareResults.a.definition)}</p>
                                        </div>
                                        <div className="comp-result-card">
                                            <span className="comp-pos">{compareResults.b.pos}</span>
                                            <h4>{cleanText(compareResults.b.lemma).toUpperCase()}</h4>
                                            <p>{cleanText(compareResults.b.definition)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {isModalOpen && selectedSynset && (
                    <Modal 
                        isOpen={isModalOpen} 
                        onClose={() => setIsModalOpen(false)} 
                        title="Concept Mapping"
                    >
                        <div className="modal-body">
                            <p className="modal-subtitle">Bridge the gap between languages</p>
                            <div className="concept-preview">
                                <div className="preview-pos">{selectedSynset.pos}</div>
                                <h4>{cleanText(selectedSynset.lemma).toUpperCase()}</h4>
                                {selectedSynset.definition && (
                                    <p className="clean-definition">"{cleanText(selectedSynset.definition)}"</p>
                                )}
                            </div>
                            <div className="mapping-form">
                                <div className="form-group">
                                    <label>Conlang Word</label>
                                    <input 
                                        className="mapping-input custom-font-text" 
                                        placeholder="Enter your word..."
                                        value={editingMapping.word} 
                                        autoFocus 
                                        onChange={(e) => setEditingMapping({...editingMapping, word: e.target.value})} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>IPA (Optional)</label>
                                    <input 
                                        className="mapping-input" 
                                        placeholder="/ipa/"
                                        value={editingMapping.ipa} 
                                        onChange={(e) => setEditingMapping({...editingMapping, ipa: e.target.value})} 
                                    />
                                </div>
                                <Button variant="save" className="w-full" onClick={saveMapping}>
                                    Save to Lexicon <ArrowRight size={18} />
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
        </div>
    );
}
