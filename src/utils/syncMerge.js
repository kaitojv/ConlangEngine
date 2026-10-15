// src/utils/syncMerge.js
// ─────────────────────────────────────────────────────────────────────────────
// 3-way merge engine for cross-device sync.
//
// Pure, framework-free and deterministic (no Date.now / randomness), so it
// can be unit-tested in Node (see tests/test_syncMerge.js).
//
//   mergeProject({ base, local, remote, mode, decisions })
//     base   – last version this device knows matched the cloud (or null on
//              the first sync after the upgrade → 2-way "union" merge)
//     local  – this device's current { lexicon, phrases, config, wiki }
//     remote – the cloud's current     { lexicon, phrases, config, wiki }
//     mode   – 'auto'   (Live Auto ON: apply everything, newest edit wins)
//              'review' (Live Auto OFF: same defaults, but needsReview=true
//                        whenever there is anything for the user to decide)
//     decisions – { [conflictOrSimilarKey]: choice } user overrides coming
//                 from the Merge Review UI. Re-run mergeProject with the
//                 decisions to get the final result.
//
// The engine never produces user-facing text. It returns structured data
// (keys, levels, values) and the UI translates it via t().
// ─────────────────────────────────────────────────────────────────────────────

export const MERGE_MODES = Object.freeze({ AUTO: 'auto', REVIEW: 'review' });

export const SIMILARITY = Object.freeze({
    IDENTICAL: 'identical',      // same word/meaning/class AND every other field equal
    SAME_MEANING: 'sameMeaning', // same word + translation + class, other fields differ
    SAME_WORD: 'sameWord',       // same spelling (ignoring case/diacritics), different meaning
});

const SIMILARITY_RANK = { identical: 3, sameMeaning: 2, sameWord: 1 };

/** Fields on entries that are bookkeeping, not user content. */
const ENTRY_META_KEYS = new Set(['id', 'createdAt', 'updatedAt', 'updatedBy']);

/** Entry fields that behave like sets: merged by union instead of conflicting. */
const ENTRY_SET_KEYS = new Set(['tags', 'relatedWords']);

/**
 * Config keys that are device-local UI/session state. They are never merged;
 * the local value always wins. wikiPages is merged separately as `wiki`.
 */
export const DEVICE_LOCAL_CONFIG_KEYS = new Set([
    'projectId', 'lastCloudSync', 'syncConflictStatus', 'activeTab',
    'isThemeModalOpen', 'showSettings', 'isSidebarOpen', 'isRehydrating',
    'isAutoSyncEnabled', 'isProActive', 'appLanguage', 'activity',
    'devicesOnlineCount', 'wikiPages', 'wiki',
]);

/** How each entry collection identifies "the same word". */
const COLLECTIONS = {
    lexicon: { wordKey: 'word', glossKey: 'translation', classKey: 'wordClass' },
    phrases: { wordKey: 'phrase', glossKey: 'idiomaticTranslation', classKey: null },
};

// ── Value helpers ────────────────────────────────────────────────────────────

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** undefined / null / '' / false / [] / {} are all "empty" and compare equal. */
function isEmpty(v) {
    if (v === undefined || v === null || v === '' || v === false) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (isPlainObject(v)) return Object.keys(v).every(k => v[k] === undefined);
    return false;
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
        return true;
    }
    if (isPlainObject(a)) {
        if (!isPlainObject(b)) return false;
        const ka = Object.keys(a).filter(k => a[k] !== undefined);
        const kb = Object.keys(b).filter(k => b[k] !== undefined);
        if (ka.length !== kb.length) return false;
        for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
        return true;
    }
    return Number.isNaN(a) && Number.isNaN(b);
}

/** Semantic equality: two empty values are equal regardless of their type. */
export function valuesEqual(a, b) {
    if (isEmpty(a) && isEmpty(b)) return true;
    return deepEqual(a, b);
}

function unionKeys(...objs) {
    const keys = new Set();
    for (const o of objs) if (isPlainObject(o)) for (const k of Object.keys(o)) keys.add(k);
    return [...keys];
}

function toTime(v) {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return Date.parse(v) || 0;
    return 0;
}

function idKey(id) {
    return String(id);
}

function indexById(list) {
    const map = new Map();
    (Array.isArray(list) ? list : []).forEach((entry, i) => {
        if (!entry || typeof entry !== 'object') return;
        const key = entry.id !== undefined && entry.id !== null ? idKey(entry.id) : `__noid_${i}`;
        if (!map.has(key)) map.set(key, entry);
    });
    return map;
}

