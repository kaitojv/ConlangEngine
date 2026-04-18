// We keep this massive HTML template here so it doesn't clutter up our beautiful React components!
export const generateConlangPDF = (config, lexicon) => {
    // Pop open a new window for the print preview
    const printWindow = window.open('', '', 'height=900,width=800');
    if (!printWindow) {
        return alert("Please allow pop-ups to generate the PDF.");
    }

    // Construct the HTML layout for the document
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${config.conlangName || 'Conlang'} - Reference Document</title>
            <style>
                ${config.customFontBase64 ? `
                @font-face {
                    font-family: 'ConlangCustomFont';
                    src: url('${config.customFontBase64}') format('truetype');
                }
                .custom-font { font-family: 'ConlangCustomFont', sans-serif; }
                ` : ''}
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
                h1 { color: #111; text-align: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 5px; }
                .subtitle { text-align: center; font-size: 1.1rem; color: #555; margin-bottom: 30px; }
                h2 { color: #222; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 40px; page-break-after: avoid; }
                h3 { color: #444; margin-top: 20px; }
                p { margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .page-break { page-break-before: always; }
                .wiki-page { margin-bottom: 30px; }
                .tag { display: inline-block; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 4px; }
            </style>
        </head>
        <body>
            <h1>${config.conlangName || 'My Conlang'}</h1>
            <div class="subtitle">
                <strong>Author:</strong> ${config.authorName || 'Anonymous'}<br/>
                ${config.description || ''}
            </div>

            <h2>1. Phonology</h2>
            <p><strong>Typology:</strong> <span style="text-transform: capitalize;">${config.phonologyTypes || 'Not specified'}</span></p>
            <p><strong>Consonants:</strong> <span class="custom-font">${config.consonants || 'None'}</span></p>
            <p><strong>Vowels:</strong> <span class="custom-font">${config.vowels || 'None'}</span></p>
            <p><strong>Syllable Structure:</strong> ${config.syllablePattern || 'None'}</p>
            <p><strong>Historical Rules:</strong> ${config.historicalRules || 'None'}</p>

            <h2>2. Grammar & Syntax</h2>
            <p><strong>Word Order:</strong> ${config.syntaxOrder || 'SVO'}</p>
            <p><strong>Writing Direction:</strong> <span style="text-transform: uppercase;">${config.writingDirection || 'LTR'}</span></p>
            <p><strong>Verb Marker:</strong> ${config.verbMarker || 'None'}</p>
            <p><strong>Person Rules:</strong> ${config.personRules || 'None'}</p>
            <p><strong>Clitics/Particles:</strong> ${config.cliticsRules || 'None'}</p>
            
            ${config.grammarRules && config.grammarRules.length > 0 ? `
            <h3>Grammar Rules</h3>
            <ul>
                ${config.grammarRules.map(r => `<li>${typeof r === 'object' ? `<strong>${r.title || r.name || 'Rule'}:</strong> ${r.content || r.description || ''}` : r}</li>`).join('')}
            </ul>
            ` : ''}

            <div class="page-break"></div>

            <h2>3. Dictionary (${lexicon.length} entries)</h2>
            <table>
                <thead>
                    <tr><th>Word</th><th>IPA</th><th>Class</th><th>Translation</th><th>Tags</th></tr>
                </thead>
                <tbody>
                    ${lexicon.map(w => `
                        <tr>
                            <td><span class="custom-font" style="font-size: 1.1em;"><strong>${w.word}</strong></span>${w.ideogram ? `<br/><span style="font-size: 1.4em;" class="custom-font">${w.ideogram}</span>` : ''}</td>
                            <td>${w.ipa ? `/${w.ipa}/` : ''}</td>
                            <td><em>${w.wordClass || ''}</em></td>
                            <td>${w.translation || ''}</td>
                            <td>${(w.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${Object.keys(config.wikiPages || {}).length > 0 ? `
            <div class="page-break"></div>
            <h2>4. Wiki & Lore</h2>
            ${Object.entries(config.wikiPages || {}).map(([id, content]) => `<div class="wiki-page">${content}</div>`).join('')}
            ` : ''}
        </body>
        </html>
    `;

    // Write the content to the new window and trigger the print dialog
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // A tiny delay ensures custom fonts have a moment to load and paint before printing
    setTimeout(() => {
        printWindow.print();
    }, 500); 
};