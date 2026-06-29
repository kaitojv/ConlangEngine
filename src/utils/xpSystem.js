// src/utils/xpSystem.js
// XP & Level progression system for the Study tab.

const LEVELS = [
    { threshold: 0,     title: 'Beginner',     icon: 'Leaf' },
    { threshold: 100,   title: 'Apprentice',   icon: 'BookOpen' },
    { threshold: 500,   title: 'Intermediate', icon: 'Zap' },
    { threshold: 1500,  title: 'Advanced',     icon: 'Flame' },
    { threshold: 5000,  title: 'Fluent',       icon: 'Gem' },
    { threshold: 10000, title: 'Master',       icon: 'Crown' },
];

/**
 * Given a total XP value, returns the current level info.
 * @param {number} xp - Total accumulated XP
 * @returns {{ level: number, title: string, icon: string, currentXP: number, nextThreshold: number, progress: number }}
 */
export function getLevel(xp) {
    let level = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].threshold) {
            level = i;
            break;
        }
    }

    const current = LEVELS[level];
    const next = LEVELS[level + 1] || null;
    const nextThreshold = next ? next.threshold : current.threshold;
    const currentBase = current.threshold;
    const progress = next
        ? Math.min(100, Math.round(((xp - currentBase) / (nextThreshold - currentBase)) * 100))
        : 100;

    return {
        level: level + 1,
        title: current.title,
        icon: current.icon,
        currentXP: xp,
        nextThreshold,
        progress,
        isMaxLevel: !next,
    };
}

/**
 * Calculate XP earned from a study session.
 * @param {number} correct - Number of correct answers
 * @param {number} total - Total questions
 * @param {object} [options] - Optional modifiers
 * @param {boolean} [options.isTimed] - Timed mode bonus (1.5x)
 * @param {number} [options.streak] - Current streak for bonus
 * @param {boolean} [options.isPerfect] - Perfect score bonus (+20 XP)
 * @param {boolean} [options.isDailyChallenge] - Daily challenge bonus (+50 XP)
 * @returns {number} XP earned
 */
export function calculateXP(correct, total, options = {}) {
    if (total === 0) return 0;

    // Base: 10 XP per correct answer
    let xp = correct * 10;

    // Perfect score bonus
    if (options.isPerfect || correct === total) {
        xp += 20;
    }

    // Timed mode multiplier
    if (options.isTimed) {
        xp = Math.round(xp * 1.5);
    }

    // Daily challenge flat bonus
    if (options.isDailyChallenge) {
        xp += 50;
    }

    // Streak bonus: +5% per day of streak (capped at 50%)
    if (options.streak && options.streak > 0) {
        const streakMultiplier = 1 + Math.min(options.streak * 0.05, 0.5);
        xp = Math.round(xp * streakMultiplier);
    }

    return xp;
}

/**
 * Calculate star rating based on accuracy.
 * @param {number} correct
 * @param {number} total
 * @returns {number} 0-3 stars
 */
export function calculateStars(correct, total) {
    if (total === 0) return 0;
    const pct = correct / total;
    if (pct >= 1.0) return 3;
    if (pct >= 0.8) return 2;
    if (pct >= 0.5) return 1;
    return 0;
}

export { LEVELS };
