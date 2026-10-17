/**
 * Diagram and Flowchart (Fluogram) generators for conlangers.
 * Produces standalone, responsive, scalable vector SVGs suitable for embedding into Wiki documents.
 */

/**
 * Escapes XML/SVG special characters
 */
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// -------------------------------------------------------------
// 1. Morphology / Affix Order Flowchart
// -------------------------------------------------------------

/**
 * Generates an SVG representing an affix slot chain (Morphological Pipeline).
 * @param {Array<{ slot: string, label: string, type: 'prefix'|'root'|'suffix'|'infix'|'clitic', optional?: boolean }>} slots
 * @param {Object} options
 * @returns {string} SVG markup
 */
export function generateMorphologySvg(slots = [], options = {}) {
    if (!slots || slots.length === 0) {
        slots = [
            { slot: 'Slot -2', label: 'Negation Prefix', type: 'prefix', optional: true },
            { slot: 'Slot -1', label: 'Tense / Aspect', type: 'prefix', optional: false },
            { slot: 'Slot 0', label: 'Verb Root', type: 'root', optional: false },
            { slot: 'Slot +1', label: 'Causative / Voice', type: 'suffix', optional: true },
            { slot: 'Slot +2', label: 'Person Agreement', type: 'suffix', optional: false }
        ];
    }

    const boxWidth = 140;
    const boxHeight = 76;
    const gap = 34;
    const arrowWidth = gap;
    const paddingX = 30;
    const paddingY = 30;
    const totalWidth = paddingX * 2 + slots.length * boxWidth + (slots.length - 1) * gap;
    const totalHeight = paddingY * 2 + boxHeight;

    const colorMap = {
        root: { bg: '#6366f1', text: '#ffffff', border: '#4f46e5', badge: '#4338ca' },
        prefix: { bg: '#0ea5e9', text: '#ffffff', border: '#0284c7', badge: '#0369a1' },
        suffix: { bg: '#10b981', text: '#ffffff', border: '#059669', badge: '#047857' },
        infix: { bg: '#f59e0b', text: '#ffffff', border: '#d97706', badge: '#b45309' },
        clitic: { bg: '#8b5cf6', text: '#ffffff', border: '#7c3aed', badge: '#6d28d9' },
        default: { bg: '#334155', text: '#ffffff', border: '#475569', badge: '#1e293b' }
    };

    let nodesSvg = '';
    let arrowsSvg = '';

    slots.forEach((item, index) => {
        const x = paddingX + index * (boxWidth + gap);
        const y = paddingY;
        const colors = colorMap[item.type] || colorMap.default;
        const strokeDash = item.optional ? 'stroke-dasharray="4,4"' : '';
        const optionalBadge = item.optional ? '(Optional)' : '(Mandatory)';

        // Node card
        nodesSvg += `
        <g class="morpho-node" data-index="${index}">
            <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="8" ry="8" 
                fill="${colors.bg}" stroke="${colors.border}" stroke-width="2" ${strokeDash} />
            <rect x="${x}" y="${y}" width="${boxWidth}" height="22" rx="8" ry="8" fill="${colors.badge}" opacity="0.9" />
            <rect x="${x}" y="${y + 14}" width="${boxWidth}" height="8" fill="${colors.badge}" opacity="0.9" />
            <text x="${x + boxWidth / 2}" y="${y + 15}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(item.slot || `Slot ${index + 1}`)}
            </text>
            <text x="${x + boxWidth / 2}" y="${y + 43}" fill="${colors.text}" font-size="13" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(item.label || item.type)}
            </text>
            <text x="${x + boxWidth / 2}" y="${y + 62}" fill="${colors.text}" font-size="10" opacity="0.85" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(optionalBadge)}
            </text>
        </g>`;

        // Connecting arrow to next node
        if (index < slots.length - 1) {
            const startX = x + boxWidth;
            const endX = startX + gap;
            const arrowY = y + boxHeight / 2;
            arrowsSvg += `
            <g class="morpho-arrow">
                <line x1="${startX}" y1="${arrowY}" x2="${endX - 6}" y2="${arrowY}" stroke="#94a3b8" stroke-width="2.5" />
                <polygon points="${endX},${arrowY} ${endX - 8},${arrowY - 4.5} ${endX - 8},${arrowY + 4.5}" fill="#94a3b8" />
            </g>`;
        }
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" class="wiki-svg-diagram wiki-morphology-flowchart" style="max-width: 100%; display: block; margin: 12px auto; overflow: visible;">
        <defs>
            <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15" />
            </filter>
        </defs>
        <rect width="${totalWidth}" height="${totalHeight}" rx="12" fill="var(--s2, #1e293b)" opacity="0.3" />
        ${arrowsSvg}
        ${nodesSvg}
    </svg>`;
}

// -------------------------------------------------------------
// 2. Syntax Tree Generator (Bracket & Indented parser)
// -------------------------------------------------------------

/**
 * Parses bracket notation like [S [NP [Det The] [N dragon]] [VP [V roared]]]
 */
export function parseBracketSyntax(bracketStr) {
    const cleaned = bracketStr.trim();
    if (!cleaned.startsWith('[')) {
        return parseIndentedSyntax(bracketStr);
    }

    let i = 0;
    function parseNode() {
        if (cleaned[i] !== '[') return null;
        i++; // skip '['
        while (i < cleaned.length && /\s/.test(cleaned[i])) i++;

        // Read label
        let label = '';
        while (i < cleaned.length && cleaned[i] !== '[' && cleaned[i] !== ']' && !/\s/.test(cleaned[i])) {
            label += cleaned[i];
            i++;
        }
        while (i < cleaned.length && /\s/.test(cleaned[i])) i++;

        const children = [];
        let terminal = '';

        while (i < cleaned.length && cleaned[i] !== ']') {
            if (cleaned[i] === '[') {
                const child = parseNode();
                if (child) children.push(child);
            } else {
                terminal += cleaned[i];
                i++;
            }
            while (i < cleaned.length && /\s/.test(cleaned[i])) i++;
        }

        if (cleaned[i] === ']') i++; // skip ']'

        terminal = terminal.trim();
        return {
            label: label || 'Node',
            terminal: terminal || null,
            children
        };
    }

    const root = parseNode();
    return root || { label: 'S', children: [] };
}

/**
 * Parses indented syntax:
 * S
 *   NP
 *     Det: The
 *     N: dragon
 *   VP
 *     V: roared
 */
export function parseIndentedSyntax(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return { label: 'S', children: [] };

    const parsedLines = lines.map(line => {
        const indent = line.search(/\S|$/);
        const content = line.trim();
        let label = content;
        let terminal = null;
        if (content.includes(':')) {
            const parts = content.split(':');
            label = parts[0].trim();
            terminal = parts.slice(1).join(':').trim();
        } else if (content.includes('(') && content.endsWith(')')) {
            const parenIdx = content.indexOf('(');
            label = content.slice(0, parenIdx).trim();
            terminal = content.slice(parenIdx + 1, -1).trim();
        }
        return { indent, label, terminal, children: [] };
    });

    const root = parsedLines[0];
    const stack = [{ node: root, indent: root.indent }];

    for (let i = 1; i < parsedLines.length; i++) {
        const current = parsedLines[i];
        while (stack.length > 0 && stack[stack.length - 1].indent >= current.indent) {
            stack.pop();
        }
        if (stack.length > 0) {
            stack[stack.length - 1].node.children.push(current);
        }
        stack.push({ node: current, indent: current.indent });
    }

    return root;
}

/**
 * Computes tree layout coordinates and returns SVG markup
 */
export function generateSyntaxTreeSvg(treeInput) {
    let tree = typeof treeInput === 'string' ? parseBracketSyntax(treeInput) : treeInput;
    if (!tree) {
        tree = {
            label: 'S',
            children: [
                {
                    label: 'NP',
                    children: [
                        { label: 'Det', terminal: 'The', children: [] },
                        { label: 'N', terminal: 'warrior', children: [] }
                    ]
                },
                {
                    label: 'VP',
                    children: [
                        { label: 'V', terminal: 'struck', children: [] },
                        {
                            label: 'NP',
                            children: [
                                { label: 'Det', terminal: 'the', children: [] },
                                { label: 'N', terminal: 'shield', children: [] }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    // Measure tree width and depth
    let leafCount = 0;
    function layoutLeaves(node, depth = 0) {
        node.depth = depth;
        if (!node.children || node.children.length === 0) {
            node.xIndex = leafCount++;
            return;
        }
        node.children.forEach(c => layoutLeaves(c, depth + 1));
        const first = node.children[0].xIndex;
        const last = node.children[node.children.length - 1].xIndex;
        node.xIndex = (first + last) / 2;
    }

    layoutLeaves(tree, 0);

    const xSpacing = 90;
    const ySpacing = 70;
    const padX = 50;
    const padY = 40;

    let maxDepth = 0;
    function findMaxDepth(node) {
        if (node.depth > maxDepth) maxDepth = node.depth;
        if (node.terminal) {
            if (node.depth + 1 > maxDepth) maxDepth = node.depth + 1;
        }
        if (node.children) node.children.forEach(findMaxDepth);
    }
    findMaxDepth(tree);

    const width = padX * 2 + Math.max(1, leafCount) * xSpacing;
    const height = padY * 2 + (maxDepth + 1) * ySpacing;

    let linesSvg = '';
    let nodesSvg = '';

    function renderNode(node) {
        const x = padX + (node.xIndex + 0.5) * xSpacing;
        const y = padY + node.depth * ySpacing;

        // Draw connections to children
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                const cx = padX + (child.xIndex + 0.5) * xSpacing;
                const cy = padY + child.depth * ySpacing;
                linesSvg += `<line x1="${x}" y1="${y + 10}" x2="${cx}" y2="${cy - 12}" stroke="#94a3b8" stroke-width="2" />`;
                renderNode(child);
            });
        }

        // Terminal leaf word
        if (node.terminal) {
            const ty = y + ySpacing - 10;
            linesSvg += `<line x1="${x}" y1="${y + 12}" x2="${x}" y2="${ty - 14}" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />`;
            nodesSvg += `
            <g class="tree-terminal">
                <rect x="${x - 36}" y="${ty - 12}" width="72" height="24" rx="4" fill="var(--s3, #334155)" stroke="var(--bd, #475569)" stroke-width="1" />
                <text x="${x}" y="${ty + 4}" fill="var(--acc, #38bdf8)" font-style="italic" font-size="12" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">
                    ${escapeXml(node.terminal)}
                </text>
            </g>`;
        }

        // Node badge
        nodesSvg += `
        <g class="tree-node">
            <circle cx="${x}" cy="${y}" r="15" fill="#4f46e5" stroke="#818cf8" stroke-width="2" />
            <text x="${x}" y="${y + 4}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(node.label)}
            </text>
        </g>`;
    }

    renderNode(tree);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="auto" class="wiki-svg-diagram wiki-syntax-tree" style="max-width: 100%; display: block; margin: 12px auto; overflow: visible;">
        <rect width="${width}" height="${height}" rx="12" fill="var(--s2, #1e293b)" opacity="0.3" />
        ${linesSvg}
        ${nodesSvg}
    </svg>`;
}

// -------------------------------------------------------------
// 3. Dialect / Language Family Tree Generator
// -------------------------------------------------------------

/**
 * Parses indented text into a recursive dialect tree structure.
 * Supports syntax like:
 * Proto-Language (c. 1200 BCE)
 *   Western Branch (600 BCE)
 *     Coastal Dialect (Modern)
 *     Valley Dialect (Modern)
 *   Eastern Branch (500 BCE)
 *     Island Dialect (Extinct)
 */
export function parseIndentedDialectTree(text) {
    if (!text || typeof text !== 'string') return null;
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return null;

    const parsedLines = lines.map(line => {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].replace(/\t/g, '  ').length : 0;
        let content = line.trim();

        let extinct = false;
        if (/[\(\[]extinct[\)\]]/i.test(content)) {
            extinct = true;
            content = content.replace(/[\(\[]extinct[\)\]]/gi, '').trim();
        }

        let name = content;
        let period = '';

        const parenMatch = content.match(/^(.*?)\s*[\(\[]([^\)\]]+)[\)\]]$/);
        if (parenMatch) {
            name = parenMatch[1].trim();
            period = parenMatch[2].trim();
        }

        return { indent, name: name || 'Language', period, extinct, children: [] };
    });

    const root = parsedLines[0];
    const stack = [{ node: root, indent: root.indent }];

    for (let i = 1; i < parsedLines.length; i++) {
        const current = parsedLines[i];
        while (stack.length > 0 && stack[stack.length - 1].indent >= current.indent) {
            stack.pop();
        }
        if (stack.length > 0) {
            stack[stack.length - 1].node.children.push(current);
        }
        stack.push({ node: current, indent: current.indent });
    }

    return root;
}

