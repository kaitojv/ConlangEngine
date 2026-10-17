import React, { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/UI/Modal/Modal.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import Input from '@/components/UI/Input/Input.jsx';
import { 
    GitBranch, Network, Split, Workflow, Eye, Plus, Trash2, 
    Sparkles, ArrowLeft, ArrowRight, CornerDownRight, AlignLeft, 
    AlignCenter, AlignRight, FileText, ListTree
} from 'lucide-react';
import { 
    generateMorphologySvg, 
    generateSyntaxTreeSvg, 
    generateDialectTreeSvg, 
    generateDecisionFlowchartSvg,
    parseIndentedDialectTree,
    formatDialectTreeToText
} from './diagramGenerators.js';

function createDialectNode(name = 'New Language', period = 'Modern', extinct = false, children = []) {
    return {
        id: 'lang_' + Math.random().toString(36).substring(2, 8),
        name,
        period,
        extinct,
        children
    };
}

function ensureDialectIds(node) {
    if (!node) return null;
    if (!node.id) node.id = 'lang_' + Math.random().toString(36).substring(2, 8);
    if (node.children) node.children.forEach(ensureDialectIds);
    return node;
}

function updateDialectNodeInTree(root, targetId, updater) {
    if (root.id === targetId) return updater(root);
    if (!root.children || root.children.length === 0) return root;
    return {
        ...root,
        children: root.children.map(c => updateDialectNodeInTree(c, targetId, updater))
    };
}

function addDialectChildToTree(root, parentId) {
    if (root.id === parentId) {
        return {
            ...root,
            children: [
                ...(root.children || []),
                createDialectNode('Daughter Language', 'Modern', false, [])
            ]
        };
    }
    if (!root.children || root.children.length === 0) return root;
    return {
        ...root,
        children: root.children.map(c => addDialectChildToTree(c, parentId))
    };
}

function addDialectSisterToTree(root, siblingId) {
    if (!root.children || root.children.length === 0) return root;
    const idx = root.children.findIndex(c => c.id === siblingId);
    if (idx !== -1) {
        const newSister = createDialectNode('Sister Language', 'Modern', false, []);
        const nextChildren = [...root.children];
        nextChildren.splice(idx + 1, 0, newSister);
        return {
            ...root,
            children: nextChildren
        };
    }
    return {
        ...root,
        children: root.children.map(c => addDialectSisterToTree(c, siblingId))
    };
}

function deleteDialectNodeFromTree(root, targetId) {
    if (root.id === targetId) return root; // Cannot delete root
    if (!root.children || root.children.length === 0) return root;
    return {
        ...root,
        children: root.children
            .filter(c => c.id !== targetId)
            .map(c => deleteDialectNodeFromTree(c, targetId))
    };
}

// Recursive visual tree branch item
function DialectBranchItem({ node, isRoot = false, onUpdate, onAddChild, onAddSister, onDelete, tr }) {
    return (
        <div className={`wiki-dialect-node-card ${isRoot ? 'is-root' : ''}`}>
            <div className="wiki-dialect-node-row">
                <input 
                    type="text" 
                    className="wiki-slot-input wiki-dialect-name-input" 
                    placeholder={tr('wiki.richText.languageName', 'Language Name')} 
                    value={node.name} 
                    onChange={(e) => onUpdate(node.id, { name: e.target.value })} 
                />
                <input 
                    type="text" 
                    className="wiki-slot-input wiki-dialect-period-input" 
                    placeholder={tr('wiki.richText.periodEra', 'Era / Period (e.g. 600 BCE)')} 
                    value={node.period || ''} 
                    onChange={(e) => onUpdate(node.id, { period: e.target.value })} 
                />
                <label className="wiki-checkbox-label" title={tr('wiki.richText.extinctTag', 'Mark as extinct/historical branch')}>
                    <input 
                        type="checkbox" 
                        checked={!!node.extinct} 
                        onChange={(e) => onUpdate(node.id, { extinct: e.target.checked })} 
                    />
                    <span>{tr('wiki.richText.extinct', 'Extinct')}</span>
                </label>
                <div className="wiki-dialect-node-actions">
                    <button 
                        type="button" 
                        className="wiki-pill-btn-sm" 
                        onClick={() => onAddChild(node.id)}
                        title={tr('wiki.richText.addDaughter', 'Daughter Branch')}
                    >
                        <Plus size={11} />
                        <span>{tr('wiki.richText.addDaughter', 'Daughter')}</span>
                    </button>
                    {!isRoot && (
                        <button 
                            type="button" 
                            className="wiki-pill-btn-sm" 
                            onClick={() => onAddSister(node.id)}
                            title={tr('wiki.richText.addSister', 'Sister Language')}
                        >
                            <CornerDownRight size={11} />
                            <span>{tr('wiki.richText.addSister', 'Sister')}</span>
                        </button>
                    )}
                    {!isRoot && (
                        <button 
                            type="button" 
                            className="wiki-slot-del-btn" 
                            onClick={() => onDelete(node.id)}
                            title={tr('wiki.richText.deleteLanguage', 'Delete language branch')}
                        >
                            <Trash2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {node.children && node.children.length > 0 && (
                <div className="wiki-dialect-children-list">
                    {node.children.map(child => (
                        <DialectBranchItem 
                            key={child.id} 
                            node={child} 
                            isRoot={false} 
                            onUpdate={onUpdate} 
                            onAddChild={onAddChild} 
                            onAddSister={onAddSister} 
                            onDelete={onDelete} 
                            tr={tr}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function WikiDiagramModal({ isOpen, onClose, onInsert, initialData = null, t }) {
    const tr = (key, fallback) => {
        if (!t) return fallback;
        const val = t(key);
        return (val && val !== key) ? val : fallback;
    };
    const [diagramType, setDiagramType] = useState('morphology'); // 'morphology' | 'syntax' | 'dialect' | 'flowchart'
    const [title, setTitle] = useState('');
    const [width, setWidth] = useState('100%');
    const [alignment, setAlignment] = useState('center');

    // 1. Morphology state
    const [morphologySlots, setMorphologySlots] = useState([
        { slot: 'Slot -2', label: 'Negation (nu-)', type: 'prefix', optional: true },
        { slot: 'Slot -1', label: 'Tense (al-)', type: 'prefix', optional: false },
        { slot: 'Slot 0', label: 'Verb Stem', type: 'root', optional: false },
        { slot: 'Slot +1', label: 'Aspect (-ik)', type: 'suffix', optional: true },
        { slot: 'Slot +2', label: 'Agreement (-am)', type: 'suffix', optional: false }
    ]);

    // 2. Syntax tree state
    const [syntaxText, setSyntaxText] = useState(
        `[S\n  [NP [Det The] [Adj golden] [N dragon]]\n  [VP [V guarded] [NP [Det the] [N shrine]]]\n]`
    );

    // 3. Dialect tree state
    const [dialectMode, setDialectMode] = useState('visual'); // 'visual' | 'text'
    const [dialectData, setDialectData] = useState(() => ensureDialectIds({
        name: 'Proto-Solar',
        period: 'c. 1200 BCE',
        extinct: false,
        children: [
            {
                name: 'Western Solar',
                period: 'c. 600 BCE',
                extinct: false,
                children: [
                    { name: 'Coast Solar', period: 'Modern', extinct: false, children: [] },
                    { name: 'Valley Solar', period: 'Modern', extinct: false, children: [] }
                ]
            },
            {
                name: 'Eastern Solar',
                period: 'c. 500 BCE',
                extinct: false,
                children: [
                    { name: 'Highland Solar', period: 'Modern', extinct: false, children: [] },
                    { name: 'Island Dialect', period: 'Extinct', extinct: true, children: [] }
                ]
            }
        ]
    }));
    const [dialectText, setDialectText] = useState(() => formatDialectTreeToText(dialectData));

    // 4. Decision flowchart state
    const [flowchartNodes, setFlowchartNodes] = useState([
        { id: 'start', label: 'Noun Stem', type: 'start' },
        { id: 'harmony', label: 'Last vowel front?', type: 'decision' },
        { id: 'front', label: 'Add Suffix: -in', type: 'process' },
        { id: 'back', label: 'Add Suffix: -on', type: 'process' },
        { id: 'end', label: 'Surface Word', type: 'end' }
    ]);
    const [flowchartConns, setFlowchartConns] = useState([
        { from: 'start', to: 'harmony', label: '' },
        { from: 'harmony', to: 'front', label: 'Front (i, e, ä)' },
        { from: 'harmony', to: 'back', label: 'Back (a, o, u)' },
        { from: 'front', to: 'end', label: '' },
        { from: 'back', to: 'end', label: '' }
    ]);

    // Handle initialData (when editing an existing diagram in the document)
    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            if (initialData.diagramType) setDiagramType(initialData.diagramType);
            if (initialData.title) setTitle(initialData.title);
            if (initialData.width) setWidth(initialData.width);
            if (initialData.align) setAlignment(initialData.align);

            if (initialData.sourceData) {
                try {
                    const parsed = typeof initialData.sourceData === 'string' ? JSON.parse(initialData.sourceData) : initialData.sourceData;
                    if (parsed.data) {
                        if (parsed.type === 'morphology' && Array.isArray(parsed.data)) {
                            setMorphologySlots(parsed.data);
                        } else if (parsed.type === 'syntax' && typeof parsed.data === 'string') {
                            setSyntaxText(parsed.data);
                        } else if (parsed.type === 'dialect' && parsed.data) {
                            const tree = ensureDialectIds(parsed.data);
                            setDialectData(tree);
                            setDialectText(formatDialectTreeToText(tree));
                        } else if (parsed.type === 'flowchart' && parsed.data) {
                            if (parsed.data.nodes) setFlowchartNodes(parsed.data.nodes);
                            if (parsed.data.conns) setFlowchartConns(parsed.data.conns);
                        }
                    }
                } catch (e) {
                    console.warn('Could not parse initial diagram source data:', e);
                }
            }
        }
    }, [isOpen, initialData]);

    // Live preview generation
    const previewSvg = useMemo(() => {
        try {
            if (diagramType === 'morphology') {
                return generateMorphologySvg(morphologySlots);
            } else if (diagramType === 'syntax') {
                return generateSyntaxTreeSvg(syntaxText);
            } else if (diagramType === 'dialect') {
                const activeTree = dialectMode === 'text' ? (parseIndentedDialectTree(dialectText) || dialectData) : dialectData;
                return generateDialectTreeSvg(activeTree);
            } else if (diagramType === 'flowchart') {
                return generateDecisionFlowchartSvg(flowchartNodes, flowchartConns);
            }
        } catch (err) {
            return `<div style="padding: 20px; color: #ef4444;">Error generating diagram: ${err.message}</div>`;
        }
        return '';
    }, [diagramType, morphologySlots, syntaxText, dialectData, dialectText, dialectMode, flowchartNodes, flowchartConns]);

    // Morphology helpers
    const addSlot = () => {
        setMorphologySlots(prev => [
            ...prev,
            { slot: `Slot +${prev.length}`, label: 'New Suffix', type: 'suffix', optional: true }
        ]);
    };

    const updateSlot = (index, field, value) => {
        setMorphologySlots(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const moveSlot = (index, direction) => {
        setMorphologySlots(prev => {
            const targetIdx = index + direction;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const next = [...prev];
            const temp = next[index];
            next[index] = next[targetIdx];
            next[targetIdx] = temp;
            return next;
        });
    };

    const removeSlot = (index) => {
        setMorphologySlots(prev => prev.filter((_, i) => i !== index));
    };

    // Dialect Tree visual helpers
    const handleUpdateDialectNode = (id, fields) => {
        setDialectData(prev => {
            const updated = updateDialectNodeInTree(prev, id, node => ({ ...node, ...fields }));
            setDialectText(formatDialectTreeToText(updated));
            return updated;
        });
    };

    const handleAddDialectChild = (id) => {
        setDialectData(prev => {
            const updated = addDialectChildToTree(prev, id);
            setDialectText(formatDialectTreeToText(updated));
            return updated;
        });
    };

    const handleAddDialectSister = (id) => {
        setDialectData(prev => {
            const updated = addDialectSisterToTree(prev, id);
            setDialectText(formatDialectTreeToText(updated));
            return updated;
        });
    };

    const handleDeleteDialectNode = (id) => {
        setDialectData(prev => {
            const updated = deleteDialectNodeFromTree(prev, id);
            setDialectText(formatDialectTreeToText(updated));
            return updated;
        });
    };

    const handleDialectTextChange = (newText) => {
        setDialectText(newText);
        const parsed = parseIndentedDialectTree(newText);
        if (parsed) {
            setDialectData(ensureDialectIds(parsed));
        }
    };

    const loadDialectPreset = (presetKey) => {
        let tree;
        if (presetKey === 'binary') {
            setTitle('Proto-Language Branching (Binary)');
            tree = {
                name: 'Proto-Tongue',
                period: 'c. 1500 BCE',
                children: [
                    { name: 'Northern Branch', period: 'c. 800 BCE', children: [{ name: 'Highland Dialect', period: 'Modern', children: [] }] },
                    { name: 'Southern Branch', period: 'c. 750 BCE', children: [{ name: 'Coastal Dialect', period: 'Modern', children: [] }] }
                ]
            };
        } else if (presetKey === 'trifurcation') {
            setTitle('Continental Language Family (3 Branches)');
            tree = {
                name: 'Ancient Ancestral',
                period: 'c. 2000 BCE',
                children: [
                    { name: 'Western Tongue', period: 'c. 1000 BCE', children: [{ name: 'Oasis Speech', period: 'Modern', children: [] }] },
                    { name: 'Central Tongue', period: 'c. 900 BCE', children: [{ name: 'Valley Dialect', period: 'Modern', children: [] }] },
                    { name: 'Maritime Tongue', period: 'c. 850 BCE', children: [{ name: 'Island Speech', period: 'Extinct', extinct: true, children: [] }] }
                ]
            };
        } else if (presetKey === 'historical') {
            setTitle('Language Lineage (Historical Epochs)');
            tree = {
                name: 'Archaic Protolanguage',
                period: 'Early Bronze Age',
                children: [
                    {
                        name: 'Old Classical',
                        period: 'c. 500 BCE',
                        children: [
                            {
                                name: 'Middle Empire Dialect',
                                period: 'c. 600 CE',
                                children: [
                                    { name: 'Standard Modern', period: 'Present', children: [] },
                                    { name: 'Colonial Dialect', period: 'Present', children: [] }
                                ]
                            }
                        ]
                    }
                ]
            };
        } else if (presetKey === 'cluster') {
            setTitle('Regional Dialect Continuum');
            tree = {
                name: 'Great Valley Dialect Continuum',
                period: 'Common Era',
                children: [
                    { name: 'Coastal Dialect', period: 'North', children: [] },
                    { name: 'Riverlands Dialect', period: 'Central', children: [] },
                    { name: 'Mountain Dialect', period: 'East', children: [] },
                    { name: 'Desert Nomadic', period: 'South', children: [] }
                ]
            };
        }
        if (tree) {
            const formatted = ensureDialectIds(tree);
            setDialectData(formatted);
            setDialectText(formatDialectTreeToText(formatted));
        }
    };

    // Flowchart helpers
    const addFlowchartNode = (type = 'process') => {
        const id = 'step_' + Math.random().toString(36).substring(2, 7);
        const defaultNames = {
            start: 'Input Word / Stem',
            decision: 'Condition / Check?',
            process: 'Apply Rule / Suffix',
            end: 'Surface Form / Output'
        };
        setFlowchartNodes(prev => [
            ...prev,
            { id, label: defaultNames[type] || 'New Step', type }
        ]);
    };

    const updateFlowchartNode = (id, field, value) => {
        setFlowchartNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
    };

    const removeFlowchartNode = (id) => {
        setFlowchartNodes(prev => prev.filter(n => n.id !== id));
        setFlowchartConns(prev => prev.filter(c => c.from !== id && c.to !== id));
    };

    const addFlowchartConn = () => {
        if (flowchartNodes.length < 2) return;
        const from = flowchartNodes[0].id;
        const to = flowchartNodes[flowchartNodes.length - 1].id;
        setFlowchartConns(prev => [...prev, { from, to, label: '' }]);
    };

    const updateFlowchartConn = (index, field, value) => {
        setFlowchartConns(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeFlowchartConn = (index) => {
        setFlowchartConns(prev => prev.filter((_, i) => i !== index));
    };

    const loadFlowchartPreset = (presetKey) => {
        if (presetKey === 'harmony') {
            setTitle('Vowel Harmony Decision Flowchart');
            setFlowchartNodes([
                { id: 'start', label: 'Noun Stem', type: 'start' },
                { id: 'harmony', label: 'Last vowel front?', type: 'decision' },
                { id: 'front', label: 'Add Suffix: -in', type: 'process' },
                { id: 'back', label: 'Add Suffix: -on', type: 'process' },
                { id: 'end', label: 'Surface Word', type: 'end' }
            ]);
            setFlowchartConns([
                { from: 'start', to: 'harmony', label: '' },
                { from: 'harmony', to: 'front', label: 'Front (i, e, ä)' },
                { from: 'harmony', to: 'back', label: 'Back (a, o, u)' },
                { from: 'front', to: 'end', label: '' },
                { from: 'back', to: 'end', label: '' }
            ]);
        } else if (presetKey === 'lenition') {
            setTitle('Intervocalic Lenition Rule');
            setFlowchartNodes([
                { id: 'start', label: 'Underlying Consonant', type: 'start' },
                { id: 'env', label: 'Between two vowels?', type: 'decision' },
                { id: 'weaken', label: 'Voicing: p,t,k → b,d,g', type: 'process' },
                { id: 'keep', label: 'Retain Voiceless Stop', type: 'process' },
                { id: 'end', label: 'Phonetic Output', type: 'end' }
            ]);
            setFlowchartConns([
                { from: 'start', to: 'env', label: '' },
                { from: 'env', to: 'weaken', label: 'V_V (Yes)' },
                { from: 'env', to: 'keep', label: 'Else (No)' },
                { from: 'weaken', to: 'end', label: '' },
                { from: 'keep', to: 'end', label: '' }
            ]);
        } else if (presetKey === 'case') {
            setTitle('Grammatical Case Suffix Pipeline');
            setFlowchartNodes([
                { id: 'start', label: 'Noun Phrase', type: 'start' },
                { id: 'role', label: 'Grammatical Role?', type: 'decision' },
                { id: 'nom', label: 'Nominative: -a', type: 'process' },
                { id: 'acc', label: 'Accusative: -on', type: 'process' },
                { id: 'gen', label: 'Genitive: -is', type: 'process' },
                { id: 'end', label: 'Inflected Noun', type: 'end' }
            ]);
            setFlowchartConns([
                { from: 'start', to: 'role', label: '' },
                { from: 'role', to: 'nom', label: 'Subject' },
                { from: 'role', to: 'acc', label: 'Direct Object' },
                { from: 'role', to: 'gen', label: 'Possessor' },
                { from: 'nom', to: 'end', label: '' },
                { from: 'acc', to: 'end', label: '' },
                { from: 'gen', to: 'end', label: '' }
            ]);
        } else if (presetKey === 'tone') {
            setTitle('Tone Sandhi Realization');
            setFlowchartNodes([
                { id: 'start', label: 'Adjacent Syllables', type: 'start' },
                { id: 'check', label: 'Both Low Tone (3+3)?', type: 'decision' },
                { id: 'shift', label: 'Shift: Rising + Low (2+3)', type: 'process' },
                { id: 'normal', label: 'Maintain Base Tones', type: 'process' },
                { id: 'end', label: 'Spoken Tone Form', type: 'end' }
            ]);
            setFlowchartConns([
                { from: 'start', to: 'check', label: '' },
                { from: 'check', to: 'shift', label: '3 + 3' },
                { from: 'check', to: 'normal', label: 'Other' },
                { from: 'shift', to: 'end', label: '' },
                { from: 'normal', to: 'end', label: '' }
            ]);
        }
    };

    // Syntax presets
    const loadSyntaxPreset = (type) => {
        if (type === 'transitive') {
            setTitle('Transitive Sentence Structure');
            setSyntaxText(`[S\n  [NP [Det The] [Adj fierce] [N tiger]]\n  [VP [V stalked] [NP [Det the] [N prey]]]\n]`);
        } else if (type === 'intransitive') {
            setTitle('Intransitive Sentence Structure');
            setSyntaxText(`[S\n  [NP [Det The] [N stars]]\n  [VP [V shone] [PP [P in] [NP [Det the] [N night]]]]\n]`);
        } else if (type === 'indented') {
            setTitle('Phrase Structure Outline');
            setSyntaxText(`S\n  NP\n    Det: The\n    N: warrior\n  VP\n    V: returned\n    PP\n      P: to\n      NP\n        N: camp`);
        }
    };

    const handleInsert = () => {
        const sourceData = JSON.stringify({
            type: diagramType,
            data: diagramType === 'morphology' ? morphologySlots :
                  diagramType === 'syntax' ? syntaxText :
                  diagramType === 'dialect' ? dialectData : { nodes: flowchartNodes, conns: flowchartConns }
        });

        const defaultTitle = 
            diagramType === 'morphology' ? tr('wiki.richText.morphologyChain', 'Morphology Chain') :
            diagramType === 'syntax' ? tr('wiki.richText.syntaxTree', 'Syntax Tree') :
            diagramType === 'dialect' ? tr('wiki.richText.dialectTree', 'Dialect / Family Tree') :
            tr('wiki.richText.flowchart', 'Rule Flowchart');

        onInsert({
            diagramType,
            title: title.trim() || defaultTitle,
            sourceData,
            svg: previewSvg,
            width,
            align: alignment
        });

        onClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={initialData ? tr('wiki.richText.editDiagram', 'Edit Diagram & Vector Rules') : tr('wiki.richText.diagramTool', 'Diagrams & Flowcharts')}
        >
            <div className="wiki-diagram-modal-container">
                {/* Diagram Type Switcher */}
                <div className="wiki-diagram-type-tabs">
                    <button 
                        type="button" 
                        className={`wiki-diagram-type-btn ${diagramType === 'morphology' ? 'active' : ''}`}
                        onClick={() => { setDiagramType('morphology'); if (!title) setTitle(tr('wiki.richText.morphologyChain', 'Morphology Chain')); }}
                    >
                        <Workflow size={15} />
                        <span>{tr('wiki.richText.morphologyChain', 'Morphology Chain')}</span>
                    </button>
                    <button 
                        type="button" 
                        className={`wiki-diagram-type-btn ${diagramType === 'syntax' ? 'active' : ''}`}
                        onClick={() => { setDiagramType('syntax'); if (!title) setTitle(tr('wiki.richText.syntaxTree', 'Syntax Tree')); }}
                    >
                        <GitBranch size={15} />
                        <span>{tr('wiki.richText.syntaxTree', 'Syntax Tree')}</span>
                    </button>
                    <button 
                        type="button" 
                        className={`wiki-diagram-type-btn ${diagramType === 'dialect' ? 'active' : ''}`}
                        onClick={() => { setDiagramType('dialect'); if (!title) setTitle(tr('wiki.richText.dialectTree', 'Dialect / Family Tree')); }}
                    >
                        <Split size={15} />
                        <span>{tr('wiki.richText.dialectTree', 'Dialect / Family Tree')}</span>
                    </button>
                    <button 
                        type="button" 
                        className={`wiki-diagram-type-btn ${diagramType === 'flowchart' ? 'active' : ''}`}
                        onClick={() => { setDiagramType('flowchart'); if (!title) setTitle(tr('wiki.richText.flowchart', 'Rule Flowchart')); }}
                    >
                        <Network size={15} />
                        <span>{tr('wiki.richText.flowchart', 'Rule Flowchart')}</span>
                    </button>
                </div>

                {/* Title & Layout Controls */}
                <div className="wiki-field-group">
                    <Input 
                        label={tr('wiki.richText.diagramTitle', 'Diagram Title')} 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder={tr('wiki.richText.diagramTitlePlaceholder', 'e.g. Verbal Inflection Pipeline, Dialect Split...')} 
                    />
                </div>

                {/* Size and Alignment Selection */}
                <div className="wiki-options-grid" style={{ marginBottom: '8px' }}>
                    <div className="wiki-field-col">
                        <label className="wiki-field-label">{tr('wiki.richText.alignmentLabel', 'Alignment')}</label>
                        <div className="wiki-align-buttons">
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'left' ? 'active' : ''}`}
                                onClick={() => setAlignment('left')}
                                title={tr('wiki.richText.alignLeft', 'Left align')}
                            >
                                <AlignLeft size={16} />
                            </button>
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'center' ? 'active' : ''}`}
                                onClick={() => setAlignment('center')}
                                title={tr('wiki.richText.alignCenter', 'Center align')}
                            >
                                <AlignCenter size={16} />
                            </button>
                            <button 
                                type="button" 
                                className={`wiki-align-btn ${alignment === 'right' ? 'active' : ''}`}
                                onClick={() => setAlignment('right')}
                                title={tr('wiki.richText.alignRight', 'Right align')}
                            >
                                <AlignRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="wiki-field-col">
                        <label className="wiki-field-label">{tr('wiki.richText.widthLabel', 'Width / Scale')}</label>
                        <select 
                            className="wiki-select" 
                            value={width} 
                            onChange={(e) => setWidth(e.target.value)}
                        >
                            <option value="100%">{tr('wiki.richText.fullWidth', '100% (Full Width)')}</option>
                            <option value="75%">{tr('wiki.richText.largeWidth', '75% (Large)')}</option>
                            <option value="50%">{tr('wiki.richText.mediumWidth', '50% (Medium)')}</option>
                            <option value="35%">{tr('wiki.richText.compactWidth', '35% (Compact)')}</option>
                            <option value="25%">{tr('wiki.richText.thumbWidth', '25% (Thumbnail)')}</option>
                        </select>
                    </div>
                </div>

                {/* Live Vector Preview Area */}
                <div className="wiki-diagram-preview-card">
                    <div className="wiki-diagram-preview-header">
                        <div className="wiki-diagram-preview-label">
                            <Eye size={13} />
                            <span>{tr('wiki.richText.livePreview', 'Live Vector Preview')}</span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--tx3)' }}>
                            {width} &middot; {alignment}
                        </span>
                    </div>
                    <div 
                        className="wiki-diagram-svg-container"
                        dangerouslySetInnerHTML={{ __html: previewSvg }} 
                    />
                </div>

                {/* Configuration panel based on diagram type */}
                <div className="wiki-diagram-config-panel">
                    {/* 1. MORPHOLOGY CHAIN */}
                    {diagramType === 'morphology' && (
                        <div>
                            <div className="wiki-slots-header">
                                <span className="wiki-field-label">{tr('wiki.richText.morphologyChain', 'Affix & Morpheme Slots')}</span>
                                <Button variant="sec" onClick={addSlot}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Plus size={13} /> {tr('wiki.richText.addSlot', 'Add Slot')}
                                    </div>
                                </Button>
                            </div>
                            <div className="wiki-slots-list">
                                {morphologySlots.map((item, idx) => (
                                    <div key={idx} className="wiki-slot-row">
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button 
                                                type="button" 
                                                className="wiki-slot-move-btn"
                                                disabled={idx === 0}
                                                onClick={() => moveSlot(idx, -1)}
                                                title="Move Left"
                                            >
                                                <ArrowLeft size={12} />
                                            </button>
                                            <button 
                                                type="button" 
                                                className="wiki-slot-move-btn"
                                                disabled={idx === morphologySlots.length - 1}
                                                onClick={() => moveSlot(idx, 1)}
                                                title="Move Right"
                                            >
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                        <input 
                                            type="text" 
                                            className="wiki-slot-input" 
                                            placeholder="Slot Name" 
                                            value={item.slot} 
                                            onChange={(e) => updateSlot(idx, 'slot', e.target.value)} 
                                            style={{ width: '95px' }}
                                        />
                                        <input 
                                            type="text" 
                                            className="wiki-slot-input" 
                                            placeholder="Gloss / Example" 
                                            value={item.label} 
                                            onChange={(e) => updateSlot(idx, 'label', e.target.value)} 
                                            style={{ flex: 1 }}
                                        />
                                        <select 
                                            className="wiki-select wiki-select-compact"
                                            value={item.type}
                                            onChange={(e) => updateSlot(idx, 'type', e.target.value)}
                                        >
                                            <option value="prefix">Prefix</option>
                                            <option value="root">Root / Stem</option>
                                            <option value="infix">Infix</option>
                                            <option value="suffix">Suffix</option>
                                            <option value="clitic">Clitic</option>
                                        </select>
                                        <label className="wiki-checkbox-label">
                                            <input 
                                                type="checkbox" 
                                                checked={!!item.optional} 
                                                onChange={(e) => updateSlot(idx, 'optional', e.target.checked)} 
                                            />
                                            <span>{tr('wiki.richText.slotOptional', 'Optional')}</span>
                                        </label>
                                        <button 
                                            type="button" 
                                            className="wiki-slot-del-btn" 
                                            onClick={() => removeSlot(idx)} 
                                            title="Delete slot"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. SYNTAX TREE */}
                    {diagramType === 'syntax' && (
                        <div>
                            <div className="wiki-syntax-presets-row">
                                <span className="wiki-field-label">{tr('wiki.richText.presets', 'Presets:')}</span>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadSyntaxPreset('transitive')}>
                                    <Sparkles size={12} /> Transitive
                                </button>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadSyntaxPreset('intransitive')}>
                                    <Sparkles size={12} /> Intransitive
                                </button>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadSyntaxPreset('indented')}>
                                    <Sparkles size={12} /> Indented Outline
                                </button>
                            </div>
                            <textarea 
                                className="wiki-diagram-textarea" 
                                rows={6}
                                value={syntaxText}
                                onChange={(e) => setSyntaxText(e.target.value)}
                                placeholder="[S [NP [Det The] [N cat]] [VP [V sat]]]"
                            />
                            <span className="wiki-syntax-hint">
                                Supports bracket notation e.g. <code>[S [NP ...] [VP ...]]</code> or indented lines.
                            </span>
                        </div>
                    )}

                    {/* 3. DIALECT / FAMILY TREE (FULL TREE EDITING) */}
                    {diagramType === 'dialect' && (
                        <div className="wiki-dialect-editor">
                            <div className="wiki-slots-header" style={{ marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                <div className="wiki-mode-toggle">
                                    <button 
                                        type="button" 
                                        className={`wiki-mode-btn ${dialectMode === 'visual' ? 'active' : ''}`}
                                        onClick={() => setDialectMode('visual')}
                                    >
                                        <ListTree size={12} />
                                        <span>{tr('wiki.richText.visualTree', 'Visual Tree')}</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`wiki-mode-btn ${dialectMode === 'text' ? 'active' : ''}`}
                                        onClick={() => setDialectMode('text')}
                                    >
                                        <FileText size={12} />
                                        <span>{tr('wiki.richText.textOutline', 'Text Outline')}</span>
                                    </button>
                                </div>

                                <div className="wiki-syntax-presets-row" style={{ margin: 0 }}>
                                    <span className="wiki-field-label">{tr('wiki.richText.presets', 'Presets:')}</span>
                                    <button type="button" className="wiki-pill-btn" onClick={() => loadDialectPreset('binary')}>
                                        <Sparkles size={11} /> 2 Branches
                                    </button>
                                    <button type="button" className="wiki-pill-btn" onClick={() => loadDialectPreset('trifurcation')}>
                                        <Sparkles size={11} /> 3 Branches
                                    </button>
                                    <button type="button" className="wiki-pill-btn" onClick={() => loadDialectPreset('historical')}>
                                        <Sparkles size={11} /> Historical
                                    </button>
                                    <button type="button" className="wiki-pill-btn" onClick={() => loadDialectPreset('cluster')}>
                                        <Sparkles size={11} /> Continuum
                                    </button>
                                </div>
                            </div>

                            {dialectMode === 'visual' ? (
                                <div className="wiki-dialect-tree-wrapper">
                                    <DialectBranchItem 
                                        node={dialectData} 
                                        isRoot={true} 
                                        onUpdate={handleUpdateDialectNode} 
                                        onAddChild={handleAddDialectChild} 
                                        onAddSister={handleAddDialectSister} 
                                        onDelete={handleDeleteDialectNode}
                                        tr={tr}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <textarea 
                                        className="wiki-diagram-textarea" 
                                        rows={8}
                                        value={dialectText}
                                        onChange={(e) => handleDialectTextChange(e.target.value)}
                                        placeholder={`Proto-Language (1200 BCE)\n  Western Branch (600 BCE)\n    Coastal Dialect (Modern)\n  Eastern Branch (500 BCE)\n    Island Dialect (Extinct)`}
                                    />
                                    <span className="wiki-syntax-hint">
                                        Type or paste languages indented with 2 spaces or tabs. Append <code>(Year / Era)</code> or <code>(Extinct)</code>.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. DECISION FLOWCHART (FULL NODE & CONNECTION EDITING) */}
                    {diagramType === 'flowchart' && (
                        <div className="wiki-flowchart-editor">
                            {/* Presets */}
                            <div className="wiki-syntax-presets-row">
                                <span className="wiki-field-label">{tr('wiki.richText.presets', 'Presets:')}</span>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadFlowchartPreset('harmony')}>
                                    <Sparkles size={11} /> Vowel Harmony
                                </button>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadFlowchartPreset('lenition')}>
                                    <Sparkles size={11} /> Lenition Rule
                                </button>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadFlowchartPreset('case')}>
                                    <Sparkles size={11} /> Case Suffixes
                                </button>
                                <button type="button" className="wiki-pill-btn" onClick={() => loadFlowchartPreset('tone')}>
                                    <Sparkles size={11} /> Tone Sandhi
                                </button>
                            </div>

                            {/* Section 1: Flowchart Steps (Nodes) */}
                            <div className="wiki-slots-header" style={{ marginTop: '12px' }}>
                                <span className="wiki-field-label">{tr('wiki.richText.flowchartSteps', 'Flowchart Steps (Nodes)')}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <Button variant="sec" onClick={() => addFlowchartNode('decision')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}>
                                            <Plus size={12} /> {tr('wiki.richText.addCondition', '+ Condition')}
                                        </div>
                                    </Button>
                                    <Button variant="sec" onClick={() => addFlowchartNode('process')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}>
                                            <Plus size={12} /> {tr('wiki.richText.addAction', '+ Action')}
                                        </div>
                                    </Button>
                                    <Button variant="sec" onClick={() => addFlowchartNode('end')}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}>
                                            <Plus size={12} /> {tr('wiki.richText.addResult', '+ Result')}
                                        </div>
                                    </Button>
                                </div>
                            </div>

                            <div className="wiki-flowchart-nodes-list">
                                {flowchartNodes.map((n) => (
                                    <div key={n.id} className="wiki-flowchart-node-row">
                                        <select 
                                            className="wiki-select wiki-select-compact"
                                            value={n.type}
                                            onChange={(e) => updateFlowchartNode(n.id, 'type', e.target.value)}
                                            style={{ width: '135px' }}
                                        >
                                            <option value="start">{tr('wiki.richText.typeStart', 'Start / Input')}</option>
                                            <option value="decision">{tr('wiki.richText.typeDecision', 'Condition (Diamond)')}</option>
                                            <option value="process">{tr('wiki.richText.typeProcess', 'Action / Rule')}</option>
                                            <option value="end">{tr('wiki.richText.typeEnd', 'Result / Output')}</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            className="wiki-slot-input" 
                                            value={n.label} 
                                            onChange={(e) => updateFlowchartNode(n.id, 'label', e.target.value)}
                                            placeholder="Step text / rule description..."
                                            style={{ flex: 1 }}
                                        />
                                        <button 
                                            type="button" 
                                            className="wiki-slot-del-btn" 
                                            onClick={() => removeFlowchartNode(n.id)}
                                            title="Delete step"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Section 2: Transitions & Branches (Connections) */}
                            <div className="wiki-slots-header" style={{ marginTop: '16px' }}>
                                <span className="wiki-field-label">{tr('wiki.richText.flowchartTransitions', 'Transitions & Branching Paths')}</span>
                                <Button variant="sec" onClick={addFlowchartConn}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                        <Plus size={12} /> {tr('wiki.richText.addTransition', '+ Add Path')}
                                    </div>
                                </Button>
                            </div>

                            <div className="wiki-flowchart-conns-list">
                                {flowchartConns.map((c, cIdx) => (
                                    <div key={cIdx} className="wiki-flowchart-conn-row">
                                        <span style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>From:</span>
                                        <select 
                                            className="wiki-select wiki-select-compact"
                                            value={c.from}
                                            onChange={(e) => updateFlowchartConn(cIdx, 'from', e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            {flowchartNodes.map(n => (
                                                <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                            ))}
                                        </select>

                                        <span style={{ fontSize: '0.75rem', color: 'var(--tx3)' }}>→ To:</span>
                                        <select 
                                            className="wiki-select wiki-select-compact"
                                            value={c.to}
                                            onChange={(e) => updateFlowchartConn(cIdx, 'to', e.target.value)}
                                            style={{ flex: 1 }}
                                        >
                                            {flowchartNodes.map(n => (
                                                <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                            ))}
                                        </select>

                                        <input 
                                            type="text" 
                                            className="wiki-slot-input" 
                                            placeholder="Condition (e.g. Yes / No / Else)" 
                                            value={c.label || ''} 
                                            onChange={(e) => updateFlowchartConn(cIdx, 'label', e.target.value)}
                                            style={{ width: '130px' }}
                                        />

                                        <button 
                                            type="button" 
                                            className="wiki-slot-del-btn" 
                                            onClick={() => removeFlowchartConn(cIdx)}
                                            title="Delete transition"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="wiki-modal-footer">
                    <Button variant="sec" onClick={onClose}>{tr('wiki.richText.cancel', 'Cancel')}</Button>
                    <Button variant="imp" onClick={handleInsert}>
                        {initialData ? tr('wiki.richText.updateDiagramBtn', 'Update Diagram') : tr('wiki.richText.insertDiagramBtn', 'Insert Diagram')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
