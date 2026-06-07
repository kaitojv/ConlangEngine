import React, { useMemo, useRef } from 'react';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { useTransliterator } from '@/hooks/useTransliterator.jsx';
import Button from '@/components/UI/Buttons/Buttons.jsx';
import { Download } from 'lucide-react';

// A simple heuristic parser to generate a syntax tree from a flat array of words
const buildTree = (tokens, syntaxOrder = 'SVO') => {
    // 1. Clean tokens and extract primary POS tags
    const words = tokens.filter(t => !t.isPunctuation || t.text.trim() === '').map(t => {
        let pos = 'UNK';
        let gloss = '???';
        let base = t.text;
        
        if (t.parsings && t.parsings.length > 0) {
            const root = t.parsings[0].root;
            base = root.word.replace(/\*/g, '');
            gloss = (root.translation?.split(',')[0] || '').trim();
            const cls = (root.wordClass || '').toLowerCase();
            if (cls.includes('noun')) pos = 'N';
            else if (cls.includes('verb')) pos = 'V';
            else if (cls.includes('adj')) pos = 'Adj';
            else if (cls.includes('adv')) pos = 'Adv';
            else if (cls.includes('pro')) pos = 'Pron';
            else if (cls.includes('adpo') || cls.includes('prep') || cls.includes('post')) pos = 'P';
            else if (cls.includes('conj')) pos = 'Conj';
            else if (cls.includes('det')) pos = 'Det';
        }
        
        return { type: 'leaf', pos, base, surface: t.text, gloss };
    });

    if (words.length === 0) return null;

    // 2. Chunking: Group Nouns with Adjectives/Determiners into NPs
    let chunks = [];
    let currentNP = [];

    const flushNP = () => {
        if (currentNP.length === 0) return;
        if (currentNP.length === 1) {
            chunks.push(currentNP[0]);
        } else {
            chunks.push({ type: 'node', pos: 'NP', children: [...currentNP] });
        }
        currentNP = [];
    };

    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (w.pos === 'N' || w.pos === 'Pron') {
            currentNP.push(w);
            flushNP();
        } else if (w.pos === 'Adj' || w.pos === 'Det') {
            currentNP.push(w);
        } else {
            flushNP();
            chunks.push(w);
        }
    }
    flushNP();

    // 3. Group Verbs with Objects into VPs based on Word Order
    let finalChunks = [];
    for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (c.pos === 'V') {
            // Check adjacent chunks for objects (N or NP) based on word order
            if (syntaxOrder === 'SVO' || syntaxOrder === 'VSO') {
                // Verb looks forward for object
                if (i + 1 < chunks.length && (chunks[i+1].pos === 'N' || chunks[i+1].pos === 'NP' || chunks[i+1].pos === 'Pron')) {
                    finalChunks.push({ type: 'node', pos: 'VP', children: [c, chunks[i+1]] });
                    i++; // Skip the object
                    continue;
                }
            } else if (syntaxOrder === 'SOV' || syntaxOrder === 'OSV') {
                // Verb looks backward for object
                if (finalChunks.length > 0) {
                    const prev = finalChunks[finalChunks.length - 1];
                    if (prev.pos === 'N' || prev.pos === 'NP' || prev.pos === 'Pron') {
                        finalChunks.pop();
                        finalChunks.push({ type: 'node', pos: 'VP', children: [prev, c] });
                        continue;
                    }
                }
            }
        }
        finalChunks.push(c);
    }

    // 4. Group everything into an S node
    if (finalChunks.length === 1) return finalChunks[0];
    return { type: 'node', pos: 'S', children: finalChunks };
};

// Tree Layout Algorithm (Simple Post-Order Traversal)
const NODE_WIDTH = 100;
const NODE_HEIGHT = 80;

const calculateLayout = (node, depth = 0, currentX = 0) => {
    if (!node) return null;
    
    let x = currentX;
    let y = depth * NODE_HEIGHT + 40;
    
    if (node.type === 'leaf') {
        return { ...node, x: x + NODE_WIDTH / 2, y, width: NODE_WIDTH };
    }
    
    const children = [];
    let childX = currentX;
    
    for (const child of node.children) {
        const laidOutChild = calculateLayout(child, depth + 1, childX);
        children.push(laidOutChild);
        childX += laidOutChild.width;
    }
    
    // Parent x is center of children
    const minX = children[0].x;
    const maxX = children[children.length - 1].x;
    x = (minX + maxX) / 2;
    
    return { ...node, x, y, width: childX - currentX, children };
};

