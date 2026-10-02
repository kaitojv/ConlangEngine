import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { PAGE_SIZE } from './useTranslationGrid.js';
import { useLexiconStore } from '../../../store/useLexiconStore.jsx';
import { autoMatchLexicon, searchLexicon } from '../../../utils/gameExportMatch.js';

/**
 * The controls above a translation grid: category tabs (derived from the data),
 * a search box, an "untranslated only" filter and pagination.
 *
 * Shared by the Minecraft and Terraria wizards so the two behave identically.
 * Every control here exists because the vocabulary grew from ~50 hand-written
 * entries to a few thousand generated ones.
 *
 * `translations` / `onChange` are passed in because the two games keep their
 * mapper state separately; the row markup itself is identical for both.
 */
export default function TranslationGridControls({
    grid, keys, translations, onChange, idPrefix,
}) {
    const lexicon = useLexiconStore((s) => s.lexicon);
    const {
        categories, activeCategory, selectCategory,
        query, setSearch, onlyMissing, toggleOnlyMissing,
        filtered, visible, page, setPage, pageCount,
    } = grid;

    const translatedCount = Object.values(translations)
        .filter(v => v && String(v).trim() !== '').length;

    const firstShown = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
    const lastShown = Math.min((page + 1) * PAGE_SIZE, filtered.length);

    return (
        <>
            <div className="mc-tabs">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`mc-tab-btn ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => selectCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="mc-grid-controls">
                <div className="mc-search-wrap">
                    <Search size={14} />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search English or key…"
                        aria-label="Search keys"
                    />
                </div>
                <button
                    type="button"
                    className={`mc-filter-btn ${onlyMissing ? 'active' : ''}`}
                    onClick={toggleOnlyMissing}
                    aria-pressed={onlyMissing}
                >
                    <SlidersHorizontal size={14} />
                    Untranslated only
                </button>
            </div>

            <div className="mc-grid-status">
                {filtered.length === 0
                    ? `No matches in ${activeCategory}`
                    : `Showing ${firstShown}–${lastShown} of ${filtered.length} in ${activeCategory}`}
                {' · '}
                {translatedCount} / {keys.length} translated
            </div>

            <div className="mc-keys-scroll">
                <div className="mc-keys-grid">
                    {visible.map(item => {
                        const autoMatched = autoMatchLexicon(item.english, lexicon);
                        const isAutoMatched = autoMatched && translations[item.key] === autoMatched;
                        const listId = `lex-${idPrefix}-${item.key.replace(/\./g, '_')}`;

                        return (
                            <div key={item.key} className="mc-key-card">
                                <div className="mc-key-meta">
                                    <span className="mc-eng">{item.english}</span>
                                    <span className="mc-key-id">{item.key}</span>
                                </div>
                                <div className="mc-input-wrapper">
                                    <input
                                        type="text"
                                        value={translations[item.key] || ''}
                                        onChange={e => onChange(item.key, e.target.value)}
                                        placeholder={`Translate: "${item.english}"`}
                                        className={isAutoMatched ? 'auto-matched' : ''}
                                        list={listId}
                                    />
                                    {isAutoMatched && (
                                        <span className="mc-match-badge" title="Automatically pre-filled from your lexicon">
                                            Lexicon Match
                                        </span>
                                    )}
                                </div>
                                <datalist id={listId}>
                                    {searchLexicon(item.english, lexicon).slice(0, 25).map((c, ci) => (
                                        <option key={ci} value={c.word} />
                                    ))}
                                </datalist>
                            </div>
                        );
                    })}
                </div>
            </div>

            {pageCount > 1 && (
                <div className="mc-pagination">
                    <button
                        type="button"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span>Page {page + 1} of {pageCount}</span>
                    <button
                        type="button"
                        onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
                        disabled={page >= pageCount - 1}
                        aria-label="Next page"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </>
    );
}