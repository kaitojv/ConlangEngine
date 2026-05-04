
/**
 * sheetsExporter.jsx
 * Exports the lexicon and full grammar reference as an Excel-compatible file.
 */
import { generateParadigm } from './morphologyEngine.jsx';

export const generateSheetsExport = (config, lexicon, options = {}) => {
    const { 
        conlangName = "MyConlang", 
        grammarRules = [], 
        personRules = [], 
        historicalRules = "",
        wikiPages = {}
    } = config;

    const { includeInflections = true, inflectionMode = 'compact' } = options;

    // Build the HTML table
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; font-family: 'Segoe UI', 'Arial Unicode MS', sans-serif; }
                th { background-color: #7c3aed; color: white; border: 1px solid #ddd; padding: 8px; }
                td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                .section-header { background-color: #1e293b; color: white; font-weight: bold; text-align: center; font-size: 14pt; }
                .sub-section { background-color: #f3f4f6; font-weight: bold; }
            </style>
        </head>
        <body>
            <table>
                <!-- 1. LEXICON SECTION -->
                <tr><td colspan="7" class="section-header">LEXICON & INFLECTIONS</td></tr>
                <tr>
                    <th>Word</th>
                    <th>Class</th>
                    <th>Meaning</th>
                    <th>IPA</th>
                    <th>Inflected Form</th>
                    <th>Rule/Category</th>
                    <th>Person/Class</th>
                </tr>
                ${lexicon.map(entry => {
                    const baseWord = entry.word.replace(/\*/g, '');
                    const paradigm = includeInflections ? generateParadigm(baseWord, config, {
                        inflectionMode,
                        wordClass: entry.wordClass
                    }) : [];

                    if (paradigm.length === 0) {
                        return `
                            <tr>
                                <td>${baseWord}</td>
                                <td>${entry.wordClass || ''}</td>
                                <td>${entry.translation || ''}</td>
                                <td>${entry.ipa || ''}</td>
                                <td colspan="3">—</td>
                            </tr>
                        `;
                    }

                    return paradigm.map((p, idx) => `
                        <tr>
                            ${idx === 0 ? `
                                <td rowspan="${paradigm.length}">${baseWord}</td>
                                <td rowspan="${paradigm.length}">${entry.wordClass || ''}</td>
                                <td rowspan="${paradigm.length}">${entry.translation || ''}</td>
                                <td rowspan="${paradigm.length}">${entry.ipa || ''}</td>
                            ` : ''}
                            <td>${p.result || '—'}</td>
                            <td>${p.ruleName}</td>
                            <td>${p.personName}</td>
                        </tr>
                    `).join('');
                }).join('')}
                
                <!-- 2. GRAMMAR RULES REFERENCE -->
                <tr><td colspan="7" style="height: 30px;"></td></tr>
                <tr><td colspan="7" class="section-header">GRAMMAR RULES REFERENCE</td></tr>
                <tr>
                    <th>Rule Name</th>
                    <th>Affix</th>
                    <th>Applies To</th>
                    <th>Condition</th>
                    <th>Type</th>
                    <th>Dependency</th>
                    <th>Notes</th>
                </tr>
                ${grammarRules.map(r => `
                    <tr>
                        <td>${r.name || r.category || 'General'}</td>
                        <td>${r.affix || '—'}</td>
                        <td>${Array.isArray(r.appliesTo) ? r.appliesTo.join(", ") : (r.appliesTo || 'Universal')}</td>
                        <td>${r.condition || 'always'}</td>
                        <td>${r.standalone ? 'Particle' : 'Affix'}</td>
                        <td>${r.dependency || 'None'}</td>
                        <td>—</td>
                    </tr>
                `).join('')}

                <!-- 3. PERSON RULES SECTION -->
                <tr><td colspan="7" style="height: 30px;"></td></tr>
                <tr><td colspan="7" class="section-header">PERSON & CLASS MARKERS</td></tr>
                <tr>
                    <th>Person</th>
                    <th>Marker</th>
                    <th>Free Form</th>
                    <th>Number</th>
                    <th>Class</th>
                    <th colspan="2">—</th>
                </tr>
                ${Array.isArray(personRules) ? personRules.map(p => `
                    <tr>
                        <td>${p.person || '—'}</td>
                        <td>${p.affix || '—'}</td>
                        <td>${p.freeForm || '—'}</td>
                        <td>${p.number || '—'}</td>
                        <td>${p.gender || '—'}</td>
                        <td colspan="2">—</td>
                    </tr>
                `).join('') : `<tr><td colspan="7">${personRules}</td></tr>`}

                <!-- 4. WIKI & DOCUMENTATION SECTION -->
                <tr><td colspan="7" style="height: 30px;"></td></tr>
                <tr><td colspan="7" class="section-header">WIKI & DOCUMENTATION</td></tr>
                ${Object.entries(wikiPages).map(([id, page]) => {
                    const title = typeof page === 'object' ? page.title : id.replace(/-/g, ' ');
                    const content = typeof page === 'object' ? page.content : page;
                    const cleanContent = content ? content.replace(/<\/?[^>]+(>|$)/g, "") : "";
                    return `
                        <tr>
                            <td class="sub-section" colspan="2">${title}</td>
                            <td colspan="5">${cleanContent}</td>
                        </tr>
                    `;
                }).join('')}

                <!-- 5. HISTORICAL RULES SECTION -->
                <tr><td colspan="7" style="height: 30px;"></td></tr>
                <tr><td colspan="7" class="section-header">HISTORICAL SOUND CHANGES</td></tr>
                ${historicalRules ? historicalRules.split('\n').map(line => `
                    <tr><td colspan="7">${line}</td></tr>
                `).join('') : `<tr><td colspan="7">No rules defined.</td></tr>`}
            </table>
        </body>
        </html>
    `;

    // Use Blob with UTF-8 BOM and download as .xls
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conlangName.replace(/\s+/g, '_')}_Master_Reference.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
