
/**
 * obsidianExporter.jsx
 * Generates a comprehensive Markdown file optimized for Obsidian.
 * Includes Phonology, Grammar, Wiki, Inflections, and Lexicon.
 */
import { generateParadigm } from './morphologyEngine.jsx';

export const generateObsidianMarkdown = (config, lexicon, options = {}) => {
    const { 
        conlangName = "My Conlang", 
        authorName = "Author",
        description = "",
        consonants = "", 
        vowels = "", 
        historicalRules = "",
        personRules = [],
        grammarRules = [],
        syntaxOrder = "SVO",
        syllablePattern = "",
        numeralBase = 10,
        writingDirection = "ltr",
        customWordClasses = [],
        sentenceMaps = [],
        wikiPages = {}
    } = config;

    const { includeInflections = true, inflectionMode = 'compact' } = options;

    let md = `---\ntitle: ${conlangName}\nauthor: ${authorName}\ntags: [conlang, language-data]\ncreated: ${new Date().toLocaleDateString()}\n---\n\n`;

    // 1. Language Overview
    md += `# ${conlangName}\n\n`;
    md += `> [!abstract] Language Summary\n`;
    md += `> ${description || "This document contains the complete documentation and lexicon for **" + conlangName + "**, exported from the Conlang Engine."}\n\n`;

    // 2. Typology & Basics
    md += `## 🌍 Typology & Basics\n\n`;
    md += `| Property | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Word Order** | ${syntaxOrder} |\n`;
    md += `| **Syllable Structure** | \`${syllablePattern || "Not defined"}\` |\n`;
    md += `| **Numeral System** | Base ${numeralBase} |\n`;
    md += `| **Writing Direction** | ${writingDirection.toUpperCase()} |\n\n`;

    // 3. Phonology & Orthography
    md += `## 🎙️ Phonology & Orthography\n\n`;
    md += `### Inventory\n`;
    md += `- **Consonants:** ${consonants || "*None defined*"}\n`;
    md += `- **Vowels:** ${vowels || "*None defined*"}\n\n`;

    if (historicalRules && historicalRules.trim()) {
        md += `### Historical Sound Changes\n`;
        md += `\`\`\`regex\n${historicalRules}\n\`\`\`\n\n`;
    }

    // 4. Grammar & Morphology
    md += `## 📜 Grammar & Morphology\n\n`;
    
    md += `### Parts of Speech\n`;
    const allPOS = ["noun", "verb", "adjective", "adverb", "pronoun", "particle", ...customWordClasses];
    md += `The language uses the following primary categories: ${allPOS.map(p => `*${p}*`).join(", ")}.\n\n`;

    if (grammarRules.length > 0) {
        md += `### Morphological Rules\n`;
        md += `| Name / Category | Affix | Applies To | Condition | Type | Dep. |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        grammarRules.forEach(rule => {
            const name = rule.name || rule.category || 'General';
            const applies = Array.isArray(rule.appliesTo) ? rule.appliesTo.join(", ") : (rule.appliesTo || 'Universal');
            md += `| ${name} | \`${rule.affix || '—'}\` | ${applies} | ${rule.condition || 'always'} | ${rule.standalone ? 'Particle' : 'Affix'} | ${rule.dependency || 'None'} |\n`;
        });
        md += `\n`;
    }

    if (personRules && personRules.length > 0) {
        md += `### Person & Class Markers\n`;
        md += `| Person | Marker | Free Form | Number | Class |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;
        personRules.forEach(p => {
            md += `| ${p.person || '—'} | \`${p.affix || '—'}\` | ${p.freeForm || '—'} | ${p.number || '—'} | ${p.gender || '—'} |\n`;
        });
        md += `\n`;
    }

    // 5. Wiki Pages
    if (Object.keys(wikiPages).length > 0) {
        md += `## 📖 Grammar Wiki & Documentation\n\n`;
        Object.entries(wikiPages).forEach(([id, content]) => {
            if (id === 'phonology') return;
            const title = typeof content === 'object' ? content.title : id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
            md += `### ${title}\n\n`;
            const cleanContent = typeof content === 'string' ? content.replace(/<\/?[^>]+(>|$)/g, "") : content?.content?.replace(/<\/?[^>]+(>|$)/g, "") || "";
            md += `${cleanContent}\n\n`;
        });
    }

    // 6. Sentence Mapper Saves
    if (sentenceMaps && sentenceMaps.length > 0) {
        md += `## 🗺️ Sentence Mapper Saves\n\n`;
        sentenceMaps.forEach(map => {
            md += `> [!example] ${map.title || "Untitled Sentence"}\n`;
            md += `> **Source:** ${map.source || "—"}\n`;
            md += `> **Target:** ${map.target || "—"}\n`;
            if (map.notes) md += `> **Notes:** ${map.notes}\n`;
            md += `\n`;
        });
        md += `\n`;
    }

    // 7. Lexicon (Dictionary) with Inflection Matrix
    md += `## 📕 Dictionary & Inflection Matrix\n\n`;
    
    lexicon.forEach(entry => {
        const cleanWord = entry.word.replace(/\*/g, '');
        
        md += `### ${cleanWord}\n`;
        md += `**Definition:** ${entry.translation || '—'} | **Class:** *${entry.wordClass || '—'}* | **IPA:** ${entry.ipa || '—'}\n\n`;
        
        if (includeInflections) {
            const paradigm = generateParadigm(cleanWord, config, {
                inflectionMode,
                wordClass: entry.wordClass
            });

            if (paradigm.length > 0) {
                if (inflectionMode === 'compact') {
                    md += `| Form | Result |\n`;
                    md += `| :--- | :--- |\n`;
                    paradigm.forEach(p => {
                        md += `| ${p.ruleName} | \`${p.result || '—'}\` |\n`;
                    });
                } else {
                    md += `| Rule | Person | Result |\n`;
                    md += `| :--- | :--- | :--- |\n`;
                    paradigm.forEach(p => {
                        md += `| ${p.ruleName} | ${p.personName} | \`${p.result || '—'}\` |\n`;
                    });
                }
                md += `\n`;
            }
        }
        
        if (entry.notes) md += `*Notes: ${entry.notes}*\n\n`;
        md += `--- \n\n`;
    });

    md += `\n\n---\n*Exported via ConlangEngine React*`;

    // Download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conlangName.replace(/\s+/g, '_')}_Master_Wiki.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
