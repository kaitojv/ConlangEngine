import assert from 'node:assert/strict';
import { 
    validateFileSize, 
    formatBytes, 
    DEFAULT_MAX_IMAGE_MB 
} from '../src/components/pages/wiki/imageCompressor.js';
import { 
    parseBracketSyntax, 
    parseIndentedSyntax, 
    generateSyntaxTreeSvg, 
    generateMorphologySvg, 
    generateDialectTreeSvg, 
    generateDecisionFlowchartSvg 
} from '../src/components/pages/wiki/diagramGenerators.js';
import { 
    WikiImageNode, 
    WikiDiagramNode 
} from '../src/components/pages/wiki/wikiNodes.js';

console.log('Running Wiki Rich Features Tests (Images, Diagrams, Doodles)...');

// --- 1. Image Size Validation Tests ---
{
    console.log('  Testing image size validation & formatters...');
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1024 * 1024), '1 MB');
    assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB');

    // Allowed within limit
    const okCheck = validateFileSize(1.8 * 1024 * 1024, DEFAULT_MAX_IMAGE_MB);
    assert.equal(okCheck.valid, true);
    assert.equal(okCheck.error, null);

    // Exceeds limit
    const failCheck = validateFileSize(2.4 * 1024 * 1024, DEFAULT_MAX_IMAGE_MB);
    assert.equal(failCheck.valid, false);
    assert.match(failCheck.error, /exceeds the maximum allowed limit of 2 MB/);

    // Exact boundary
    const exactCheck = validateFileSize(DEFAULT_MAX_IMAGE_MB * 1024 * 1024, DEFAULT_MAX_IMAGE_MB);
    assert.equal(exactCheck.valid, true);
}

// --- 2. Syntax Tree Parser & SVG Generation Tests ---
{
    console.log('  Testing Syntax Tree parser and SVG renderer...');
    const bracketStr = '[S [NP [Det The] [Adj fierce] [N tiger]] [VP [V hunted]]]';
    const tree = parseBracketSyntax(bracketStr);
    assert.equal(tree.label, 'S');
    assert.equal(tree.children.length, 2);
    assert.equal(tree.children[0].label, 'NP');
    assert.equal(tree.children[0].children.length, 3);
    assert.equal(tree.children[0].children[2].terminal, 'tiger');

    const svg = generateSyntaxTreeSvg(tree);
    assert.match(svg, /<svg/);
    assert.match(svg, /class="wiki-svg-diagram wiki-syntax-tree"/);
    assert.match(svg, /tiger/);
    assert.match(svg, /hunted/);

    // Indented text format
    const indented = `
S
  NP
    Det: A
    N: warrior
  VP
    V: struck
`;
    const indentedTree = parseIndentedSyntax(indented);
    assert.equal(indentedTree.label, 'S');
    assert.equal(indentedTree.children.length, 2);
    assert.equal(indentedTree.children[0].children[1].terminal, 'warrior');
    const indentedSvg = generateSyntaxTreeSvg(indentedTree);
    assert.match(indentedSvg, /warrior/);
    assert.match(indentedSvg, /struck/);
}

// --- 3. Morphology Slot Chain Flowchart Tests ---
{
    console.log('  Testing Morphology Chain flowchart generator...');
    const slots = [
        { slot: 'Slot -1', label: 'Tense (al-)', type: 'prefix', optional: false },
        { slot: 'Slot 0', label: 'Stem (kar)', type: 'root', optional: false },
        { slot: 'Slot +1', label: 'Case (-on)', type: 'suffix', optional: true }
    ];
    const morphoSvg = generateMorphologySvg(slots);
    assert.match(morphoSvg, /<svg/);
    assert.match(morphoSvg, /wiki-morphology-flowchart/);
    assert.match(morphoSvg, /Slot -1/);
    assert.match(morphoSvg, /Tense \(al-\)/);
    assert.match(morphoSvg, /Stem \(kar\)/);
    assert.match(morphoSvg, /Case \(-on\)/);
    assert.match(morphoSvg, /\(Mandatory\)/);
    assert.match(morphoSvg, /\(Optional\)/);
}

// --- 4. Dialect Evolution Tree Tests ---
{
    console.log('  Testing Dialect Evolution Tree generator...');
    const dialectTree = {
        name: 'Proto-Elvish',
        period: 'Age of Stars',
        children: [
            { name: 'Quenya', period: 'First Age', children: [] },
            { name: 'Sindarin', period: 'Third Age', children: [] }
        ]
    };
    const dialectSvg = generateDialectTreeSvg(dialectTree);
    assert.match(dialectSvg, /wiki-dialect-tree/);
    assert.match(dialectSvg, /Proto-Elvish/);
    assert.match(dialectSvg, /Quenya/);
    assert.match(dialectSvg, /Sindarin/);
}

// --- 5. Decision Flowchart Tests ---
{
    console.log('  Testing Decision Flowchart generator...');
    const decisionSvg = generateDecisionFlowchartSvg();
    assert.match(decisionSvg, /wiki-decision-flowchart/);
    assert.match(decisionSvg, /Noun Stem/);
    assert.match(decisionSvg, /Surface Form/);
}

