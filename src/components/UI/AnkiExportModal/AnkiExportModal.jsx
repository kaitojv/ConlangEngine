// src/components/UI/AnkiExportModal/AnkiExportModal.jsx
import React, { useState, useMemo } from 'react';
import Modal from '../Modal/Modal.jsx';
import Button from '../Buttons/Buttons.jsx';
import { useLexiconStore } from '@/store/useLexiconStore.jsx';
import { useConfigStore } from '@/store/useConfigStore.jsx';
import { generateAnkiTSV, downloadAnkiTSV } from '@/utils/ankiExporter.js';
import { Download, Copy, Check, Sparkles, Layers } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation.jsx';
import toast from 'react-hot-toast';
import './ankiExportModal.css';

export default function AnkiExportModal({ isOpen, onClose, defaultTag = 'all', deckWords = null }) {
    const { t } = useTranslation();
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
            return toast.error(t('ankiExport.noEntriesToast'));
        }
        const conlangName = (config.conlangName || 'conlang').toLowerCase().replace(/\s+/g, '_');
        const filename = `${conlangName}_anki_deck.tsv`;
        downloadAnkiTSV(generatedTSV, filename);
        toast.success(t('ankiExport.exportedToast', { count: cardCount, filename }));
        onClose();
    };

    const handleCopy = async () => {
        if (!generatedTSV) {
            return toast.error(t('ankiExport.noEntriesToast'));
        }
        try {
            await navigator.clipboard.writeText(generatedTSV);
            setCopied(true);
            toast.success(t('ankiExport.copiedToast', { count: cardCount }));
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error(t('ankiExport.copyErrorToast'));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('ankiExport.title')}>
            <div className="anki-modal-wrapper">
                <p className="anki-modal-desc">
                    {t('ankiExport.desc')}
                </p>

                <div className="anki-stats-badge">
                    <Layers size={14} />
                    <span>{t('ankiExport.cardsToExport')} <strong className="anki-stats-count">{cardCount}</strong> ({t('ankiExport.entriesLabel', { count: targetEntries.length })})</span>
                </div>

                <div className="anki-form-group">
                    <label className="anki-form-label">{t('ankiExport.deckScope')}</label>
                    <select className="anki-select" value={scope} onChange={(e) => setScope(e.target.value)}>
                        <option value="all">{t('ankiExport.scopeAll', { count: lexicon.length })}</option>
                        {allTags.length > 0 && <option value="tag">{t('ankiExport.scopeTag')}</option>}
                        <option value="due">{t('ankiExport.scopeDue')}</option>
                        {deckWords && <option value="custom">{t('ankiExport.scopeCustom', { count: deckWords.length })}</option>}
                    </select>
                </div>

                {scope === 'tag' && (
                    <div className="anki-form-group">
                        <label className="anki-form-label">{t('ankiExport.selectTag')}</label>
                        <select className="anki-select" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
                            <option value="">{t('ankiExport.chooseTagPlaceholder')}</option>
                            {allTags.map(tag => (
                                <option key={tag} value={tag}>#{tag}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="anki-form-group">
                    <label className="anki-form-label">{t('ankiExport.cardDirection')}</label>
                    <select className="anki-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
                        <option value="toEnglish">{t('ankiExport.dirToEnglish')}</option>
                        <option value="toConlang">{t('ankiExport.dirToConlang')}</option>
                        <option value="bidirectional">{t('ankiExport.dirBidirectional')}</option>
                    </select>
                </div>

                <div className="anki-form-group">
                    <label className="anki-form-label">{t('ankiExport.cardFields')}</label>
                    <div className="anki-checkbox-grid">
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeIPA} onChange={(e) => setIncludeIPA(e.target.checked)} />
                            {t('ankiExport.fieldIPA')}
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeScript} onChange={(e) => setIncludeScript(e.target.checked)} />
                            {t('ankiExport.fieldScript')}
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includePOS} onChange={(e) => setIncludePOS(e.target.checked)} />
                            {t('ankiExport.fieldPOS')}
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
                            {t('ankiExport.fieldNotes')}
                        </label>
                        <label className="anki-checkbox-label">
                            <input type="checkbox" checked={includeTags} onChange={(e) => setIncludeTags(e.target.checked)} />
                            {t('ankiExport.fieldTags')}
                        </label>
                    </div>
                </div>

                <div className="anki-info-box">
                    {t('ankiExport.ankiTip')}
                </div>

                <div className="anki-modal-actions">
                    <Button variant="default" onClick={handleCopy}>
                        <div className="btn-content-flex">
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? t('ankiExport.copied') : t('ankiExport.copyTsv')}
                        </div>
                    </Button>
                    <Button variant="imp" onClick={handleDownload} disabled={cardCount === 0}>
                        <div className="btn-content-flex">
                            <Download size={16} /> {t('ankiExport.downloadTsv')}
                        </div>
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
