import assert from 'node:assert/strict';
import { Indent } from '../src/components/pages/wiki/indentExtension.js';

console.log('--- test_indentExtension.js ---');

// 1. Extension metadata & options
assert.equal(Indent.name, 'indent', 'Extension name should be indent');
const options = Indent.options;
assert.deepEqual(options.types, ['paragraph', 'heading'], 'Types must include paragraph and heading');
assert.equal(options.minLevel, 0, 'Min level is 0');
assert.equal(options.maxLevel, 8, 'Max level is 8');
assert.equal(options.indentSize, 1.25, 'Indent size is 1.25rem (20px) matching list alignment');
console.log('✓ Extension metadata & options verified');

// 2. Global attributes
const globalAttrs = Indent.config.addGlobalAttributes.call({ options });
assert.equal(globalAttrs.length, 1);
assert.deepEqual(globalAttrs[0].types, ['paragraph', 'heading']);
const indentAttr = globalAttrs[0].attributes.indent;
assert.equal(indentAttr.default, 0);

// Test parseHTML
// 2a. data-indent attribute
const elWithData1 = { getAttribute: (k) => k === 'data-indent' ? '1' : null, style: {} };
assert.equal(indentAttr.parseHTML(elWithData1), 1, 'Parses data-indent=1');

const elWithData2 = { getAttribute: (k) => k === 'data-indent' ? '2' : null, style: {} };
assert.equal(indentAttr.parseHTML(elWithData2), 2, 'Parses data-indent=2 (indent in an indent)');

// 2b. style attribute in rem (2.5rem / 1.25 = 2)
const elWithStyleRem = {
    getAttribute: () => null,
    style: { marginLeft: '2.5rem' }
};
assert.equal(indentAttr.parseHTML(elWithStyleRem), 2, 'Parses 2.5rem as level 2');

// 2c. style attribute in px (40px / 20px = 2)
const elWithStylePx = {
    getAttribute: () => null,
    style: { marginInlineStart: '40px' }
};
assert.equal(indentAttr.parseHTML(elWithStylePx), 2, 'Parses 40px as level 2 (1.25rem = 20px, 40px = level 2)');

// 2d. 0 or unindented
const elClean = { getAttribute: () => null, style: {} };
assert.equal(indentAttr.parseHTML(elClean), 0, 'Clean element is level 0');

// 2e. paragraph inside li should always return 0 (no nested paragraph indent inside list item)
const elInsideLi = {
    getAttribute: (k) => k === 'data-indent' ? '2' : null,
    style: { marginLeft: '2.5rem' },
    closest: (selector) => selector === 'li' ? {} : null
};
assert.equal(indentAttr.parseHTML(elInsideLi), 0, 'Element inside li always returns 0');

console.log('✓ parseHTML parses data-indent, rem, px, li-guard, and unindented elements');

// Test renderHTML
// Level 0: returns empty object
assert.deepEqual(indentAttr.renderHTML({ indent: 0 }), {}, 'Level 0 renders empty object');
assert.deepEqual(indentAttr.renderHTML({ indent: null }), {}, 'null indent renders empty object');

// Level 1: returns data-indent 1 and style margin-left: 1.25rem (20px, perfectly aligned with bullet lists)
assert.deepEqual(indentAttr.renderHTML({ indent: 1 }), {
    'data-indent': 1,
    style: 'margin-left: 1.25rem; margin-inline-start: 1.25rem;'
}, 'Level 1 renders 1.25rem matching list items');

// Level 2: "indent in an indent" -> margin-left: 2.5rem (40px)
assert.deepEqual(indentAttr.renderHTML({ indent: 2 }), {
    'data-indent': 2,
    style: 'margin-left: 2.5rem; margin-inline-start: 2.5rem;'
}, 'Level 2 (indent in indent) renders 2.5rem');

// Level 3: margin-left: 3.75rem (60px)
assert.deepEqual(indentAttr.renderHTML({ indent: 3 }), {
    'data-indent': 3,
    style: 'margin-left: 3.75rem; margin-inline-start: 3.75rem;'
}, 'Level 3 renders 3.75rem');

console.log('✓ renderHTML correctly renders multi-level indents in 1.25rem steps');

// 3. Command logic verification on mock ProseMirror transaction & nodes
const mockDoc = {
    nodesBetween: (from, to, callback) => {
        // Mock nodes:
        // pos 1: heading (level 0)
        // pos 10: paragraph (level 0)
        // pos 20: paragraph (level 1)
        // pos 30: paragraph inside listItem (should be skipped)
        callback({ type: { name: 'heading' }, attrs: { level: 2, indent: 0 } }, 1, { type: { name: 'doc' } });
        callback({ type: { name: 'paragraph' }, attrs: { indent: 0 } }, 10, { type: { name: 'doc' } });
        callback({ type: { name: 'paragraph' }, attrs: { indent: 1 } }, 20, { type: { name: 'doc' } });
        callback({ type: { name: 'paragraph' }, attrs: { indent: 0 } }, 30, { type: { name: 'listItem' } });
    }
};

const modifiedMarkups = [];
const mockTr = {
    doc: mockDoc,
    selection: { from: 0, to: 50 },
    setNodeMarkup: (pos, type, attrs) => {
        modifiedMarkups.push({ pos, attrs });
    }
};

let dispatchedTr = null;
const dispatch = (tr) => { dispatchedTr = tr; };

const commands = Indent.config.addCommands.call({ options });