// --- 6. XML Escaping Guard Tests ---
{
    console.log('  Testing XML/SVG escaping guard...');
    const dangerousSlots = [
        { slot: '<script>alert(1)</script>', label: 'Stem & Root "test"', type: 'root', optional: false }
    ];
    const escapedSvg = generateMorphologySvg(dangerousSlots);
    assert.ok(!escapedSvg.includes('<script>alert(1)</script>'));
    assert.match(escapedSvg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(escapedSvg, /Stem &amp; Root &quot;test&quot;/);
}

// --- 7. Tiptap Node Extensions Schema Tests ---
{
    console.log('  Testing Tiptap Node extensions...');
    assert.equal(WikiImageNode.name, 'wikiImage');
    assert.equal(WikiDiagramNode.name, 'wikiDiagram');

    // Verify WikiImage node renders figure and img
    const imageRender = WikiImageNode.config.renderHTML({
        HTMLAttributes: {
            src: 'https://example.com/test.png',
            alt: 'Test Alt',
            caption: 'Test Caption',
            align: 'center',
            width: '75%'
        }
    });
    assert.equal(imageRender[0], 'figure');
    assert.equal(imageRender[1]['data-type'], 'wiki-image');
    assert.equal(imageRender[1]['data-align'], 'center');
    assert.equal(imageRender[1]['data-width'], '75%');
    assert.equal(imageRender[2][0], 'img');
    assert.equal(imageRender[2][1].src, 'https://example.com/test.png');
    assert.equal(imageRender[3][0], 'figcaption');
    assert.equal(imageRender[3][2], 'Test Caption');

    // Verify WikiDiagram node renders figure with width and align
    const diagramRender = WikiDiagramNode.config.renderHTML({
        HTMLAttributes: {
            diagramType: 'flowchart',
            title: 'Test Flowchart',
            width: '50%',
            align: 'right',
            svg: '<svg></svg>'
        }
    });
    assert.equal(diagramRender[0], 'figure');
    assert.equal(diagramRender[1]['data-type'], 'wiki-diagram');
    assert.equal(diagramRender[1]['data-diagram-type'], 'flowchart');
    assert.equal(diagramRender[1]['data-align'], 'right');
    assert.equal(diagramRender[1]['data-width'], '50%');
}

// --- 8. Indented Dialect Tree Parsing & Formatting Tests ---
{
    console.log('  Testing Indented Dialect Tree parsing and bidirectional formatting...');
    const { parseIndentedDialectTree, formatDialectTreeToText } = await import('../src/components/pages/wiki/diagramGenerators.js');
    const outline = `
Proto-Germanic (500 BCE)
  West Germanic (200 CE)
    Old English (450 CE)
    Old High German (700 CE)
  North Germanic (300 CE)
    Old Norse (800 CE)
  East Germanic (Extinct)
    Gothic (400 CE) (Extinct)
`;
    const parsed = parseIndentedDialectTree(outline);
    assert.equal(parsed.name, 'Proto-Germanic');
    assert.equal(parsed.period, '500 BCE');
    assert.equal(parsed.children.length, 3);
    assert.equal(parsed.children[0].name, 'West Germanic');
    assert.equal(parsed.children[0].children.length, 2);
    assert.equal(parsed.children[1].name, 'North Germanic');
    assert.equal(parsed.children[2].name, 'East Germanic');
    assert.equal(parsed.children[2].extinct, true);
    assert.equal(parsed.children[2].children[0].extinct, true);

    const reFormatted = formatDialectTreeToText(parsed);
    assert.match(reFormatted, /Proto-Germanic \(500 BCE\)/);
    assert.match(reFormatted, /West Germanic \(200 CE\)/);
    assert.match(reFormatted, /East Germanic \(Extinct\)/);

    // Test SVG generation from string outline directly
    const svgFromText = generateDialectTreeSvg(outline);
    assert.match(svgFromText, /Proto-Germanic/);
    assert.match(svgFromText, /Old English/);
    assert.match(svgFromText, /Old Norse/);
    assert.match(svgFromText, /Gothic/);
    assert.match(svgFromText, /†/); // extinct symbol
}

// --- 9. Dynamic Decision Flowchart Layout Tests ---
{
    console.log('  Testing Dynamic Decision Flowchart generator with custom nodes & transitions...');
    const customNodes = [
        { id: 'start', type: 'start', label: 'Input Verb Stem' },
        { id: 'cond1', type: 'decision', label: 'Ends in Voiceless Stop?' },
        { id: 'action1', type: 'process', label: 'Spirantize: p,t,k -> f,th,h' },
        { id: 'action2', type: 'process', label: 'Keep stop intact' },
        { id: 'result', type: 'end', label: 'Final Conjugated Form' }
    ];
    const customConns = [
        { from: 'start', to: 'cond1', label: '' },
        { from: 'cond1', to: 'action1', label: 'Yes' },
        { from: 'cond1', to: 'action2', label: 'No' },
        { from: 'action1', to: 'result', label: '' },
        { from: 'action2', to: 'result', label: '' }
    ];

    const flowchartSvg = generateDecisionFlowchartSvg({
        nodes: customNodes,
        connections: customConns
    });

    assert.match(flowchartSvg, /<svg/);
    assert.match(flowchartSvg, /Input Verb Stem/);
    assert.match(flowchartSvg, /Ends in Voiceless Stop\?/);
    assert.match(flowchartSvg, /Spirantize: p,t,k -&gt; f,th,h/);
    assert.match(flowchartSvg, /Final Conjugated Form/);
    assert.match(flowchartSvg, /Yes/);
    assert.match(flowchartSvg, /No/);
}

console.log('All Wiki Rich Features tests passed successfully!');
