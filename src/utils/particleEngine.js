// src/utils/particleEngine.js
// Core engine for particle resolution, composite detection, and glossing.

/**
 * Looks up particles by surface form in the particle database.
 * Returns all matching particles (there may be multiple with different senses).
 */
export function findParticleBySurface(surface, particleDatabase) {
    if (!surface || !particleDatabase) return [];
    const lower = surface.toLowerCase();
    return particleDatabase.filter(p => p.surface && p.surface.toLowerCase() === lower);
}

/**
 * Looks up a composite by its ID.
 */
export function findCompositeById(id, compositeParticles) {
    if (!id || !compositeParticles) return null;
    return compositeParticles.find(c => c.id === id) || null;
}

/**
 * Resolves the surface form for a component ID.
 * Checks particleDatabase first, then compositeParticles.
 */
export function getComponentSurface(componentId, particleDatabase, compositeParticles) {
    const particle = particleDatabase?.find(p => p.id === componentId);
    if (particle) return particle.surface;
    const composite = compositeParticles?.find(c => c.id === componentId);
    if (composite) return composite.surface;
    return null;
}

/**
 * Determines the POS of the neighboring word for context resolution.
 * @param {Array} tokens - The resolved token array
 * @param {number} index - Index of the particle token
 * @param {string} position - 'suffix' | 'prefix' | 'standalone'
 * @returns {string|null} The neighbor's wordClass
 */
export function getNeighborPOS(tokens, index, position) {
    if (position === 'suffix' || position === 'circumfix') {
        for (let i = index - 1; i >= 0; i--) {
            if (tokens[i].type === 'word' && tokens[i].lexiconEntry) {
                return tokens[i].lexiconEntry.wordClass?.toLowerCase();
            }
            if (tokens[i].type === 'composite' && tokens[i].composite?.senses?.length > 0) {
                return tokens[i].composite.senses[0].contextPOS;
            }
        }
    }
    if (position === 'prefix') {
        for (let i = index + 1; i < tokens.length; i++) {
            if (tokens[i].type === 'word' && tokens[i].lexiconEntry) {
                return tokens[i].lexiconEntry.wordClass?.toLowerCase();
            }
            if (tokens[i].type === 'composite' && tokens[i].composite?.senses?.length > 0) {
                return tokens[i].composite.senses[0].contextPOS;
            }
        }
    }
    if (position === 'standalone') {
        const left = getNeighborPOS(tokens, index, 'suffix');
        if (left) return left;
        return getNeighborPOS(tokens, index, 'prefix');
    }
    return null;
}

/**
 * Resolves the best sense for a particle given its context POS.
 */
export function resolveSense(particle, contextPOS) {
    if (!particle?.senses || particle.senses.length === 0) return null;
    // Try exact POS match first
    if (contextPOS) {
        const exact = particle.senses.find(s => s.contextPOS?.toLowerCase() === contextPOS.toLowerCase());
        if (exact) return exact;
    }
    // Fall back to wildcard
    return particle.senses.find(s => s.contextPOS === '*') || particle.senses[0];
}

/**
 * Computes the composition depth of each composite.
 * Depth 0 = all components are primitive particles.
 * Depth N = at least one component is depth-(N-1).
 * Detects cycles and throws if found.
 */
export function computeCompositeDepths(compositeParticles, particleDatabase) {
    const compositeMap = {};
    compositeParticles.forEach(c => { compositeMap[c.id] = c; });

    const particleSet = new Set();
    (particleDatabase || []).forEach(p => { particleSet.add(p.id); });

    const depths = {};
    const visiting = new Set();

    function getDepth(id) {
        if (depths[id] !== undefined) return depths[id];
        if (visiting.has(id)) throw new Error(`Cycle detected in composite particle: ${id}`);
        visiting.add(id);

        const composite = compositeMap[id];
        if (!composite) { depths[id] = 0; visiting.delete(id); return 0; }

        let maxChildDepth = 0;
        for (const compId of (composite.components || [])) {
            if (particleSet.has(compId)) {
                // Primitive particle — depth 0
                continue;
            }
            if (compositeMap[compId]) {
                maxChildDepth = Math.max(maxChildDepth, getDepth(compId) + 1);
            }
        }

        depths[id] = maxChildDepth;
        visiting.delete(id);
        return maxChildDepth;
    }

    compositeParticles.forEach(c => getDepth(c.id));
    return depths;
}

/**
 * Detects composite particle sequences in a token stream.
 * @param {Array} tokens - Array of { token, type, ... }
 * @param {Array} compositeParticles - Composite particle definitions
 * @param {Array} particleDatabase - Primitive particle definitions
 * @param {boolean} allowRecursive - Whether recursive composites are allowed
 * @returns {Array} Updated token array with composites merged
 */
