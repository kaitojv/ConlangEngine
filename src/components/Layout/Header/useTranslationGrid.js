/**
 * Drives the translation grid: category tabs derived from the data itself,
 * a text filter, an "untranslated only" toggle, and pagination.
 *
 * The tab list used to be a hardcoded four entries while the vocabulary was a
 * hand-written 51 keys, so it happened to cover everything. Now that the lists
 * are generated from the real game files, a fixed list hid whole categories
 * (Entities, Combat, Chat, Multiplayer, World, Commands were simply
 * unreachable). Deriving the tabs from the data makes that class of bug
 * impossible.
 *
 * Pagination exists because rendering ~3,000 controlled inputs, each with a
 * datalist of lexicon suggestions, is slow enough to stall the modal; and the
 * auto-match scan on open is O(keys x lexicon).
 */
import { useEffect, useMemo, useState } from 'react';

/** Rows per page. Small enough that typing stays responsive. */
export const PAGE_SIZE = 100;

/**
 * @param {Array<{key: string, english: string, category: string}>} keys
 * @param {Record<string, string>} translations current values, keyed by `key`
 * @param {string} defaultCategory category to show first
 */
export function useTranslationGrid(keys, translations, defaultCategory) {
    const categories = useMemo(() => {
        const counts = new Map();
        for (const k of keys) counts.set(k.category, (counts.get(k.category) || 0) + 1);
        // Busiest categories first, but put the caller's preferred category up
        // front so the modal still opens on the most familiar tab.
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
        if (defaultCategory && sorted.includes(defaultCategory)) {
            return [defaultCategory, ...sorted.filter((c) => c !== defaultCategory)];
        }
        return sorted;
    }, [keys, defaultCategory]);

    const [activeCategory, setActiveCategory] = useState(defaultCategory);
    const [query, setQuery] = useState('');
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [page, setPage] = useState(0);

    // A category that no longer exists (or a vocab regenerated between renders)
    // must not leave the grid blank.
    useEffect(() => {
        if (!categories.includes(activeCategory)) {
            setActiveCategory(categories[0] ?? defaultCategory);
        }
    }, [categories, activeCategory, defaultCategory]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return keys.filter((item) => {
            if (item.category !== activeCategory) return false;
            if (onlyMissing) {
                const v = translations[item.key];
                if (v && String(v).trim() !== '') return false;
            }
            if (!q) return true;
            return (
                item.english.toLowerCase().includes(q) ||
                item.key.toLowerCase().includes(q)
            );
        });
    }, [keys, translations, activeCategory, query, onlyMissing]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const visible = useMemo(
        () => filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
        [filtered, safePage]
    );

    /** Any filter change should send the user back to the first page. */
    const selectCategory = (c) => { setActiveCategory(c); setPage(0); };
    const setSearch = (q) => { setQuery(q); setPage(0); };
    const toggleOnlyMissing = () => { setOnlyMissing((v) => !v); setPage(0); };

    return {
        categories,
        activeCategory,
        selectCategory,
        query,
        setSearch,
        onlyMissing,
        toggleOnlyMissing,
        filtered,
        visible,
        page: safePage,
        setPage,
        pageCount,
        categoryCount: keys.filter((k) => k.category === activeCategory).length,
    };
}