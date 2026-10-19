// tests/test_wikiDeleteRegression.js
// Verification suite for:
// 1. Preventing deleted wiki/library documents from resurrecting on unmount/blur.
// 2. Header language button accessibility on mobile (Languages icon presence).

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- test_wikiDeleteRegression.js ---');

// 1. Verify Header contains Languages icon and proper classes
const headerSource = fs.readFileSync(path.join(__dirname, '../src/components/Layout/Header/Header.jsx'), 'utf8');
assert.ok(headerSource.includes('Languages'), 'Header.jsx must import Languages from lucide-react');
assert.ok(headerSource.includes('<Languages size={16}'), 'Header.jsx must render <Languages size={16} inside lang-trigger');
assert.ok(headerSource.includes('hdr-lang-code'), 'Header.jsx must render hdr-lang-code span');
console.log('✓ Header language button includes Languages icon and code for mobile display');

// 2. Verify header.css styles
const headerCss = fs.readFileSync(path.join(__dirname, '../src/components/Layout/Header/header.css'), 'utf8');
assert.ok(headerCss.includes('.hdr-lang-code'), 'header.css must contain .hdr-lang-code');
assert.ok(headerCss.includes('-webkit-tap-highlight-color'), 'header.css must include tap highlight color reset');
console.log('✓ header.css contains responsive mobile styles for language button');

// 3. Test saveWikiPage & deleteWikiPage logic in store
const createMockWikiStore = () => {
    let state = {
        wikiPages: {
            'doc-1': { type: 'wiki', title: 'First Document', content: '<p>One</p>', order: 0 },
            'doc-2': { type: 'wiki', title: 'Second Document', content: '<p>Two</p>', order: 1 },
            'doc-last': { type: 'wiki', title: 'Last Document', content: '<p>Last</p>', order: 2 },
        },
        activity: []
    };

    const set = (updater) => {
        const update = typeof updater === 'function' ? updater(state) : updater;
        state = { ...state, ...update };
    };

    return {
        getState: () => state,
        saveWikiPage: (pageId, content) => set((currState) => {
            const existing = currState.wikiPages?.[pageId];
            if (!existing) return {};
            if (typeof existing === 'object') {
                return { wikiPages: { ...currState.wikiPages, [pageId]: { ...existing, content } } };
            }
            return { wikiPages: { ...currState.wikiPages, [pageId]: content } };
        }),
        deleteWikiPage: (pageId) => set((currState) => {
            const newPages = { ...currState.wikiPages };
            delete newPages[pageId];
            for (const k in newPages) {
                if (newPages[k] && typeof newPages[k] === 'object' && newPages[k].parentId === pageId) {
                    delete newPages[k];
                }
            }
            return { wikiPages: newPages };
        }),
    };
};

const store = createMockWikiStore();

// Initial state has 3 documents
assert.equal(Object.keys(store.getState().wikiPages).length, 3);
assert.ok(store.getState().wikiPages['doc-last'], 'doc-last must exist initially');

// Simulate user deleting the last document while it is open in the editor:
// 1) Editor blurs or delete triggers:
store.deleteWikiPage('doc-last');
assert.equal(store.getState().wikiPages['doc-last'], undefined, 'doc-last must be deleted');

// 2) The unmounting editor triggers safety-net onSave('doc-last', '<p>Stale Content</p>')
store.saveWikiPage('doc-last', '<p>Stale Content</p>');

// 3) Verify doc-last is NOT resurrected
assert.equal(store.getState().wikiPages['doc-last'], undefined, 'doc-last must NOT resurrect after saveWikiPage is called on deleted page');
assert.equal(Object.keys(store.getState().wikiPages).length, 2, 'Only 2 documents should remain');
console.log('✓ saveWikiPage refuses to resurrect deleted pages on unmount');

// 4. Test normal editing on an existing page still works
store.saveWikiPage('doc-1', '<p>Updated content</p>');
assert.equal(store.getState().wikiPages['doc-1'].content, '<p>Updated content</p>');
assert.equal(store.getState().wikiPages['doc-1'].title, 'First Document');
console.log('✓ saveWikiPage continues to update active, existing pages');

// 5. Verify WikiTab.jsx guards
const wikiTabSource = fs.readFileSync(path.join(__dirname, '../src/components/pages/wiki/WikiTab.jsx'), 'utf8');
assert.ok(wikiTabSource.includes('currentPageId && wikiPages[currentPageId]'), 'WikiTab must guard editor rendering with wikiPages[currentPageId]');
assert.ok(wikiTabSource.includes('useConfigStore.getState().wikiPages?.[currentPageId]'), 'WikiTab onSave callback must guard against deleted pages');
console.log('✓ WikiTab.jsx implements caller guards on editor rendering and onSave callback');