export function detectComposites(tokens, compositeParticles, particleDatabase, allowRecursive = false) {
    if (!compositeParticles || compositeParticles.length === 0) return tokens;

    let depths = {};
    try {
        depths = computeCompositeDepths(compositeParticles, particleDatabase);
    } catch (e) {
        console.error('Composite depth computation error:', e.message);
        return tokens;
    }

    // Filter composites by depth if recursive is disabled
    const effectiveComposites = allowRecursive
        ? compositeParticles
        : compositeParticles.filter(c => (depths[c.id] ?? 0) === 0);

    const maxDepth = allowRecursive
        ? Math.max(...Object.values(depths), 0)
        : 0;

    // Group by depth
    const byDepth = {};
    for (const composite of effectiveComposites) {
        const d = depths[composite.id] ?? 0;
        if (!byDepth[d]) byDepth[d] = [];
        byDepth[d].push(composite);
    }

    // Run passes from depth 0 upward
    let currentTokens = [...tokens];
    for (let d = 0; d <= maxDepth; d++) {
        const group = byDepth[d] || [];
        if (group.length === 0) continue;

        const matches = [];
        for (const composite of group) {
            const compLen = composite.components?.length || 0;
            if (compLen === 0) continue;

            for (let i = 0; i <= currentTokens.length - compLen; i++) {
                const slice = currentTokens.slice(i, i + compLen);
                const match = composite.components.every((compId, j) => {
                    const surface = getComponentSurface(compId, particleDatabase, compositeParticles);
                    return slice[j].token?.toLowerCase() === surface?.toLowerCase()
                        || slice[j].particleId === compId
                        || (slice[j].type === 'composite' && slice[j].compositeId === compId);
                });
                if (match) {
                    matches.push({ start: i, length: compLen, composite });
                }
            }
        }

        // Resolve overlaps: prefer longest match, then leftmost
        matches.sort((a, b) => b.length - a.length || a.start - b.start);
        const used = new Set();
        const resolved = [];
        for (const m of matches) {
            let overlaps = false;
            for (let i = m.start; i < m.start + m.length; i++) {
                if (used.has(i)) { overlaps = true; break; }
            }
            if (!overlaps) {
                resolved.push(m);
                for (let i = m.start; i < m.start + m.length; i++) used.add(i);
            }
        }

        // Apply matches
        if (resolved.length > 0) {
            resolved.sort((a, b) => a.start - b.start);
            const newTokens = [];
            let cursor = 0;
            for (const m of resolved) {
                // Add tokens before this match
                while (cursor < m.start) {
                    newTokens.push(currentTokens[cursor]);
                    cursor++;
                }
                // Add the composite token
                newTokens.push({
                    token: m.composite.surface,
                    type: 'composite',
                    composite: m.composite,
                    compositeId: m.composite.id,
                    depth: d,
                });
                cursor += m.length;
            }
            // Add remaining tokens
            while (cursor < currentTokens.length) {
                newTokens.push(currentTokens[cursor]);
                cursor++;
            }
            currentTokens = newTokens;
        }
    }

    return currentTokens;
}

/**
 * Main entry point: resolves particle senses in a token stream.
 * @param {Array} tokens - Array of { token, type?, lexiconEntry? }
 * @param {Array} particleDatabase - Particle definitions
 * @param {Array} compositeParticles - Composite particle definitions
 * @param {Array} lexicon - Lexicon entries for POS lookup
 * @param {boolean} allowRecursive - Whether recursive composites are allowed
 * @returns {Array} Annotated token array
 */
export function resolveParticleSenses(tokens, particleDatabase, compositeParticles, lexicon, allowRecursive = false) {
    if (!particleDatabase || particleDatabase.length === 0) return tokens;

    // 1. Normalize input tokens
    let normalized = tokens.map(t => {
        if (typeof t === 'string') return { token: t };
        return t;
    });

    // 2. Match tokens to lexicon entries
    normalized = normalized.map(t => {
        if (t.lexiconEntry) return t;
        const match = lexicon?.find(e => e.word?.toLowerCase() === t.token?.toLowerCase());
        if (match) return { ...t, type: 'word', lexiconEntry: match };
        return t;
    });

    // 3. Composite detection pass (merge component sequences)
    normalized = detectComposites(normalized, compositeParticles, particleDatabase, allowRecursive);

    // 3b. Direct composite surface matching
    // If a token wasn't matched by the sequence detector, check if it IS a composite surface
    if (compositeParticles && compositeParticles.length > 0) {
        normalized = normalized.map(t => {
            if (t.type === 'composite' || t.type === 'word' || t.type === 'particle') return t;
            const lower = t.token?.toLowerCase();
            if (!lower) return t;
            const directMatch = compositeParticles.find(c => c.surface?.toLowerCase() === lower);
            if (directMatch) {
                return {
                    ...t,
                    type: 'composite',
                    composite: directMatch,
                    compositeId: directMatch.id,
                    depth: 0,
                };
            }
            return t;
        });
    }

    // 4. Particle identification and context resolution
    normalized = normalized.map((t, i) => {
        // Skip if already resolved as composite
        if (t.type === 'composite') return t;
        // Skip if it's a known word
        if (t.type === 'word' && t.lexiconEntry) return t;

        // Check if this token matches a particle
        const matchingParticles = findParticleBySurface(t.token, particleDatabase);
        if (matchingParticles.length === 0) return t;

        // For each matching particle, try to resolve its sense
        let bestResult = null;
        for (const particle of matchingParticles) {
            const pos = getNeighborPOS(normalized, i, particle.position || 'standalone');
            const sense = resolveSense(particle, pos);
            if (sense) {
                bestResult = {
                    ...t,
                    type: 'particle',
                    particle,
                    resolvedSense: sense,
                    contextPOS: pos,
                };
                break;
            }
        }

        return bestResult || t;
    });

    return normalized;
}

/**
 * Returns a formatted gloss string for a single token.
 */
export function glossToken(token) {
    if (!token) return '';
    if (token.type === 'particle' && token.resolvedSense) {
        return token.resolvedSense.gloss || token.resolvedSense.meaning || token.token;
    }
    if (token.type === 'composite' && token.composite) {
        return token.composite.gloss || token.composite.meaning || token.token;
    }
    return token.token || '';
}

/**
 * Generates a full gloss line from resolved tokens.
 * Returns two strings: the surface line and the gloss line.
 */
export function generateGlossLine(resolvedTokens) {
    const surfaces = [];
    const glosses = [];

    for (const t of resolvedTokens) {
        surfaces.push(t.token || '');
        glosses.push(glossToken(t));
    }

    return { surface: surfaces.join(' '), gloss: glosses.join(' ') };
}
