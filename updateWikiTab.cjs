const fs = require('fs');

let fileContent = fs.readFileSync('d:/ConlangEngine/reactCE/Conlang-Engine-React/src/components/pages/wiki/WikiTab.jsx', 'utf8');

// 1. Add import
if (!fileContent.includes('createGrammarAnalyzer')) {
    fileContent = fileContent.replace(
        "import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';",
        "import { applyRuleToWord } from '@/utils/morphologyEngine.jsx';\nimport { createGrammarAnalyzer } from '@/utils/grammarAnalyzer.js';"
    );
}

// 2. Remove reorderBreakdown
const reorderBreakdownStart = fileContent.indexOf('const reorderBreakdown = ');
const reorderBreakdownEnd = fileContent.indexOf('// Auto-save and content sync');
if (reorderBreakdownStart !== -1 && reorderBreakdownEnd !== -1) {
    fileContent = fileContent.slice(0, reorderBreakdownStart) + fileContent.slice(reorderBreakdownEnd);
}

// 3. Remove the block from matchesTranslation to computePhraseSuggestion end
const matchesTranslationStart = fileContent.indexOf('// Returns true only when `q` matches `translation` as a complete word.');

const computePhraseSuggestionStart = fileContent.indexOf('const computePhraseSuggestion = ');
let braceCount = 0;
let insideCPS = false;
let computePhraseSuggestionEnd = -1;
for (let i = computePhraseSuggestionStart; i < fileContent.length; i++) {
    if (fileContent[i] === '{') {
        braceCount++;
        insideCPS = true;
    } else if (fileContent[i] === '}') {
        braceCount--;
        if (insideCPS && braceCount === 0) {
            computePhraseSuggestionEnd = i + 1;
            break;
        }
    }
}

if (matchesTranslationStart !== -1 && computePhraseSuggestionEnd !== -1) {
    fileContent = fileContent.slice(0, matchesTranslationStart) + fileContent.slice(computePhraseSuggestionEnd);
}

// 4. Inject analyzer instantiation
const isRTL_line = "const isRTL            = writingDirection === 'rtl';";
const isRTL_pos = fileContent.indexOf(isRTL_line);
if (isRTL_pos !== -1) {
    const injectStr = `
    const analyzer = useMemo(() => createGrammarAnalyzer({
        lexicon,
        grammarRules,
        syntaxOrder,
        waConfig,
        personRulesArray
    }), [lexicon, grammarRules, syntaxOrder, waConfig, personRulesArray]);

    const { computePhraseSuggestion } = analyzer;
`;
    if (!fileContent.includes('const { computePhraseSuggestion } = analyzer;')) {
        fileContent = fileContent.slice(0, isRTL_pos + isRTL_line.length) + injectStr + fileContent.slice(isRTL_pos + isRTL_line.length);
    }
}

fs.writeFileSync('d:/ConlangEngine/reactCE/Conlang-Engine-React/src/components/pages/wiki/WikiTab.jsx', fileContent);
console.log('WikiTab.jsx updated successfully!');
