// tests/test_themeCustomization.js
import assert from 'node:assert/strict';
import { 
    DARK_THEMES, 
    LIGHT_THEMES, 
    encodeThemeCode, 
    decodeThemeCode, 
    parseThemeJSON 
} from '../src/utils/themePresets.js';

console.log('--- test_themeCustomization.js ---');

// 1. Verify modern dark theme palettes
const darkNames = DARK_THEMES.map(t => t.name);
assert.ok(darkNames.includes('Nordic Frost'), 'Missing Nordic Frost');
assert.ok(darkNames.includes('Rose Pine Dusk'), 'Missing Rose Pine Dusk');
assert.ok(darkNames.includes('Emerald Obsidian'), 'Missing Emerald Obsidian');
assert.ok(darkNames.includes('Slate Indigo'), 'Missing Slate Indigo');
assert.ok(darkNames.includes('Titanium Minimal'), 'Missing Titanium Minimal');
console.log('✓ Modern dark palettes verified');

// 2. Verify modern light theme palettes
const lightNames = LIGHT_THEMES.map(t => t.name);
assert.ok(lightNames.includes('Alpine Snow'), 'Missing Alpine Snow');
assert.ok(lightNames.includes('Lavender Soft'), 'Missing Lavender Soft');
console.log('✓ Modern light palettes verified');

// 3. Round-trip encoding/decoding of theme codes
const sampleTheme = {
    name: 'Cyberpunk Aurora',
    colors: {
        bg: '#0a0f1d',
        s1: '#10172a',
        accent: '#38bdf8',
        font: '#f1f5f9'
    },
    appUiFont: "'Inter', sans-serif",
    uiDensity: 'compact',
    uiRadius: 'sharp',
    uiPattern: 'dots'
};

const code = encodeThemeCode(sampleTheme);
assert.ok(typeof code === 'string');
assert.ok(code.startsWith('ce-theme:'));

const decoded = decodeThemeCode(code);
assert.equal(decoded.name, 'Cyberpunk Aurora');
assert.equal(decoded.colors.bg, '#0a0f1d');
assert.equal(decoded.colors.accent, '#38bdf8');
assert.equal(decoded.appUiFont, "'Inter', sans-serif");
assert.equal(decoded.uiDensity, 'compact');
assert.equal(decoded.uiRadius, 'sharp');
assert.equal(decoded.uiPattern, 'dots');
console.log('✓ Round-trip theme code encoding/decoding verified');

// 4. Unicode safety in theme names
const unicodeTheme = {
    name: 'Tolkien Quenya 🌌 (日本語)',
    colors: {
        bg: '#050a05',
        accent: '#10b981'
    }
};
const unicodeCode = encodeThemeCode(unicodeTheme);
const unicodeDecoded = decodeThemeCode(unicodeCode);
assert.equal(unicodeDecoded.name, 'Tolkien Quenya 🌌 (日本語)');
console.log('✓ Unicode theme names supported');

// 5. Corrupted / invalid codes throw informative errors
assert.throws(() => decodeThemeCode('invalid-code'), /Invalid theme code format/);
assert.throws(() => decodeThemeCode('ce-theme:not-base64!@#$'), /Could not decode theme code/);
assert.throws(() => decodeThemeCode('ce-theme:eyJub0NvbG9ycyI6dHJ1ZX0='), /does not contain a valid colors definition/);
assert.throws(() => encodeThemeCode({ name: 'No Colors' }), /Theme must contain a valid colors object/);
console.log('✓ Error handling and validation verified');

// 6. JSON theme file parsing
const jsonPayload = JSON.stringify({
    name: 'Minimal Dark',
    colors: { bg: '#000000', accent: '#ffffff' },
    uiDensity: 'spacious',
    uiRadius: 'pill'
});
const parsed = parseThemeJSON(jsonPayload);
assert.equal(parsed.name, 'Minimal Dark');
assert.equal(parsed.colors.bg, '#000000');
assert.equal(parsed.uiDensity, 'spacious');
assert.equal(parsed.uiRadius, 'pill');
console.log('✓ Theme JSON parsing verified');

// 7. Conlang-to-theme transition logic test
function simulateConlangThemeTransition(curState, newConfig) {
    const projectId = newConfig.projectId || curState.projectId;
    const linkTheme = newConfig.linkThemeToConlang !== undefined ? newConfig.linkThemeToConlang : curState.linkThemeToConlang;
    let mergedConlangThemes = { ...(curState.conlangThemes || {}), ...(newConfig.conlangThemes || {}) };
    
    if (linkTheme && curState.projectId && curState.projectId !== projectId) {
        mergedConlangThemes[curState.projectId] = {
            theme: curState.theme,
            colors: curState.colors,
            appUiFont: curState.appUiFont,
            uiDensity: curState.uiDensity || 'default',
            uiRadius: curState.uiRadius || 'modern',
            uiPattern: curState.uiPattern || 'none'
        };
    }

    let projectThemeOverride = {};
    if (linkTheme && projectId && mergedConlangThemes[projectId]) {
        projectThemeOverride = mergedConlangThemes[projectId];
    }

    return {
        ...newConfig,
        linkThemeToConlang: linkTheme,
        conlangThemes: mergedConlangThemes,
        colors: projectThemeOverride.colors || newConfig.colors || curState.colors,
        uiDensity: projectThemeOverride.uiDensity || newConfig.uiDensity || curState.uiDensity || 'default',
        uiRadius: projectThemeOverride.uiRadius || newConfig.uiRadius || curState.uiRadius || 'modern',
        uiPattern: projectThemeOverride.uiPattern || newConfig.uiPattern || curState.uiPattern || 'none',
    };
}

const stateAlpha = {
    projectId: 'p1',
    linkThemeToConlang: true,
    conlangThemes: {},
    theme: 'dark',
    colors: { bg: '#101010', accent: '#38bdf8' },
    appUiFont: 'Inter',
    uiDensity: 'compact',
    uiRadius: 'sharp',
    uiPattern: 'dots'
};

// Switch from Alpha to Beta
const stateBeta = simulateConlangThemeTransition(stateAlpha, {
    projectId: 'p2',
    colors: { bg: '#ffffff', accent: '#0284c7' },
    uiDensity: 'spacious'
});

assert.equal(stateBeta.projectId, 'p2');
assert.equal(stateBeta.colors.bg, '#ffffff');
assert.ok(stateBeta.conlangThemes['p1'], 'Alpha theme should be saved in conlangThemes');
assert.equal(stateBeta.conlangThemes['p1'].colors.bg, '#101010');
assert.equal(stateBeta.conlangThemes['p1'].uiDensity, 'compact');

// Switch back to Alpha
const stateAlphaRestored = simulateConlangThemeTransition(stateBeta, {
    projectId: 'p1'
});

assert.equal(stateAlphaRestored.projectId, 'p1');
assert.equal(stateAlphaRestored.colors.bg, '#101010', 'Restores Alpha background');
assert.equal(stateAlphaRestored.colors.accent, '#38bdf8', 'Restores Alpha accent');
assert.equal(stateAlphaRestored.uiDensity, 'compact', 'Restores Alpha density');
assert.equal(stateAlphaRestored.uiRadius, 'sharp', 'Restores Alpha radius');
assert.equal(stateAlphaRestored.uiPattern, 'dots', 'Restores Alpha pattern');
console.log('✓ Conlang-to-theme binding transition verified');

console.log('All theme customization tests passed successfully!');