/** 'local' | 'remote' — whichever side was edited most recently (tie → local). */
function newerSide(l, r) {
    return (r?.updatedAt || 0) > (l?.updatedAt || 0) ? 'remote' : 'local';
}

/** 3-way set merge: union of both sides minus anything either side removed from base. */
function mergeSet(bv, lv, rv) {
    const B = Array.isArray(bv) ? bv : [];
    const L = Array.isArray(lv) ? lv : [];
    const R = Array.isArray(rv) ? rv : [];
    const keyOf = x => (typeof x === 'object' ? 'o:' + JSON.stringify(x) : typeof x + ':' + x);
    const bKeys = new Set(B.map(keyOf));
    const lKeys = new Set(L.map(keyOf));
    const rKeys = new Set(R.map(keyOf));
    const out = [];
    const seen = new Set();
    for (const x of [...L, ...R]) {
        const k = keyOf(x);
        if (seen.has(k)) continue;
        if (bKeys.has(k) && (!lKeys.has(k) || !rKeys.has(k))) continue; // removed on one side
        seen.add(k);
        out.push(x);
    }
    return out;
}

function isPrimitiveArray(v) {
    return Array.isArray(v) && v.every(x => x === null || typeof x !== 'object');
}

/** SRS progress: keep whichever side has studied further. Never a conflict. */
function pickSrs(lv, rv) {
    if (isEmpty(lv)) return rv;
    if (isEmpty(rv)) return lv;
    const lt = toTime(lv.nextReviewDate);
    const rt = toTime(rv.nextReviewDate);
    if (rt !== lt) return rt > lt ? rv : lv;
    return (rv.repetition || 0) > (lv.repetition || 0) ? rv : lv;
}

function contentKeys(...entries) {
    return unionKeys(...entries).filter(k => !ENTRY_META_KEYS.has(k));
}

function contentChanged(before, after) {
    for (const k of contentKeys(before, after)) {
        if (!valuesEqual(before?.[k], after?.[k])) return true;
    }
    return false;
}

function finalizeEntry(content, l, r) {
    const out = { id: l?.id ?? r?.id, ...content };
    const created = [l?.createdAt, r?.createdAt].filter(v => typeof v === 'number');
    if (created.length) out.createdAt = Math.min(...created);
    const side = newerSide(l, r) === 'remote' ? r : l;
    const updated = Math.max(l?.updatedAt || 0, r?.updatedAt || 0);
    if (updated) out.updatedAt = updated;
    const by = side?.updatedBy ?? l?.updatedBy ?? r?.updatedBy;
    if (by !== undefined) out.updatedBy = by;
    return out;
}

// ── Generic 3-way value merge ────────────────────────────────────────────────

/**
 * Merges one value (entry field, config key, wiki page…) three ways.
 * Pushes a conflict into ctx.conflicts when both sides changed it differently
 * and no automatic rule applies.
 */
function merge3(ctx, path, bv, lv, rv, hasBaseValue, depth) {
    if (valuesEqual(lv, rv)) return lv === undefined ? rv : lv;

    if (hasBaseValue) {
        if (valuesEqual(bv, lv)) return rv; // only remote changed
        if (valuesEqual(bv, rv)) return lv; // only local changed
    } else {
        // No common ancestor: an empty side simply hasn't got the value yet.
        if (isEmpty(lv)) return rv;
        if (isEmpty(rv)) return lv;
    }

    // ── Both sides changed it ──
    const leaf = path[path.length - 1];

    if (depth === 0 && ctx.setKeys.has(leaf)) {
        return mergeSet(hasBaseValue ? bv : [], lv, rv);
    }
    if (ctx.mergePrimitiveArrays && isPrimitiveArray(lv) && isPrimitiveArray(rv)) {
        return mergeSet(hasBaseValue ? bv : [], lv, rv);
    }
    if (depth === 0 && leaf === 'srs' && ctx.isEntry) {
        return pickSrs(lv, rv);
    }
    if (depth < ctx.maxDepth && isPlainObject(lv) && isPlainObject(rv) && (isPlainObject(bv) || isEmpty(bv))) {
        const out = {};
        for (const k of unionKeys(bv, lv, rv)) {
            const v = merge3(ctx, [...path, k], bv?.[k], lv[k], rv[k], hasBaseValue, depth + 1);
            if (v !== undefined) out[k] = v;
        }
        return out;
    }

    // ── Real conflict ──
    const key = `${ctx.prefix}:${path.join('.')}`;
    // Deleted on one side + edited on the other → default to keeping the edit.
    let autoResolution = ctx.defaultSide;
    if (lv === undefined) autoResolution = 'remote';
    else if (rv === undefined) autoResolution = 'local';

    const decided = ctx.decisions[key];
    const resolution = decided === 'local' || decided === 'remote' ? decided : autoResolution;

    ctx.conflicts.push({
        key,
        kind: 'field',
        ...ctx.meta,
        field: path.join('.'),
        baseValue: hasBaseValue ? bv : undefined,
        localValue: lv,
        remoteValue: rv,
        localUpdatedAt: ctx.localUpdatedAt,
        remoteUpdatedAt: ctx.remoteUpdatedAt,
        autoResolution,
        resolution,
        decided: decided === 'local' || decided === 'remote',
    });

    return resolution === 'remote' ? rv : lv;
}