/**
 * Serializes a recursive dialect tree back into clean indented text.
 */
export function formatDialectTreeToText(node, level = 0) {
    if (!node) return '';
    const indent = '  '.repeat(level);
    const tags = [];
    if (node.period) tags.push(node.period);
    if (node.extinct) tags.push('Extinct');
    const tagStr = tags.length > 0 ? ` (${tags.join(', ')})` : '';
    let result = `${indent}${node.name || 'Language'}${tagStr}\n`;
    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            result += formatDialectTreeToText(child, level + 1);
        });
    }
    return result;
}

/**
 * Generates an SVG phylogenetic tree showing language evolution or dialect branching.
 * @param {Object|string} treeInput 
 */
export function generateDialectTreeSvg(treeInput) {
    let treeData = typeof treeInput === 'string' ? parseIndentedDialectTree(treeInput) : treeInput;
    if (!treeData) {
        treeData = {
            name: 'Proto-Solar',
            period: 'c. 1200 BCE',
            children: [
                {
                    name: 'Western Solar',
                    period: 'c. 600 BCE',
                    children: [
                        { name: 'Coast Solar', period: 'Modern', children: [] },
                        { name: 'Valley Solar', period: 'Modern', children: [] }
                    ]
                },
                {
                    name: 'Eastern Solar',
                    period: 'c. 500 BCE',
                    children: [
                        { name: 'Highland Solar', period: 'Modern', children: [] },
                        { name: 'Island Dialect', period: 'Extinct', extinct: true, children: [] }
                    ]
                }
            ]
        };
    }

    let leafCount = 0;
    function computeLeaves(node, depth = 0) {
        node.depth = depth;
        if (!node.children || node.children.length === 0) {
            node.leafIndex = leafCount++;
            return;
        }
        node.children.forEach(c => computeLeaves(c, depth + 1));
        const first = node.children[0].leafIndex;
        const last = node.children[node.children.length - 1].leafIndex;
        node.leafIndex = (first + last) / 2;
    }
    computeLeaves(treeData, 0);

    const cardWidth = 140;
    const cardHeight = 56;
    const xStep = 170;
    const yStep = 90;
    const padX = 40;
    const padY = 40;

    let maxDepth = 0;
    function calcDepth(n) {
        if (n.depth > maxDepth) maxDepth = n.depth;
        if (n.children) n.children.forEach(calcDepth);
    }
    calcDepth(treeData);

    const totalWidth = padX * 2 + Math.max(1, leafCount) * xStep;
    const totalHeight = padY * 2 + (maxDepth + 1) * yStep;

    let linksSvg = '';
    let cardsSvg = '';

    function renderBranch(node) {
        const x = padX + (node.leafIndex + 0.5) * xStep - cardWidth / 2;
        const y = padY + node.depth * yStep;
        const centerX = x + cardWidth / 2;
        const bottomY = y + cardHeight;

        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                const childCenterX = padX + (child.leafIndex + 0.5) * xStep;
                const childTopY = padY + child.depth * yStep;
                const midY = (bottomY + childTopY) / 2;

                // Orthogonal branch link
                linksSvg += `
                <path d="M ${centerX} ${bottomY} L ${centerX} ${midY} L ${childCenterX} ${midY} L ${childCenterX} ${childTopY}" 
                      fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
                renderBranch(child);
            });
        }

        const isExtinct = !!node.extinct;
        const bgColor = isExtinct ? '#334155' : (node.depth === 0 ? '#4338ca' : '#0f766e');
        const borderColor = isExtinct ? '#64748b' : (node.depth === 0 ? '#6366f1' : '#14b8a6');
        const extinctDagger = isExtinct ? ' †' : '';

        cardsSvg += `
        <g class="dialect-card">
            <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="8" 
                  fill="${bgColor}" stroke="${borderColor}" stroke-width="2" />
            <text x="${centerX}" y="${y + 24}" fill="#ffffff" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(node.name)}${extinctDagger}
            </text>
            <text x="${centerX}" y="${y + 42}" fill="#cbd5e1" font-size="10" font-weight="500" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(node.period || '')}
            </text>
        </g>`;
    }

    renderBranch(treeData);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" class="wiki-svg-diagram wiki-dialect-tree" style="max-width: 100%; display: block; margin: 12px auto; overflow: visible;">
        <rect width="${totalWidth}" height="${totalHeight}" rx="12" fill="var(--s2, #1e293b)" opacity="0.3" />
        ${linksSvg}
        ${cardsSvg}
    </svg>`;
}

