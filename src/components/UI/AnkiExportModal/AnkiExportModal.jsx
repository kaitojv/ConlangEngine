// src/components/UI/AnkiExportModal/AnkiExportModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../Buttons/Buttons.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { generateAnkiTSV, downloadAnkiTSV } from '@/utils/ankiExporter.js';
import { Download, Copy, Check, Sparkles, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import './ankiExportModal.css';

export default function AnkiExportModal({ isOpen, onClose, defaultTag = 'all', deckWords = null }) {
    const rawLexicon = useLexiconStore((state) => state.lexicon);
    const lexicon = useMemo(() => Array.isArray(rawLexicon) ? rawLexicon : (rawLexicon?.lexicon || []), [rawLexicon]);
    const config = useConfigStore();

    const [scope, setScope] = useState(deckWords ? 'custom' : (defaultTag !== 'all' ? 'tag' : 'all'));
    const [selectedTag, setSelectedTag] = useState(defaultTag === 'all' ? '' : defaultTag);
    const [direction, setDirection] = useState('toEnglish');
    const [includeIPA, setIncludeIPA] = useState(true);
    const [includeScript, setIncludeScript] = useState(true);
    const [includePOS, setIncludePOS] = useState(true);
    const [includeNotes, setIncludeNotes] = useState(true);
    const [includeTags, setIncludeTags] = useState(true);
    const [copied, setCopied] = useState(false);
    const [reviewCutoffTime] = useState(() => Date.now());

    // Collect unique tags
    const allTags = useMemo(() => {
        const tags = lexicon.flatMap(w => w.tags || []);
        return [...new Set(tags)].sort();
    }, [lexicon]);

    // Compute entries based on scope
    const targetEntries = useMemo(() => {
        if (scope === 'custom' && deckWords) {
            return deckWords;
        }
        if (scope === 'due') {
            return lexicon.filter(w => w.srs && w.srs.nextReviewDate && w.srs.nextReviewDate <= reviewCutoffTime);
        }
        if (scope === 'tag' && selectedTag) {
            return lexicon.filter(w => (w.tags || []).includes(selectedTag));
        }
        return lexicon;
    }, [scope, selectedTag, lexicon, deckWords, reviewCutoffTime]);

    const generatedTSV = useMemo(() => {
        if (!isOpen) return '';
        return generateAnkiTSV(targetEntries, {
            config,
            direction,
            includeIPA,
            includeScript,
            includePOS,
            includeNotes,
            includeTags,
            deckName: config.conlangName || 'Conlang'
        });
    }, [isOpen, targetEntries, config, direction, includeIPA, includeScript, includePOS, includeNotes, includeTags]);

    const cardCount = useMemo(() => {
        if (targetEntries.length === 0) return 0;
        return direction === 'bidirectional' ? targetEntries.length * 2 : targetEntries.length;
    }, [targetEntries.length, direction]);

    const handleDownload = () => {
        if (!generatedTSV) {
            return toast.error("No entries to export.");
        }
        const conlangName = (config.conlangName || 'conlang').toLowerCase().replace(/\s+/g, '_');
        const filename = `${conlangName}_anki_deck.tsv`;
        downloadAnkiTSV(generatedTSV, filename);
        toast.success(`Exported ${cardCount} cards to ${filename}`);
        onClose();
    };

    const handleCopy = async () => {
        if (!generatedTSV) {
            return toast.error("No entries to copy.");
        }
        try {
            await navigator.clipboard.writeText(generatedTSV);
            setCopied(true);
            toast.success(`Copied ${cardCount} cards to clipboard!`);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export Anki Flashcard Deck (.tsv)">
            <div className="anki-modal-wrapper">
                <p className="anki-modal-desc">
                    Generate an Anki-compatible TSV deck complete with IPA pronunciation, native script transliteration, part-of-speech tags, and definitions.
                </p>

                <div className="anki-stats-badge">
                    <Layers size={14} />
                    <span>Cards to Export: <strong className="anki-stats-count">{cardCount}</strong> ({targetEntries.length} entries)</span>
                </div>

                <div className="anki-form-group">
                    <label className="anki-form-label">Deck Scope</label>
                    <select className="anki-select" value={scope} onChange={(e) => setScope(e.target.value)}>
                        <option value="all">Entire Lexicon ({lexicon.length} words)</option>
                        {allTags.length > 0 && <option value="tag">Filter by Semantic Tag</option>}
                        <option value="due">SRS Review Due Cards</option>
                        {deckWords && <option value="custom">Current Study Deck ({deckWords.length} words)</option>}
                    </select>
                </div>

                {scope === 'tag' && (
                    <div className="anki-form-group">
                        <label className="anki-form-label">Select Tag</label>
                        <select className="anki-select" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                            <option value="">-- Choose Tag --</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>#{tag}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="anki-form-group">
                    <label className="anki-form-label">Card Direction</label>
                    <select className="anki-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
                        <option value="toEnglish">Conlang → Translation (Recognition)</option>
                        <option value="toConlang">Translation → Conlang (Production)</option>
                        <option value="bidirectional">Bidirectional (2 cards per word)</option>
                    </select>
                </div>

                <div className="anki-form-group">
                    <label className="anki-form-label">Card Fields & Columns</label>
                    <div className="anki-checkbox-grid">
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeIPA} onChange={(e) => setIncludeIPA(e.target.checked)} />
                            IPA Pronunciation
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeScript} onChange={(e) => setIncludeScript(e.target.checked)} />
                            Native Script / Conscript
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includePOS} onChange={(e) => setIncludePOS(e.target.checked)} />
                            Part of Speech
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
                            Notes & Etymology
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeTags} onChange={(e) => setIncludeTags(e.target.checked)} />
                            Anki Tags
                        </label>
                    </div>
                </div>

                <div className="anki-info-box">
                    <strong>Tip for Anki:</strong> In the desktop Anki app, click <em>File → Import</em> and select the exported <code>.tsv</code> file. Anki will automatically configure HTML cards, tabs, and tags based on the embedded headers!
                </div>

                <div className="anki-modal-actions">
                    <Button variant="default" onClick={handleCopy}>
                        <div className="btn-content-flex">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy TSV'}
                        </div>
                    </Button>
                    <Button variant="imp" onClick={handleDownload} disabled={cardCount === 0}>
                        <div className="btn-content-flex">
                            <Download size={16} /> Download .tsv
                        </div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