// ── Entries (words / phrases) ────────────────────────────────────────────────

function mergeEntry(collection, key, b, l, r, decisions, conflicts) {
    const ctx = {
        prefix: `${collection}:${key}`,
        meta: { collection, id: l.id ?? r.id },
        defaultSide: newerSide(l, r),
        localUpdatedAt: l.updatedAt || 0,
        remoteUpdatedAt: r.updatedAt || 0,
        decisions,
        conflicts,
        setKeys: ENTRY_SET_KEYS,
        mergePrimitiveArrays: false,
        isEntry: true,
        maxDepth: 1, // e.g. scriptForms / inflectionOverrides merge per sub-key
    };
    const content = {};
    for (const k of contentKeys(b, l, r)) {
        const v = merge3(ctx, [k], b?.[k], l[k], r[k], !!b, 0);
        if (v !== undefined) content[k] = v;
    }
    const merged = finalizeEntry(content, l, r);
    // Reuse the local object when nothing changed (keeps React identity stable).
    return deepEqual(merged, l) ? l : merged;
}

/** Combines two separately-created entries for the same word into one. */
export function combineEntries(l, r, picks = null) {
    const survivorIsLocal = (l.createdAt ?? Infinity) <= (r.createdAt ?? Infinity);
    const newer = newerSide(l, r);
    const content = {};

    for (const k of contentKeys(l, r)) {
        const lv = l[k];
        const rv = r[k];
        let v;
        if (picks && (picks[k] === 'local' || picks[k] === 'remote')) {
            v = picks[k] === 'local' ? lv : rv;
        } else if (valuesEqual(lv, rv)) {
            v = lv === undefined ? rv : lv;
        } else if (isEmpty(lv)) {
            v = rv;
        } else if (isEmpty(rv)) {
            v = lv;
        } else if (ENTRY_SET_KEYS.has(k)) {
            v = mergeSet([], lv, rv);
        } else if (k === 'srs') {
            v = pickSrs(lv, rv);
        } else if (k === 'definition' && typeof lv === 'string' && typeof rv === 'string') {
            v = rv.length > lv.length ? rv : lv;
        } else if (isPlainObject(lv) && isPlainObject(rv)) {
            v = newer === 'local' ? { ...rv, ...lv } : { ...lv, ...rv };
        } else {
            v = newer === 'local' ? lv : rv;
        }
        if (v !== undefined) content[k] = v;
    }

    const survivor = survivorIsLocal ? l : r;
    const merged = finalizeEntry(content, l, r);
    merged.id = survivor.id;
    return merged;
}

// ── Similar-entry detection ──────────────────────────────────────────────────

