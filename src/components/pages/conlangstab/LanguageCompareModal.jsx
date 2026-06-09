import React, { useState, useMemo } from 'react';
import Input from '@/components/UI/Input/Input.jsx';
import { Search, Settings2, Link } from 'lucide-react';
import './languageCompare.css';

export default function LanguageCompareModal({ baseProject, localProjects }) {
    // 1. Find Relatives
    const motherId = baseProject?.project_data?.config?.parentId;
    const mother = localProjects.find(p => p.id === motherId);
    const daughters = localProjects.filter(p => p.project_data?.config?.parentId === baseProject.id);
    const sisters = motherId ? localProjects.filter(p => p.project_data?.config?.parentId === motherId && p.id !== baseProject.id) : [];

    const allRelatives = [
        ...(mother ? [mother] : []),
        ...sisters,
        ...daughters
    ];

    // Default select all relatives + base project
    const initialSelected = [baseProject.id, ...allRelatives.map(r => r.id)];
    const [selectedLangIds, setSelectedLangIds] = useState(initialSelected);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleLang = (id) => {
        setSelectedLangIds(prev => 
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    // 2. Build the Comparison Matrix
    const { concepts, selectedProjects } = useMemo(() => {
        // Find the actual project objects that are currently selected
        const projs = [baseProject, ...allRelatives].filter(p => selectedLangIds.includes(p.id));
        
        // Extract all unique translations (concepts) from all selected dictionaries
        const translationMap = new Map();

        projs.forEach(proj => {
            const dict = proj.project_data?.dictionary || [];
            dict.forEach(entry => {
                if (!entry.translation) return;
                const conceptRaw = entry.translation.split(',')[0].trim(); // take first translation meaning if there's a comma list
                if (!conceptRaw) return;
                const conceptKey = conceptRaw.toLowerCase();

                if (!translationMap.has(conceptKey)) {
                    translationMap.set(conceptKey, {
                        concept: conceptRaw, // Display name
                        words: {} // { [projectId]: word }
                    });
                }
                
                // If this language has multiple words for the same concept, we can join them or just take the first
                // Let's take the first or join with comma
                const safeWord = (entry.word || '').replace(/\*/g, '');
                const current = translationMap.get(conceptKey).words[proj.id];
                if (current) {
                    translationMap.get(conceptKey).words[proj.id] = `${current}, ${safeWord}`;
                } else {
                    translationMap.get(conceptKey).words[proj.id] = safeWord;
                }
            });
        });

        // Convert Map to Array and sort alphabetically
        let conceptsList = Array.from(translationMap.values()).sort((a, b) => a.concept.localeCompare(b.concept));

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            conceptsList = conceptsList.filter(c => 
                c.concept.toLowerCase().includes(q) || 
                Object.values(c.words).some(w => w.toLowerCase().includes(q))
            );
        }

        return { concepts: conceptsList, selectedProjects: projs };
    }, [baseProject, allRelatives, selectedLangIds, searchQuery]);

    if (allRelatives.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--tx2)' }}>
                <p><strong>{baseProject.project_data?.config?.conlangName || "This language"}</strong> has no evolutionary relatives.</p>
                <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                    Use the "Set Mother Language" or "Derive Daughter" buttons in the Workspaces tab to build a family tree, and then come back here to compare their lexicons!
                </p>
            </div>
        );
    }

    return (
        <div className="compare-modal-container">
            <div className="compare-toolbar">
                <div className="compare-search">
                    <Search size={16} className="search-icon" />
                    <input 
                        className="search-input"
                        placeholder="Search concepts or words..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                <div className="compare-lang-toggles">
                    <span style={{ fontSize: '0.8rem', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Settings2 size={14} /> Compare:
                    </span>
                    <label className={`compare-toggle ${selectedLangIds.includes(baseProject.id) ? 'active' : ''}`}>
                        <input 
                            type="checkbox" 
                            checked={selectedLangIds.includes(baseProject.id)}
                            onChange={() => toggleLang(baseProject.id)}
                            style={{ display: 'none' }}
                        />
                        {baseProject.project_data?.config?.conlangName || "Base"}
                    </label>
                    {allRelatives.map(rel => (
                        <label key={rel.id} className={`compare-toggle ${selectedLangIds.includes(rel.id) ? 'active' : ''}`}>
                            <input 
                                type="checkbox" 
                                checked={selectedLangIds.includes(rel.id)}
                                onChange={() => toggleLang(rel.id)}
                                style={{ display: 'none' }}
                            />
                            {rel.project_data?.config?.conlangName || "Untitled"}
                        </label>
                    ))}
                </div>
            </div>

            <div className="compare-table-wrapper">
                <table className="compare-table">
                    <thead>
                        <tr>
                            <th className="concept-col">Concept</th>
                            {selectedProjects.map(p => (
                                <th key={p.id}>{p.project_data?.config?.conlangName || "Untitled"}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {concepts.map(row => (
                            <tr key={row.concept}>
                                <td className="concept-cell">
                                    <span className="concept-badge">{row.concept}</span>
                                </td>
                                {selectedProjects.map(p => {
                                    const word = row.words[p.id];
                                    return (
                                        <td key={p.id} className={word ? 'has-word' : 'missing-word'}>
                                            {word ? (
                                                <span className="compare-word">{word}</span>
                                            ) : (
                                                <span className="empty-dash">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {concepts.length === 0 && (
                            <tr>
                                <td colSpan={selectedProjects.length + 1} style={{ textAlign: 'center', padding: '30px', color: 'var(--tx3)' }}>
                                    No matching concepts found between these languages.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