// -------------------------------------------------------------
// 4. Grammar Decision / Rule Pipeline Flowchart
// -------------------------------------------------------------

/**
 * Generates an SVG for decision logic (e.g. Vowel Harmony, Case Selection, Tone Sandhi).
 * Automatically computes intelligent topological layout if explicit coordinates are omitted.
 */
export function generateDecisionFlowchartSvg(nodesOrConfig = [], connectionsParam = []) {
    let nodes = nodesOrConfig;
    let connections = connectionsParam;

    if (nodesOrConfig && typeof nodesOrConfig === 'object' && !Array.isArray(nodesOrConfig)) {
        nodes = nodesOrConfig.nodes || [];
        connections = nodesOrConfig.connections || [];
    }

    if (!nodes || nodes.length === 0) {
        nodes = [
            { id: 'start', label: 'Noun Stem', type: 'start' },
            { id: 'harmony', label: 'Last vowel front?', type: 'decision' },
            { id: 'front', label: 'Add Suffix: -in', type: 'process' },
            { id: 'back', label: 'Add Suffix: -on', type: 'process' },
            { id: 'end', label: 'Surface Form', type: 'end' }
        ];
        connections = [
            { from: 'start', to: 'harmony', label: '' },
            { from: 'harmony', to: 'front', label: 'Yes (i, e)' },
            { from: 'harmony', to: 'back', label: 'No (a, o, u)' },
            { from: 'front', to: 'end', label: '' },
            { from: 'back', to: 'end', label: '' }
        ];
    }

    // Auto-layout coordinates if any node lacks x/y or if auto-layout requested
    const needsAutoLayout = nodes.some(n => typeof n.x !== 'number' || typeof n.y !== 'number');
    
    const nodeMap = new Map();
    nodes.forEach(n => {
        const w = n.w || Math.max(140, Math.min(220, (n.label || '').length * 8 + 36));
        const h = n.h || (n.type === 'decision' ? 56 : 46);
        nodeMap.set(n.id, { ...n, w, h });
    });

    if (needsAutoLayout) {
        // Calculate in-degrees
        const inDegree = new Map();
        nodes.forEach(n => inDegree.set(n.id, 0));
        connections.forEach(c => {
            inDegree.set(c.to, (inDegree.get(c.to) || 0) + 1);
        });

        // Layer assignment using BFS from root nodes
        const layerMap = new Map();
        const roots = nodes.filter(n => inDegree.get(n.id) === 0 || n.type === 'start');
        if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);

        const queue = roots.map(r => ({ id: r.id, layer: 0 }));
        roots.forEach(r => layerMap.set(r.id, 0));

        while (queue.length > 0) {
            const { id, layer } = queue.shift();
            const outgoing = connections.filter(c => c.from === id);
            outgoing.forEach(edge => {
                const currentLayer = layerMap.get(edge.to);
                const nextLayer = layer + 1;
                if (currentLayer === undefined || currentLayer < nextLayer) {
                    layerMap.set(edge.to, nextLayer);
                    queue.push({ id: edge.to, layer: nextLayer });
                }
            });
        }

        // Assign unreached nodes to default layer
        nodes.forEach(n => {
            if (!layerMap.has(n.id)) {
                layerMap.set(n.id, n.type === 'end' ? 99 : 1);
            }
        });

        // Group by layer
        const layers = new Map();
        nodes.forEach(n => {
            const l = layerMap.get(n.id);
            if (!layers.has(l)) layers.set(l, []);
            layers.get(l).push(n.id);
        });

        const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);
        let maxCols = 1;
        sortedLayerKeys.forEach(k => {
            if (layers.get(k).length > maxCols) maxCols = layers.get(k).length;
        });

        const padX = 40;
        const padY = 40;
        const colWidth = 220;
        const rowHeight = 110;
        const totalLayoutWidth = Math.max(600, padX * 2 + maxCols * colWidth);

        sortedLayerKeys.forEach((layerKey, lIdx) => {
            const nodeIds = layers.get(layerKey);
            const count = nodeIds.length;
            nodeIds.forEach((id, colIdx) => {
                const item = nodeMap.get(id);
                const layerY = padY + lIdx * rowHeight;
                const layerSlotWidth = totalLayoutWidth / count;
                const layerX = (colIdx + 0.5) * layerSlotWidth - item.w / 2;
                item.x = Math.max(padX, layerX);
                item.y = layerY;
            });
        });
    }

    let minX = 0, minY = 0, maxX = 600, maxY = 380;
    nodeMap.forEach(n => {
        if (n.x + n.w + 40 > maxX) maxX = n.x + n.w + 40;
        if (n.y + n.h + 40 > maxY) maxY = n.y + n.h + 40;
    });

    let arrowsSvg = '';
    connections.forEach(conn => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        if (!fromNode || !toNode) return;

        const fromCenter = { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
        const toCenter = { x: toNode.x + toNode.w / 2, y: toNode.y + toNode.h / 2 };

        let startX = fromCenter.x;
        let startY = fromNode.y + fromNode.h;
        let endX = toCenter.x;
        let endY = toNode.y;

        // If toNode is directly horizontal
        if (Math.abs(fromCenter.y - toCenter.y) < 20) {
            if (fromCenter.x < toCenter.x) {
                startX = fromNode.x + fromNode.w;
                startY = fromCenter.y;
                endX = toNode.x;
                endY = toCenter.y;
            } else {
                startX = fromNode.x;
                startY = fromCenter.y;
                endX = toNode.x + toNode.w;
                endY = toCenter.y;
            }
        }

        const midY = (startY + endY) / 2;

        arrowsSvg += `
        <g class="flow-edge">
            <path d="M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY - 6}" 
                  fill="none" stroke="#94a3b8" stroke-width="2" />
            <polygon points="${endX},${endY} ${endX - 5},${endY - 8} ${endX + 5},${endY - 8}" fill="#94a3b8" />
            ${conn.label ? `
            <rect x="${(startX + endX) / 2 - 45}" y="${midY - 11}" width="90" height="20" rx="4" fill="var(--s3, #1e293b)" stroke="var(--bd, #475569)" stroke-width="1" />
            <text x="${(startX + endX) / 2}" y="${midY + 3}" fill="#cbd5e1" font-size="10" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(conn.label)}
            </text>` : ''}
        </g>`;
    });

    let nodesSvg = '';
    nodeMap.forEach(n => {
        let shape = '';
        if (n.type === 'start') {
            shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />`;
        } else if (n.type === 'end') {
            shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${n.h / 2}" fill="#059669" stroke="#34d399" stroke-width="2" />`;
        } else if (n.type === 'decision') {
            const cx = n.x + n.w / 2;
            const cy = n.y + n.h / 2;
            shape = `<polygon points="${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}" fill="#b45309" stroke="#fbbf24" stroke-width="2" />`;
        } else {
            shape = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="#4f46e5" stroke="#818cf8" stroke-width="2" />`;
        }

        nodesSvg += `
        <g class="flow-node">
            ${shape}
            <text x="${n.x + n.w / 2}" y="${n.y + n.h / 2 + 4}" fill="#ffffff" font-size="11" font-weight="600" text-anchor="middle" font-family="system-ui, sans-serif">
                ${escapeXml(n.label)}
            </text>
        </g>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}" width="100%" height="auto" class="wiki-svg-diagram wiki-decision-flowchart" style="max-width: 100%; display: block; margin: 12px auto; overflow: visible;">
        <rect width="${maxX}" height="${maxY}" rx="12" fill="var(--s2, #1e293b)" opacity="0.3" />
        ${arrowsSvg}
        ${nodesSvg}
    </svg>`;
}
