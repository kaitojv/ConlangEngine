import fs from 'fs';

const fileContent = fs.readFileSync('d:/ConlangEngine/reactCE/Conlang-Engine-React/src/components/pages/wiki/WikiTab.jsx', 'utf8');

const constantsStart = fileContent.indexOf('const MODAL_VERBS');
const constantsEnd = fileContent.indexOf('function WordAssistSettingsMenu');
const constantsCode = fileContent.slice(constantsStart, constantsEnd);

const editorStart = fileContent.indexOf('function CorpusEditor');
const editorContent = fileContent.slice(editorStart);

const reorderBreakdownStart = editorContent.indexOf('const reorderBreakdown');
// Find end of reorderBreakdown (it ends before `// Auto-save and content sync`)
const reorderBreakdownEnd = editorContent.indexOf('// Auto-save and content sync');
const reorderBreakdownCode = editorContent.slice(reorderBreakdownStart, reorderBreakdownEnd);

const functionsStart = editorContent.indexOf('// ── Word Assist');
// Find end of computePhraseSuggestion
const computePhraseSuggestionStart = editorContent.indexOf('const computePhraseSuggestion');
// Find the end of computePhraseSuggestion
let braceCount = 0;
let insideCPS = false;
let computePhraseSuggestionEnd = -1;
for (let i = computePhraseSuggestionStart; i < editorContent.length; i++) {
    if (editorContent[i] === '{') {
        braceCount++;
        insideCPS = true;
    } else if (editorContent[i] === '}') {
        braceCount--;
        if (insideCPS && braceCount === 0) {
            computePhraseSuggestionEnd = i + 1;
            break;
        }
    }
}

const functionsCode = editorContent.slice(functionsStart, computePhraseSuggestionEnd);

const imports = `import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';\nimport { useConfigStore } from '@/store/useConfigStore.jsx';\n\n`;

const outCode = imports + constantsCode + `\n` + 
`export function createGrammarAnalyzer(configOptions) {
    const { lexicon, grammarRules, syntaxOrder, waConfig, personRulesArray, overrideCopulaBehavior } = configOptions;

` + reorderBreakdownCode + `

` + functionsCode + `

    return {
        computePhraseSuggestion,
        lemmatize,
        matchesTranslation,
        findGrammarRule
    };
}
`;

fs.writeFileSync('d:/ConlangEngine/reactCE/Conlang-Engine-React/src/utils/grammarAnalyzer.js', outCode);
console.log('grammarAnalyzer.js created!');
