
/**
 * pdfGenerator.jsx
 * Generates a beautiful PDF reference document with premium template support.
 */
import { generateParadigm } from './morphologyEngine.jsx';

export const generateConlangPDF = (config, lexicon, template = 'academic', options = {}) => {
    const printWindow = window.open('', '', 'height=900,width=800');
    if (!printWindow) {
        return alert("Please allow pop-ups to generate the PDF.");
    }

    const {
        conlangName = "My Conlang",
        authorName = "Author",
        grammarRules = [],
        personRules = [],
        consonants = "",
        vowels = "",
        syntaxOrder = "SVO",
        wikiPages = {},
        historicalRules = "",
        syllablePattern = "",
        phonologyTypes = "alphabetic",
        customFont = "",
        customFontBase64 = ""
    } = config;

    const { includeInflections = true, inflectionMode = 'compact' } = options;

    const styles = {
        academic: {
            font: "'Lora', Georgia, serif",
            accent: '#1a1a1a',
            bg: '#fdfdfd',
            tableHeader: '#f1f1f1',
            border: '2px solid #1a1a1a'
        },
        modern: {
            font: "'Inter', sans-serif",
            accent: '#7c3aed',
            bg: '#ffffff',
            tableHeader: '#7c3aed',
            border: 'none'
        },
        manuscript: {
            font: "'Special Elite', Courier New, monospace",
            accent: '#433422',
            bg: '#f4ecd8',
            tableHeader: '#e9dec3',
            border: '1px solid #433422'
        }
    }[template];

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${conlangName} - Reference Document</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap');
                
                ${(customFont || customFontBase64) ? `
                @font-face {
                    font-family: 'ConlangCustomFont';
                    src: url('${customFont || customFontBase64}') format('truetype');
                }
                .custom-font { font-family: 'ConlangCustomFont', ${styles.font}; }
                ` : ''}

                body { 
                    font-family: ${styles.font}; 
                    line-height: 1.8; 
                    color: ${styles.accent}; 
                    padding: 50px; 
                    background: ${styles.bg};
                    text-align: justify;
                }

                h1 { 
                    font-size: 42pt; 
                    margin-bottom: 0; 
                    text-align: center; 
                    text-transform: uppercase; 
                    letter-spacing: 0.1em;
                    font-weight: 700;
                }

                .subtitle { 
                    text-align: center; 
                    font-style: italic; 
                    margin-bottom: 60px; 
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                    display: block;
                    width: 60%;
                    margin-left: 20%;
                }

                h2 { 
                    font-variant: small-caps; 
                    border-bottom: ${styles.border || '1px solid #ddd'}; 
                    padding-bottom: 5px; 
                    margin-top: 50px; 
                    font-size: 24pt;
                    letter-spacing: 0.05em;
                }

                h3 { 
                    font-size: 18pt; 
                    margin-top: 30px; 
                    border-left: 4px solid ${styles.accent};
                    padding-left: 15px;
                }

                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 25px 0; 
                }

                th { 
                    background: ${styles.tableHeader}; 
                    color: ${template === 'modern' ? 'white' : styles.accent}; 
                    padding: 12px; 
                    text-align: left; 
                    font-size: 8pt;
                    text-transform: uppercase;
                    border: 1px solid #ddd;
                }

                td { 
                    padding: 12px; 
                    border: 1px solid #ddd; 
                    font-size: 9pt;
                }

                .dictionary-entry {
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 1px solid #eee;
                    page-break-inside: avoid;
                }

                .word-head {
                    font-weight: 700;
                    font-size: 1.4rem;
                    color: ${styles.accent};
                }

                .pos-label {
                    font-style: italic;
                    color: #666;
                    margin-left: 10px;
                }

                .ipa-label {
                    color: #888;
                    font-family: 'Inter', sans-serif;
                    font-size: 0.9rem;
                    margin-left: 10px;
                }

                .definition {
                    display: block;
                    margin-top: 5px;
                    font-size: 11pt;
                }

                .inflection-table {
                    margin-top: 15px;
                    width: auto;
                    min-width: 50%;
                }

                .inflection-table th {
                    background: #f8f9fa;
                    color: #444;
                    font-size: 7pt;
                    padding: 6px;
                }

                .inflection-table td {
                    padding: 6px;
                    font-size: 8pt;
                }

                .code-block { 
                    background: ${template === 'manuscript' ? 'rgba(0,0,0,0.05)' : '#f8f9fa'}; 
                    border: 1px solid #ddd; 
                    padding: 20px; 
                    font-family: 'Special Elite', monospace;
                    font-size: 10pt;
                    margin: 20px 0;
                }

                .page-break { page-break-before: always; }
                
                @media print {
                    body { padding: 0; background: white; }
                }
            </style>
        </head>
        <body>
            <h1>${conlangName}</h1>
            <div class="subtitle">
                A Reference Grammar by ${authorName}
            </div>

            <p style="text-align: center; font-size: 10pt; margin-bottom: 50px;">
                Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>

            <h2>I. Phonology</h2>
            <p>The phonological system of <strong>${conlangName}</strong> is classified as <em>${phonologyTypes}</em>. The following inventory represents the standard phonemes used in the language.</p>
            
            <table>
                <tr><th>Category</th><th>Inventory</th></tr>
                <tr><td>Consonants</td><td class="custom-font">${consonants || '—'}</td></tr>
                <tr><td>Vowels</td><td class="custom-font">${vowels || '—'}</td></tr>
                <tr><td>Syllable Structure</td><td><code>${syllablePattern || '—'}</code></td></tr>
            </table>

            ${historicalRules ? `
                <h3>Historical Sound Changes</h3>
                <div class="code-block">${typeof historicalRules === 'string' ? historicalRules : JSON.stringify(historicalRules, null, 2)}</div>
            ` : ''}

            <div class="page-break"></div>

            <h2>II. Morphology & Syntax</h2>
            <p><strong>${conlangName}</strong> adheres to a <strong>${syntaxOrder}</strong> constituent order. The language exhibits ${grammarRules.length} primary morphological processes.</p>

            ${Array.isArray(personRules) && personRules.length > 0 ? `
                <h3>Person & Number Alignment</h3>
                <table>
                    <tr><th>Person</th><th>Number</th><th>Marker</th><th>Free Form</th></tr>
                    ${personRules.map(p => `
                        <tr>
                            <td>${p.person || '—'}</td>
                            <td>${p.number || '—'}</td>
                            <td><code>${p.affix || '—'}</code></td>
                            <td>${p.freeForm || '—'}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            ${grammarRules.length > 0 ? `
                <h3>Grammatical Inflections</h3>
                <table>
                    <tr><th>Rule Name / Cat</th><th>Affix</th><th>Applies To</th><th>Condition</th><th>Type</th><th>Dep.</th></tr>
                    ${grammarRules.map(r => `
                        <tr>
                            <td><strong>${r.name || r.category || 'General'}</strong></td>
                            <td><code>${r.affix || '—'}</code></td>
                            <td>${Array.isArray(r.appliesTo) ? r.appliesTo.join(", ") : (r.appliesTo || 'Universal')}</td>
                            <td>${r.condition || 'always'}</td>
                            <td>${r.standalone ? 'Particle' : 'Affix'}</td>
                            <td>${r.dependency || 'None'}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            <div class="page-break"></div>

            <h2>III. Lexicon</h2>
            <div style="column-count: 1;">
                ${lexicon.map(w => {
                    const paradigm = includeInflections ? generateParadigm(w.word.replace(/\*/g, ''), config, {
                        inflectionMode,
                        wordClass: w.wordClass
                    }) : [];

                    // Group paradigm by Rule if in full mode
                    const groupedParadigm = {};
                    if (inflectionMode !== 'compact') {
                        paradigm.forEach(p => {
                            if (!groupedParadigm[p.ruleName]) groupedParadigm[p.ruleName] = [];
                            groupedParadigm[p.ruleName].push(p);
                        });
                    }

                    return `
                        <div class="dictionary-entry">
                            <span class="word-head custom-font">${w.displayWord || w.word.replace(/\*/g, '')}</span>
                            <span class="ipa-label">${w.ipa ? `[${w.ipa}]` : ''}</span>
                            <span class="pos-label">${w.wordClass || ''}</span>
                            <span class="definition">${w.translation || ''}</span>
                            
                            ${includeInflections && paradigm.length > 0 ? `
                                <table class="inflection-table">
                                    ${inflectionMode === 'compact' ? `
                                        <tr><th>Form</th><th>Result</th></tr>
                                        ${paradigm.map(p => `<tr><td>${p.ruleName}</td><td class="custom-font">${p.result || '—'}</td></tr>`).join('')}
                                    ` : `
                                        <tr><th>Rule</th><th>Person/Class</th><th>Result</th></tr>
                                        ${paradigm.map(p => `
                                            <tr>
                                                <td>${p.ruleName}</td>
                                                <td>${p.personName}</td>
                                                <td class="custom-font">${p.result || '—'}</td>
                                            </tr>
                                        `).join('')}
                                    `}
                                </table>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            ${Object.keys(wikiPages).length > 0 ? `
                <div class="page-break"></div>
                <h2>IV. Documentation & Corpus</h2>
                ${Object.entries(wikiPages).map(([id, page]) => {
                    if (id === 'phonology') return '';
                    const title = typeof page === 'object' ? page.title : id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const content = typeof page === 'object' ? page.content : page;
                    return `<h3>${title}</h3><div style="font-size: 10pt;">${content}</div>`;
                }).join('')}
            ` : ''}

        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
    }, 1000); 
};