/** Case/whitespace-insensitive comparison key (keeps diacritics). */
export function strictNorm(s) {
    return String(s ?? '')
        .normalize('NFC')
        .replace(/\*/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

/** Like strictNorm but also ignores diacritics/tone marks (tá ≈ ta). */
export function looseNorm(s) {
    return strictNorm(s).normalize('NFD').replace(/\p{M}/gu, '');
}

function similarityLevel(spec, a, b) {
    const wa = looseNorm(a[spec.wordKey]);
    if (!wa || wa !== looseNorm(b[spec.wordKey])) return null;
    const sameMeaning =
        strictNorm(a[spec.wordKey]) === strictNorm(b[spec.wordKey]) &&
        strictNorm(a[spec.glossKey]) === strictNorm(b[spec.glossKey]) &&
        (!spec.classKey || strictNorm(a[spec.classKey]) === strictNorm(b[spec.classKey]));
    if (sameMeaning) return contentChanged(a, b) ? SIMILARITY.SAME_MEANING : SIMILARITY.IDENTICAL;
    return SIMILARITY.SAME_WORD;
}

/**
 * Pairs entries added on this device with entries added on the other device
 * that look like the same word. Each entry is used at most once; the
 * strongest matches are paired first.
 */
function findSimilarPairs(spec, localAdds, remoteAdds) {
    const buckets = new Map();
    remoteAdds.forEach(([rk, r]) => {
        const w = looseNorm(r[spec.wordKey]);
        if (!w) return;
        if (!buckets.has(w)) buckets.set(w, []);
        buckets.get(w).push([rk, r]);
    });

    const candidates = [];
    localAdds.forEach(([lk, l], localIndex) => {
        const bucket = buckets.get(looseNorm(l[spec.wordKey]));
        if (!bucket) return;
        for (const [rk, r] of bucket) {
            const level = similarityLevel(spec, l, r);
            if (level) candidates.push({ lk, rk, l, r, level, localIndex });
        }
    });

    candidates.sort((a, b) => SIMILARITY_RANK[b.level] - SIMILARITY_RANK[a.level] || a.localIndex - b.localIndex);

    const usedL = new Set();
    const usedR = new Set();
    const pairs = [];
    for (const c of candidates) {
        if (usedL.has(c.lk) || usedR.has(c.rk)) continue;
        usedL.add(c.lk);
        usedR.add(c.rk);
        pairs.push(c);
    }
    return pairs.sort((a, b) => a.localIndex - b.localIndex);
}

// ── Collection merge ─────────────────────────────────────────────────────────

function emptyCollectionReport() {
    return {
        addedLocal: 0, addedRemote: 0,
        updatedLocal: 0, updatedRemote: 0,
        deletedLocal: 0, deletedRemote: 0,
        combined: 0,
    };
}

function mergeCollection(name, baseList, localList, remoteList, hasBase, decisions, conflicts, similar) {
    const spec = COLLECTIONS[name];
    const B = indexById(hasBase ? baseList : []);
    const L = indexById(localList);
    const R = indexById(remoteList);
    const report = emptyCollectionReport();

    // Keep this device's ordering; append entries that only exist remotely.
    const order = [...L.keys()];
    for (const k of R.keys()) if (!L.has(k)) order.push(k);

    const result = new Map();
    const localAdds = [];
    const remoteAdds = [];

    for (const k of order) {
        const b = B.get(k);
        const l = L.get(k);
        const r = R.get(k);

        if (l && r) {
            if (b) {
                if (contentChanged(b, l)) report.updatedLocal++;
                if (contentChanged(b, r)) report.updatedRemote++;
            }
            result.set(k, mergeEntry(name, k, b, l, r, decisions, conflicts));
            continue;
        }

        const present = l || r;
        const presentSide = l ? 'local' : 'remote';
        const deletedOn = l ? 'remote' : 'local';

        if (b) {
            // Existed before; one side deleted it.
            if (contentChanged(b, present)) {
                const key = `${name}:${k}:deleted`;
                const decided = decisions[key];
                const resolution = decided === 'keep' || decided === 'delete' ? decided : 'keep';
                conflicts.push({
                    key,
                    kind: 'deleteEdit',
                    collection: name,
                    id: present.id,
                    deletedOn,
                    entry: present,
                    baseEntry: b,
                    autoResolution: 'keep',
                    resolution,
                    decided: resolution === decided,
                });
                if (resolution === 'keep') result.set(k, present);
                else report[deletedOn === 'local' ? 'deletedLocal' : 'deletedRemote']++;
            } else {
                report[deletedOn === 'local' ? 'deletedLocal' : 'deletedRemote']++;
            }
            continue;
        }

        // Brand new on one side.
        result.set(k, present);
        if (presentSide === 'local') {
            report.addedLocal++;
            localAdds.push([k, present]);
        } else {
            report.addedRemote++;
            remoteAdds.push([k, present]);
        }
    }

    // ── Same word created separately on both devices ──
    const idRemap = new Map(); // removed id (string) → surviving id (original type)
    for (const pair of findSimilarPairs(spec, localAdds, remoteAdds)) {
        const key = `similar:${name}:${pair.lk}|${pair.rk}`;
        const autoResolution = pair.level === SIMILARITY.SAME_WORD ? 'keepBoth' : 'combine';
        const decided = decisions[key];
        const isPick = isPlainObject(decided) && isPlainObject(decided.pick);
        const valid = isPick || ['combine', 'keepBoth', 'keepLocal', 'keepRemote'].includes(decided);
        const resolution = valid ? (isPick ? 'pick' : decided) : autoResolution;

        similar.push({
            key,
            collection: name,
            level: pair.level,
            localId: pair.l.id,
            remoteId: pair.r.id,
            localEntry: pair.l,
            remoteEntry: pair.r,
            autoResolution,
            resolution,
            picks: isPick ? decided.pick : null,
            decided: valid,
        });

        if (resolution === 'keepBoth') continue;

        if (resolution === 'keepLocal') {
            result.delete(pair.rk);
            idRemap.set(pair.rk, pair.l.id);
            report.addedRemote--;
            continue;
        }
        if (resolution === 'keepRemote') {
            result.delete(pair.lk);
            idRemap.set(pair.lk, pair.r.id);
            report.addedLocal--;
            continue;
        }

        // 'combine' or 'pick'
        const combined = combineEntries(pair.l, pair.r, isPick ? decided.pick : null);
        const survivorKey = idKey(combined.id);
        const removedKey = survivorKey === pair.lk ? pair.rk : pair.lk;
        result.set(survivorKey, combined);
        result.delete(removedKey);
        idRemap.set(removedKey, combined.id);
        report.combined++;
        report.addedLocal--;
        report.addedRemote--;
    }

    return { list: [...result.values()], report, idRemap };
}

/** Points references at surviving IDs after duplicate entries were combined. */
function remapReferences(lexicon, phrases, idRemap) {
    if (idRemap.size === 0) return { lexicon, phrases };
    const remapId = v => {
        if ((typeof v === 'number' || typeof v === 'string') && idRemap.has(idKey(v))) return idRemap.get(idKey(v));
        return v;
    };
    const newLexicon = lexicon.map(e => {
        const parentRootId = remapId(e.parentRootId);
        const etymology = remapId(e.etymology);
        if (parentRootId === e.parentRootId && etymology === e.etymology) return e;
        return { ...e, parentRootId, etymology };
    });
    const newPhrases = phrases.map(p => {
        if (!Array.isArray(p.componentWords)) return p;
        const mapped = p.componentWords.map(remapId);
        return mapped.some((v, i) => v !== p.componentWords[i]) ? { ...p, componentWords: mapped } : p;
    });
    return { lexicon: newLexicon, phrases: newPhrases };
}

// ── Config & wiki ────────────────────────────────────────────────────────────

function mergeMap(prefix, collection, baseObj, localObj, remoteObj, hasBase, opts) {
    const { decisions, conflicts, defaultSide, excludeKeys, mergePrimitiveArrays, maxDepth } = opts;
    const ctx = {
        prefix,
        meta: { collection },
        defaultSide,
        localUpdatedAt: opts.localUpdatedAt,
        remoteUpdatedAt: opts.remoteUpdatedAt,
        decisions,
        conflicts,
        setKeys: new Set(),
        mergePrimitiveArrays,
        isEntry: false,
        maxDepth,
    };
    const local = isPlainObject(localObj) ? localObj : {};
    const remote = isPlainObject(remoteObj) ? remoteObj : {};
    const base = hasBase && isPlainObject(baseObj) ? baseObj : {};
    const out = { ...local };
    const changedLocal = [];
    const changedRemote = [];

    for (const k of unionKeys(base, local, remote)) {
        if (excludeKeys && excludeKeys.has(k)) continue;
        if (hasBase) {
            if (!valuesEqual(base[k], local[k])) changedLocal.push(k);
            if (!valuesEqual(base[k], remote[k])) changedRemote.push(k);
        } else if (!valuesEqual(local[k], remote[k])) {
            changedRemote.push(k);
        }
        const v = merge3(ctx, [k], base[k], local[k], remote[k], hasBase, 0);
        if (v === undefined) delete out[k];
        else out[k] = v;
    }
    return { value: out, changedLocal, changedRemote };
}

function sameEntryList(a, b) {
    if (a.length !== b.length) return false;
    const mb = indexById(b);
    const ma = indexById(a);
    if (ma.size !== mb.size) return false;
    for (const [k, e] of ma) {
        if (!mb.has(k) || !deepEqual(e, mb.get(k))) return false;
    }
    return true;
}

function sameSharedConfig(a, b) {
    for (const k of unionKeys(a, b)) {
        if (DEVICE_LOCAL_CONFIG_KEYS.has(k)) continue;
        if (!valuesEqual(a?.[k], b?.[k])) return false;
    }
    return true;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @typedef {{ lexicon?: Array, phrases?: Array, config?: object, wiki?: object }} ProjectState
 *
 * @param {object} args
 * @param {ProjectState|null} args.base
 * @param {ProjectState} args.local
 * @param {ProjectState} args.remote
 * @param {'auto'|'review'} [args.mode='auto']
 * @param {object} [args.decisions={}]
 * @param {number} [args.localUpdatedAt=0]  project-level timestamp of the local edit
 * @param {number} [args.remoteUpdatedAt=0] project-level timestamp of the remote edit
 *        (both only used to break config/wiki ties)
 */
export function mergeProject({
    base = null,
    local,
    remote,
    mode = MERGE_MODES.AUTO,
    decisions = {},
    localUpdatedAt = 0,
    remoteUpdatedAt = 0,
}) {
    const hasBase = !!base;
    const L = local || {};
    const R = remote || {};
    const B = base || {};
    const conflicts = [];
    const similar = [];
    const safeDecisions = isPlainObject(decisions) ? decisions : {};

    const lex = mergeCollection('lexicon', B.lexicon, L.lexicon, R.lexicon, hasBase, safeDecisions, conflicts, similar);
    const phr = mergeCollection('phrases', B.phrases, L.phrases, R.phrases, hasBase, safeDecisions, conflicts, similar);
    const remapped = remapReferences(lex.list, phr.list, lex.idRemap);

    const projectDefaultSide = remoteUpdatedAt > localUpdatedAt ? 'remote' : 'local';

    const config = mergeMap('config', 'config', B.config, L.config, R.config, hasBase, {
        decisions: safeDecisions,
        conflicts,
        defaultSide: projectDefaultSide,
        excludeKeys: DEVICE_LOCAL_CONFIG_KEYS,
        mergePrimitiveArrays: true, // e.g. customTags, customWordClasses
        maxDepth: 1,                // e.g. scriptDataById[scriptId]
        localUpdatedAt,
        remoteUpdatedAt,
    });

    const wiki = mergeMap('wiki', 'wiki', B.wiki, L.wiki, R.wiki, hasBase, {
        decisions: safeDecisions,
        conflicts,
        defaultSide: projectDefaultSide,
        excludeKeys: null,
        mergePrimitiveArrays: false,
        maxDepth: 1, // page objects merge per field (title vs content…)
        localUpdatedAt,
        remoteUpdatedAt,
    });

    const merged = {
        lexicon: remapped.lexicon,
        phrases: remapped.phrases,
        config: config.value,
        wiki: wiki.value,
    };

    const localLexicon = Array.isArray(L.lexicon) ? L.lexicon : [];
    const localPhrases = Array.isArray(L.phrases) ? L.phrases : [];
    const localChanged =
        merged.lexicon.length !== localLexicon.length ||
        merged.lexicon.some((e, i) => e !== localLexicon[i]) ||
        merged.phrases.length !== localPhrases.length ||
        merged.phrases.some((p, i) => p !== localPhrases[i]) ||
        !sameSharedConfig(merged.config, L.config) ||
        !valuesEqual(merged.wiki, L.wiki);

    const remoteChanged =
        !sameEntryList(merged.lexicon, Array.isArray(R.lexicon) ? R.lexicon : []) ||
        !sameEntryList(merged.phrases, Array.isArray(R.phrases) ? R.phrases : []) ||
        !sameSharedConfig(merged.config, R.config) ||
        !valuesEqual(merged.wiki, R.wiki);

    const needsReview = mode === MERGE_MODES.REVIEW && (conflicts.length > 0 || similar.length > 0);

    return {
        merged,
        hasBase,
        mode,
        needsReview,
        localChanged,   // this device must apply `merged`
        remoteChanged,  // the cloud must receive `merged`
        conflicts,
        similar,
        report: {
            lexicon: lex.report,
            phrases: phr.report,
            config: { changedLocal: config.changedLocal, changedRemote: config.changedRemote },
            wiki: { changedLocal: wiki.changedLocal, changedRemote: wiki.changedRemote },
            conflictCount: conflicts.length,
            similarCount: similar.length,
        },
    };
}