export default function SyntaxTreeRenderer({ processedWords }) {
    const config = useConfigStore();
    const { transliterate } = useTransliterator();
    const svgRef = useRef(null);

    const treeData = useMemo(() => {
        const syntaxOrder = config.syntaxOrder || 'SVO';
        const rawTree = buildTree(processedWords, syntaxOrder);
        return calculateLayout(rawTree);
    }, [processedWords, config.syntaxOrder]);

    if (!treeData) return <p style={{ color: 'var(--tx3)', textAlign: 'center', padding: '20px' }}>Not enough words to build a syntax tree.</p>;

    const totalWidth = Math.max(treeData.width, 600);
    const totalHeight = 400; // Can dynamically calculate based on max depth

    const renderNodes = (node) => {
        if (!node) return null;
        
        let elements = [];
        
        // Draw links to children
        if (node.children) {
            node.children.forEach(child => {
                elements.push(
                    <line 
                        key={`link-${node.x}-${node.y}-${child.x}-${child.y}`}
                        x1={node.x} y1={node.y + 15} 
                        x2={child.x} y2={child.y - 20} 
                        stroke="var(--tx3)" 
                        strokeWidth="2" 
                    />
                );
                elements = elements.concat(renderNodes(child));
            });
        }
        
        // Draw the node itself
        if (node.type === 'leaf') {
            elements.push(
                <g key={`leaf-${node.x}-${node.y}`}>
                    <text x={node.x} y={node.y} textAnchor="middle" fill="var(--acc)" fontWeight="bold" fontSize="16px" className="custom-font-text notranslate">
                        {transliterate(node.surface)}
                    </text>
                    <text x={node.x} y={node.y + 20} textAnchor="middle" fill="var(--tx2)" fontSize="12px" fontStyle="italic">
                        {node.gloss}
                    </text>
                    <text x={node.x} y={node.y - 20} textAnchor="middle" fill="var(--tx)" fontSize="14px" fontWeight="bold">
                        {node.pos}
                    </text>
                </g>
            );
        } else {
            elements.push(
                <text key={`node-${node.x}-${node.y}`} x={node.x} y={node.y} textAnchor="middle" fill="var(--tx)" fontWeight="bold" fontSize="18px">
                    {node.pos}
                </text>
            );
        }
        
        return elements;
    };

    const downloadSVG = () => {
        if (!svgRef.current) return;
        
        // We need to inline the CSS variables so the downloaded SVG actually has colors!
        const svgElement = svgRef.current;
        const styles = getComputedStyle(document.body);
        const acc = styles.getPropertyValue('--acc').trim() || '#3b82f6';
        const tx = styles.getPropertyValue('--tx').trim() || '#f8fafc';
        const tx2 = styles.getPropertyValue('--tx2').trim() || '#94a3b8';
        const tx3 = styles.getPropertyValue('--tx3').trim() || '#475569';
        const card = styles.getPropertyValue('--card').trim() || '#1e293b';

        let svgString = new XMLSerializer().serializeToString(svgElement);
        svgString = svgString.replace(/var\(--acc\)/g, acc)
                             .replace(/var\(--tx\)/g, tx)
                             .replace(/var\(--tx2\)/g, tx2)
                             .replace(/var\(--tx3\)/g, tx3)
                             .replace(/var\(--card\)/g, card);
        
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `syntax_tree_${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
            <div style={{ width: '100%', overflowX: 'auto', background: 'var(--card)', borderRadius: 'var(--rad)', border: '1px solid var(--bd)', padding: '20px' }}>
                <svg 
                    ref={svgRef}
                    width={totalWidth} 
                    height={totalHeight} 
                    viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ minWidth: totalWidth }}
                >
                    <rect width="100%" height="100%" fill="var(--card)" rx="8" />
                    {renderNodes(treeData)}
                </svg>
            </div>
            <Button variant="default" onClick={downloadSVG}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Download Tree SVG
                </div>
            </Button>
        </div>
    );
}
