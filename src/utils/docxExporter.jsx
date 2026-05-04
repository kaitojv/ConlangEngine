
/**
 * docxExporter.jsx
 * Generates a Word-compatible .doc file using HTML/XML trickery.
 * Optimized for textbook aesthetics.
 */
import { generateParadigm } from './morphologyEngine.jsx';

export const generateDocxExport = (config, lexicon, template = 'academic', options = {}) => {
    const { 
        conlangName = "My Conlang", 
        authorName = "Author",
        grammarRules = [],
        personRules = [],
        consonants = "", 
        vowels = "", 
        syntaxOrder = "SVO",
        wikiPages = {},
        historicalRules = ""
    } = config;

    const { includeInflections = true, inflectionMode = 'compact' } = options;

    const styles = {
        academic: { 
            font: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", 
            accent: '#000000', 
            bg: '#ffffff' 
        },
        modern: { 
            font: "Helvetica, Arial, sans-serif", 
            accent: '#7c3aed', 
            bg: '#ffffff' 
        },
        manuscript: { 
            font: "'Courier New', Courier, monospace", 
            accent: '#433422', 
            bg: '#fcf8ed' 
        }
    }[template];

    let html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <style>
                body { 
                    font-family: ${styles.font}; 
                    line-height: 1.6; 
                    color: #333; 
                    background: ${styles.bg}; 
                    padding: 50pt;
                }
                h1 { 
                    color: ${styles.accent}; 
                    font-size: 36pt; 
                    text-align: center; 
                    margin-bottom: 5pt;
                    font-weight: bold;
                }
                .subtitle {
                    text-align: center;
                    font-style: italic;
                    font-size: 14pt;
                    color: #666;
                    border-bottom: 2pt solid ${styles.accent};
                    padding-bottom: 10pt;
                    margin-bottom: 30pt;
                }
                h2 { 
                    color: ${styles.accent}; 
                    border-bottom: 1px solid #ccc; 
                    font-size: 22pt; 
                    margin-top: 40pt; 
                    text-transform: uppercase;
                    letter-spacing: 1pt;
                }
                h3 { 
                    color: ${styles.accent}; 
                    font-size: 16pt; 
                    margin-top: 20pt;
                    border-left: 5pt solid ${styles.accent};
                    padding-left: 10pt;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 15pt; 
                }
                th { 
                    background: ${template === 'modern' ? styles.accent : '#f3f4f6'}; 
                    color: ${template === 'modern' ? 'white' : '#111'}; 
                    padding: 10pt; 
                    text-align: left; 
                    font-size: 8pt;
                    text-transform: uppercase;
                }
                td { 
                    border: 1px solid #ddd; 
                    padding: 10pt; 
                    vertical-align: top; 
                    font-size: 9pt;
                }
                .dictionary-entry {
                    margin-top: 25pt;
                    border-bottom: 1pt solid #eee;
                    padding-bottom: 15pt;
                }
                .word-head {
                    font-weight: bold;
                    font-size: 13pt;
                    color: ${styles.accent};
                }
                .inflection-table th { background: #f9fafb; font-size: 7pt; }
                .inflection-table td { font-size: 8pt; padding: 5pt; }
                .code-block { 
                    background: #f8f9fa; 
                    border: 1px solid #ddd; 
                    padding: 15pt; 
                    font-family: 'Courier New', monospace; 
                    white-space: pre-wrap; 
                }
            </style>
        </head>
        <body>
            <h1>${conlangName}</h1>
            <div class="subtitle">A Comprehensive Reference Grammar by ${authorName}</div>
            
            <p style="text-align: center;">Exported on ${new Date().toLocaleDateString()}</p>

            <h2>I. Phonology</h2>
            <p><strong>Inventory:</strong></p>
            <table>
                <tr><th>Category</th><th>Graphemes / Phonemes</th></tr>
                <tr><td>Consonants</td><td>${consonants || '—'}</td></tr>
                <tr><td>Vowels</td><td>${vowels || '—'}</td></tr>
            </table>
            
            ${historicalRules ? `
                <h3>Historical Sound Changes</h3>
                <div class="code-block">${typeof historicalRules === 'string' ? historicalRules : JSON.stringify(historicalRules)}</div>
            ` : ''}

            <h2>II. Grammar Documentation</h2>
            ${Object.entries(wikiPages).map(([id, content]) => {
                if (id === 'phonology') return '';
                const title = id.charAt(0).toUpperCase() + id.slice(1);
                const cleanContent = typeof content === 'string' ? content : content?.content || "";
                return `<h3>${title}</h3><div>${cleanContent}</div>`;
            }).join('')}

            ${grammarRules && grammarRules.length > 0 ? `
                <h3>Morphological Rules</h3>
                <table>
                    <tr><th>Rule Name / Category</th><th>Affix</th><th>Applies To</th><th>Condition</th><th>Type</th><th>Dep.</th></tr>
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

            ${personRules && personRules.length > 0 ? `
                <h3>Person & Class Markers</h3>
                <table>
                    <tr><th>Person</th><th>Marker</th><th>Free Form</th><th>Number</th><th>Class</th></tr>
                    ${personRules.map(p => `
                        <tr>
                            <td>${p.person || '—'}</td>
                            <td><code>${p.affix || '—'}</code></td>
                            <td>${p.freeForm || '—'}</td>
                            <td>${p.number || '—'}</td>
                            <td>${p.gender || '—'}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            <h2>III. Lexicon</h2>
            ${lexicon.map(e => {
                const baseWord = e.word.replace(/\*/g, '');
                const paradigm = includeInflections ? generateParadigm(baseWord, config, {
                    inflectionMode,
                    wordClass: e.wordClass
                }) : [];

                return `
                    <div class="dictionary-entry">
                        <span class="word-head">${baseWord}</span> 
                        <span style="color: #666;">[${e.ipa || '—'}]</span>
                        <span style="font-style: italic; margin-left: 10pt;">${e.wordClass || '—'}</span>
                        <p style="margin: 5pt 0;">${e.translation || '—'}</p>
                        
                        ${includeInflections && paradigm.length > 0 ? `
                            <table class="inflection-table">
                                ${inflectionMode === 'compact' ? `
                                    <tr style="background: #fafafa;"><th style="background: #eee; color: #444;">Form</th><th style="background: #eee; color: #444;">Result</th></tr>
                                    ${paradigm.map(p => `<tr><td>${p.ruleName}</td><td>${p.result || '—'}</td></tr>`).join('')}
                                ` : `
                                    <tr style="background: #fafafa;"><th style="background: #eee; color: #444;">Rule</th><th style="background: #eee; color: #444;">Person</th><th style="background: #eee; color: #444;">Result</th></tr>
                                    ${paradigm.map(p => `
                                        <tr>
                                            <td>${p.ruleName}</td>
                                            <td>${p.personName}</td>
                                            <td>${p.result || '—'}</td>
                                        </tr>
                                    `).join('')}
                                `}
                            </table>
                        ` : ''}
                    </div>
                `;
            }).join('')}

            <div style="margin-top: 50pt; text-align: center; font-size: 9pt; color: #999;">
                Generated by Conlang Engine React
            </div>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conlangName.replace(/\s+/g, '_')}_Master_Reference.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