// 3a. Verify dry-run safety for list items (regression test for the reported bug:
// clicking on a line with a bullet list or clicking somewhere else triggered editor.can().indent()
// which erroneously called editor.commands.sinkListItem immediately!).
let sinkCalled = false;
let liftCalled = false;
const mockEditorWithSink = {
    can: () => ({
        sinkListItem: () => true,
        liftListItem: () => true,
    }),
    commands: {
        sinkListItem: () => { sinkCalled = true; return true; },
        liftListItem: () => { liftCalled = true; return true; },
    }
};

const canSinkDryRun = commands.indent.call({ options })({
    tr: mockTr,
    dispatch: null, // Dry run by editor.can().indent()
    editor: mockEditorWithSink
});
assert.equal(canSinkDryRun, true, 'can indent returns true during dry run');
assert.equal(sinkCalled, false, 'DRY RUN MUST NOT CALL editor.commands.sinkListItem!');

const didSink = commands.indent.call({ options })({
    tr: mockTr,
    dispatch, // Real execution
    editor: mockEditorWithSink
});
assert.equal(didSink, true);
assert.equal(sinkCalled, true, 'Execution with dispatch calls editor.commands.sinkListItem');

const canLiftDryRun = commands.outdent.call({ options })({
    tr: mockTr,
    dispatch: null, // Dry run
    editor: mockEditorWithSink
});
assert.equal(canLiftDryRun, true, 'can outdent returns true during dry run');
assert.equal(liftCalled, false, 'DRY RUN MUST NOT CALL editor.commands.liftListItem!');

const didLift = commands.outdent.call({ options })({
    tr: mockTr,
    dispatch,
    editor: mockEditorWithSink
});
assert.equal(didLift, true);
assert.equal(liftCalled, true, 'Execution with dispatch calls editor.commands.liftListItem');

console.log('✓ Dry-run safety verified: editor.can() checks NEVER mutate or sink list items');

// Run regular indent on paragraphs/headings
modifiedMarkups.length = 0;
dispatchedTr = null;
const canIndent = commands.indent.call({ options })({
    tr: mockTr,
    dispatch,
    editor: { can: () => ({ sinkListItem: () => false, liftListItem: () => false }) }
});

assert.equal(canIndent, true, 'indent command returns true when nodes can be indented');
assert.equal(dispatchedTr, mockTr, 'indent command dispatches tr');
// Check modified nodes:
// Heading at pos 1 should be indented from 0 to 1
assert.equal(modifiedMarkups.find(m => m.pos === 1)?.attrs.indent, 1, 'Header was indented to level 1');
// Paragraph at pos 10 should be indented from 0 to 1
assert.equal(modifiedMarkups.find(m => m.pos === 10)?.attrs.indent, 1, 'Paragraph at pos 10 was indented to level 1');
// Paragraph at pos 20 should be indented from 1 to 2 ("indent in an indent")
assert.equal(modifiedMarkups.find(m => m.pos === 20)?.attrs.indent, 2, 'Paragraph at pos 20 was indented to level 2');
// Paragraph inside listItem at pos 30 should NOT be modified
assert.equal(modifiedMarkups.find(m => m.pos === 30), undefined, 'Paragraph inside listItem was skipped');

console.log('✓ Headers and paragraphs successfully indented, including multi-level indent in indent');

// Test outdent command
modifiedMarkups.length = 0;
dispatchedTr = null;

const mockDocForOutdent = {
    nodesBetween: (from, to, callback) => {
        callback({ type: { name: 'heading' }, attrs: { level: 1, indent: 2 } }, 1, { type: { name: 'doc' } });
        callback({ type: { name: 'paragraph' }, attrs: { indent: 1 } }, 10, { type: { name: 'doc' } });
        callback({ type: { name: 'paragraph' }, attrs: { indent: 0 } }, 20, { type: { name: 'doc' } });
    }
};

const mockTrOutdent = {
    doc: mockDocForOutdent,
    selection: { from: 0, to: 50 },
    setNodeMarkup: (pos, type, attrs) => {
        modifiedMarkups.push({ pos, attrs });
    }
};

const canOutdent = commands.outdent.call({ options })({
    tr: mockTrOutdent,
    dispatch,
    editor: { can: () => ({ sinkListItem: () => false, liftListItem: () => false }) }
});

assert.equal(canOutdent, true, 'outdent command returns true');
// Heading at pos 1 should go from 2 to 1
assert.equal(modifiedMarkups.find(m => m.pos === 1)?.attrs.indent, 1, 'Header outdented from 2 to 1');
// Paragraph at pos 10 should go from 1 to null/0
assert.equal(modifiedMarkups.find(m => m.pos === 10)?.attrs.indent, null, 'Paragraph outdented from 1 to 0 (null)');
// Paragraph at pos 20 was already 0, should not be modified
assert.equal(modifiedMarkups.find(m => m.pos === 20), undefined, 'Paragraph at 0 was not modified');

console.log('✓ Outdent correctly decreases levels and resets to clean base on 0');

// Test boundary at maxLevel 8
modifiedMarkups.length = 0;
const mockDocMax = {
    nodesBetween: (from, to, callback) => {
        callback({ type: { name: 'paragraph' }, attrs: { indent: 8 } }, 10, { type: { name: 'doc' } });
    }
};
const mockTrMax = {
    doc: mockDocMax,
    selection: { from: 0, to: 20 },
    setNodeMarkup: (pos, type, attrs) => { modifiedMarkups.push({ pos, attrs }); }
};
const canIndentAtMax = commands.indent.call({ options })({
    tr: mockTrMax,
    dispatch: null, // dry run (like editor.can().indent())
    editor: { can: () => ({ sinkListItem: () => false }) }
});
assert.equal(canIndentAtMax, false, 'cannot indent beyond maxLevel 8');
assert.equal(modifiedMarkups.length, 0);

console.log('✓ maxLevel boundary respected');

console.log('\nAll TipTap Indent extension tests passed successfully!');

